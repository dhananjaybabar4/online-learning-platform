// backend/src/controllers/lessons.controller.js
const { supabaseAdmin } = require('../config/supabase');
const { supabase }      = require('../config/supabase');

const db = supabaseAdmin;

// ── XP award helper (same dedup pattern as points.controller) ──
const _awardXP = async ({ userId, points, reason, refId, refType, meta }) => {
  if (!userId) return null;
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('point_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('reason',  reason)
      .eq('ref_id',  refId)
      .gte('created_at', since)
      .limit(1);

    if (existing && existing.length > 0) return null; // already awarded

    const { data, error } = await supabase.rpc('award_points', {
      p_user_id:  userId,
      p_points:   points,
      p_reason:   reason,
      p_ref_id:   refId   || null,
      p_ref_type: refType || null,
      p_meta:     meta    || null,
    });
    if (error) { console.warn('award_points rpc error:', error.message); return null; }
    return data; // new XP total
  } catch (e) {
    console.warn('_awardXP failed:', e.message);
    return null;
  }
};

// ================================
// LESSONS CRUD
// ================================

exports.getAllLessons = async (req, res) => {
  try {
    const { data, error } = await db
      .from('lessons')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) throw error;

    const mappedData = (data || []).map(l => ({ ...l, display_order: l.order_index }));
    res.json({ success: true, data: mappedData });
  } catch (error) {
    console.error('getAllLessons error:', error);
    res.status(500).json({ success: false, message: 'Error fetching lessons', error: error.message });
  }
};

exports.getLessonById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await db.from('lessons').select('*').eq('id', id).single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Lesson not found' });

    res.json({ success: true, data: { ...data, display_order: data.order_index } });
  } catch (error) {
    console.error('getLessonById error:', error);
    res.status(500).json({ success: false, message: 'Error fetching lesson', error: error.message });
  }
};

exports.createLesson = async (req, res) => {
  try {
    const { title, language, difficulty, image_url, display_order, description, topic_id, module_id, xp_reward, estimated_duration, icon } = req.body;

    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });

    const insertData = {
      title: title.trim(),
      description: description || null,
      language: language || null,
      difficulty: difficulty || 'beginner',
      image_url: image_url || null,
      icon: icon || '📖',
      order_index: display_order ? parseInt(display_order) : 1,
      topic_id: topic_id ? parseInt(topic_id) : null,
      module_id: module_id || null,
      xp_reward: xp_reward ? parseInt(xp_reward) : 10,
      estimated_duration: estimated_duration ? parseInt(estimated_duration) : 15,
      is_active: true,
    };

    const { data, error } = await db.from('lessons').insert(insertData).select().single();
    if (error) throw error;

    res.status(201).json({ success: true, data: { ...data, display_order: data.order_index }, message: 'Lesson created successfully' });
  } catch (error) {
    console.error('createLesson error:', error);
    res.status(500).json({ success: false, message: 'Error creating lesson', error: error.message });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, language, difficulty, image_url, display_order, order, description, topic_id, module_id, xp_reward, estimated_duration, icon, is_active } = req.body;

    const updateData = { updated_at: new Date().toISOString() };

    if (title !== undefined)              updateData.title              = title.trim();
    if (description !== undefined)        updateData.description        = description;
    if (language !== undefined)           updateData.language           = language;
    if (difficulty !== undefined)         updateData.difficulty         = difficulty;
    if (image_url !== undefined)          updateData.image_url          = image_url;
    if (icon !== undefined)               updateData.icon               = icon;
    if (display_order !== undefined)      updateData.order_index        = parseInt(display_order);
    else if (order !== undefined)         updateData.order_index        = parseInt(order);
    if (topic_id !== undefined)           updateData.topic_id           = topic_id ? parseInt(topic_id) : null;
    if (module_id !== undefined)          updateData.module_id          = module_id;
    if (xp_reward !== undefined)          updateData.xp_reward          = parseInt(xp_reward);
    if (estimated_duration !== undefined) updateData.estimated_duration = parseInt(estimated_duration);
    if (is_active !== undefined)          updateData.is_active          = is_active;

    const { data, error } = await db.from('lessons').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Lesson not found' });

    res.json({ success: true, data: { ...data, display_order: data.order_index }, message: 'Lesson updated successfully' });
  } catch (error) {
    console.error('updateLesson error:', error);
    res.status(500).json({ success: false, message: 'Error updating lesson', error: error.message });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await db.from('lessons').delete().eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ success: false, message: 'Lesson not found' });

    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('deleteLesson error:', error);
    res.status(500).json({ success: false, message: 'Error deleting lesson', error: error.message });
  }
};

// ================================
// LESSON STEPS
// ================================

exports.getStepsByLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { data, error } = await db
      .from('lesson_steps')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_number', { ascending: true });

    if (error) throw error;

    const mappedData = (data || []).map(s => ({ ...s, order: s.order_number, type: s.step_type }));
    res.json({ success: true, data: mappedData });
  } catch (error) {
    console.error('getStepsByLesson error:', error);
    res.status(500).json({ success: false, message: 'Error fetching steps', error: error.message });
  }
};

exports.getStepById = async (req, res) => {
  try {
    const { stepId } = req.params;
    const { data, error } = await db.from('lesson_steps').select('*').eq('id', stepId).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Step not found' });

    res.json({ success: true, data: { ...data, order: data.order_number, type: data.step_type } });
  } catch (error) {
    console.error('getStepById error:', error);
    res.status(500).json({ success: false, message: 'Error fetching step', error: error.message });
  }
};

exports.createStep = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, step_type, type, content, order, question_text, code_snippet, expected_output, hints, video_url, image_url } = req.body;

    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });

    const stepData = {
      lesson_id:       lessonId,
      title:           title.trim(),
      step_type:       step_type || type || 'text',
      content:         content         || null,
      order_number:    parseInt(order) || 1,
      question_text:   question_text   || null,
      code_snippet:    code_snippet    || null,
      expected_output: expected_output || null,
      hints:           hints           || null,
      video_url:       video_url       || null,
      image_url:       image_url       || null,
    };

    const { data, error } = await db.from('lesson_steps').insert(stepData).select().single();
    if (error) throw error;

    res.status(201).json({ success: true, data: { ...data, order: data.order_number, type: data.step_type }, message: 'Step created successfully' });
  } catch (error) {
    console.error('createStep error:', error);
    res.status(500).json({ success: false, message: 'Error creating step', error: error.message });
  }
};

exports.updateStep = async (req, res) => {
  try {
    const { stepId } = req.params;
    const { title, step_type, type, content, order, question_text, code_snippet, expected_output, hints, video_url, image_url } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (title !== undefined)           updateData.title           = title.trim();
    if (step_type !== undefined)       updateData.step_type       = step_type;
    else if (type !== undefined)       updateData.step_type       = type;
    if (content !== undefined)         updateData.content         = content;
    if (order !== undefined)           updateData.order_number    = parseInt(order);
    if (question_text !== undefined)   updateData.question_text   = question_text;
    if (code_snippet !== undefined)    updateData.code_snippet    = code_snippet;
    if (expected_output !== undefined) updateData.expected_output = expected_output;
    if (hints !== undefined)           updateData.hints           = hints;
    if (video_url !== undefined)       updateData.video_url       = video_url;
    if (image_url !== undefined)       updateData.image_url       = image_url;

    const { data, error } = await db.from('lesson_steps').update(updateData).eq('id', stepId).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Step not found' });

    res.json({ success: true, data: { ...data, order: data.order_number, type: data.step_type }, message: 'Step updated successfully' });
  } catch (error) {
    console.error('updateStep error:', error);
    res.status(500).json({ success: false, message: 'Error updating step', error: error.message });
  }
};

exports.deleteStep = async (req, res) => {
  try {
    const { stepId } = req.params;
    const { data, error } = await db.from('lesson_steps').delete().eq('id', stepId).select();
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ success: false, message: 'Step not found' });

    res.json({ success: true, message: 'Step deleted successfully' });
  } catch (error) {
    console.error('deleteStep error:', error);
    res.status(500).json({ success: false, message: 'Error deleting step', error: error.message });
  }
};

// ================================
// XP-CONNECTED PROGRESS ENDPOINTS
// Called by LessonView.jsx frontend
// ================================

/**
 * POST /student/:lessonId/progress
 * Body: { steps_completed, total_steps, xp_earned, status }
 * Awards +10 XP when status === 'completed' (lesson_complete reason)
 */
exports.saveProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id;
    const { steps_completed, total_steps, xp_earned, status } = req.body;

    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Upsert progress row
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

    // Award XP on completion — +10 lesson XP (LessonView already awards +5 step XP per step
    // and +5 lesson_complete, but this server-side award ensures the DB is always in sync)
    let newXpTotal = null;
    if (status === 'completed') {
      const LESSON_XP = xp_earned || 10;
      newXpTotal = await _awardXP({
        userId,
        points:  LESSON_XP,
        reason:  'lesson_completed',
        refId:   lessonId,
        refType: 'lesson',
        meta:    null,
      });
    }

    return res.json({ success: true, data, new_xp_total: newXpTotal });
  } catch (err) {
    console.error('saveProgress error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /student/:lessonId/assessment
 * Body: { assessment_score, xp_earned, status }
 * Awards +2 XP (pass) or +5 XP (ace ≥ 90%) on assessment completion
 */
exports.saveAssessment = async (req, res) => {
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

    // Award XP for assessment (if they passed)
    let newXpTotal = null;
    const score = assessment_score || 0;
    if (score >= 50 && xp_earned > 0) {
      const reason = score >= 90 ? 'assessment_ace' : 'assessment_pass';
      newXpTotal = await _awardXP({
        userId,
        points:  xp_earned,
        reason,
        refId:   lessonId,
        refType: 'assessment',
        meta:    { score },
      });
    }

    return res.json({ success: true, data, new_xp_total: newXpTotal });
  } catch (err) {
    console.error('saveAssessment error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /student/:lessonId/progress
 * Returns the current user's progress for a lesson
 */
exports.getProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (error) throw error;
    return res.json({ success: true, data: data || null });
  } catch (err) {
    console.error('getProgress error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /student/progress/all
 * Returns all lesson progress for the current user
 * Used by Home.jsx to show completed lessons count + streak info
 */
exports.getAllProgress = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { data, error } = await supabase
      .from('lesson_progress')
      .select('lesson_id, status, steps_completed, total_steps, xp_earned, assessment_score, completed_at, updated_at')
      .eq('user_id', userId);

    if (error) throw error;
    return res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('getAllProgress error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /student/:lessonId/step-complete
 * Body: { step_id, step_title }
 * Awards +1 XP per step (server-side dedup ensures no double-award)
 * LessonView.jsx calls this alongside its client-side award
 */
exports.markStepComplete = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id;
    const { step_id, step_title } = req.body;

    if (!userId)  return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!step_id) return res.status(400).json({ success: false, message: 'step_id required' });

    const newXpTotal = await _awardXP({
      userId,
      points:  1,
      reason:  'step_complete',
      refId:   step_id,
      refType: 'step',
      meta:    { lesson_id: lessonId, title: step_title },
    });

    return res.json({ success: true, xp_awarded: 1, new_xp_total: newXpTotal });
  } catch (err) {
    console.error('markStepComplete error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = exports;