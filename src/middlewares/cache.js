const { getRedisClient } = require('../utils/redisClient');

function getCacheKey(serviceName, url) {
  return `cache:${serviceName}:${url}`;
}

// Middleware to check if response is cached in Redis
function checkCache(serviceName, cacheConfig) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET' || !cacheConfig) {
      return next();
    }

    const redisClient = getRedisClient();
    const key = getCacheKey(serviceName, req.originalUrl);

    try {
      const cachedResponse = await redisClient.get(key);
      if (cachedResponse) {
        const { status, headers, body } = JSON.parse(cachedResponse);
        
        console.log(`[Cache] HIT on key: ${key}`);
        res.setHeader('X-Cache', 'HIT');
        
        // Restore cached headers
        Object.entries(headers).forEach(([k, v]) => {
          res.setHeader(k, v);
        });
        
        return res.status(status).send(body);
      }
      
      console.log(`[Cache] MISS on key: ${key}`);
      res.setHeader('X-Cache', 'MISS');
      next();
    } catch (err) {
      console.error('[Cache] Read error:', err);
      next();
    }
  };
}

// Utility to store response in Redis cache (invoked after proxy receives response)
async function saveToCache(serviceName, url, statusCode, headers, body, ttlSec) {
  const redisClient = getRedisClient();
  const key = getCacheKey(serviceName, url);
  
  // Clean headers to avoid caching gateway-specific headers
  const headersToCache = {
    'content-type': headers['content-type']
  };

  const payload = JSON.stringify({
    status: statusCode,
    headers: headersToCache,
    body: body.toString()
  });

  try {
    await redisClient.set(key, payload, 'EX', ttlSec);
    console.log(`[Cache] Cached response for key: ${key} (TTL: ${ttlSec}s)`);
  } catch (err) {
    console.error('[Cache] Write error:', err);
  }
}

module.exports = {
  checkCache,
  saveToCache
};
