# Indian Restaurant Mock Service API Guide

This document describes the API endpoints provided by the Indian Restaurant service through the Sentinel API Gateway.

## API Architecture

```mermaid
graph LR
  Client -->|GET /restaurant/menu| Gateway[Sentinel API Gateway]
  Gateway -->|Reverse Proxy /menu| RestaurantService[Restaurant Mock Service:5003]
```

## Endpoints

### 1. GET `/restaurant/menu`
Returns the full restaurant menu.

**Example Response:**
```json
{
  "restaurant": "Flavors of India",
  "status": "open",
  "menu": {
    "appetizers": [...],
    "mainCourses": [...],
    "desserts": [...],
    "drinks": [...]
  }
}
```

### 2. GET `/restaurant/menu/:category`
Returns items for a specific menu category.
- **Valid Categories:** `appetizers`, `mainCourses`, `desserts`, `drinks`
