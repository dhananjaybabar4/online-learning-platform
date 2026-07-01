// backend/src/routes/skilltest.routes.js
// Uses Groq to generate adaptive questions
// Now accepts 'knowledge' free text from onboarding step 3

const express = require('express');
const router  = express.Router();
const Groq    = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const answerCache = new Map();
const cleanCache  = () => {
  const cut = Date.now() - 30 * 60 * 1000;
  for (const [k, v] of answerCache) if (v.createdAt < cut) answerCache.delete(k);
};

// ── POST /api/skilltest/generate ──────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    const {
      reason        = 'learn coding',
      goal          = 'web development',
      knowledge     = '',           // ← free text from step 3
      round         = 1,
      previousScore = 0,
    } = req.body;

    cleanCache();

    const seed = Math.random().toString(36).slice(2, 8);

    // Parse knowledge text into context for Groq
    const knowledgeContext = knowledge
      ? `The student described their current knowledge as: "${knowledge}". Use this to calibrate question difficulty — if they say they know something, skip the very basics of that topic.`
      : 'No prior knowledge context provided — start from basics.';

    let prompt;

    if (round === 2) {
      // Advanced verification — 3 hard questions
      prompt = `You are an ATL skill assessment system.
Generate exactly 3 HARD MCQ questions for advanced coding verification.
Goal: "${reason}" — "${goal}"
${knowledgeContext}

Rules:
- These must be genuinely hard — practical knowledge, not definitions
- Include: tricky code output, real-world decision, debugging scenario
- Each question SHORT (max 2 lines), options SHORT (max 7 words)
- Use random seed "${seed}" — never repeat the same questions
- One correct answer per question, wrong options must be plausible

Return ONLY this JSON array, no extra text:
[
  {
    "id": 1,
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": "A",
    "difficulty": "advanced",
    "topic": "javascript"
  }
]`;
    } else {
      // Round 1 — 5 questions with escalating difficulty
      prompt = `You are an ATL skill assessment system.
Generate exactly 5 MCQ questions with STRICTLY INCREASING difficulty.
Goal: "${reason}" — "${goal}"
${knowledgeContext}

DIFFICULTY PROGRESSION (must follow exactly):
Q1: Very basic awareness. Someone who has never coded can answer. (e.g. "What does HTML stand for?")
Q2: Basic — someone who read one tutorial might know. (e.g. "Which HTML tag makes text bold?")
Q3: Intermediate — requires having actually tried coding. (e.g. "What does 'console.log' do in JavaScript?")
Q4: Intermediate-hard — requires understanding, not just reading. (e.g. "What is the difference between let and var?")
Q5: Hard — requires actual hands-on experience. Include a CODE SNIPPET and ask for output or what's wrong.

IMPORTANT: Questions must be SPECIFIC to their goal "${goal}" — not generic.
Use random seed "${seed}" — questions must be unique every time.

Return ONLY this JSON array, no extra text:
[
  {
    "id": 1,
    "question": "...",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correct": "A",
    "difficulty": "beginner",
    "topic": "html"
  }
]`;
    }

    const response = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  1500,
      temperature: 0.85,
    });

    const raw   = response.choices[0].message.content.trim();
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Invalid AI response');

    const questions = JSON.parse(match[0]);
    if (!Array.isArray(questions) || questions.length === 0) throw new Error('No questions');

    const sessionToken = `st_${Date.now()}_${seed}`;
    answerCache.set(sessionToken, {
      answers:    questions.map(q => q.correct?.toUpperCase()),
      topics:     questions.map(q => q.topic || 'general'),
      difficulty: questions.map(q => q.difficulty || 'intermediate'),
      round, goal, reason, knowledge,
      createdAt:  Date.now(),
    });

    // Remove correct answers before sending to frontend
    res.json({
      success:  true,
      sessionToken,
      round,
      questions: questions.map(q => ({
        id:         q.id,
        question:   q.question,
        options:    q.options,
        topic:      q.topic,
        difficulty: q.difficulty,
      })),
    });

  } catch (err) {
    console.error('Skill test generate error:', err.message);
    res.status(500).json({ success: false, message: 'Could not generate questions. Try again.' });
  }
});

// ── POST /api/skilltest/evaluate ─────────────────────────────
router.post('/evaluate', async (req, res) => {
  try {
    const {
      sessionToken,
      userAnswers = [],
      timings     = [],
      reason      = '',
      goal        = '',
      round       = 1,
    } = req.body;

    if (!sessionToken || !answerCache.has(sessionToken)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired session.' });
    }

    const cached        = answerCache.get(sessionToken);
    answerCache.delete(sessionToken);
    const correctAnswers = cached.answers;
    const knowledge      = cached.knowledge || '';

    let score = 0;
    const questionResults = userAnswers.map((ans, i) => {
      const correct = ans?.toUpperCase() === correctAnswers[i];
      if (correct) score++;
      return { correct, timeTaken: timings[i] || 25, topic: cached.topics[i], difficulty: cached.difficulty[i] };
    });

    // Anti-cheat
    const superFast       = timings.filter(t => t < 3).length;
    const avgTime         = timings.length > 0 ? timings.reduce((a, b) => a + b, 0) / timings.length : 15;
    const isHighConf      = superFast < 2 && avgTime >= 5;

    // Weak topics
    const weakTopics = [...new Set(questionResults.filter(r => !r.correct).map(r => r.topic).filter(Boolean))];

    // Level logic
    let level, levelLabel, levelEmoji;
    const needsAdvancedRound = round === 1 && score >= 4 && isHighConf;

    if (round === 2) {
      if (score >= 2) { level = 'advanced';     levelLabel = 'Advanced';     levelEmoji = '🔥'; }
      else            { level = 'intermediate';  levelLabel = 'Intermediate'; levelEmoji = '⚡'; }
    } else if (!isHighConf && score >= 4) {
      level = 'intermediate'; levelLabel = 'Intermediate'; levelEmoji = '⚡';
    } else if (score <= 1) {
      level = 'beginner';     levelLabel = 'Beginner';     levelEmoji = '🌱';
    } else if (score <= 3) {
      level = 'intermediate'; levelLabel = 'Intermediate'; levelEmoji = '⚡';
    } else {
      level = needsAdvancedRound ? 'pending_advanced' : 'advanced';
      levelLabel = 'Advanced'; levelEmoji = '🔥';
    }

    if (level === 'pending_advanced') {
      return res.json({
        success:            true,
        needsAdvancedRound: true,
        score,
        total:              correctAnswers.length,
        message:            'Great score! 3 harder questions to confirm your level.',
      });
    }

    // Generate personalised roadmap — include knowledge context
    const roadmapPrompt = `A student wants to "${reason}" with goal: "${goal}".
Their skill level: ${levelLabel} (score ${score}/${correctAnswers.length}).
Weak topics: ${weakTopics.join(', ') || 'none'}.
What they already know: "${knowledge || 'not specified'}".

Generate a personalised 6-step learning roadmap.
- Be SPECIFIC to their goal and level
- Step 1 = their exact starting point (skip topics they already know)
- Steps should be 3-5 word topic names, no fluff
- If beginner: start absolute basics
- If intermediate: start where they're weak
- If advanced: skip basics, go to projects and depth

Return ONLY this JSON:
{
  "title": "short track name",
  "firstLesson": "exact first lesson title from ATL lessons",
  "estimatedWeeks": 8,
  "dailyTime": "30 minutes",
  "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5", "Step 6"],
  "summary": "one direct sentence mentioning their goal and level"
}`;

    const roadmapRes = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: roadmapPrompt }],
      max_tokens:  500,
      temperature: 0.4,
    });

    const roadmapRaw   = roadmapRes.choices[0].message.content.trim();
    const roadmapMatch = roadmapRaw.match(/\{[\s\S]*\}/);
    let roadmap;
    try {
      roadmap = roadmapMatch ? JSON.parse(roadmapMatch[0]) : null;
    } catch {
      roadmap = null;
    }

    if (!roadmap) {
      roadmap = {
        title:          `${levelLabel} Track`,
        firstLesson:    level === 'beginner' ? 'HTML Fundamentals' : 'JavaScript ES6+',
        estimatedWeeks: level === 'beginner' ? 6 : level === 'intermediate' ? 10 : 14,
        dailyTime:      '30 minutes',
        steps:          level === 'beginner'
          ? ['HTML + CSS', 'JavaScript', 'React Basics', 'Build Projects', 'Quiz Practice', 'Final Project']
          : level === 'intermediate'
          ? ['JavaScript ES6+', 'React.js', 'Node.js', 'REST APIs', 'Portfolio Project', 'Interview Prep']
          : ['System Design', 'Advanced React', 'Node + Databases', 'Full Project', 'DSA', 'Job Prep'],
        summary: `Your path to ${goal} — starting at the right level for you.`,
      };
    }

    if (!roadmap.weakAreas) roadmap.weakAreas = weakTopics;

    res.json({
      success:    true,
      level,
      levelLabel,
      levelEmoji,
      score,
      total:      correctAnswers.length,
      confidence: isHighConf ? 'high' : 'low',
      weakTopics,
      roadmap,
    });

  } catch (err) {
    console.error('Skill test evaluate error:', err.message);
    res.status(500).json({ success: false, message: 'Evaluation failed. Try again.' });
  }
});

module.exports = router;