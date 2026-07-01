const express    = require('express');
const router     = express.Router();
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  awardPoints,
  getUserPoints,
  getPointHistory,
  getLeaderboard,
  saveLessonProgress,
  saveAssessment,
  getLessonProgress,
} = require('../controllers/points.controller');

router.get('/leaderboard',                   authenticateToken, getLeaderboard);
router.get('/user/:userId',                  authenticateToken, getUserPoints);
router.get('/user/:userId/history',          authenticateToken, getPointHistory);
router.post('/award',                        authenticateToken, awardPoints);
router.get('/lessons/progress',              authenticateToken, getLessonProgress);
router.post('/lessons/:lessonId/progress',   authenticateToken, saveLessonProgress);
router.post('/lessons/:lessonId/assessment', authenticateToken, saveAssessment);

module.exports = router;