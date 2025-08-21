const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database-config');
const authRoutes = require('./routes/auth');
const titleRoutes = require('./routes/titles');
const paintingRoutes = require('./routes/paintings');
const referenceRoutes = require('./routes/references');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Store for SSE connections
const sseConnections = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files
app.use(express.static(__dirname));

// SSE endpoint for real-time updates
app.get('/api/events/:userId', (req, res) => {
  const { userId } = req.params;
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

  // Store connection
  if (!sseConnections.has(userId)) {
    sseConnections.set(userId, []);
  }
  sseConnections.get(userId).push(res);

  // Handle client disconnect
  req.on('close', () => {
    const userConnections = sseConnections.get(userId);
    if (userConnections) {
      const index = userConnections.indexOf(res);
      if (index > -1) {
        userConnections.splice(index, 1);
      }
      if (userConnections.length === 0) {
        sseConnections.delete(userId);
      }
    }
  });
});

// Function to send SSE updates to a specific user
const sendSSEUpdate = (userId, data) => {
  const userConnections = sseConnections.get(userId);
  if (userConnections) {
    userConnections.forEach(connection => {
      try {
        connection.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error('Error sending SSE update:', error);
      }
    });
  }
};

// Make sendSSEUpdate available globally
global.sendSSEUpdate = sendSSEUpdate;

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/titles', titleRoutes);
app.use('/api/paintings', paintingRoutes);
app.use('/api/references', referenceRoutes);

// Config endpoint to provide server information to frontend
app.get('/api/config', (req, res) => {
  res.json({
    serverIP: process.env.SERVER_IP || 'localhost',
    apiPort: process.env.PORT || 3000
  });
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize database and start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 AI Painting Generator server running on port ${PORT}`);
      console.log(`📱 Open your browser to: http://localhost:${PORT}`);
      console.log(`🔄 Real-time updates enabled via Server-Sent Events`);
      console.log(`🎨 Ready to generate paintings!`);
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
