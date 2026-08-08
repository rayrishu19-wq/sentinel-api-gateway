const { getRedisClient } = require('../utils/redisClient');

// Lua Script for atomic token bucket rate limiting in Redis
const LUA_TOKEN_BUCKET = `
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
    return {1, tokens} -- allowed, return remaining tokens
else
    local next_bucket = { tokens = tokens, lastRefill = now }
    redis.call('set', key, cjson.encode(next_bucket), 'EX', 3600)
    return {0, tokens} -- rate limited, return 0 remaining tokens
end
`;

function createRateLimiter(serviceName, rules) {
  const { limit, windowMs } = rules;
  // Calculate refill rate in tokens per second
  const windowSec = windowMs / 1000;
  const refillRate = limit / windowSec;

  return async (req, res, next) => {
    const redisClient = getRedisClient();
    const clientId = req.ip || req.headers['x-forwarded-for'] || 'global';
    const key = `ratelimit:${serviceName}:${clientId}`;
    const now = Math.floor(Date.now() / 1000);

    try {
      let allowed, remainingTokens;

      if (typeof redisClient.eval === 'function' && !redisClient.store) {
        // Real Redis Lua script execution
        const result = await redisClient.eval(
          LUA_TOKEN_BUCKET,
          1,
          key,
          limit.toString(),
          refillRate.toString(),
          now.toString()
        );
        allowed = result[0];
        remainingTokens = Math.floor(result[1]);
      } else {
        // Falling back to Mock Redis eval which handles mock logic
        const result = await redisClient.eval(null, 1, key, limit, refillRate, now);
        allowed = result;
        remainingTokens = allowed ? 'MOCK' : 0;
      }

      // Set rate limit headers for the client
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remainingTokens);

      if (allowed === 1) {
        next();
      } else {
        console.warn(`[Rate Limiter] Rate limit exceeded for client: ${clientId} on service: ${serviceName}`);
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit of ${limit} requests per ${windowSec}s exceeded. Please try again later.`,
          retryAfterSeconds: Math.ceil(windowSec / limit)
        });
      }
    } catch (err) {
      console.error('[Rate Limiter] Error executing rate limiting script:', err);
      // Fail open to avoid blocking users if something crashes
      next();
    }
  };
}

module.exports = { createRateLimiter };
