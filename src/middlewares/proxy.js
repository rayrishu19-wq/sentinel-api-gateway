const proxy = require('express-http-proxy');
const { saveToCache } = require('./cache');

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
