require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');

const gameRoutes = require('./routes/game');
const leaderboardRoutes = require('./routes/leaderboard');
const authRoutes = require('./routes/auth');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - allow frontend dev server
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve image assets statically (real and fake directories only)
app.use('/assets/real', express.static(path.join(__dirname, '../data/real')));
app.use('/assets/fake', express.static(path.join(__dirname, '../data/fake')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await db.ensureInitialized();
    res.json({
      status: 'ok',
      database: db.USE_POSTGRES ? 'postgres' : 'sqlite',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Serve frontend build in production if available
const clientDist = path.join(__dirname, '../client/dist');
const fs = require('fs');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/assets')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🎮 RealEyes server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
  db.ensureInitialized().catch(err => {
    console.error('❌ Database initialization failed:', err);
  });
});

module.exports = app;
