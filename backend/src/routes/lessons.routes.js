// backend/src/routes/lessons.routes.js
const express            = require('express');
const router             = express.Router();
const lessonsController  = require('../controllers/lessons.controller');
const { adminAuth }      = require('../middleware/admin.middleware');
const { studentAuth }    = require('../middleware/student.middleware');

// ============================================
// STUDENT ROUTES (Student Auth Required)
// ============================================

// Progress (all lessons) — used by Home.jsx to show XP/completed count
router.get('/student/progress/all',              studentAuth, lessonsController.getAllProgress);

// All lessons
router.get('/student/all',                       studentAuth, lessonsController.getAllLessons);

// Single lesson
router.get('/student/:id',                       studentAuth, lessonsController.getLessonById);

// Steps
router.get('/student/:lessonId/steps',           studentAuth, lessonsController.getStepsByLesson);
router.get('/student/:lessonId/steps/:stepId',   studentAuth, lessonsController.getStepById);

// Progress for a single lesson
router.get('/student/:lessonId/progress',        studentAuth, lessonsController.getProgress);

// ── XP-connected write endpoints (called by LessonView.jsx) ──

// +1 XP per step completion (server-side dedup)
router.post('/student/:lessonId/step-complete',  studentAuth, lessonsController.markStepComplete);

// +10 XP on lesson completion — updates lesson_progress table
router.post('/student/:lessonId/progress',       studentAuth, lessonsController.saveProgress);

// +2 or +5 XP on assessment completion depending on score
router.post('/student/:lessonId/assessment',     studentAuth, lessonsController.saveAssessment);

// ============================================
// ADMIN ROUTES (Admin Auth Required)
// ============================================

router.get('/admin/all',                              adminAuth, lessonsController.getAllLessons);
router.get('/admin/:id',                              adminAuth, lessonsController.getLessonById);
router.post('/admin',                                 adminAuth, lessonsController.createLesson);
router.put('/admin/:id',                              adminAuth, lessonsController.updateLesson);
router.delete('/admin/:id',                           adminAuth, lessonsController.deleteLesson);

router.get('/admin/:lessonId/steps',                  adminAuth, lessonsController.getStepsByLesson);
router.get('/admin/:lessonId/steps/:stepId',          adminAuth, lessonsController.getStepById);
router.post('/admin/:lessonId/steps',                 adminAuth, lessonsController.createStep);
router.put('/admin/:lessonId/steps/:stepId',          adminAuth, lessonsController.updateStep);
router.delete('/admin/:lessonId/steps/:stepId',       adminAuth, lessonsController.deleteStep);

module.exports = router;