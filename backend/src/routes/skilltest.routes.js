// backend/src/routes/skilltest.routes.js
const express = require('express');
const router  = express.Router();
const Groq    = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const answerCache = new Map();
const cleanCache  = () => {
  const cut = Date.now() - 30 * 60 * 1000;
  for (const [k, v] of answerCache) if (v.createdAt < cut) answerCache.delete(k);
};

// ── POST /api/skilltest/generate ──────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    const {
      reason    = 'learn coding',
      goal      = 'web development',
      knowledge = '',
      time      = '30min',
    } = req.body;

    cleanCache();
    const seed = Math.random().toString(36).slice(2, 8);

    const k           = knowledge.toLowerCase();
    const isBeginner  = /beginner|nothing|no prior|none/.test(k) || !knowledge.trim();
    const knowsHTML   = !isBeginner && /html/.test(k);
    const knowsCSS    = !isBeginner && /css/.test(k);
    const knowsJS     = !isBeginner && /javascript|js\b|node|react/.test(k);

    const htmlDiff = knowsHTML
      ? 'intermediate to advanced — they claim HTML knowledge, test applied depth: forms, semantic HTML5, accessibility attributes, defer/async scripts'
      : 'easy to medium — they are learning HTML from scratch, test basic tags and structure';

    const cssDiff = knowsCSS
      ? 'intermediate to advanced — they claim CSS knowledge, test: flexbox, grid, positioning, specificity, custom properties, animations'
      : 'easy to medium — they are new to CSS, test basic selectors, colors, box model';

    const jsDiff = knowsJS
      ? 'intermediate to advanced — they claim JS knowledge, test: closures, promises, async/await, array methods, event loop, scope'
      : 'easy to medium — they are new to JavaScript, test variables, functions, basic DOM, console.log';

    const prompt = `You are ATL's adaptive skill assessment system for Indian BCA/engineering students.

STUDENT PROFILE:
- Goal: "${goal}"
- Role/Background: "${reason}"  
- Time commitment: "${time}"
- Prior knowledge: "${knowledge || 'None — complete beginner'}"
- Is beginner: ${isBeginner}

Generate exactly 12 MCQ questions: 4 HTML, 4 CSS, 4 JavaScript.
Arrange them interleaved: HTML, CSS, JavaScript, HTML, CSS, JavaScript, HTML, CSS, JavaScript, HTML, CSS, JavaScript

DIFFICULTY INSTRUCTIONS:
- HTML questions: ${htmlDiff}
- CSS questions: ${cssDiff}
- JavaScript questions: ${jsDiff}

Within each topic, questions should ESCALATE in difficulty:
- Q1 of each topic: easiest for their level
- Q2: slightly harder
- Q3: harder, requires applied/practical knowledge
- Q4: hardest — predict output, debug code, or real scenario

GOAL-SPECIFIC FOCUS for "${goal}":
- If goal is placement/job: include DSA-adjacent JS (array manipulation, object iteration)
- If goal is frontend/websites: focus on responsive CSS, semantic HTML, DOM events
- If goal is fullstack/backend: include Node.js-flavoured JS, async patterns
- If goal is basics/project: keep practical and visual

STRICT RULES:
1. Each question must have EXACTLY 4 options (A, B, C, D)
2. Only ONE correct answer per question
3. Options should be short (max 10 words each) and all plausible
4. No trick questions — test real knowledge, not wordplay
5. Use seed "${seed}" — generate unique questions every call
6. For code snippet questions: maximum 2 lines of code inline

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "id": 1,
    "question": "Clear question text here",
    "options": ["A. option one", "B. option two", "C. option three", "D. option four"],
    "correct": "A",
    "difficulty": "beginner|intermediate|advanced",
    "topic": "HTML|CSS|JavaScript",
    "explanation": "one sentence why this answer is correct"
  }
]`;

    const response = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  3500,
      temperature: 0.7,
    });

    const raw   = response.choices[0].message.content.trim();
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('AI response did not contain a JSON array');

    let questions;
    try {
      questions = JSON.parse(match[0]);
    } catch (parseErr) {
      throw new Error('Could not parse AI JSON: ' + parseErr.message);
    }

    if (!Array.isArray(questions) || questions.length < 8) {
      throw new Error(`Not enough questions generated (got ${questions?.length || 0})`);
    }

    const finalQs = questions.slice(0, 12);

    // Store session for /evaluate endpoint
    const sessionToken = `st_${Date.now()}_${seed}`;
    answerCache.set(sessionToken, {
      answers:      finalQs.map(q => (q.correct || 'A').toUpperCase()),
      topics:       finalQs.map(q => q.topic      || 'JavaScript'),
      difficulty:   finalQs.map(q => q.difficulty || 'intermediate'),
      explanations: finalQs.map(q => q.explanation || ''),
      goal, reason, knowledge,
      createdAt:    Date.now(),
    });

    // Include correct answer with each question — frontend uses it for local scoring
    res.json({
      success:      true,
      sessionToken,
      questions:    finalQs.map(q => ({
        id:          q.id,
        question:    q.question,
        options:     q.options,
        correct:     (q.correct || 'A').toUpperCase(),
        difficulty:  q.difficulty,
        topic:       q.topic,
        explanation: q.explanation || '',
      })),
    });

  } catch (err) {
    console.error('[skilltest/generate] Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Could not generate questions. Please try again.',
      error:   process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ── POST /api/skilltest/evaluate ──────────────────────────────────────────────
router.post('/evaluate', async (req, res) => {
  try {
    const {
      sessionToken,
      userAnswers = [],
      timings     = [],
      reason      = '',
      goal        = '',
    } = req.body;

    if (!sessionToken || !answerCache.has(sessionToken)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired session.' });
    }

    const cached         = answerCache.get(sessionToken);
    answerCache.delete(sessionToken); // Single use
    const correctAnswers = cached.answers;
    const knowledge      = cached.knowledge || '';

    let score = 0;
    const questionResults = userAnswers.map((ans, i) => {
      const correct = ans?.toUpperCase() === correctAnswers[i];
      if (correct) score++;
      return {
        correct,
        timeTaken:   timings[i] || 25,
        topic:       cached.topics[i]      || 'JavaScript',
        difficulty:  cached.difficulty[i]  || 'intermediate',
        explanation: cached.explanations[i] || '',
      };
    });

    // Per-topic accuracy
    const topicScores = {};
    questionResults.forEach(r => {
      if (!topicScores[r.topic]) topicScores[r.topic] = { correct: 0, total: 0 };
      topicScores[r.topic].total++;
      if (r.correct) topicScores[r.topic].correct++;
    });

    const weakTopics   = Object.entries(topicScores)
      .filter(([, s]) => s.total > 0 && s.correct / s.total < 0.5)
      .map(([t]) => t);
    const strongTopics = Object.entries(topicScores)
      .filter(([, s]) => s.total > 0 && s.correct / s.total >= 0.75)
      .map(([t]) => t);

    const totalCorrect = Object.values(topicScores).reduce((a, s) => a + s.correct, 0);
    const totalQ       = Object.values(topicScores).reduce((a, s) => a + s.total,   0);
    const ratio        = totalQ > 0 ? totalCorrect / totalQ : 0;

    let level, levelLabel, levelEmoji;
    if (ratio >= 0.75)      { level = 'advanced';     levelLabel = 'Advanced';     levelEmoji = '🔥'; }
    else if (ratio >= 0.45) { level = 'intermediate'; levelLabel = 'Intermediate'; levelEmoji = '⚡'; }
    else                    { level = 'beginner';     levelLabel = 'Beginner';     levelEmoji = '🌱'; }

    // Per-topic level for accurate roadmap
    const topicLevel = {};
    Object.entries(topicScores).forEach(([t, s]) => {
      const acc = s.total > 0 ? s.correct / s.total : 0;
      topicLevel[t] = acc >= 0.75 ? 'strong' : acc >= 0.45 ? 'ok' : 'weak';
    });

    // Generate roadmap via Groq
    const topicSummary = Object.entries(topicScores)
      .map(([t, s]) => {
        const pct = s.total > 0 ? Math.round(s.correct / s.total * 100) : 0;
        return `${t}: ${s.correct}/${s.total} (${pct}%) — ${topicLevel[t]}`;
      }).join(', ');

    const roadmapPrompt = `Generate a personalised learning roadmap for this student.

STUDENT DATA:
- Goal: "${goal}" (context: "${reason}")
- Level: ${levelLabel} (${score}/${correctAnswers.length} overall)
- Prior knowledge: "${knowledge}"
- Per-topic: ${topicSummary}
- Weak: ${weakTopics.join(', ') || 'none'}
- Strong: ${strongTopics.join(', ') || 'none'}

ROADMAP RULES:
1. Start with their weakest topic
2. Strong topics get brief coverage
3. Be specific to goal: "${goal}"
4. Each step: 3-5 word topic name

Return ONLY this JSON (no markdown):
{
  "title": "short specific track name",
  "firstLesson": "exact first topic to study",
  "estimatedWeeks": 8,
  "dailyTime": "30 minutes",
  "steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"],
  "summary": "one sentence about their path",
  "keyInsight": "why this order based on scores"
}`;

    let roadmap = null;
    try {
      const roadmapRes = await groq.chat.completions.create({
        model:       'llama-3.3-70b-versatile',
        messages:    [{ role: 'user', content: roadmapPrompt }],
        max_tokens:  500,
        temperature: 0.3,
      });
      const roadmapRaw   = roadmapRes.choices[0].message.content.trim();
      const roadmapMatch = roadmapRaw.match(/\{[\s\S]*\}/);
      if (roadmapMatch) roadmap = JSON.parse(roadmapMatch[0]);
    } catch (e) {
      console.warn('[skilltest/evaluate] Roadmap generation failed:', e.message);
    }

    if (!roadmap) {
      roadmap = {
        title:          `${levelLabel} Track`,
        firstLesson:    level === 'beginner' ? 'HTML Fundamentals' : 'JavaScript ES6+',
        estimatedWeeks: level === 'beginner' ? 8 : level === 'intermediate' ? 10 : 12,
        dailyTime:      '30 minutes',
        steps: level === 'beginner'
          ? ['HTML + CSS Basics', 'JavaScript Intro', 'React Basics', 'Build Projects', 'Final Project']
          : level === 'intermediate'
          ? ['JavaScript ES6+', 'React.js', 'Node.js', 'REST APIs', 'Portfolio']
          : ['System Design', 'Advanced React', 'Node + DBs', 'DSA', 'Job Prep'],
        summary:    `Your path to ${goal}.`,
        keyInsight: `Focus on ${weakTopics[0] || 'JavaScript'} first — that's your biggest gap.`,
      };
    }

    roadmap.weakAreas  = weakTopics;
    roadmap.topicLevel = topicLevel;

    res.json({
      success:    true,
      level,
      levelLabel,
      levelEmoji,
      score,
      total:      correctAnswers.length,
      topicScores,
      topicLevel,
      weakTopics,
      strongTopics,
      roadmap,
    });

  } catch (err) {
    console.error('[skilltest/evaluate] Error:', err.message);
    res.status(500).json({ success: false, message: 'Evaluation failed. Please try again.' });
  }
});

module.exports = router;