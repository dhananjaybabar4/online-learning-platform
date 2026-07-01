// backend/src/routes/ppMode.routes.js
// FIXED: explicit path names prevent :sessionId from swallowing /status

const express = require('express');
const router  = express.Router();
const pp      = require('../controllers/ppMode.controller');
const { studentAuth } = require('../middleware/student.middleware');
const { adminAuth }   = require('../middleware/admin.middleware');

// ── Student routes ────────────────────────────────────────────
// NOTE: /status MUST come before /:sessionId/... routes
router.get('/status',                         studentAuth, pp.getStatus);
router.get('/weak-areas',                     studentAuth, pp.getWeakAreas);
router.post('/session/start',                 studentAuth, pp.startSession);
router.get('/session/:sessionId/questions',   studentAuth, pp.getQuestions);
router.post('/session/:sessionId/submit',     studentAuth, pp.submitSession);
router.get('/session/:sessionId/result',      studentAuth, pp.getResult);

// ── Admin routes ──────────────────────────────────────────────
router.get('/admin/questions',                adminAuth,   pp.adminGetQuestions);
router.post('/admin/questions',               adminAuth,   pp.adminAddQuestion);
router.put('/admin/questions/:id',            adminAuth,   pp.adminUpdateQuestion);
router.delete('/admin/questions/:id',         adminAuth,   pp.adminDeleteQuestion);
router.get('/admin/analytics',                adminAuth,   pp.adminGetAnalytics);

module.exports = router;