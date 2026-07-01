// src/routes/quiz.routes.js
const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');

// No middleware here — admin auth is applied via /api/admin/* in server.js
// Same pattern as roadmap.routes.js

// Quiz CRUD
router.get('/', quizController.getAllQuizzes);
router.get('/:id', quizController.getQuizById);
router.post('/', quizController.createQuiz);
router.put('/:id', quizController.updateQuiz);
router.delete('/:id', quizController.deleteQuiz);

// Quiz Questions CRUD
router.get('/:quizId/questions', quizController.getQuizQuestions);
router.post('/:quizId/questions', quizController.createQuizQuestion);
router.put('/:quizId/questions/:questionId', quizController.updateQuizQuestion);
router.delete('/:quizId/questions/:questionId', quizController.deleteQuizQuestion);

module.exports = router;