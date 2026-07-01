// backend/src/routes/chat.routes.js

const express = require('express');
const router = express.Router();
const { studentAuth } = require('../middleware/student.middleware');
const {
  sendMessage,
  converseForRoadmap,
  groqDirect,
  getRoadmap,
  unlockNextPhase,
  getChatHistory,
  getPhaseStatus,
} = require('../controllers/chatController');

// ─── All Chat Routes ──────────────────────────────────────────
// All routes use your existing studentAuth middleware
router.post('/send',          studentAuth, sendMessage);
router.post('/sendMessage',   studentAuth, sendMessage);       // backward compatibility
router.post('/converse',      studentAuth, converseForRoadmap);
router.post('/groq',          studentAuth, groqDirect);
router.get('/roadmap',        studentAuth, getRoadmap);
router.post('/unlock-phase',  studentAuth, unlockNextPhase);
router.get('/phase-status',   studentAuth, getPhaseStatus);
router.get('/history/:sessionId', studentAuth, getChatHistory);

module.exports = router;