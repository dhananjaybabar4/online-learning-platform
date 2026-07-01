// src/routes/quiz.routes.js
const express        = require('express');
const router         = express.Router();
const quizController = require('../controllers/quiz.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// ── Admin routes (no extra auth — /api/admin/* already guards these) ──
router.get('/',    quizController.getAllQuizzes);
router.get('/:id', quizController.getQuizById);
router.post('/',   quizController.createQuiz);
router.put('/:id', quizController.updateQuiz);
router.delete('/:id', quizController.deleteQuiz);

// Quiz Questions CRUD (admin)
router.get('/:quizId/questions',                      quizController.getQuizQuestions);
router.post('/:quizId/questions',                     quizController.createQuizQuestion);
router.put('/:quizId/questions/:questionId',          quizController.updateQuizQuestion);
router.delete('/:quizId/questions/:questionId',       quizController.deleteQuizQuestion);

// ── User-facing routes (require login) ────────────────────────
// Submit a quiz attempt → grades it and awards +5 XP
router.post('/:quizId/submit',   authenticateToken, quizController.submitQuiz);

// Get current user's attempt history for a quiz
router.get('/:quizId/attempts',  authenticateToken, quizController.getMyAttempts);

module.exports = router;