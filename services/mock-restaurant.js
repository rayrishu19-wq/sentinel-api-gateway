const express = require('express');
const app = express();
const PORT = 5003;

app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`[Restaurant Service] Received: ${req.method} ${req.url}`);
  next();
});
