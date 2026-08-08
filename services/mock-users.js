const express = require('express');
const app = express();
const PORT = 5001;

app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`[User Service] Received: ${req.method} ${req.url}`);
  next();
});

// Profile endpoint
app.get('/profile', (req, res) => {
  res.json({
    id: 'user_101',
    name: 'Rishu Ray',
    email: 'rayrishu19@gmail.com',
    role: 'Software Development Engineer Intern',
    skills: ['Node.js', 'Express', 'React', 'Kotlin', 'C++'],
    source: 'User Database (Live Response)'
  });
});

// Settings endpoint
app.get('/settings', (req, res) => {
  res.json({
    theme: 'glassmorphism-dark',
    notifications: true,
    language: 'en'
  });
});

app.listen(PORT, () => {
  console.log(`👤 Mock User Service is running on http://localhost:${PORT}`);
});
