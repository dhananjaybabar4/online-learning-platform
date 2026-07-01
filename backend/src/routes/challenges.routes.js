// backend/src/routes/challenges.routes.js
const express = require('express');
const router  = express.Router();
const c       = require('../controllers/challenges.controller');
const { studentAuth } = require('../middleware/student.middleware');
const { adminAuth }   = require('../middleware/admin.middleware');

// ── Student routes ─────────────────────────────────────────
// Called as: GET /api/challenges/student
router.get('/student',                        studentAuth, c.studentGetChallenges);
router.get('/student/:challengeId/questions', studentAuth, c.studentGetQuestions);
router.post('/student/:challengeId/complete', studentAuth, c.studentCompleteChallenge);

// ── Admin routes ───────────────────────────────────────────
// Mounted at /api/admin/challenges in server.js
// So these become: GET /api/admin/challenges, POST /api/admin/challenges, etc.
// Static routes MUST come before param routes

router.get('/analytics',         adminAuth, c.adminGetAnalytics);      // GET  /api/admin/challenges/analytics
router.post('/questions',        adminAuth, c.adminAddQuestion);        // POST /api/admin/challenges/questions
router.put('/questions/:id',     adminAuth, c.adminUpdateQuestion);     // PUT  /api/admin/challenges/questions/:id
router.delete('/questions/:id',  adminAuth, c.adminDeleteQuestion);     // DELETE /api/admin/challenges/questions/:id

router.get('/',                  adminAuth, c.adminGetChallenges);      // GET  /api/admin/challenges
router.post('/',                 adminAuth, c.adminCreateChallenge);    // POST /api/admin/challenges
router.put('/:id',               adminAuth, c.adminUpdateChallenge);    // PUT  /api/admin/challenges/:id
router.delete('/:id',            adminAuth, c.adminDeleteChallenge);    // DELETE /api/admin/challenges/:id
router.get('/:challengeId/questions', adminAuth, c.adminGetQuestions);  // GET  /api/admin/challenges/:id/questions

module.exports = router;