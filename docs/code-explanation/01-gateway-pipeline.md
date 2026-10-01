# Part 1: Gateway Architecture & Pipeline Lifecycle

File: [`src/gateway.js`](file:///c:/Users/91797/.gemini/antigravity-ide/scratch/sentinel-api-gateway/src/gateway.js)

## Overview
`src/gateway.js` is the central orchestrator and entry point for the Sentinel API Gateway. It configures the Express server instance, establishes global interceptors, loads configuration rules dynamically, and mounts pipeline stages for each configured downstream microservice.

---

## 1. Global Interceptors & Middleware Stack

Before a request reaches any route-specific pipeline (rate limiting or proxying), it passes through a sequence of global middlewares:

### A. Correlation ID Tracking
```javascript
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
});
```
- **Purpose**: Provides end-to-end distributed tracing.
- **Behavior**: If the client provides an `X-Request-ID` header, it is preserved; otherwise, a cryptographically secure UUID v4 is generated. The ID is attached to both `req.id` and the outgoing response header.

### B. Global Telemetry & Metrics
- The `metricsMiddleware` tracks incoming request count immediately upon arrival and registers a listener on `res.on('finish')` to capture completion status and response times.

### C. Cross-Origin Resource Sharing (CORS) & Pre-flight
- Automatically allows standard HTTP methods (`GET, POST, PUT, DELETE, OPTIONS`) and common authorization headers.
- Directly handles `OPTIONS` pre-flight requests by returning HTTP 200 before routing overhead.

### D. Audit File Logging
- Ensures the `logs/` directory exists.
- Attaches an asynchronous file append callback on response `finish` writing to `logs/access.log`:
  ```text
  [2026-10-01T05:20:00.000Z] GET /restaurant/menu -> HTTP 200
  ```

### E. Precise Response Timing (`X-Response-Time`)
- Intercepts `res.writeHead` using a function wrapper to record the exact duration in milliseconds from request receipt to header serialization.

---

## 2. Dynamic Microservice Route Mounting

Sentinel does not hardcode route paths. Instead, it reads `config/gateway.json`, validates its schema using `validateConfig()`, and constructs middleware chains dynamically:

```javascript
Object.entries(config.services).forEach(([serviceName, serviceConfig]) => {
  const pipeline = [];

  // Stage 1: Rate Limiter (Token Bucket)
  if (serviceConfig.rateLimit) {
    pipeline.push(createRateLimiter(serviceName, serviceConfig.rateLimit));
  }

  // Stage 2: Cache Check (Redis GET store)
  if (serviceConfig.cache) {
    pipeline.push(checkCache(serviceName, serviceConfig.cache));
  }

  // Stage 3: Reverse Proxy
  pipeline.push(createProxy(serviceName, serviceConfig));

  app.use(serviceConfig.prefix, ...pipeline);
});
```

### Why Middleware Order Matters:
1. **Rate Limiter First**: Prevents denial-of-service and protects cache lookup operations if an abusive client floods the gateway.
2. **Cache Second**: If valid cached data exists, it immediately returns the response to the client, terminating the pipeline and avoiding the costly reverse proxy downstream request.
3. **Proxy Last**: Requests that are permitted and miss the cache are forwarded upstream to the backend service.

---

## 3. Administrative & Utility Endpoints
- `GET /health`: Returns service health status and whether the in-memory Redis mock is currently active.
- `GET /gateway/metrics`: Exposes JSON analytics including uptime, status code breakdown, average latency, and cache hit ratios.
- `DELETE /gateway/cache`: Invalidates keys by exact name (`?key=...`) or wildcards by service name (`?service=restaurant`).
- `Catch-all (404)`: Standardized JSON 404 payload for unmapped paths.
