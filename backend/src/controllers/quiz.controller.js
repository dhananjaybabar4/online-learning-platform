// src/controllers/quiz.controller.js
const { supabaseAdmin } = require('../config/supabase');

// ============================================
// QUIZ CONTROLLERS
// ============================================

/**
 * Get all quizzes
 */
const getAllQuizzes = async (req, res) => {
  try {
    console.log('📝 Fetching all quizzes...');

    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .select(`
        *,
        quiz_questions (
          id,
          question_text,
          question_type,
          points
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Get quizzes error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    console.log('✅ Quizzes fetched:', data?.length || 0);

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('❌ Get quizzes error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get quiz by ID
 */
const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Fetching quiz:', id);

    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .select(`
        *,
        quiz_questions (
          id,
          question_text,
          question_type,
          options,
          correct_answer,
          points,
          explanation
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Get quiz error:', error);
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }

    console.log('✅ Quiz fetched:', data.title);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Get quiz error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Create new quiz
 */
const createQuiz = async (req, res) => {
  try {
    const { title, description, difficulty, time_limit, passing_score, lesson_id } = req.body;

    console.log('➕ Creating quiz:', title);

    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .insert([{
        title,
        description,
        difficulty: difficulty || 'medium',
        time_limit: time_limit || 30,
        passing_score: passing_score || 70,
        lesson_id,
        is_published: false
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Create quiz error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    console.log('✅ Quiz created:', data.id);

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data
    });
  } catch (error) {
    console.error('❌ Create quiz error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update quiz
 */
const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('📝 Updating quiz:', id);

    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Update quiz error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    console.log('✅ Quiz updated:', data.id);

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      data
    });
  } catch (error) {
    console.error('❌ Update quiz error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete quiz
 */
const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Deleting quiz:', id);

    const { error } = await supabaseAdmin
      .from('quizzes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Delete quiz error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    console.log('✅ Quiz deleted');

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete quiz error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// QUIZ QUESTIONS CONTROLLERS
// ============================================

/**
 * Get all questions for a quiz
 */
const getQuizQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;

    console.log('❓ Fetching questions for quiz:', quizId);

    const { data, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('❌ Get questions error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    console.log('✅ Questions fetched:', data?.length || 0);

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('❌ Get questions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Create quiz question
 */
const createQuizQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { question_text, question_type, options, correct_answer, points, explanation, order_index } = req.body;

    console.log('➕ Creating question for quiz:', quizId);

    const { data, error } = await supabaseAdmin
      .from('quiz_questions')
      .insert([{
        quiz_id: quizId,
        question_text,
        question_type: question_type || 'multiple_choice',
        options: options || [],
        correct_answer,
        points: points || 1,
        explanation,
        order_index: order_index || 0
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Create question error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    console.log('✅ Question created:', data.id);

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data
    });
  } catch (error) {
    console.error('❌ Create question error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update quiz question
 */
const updateQuizQuestion = async (req, res) => {
  try {
    const { quizId, questionId } = req.params;
    const updates = req.body;

    console.log('📝 Updating question:', questionId);

    const { data, error } = await supabaseAdmin
      .from('quiz_questions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', questionId)
      .eq('quiz_id', quizId)
      .select()
      .single();

    if (error) {
      console.error('❌ Update question error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    console.log('✅ Question updated:', data.id);

    res.json({
      success: true,
      message: 'Question updated successfully',
      data
    });
  } catch (error) {
    console.error('❌ Update question error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Delete quiz question
 */
const deleteQuizQuestion = async (req, res) => {
  try {
    const { quizId, questionId } = req.params;

    console.log('🗑️ Deleting question:', questionId);

    const { error } = await supabaseAdmin
      .from('quiz_questions')
      .delete()
      .eq('id', questionId)
      .eq('quiz_id', quizId);

    if (error) {
      console.error('❌ Delete question error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }

    console.log('✅ Question deleted');

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete question error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
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
  deleteQuizQuestion
};