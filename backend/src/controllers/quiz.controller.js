// src/controllers/quiz.controller.js
const { supabaseAdmin } = require('../config/supabase');
const { supabase }      = require('../config/supabase');

// ============================================
// QUIZ CONTROLLERS
// ============================================

const getAllQuizzes = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .select(`*, quiz_questions ( id, question_text, question_type, points )`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .select(`*, quiz_questions ( id, question_text, question_type, options, correct_answer, points, explanation )`)
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ success: false, message: 'Quiz not found' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createQuiz = async (req, res) => {
  try {
    const { title, description, difficulty, time_limit, passing_score, lesson_id } = req.body;
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .insert([{ title, description, difficulty: difficulty || 'medium', time_limit: time_limit || 30, passing_score: passing_score || 70, lesson_id, is_published: false }])
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.status(201).json({ success: true, message: 'Quiz created successfully', data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Quiz updated successfully', data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from('quizzes').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// QUIZ QUESTIONS CONTROLLERS
// ============================================

const getQuizQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { data, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createQuizQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { question_text, question_type, options, correct_answer, points, explanation, order_index } = req.body;
    const { data, error } = await supabaseAdmin
      .from('quiz_questions')
      .insert([{ quiz_id: quizId, question_text, question_type: question_type || 'multiple_choice', options: options || [], correct_answer, points: points || 1, explanation, order_index: order_index || 0 }])
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.status(201).json({ success: true, message: 'Question created successfully', data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateQuizQuestion = async (req, res) => {
  try {
    const { quizId, questionId } = req.params;
    const { data, error } = await supabaseAdmin
      .from('quiz_questions')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', questionId)
      .eq('quiz_id', quizId)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Question updated successfully', data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteQuizQuestion = async (req, res) => {
  try {
    const { quizId, questionId } = req.params;
    const { error } = await supabaseAdmin
      .from('quiz_questions')
      .delete()
      .eq('id', questionId)
      .eq('quiz_id', quizId);

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// QUIZ SUBMISSION → AWARDS XP
// ============================================

/**
 * POST /api/quizzes/:quizId/submit
 * Body: { answers: { [questionId]: userAnswer } }
 * Auth: authenticateToken (user must be logged in)
 *
 * Flow:
 *  1. Fetch quiz + questions
 *  2. Grade each answer
 *  3. Save to quiz_attempts
 *  4. Award 5 XP via award_points RPC (deduped by quiz+user per 24h)
 *  5. Return score, passed, xp_awarded
 */
const submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId     = req.user?.id;
    const { answers } = req.body; // { [questionId]: "user answer string" }

    if (!userId)  return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!answers) return res.status(400).json({ success: false, message: 'answers is required' });

    // 1. Fetch quiz + questions
    const { data: quiz, error: quizErr } = await supabaseAdmin
      .from('quizzes')
      .select('*, quiz_questions(*)')
      .eq('id', quizId)
      .single();

    if (quizErr || !quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });

    const questions = quiz.quiz_questions || [];

    // 2. Grade
    let earnedPoints = 0;
    let totalPoints  = 0;
    const results = questions.map(q => {
      totalPoints += q.points || 1;
      const userAns    = (answers[q.id] || '').toString().trim().toLowerCase();
      const correctAns = (q.correct_answer || '').toString().trim().toLowerCase();
      const correct    = userAns === correctAns;
      if (correct) earnedPoints += q.points || 1;
      return { question_id: q.id, correct, user_answer: answers[q.id], correct_answer: q.correct_answer };
    });

    const scorePercent = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed       = scorePercent >= (quiz.passing_score || 70);
    const XP_REWARD    = 5; // quiz = +5 XP per ATL rules

    // 3. Save attempt
    const { data: attempt, error: attemptErr } = await supabaseAdmin
      .from('quiz_attempts')
      .insert([{
        user_id:        userId,
        quiz_id:        quizId,
        score:          scorePercent,
        earned_points:  earnedPoints,
        total_points:   totalPoints,
        passed,
        answers:        answers,
        results,
        xp_earned:      XP_REWARD,
        completed_at:   new Date().toISOString(),
      }])
      .select()
      .single();

    // (non-fatal if quiz_attempts table doesn't exist yet)
    if (attemptErr) console.warn('quiz_attempts insert skipped:', attemptErr.message);

    // 4. Award XP — deduped per user+quiz per 24h
    let xpAwarded  = false;
    let newXpTotal = null;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('point_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('reason',  'quiz_completed')
      .eq('ref_id',  quizId)
      .gte('created_at', since)
      .limit(1);

    if (!existing || existing.length === 0) {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('award_points', {
        p_user_id:  userId,
        p_points:   XP_REWARD,
        p_reason:   'quiz_completed',
        p_ref_id:   quizId,
        p_ref_type: 'quiz',
        p_meta:     { quiz_title: quiz.title, score: scorePercent, passed },
      });
      if (!rpcErr) { xpAwarded = true; newXpTotal = rpcData; }
      else console.error('award_points error:', rpcErr);
    }

    return res.json({
      success: true,
      data: {
        score:         scorePercent,
        earned_points: earnedPoints,
        total_points:  totalPoints,
        passed,
        results,
        xp_awarded:    xpAwarded ? XP_REWARD : 0,
        xp_skipped:    !xpAwarded,
        new_xp_total:  newXpTotal,
        attempt_id:    attempt?.id || null,
      },
    });
  } catch (err) {
    console.error('Submit quiz error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/quizzes/:quizId/attempts
 * Returns the current user's attempts for this quiz (most recent first)
 */
const getMyAttempts = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId     = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { data, error } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, score, passed, xp_earned, completed_at')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('completed_at', { ascending: false });

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAllQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizQuestions,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  submitQuiz,
  getMyAttempts,
};