const express = require('express');
const app = express();
const PORT = 5003;

app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`[Restaurant Service] Received: ${req.method} ${req.url}`);
  next();
});

const tables = [
  { id: 't1', number: 1, capacity: 2, occupied: false },
  { id: 't2', number: 2, capacity: 2, occupied: false },
  { id: 't3', number: 3, capacity: 4, occupied: false },
  { id: 't4', number: 4, capacity: 4, occupied: false },
  { id: 't5', number: 5, capacity: 6, occupied: false }
];
const bookings = [];



const menu = {
  appetizers: [
    { id: 'a1', name: 'Samosa (2pcs)', price: 4.99, description: 'Crispy pastry filled with spiced potatoes and peas' },
    { id: 'a2', name: 'Paneer Tikka', price: 9.99, description: 'Marinated cottage cheese cubes grilled in a tandoor' },
    { id: 'a3', name: 'Onion Pakora', price: 5.99, description: 'Deep fried onion fritters seasoned with spices' }
  ],
  mainCourses: [
    { id: 'm1', name: 'Butter Chicken', price: 14.99, description: 'Tender chicken in a rich, creamy tomato butter sauce' },
    { id: 'm2', name: 'Dal Makhani', price: 11.99, description: 'Slow-cooked black lentils with cream and spices' },
    { id: 'm3', name: 'Paneer Butter Masala', price: 13.99, description: 'Cottage cheese in a spiced tomato-gravy' }
  ],
  desserts: [
    { id: 'd1', name: 'Gulab Jamun (2pcs)', price: 3.99, description: 'Warm milk dumplings soaked in cardamom sugar syrup' },
    { id: 'd2', name: 'Rasmalai (2pcs)', price: 4.99, description: 'Soft cheese patties in sweet, thickened milk' }
  ],
  drinks: [
    { id: 'dr1', name: 'Mango Lassi', price: 3.49, description: 'Sweet yogurt drink blended with mango pulp' },
    { id: 'dr2', name: 'Masala Chai', price: 2.49, description: 'Spiced Indian milk tea' }
  ]
};

// Get full menu
app.get('/menu', (req, res) => {
  res.json({
    restaurant: 'Flavors of India',
    timestamp: new Date().toISOString(),
    menu: menu,
    status: 'open'
  });
});

// Get menu by category
app.get('/menu/:category', (req, res) => {
  const category = req.params.category;
  if (menu[category]) {
    res.json({
      category: category,
      items: menu[category]
    });
  } else {
    res.status(404).json({
      error: 'Category Not Found',
      message: `Category '${category}' is not available. Try appetizers, mainCourses, desserts, or drinks.`
    });
  }
});


// Get tables
app.get('/tables', (req, res) => {
  res.json({ tables });
});


app.listen(PORT, () => {
  console.log(`🍲 Indian Restaurant Mock Service running on http://localhost:${PORT}`);
});
