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

## Traditional Spices & Health Benefits

Indian cuisine uses a wide array of aromatic spices that are well-known for their medicinal properties:

| Spice | Hindi Name | Flavor Profile | Health Benefit |
|-------|------------|----------------|----------------|
| Turmeric | Haldi | Earthy, Bitter | Anti-inflammatory, antioxidant |
| Cumin | Jeera | Warm, Nutty | Promotes healthy digestion |
| Cardamom | Elaichi | Sweet, Floral | Refreshes breath, rich in antioxidants |
| Cloves | Laung | Sweet, Pungent | Antimicrobial, dental health |
| Cinnamon | Dalchini | Sweet, Woody | Helps regulate blood sugar |

### 3. GET `/restaurant/tables`
Returns the list of dining tables and their capacity.

### 4. GET `/restaurant/bookings` & POST `/restaurant/bookings`
Endpoint to view and request table bookings. Validates table capacity and avoids double bookings.

### 5. POST `/restaurant/orders` & GET `/restaurant/orders`
Endpoints to submit and retrieve food orders.

### 6. POST `/restaurant/reviews` & GET `/restaurant/reviews`
Endpoints to write customer reviews and query aggregated rating stats.
