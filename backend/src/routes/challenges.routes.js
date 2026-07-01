// backend/src/routes/challenges.routes.js
// LeetCode-style MCQ challenge routes
// IMPORTANT: Static routes like /admin/analytics must come BEFORE param routes like /admin/:id

const express = require('express');
const router  = express.Router();
const c       = require('../controllers/challenges.controller');
const { studentAuth } = require('../middleware/student.middleware');
const { adminAuth }   = require('../middleware/admin.middleware');

// ── Student routes ─────────────────────────────────────────
router.get('/student',                        studentAuth, c.studentGetChallenges);
router.get('/student/:challengeId/questions', studentAuth, c.studentGetQuestions);
router.post('/student/:challengeId/complete', studentAuth, c.studentCompleteChallenge);

// ── Admin routes (static first, then params) ───────────────
router.get('/admin',             adminAuth, c.adminGetChallenges);
router.post('/admin',            adminAuth, c.adminCreateChallenge);
router.get('/admin/analytics',   adminAuth, c.adminGetAnalytics);   // ← MUST be before /admin/:id
router.post('/admin/questions',  adminAuth, c.adminAddQuestion);    // ← MUST be before /admin/:id

router.put('/admin/:id',         adminAuth, c.adminUpdateChallenge);
router.delete('/admin/:id',      adminAuth, c.adminDeleteChallenge);
router.get('/admin/:challengeId/questions', adminAuth, c.adminGetQuestions);

router.put('/admin/questions/:id',    adminAuth, c.adminUpdateQuestion);
router.delete('/admin/questions/:id', adminAuth, c.adminDeleteQuestion);

module.exports = router;