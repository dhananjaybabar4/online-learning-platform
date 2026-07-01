// backend/src/server.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Import ALL Routes ────────────────────────────────────────
const authRoutes           = require('./routes/auth.routes');
const userRoutes           = require('./routes/user.routes');
const lessonsRoutes        = require('./routes/lessons.routes');
const quizRoutes           = require('./routes/quiz.routes');
const chatRoutes           = require('./routes/chat.routes');
const challengesRoutes     = require('./routes/challenges.routes');
const resourcesRoutes      = require('./routes/resources.routes');
const resourcesAdminRoutes = require('./routes/resources.admin.routes');
const adminRoutes          = require('./routes/admin.routes');
const storyRoutes          = require('./routes/story.routes');
const skilltestRoutes      = require('./routes/skilltest.routes');

// ─── Public / Student Routes ──────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/resources',  resourcesRoutes);
app.use('/api/story',      storyRoutes);
app.use('/api/skilltest',  skilltestRoutes);
app.use('/api/chat',       chatRoutes);
app.use('/api/lessons',    lessonsRoutes);
app.use('/api/quizzes',    quizRoutes);

// Student challenges: GET /api/challenges/student, etc.
app.use('/api/challenges', challengesRoutes);

// ─── Admin Routes ─────────────────────────────────────────────
// NOTE: /api/admin/challenges uses the SAME challengesRoutes file
// but now the routes inside are defined without the /admin prefix
// so:  GET /api/admin/challenges       → adminGetChallenges   ✅
//      POST /api/admin/challenges      → adminCreateChallenge ✅
//      GET /api/admin/challenges/:id/questions → adminGetQuestions ✅

app.use('/api/admin/challenges', challengesRoutes);
app.use('/api/admin/users',      userRoutes);
app.use('/api/admin/lessons',    lessonsRoutes);
app.use('/api/admin/quizzes',    quizRoutes);
app.use('/api/admin/resources',  resourcesAdminRoutes);
app.use('/api/admin',            adminRoutes);

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ATL API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ─── Error Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 ATL Server running on port ${PORT}`);
});

module.exports = app;