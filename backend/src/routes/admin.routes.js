const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { adminAuth } = require('../middleware/admin.middleware');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('');



router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n🔐 Admin Login Attempt:');
    console.log('Email:', email);
    console.log('Password length:', password?.length);

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log('🔍 Querying Supabase for admin...');
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('status', 'active')
      .single();

    if (error || !admin) {
      console.log('❌ No admin found');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    console.log('✅ Admin found');
    
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);
    
    if (!passwordMatch) {
      console.log('❌ Password mismatch');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    console.log('✅ Password verified');

    const tokenPayload = {
      adminId: admin.id,
      email: admin.email,
      timestamp: Date.now()
    };

    
    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '24h' }
    );

    console.log('✅ JWT Token created');
    console.log('📝 Token payload:', tokenPayload);
    console.log('✅ Login successful\n');

    const { password_hash, ...adminData } = admin;

    res.json({
      success: true,
      token: token,
      data: adminData
    });

  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
    );
    
    const adminId = decoded.adminId;

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, name, role, status')
      .eq('id', adminId)
      .eq('status', 'active')
      .single();

    if (error || !admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    res.json({
      success: true,
      data: admin
    });

  } catch (error) {
    console.error('Token verification error:', error.message);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
});

// ==================== DASHBOARD & STATS ====================

router.get('/dashboard/stats', adminAuth, async (req, res) => {
  try {
    console.log('📊 Fetching dashboard stats...');

    // Get counts
    const { count: totalStudents } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: activeLessons } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });

    const { count: totalQuizzes } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true });

    const { count: totalChallenges } = await supabase
      .from('challenges')
      .select('*', { count: 'exact', head: true });

    console.log('✅ Dashboard stats fetched');

    res.json({
      success: true,
      data: {
        totalStudents: totalStudents || 0,
        activeLessons: activeLessons || 0,
        totalQuizzes: totalQuizzes || 0,
        totalChallenges: totalChallenges || 0
      }
    });

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
});

// ==================== USER MANAGEMENT ====================

/**
 * GET /api/admin/users
 * Get all users
 */
router.get('/users', adminAuth, async (req, res) => {
  try {
    console.log('👥 Fetching all users...');

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching users:', error);
      throw error;
    }

    console.log(`✅ Fetched ${users?.length || 0} users`);

    res.json({
      success: true,
      data: users || []
    });

  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get user by ID
 */
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('👤 Fetching user:', id);

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user
 */
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('✏️ Updating user:', id);
    console.log('Update data:', updateData);

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ User updated');

    res.json({
      success: true,
      data: user,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('❌ Update user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user
 */
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting user:', id);

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ User deleted');

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== MODULE MANAGEMENT ====================

/**
 * GET /api/admin/modules
 * Get all modules
 */
router.get('/modules', adminAuth, async (req, res) => {
  try {
    console.log('📦 Fetching all modules...');

    const { data: modules, error } = await supabase
      .from('modules')
      .select('*')
      .order('order_number', { ascending: true });

    if (error) throw error;

    console.log(`✅ Fetched ${modules?.length || 0} modules`);

    res.json({
      success: true,
      data: modules || []
    });

  } catch (error) {
    console.error('❌ Get modules error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/admin/modules/:id
 * Get module by ID
 */
router.get('/modules/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📦 Fetching module:', id);

    const { data: module, error } = await supabase
      .from('modules')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!module) {
      return res.status(404).json({
        success: false,
        error: 'Module not found'
      });
    }

    res.json({
      success: true,
      data: module
    });

  } catch (error) {
    console.error('❌ Get module error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/modules
 * Create module
 */
router.post('/modules', adminAuth, async (req, res) => {
  try {
    console.log('➕ Creating module:', req.body);

    const { data: module, error } = await supabase
      .from('modules')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Module created');

    res.json({
      success: true,
      data: module,
      message: 'Module created successfully'
    });

  } catch (error) {
    console.error('❌ Create module error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/modules/:id
 * Update module
 */
router.put('/modules/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ Updating module:', id);

    const { data: module, error } = await supabase
      .from('modules')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Module updated');

    res.json({
      success: true,
      data: module,
      message: 'Module updated successfully'
    });

  } catch (error) {
    console.error('❌ Update module error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/modules/:id
 * Delete module
 */
router.delete('/modules/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting module:', id);

    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Module deleted');

    res.json({
      success: true,
      message: 'Module deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete module error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== LESSON MANAGEMENT ====================

/**
 * GET /api/admin/lessons
 * Get all lessons
 */
router.get('/lessons', adminAuth, async (req, res) => {
  try {
    console.log('📚 Fetching all lessons...');

    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .order('order_number', { ascending: true });

    if (error) throw error;

    console.log(`✅ Fetched ${lessons?.length || 0} lessons`);

    res.json({
      success: true,
      data: lessons || []
    });

  } catch (error) {
    console.error('❌ Get lessons error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/admin/lessons/:id
 * Get lesson by ID
 */
router.get('/lessons/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📖 Fetching lesson:', id);

    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }

    res.json({
      success: true,
      data: lesson
    });

  } catch (error) {
    console.error('❌ Get lesson error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/lessons
 * Create lesson
 */
router.post('/lessons', adminAuth, async (req, res) => {
  try {
    console.log('➕ Creating lesson:', req.body);

    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Lesson created');

    res.json({
      success: true,
      data: lesson,
      message: 'Lesson created successfully'
    });

  } catch (error) {
    console.error('❌ Create lesson error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/lessons/:id
 * Update lesson
 */
router.put('/lessons/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ Updating lesson:', id);

    const { data: lesson, error } = await supabase
      .from('lessons')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Lesson updated');

    res.json({
      success: true,
      data: lesson,
      message: 'Lesson updated successfully'
    });

  } catch (error) {
    console.error('❌ Update lesson error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/lessons/:id
 * Delete lesson
 */
router.delete('/lessons/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting lesson:', id);

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Lesson deleted');

    res.json({
      success: true,
      message: 'Lesson deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete lesson error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== LESSON STEPS MANAGEMENT ====================

/**
 * GET /api/admin/lessons/:lessonId/steps
 * Get all steps for a lesson
 */
router.get('/lessons/:lessonId/steps', adminAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    console.log('📋 Fetching steps for lesson:', lessonId);

    const { data: steps, error } = await supabase
      .from('lesson_steps')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_number', { ascending: true });

    if (error) throw error;

    console.log(`✅ Fetched ${steps?.length || 0} steps`);

    res.json({
      success: true,
      data: steps || []
    });

  } catch (error) {
    console.error('❌ Get steps error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/admin/lessons/:lessonId/steps/:stepId
 * Get single step
 */
router.get('/lessons/:lessonId/steps/:stepId', adminAuth, async (req, res) => {
  try {
    const { lessonId, stepId } = req.params;
    console.log('📄 Fetching step:', stepId);

    const { data: step, error } = await supabase
      .from('lesson_steps')
      .select('*')
      .eq('id', stepId)
      .eq('lesson_id', lessonId)
      .single();

    if (error) throw error;

    if (!step) {
      return res.status(404).json({
        success: false,
        error: 'Step not found'
      });
    }

    res.json({
      success: true,
      data: step
    });

  } catch (error) {
    console.error('❌ Get step error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/lessons/:lessonId/steps
 * Create step
 */
router.post('/lessons/:lessonId/steps', adminAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    console.log('➕ Creating step for lesson:', lessonId);

    const stepData = {
      ...req.body,
      lesson_id: lessonId
    };

    const { data: step, error } = await supabase
      .from('lesson_steps')
      .insert([stepData])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Step created');

    res.json({
      success: true,
      data: step,
      message: 'Step created successfully'
    });

  } catch (error) {
    console.error('❌ Create step error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/lessons/:lessonId/steps/:stepId
 * Update step
 */
router.put('/lessons/:lessonId/steps/:stepId', adminAuth, async (req, res) => {
  try {
    const { lessonId, stepId } = req.params;
    console.log('✏️ Updating step:', stepId);

    const { data: step, error } = await supabase
      .from('lesson_steps')
      .update(req.body)
      .eq('id', stepId)
      .eq('lesson_id', lessonId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Step updated');

    res.json({
      success: true,
      data: step,
      message: 'Step updated successfully'
    });

  } catch (error) {
    console.error('❌ Update step error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/lessons/:lessonId/steps/:stepId
 * Delete step
 */
router.delete('/lessons/:lessonId/steps/:stepId', adminAuth, async (req, res) => {
  try {
    const { lessonId, stepId } = req.params;
    console.log('🗑️ Deleting step:', stepId);

    const { error } = await supabase
      .from('lesson_steps')
      .delete()
      .eq('id', stepId)
      .eq('lesson_id', lessonId);

    if (error) throw error;

    console.log('✅ Step deleted');

    res.json({
      success: true,
      message: 'Step deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete step error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== QUIZ MANAGEMENT ====================

/**
 * GET /api/admin/quizzes
 * Get all quizzes
 */
router.get('/quizzes', adminAuth, async (req, res) => {
  try {
    console.log('📝 Fetching all quizzes...');

    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`✅ Fetched ${quizzes?.length || 0} quizzes`);

    res.json({
      success: true,
      data: quizzes || []
    });

  } catch (error) {
    console.error('❌ Get quizzes error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/admin/quizzes/:id
 * Get quiz by ID
 */
router.get('/quizzes/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📝 Fetching quiz:', id);

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    res.json({
      success: true,
      data: quiz
    });

  } catch (error) {
    console.error('❌ Get quiz error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/quizzes
 * Create quiz
 */
router.post('/quizzes', adminAuth, async (req, res) => {
  try {
    console.log('➕ Creating quiz:', req.body);

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Quiz created');

    res.json({
      success: true,
      data: quiz,
      message: 'Quiz created successfully'
    });

  } catch (error) {
    console.error('❌ Create quiz error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/quizzes/:id
 * Update quiz
 */
router.put('/quizzes/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ Updating quiz:', id);

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Quiz updated');

    res.json({
      success: true,
      data: quiz,
      message: 'Quiz updated successfully'
    });

  } catch (error) {
    console.error('❌ Update quiz error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/quizzes/:id
 * Delete quiz
 */
router.delete('/quizzes/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting quiz:', id);

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Quiz deleted');

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete quiz error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== QUIZ QUESTIONS MANAGEMENT ====================

/**
 * GET /api/admin/quizzes/:quizId/questions
 * Get all questions for a quiz
 */
router.get('/quizzes/:quizId/questions', adminAuth, async (req, res) => {
  try {
    const { quizId } = req.params;
    console.log('❓ Fetching questions for quiz:', quizId);

    const { data: questions, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_number', { ascending: true });

    if (error) throw error;

    console.log(`✅ Fetched ${questions?.length || 0} questions`);

    res.json({
      success: true,
      data: questions || []
    });

  } catch (error) {
    console.error('❌ Get questions error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/admin/quizzes/:quizId/questions/:questionId
 * Get single question
 */
router.get('/quizzes/:quizId/questions/:questionId', adminAuth, async (req, res) => {
  try {
    const { quizId, questionId } = req.params;
    console.log('❓ Fetching question:', questionId);

    const { data: question, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('id', questionId)
      .eq('quiz_id', quizId)
      .single();

    if (error) throw error;

    if (!question) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    res.json({
      success: true,
      data: question
    });

  } catch (error) {
    console.error('❌ Get question error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/quizzes/:quizId/questions
 * Create question
 */
router.post('/quizzes/:quizId/questions', adminAuth, async (req, res) => {
  try {
    const { quizId } = req.params;
    console.log('➕ Creating question for quiz:', quizId);

    const questionData = {
      ...req.body,
      quiz_id: quizId
    };

    const { data: question, error } = await supabase
      .from('quiz_questions')
      .insert([questionData])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Question created');

    res.json({
      success: true,
      data: question,
      message: 'Question created successfully'
    });

  } catch (error) {
    console.error('❌ Create question error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/quizzes/:quizId/questions/:questionId
 * Update question
 */
router.put('/quizzes/:quizId/questions/:questionId', adminAuth, async (req, res) => {
  try {
    const { quizId, questionId } = req.params;
    console.log('✏️ Updating question:', questionId);

    const { data: question, error } = await supabase
      .from('quiz_questions')
      .update(req.body)
      .eq('id', questionId)
      .eq('quiz_id', quizId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Question updated');

    res.json({
      success: true,
      data: question,
      message: 'Question updated successfully'
    });

  } catch (error) {
    console.error('❌ Update question error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/quizzes/:quizId/questions/:questionId
 * Delete question
 */
router.delete('/quizzes/:quizId/questions/:questionId', adminAuth, async (req, res) => {
  try {
    const { quizId, questionId } = req.params;
    console.log('🗑️ Deleting question:', questionId);

    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', questionId)
      .eq('quiz_id', quizId);

    if (error) throw error;

    console.log('✅ Question deleted');

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete question error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== QUIZ OPTIONS MANAGEMENT ====================

/**
 * GET /api/admin/quizzes/:quizId/questions/:questionId/options
 * Get all options for a question
 */
router.get('/quizzes/:quizId/questions/:questionId/options', adminAuth, async (req, res) => {
  try {
    const { questionId } = req.params;
    console.log('🔘 Fetching options for question:', questionId);

    const { data: options, error } = await supabase
      .from('quiz_options')
      .select('*')
      .eq('question_id', questionId)
      .order('order_number', { ascending: true });

    if (error) throw error;

    console.log(`✅ Fetched ${options?.length || 0} options`);

    res.json({
      success: true,
      data: options || []
    });

  } catch (error) {
    console.error('❌ Get options error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * POST /api/admin/quizzes/:quizId/questions/:questionId/options
 * Create option
 */
router.post('/quizzes/:quizId/questions/:questionId/options', adminAuth, async (req, res) => {
  try {
    const { questionId } = req.params;
    console.log('➕ Creating option for question:', questionId);

    const optionData = {
      ...req.body,
      question_id: questionId
    };

    const { data: option, error } = await supabase
      .from('quiz_options')
      .insert([optionData])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Option created');

    res.json({
      success: true,
      data: option,
      message: 'Option created successfully'
    });

  } catch (error) {
    console.error('❌ Create option error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/quizzes/:quizId/questions/:questionId/options/:optionId
 * Update option
 */
router.put('/quizzes/:quizId/questions/:questionId/options/:optionId', adminAuth, async (req, res) => {
  try {
    const { questionId, optionId } = req.params;
    console.log('✏️ Updating option:', optionId);

    const { data: option, error } = await supabase
      .from('quiz_options')
      .update(req.body)
      .eq('id', optionId)
      .eq('question_id', questionId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Option updated');

    res.json({
      success: true,
      data: option,
      message: 'Option updated successfully'
    });

  } catch (error) {
    console.error('❌ Update option error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/quizzes/:quizId/questions/:questionId/options/:optionId
 * Delete option
 */
router.delete('/quizzes/:quizId/questions/:questionId/options/:optionId', adminAuth, async (req, res) => {
  try {
    const { questionId, optionId } = req.params;
    console.log('🗑️ Deleting option:', optionId);

    const { error } = await supabase
      .from('quiz_options')
      .delete()
      .eq('id', optionId)
      .eq('question_id', questionId);

    if (error) throw error;

    console.log('✅ Option deleted');

    res.json({
      success: true,
      message: 'Option deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete option error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== CHALLENGE MANAGEMENT ====================

/**
 * GET /api/admin/challenges
 * Get all challenges
 */
router.get('/challenges', adminAuth, async (req, res) => {
  try {
    console.log('🎯 Fetching all challenges...');

    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`✅ Fetched ${challenges?.length || 0} challenges`);

    res.json({
      success: true,
      data: challenges || []
    });

  } catch (error) {
    console.error('❌ Get challenges error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/admin/challenges/:id
 * Get challenge by ID
 */
router.get('/challenges/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🎯 Fetching challenge:', id);

    const { data: challenge, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!challenge) {
      return res.status(404).json({
        success: false,
        error: 'Challenge not found'
      });
    }

    res.json({
      success: true,
      data: challenge
    });

  } catch (error) {
    console.error('❌ Get challenge error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/challenges
 * Create challenge
 */
router.post('/challenges', adminAuth, async (req, res) => {
  try {
    console.log('➕ Creating challenge:', req.body);

    const { data: challenge, error } = await supabase
      .from('challenges')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Challenge created');

    res.json({
      success: true,
      data: challenge,
      message: 'Challenge created successfully'
    });

  } catch (error) {
    console.error('❌ Create challenge error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/challenges/:id
 * Update challenge
 */
router.put('/challenges/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ Updating challenge:', id);

    const { data: challenge, error } = await supabase
      .from('challenges')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Challenge updated');

    res.json({
      success: true,
      data: challenge,
      message: 'Challenge updated successfully'
    });

  } catch (error) {
    console.error('❌ Update challenge error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/challenges/:id
 * Delete challenge
 */
router.delete('/challenges/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting challenge:', id);

    const { error } = await supabase
      .from('challenges')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Challenge deleted');

    res.json({
      success: true,
      message: 'Challenge deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete challenge error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== SKILLS MANAGEMENT ====================

/**
 * GET /api/admin/skills
 * Get all skills
 */
router.get('/skills', adminAuth, async (req, res) => {
  try {
    console.log('💪 Fetching all skills...');

    const { data: skills, error } = await supabase
      .from('skills')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    console.log(`✅ Fetched ${skills?.length || 0} skills`);

    res.json({
      success: true,
      data: skills || []
    });

  } catch (error) {
    console.error('❌ Get skills error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/admin/skills/:id
 * Get skill by ID
 */
router.get('/skills/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('💪 Fetching skill:', id);

    const { data: skill, error } = await supabase
      .from('skills')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!skill) {
      return res.status(404).json({
        success: false,
        error: 'Skill not found'
      });
    }

    res.json({
      success: true,
      data: skill
    });

  } catch (error) {
    console.error('❌ Get skill error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/skills
 * Create skill
 */
router.post('/skills', adminAuth, async (req, res) => {
  try {
    console.log('➕ Creating skill:', req.body);

    const { data: skill, error } = await supabase
      .from('skills')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Skill created');

    res.json({
      success: true,
      data: skill,
      message: 'Skill created successfully'
    });

  } catch (error) {
    console.error('❌ Create skill error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/skills/:id
 * Update skill
 */
router.put('/skills/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ Updating skill:', id);

    const { data: skill, error } = await supabase
      .from('skills')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Skill updated');

    res.json({
      success: true,
      data: skill,
      message: 'Skill updated successfully'
    });

  } catch (error) {
    console.error('❌ Update skill error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/skills/:id
 * Delete skill
 */
router.delete('/skills/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting skill:', id);

    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Skill deleted');

    res.json({
      success: true,
      message: 'Skill deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete skill error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== COMPANIES MANAGEMENT ====================

/**
 * GET /api/admin/companies
 * Get all companies
 */
router.get('/companies', adminAuth, async (req, res) => {
  try {
    console.log('🏢 Fetching all companies...');

    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    console.log(`✅ Fetched ${companies?.length || 0} companies`);

    res.json({
      success: true,
      data: companies || []
    });

  } catch (error) {
    console.error('❌ Get companies error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/admin/companies/:id
 * Get company by ID
 */
router.get('/companies/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🏢 Fetching company:', id);

    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    res.json({
      success: true,
      data: company
    });

  } catch (error) {
    console.error('❌ Get company error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/admin/companies
 * Create company
 */
router.post('/companies', adminAuth, async (req, res) => {
  try {
    console.log('➕ Creating company:', req.body);

    const { data: company, error } = await supabase
      .from('companies')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Company created');

    res.json({
      success: true,
      data: company,
      message: 'Company created successfully'
    });

  } catch (error) {
    console.error('❌ Create company error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/companies/:id
 * Update company
 */
router.put('/companies/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ Updating company:', id);

    const { data: company, error } = await supabase
      .from('companies')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Company updated');

    res.json({
      success: true,
      data: company,
      message: 'Company updated successfully'
    });

  } catch (error) {
    console.error('❌ Update company error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/admin/companies/:id
 * Delete company
 */
router.delete('/companies/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Deleting company:', id);

    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('✅ Company deleted');

    res.json({
      success: true,
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete company error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== LOGS ====================

/**
 * GET /api/admin/logs
 * Get admin activity logs
 */
router.get('/logs', adminAuth, async (req, res) => {
  try {
    console.log('📋 Fetching admin logs...');

    const { data: logs, error } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      // If table doesn't exist, return empty array
      console.log('⚠️ Admin logs table not found, returning empty');
      return res.json({
        success: true,
        data: []
      });
    }

    res.json({
      success: true,
      data: logs || []
    });

  } catch (error) {
    console.error('❌ Get logs error:', error);
    res.status(500).json({
      success: true, // Still return success with empty data
      data: []
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

function getTimeAgo(timestamp) {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return past.toLocaleDateString();
}

module.exports = router;