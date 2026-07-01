// backend/src/routes/lessons.routes.js
const express = require('express');
const router = express.Router();
const lessonsController = require('../controllers/lessons.controller');
const { adminAuth } = require('../middleware/admin.middleware');
const { studentAuth } = require('../middleware/student.middleware');

// ============================================
// PUBLIC/STUDENT ROUTES (Student Auth Required)
// ============================================

// GET all lessons (Student view - no admin auth needed)
router.get('/student/all', studentAuth, lessonsController.getAllLessons);

// GET lesson by ID (Student view)
router.get('/student/:id', studentAuth, lessonsController.getLessonById);

// GET steps for a lesson (Student view)
router.get('/student/:lessonId/steps', studentAuth, lessonsController.getStepsByLesson);

// GET step by ID (Student view)
router.get('/student/:lessonId/steps/:stepId', studentAuth, lessonsController.getStepById);

// ============================================
// ADMIN ROUTES (Admin Auth Required)
// ============================================

// GET all lessons (Admin)
router.get('/admin/all', adminAuth, lessonsController.getAllLessons);

// GET lesson by ID (Admin)
router.get('/admin/:id', adminAuth, lessonsController.getLessonById);

// CREATE lesson (Admin)
router.post('/admin', adminAuth, lessonsController.createLesson);

// UPDATE lesson (Admin)
router.put('/admin/:id', adminAuth, lessonsController.updateLesson);

// DELETE lesson (Admin)
router.delete('/admin/:id', adminAuth, lessonsController.deleteLesson);

// ============================================
// LESSON STEPS ROUTES (Admin)
// ============================================

// GET steps for a lesson (Admin)
router.get('/admin/:lessonId/steps', adminAuth, lessonsController.getStepsByLesson);

// GET step by ID (Admin)
router.get('/admin/:lessonId/steps/:stepId', adminAuth, lessonsController.getStepById);

// CREATE step (Admin)
router.post('/admin/:lessonId/steps', adminAuth, lessonsController.createStep);

// UPDATE step (Admin)
router.put('/admin/:lessonId/steps/:stepId', adminAuth, lessonsController.updateStep);

// DELETE step (Admin)
router.delete('/admin/:lessonId/steps/:stepId', adminAuth, lessonsController.deleteStep);

module.exports = router;