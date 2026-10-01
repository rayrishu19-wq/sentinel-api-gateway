const proxy = require('express-http-proxy');
const { saveToCache } = require('./cache');

/**
 * Creates an HTTP reverse proxy middleware targeting an upstream microservice.
 * 
 * @param {string} serviceName - Downstream microservice identifier (e.g. 'users', 'restaurant')
 * @param {Object} serviceConfig - Service configuration from gateway.json
 * @param {string} serviceConfig.target - Target host URL (e.g. 'http://127.0.0.1:5001')
 * @param {string} serviceConfig.prefix - Public path prefix mounted on the gateway (e.g. '/users')
 * @param {Object} [serviceConfig.cache] - Cache configuration options
 * @returns {Function} Express middleware function that forwards requests to upstream host
 */
function createProxy(serviceName, serviceConfig) {
  const { target, prefix, cache } = serviceConfig;

  return proxy(target, {
    // Preserve request headers (e.g. auth, user-agent)
    proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
      // Forward correlation ID or client IP if needed
      proxyReqOpts.headers['X-Forwarded-For'] = srcReq.ip;
      return proxyReqOpts;
    },
    
    // Rewrite path (removes the gateway service prefix)
    // Example: /users/profile -> /profile
    proxyReqPathResolver: function(req) {
      const parts = req.originalUrl.split('?');
      const pathOnly = parts[0];
      const queryParams = parts[1] ? `?${parts[1]}` : '';
      
      const resolvedPath = pathOnly.replace(prefix, '') || '/';
      return resolvedPath + queryParams;
    },
    
    // Intercept successful GET responses to store them in cache
    userResDecorator: function(proxyRes, proxyResData, userReq, userRes) {
      if (
        userReq.method === 'GET' && 
        proxyRes.statusCode === 200 && 
        cache
      ) {
        // Run asynchronous caching without blocking the client response
        saveToCache(
          serviceName, 
          userReq.originalUrl, 
          proxyRes.statusCode, 
          proxyRes.headers, 
          proxyResData, 
          cache.ttlSec
        ).catch(err => console.error('[Proxy Cache Save Error]', err));
      }
      return proxyResData;
    },

    // Handle proxy errors gracefully
    proxyErrorHandler: function(err, res, next) {
      console.error(`[Proxy Error] Failed to connect to downstream service ${serviceName} at ${target}:`, err.message);
      res.status(503).json({
        error: 'Service Unavailable',
        message: `Gateway was unable to route request to backend microservice ${serviceName}. Is it running?`
      });
    }
  });
}

module.exports = { createProxy };
