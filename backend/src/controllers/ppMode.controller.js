// backend/src/controllers/ppMode.controller.js
// FIXED: null safety for pp_goal_track, rank added, bonus PP scoring

const { supabaseAdmin: supabase } = require('../config/supabase');

// ── Config ─────────────────────────────────────────────────────
const ROUND_CONFIG = {
  1: { total: 10, pass_percent: 60, base_points: 100, time_limit_sec: 900  },
  2: { total: 10, pass_percent: 60, base_points: 150, time_limit_sec: 1200 },
  3: { total: 10, pass_percent: 60, base_points: 200, time_limit_sec: 1200 },
};

const TOPIC_LESSON_MAP = {
  'Maths':          'aptitude-maths',
  'Logic':          'aptitude-logic',
  'Verbal':         'aptitude-verbal',
  'OOP':            'oop-basics',
  'DBMS':           'dbms-fundamentals',
  'OS':             'operating-systems',
  'Networking':     'networking-basics',
  'Predict Output': 'code-tracing',
  'Find Bug':       'debugging',
  'HTML Basics':    'html-basics',
  'HTML Forms':     'html-forms',
  'HTML Structure': 'html-structure',
  'CSS Basics':     'css-basics',
  'CSS Box Model':  'css-box-model',
  'CSS Flexbox':    'css-flexbox',
  'JS Basics':      'javascript-basics',
  'HTML Code':      'html-basics',
  'CSS Code':       'css-basics',
  'Python Basics':  'python-basics',
  'Variables':      'python-basics',
  'Loops':          'python-loops',
  'Functions':      'python-functions',
  'Modules':        'python-modules',
};

// ── Helpers ────────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Calculate PP with accuracy + speed bonus
function calculatePP(roundNumber, correctCount, total, timeTakenSec) {
  const config  = ROUND_CONFIG[roundNumber];
  const percent = (correctCount / total) * 100;

  if (percent < config.pass_percent) return { ppEarned: 0, accuracyBonus: 0, speedBonus: 0 };

  const accuracyBonus = percent >= 80 ? 25 : 0;
  const speedBonus    = timeTakenSec && timeTakenSec < (config.time_limit_sec * 0.75) ? 25 : 0;
  const ppEarned      = config.base_points + accuracyBonus + speedBonus;

  return { ppEarned, accuracyBonus, speedBonus };
}

// Get total PP points for a user from point_transactions
async function getUserPPPoints(userId) {
  const { data } = await supabase
    .from('point_transactions')
    .select('points')
    .eq('user_id', userId)
    .like('reason', 'pp_round_%');

  return (data || []).reduce((sum, row) => sum + (row.points || 0), 0);
}

// Get global rank for a user based on PP points
async function getGlobalRank(userId, userPP) {
  const { count: aboveCount } = await supabase
    .from('point_transactions')
    .select('user_id', { count: 'exact', head: true })
    .like('reason', 'pp_round_%')
    .gt('points', userPP);

  const { count: totalUsers } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });

  const rank       = (aboveCount || 0) + 1;
  const total      = totalUsers || 1;
  const percentile = Math.round(((total - rank) / total) * 100);

  return { rank, totalUsers: total, percentile };
}

// Award points — idempotent, won't double award
async function awardPPPoints(userId, sessionId, roundNumber, points, meta = {}) {
  const { data: existing } = await supabase
    .from('point_transactions')
    .select('id')
    .eq('ref_id', sessionId)
    .eq('ref_type', 'pp_session')
    .maybeSingle();

  if (existing) return; // Already awarded for this session

  await supabase.from('point_transactions').insert({
    user_id:  userId,
    points,
    reason:   `pp_round_${roundNumber}`,
    ref_id:   sessionId,
    ref_type: 'pp_session',
    meta:     { round: roundNumber, ...meta },
  });
}

async function updateWeakAreas(userId, goalTrack, roundNumber, answers) {
  const topicStats = {};
  for (const ans of answers) {
    const t = ans.topic || 'General';
    if (!topicStats[t]) topicStats[t] = { wrong: 0, total: 0 };
    topicStats[t].total++;
    if (!ans.is_correct) topicStats[t].wrong++;
  }
  for (const [topic, stats] of Object.entries(topicStats)) {
    await supabase.from('pp_weak_areas').upsert({
      user_id:       userId,
      goal_track:    goalTrack,
      round_number:  roundNumber,
      topic,
      wrong_count:   stats.wrong,
      attempt_count: stats.total,
      lesson_slug:   TOPIC_LESSON_MAP[topic] || null,
      last_updated:  new Date().toISOString(),
    }, { onConflict: 'user_id,goal_track,round_number,topic' });
  }
}

// ── Student Controllers ────────────────────────────────────────

// GET /api/pp/status
exports.getStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // FIXED: use maybeSingle() so no crash when row missing
    const { data: user } = await supabase
      .from('users')
      .select('pp_round1_passed, pp_round2_passed, pp_round3_passed, pp_completed, pp_goal_track, goal')
      .eq('id', userId)
      .maybeSingle();

    const { data: weakAreas } = await supabase
      .from('pp_weak_areas')
      .select('*')
      .eq('user_id', userId)
      .order('wrong_count', { ascending: false });

    const ppPoints  = await getUserPPPoints(userId);
    const rankData  = await getGlobalRank(userId, ppPoints);

    // FIXED: always fallback to 'placement' — never null
    const goalTrack = user?.pp_goal_track
      || user?.goal
      || 'placement';

    res.json({
      goalTrack,
      round1Passed: user?.pp_round1_passed || false,
      round2Passed: user?.pp_round2_passed || false,
      round3Passed: user?.pp_round3_passed || false,
      completed:    user?.pp_completed     || false,
      ppPoints,
      rank:         rankData.rank,
      totalUsers:   rankData.totalUsers,
      percentile:   rankData.percentile,
      weakAreas:    weakAreas || [],
    });
  } catch (err) {
    console.error('getStatus error:', err.message);
    // FIXED: return safe default instead of crashing
    res.json({
      goalTrack:    'placement',
      round1Passed: false,
      round2Passed: false,
      round3Passed: false,
      completed:    false,
      ppPoints:     0,
      rank:         null,
      totalUsers:   0,
      percentile:   0,
      weakAreas:    [],
    });
  }
};

// POST /api/pp/session/start  { roundNumber }
exports.startSession = async (req, res) => {
  try {
    const userId          = req.user.id;
    const { roundNumber } = req.body;

    if (![1, 2, 3].includes(Number(roundNumber))) {
      return res.status(400).json({ error: 'Invalid round number' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('pp_round1_passed, pp_round2_passed, goal, pp_goal_track')
      .eq('id', userId)
      .maybeSingle();

    const goalTrack = user?.pp_goal_track || user?.goal || 'placement';

    if (Number(roundNumber) === 2 && !user?.pp_round1_passed) {
      return res.status(403).json({ error: 'Complete Round 1 first' });
    }
    if (Number(roundNumber) === 3 && !user?.pp_round2_passed) {
      return res.status(403).json({ error: 'Complete Round 2 first' });
    }

    // Resume in-progress session if exists
    const { data: existing } = await supabase
      .from('pp_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('round_number', Number(roundNumber))
      .eq('status', 'in_progress')
      .maybeSingle();

    if (existing) {
      return res.json({ sessionId: existing.id, goalTrack, resumed: true });
    }

    const { data: session, error } = await supabase
      .from('pp_sessions')
      .insert({
        user_id:      userId,
        goal_track:   goalTrack,
        round_number: Number(roundNumber),
        status:       'in_progress',
        started_at:   new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ sessionId: session.id, goalTrack, resumed: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pp/session/:sessionId/questions
exports.getQuestions = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId        = req.user.id;

    const { data: session } = await supabase
      .from('pp_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'in_progress') {
      return res.status(400).json({ error: 'Session already completed' });
    }

    const config = ROUND_CONFIG[session.round_number];

    const { data: questions, error } = await supabase
      .from('pp_questions')
      .select('id, topic, question_text, option_a, option_b, option_c, option_d, difficulty')
      .eq('goal_track', session.goal_track)
      .eq('round_number', session.round_number)
      .eq('is_active', true);

    if (error) throw error;

    const selected = shuffle(questions || []).slice(0, config.total);

    if (selected.length === 0) {
      return res.status(404).json({
        error: 'No questions found for this round. Please ask admin to add questions.',
      });
    }

    res.json({
      sessionId,
      goalTrack:   session.goal_track,
      roundNumber: session.round_number,
      total:       selected.length,
      questions:   selected,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/pp/session/:sessionId/submit  { answers: [{questionId, answer}], timeTakenSec }
exports.submitSession = async (req, res) => {
  try {
    const { sessionId }              = req.params;
    const { answers, timeTakenSec }  = req.body;
    const userId                     = req.user.id;

    const { data: session } = await supabase
      .from('pp_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!session)                         return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'in_progress') return res.status(400).json({ error: 'Session already submitted' });

    const questionIds = answers.map(a => a.questionId);
    const { data: questions } = await supabase
      .from('pp_questions')
      .select('id, correct_option, topic')
      .in('id', questionIds);

    const correctMap = {};
    for (const q of (questions || [])) correctMap[q.id] = q;

    let score = 0;
    const answerRows = answers.map(a => {
      const q         = correctMap[a.questionId];
      const isCorrect = q && a.answer === q.correct_option;
      if (isCorrect) score++;
      return {
        session_id:  sessionId,
        question_id: a.questionId,
        topic:       q?.topic || 'General',
        user_answer: a.answer,
        is_correct:  !!isCorrect,
      };
    });

    await supabase.from('pp_answers').insert(answerRows);

    const total   = answers.length;
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;

    // Calculate PP with bonuses
    const { ppEarned, accuracyBonus, speedBonus } = calculatePP(
      session.round_number, score, total, timeTakenSec
    );
    const passed = ppEarned > 0 || percent >= ROUND_CONFIG[session.round_number].pass_percent;

    await supabase.from('pp_sessions').update({
      status:       passed ? 'passed' : 'failed',
      score,
      total,
      completed_at: new Date().toISOString(),
    }).eq('id', sessionId);

    if (passed && ppEarned > 0) {
      // Update round flags
      const updateData = {};
      if (session.round_number === 1) updateData.pp_round1_passed = true;
      if (session.round_number === 2) updateData.pp_round2_passed = true;
      if (session.round_number === 3) {
        updateData.pp_round3_passed = true;
        updateData.pp_completed     = true;
      }
      await supabase.from('users').update(updateData).eq('id', userId);

      // Award PP points
      await awardPPPoints(userId, sessionId, session.round_number, ppEarned, {
        accuracyBonus,
        speedBonus,
        percent,
        timeTakenSec,
      });
    } else if (passed) {
      // Passed but no bonus — still update round flags
      const updateData = {};
      if (session.round_number === 1) updateData.pp_round1_passed = true;
      if (session.round_number === 2) updateData.pp_round2_passed = true;
      if (session.round_number === 3) { updateData.pp_round3_passed = true; updateData.pp_completed = true; }
      await supabase.from('users').update(updateData).eq('id', userId);
    }

    await updateWeakAreas(userId, session.goal_track, session.round_number, answerRows);

    const ppPoints = await getUserPPPoints(userId);
    const rankData = await getGlobalRank(userId, ppPoints);

    res.json({
      sessionId,
      score,
      total,
      percent,
      passed,
      ppEarned,
      breakdown: {
        base:          passed ? ROUND_CONFIG[session.round_number].base_points : 0,
        accuracyBonus: passed ? accuracyBonus : 0,
        speedBonus:    passed ? speedBonus : 0,
      },
      ppPoints,
      rank:       rankData.rank,
      totalUsers: rankData.totalUsers,
      percentile: rankData.percentile,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pp/session/:sessionId/result
exports.getResult = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId        = req.user.id;

    const { data: session } = await supabase
      .from('pp_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { data: answers } = await supabase
      .from('pp_answers')
      .select(`
        id, topic, user_answer, is_correct,
        pp_questions (question_text, correct_option, explanation, option_a, option_b, option_c, option_d)
      `)
      .eq('session_id', sessionId);

    const { data: weakAreas } = await supabase
      .from('pp_weak_areas')
      .select('topic, wrong_count, attempt_count, lesson_slug')
      .eq('user_id', userId)
      .eq('goal_track', session.goal_track)
      .eq('round_number', session.round_number)
      .gt('wrong_count', 0)
      .order('wrong_count', { ascending: false });

    const config  = ROUND_CONFIG[session.round_number];
    const percent = session.total > 0
      ? Math.round((session.score / session.total) * 100)
      : 0;

    const ppPoints = await getUserPPPoints(userId);
    const rankData = await getGlobalRank(userId, ppPoints);

    res.json({
      session,
      percent,
      gap:        Math.max(0, config.pass_percent - percent),
      passAt:     config.pass_percent,
      passed:     session.status === 'passed',
      answers:    answers   || [],
      weakAreas:  weakAreas || [],
      ppPoints,
      rank:       rankData.rank,
      totalUsers: rankData.totalUsers,
      percentile: rankData.percentile,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pp/weak-areas
exports.getWeakAreas = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data } = await supabase
      .from('pp_weak_areas')
      .select('*')
      .eq('user_id', userId)
      .gt('wrong_count', 0)
      .order('wrong_count', { ascending: false });

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Admin Controllers ──────────────────────────────────────────

exports.adminGetQuestions = async (req, res) => {
  try {
    const { track, round } = req.query;
    let query = supabase
      .from('pp_questions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (track) query = query.eq('goal_track', track);
    if (round) query = query.eq('round_number', Number(round));
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminAddQuestion = async (req, res) => {
  try {
    const {
      goal_track, round_number, topic,
      question_text, option_a, option_b, option_c, option_d,
      correct_option, explanation, difficulty,
    } = req.body;

    if (!goal_track || !round_number || !topic || !question_text || !correct_option) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('pp_questions')
      .insert({
        goal_track,
        round_number: Number(round_number),
        topic, question_text,
        option_a, option_b, option_c, option_d,
        correct_option,
        explanation:  explanation || null,
        difficulty:   difficulty  || 'medium',
        is_active:    true,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminUpdateQuestion = async (req, res) => {
  try {
    const { id }  = req.params;
    const updates = { ...req.body };
    delete updates.id;
    const { data, error } = await supabase
      .from('pp_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminDeleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('pp_questions').update({ is_active: false }).eq('id', id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.adminGetAnalytics = async (req, res) => {
  try {
    const { data: sessions } = await supabase
      .from('pp_sessions')
      .select('round_number, status, goal_track');

    const { data: topWeak } = await supabase
      .from('pp_weak_areas')
      .select('topic, goal_track, wrong_count')
      .order('wrong_count', { ascending: false })
      .limit(10);

    const { data: pointRows } = await supabase
      .from('point_transactions')
      .select('reason, points')
      .like('reason', 'pp_round_%');

    const pointsByRound = { 1: 0, 2: 0, 3: 0 };
    for (const row of (pointRows || [])) {
      const r = parseInt(row.reason.replace('pp_round_', ''));
      if (pointsByRound[r] !== undefined) pointsByRound[r] += row.points;
    }

    const stats = {};
    for (const s of (sessions || [])) {
      const track = s.goal_track || 'placement';
      if (!stats[track]) stats[track] = {};
      const key = `round${s.round_number}_${s.status === 'passed' ? 'passed' : 'failed'}`;
      stats[track][key] = (stats[track][key] || 0) + 1;
    }

    res.json({ stats, topWeakAreas: topWeak || [], pointsByRound });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};