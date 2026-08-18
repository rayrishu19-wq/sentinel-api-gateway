const express = require('express');
const app = express();
const PORT = 5003;

app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`[Restaurant Service] Received: ${req.method} ${req.url}`);
  next();
});

const menu = {
  appetizers: [
    { id: 'a1', name: 'Samosa (2pcs)', price: 4.99, description: 'Crispy pastry filled with spiced potatoes and peas' },
    { id: 'a2', name: 'Paneer Tikka', price: 9.99, description: 'Marinated cottage cheese cubes grilled in a tandoor' },
    { id: 'a3', name: 'Onion Pakora', price: 5.99, description: 'Deep fried onion fritters seasoned with spices' }
  ],
  mainCourses: [],
  desserts: [],
  drinks: []
};
