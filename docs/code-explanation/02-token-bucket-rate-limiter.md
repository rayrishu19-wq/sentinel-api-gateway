# Part 2: Distributed Rate Limiting & Token Bucket Algorithm

File: [`src/middlewares/rateLimiter.js`](file:///c:/Users/91797/.gemini/antigravity-ide/scratch/sentinel-api-gateway/src/middlewares/rateLimiter.js)

## Overview
Rate limiting is the first defensive perimeter of Sentinel API Gateway. It prevents denial-of-service (DoS) attacks, brute-force attempts, and cascading microservice failures by throttling excessive client requests using an atomic **Token Bucket Algorithm** backed by Redis.

---

## 1. The Token Bucket Mathematical Model

Unlike a naive fixed-window counter that suffers from burst spikes at window boundaries, the Token Bucket algorithm smoothly handles burstiness while enforcing an exact sustained rate limit:

1. **Bucket Capacity ($C$)**: The maximum burst capacity of tokens held in the bucket (e.g., $10$ tokens).
2. **Refill Rate ($r$)**: The rate at which tokens continuously regenerate:
   $$r = \frac{\text{limit}}{\text{windowSec}} = \frac{10}{60\text{ s}} \approx 0.1667 \text{ tokens/second}$$
3. **Continuous Refill Calculation**:
   $$\text{currentTokens} = \min\left(C, \text{storedTokens} + (\Delta t \times r)\right)$$
   where $\Delta t = \text{now} - \text{lastRefill}$.
4. **Token Consumption**: If $\text{currentTokens} \ge 1$, decrement by $1$ and allow the request. Otherwise, reject with HTTP `429 Too Many Requests`.

---

## 2. Why Atomic Lua Scripting in Redis?

In a distributed environment with multiple gateway workers or concurrent HTTP requests from the same client IP, standard `GET` followed by `SET` in Redis causes **Race Conditions (Time-Of-Check to Time-Of-Use / TOCTOU)**.

Sentinel executes the calculation within an atomic Lua script:
```lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('get', key)
local tokens
local last_refill

if not data then
    tokens = limit
    last_refill = now
else
    local bucket = cjson.decode(data)
    last_refill = bucket.lastRefill
    local elapsed = math.max(0, now - last_refill)
    tokens = math.min(limit, bucket.tokens + (elapsed * refill_rate))
end

if tokens >= 1 then
    tokens = tokens - 1
    local next_bucket = { tokens = tokens, lastRefill = now }
    redis.call('set', key, cjson.encode(next_bucket), 'EX', 3600)
    return {1, tokens} -- Allowed
else
    local next_bucket = { tokens = tokens, lastRefill = now }
    redis.call('set', key, cjson.encode(next_bucket), 'EX', 3600)
    return {0, tokens} -- Rejected
end
```

### Guarantees Provided by Lua:
- **Atomicity**: Redis executes Lua scripts as a single atomic unit on its single-threaded event loop. No other Redis commands can interleave.
- **Auto-Expiration (TTL)**: The bucket key is automatically set with a 3600-second TTL (`EX 3600`), preventing memory leaks from inactive client IPs.

---

## 3. Client Identification & Key Structure

Bucket keys follow a structured namespace:
```text
ratelimit:<serviceName>:<clientId>
```
- Example: `ratelimit:products:127.0.0.1`
- `clientId` extraction prioritizes `req.ip` followed by `req.headers['x-forwarded-for']` and falls back to `'global'`.

---

## 4. Resilience & Graceful Degrade (Fail-Open)
1. **Mock Fallback**: If Redis is offline, Sentinel switches automatically to an in-memory simulated token bucket.
2. **Fail-Open Strategy**: If the rate-limiting script encounters an unhandled runtime error, the `catch` block logs the warning and executes `next()`. This guarantees that internal rate-limiter errors will not bring down critical client traffic.
