// backend/src/controllers/user.controller.js
const { supabase, supabaseAdmin } = require('../config/supabase');

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, avatar_url, role, auth_method, status, xp, level, streak, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, avatar_url, role, auth_method, status, xp, level, streak, created_at')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get user progress
exports.getUserProgress = async (req, res) => {
  try {
    const { id } = req.params;

    // Get lessons progress
    const { data: lessonsProgress, error: lessonsError } = await supabase
      .from('user_progress')
      .select(`
        lesson_id,
        completed,
        completed_at,
        lessons (
          id,
          title,
          category,
          xp_reward
        )
      `)
      .eq('user_id', id)
      .not('lesson_id', 'is', null);

    if (lessonsError) throw lessonsError;

    // Get quizzes progress
    const { data: quizzesProgress, error: quizzesError } = await supabase
      .from('user_progress')
      .select(`
        quiz_id,
        completed,
        score,
        completed_at,
        quizzes (
          id,
          title,
          category
        )
      `)
      .eq('user_id', id)
      .not('quiz_id', 'is', null);

    if (quizzesError) throw quizzesError;

    // Calculate stats
    const completedLessons = lessonsProgress?.filter(l => l.completed).length || 0;
    const completedQuizzes = quizzesProgress?.filter(q => q.completed).length || 0;

    res.json({
      success: true,
      data: {
        lessons: lessonsProgress || [],
        quizzes: quizzesProgress || [],
        stats: {
          completedLessons,
          completedQuizzes
        }
      }
    });
  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, avatar_url } = req.body;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        name,
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, email, name, avatar_url, role, xp, level, streak')
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update streak
exports.updateStreak = async (req, res) => {
  try {
    const { id } = req.params;

    // Get user's last login
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('last_login, streak')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const lastLogin = user.last_login ? new Date(user.last_login) : null;
    const currentStreak = user.streak || 0;
    const now = new Date();

    let newStreak = currentStreak;
    let xpEarned = 0;

    if (!lastLogin) {
      newStreak = 1;
      xpEarned = 10;
    } else {
      const diffDays = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak = currentStreak + 1;
        xpEarned = 10;
      } else if (diffDays > 1) {
        newStreak = 1;
        xpEarned = 10;
      }
    }

    // Update user
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        streak: newStreak,
        xp: (user.xp || 0) + xpEarned,
        last_login: now.toISOString()
      })
      .eq('id', id)
      .select('streak, xp')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: {
        streak: newStreak,
        xp: data.xp,
        xpEarned
      }
    });
  } catch (error) {
    console.error('Update streak error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, avatar_url, xp, level, streak')
      .eq('status', 'active')
      .order('xp', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Add rank
    const leaderboard = data.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};