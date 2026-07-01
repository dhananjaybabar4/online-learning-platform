// src/hooks/useGroqRoadmap.js
// Calls your existing backend Groq endpoint to generate a personalised roadmap

import { useState, useCallback } from 'react';

const GOAL_LABEL = {
  placement: 'crack campus placement interviews (DSA + aptitude)',
  job:       'get a frontend/fullstack developer job',
  project:   'build a real-world project for portfolio',
  basics:    'learn coding from scratch',
  frontend:  'become a frontend developer (HTML, CSS, JS, React)',
  backend:   'become a backend developer (Node.js, APIs, databases)',
  fullstack: 'become a full-stack developer',
  websites:  'build client websites as a freelancer',
  webapps:   'build full web applications for clients',
  webapp:    'build my own web application',
  saas:      'launch a SaaS product',
  unsure:    'explore web development and find my path',
};

const TIME_LABEL = {
  '15min':  '15 minutes per day',
  '30min':  '30 minutes per day',
  '1hour':  '1 hour per day',
  '2hours': '2+ hours per day',
};

const buildMessages = ({ level, topicScores, goal, knowledge, dailyTime, weakTopics, strongTopics }) => {
  const goalText = GOAL_LABEL[goal] || goal || 'learn web development';
  const timeText = TIME_LABEL[dailyTime] || dailyTime || '30 minutes per day';

  const topicLines = topicScores
    ? Object.entries(topicScores)
        .map(([t, s]) => `  - ${t}: ${s.correct}/${s.total} (${s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0}% accuracy)`)
        .join('\n')
    : '  - Not available';

  const weakList   = weakTopics?.length   ? weakTopics.join(', ')   : 'none';
  const strongList = strongTopics?.length ? strongTopics.join(', ') : 'none';
  const weeks      = level === 'beginner' ? 8 : level === 'intermediate' ? 10 : 12;

  return [
    {
      role: 'system',
      content: `You are an expert programming tutor at ATL (Anytime Learning), an ed-tech platform for BCA/engineering students in India.
You create precise, personalised learning roadmaps based on adaptive skill test results.
Different students have different weak spots even at the same level — your roadmap MUST reflect the exact scores.
Respond ONLY with valid JSON. No markdown, no explanation, no backticks.`,
    },
    {
      role: 'user',
      content: `Generate a personalised ${weeks}-week learning roadmap.

STUDENT PROFILE:
- Skill level: ${level}
- Goal: ${goalText}
- Daily time: ${timeText}
- Prior knowledge: ${knowledge || 'Not specified'}

ADAPTIVE TEST SCORES (per topic):
${topicLines}
- Weak topics (< 50%): ${weakList}
- Strong topics (≥ 75%): ${strongList}

RULES:
1. Address weak topics FIRST in the roadmap
2. Strong topics can be brief
3. Be realistic for ${timeText} daily
4. Add 1 mini-project every 2 weeks
5. Tailor specifically to goal: ${goalText}
6. Total: ${weeks} weeks

Return ONLY this JSON (no markdown, no backticks):
{
  "title": "e.g. Frontend Track for a JS-weak beginner",
  "summary": "1 sentence — personalised to their exact weak areas and goal",
  "estimatedWeeks": ${weeks},
  "dailyTime": "${dailyTime || '30min'}",
  "weeks": [
    {
      "week": 1,
      "title": "topic focus title",
      "tasks": ["specific task 1", "specific task 2", "specific task 3"],
      "project": "mini project idea or null",
      "focusTopic": "HTML | CSS | JavaScript | React | Node.js | DSA | etc"
    }
  ],
  "steps": ["Week 1: short label", "Week 2: short label"],
  "keyInsight": "One sentence: WHY this specific path for this student's exact scores"
}`,
    },
  ];
};

export const useGroqRoadmap = () => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [roadmap, setRoadmap] = useState(null);

  const generate = useCallback(async (skillProfile) => {
    setLoading(true);
    setError(null);

    try {
      const messages = buildMessages(skillProfile);
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token    = localStorage.getItem('atl_access_token') || localStorage.getItem('token');

      const res = await fetch(`${API_BASE}/chat/groq`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages, max_tokens: 2000 }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      // Handle any response shape your backend returns
      const raw   = data?.content
                 || data?.message
                 || data?.response
                 || data?.choices?.[0]?.message?.content
                 || '';

      const clean  = raw.replace(/```json|```/gi, '').trim();
      const parsed = JSON.parse(clean);
      setRoadmap(parsed);
      return parsed;
    } catch (err) {
      console.error('[useGroqRoadmap]', err);
      setError(err.message || 'Failed to generate roadmap');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error, roadmap };
};

export default useGroqRoadmap;