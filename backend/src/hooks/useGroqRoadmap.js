// src/hooks/useGroqRoadmap.js
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
  webapps:   'build full web apps for clients',
  webapp:    'build my own web application',
  saas:      'launch a SaaS product',
  unsure:    'explore web development',
  // Freelancer goals
  ecommerce: 'build e-commerce and online stores',
  design:    'create beautiful UI and design',
  // Personal goals
  website:   'build my personal/portfolio website',
  tool:      'build an automation tool or utility script',
};

const TIME_LABEL = {
  '15min':  '15 minutes per day',
  '30min':  '30 minutes per day',
  '1hour':  '1 hour per day',
  '2hours': '2+ hours per day',
};

const buildMessages = ({ level, topicScores, topicLevel, goal, knowledge, dailyTime, weakTopics, strongTopics }) => {
  // Support custom goal strings (not just preset keys)
  const goalText = GOAL_LABEL[goal] || goal || 'learn web development';
  const timeText = TIME_LABEL[dailyTime] || dailyTime || '30 minutes per day';
  const weeks    = level === 'beginner' ? 8 : level === 'intermediate' ? 10 : 12;

  // Build detailed per-topic breakdown for the AI
  const topicLines = topicScores
    ? Object.entries(topicScores)
        .map(([t, s]) => {
          const pct   = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
          const lvl   = topicLevel?.[t] || (pct >= 75 ? 'strong' : pct >= 45 ? 'ok' : 'weak');
          const label = lvl === 'strong' ? '✓ strong' : lvl === 'ok' ? '~ ok' : '✗ weak — prioritise';
          return `  - ${t}: ${s.correct}/${s.total} (${pct}%) — ${label}`;
        })
        .join('\n')
    : '  - Not available';

  const weakList   = weakTopics?.length   ? weakTopics.join(', ')   : 'none';
  const strongList = strongTopics?.length ? strongTopics.join(', ') : 'none';

  return [
    {
      role: 'system',
      content: `You are an expert programming tutor at ATL (Anytime Learning), an ed-tech platform for BCA/engineering students in India.
You create precise, personalised learning roadmaps based on adaptive skill test scores.
The roadmap MUST reflect the exact per-topic scores — not a generic plan.
Respond ONLY with valid JSON. No markdown, no explanation outside JSON.`,
    },
    {
      role: 'user',
      content: `Generate a personalised ${weeks}-week learning roadmap.

STUDENT PROFILE:
- Level: ${level}
- Goal: ${goalText}
- Daily time: ${timeText}
- Prior knowledge: ${knowledge || 'Not specified'}

PER-TOPIC SCORES FROM ADAPTIVE TEST:
${topicLines}
- Weak (needs work): ${weakList}
- Strong (can go faster): ${strongList}

RULES:
1. START with the weakest topic — that's where the student needs the most help
2. Strong topics: dedicate only 1-2 tasks, move on quickly
3. Realistic for ${timeText}
4. Mini-project every 2 weeks
5. Goal-specific: everything should lead toward "${goalText}"
6. Total: exactly ${weeks} weeks

Return ONLY this JSON (no markdown, no backticks):
{
  "title": "short, specific track title — e.g. 'JS-first Beginner Track for Personal Project'",
  "summary": "1 sentence — mention their exact weak topic and goal",
  "estimatedWeeks": ${weeks},
  "dailyTime": "${dailyTime || '30min'}",
  "keyInsight": "one sentence explaining WHY the roadmap starts where it does, based on their scores",
  "firstLesson": "exact name of the very first topic/lesson to study (e.g. 'CSS Flexbox Basics')",
  "weeks": [
    {
      "week": 1,
      "title": "topic focus",
      "tasks": ["specific task 1", "specific task 2", "specific task 3"],
      "project": "mini project idea or null",
      "focusTopic": "HTML | CSS | JavaScript | React | Node.js | DSA | etc"
    }
  ],
  "steps": ["Week 1: short label", "Week 2: short label"]
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
        body: JSON.stringify({ messages, max_tokens: 2500 }),
      });

      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();

      const raw = data?.content
               || data?.message
               || data?.response
               || data?.choices?.[0]?.message?.content
               || '';

      const clean  = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
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