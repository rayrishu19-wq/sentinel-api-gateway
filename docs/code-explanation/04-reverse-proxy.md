# Part 4: Dynamic Reverse Proxy & Route Resolution

File: [`src/middlewares/proxy.js`](file:///c:/Users/91797/.gemini/antigravity-ide/scratch/sentinel-api-gateway/src/middlewares/proxy.js)

## Overview
The reverse proxy layer is responsible for transparently routing permitted client requests to upstream backend microservices. Built on top of `express-http-proxy`, Sentinel abstracts away target host addresses, decouples internal network topologies from public consumers, and provides path rewriting and upstream fault tolerance.

---

## 1. Upstream Forwarding Mechanics

When `createProxy(serviceName, serviceConfig)` is invoked during route initialization, it instantiates an HTTP reverse proxy targeting the upstream service's base URL (e.g. `http://127.0.0.1:5003` for the restaurant service).

### Core Responsibilities:
1. **Header Propagation (`proxyReqOptDecorator`)**:
   - Forwards client IP context via `X-Forwarded-For: req.ip`.
   - Passes along authorization bearer tokens, content types, and tracing headers (`X-Request-ID`).
2. **Path Rewriting (`proxyReqPathResolver`)**:
   - Strips the gateway prefix so microservices receive clean REST paths.
   - Example:
     $$\text{Client calls: } \texttt{http://gateway:5000/restaurant/menu?sort=price}$$
     $$\text{Forwarded as: } \texttt{http://restaurant-service:5003/menu?sort=price}$$
   - Preserves original URL query parameters accurately.
3. **Response Interception (`userResDecorator`)**:
   - Inspects the returned status code and headers.
   - If the request is a `GET` and returned `HTTP 200`, it triggers `saveToCache` in the background without blocking the data stream to the client.
4. **Resilient Error Handling (`proxyErrorHandler`)**:
   - If the downstream microservice is down, crashed, or unreachable, rather than hanging or leaking low-level socket stack traces, Sentinel returns a clean HTTP `503 Service Unavailable`:
     ```json
     {
       "error": "Service Unavailable",
       "message": "Gateway was unable to route request to backend microservice restaurant. Is it running?"
     }
     ```

---

## 2. Microservice Topology Decoupling

By maintaining this proxy boundary:
- Downstream microservices do not need to implement their own CORS, TLS termination, or rate limiting.
- Internal service ports (`5001`, `5002`, `5003`) remain shielded behind the gateway firewall (`5000`).
- Upstream URLs can be re-routed or load balanced without requiring client-side API modifications.
