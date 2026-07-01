// src/routes/story.routes.js
const express = require('express');
const router  = express.Router();
const { adminAuth }   = require('../middleware/admin.middleware');
const { studentAuth } = require('../middleware/student.middleware');
const { supabaseAdmin: supabase } = require('../config/supabase');

// ═══════════════════════════════════════════════════════════════
// STUDENT ROUTES
// ═══════════════════════════════════════════════════════════════

router.get('/', studentAuth, async (req, res) => {
  try {
    const { data: stories, error } = await supabase
      .from('stories')
      .select(`
        *,
        chapters:story_chapters (
          *,
          tasks:story_tasks (
            id, type, dialog, question, mood,
            hint, template, options,
            correct_answer, starter_code, order_no,
            tf_statement, drag_items,
            match_left, match_right,
            scene_instruction, scene_steps
          )
        )
      `)
      .eq('is_published', true)
      .order('order_no');

    if (error) throw error;

    const { data: completions } = await supabase
      .from('story_progress')
      .select('chapter_id, stars')
      .eq('user_id', req.user.id)
      .eq('completed', true);

    const completedMap = {};
    (completions||[]).forEach(c=>{ completedMap[c.chapter_id] = c.stars||3; });

    const enriched = (stories||[]).map(s=>({
      ...s,
      chapters: (s.chapters||[])
        .sort((a,b)=>a.order_no-b.order_no)
        .map(ch=>({
          ...ch,
          completed:   !!completedMap[ch.id],
          stars:       completedMap[ch.id]||0,
          tasks_count: (ch.tasks||[]).length,
          tasks:       (ch.tasks||[]).sort((a,b)=>a.order_no-b.order_no),
        })),
    }));

    res.json({ success: true, data: enriched });
  } catch(e) {
    console.error('GET /story error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/progress/:chapterId', studentAuth, async (req, res) => {
  try {
    const { stars = 3 } = req.body;
    const { error } = await supabase.from('story_progress').upsert(
      {
        user_id:      req.user.id,
        chapter_id:   req.params.chapterId,
        completed:    true,
        stars:        Math.max(0, Math.min(3, Number(stars))),
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,chapter_id' }
    );
    if (error) throw error;
    res.json({ success: true });
  } catch(e) {
    console.error('POST /story/progress error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN — STORIES
// ═══════════════════════════════════════════════════════════════

router.get('/admin/stories', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('stories').select('*').order('order_no');
    if (error) throw error;
    res.json({ success: true, data: data||[] });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/admin/stories', adminAuth, async (req, res) => {
  try {
    const { title, description, icon, order_no } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title required' });
    const { data, error } = await supabase
      .from('stories')
      .insert({ title: title.trim(), description: description||null, icon: icon||'📖', order_no: Number(order_no)||1, is_published: true })
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/admin/stories/:id', adminAuth, async (req, res) => {
  try {
    const { title, description, icon, order_no, is_published } = req.body;
    const { data, error } = await supabase
      .from('stories')
      .update({ title, description, icon, order_no: Number(order_no), is_published: is_published!==undefined?is_published:true, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/admin/stories/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('stories').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN — CHAPTERS
// ═══════════════════════════════════════════════════════════════

router.get('/admin/chapters', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('story_chapters').select('*').order('order_no');
    if (error) throw error;
    res.json({ success: true, data: data||[] });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/admin/chapters', adminAuth, async (req, res) => {
  try {
    const { title, description, icon, order_no, story_id } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title required' });
    if (!story_id)      return res.status(400).json({ success: false, message: 'story_id required' });
    const { data, error } = await supabase
      .from('story_chapters')
      .insert({ title: title.trim(), description: description||null, icon: icon||'⭐', order_no: Number(order_no)||1, story_id })
      .select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/admin/chapters/:id', adminAuth, async (req, res) => {
  try {
    const { title, description, icon, order_no, story_id } = req.body;
    const { data, error } = await supabase
      .from('story_chapters')
      .update({ title, description, icon, order_no: Number(order_no), story_id })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/admin/chapters/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('story_chapters').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN — TASKS
// ═══════════════════════════════════════════════════════════════

router.get('/admin/tasks', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('story_tasks').select('*').order('order_no');
    if (error) throw error;
    res.json({ success: true, data: data||[] });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/admin/tasks', adminAuth, async (req, res) => {
  try {
    const {
      dialog, question, mood, type, order_no,
      options, correct_answer, hint, template, starter_code, chapter_id,
      // New fields
      tf_statement, drag_items, match_left, match_right,
      scene_instruction, scene_steps,
    } = req.body;

    if (!dialog?.trim())  return res.status(400).json({ success: false, message: 'dialog is required' });
    if (!chapter_id)      return res.status(400).json({ success: false, message: 'chapter_id is required' });

    // scene type doesn't need correct_answer from user
    if (type !== 'scene' && !correct_answer?.toString().trim()) {
      return res.status(400).json({ success: false, message: 'correct_answer is required' });
    }

    const { data, error } = await supabase
      .from('story_tasks')
      .insert({
        dialog:            dialog.trim(),
        question:          question          || null,
        mood:              mood              || 'thinking',
        type:              type              || 'mcq',
        order_no:          Number(order_no)  || 1,
        options:           Array.isArray(options) ? options : [],
        correct_answer:    type==='scene' ? 'scene_complete' : correct_answer?.toString().trim(),
        hint:              hint             || null,
        template:          template         || null,
        starter_code:      starter_code     || null,
        chapter_id,
        // New type fields
        tf_statement:      tf_statement      || null,
        drag_items:        Array.isArray(drag_items)  ? drag_items  : null,
        match_left:        Array.isArray(match_left)  ? match_left  : null,
        match_right:       Array.isArray(match_right) ? match_right : null,
        scene_instruction: scene_instruction || null,
        scene_steps:       Number(scene_steps)||5,
      })
      .select().single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch(e) {
    console.error('POST /admin/tasks error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/admin/tasks/:id', adminAuth, async (req, res) => {
  try {
    const {
      dialog, question, mood, type, order_no,
      options, correct_answer, hint, template, starter_code, chapter_id,
      tf_statement, drag_items, match_left, match_right,
      scene_instruction, scene_steps,
    } = req.body;

    const { data, error } = await supabase
      .from('story_tasks')
      .update({
        dialog, question, mood, type,
        order_no:          Number(order_no),
        options:           Array.isArray(options) ? options : [],
        correct_answer:    type==='scene' ? 'scene_complete' : correct_answer,
        hint, template, starter_code, chapter_id,
        tf_statement:      tf_statement      || null,
        drag_items:        Array.isArray(drag_items)  ? drag_items  : null,
        match_left:        Array.isArray(match_left)  ? match_left  : null,
        match_right:       Array.isArray(match_right) ? match_right : null,
        scene_instruction: scene_instruction || null,
        scene_steps:       Number(scene_steps)||5,
      })
      .eq('id', req.params.id).select().single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch(e) {
    console.error('PUT /admin/tasks error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/admin/tasks/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase.from('story_tasks').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;