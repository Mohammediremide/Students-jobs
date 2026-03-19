// server.js

const path = require('path');
const express = require('express');
const app = require('./api/index');

const PORT = process.env.PORT || 3000;

// Serve static files locally
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Node.js backend listening on http://localhost:${PORT}`);
  console.log('Use POST requests to /register and /login');
  console.log('Use GET requests to /jobs to retrieve job listings');
});
