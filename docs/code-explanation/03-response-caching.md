# Part 3: Response Caching Subsystem & TTL Eviction

File: [`src/middlewares/cache.js`](file:///c:/Users/91797/.gemini/antigravity-ide/scratch/sentinel-api-gateway/src/middlewares/cache.js)

## Overview
The caching layer serves as an accelerator within Sentinel. It drastically reduces load on downstream microservices and minimizes client latency for read-heavy operations by storing JSON responses directly in Redis with configurable Time-To-Live (TTL) values.

---

## 1. Key Namespacing & Scoping

Cache keys in Sentinel are formatted using a deterministic convention:
```text
cache:<serviceName>:<req.originalUrl>
```
- Example: `cache:restaurant:/restaurant/menu`
- By including both the `serviceName` and full `req.originalUrl` (which includes query strings), requests with different filters (`?category=desserts` vs `?category=mains`) maintain isolated cache entries without key collision.

---

## 2. Request Interception: Cache Inspection (`checkCache`)

When an HTTP request enters the gateway:
1. **HTTP Method Filter**: Sentinel strictly caches **`GET`** requests. Mutation requests (`POST`, `PUT`, `DELETE`, `PATCH`) bypass the cache immediately (`next()`) to ensure idempotent behavior and prevent stale mutations.
2. **Redis Lookup**: Queries Redis using `redisClient.get(key)`.
3. **On Cache HIT**:
   - Parses the stored JSON containing `{ status, headers, body }`.
   - Injects the diagnostic header: `X-Cache: HIT`.
   - Re-applies original headers (such as `content-type`).
   - Terminates the pipeline and directly responds with `res.status(status).send(body)`.
   - **Result**: Completely eliminates downstream network latency and computation overhead.
4. **On Cache MISS**:
   - Injects diagnostic header: `X-Cache: MISS`.
   - Calls `next()` to pass control down to the reverse proxy middleware.

---

## 3. Asynchronous Cache Population (`saveToCache`)

When the reverse proxy receives a successful `HTTP 200` response from the upstream microservice:
1. **Header Sanitization**: Sentinel extracts only essential downstream headers (`content-type`) while discarding ephemeral gateway headers before serialization.
2. **Payload Packaging**: Serializes the response object into a structured JSON string:
   ```json
   {
     "status": 200,
     "headers": { "content-type": "application/json; charset=utf-8" },
     "body": "{\"restaurant\":\"Royal Tandoor Bistro\", ...}"
   }
   ```
3. **Atomic Expiration (`EX`)**: Saves the key in Redis with an explicit TTL:
   ```javascript
   await redisClient.set(key, payload, 'EX', ttlSec);
   ```
4. **Non-blocking Execution**: The cache write is initiated asynchronously in the background so the downstream response is forwarded to the client with zero added latency.

---

## 4. Cache Invalidation Patterns

Sentinel exposes an administrative endpoint `DELETE /gateway/cache` to purge entries on demand:
- **Purge Specific Key**: `DELETE /gateway/cache?key=cache:restaurant:/restaurant/menu`
- **Purge Entire Service**: `DELETE /gateway/cache?service=restaurant` (matches `cache:restaurant:*`)
- **Global Flush**: `DELETE /gateway/cache` (matches `cache:*`)
