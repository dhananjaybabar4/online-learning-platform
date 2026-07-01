// backend/server.js

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
const authRoutes             = require('./routes/auth.routes');
const userRoutes             = require('./routes/user.routes');
const lessonsRoutes          = require('./routes/lessons.routes');
const quizRoutes             = require('./routes/quiz.routes');
const chatRoutes             = require('./routes/chat.routes');
const challengesRoutes       = require('./routes/challenges.routes');
const resourcesRoutes        = require('./routes/resources.routes');
const resourcesAdminRoutes   = require('./routes/resources.admin.routes');
const adminRoutes            = require('./routes/admin.routes');
const storyRoutes            = require('./routes/story.routes');
const skilltestRoutes        = require('./routes/skilltest.routes');
const ppModeRoutes           = require('./routes/ppMode.routes');

// ─── Public Routes ────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/users',      userRoutes);
app.use('/api/resources',  resourcesRoutes);
app.use('/api/challenges', challengesRoutes);

// ─── Story Routes ─────────────────────────────────────────────
app.use('/api/story', storyRoutes);

// ─── Skill Test Routes ────────────────────────────────────────
app.use('/api/skilltest', skilltestRoutes);

// ─── PP Mode Routes ───────────────────────────────────────────
app.use('/api/pp', ppModeRoutes);

// ─── Admin Routes ─────────────────────────────────────────────
app.use('/api/admin/users',      userRoutes);
app.use('/api/admin/lessons',    lessonsRoutes);
app.use('/api/admin/quizzes',    quizRoutes);
app.use('/api/admin/challenges', challengesRoutes);
app.use('/api/admin/resources',  resourcesAdminRoutes);
app.use('/api/admin',            adminRoutes);

// ─── Student / Other Routes ───────────────────────────────────
app.use('/api/lessons', lessonsRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/chat',    chatRoutes);

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ATL API is running', timestamp: new Date().toISOString() });
});

// ─── Error Handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ─── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 ATL Server running on port ${PORT}`);
});

module.exports = app;