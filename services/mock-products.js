const express = require('express');
const app = express();
const PORT = 5002;

app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`[Product Service] Received: ${req.method} ${req.url}`);
  next();
});

// Product list endpoint
app.get('/list', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    products: [
      { id: 'p1', name: 'Premium Mechanical Keyboard', price: 99.99, inStock: true },
      { id: 'p2', name: 'Ultra-wide Curved Monitor', price: 349.99, inStock: true },
      { id: 'p3', name: 'Noise Cancelling Headphones', price: 199.99, inStock: false }
    ],
    source: 'Product Database (Live Response)'
  });
});

app.listen(PORT, () => {
  console.log(`🛍️  Mock Product Service is running on http://localhost:${PORT}`);
});
