// src/controllers/points.controller.js
const { supabase } = require('../config/supabase');

// ── Award points — 24h dedup per user+reason+ref_id ──────────
const awardPoints = async (req, res) => {
  try {
    const { user_id, points, reason, ref_id, ref_type, meta } = req.body;

    if (!user_id || !points || !reason) {
      return res.status(400).json({
        success: false,
        message: 'user_id, points, and reason are required',
      });
    }

    // Dedup: skip if already awarded same reason+ref_id in last 24h
    if (ref_id) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id',   user_id)
        .eq('reason',    reason)
        .eq('ref_id',    ref_id)
        .gte('created_at', since)
        .limit(1);

      if (existing && existing.length > 0) {
        return res.json({
          success: true,
          data: { new_total: null, skipped: true, message: 'Already awarded' },
        });
      }
    }

    const { data, error } = await supabase.rpc('award_points', {
      p_user_id:  user_id,
      p_points:   points,
      p_reason:   reason,
      p_ref_id:   ref_id   || null,
      p_ref_type: ref_type || null,
      p_meta:     meta     || null,
    });

    if (error) throw error;

    return res.json({ success: true, data: { new_total: data } });
  } catch (err) {
    console.error('Award points error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get user points + ATL score ───────────────────────────────
const getUserPoints = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_points')
      .select('points, atl_score, streak, longest_streak, last_activity_date, updated_at')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return res.json({
      success: true,
      data: data || { points: 0, atl_score: 0, streak: 0, longest_streak: 0 },
    });
  } catch (err) {
    console.error('Get user points error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get points transaction history ───────────────────────────
const getPointHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit  = parseInt(req.query.limit)  || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { data, error, count } = await supabase
      .from('point_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.json({ success: true, data, total: count });
  } catch (err) {
    console.error('Get point history error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Leaderboard ───────────────────────────────────────────────
const getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const { data, error } = await supabase
      .from('user_points')
      .select(`
        user_id,
        points,
        atl_score,
        streak,
        users ( full_name, email, avatar_url )
      `)
      .order('atl_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Get leaderboard error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Save / update lesson progress ────────────────────────────
const saveLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id;
    const { steps_completed, total_steps, xp_earned, status } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { data, error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id:         userId,
        lesson_id:       lessonId,
        status:          status          || 'in_progress',
        steps_completed: steps_completed || 0,
        total_steps:     total_steps     || 0,
        xp_earned:       xp_earned       || 0,
        ...(status === 'completed' && { completed_at: new Date().toISOString() }),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (error) throw error;

    // Auto-award XP when a lesson is completed
    if (status === 'completed') {
      const LESSON_XP = xp_earned || 10;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('point_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('reason',  'lesson_completed')
        .eq('ref_id',  lessonId)
        .gte('created_at', since)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.rpc('award_points', {
          p_user_id:  userId,
          p_points:   LESSON_XP,
          p_reason:   'lesson_completed',
          p_ref_id:   lessonId,
          p_ref_type: 'lesson',
          p_meta:     null,
        });
      }
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Save lesson progress error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Save assessment result ────────────────────────────────────
const saveAssessment = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id;
    const { assessment_score, xp_earned, status } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { data, error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id:          userId,
        lesson_id:        lessonId,
        assessment_score: assessment_score || 0,
        xp_earned:        xp_earned        || 0,
        status:           status            || 'completed',
        completed_at:     new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Save assessment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get all lesson progress for logged-in user ───────────────
const getLessonProgress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    return res.json({ success: true, data });
  } catch (err) {
    console.error('Get lesson progress error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  awardPoints,
  getUserPoints,
  getPointHistory,
  getLeaderboard,
  saveLessonProgress,
  saveAssessment,
  getLessonProgress,
};