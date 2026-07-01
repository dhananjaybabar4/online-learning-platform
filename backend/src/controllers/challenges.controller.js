// backend/src/controllers/challenges.controller.js
const { supabaseAdmin: supabase } = require('../config/supabase');

const XP_BY_DIFFICULTY = { easy: 10, medium: 20, hard: 30 };

// ── Student Controllers ────────────────────────────────────

exports.studentGetChallenges = async (req, res) => {
  try {
    const userId = req.user?.id;

    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('id, title, description, topic, difficulty, questions_count')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    let solved = [];
    if (userId) {
      try {
        const { data: completions } = await supabase
          .from('challenge_completions')
          .select('challenge_id')
          .eq('user_id', userId);
        solved = (completions || []).map(c => c.challenge_id);
      } catch (e) {
        console.warn('[Challenges] completions fetch failed:', e.message);
      }
    }

    res.json({ challenges: challenges || [], solved });
  } catch (err) {
    console.error('[Challenges] studentGetChallenges error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.studentGetQuestions = async (req, res) => {
  try {
    const { challengeId } = req.params;

    const { data: questions, error } = await supabase
      .from('challenge_questions')
      .select('id, question_text, example_input, example_output, option_a, option_b, option_c, option_d, correct_option, explanation')
      .eq('challenge_id', challengeId)
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) throw error;
    res.json({ questions: questions || [] });
  } catch (err) {
    console.error('[Challenges] studentGetQuestions error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.studentCompleteChallenge = async (req, res) => {
  try {
    const userId          = req.user?.id;
    const { challengeId } = req.params;
    const { xpEarned }    = req.body;

    const { data: challenge } = await supabase
      .from('challenges')
      .select('difficulty, title')
      .eq('id', challengeId)
      .maybeSingle();

    const xp = xpEarned || XP_BY_DIFFICULTY[challenge?.difficulty || 'easy'];

    let existing = null;
    try {
      const { data } = await supabase
        .from('challenge_completions')
        .select('id')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .maybeSingle();
      existing = data;
    } catch {}

    if (!existing) {
      try {
        await supabase.from('challenge_completions').insert({
          user_id: userId, challenge_id: challengeId,
          xp_earned: xp, completed_at: new Date().toISOString(),
        });
        await supabase.from('point_transactions').insert({
          user_id: userId, points: xp,
          reason: `challenge_${challengeId}`, ref_id: challengeId, ref_type: 'challenge',
          meta: { title: challenge?.title, difficulty: challenge?.difficulty },
        });
      } catch (e) { console.warn('[Challenges] completion insert failed:', e.message); }
    }

    try {
      await supabase.from('challenge_attempts').insert({
        user_id: userId, challenge_id: challengeId,
        completed: true, xp_earned: xp, attempted_at: new Date().toISOString(),
      });
    } catch (e) { console.warn('[Challenges] attempt insert failed:', e.message); }

    res.json({ success: true, xpEarned: xp });
  } catch (err) {
    console.error('[Challenges] studentCompleteChallenge error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── Admin Controllers ──────────────────────────────────────

exports.adminGetChallenges = async (req, res) => {
  try {
    const { topic, difficulty } = req.query;

    let query = supabase
      .from('challenges')
      .select('id, title, description, topic, difficulty, questions_count, is_active, created_at')
      .order('created_at', { ascending: false });

    if (topic)      query = query.eq('topic', topic);
    if (difficulty) query = query.eq('difficulty', difficulty);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Challenges] adminGetChallenges error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.adminCreateChallenge = async (req, res) => {
  try {
    const { title, description, topic, difficulty } = req.body;
    if (!title || !topic || !difficulty)
      return res.status(400).json({ error: 'title, topic, and difficulty are required' });

    const { data, error } = await supabase
      .from('challenges')
      .insert({ title, description: description || null, topic, difficulty, is_active: true, questions_count: 0 })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[Challenges] adminCreateChallenge error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.adminUpdateChallenge = async (req, res) => {
  try {
    const { id }  = req.params;
    const updates = { ...req.body };
    delete updates.id;
    delete updates.questions_count;

    const { data, error } = await supabase
      .from('challenges').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[Challenges] adminUpdateChallenge error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.adminDeleteChallenge = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('challenges').update({ is_active: false }).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Challenges] adminDeleteChallenge error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.adminGetAnalytics = async (req, res) => {
  try {
    const { data: challenges } = await supabase
      .from('challenges').select('id, title, topic, difficulty').eq('is_active', true);

    let attempts = [], completions = [];
    try { const { data } = await supabase.from('challenge_attempts').select('challenge_id, completed, xp_earned'); attempts = data || []; } catch {}
    try { const { data } = await supabase.from('challenge_completions').select('challenge_id, xp_earned'); completions = data || []; } catch {}

    const totalChallenges = (challenges || []).length;
    const totalAttempts   = attempts.length;
    const totalCompleted  = completions.length;
    const totalXP         = completions.reduce((s, c) => s + (c.xp_earned || 0), 0);

    const byDifficulty = {};
    for (const d of ['easy', 'medium', 'hard']) {
      const ids = (challenges || []).filter(c => c.difficulty === d).map(c => c.id);
      byDifficulty[d] = {
        attempts:  attempts.filter(a    => ids.includes(a.challenge_id)).length,
        completed: completions.filter(a => ids.includes(a.challenge_id)).length,
      };
    }

    const attemptCount = {}, completeCount = {};
    for (const a of attempts)    attemptCount[a.challenge_id]  = (attemptCount[a.challenge_id]  || 0) + 1;
    for (const c of completions) completeCount[c.challenge_id] = (completeCount[c.challenge_id] || 0) + 1;

    const topChallenges = (challenges || [])
      .map(c => ({ ...c, attempt_count: attemptCount[c.id] || 0, complete_count: completeCount[c.id] || 0 }))
      .sort((a, b) => b.attempt_count - a.attempt_count)
      .slice(0, 10);

    res.json({ totalChallenges, totalAttempts, totalCompleted, totalXP, byDifficulty, topChallenges });
  } catch (err) {
    console.error('[Challenges] adminGetAnalytics error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.adminGetQuestions = async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { data, error } = await supabase
      .from('challenge_questions').select('*')
      .eq('challenge_id', challengeId).eq('is_active', true)
      .order('position', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[Challenges] adminGetQuestions error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.adminAddQuestion = async (req, res) => {
  try {
    const { challenge_id, question_text, example_input, example_output,
            option_a, option_b, option_c, option_d, correct_option, explanation } = req.body;

    if (!challenge_id || !question_text || !correct_option)
      return res.status(400).json({ error: 'challenge_id, question_text, and correct_option are required' });

    const { data: existing } = await supabase
      .from('challenge_questions').select('position')
      .eq('challenge_id', challenge_id).order('position', { ascending: false }).limit(1);

    const nextPos = (existing?.[0]?.position || 0) + 1;

    const { data, error } = await supabase
      .from('challenge_questions')
      .insert({
        challenge_id, question_text,
        example_input: example_input || null, example_output: example_output || null,
        option_a, option_b, option_c, option_d, correct_option,
        explanation: explanation || null, position: nextPos, is_active: true,
      })
      .select().single();

    if (error) throw error;

    try {
      await supabase.rpc('increment_challenge_questions', { challenge_id_param: challenge_id });
    } catch {
      const { count } = await supabase
        .from('challenge_questions').select('id', { count: 'exact', head: true })
        .eq('challenge_id', challenge_id).eq('is_active', true);
      await supabase.from('challenges').update({ questions_count: count || 0 }).eq('id', challenge_id);
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('[Challenges] adminAddQuestion error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.adminUpdateQuestion = async (req, res) => {
  try {
    const { id }  = req.params;
    const updates = { ...req.body };
    delete updates.id; delete updates.challenge_id;
    const { data, error } = await supabase
      .from('challenge_questions').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[Challenges] adminUpdateQuestion error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.adminDeleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: q } = await supabase
      .from('challenge_questions').select('challenge_id').eq('id', id).maybeSingle();

    await supabase.from('challenge_questions').update({ is_active: false }).eq('id', id);

    if (q?.challenge_id) {
      const { count } = await supabase
        .from('challenge_questions').select('id', { count: 'exact', head: true })
        .eq('challenge_id', q.challenge_id).eq('is_active', true);
      await supabase.from('challenges').update({ questions_count: count || 0 }).eq('id', q.challenge_id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Challenges] adminDeleteQuestion error:', err);
    res.status(500).json({ error: err.message });
  }
};