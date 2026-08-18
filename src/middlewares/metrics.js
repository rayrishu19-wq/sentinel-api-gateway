const metrics = {
  startTime: Date.now(),
  totalRequests: 0,
  statusCodes: {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0
  },
  totalResponseTime: 0,
  cacheHits: 0,
  cacheMisses: 0
};

function metricsMiddleware(req, res, next) {
  metrics.totalRequests++;
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.totalResponseTime += duration;
    
    // Status Code distribution
    const catNum = Math.floor(res.statusCode / 100);
    const statusCategory = catNum + 'xx';
    if (metrics.statusCodes[statusCategory] !== undefined) {
      metrics.statusCodes[statusCategory]++;
    }
    
    // Cache HIT vs MISS tracking
    const cacheHeader = res.getHeader('X-Cache');
    if (cacheHeader === 'HIT') {
      metrics.cacheHits++;
    } else if (cacheHeader === 'MISS') {
      metrics.cacheMisses++;
    }
  });
  
  next();
}

function getMetrics() {
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
  const avgResponseTime = metrics.totalRequests > 0
    ? parseFloat((metrics.totalResponseTime / metrics.totalRequests).toFixed(2))
    : 0;
  return {
    uptimeSeconds,
    totalRequests: metrics.totalRequests,
    statusCodes: metrics.statusCodes,
    avgResponseTimeMs: avgResponseTime,
    cacheHits: metrics.cacheHits,
    cacheMisses: metrics.cacheMisses,
    cacheHitRatio: metrics.cacheHits + metrics.cacheMisses > 0
      ? parseFloat((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)).toFixed(4))
      : 0
  };
}

module.exports = { metricsMiddleware, getMetrics };
