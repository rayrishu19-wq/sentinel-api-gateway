# Part 5: Gateway Observability, Metrics & Telemetry

File: [`src/middlewares/metrics.js`](file:///c:/Users/91797/.gemini/antigravity-ide/scratch/sentinel-api-gateway/src/middlewares/metrics.js)

## Overview
Observability is essential for maintaining production SLA targets, debugging anomalies, and monitoring capacity. Sentinel implements an in-memory aggregation engine that records real-time traffic statistics, latency percentiles, and cache efficiency metrics without imposing external dependencies.

---

## 1. Metrics State Container

The metrics module maintains a low-overhead, in-memory accumulator object:

```javascript
const metrics = {
  startTime: Date.now(),       // Epoch timestamp of gateway boot
  totalRequests: 0,           // Monotonically increasing counter
  statusCodes: {
    '2xx': 0,                 // Successful responses
    '3xx': 0,                 // Redirections
    '4xx': 0,                 // Client errors (400, 404, 429)
    '5xx': 0                  // Server errors (500, 503)
  },
  totalResponseTime: 0,       // Accumulated latency in ms
  cacheHits: 0,               // Number of cache hits served
  cacheMisses: 0              // Number of cache misses recorded
};
```

---

## 2. Event-Driven Telemetry Capture

The `metricsMiddleware` captures request telemetry asynchronously using Node.js event emitters:

```javascript
function metricsMiddleware(req, res, next) {
  metrics.totalRequests++;
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    metrics.totalResponseTime += duration;

    // Categorize status code (200 -> '2xx', 429 -> '4xx', etc.)
    const catNum = Math.floor(res.statusCode / 100);
    const statusCategory = catNum + 'xx';
    if (metrics.statusCodes[statusCategory] !== undefined) {
      metrics.statusCodes[statusCategory]++;
    }

    // Inspect X-Cache header to track cache efficiency
    const cacheHeader = res.getHeader('X-Cache');
    if (cacheHeader === 'HIT') {
      metrics.cacheHits++;
    } else if (cacheHeader === 'MISS') {
      metrics.cacheMisses++;
    }
  });

  next();
}
```

### Key Design Considerations:
- **`res.on('finish')`**: Ensures metrics are recorded only after the full HTTP response stream has been written to the client socket.
- **Header Inspection**: Inspects `X-Cache` to compute precise cache hit ratios without tight coupling to the caching module.

---

## 3. Real-Time Telemetry Endpoint (`GET /gateway/metrics`)

When queried, `getMetrics()` computes instantaneous statistical derivations:
1. **Uptime (seconds)**: $\Delta t = \lfloor(\text{now} - \text{startTime}) / 1000\rfloor$
2. **Average Response Time ($ms$)**:
   $$\text{Avg Latency} = \frac{\text{totalResponseTime}}{\text{totalRequests}}$$
3. **Cache Hit Ratio**:
   $$\text{Cache Hit Ratio} = \frac{\text{cacheHits}}{\text{cacheHits} + \text{cacheMisses}}$$

### Sample JSON Output:
```json
{
  "uptimeSeconds": 1420,
  "totalRequests": 1840,
  "statusCodes": {
    "2xx": 1780,
    "3xx": 0,
    "4xx": 58,
    "5xx": 2
  },
  "avgResponseTimeMs": 14.32,
  "cacheHits": 1240,
  "cacheMisses": 600,
  "cacheHitRatio": 0.6739
}
```
