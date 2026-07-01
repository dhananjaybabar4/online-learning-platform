// backend/src/controllers/chatController.js

const Groq = require('groq-sdk');
const { supabase, supabaseAdmin } = require('../config/supabase');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ══════════════════════════════════════════════════════════════
// GOAL → PHASE MAP
// ══════════════════════════════════════════════════════════════
const GOAL_PHASE_MAP = {
  job: [
    { phase: 1, topic: 'HTML',       title: 'HTML Fundamentals',        weeks: 2 },
    { phase: 2, topic: 'CSS',        title: 'CSS & Styling',            weeks: 2 },
    { phase: 3, topic: 'JavaScript', title: 'JavaScript Basics',        weeks: 3 },
    { phase: 4, topic: 'React',      title: 'React.js',                 weeks: 2 },
    { phase: 5, topic: 'Node.js',    title: 'Backend with Node.js',     weeks: 2 },
    { phase: 6, topic: 'Projects',   title: 'Portfolio & Job Prep',     weeks: 1 },
  ],
  placement: [
    { phase: 1, topic: 'Logic',      title: 'Logical Reasoning',        weeks: 1 },
    { phase: 2, topic: 'DSA',        title: 'Data Structures Basics',   weeks: 3 },
    { phase: 3, topic: 'DSA',        title: 'Algorithms & Patterns',    weeks: 3 },
    { phase: 4, topic: 'DSA',        title: 'Advanced DSA + Mock Tests',weeks: 2 },
    { phase: 5, topic: 'Aptitude',   title: 'Aptitude & HR Prep',       weeks: 1 },
  ],
  frontend: [
    { phase: 1, topic: 'HTML',       title: 'HTML Fundamentals',        weeks: 1 },
    { phase: 2, topic: 'CSS',        title: 'CSS & Flexbox & Grid',     weeks: 2 },
    { phase: 3, topic: 'JavaScript', title: 'JavaScript for UI',        weeks: 3 },
    { phase: 4, topic: 'React',      title: 'React.js',                 weeks: 3 },
    { phase: 5, topic: 'Projects',   title: 'Frontend Portfolio',       weeks: 1 },
  ],
  fullstack: [
    { phase: 1, topic: 'HTML',       title: 'HTML & CSS',               weeks: 2 },
    { phase: 2, topic: 'JavaScript', title: 'JavaScript',               weeks: 3 },
    { phase: 3, topic: 'React',      title: 'React.js Frontend',        weeks: 2 },
    { phase: 4, topic: 'Node.js',    title: 'Node.js + Express',        weeks: 2 },
    { phase: 5, topic: 'Database',   title: 'Databases & APIs',         weeks: 2 },
    { phase: 6, topic: 'Projects',   title: 'Full-Stack Projects',      weeks: 1 },
  ],
  basics: [
    { phase: 1, topic: 'HTML',       title: 'HTML Fundamentals',        weeks: 2 },
    { phase: 2, topic: 'CSS',        title: 'CSS Basics',               weeks: 2 },
    { phase: 3, topic: 'JavaScript', title: 'JavaScript Basics',        weeks: 3 },
    { phase: 4, topic: 'Projects',   title: 'Your First Project',       weeks: 1 },
  ],
  freelance: [
    { phase: 1, topic: 'HTML',       title: 'HTML & Structure',         weeks: 1 },
    { phase: 2, topic: 'CSS',        title: 'CSS & Responsive Design',  weeks: 2 },
    { phase: 3, topic: 'JavaScript', title: 'JavaScript Essentials',    weeks: 2 },
    { phase: 4, topic: 'Projects',   title: 'Client Website Projects',  weeks: 2 },
  ],
};

const DEFAULT_PHASES = GOAL_PHASE_MAP.basics;

// ══════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ══════════════════════════════════════════════════════════════
const ATL_BOT_BASE = `You are ATL Bot, a friendly AI coding mentor for Indian students (BCA, Engineering).
Keep answers SHORT (3-5 lines max). Use simple words. Be warm and encouraging.
When asked about roadmap or "what next", always refer to the student's current phase and progress.`;

const buildAssessmentPrompt = (onboarding) => {
  const { role = 'student', goal = 'basics', time = '30min', langs = [] } = onboarding || {};
  const langList = Array.isArray(langs) ? langs.join(', ') : langs;

  return `You are ATL Bot — a friendly coding mentor at ATL (Anytime Learning).

Your ONLY job right now: have a short natural conversation (3-5 messages) to understand the student's REAL coding level.
Then generate their phase-based learning roadmap.

Student info collected during signup:
- Role: ${role}
- Goal: ${goal}
- Daily time: ${time}
- Says they know: ${langList || 'nothing yet'}

CONVERSATION RULES:
- Ask ONE question at a time. Short. Friendly.
- DO NOT quiz them. Talk like a senior dev helping a junior friend.
- Ask things like:
  * "What's the last thing you tried to build?"
  * "Have you ever made a webpage? What happened?"
  * "What part of [topic] confuses you most?"
  * "Did you try any project before?"
- After 3-5 replies you'll know their level: BEGINNER / INTERMEDIATE / ADVANCED

WHEN YOU KNOW THEIR LEVEL:
Say: "Got it! Let me build your path now... 🚀"

Then output EXACTLY this (JSON between the markers):

ROADMAP_START
{
  "skill_level": "beginner|intermediate|advanced",
  "goal": "${goal}",
  "title": "short track title for their goal",
  "summary": "1 sentence — their level + goal",
  "keyInsight": "why we start where we start",
  "current_phase": 1,
  "phase_detail": {
    "phase": 1,
    "topic": "HTML",
    "title": "HTML Fundamentals",
    "why": "one sentence why starting here",
    "tasks": ["task 1", "task 2", "task 3"],
    "estimated_weeks": 2
  }
}
ROADMAP_END

Keep it warm. Max 2 sentences per message during conversation.
NEVER reveal all phases at once — only show phase 1 in the roadmap output.`;
};

const buildRoadmapHelperPrompt = (roadmap, phases, completedLessons) => {
  const currentPhase = phases?.find(p => p.status === 'active');
  const completedPhases = phases?.filter(p => p.status === 'completed') || [];

  return `${ATL_BOT_BASE}

STUDENT'S CURRENT ROADMAP CONTEXT:
- Goal: ${roadmap?.goal || 'learn web development'}
- Overall level: ${roadmap?.skill_level || 'beginner'}
- Current phase: ${currentPhase?.phase_number || 1} — ${currentPhase?.topic || 'HTML'} (${currentPhase?.title || ''})
- Completed phases: ${completedPhases.map(p => p.topic).join(', ') || 'none yet'}
- Lessons completed recently: ${completedLessons?.slice(0, 5).join(', ') || 'none yet'}

RULES WHEN ANSWERING:
- If student asks "what should I study next?" → tell them current phase topic + first task
- If they ask "am I on track?" → check completed phases vs current phase
- If they ask "when will I reach [goal]?" → estimate based on current phase progress
- If they say "I finished HTML" or similar → confirm and hint that next phase will unlock
- Keep all answers SHORT (3-5 lines)`;
};

// ══════════════════════════════════════════════════════════════
// SUPABASE HELPERS
// ══════════════════════════════════════════════════════════════

async function getOrCreateSession(userId, sessionType = 'general') {
  if (!userId) return null;
  
  try {
    // Try to find an active session
    const { data } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('session_type', sessionType)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data?.id) return data.id;

    // Create new session
    const { data: newSession, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: userId, session_type: sessionType, status: 'active' })
      .select('id')
      .single();

    if (error) { 
      console.error('[getOrCreateSession]', error); 
      return null; 
    }
    return newSession.id;
  } catch (err) {
    console.error('[getOrCreateSession]', err);
    return null;
  }
}

async function saveMessage(userId, sessionId, role, content, metadata = {}) {
  if (!userId || !sessionId) return;
  try {
    const { error } = await supabase.from('chat_messages').insert({
      user_id: userId, 
      session_id: sessionId, 
      role, 
      content, 
      metadata,
    });
    if (error) console.error('[saveMessage]', error.message);
  } catch (err) {
    console.error('[saveMessage]', err);
  }
}

async function getSessionHistory(sessionId, limit = 20) {
  if (!sessionId) return [];
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) return [];
    return data || [];
  } catch (err) {
    console.error('[getSessionHistory]', err);
    return [];
  }
}

async function getUserRoadmap(userId) {
  if (!userId) return null;
  try {
    const { data } = await supabase
      .from('user_roadmaps')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data || null;
  } catch (err) {
    console.error('[getUserRoadmap]', err);
    return null;
  }
}

async function getUserPhases(userId) {
  if (!userId) return [];
  try {
    const { data } = await supabase
      .from('roadmap_phases')
      .select('*')
      .eq('user_id', userId)
      .order('phase_number', { ascending: true });
    return data || [];
  } catch (err) {
    console.error('[getUserPhases]', err);
    return [];
  }
}

async function getOnboarding(userId) {
  if (!userId) return null;
  try {
    const { data } = await supabase
      .from('user_onboarding')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data || null;
  } catch (err) {
    console.error('[getOnboarding]', err);
    return null;
  }
}

async function getCompletedLessons(userId) {
  if (!userId) return [];
  try {
    const { data } = await supabase
      .from('lesson_progress')
      .select('lessons(title)')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(10);
    return (data || []).map(d => d.lessons?.title).filter(Boolean);
  } catch (err) {
    console.error('[getCompletedLessons]', err);
    return [];
  }
}

async function saveRoadmapWithPhases(userId, roadmapData, onboardingGoal) {
  if (!userId) return 0;
  
  try {
    const goalKey    = onboardingGoal || roadmapData.goal || 'basics';
    const phaseMap   = GOAL_PHASE_MAP[goalKey] || DEFAULT_PHASES;

    // Upsert roadmap
    const { error: rmErr } = await supabase.from('user_roadmaps').upsert({
      user_id:       userId,
      goal:          goalKey,
      skill_level:   roadmapData.skill_level || 'beginner',
      full_roadmap:  roadmapData,
      current_phase: 1,
      total_phases:  phaseMap.length,
      generated_at:  new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id' });
    
    if (rmErr) console.error('[saveRoadmap]', rmErr.message);

    // Delete old phases and insert new ones
    await supabase.from('roadmap_phases').delete().eq('user_id', userId);

    const phaseRows = phaseMap.map((p, i) => ({
      user_id:          userId,
      phase_number:     p.phase,
      topic:            p.topic,
      title:            p.title,
      status:           i === 0 ? 'active' : 'locked',
      tasks:            roadmapData.phase_detail?.tasks || [],
      lesson_ids:       [],
      unlock_condition: i === 0 ? 'start' : `complete_phase_${p.phase - 1}`,
    }));

    const { error: phErr } = await supabase.from('roadmap_phases').insert(phaseRows);
    if (phErr) console.error('[savePhases]', phErr.message);

    return phaseMap.length;
  } catch (err) {
    console.error('[saveRoadmapWithPhases]', err);
    return 0;
  }
}

async function checkAndUnlockNextPhase(userId) {
  if (!userId) return null;
  
  try {
    const phases = await getUserPhases(userId);
    const active = phases.find(p => p.status === 'active');
    if (!active) return null;

    // Count completed lessons
    const { count } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    const LESSONS_NEEDED = 3;
    if ((count || 0) < LESSONS_NEEDED) {
      return { 
        canUnlock: false, 
        lessonsNeeded: LESSONS_NEEDED - count, 
        currentPhase: active 
      };
    }

    // Mark current as completed
    await supabase.from('roadmap_phases')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('phase_number', active.phase_number);

    const next = phases.find(p => p.phase_number === active.phase_number + 1);
    if (next) {
      await supabase.from('roadmap_phases')
        .update({ status: 'active' })
        .eq('user_id', userId)
        .eq('phase_number', next.phase_number);

      await supabase.from('user_roadmaps')
        .update({ current_phase: next.phase_number, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      return { unlocked: true, newPhase: next };
    }

    return { allComplete: true };
  } catch (err) {
    console.error('[checkAndUnlockNextPhase]', err);
    return null;
  }
}

async function callGroq(messages, maxTokens = 1024) {
  try {
    const res = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens:  maxTokens,
      top_p:       0.9,
    });
    return res.choices[0]?.message?.content || '';
  } catch (err) {
    console.error('[callGroq]', err);
    throw err;
  }
}

function extractRoadmap(text) {
  const match = text.match(/ROADMAP_START\s*([\s\S]*?)\s*ROADMAP_END/);
  if (!match) return null;
  try { 
    return JSON.parse(match[1].trim()); 
  } catch (err) {
    console.error('[extractRoadmap]', err);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
// CONTROLLERS
// ══════════════════════════════════════════════════════════════

// POST /api/chat/send — regular chat
const sendMessage = async (req, res) => {
  try {
    const { message, sessionId: clientSessionId, systemExtra = '' } = req.body;
    const userId = req.user?.id;
    
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    const [roadmap, phases, completedLessons] = await Promise.all([
      getUserRoadmap(userId),
      getUserPhases(userId),
      getCompletedLessons(userId),
    ]);

    const systemPrompt = roadmap
      ? buildRoadmapHelperPrompt(roadmap, phases, completedLessons)
      : (systemExtra ? `${ATL_BOT_BASE}\n\n${systemExtra}` : ATL_BOT_BASE);

    const sessionId = clientSessionId || await getOrCreateSession(userId, 'general');
    const history   = await getSessionHistory(sessionId, 10);

    const botReply = await callGroq([
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ]);

    await saveMessage(userId, sessionId, 'user',      message);
    await saveMessage(userId, sessionId, 'assistant', botReply);

    const phaseUpdate = await checkAndUnlockNextPhase(userId);

    res.json({ 
      success: true, 
      message: botReply, 
      sessionId, 
      phaseUpdate: phaseUpdate || null 
    });
  } catch (err) {
    console.error('[sendMessage]', err);
    res.status(500).json({ success: false, message: 'ATL Bot is unavailable right now.' });
  }
};

// POST /api/chat/converse — assessment
const converseForRoadmap = async (req, res) => {
  try {
    const { message, sessionId: clientSessionId } = req.body;
    const userId = req.user?.id;
    
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });

    const onboarding   = await getOnboarding(userId);
    const systemPrompt = buildAssessmentPrompt(onboarding);
    const sessionId    = clientSessionId || await getOrCreateSession(userId, 'assessment');
    const history      = await getSessionHistory(sessionId, 20);

    const botReply = await callGroq([
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ], 2500);

    const roadmapData = extractRoadmap(botReply);
    const cleanReply  = botReply.replace(/ROADMAP_START[\s\S]*?ROADMAP_END/g, '').trim();

    await saveMessage(userId, sessionId, 'user',      message);
    await saveMessage(userId, sessionId, 'assistant', cleanReply, { hasRoadmap: !!roadmapData });

    let totalPhases = null;
    if (roadmapData && userId) {
      totalPhases = await saveRoadmapWithPhases(userId, roadmapData, onboarding?.goal);
      await supabase.from('chat_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);
    }

    res.json({
      success:     true,
      message:     cleanReply,
      sessionId,
      roadmap:     roadmapData || null,
      totalPhases,
    });
  } catch (err) {
    console.error('[converseForRoadmap]', err);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again!' });
  }
};

// POST /api/chat/groq — raw Groq call
const groqDirect = async (req, res) => {
  try {
    const { messages, max_tokens = 2500 } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }
    const content = await callGroq(messages, max_tokens);
    res.json({ success: true, content, message: content, response: content });
  } catch (err) {
    console.error('[groqDirect]', err);
    res.status(500).json({ error: 'Failed to generate response', message: err.message });
  }
};

// GET /api/chat/roadmap
const getRoadmap = async (req, res) => {
  try {
    const userId = req.user?.id;
    const [roadmap, phases] = await Promise.all([
      getUserRoadmap(userId),
      getUserPhases(userId),
    ]);
    
    if (!roadmap) {
      return res.json({ success: false, roadmap: null, phases: [] });
    }

    const activePhase     = phases.find(p => p.status === 'active')     || null;
    const completedPhases = phases.filter(p => p.status === 'completed') || [];

    res.json({
      success: true,
      roadmap,
      phases,
      activePhase,
      completedCount:  completedPhases.length,
      totalPhases:     roadmap.total_phases,
      progressPercent: Math.round((completedPhases.length / (roadmap.total_phases || 1)) * 100),
    });
  } catch (err) {
    console.error('[getRoadmap]', err);
    res.status(500).json({ success: false, roadmap: null, phases: [] });
  }
};

// POST /api/chat/unlock-phase
const unlockNextPhase = async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await checkAndUnlockNextPhase(userId);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[unlockNextPhase]', err);
    res.status(500).json({ success: false, message: 'Could not unlock phase' });
  }
};

// GET /api/chat/history/:sessionId
const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, role, content, metadata, created_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(50);
    
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[getChatHistory]', err);
    res.status(500).json({ success: false, data: [] });
  }
};

// GET /api/chat/phase-status
const getPhaseStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const phases = await getUserPhases(userId);
    const active = phases.find(p => p.status === 'active');

    const { count } = await supabase
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    const LESSONS_NEEDED = 3;
    const completed = count || 0;

    res.json({
      success:         true,
      currentPhase:    active,
      allPhases:       phases,
      lessonsCompleted: completed,
      lessonsNeeded:   LESSONS_NEEDED,
      canUnlock:       completed >= LESSONS_NEEDED,
      progressPercent: Math.min(Math.round((completed / LESSONS_NEEDED) * 100), 100),
    });
  } catch (err) {
    console.error('[getPhaseStatus]', err);
    res.status(500).json({ success: false });
  }
};

module.exports = {
  sendMessage,
  converseForRoadmap,
  groqDirect,
  getRoadmap,
  unlockNextPhase,
  getChatHistory,
  getPhaseStatus,
};