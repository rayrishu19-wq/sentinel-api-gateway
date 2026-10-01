# Part 6: Downstream Microservices & Integration Test Suite

Files:
- [`scripts/test-restaurant.js`](file:///c:/Users/91797/.gemini/antigravity-ide/scratch/sentinel-api-gateway/scripts/test-restaurant.js)
- [`services/mock-restaurant.js`](file:///c:/Users/91797/.gemini/antigravity-ide/scratch/sentinel-api-gateway/services/mock-restaurant.js)

## Overview
To validate that Sentinel accurately proxies, rate-limits, and caches traffic without regressions, the repository contains mock microservices and an automated end-to-end integration test harness.

---

## 1. Mock Downstream Architecture

Sentinel coordinates multiple isolated mock microservices simulating real-world production backends:
1. **Mock User Service** (`port 5001`): Handles user profiles, authentication verification, and metadata.
2. **Mock Product Service** (`port 5002`): Handles product catalogs, inventory listings, and search queries.
3. **Mock Restaurant Service** (`port 5003`): Simulates a full-featured restaurant management backend including menus, table reservations, cart calculation, order submission, and customer reviews.

---

## 2. Integration Test Runner (`scripts/test-restaurant.js`)

The integration runner tests full-lifecycle interactions strictly through the API Gateway on port `5000` (not directly against port `5003`). This verifies that the entire middleware pipeline (Correlation IDs, CORS, Rate Limiting, Caching, and Reverse Proxy) functions properly end-to-end.

### Test Phases:

| Phase | Method | Gateway Endpoint | Target Upstream | Assertion / Validation |
| :--- | :--- | :--- | :--- | :--- |
| **Test 1** | `GET` | `/restaurant/menu` | `/menu` | HTTP 200, valid JSON containing restaurant metadata and item catalog |
| **Test 2** | `GET` | `/restaurant/tables` | `/tables` | HTTP 200, verifies table inventory array |
| **Test 3** | `POST` | `/restaurant/bookings` | `/bookings` | HTTP 200/201, verifies payload serialization and booking confirmation message |
| **Test 4** | `POST` | `/restaurant/orders` | `/orders` | HTTP 200, verifies arithmetic pricing logic (e.g. $43.94 calculation) |
| **Test 5** | `POST` | `/restaurant/reviews` | `/reviews` | HTTP 200, verifies review persistence |
| **Test 6** | `GET` | `/restaurant/reviews` | `/reviews` | HTTP 200, verifies dynamic statistics recalculation (e.g. average rating) |

---

## 3. Running Integration Tests

To run the integration verification test suite:

```bash
# 1. Start the Sentinel Gateway
npm start

# 2. In a second terminal, start the Restaurant Service
npm run service:restaurant

# 3. In a third terminal, execute the test script
node scripts/test-restaurant.js
```

### Verification Criteria:
- All 6 tests report HTTP 200/201 status codes.
- Response payloads match schema contracts.
- Gateway logs display request durations, correlation IDs, and cache HIT/MISS states in real time.
