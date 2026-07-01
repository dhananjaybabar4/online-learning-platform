// src/pages/SkillResult.jsx
// After adaptive skill test → calls Groq AI via api.roadmap.generate()
// Shows per-topic circles + AI-generated personalised week-by-week roadmap

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

// ─── constants ────────────────────────────────────────────────────────────────
const LEVEL_CONFIG = {
  beginner:     { label: 'Beginner',     color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', line: "You're just starting — that's perfectly fine. Everyone begins here." },
  intermediate: { label: 'Intermediate', color: '#854d0e', bg: '#fffbeb', border: '#fde68a', line: 'You know the basics. Time to go deeper and build real things.' },
  advanced:     { label: 'Advanced',     color: '#3730a3', bg: '#eef2ff', border: '#c7d2fe', line: "Solid foundation. Let's tackle complex problems and build great things." },
};

const TOPIC_COLOR = { HTML: '#e34c26', CSS: '#264de4', JavaScript: '#b45309' };
const TOPIC_ICON  = { HTML: '🌐', CSS: '🎨', JavaScript: '⚡' };
const TOPIC_BG    = { HTML: '#fff4f2', CSS: '#f0f3ff', JavaScript: '#fffef0' };
const FOCUS_COLOR = {
  HTML: '#e34c26', CSS: '#264de4', JavaScript: '#b45309',
  React: '#0ea5e9', 'Node.js': '#16a34a', DSA: '#7c3aed',
  default: '#4d4398',
};

const readResult = (user) => {
  const keys = [
    `atl_skill_result_${user?.id}`,
    `atl_skill_result_${user?.email}`,
    `atl_skill_result_${user?.id || user?.email}`,
    'atl_skill_result',
  ].filter(Boolean);
  for (const k of keys) {
    try { const d = localStorage.getItem(k); if (d) return JSON.parse(d); } catch {}
  }
  return null;
};

const saveRoadmap = (user, roadmap) => {
  const key = `atl_ai_roadmap_${user?.id || user?.email || 'guest'}`;
  try { localStorage.setItem(key, JSON.stringify(roadmap)); } catch {}
};

const loadRoadmap = (user) => {
  const key = `atl_ai_roadmap_${user?.id || user?.email || 'guest'}`;
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch { return null; }
};

const clearResult = (user) => {
  ['id', 'email'].forEach(k => {
    if (user?.[k]) {
      try { localStorage.removeItem(`atl_skill_result_${user[k]}`); } catch {}
      try { localStorage.removeItem(`atl_ai_roadmap_${user[k]}`); } catch {}
    }
  });
  try { localStorage.removeItem('atl_skill_result'); } catch {}
};

// ─── Topic Circle ─────────────────────────────────────────────────────────────
const TopicCircle = ({ topic, correct, total }) => {
  const pct   = total > 0 ? correct / total : 0;
  const color = pct >= 0.75 ? '#22c55e' : pct >= 0.5 ? '#d97706' : '#ef4444';
  const label = pct >= 0.75 ? 'Strong ✓' : pct >= 0.5 ? 'OK' : 'Needs work';
  const r = 28, circ = 2 * Math.PI * r;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 10px', background: TOPIC_BG[topic], borderRadius: 12, border: `1px solid ${TOPIC_COLOR[topic]}22`, flex: 1 }}>
      <span style={{ fontSize: 18 }}>{TOPIC_ICON[topic]}</span>
      <div style={{ position: 'relative', width: 68, height: 68 }}>
        <svg width="68" height="68" viewBox="0 0 68 68">
          <circle cx="34" cy="34" r={r} fill="none" stroke="#f0eeff" strokeWidth="6" />
          <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${circ * pct} ${circ}`}
            strokeLinecap="round" transform="rotate(-90 34 34)"
            style={{ transition: 'stroke-dasharray 1.2s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1433' }}>{correct}/{total}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: TOPIC_COLOR[topic] }}>{topic}</div>
        <div style={{ fontSize: 10, fontWeight: 600, color, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
};

// ─── AI Roadmap Loading State ─────────────────────────────────────────────────
const RoadmapLoader = () => (
  <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #ede9f4', padding: '32px 24px', textAlign: 'center' }}>
    <style>{`
      @keyframes spin { to { transform: rotate(360deg) } }
      @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
    `}</style>
    <div style={{ width: 48, height: 48, border: '3px solid #ede9f4', borderTop: '3px solid #4d4398', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
    <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1433', margin: '0 0 6px' }}>🤖 Groq AI is building your roadmap…</p>
    <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 20px', lineHeight: 1.6 }}>
      Analysing your HTML, CSS & JS scores<br />to create a personalised week-by-week plan
    </p>
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {['Weak topics first', 'Your goal', 'Daily time'].map((t, i) => (
        <span key={t} style={{ background: '#f0eeff', color: '#4d4398', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, animation: `pulse 1.5s ease ${i * 0.3}s infinite` }}>
          {t}
        </span>
      ))}
    </div>
  </div>
);

// ─── Week Card ────────────────────────────────────────────────────────────────
const WeekCard = ({ week, isExpanded, onToggle, currentWeek }) => {
  const isDone    = week.week < currentWeek;
  const isCurrent = week.week === currentWeek;
  const fc        = FOCUS_COLOR[week.focusTopic] || FOCUS_COLOR.default;

  return (
    <div style={{
      borderRadius: 10, border: `1.5px solid ${isCurrent ? '#c4b5fd' : isDone ? '#bbf7d0' : '#ede9f4'}`,
      background: isCurrent ? '#faf9ff' : isDone ? '#f9fefb' : '#fff',
      marginBottom: 8, overflow: 'hidden', transition: 'border-color .2s',
    }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: isDone ? '#22c55e' : isCurrent ? '#4d4398' : '#f0eeff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800,
          color: isDone || isCurrent ? '#fff' : '#4d4398',
        }}>
          {isDone ? '✓' : `W${week.week}`}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 500, color: isDone ? '#9ca3af' : '#1a1433', textDecoration: isDone ? 'line-through' : 'none' }}>
              Week {week.week}: {week.title}
            </span>
            {week.focusTopic && (
              <span style={{ fontSize: 10, fontWeight: 700, background: `${fc}18`, color: fc, padding: '2px 7px', borderRadius: 4 }}>
                {week.focusTopic}
              </span>
            )}
          </div>
          {week.project && (
            <span style={{ fontSize: 10, color: '#d97706', fontWeight: 600 }}>🔨 Project: {week.project}</span>
          )}
        </div>

        {isCurrent && <span style={{ fontSize: 9, fontWeight: 800, background: '#4d4398', color: '#fff', padding: '2px 8px', borderRadius: 4, flexShrink: 0 }}>NOW</span>}
        <span style={{ fontSize: 14, color: '#9ca3af', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid #f5f3ff' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, margin: '10px 0 7px' }}>Tasks this week</p>
          {week.tasks?.map((task, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#f0eeff', color: '#4d4398', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{task}</span>
            </div>
          ))}
          {week.project && (
            <div style={{ marginTop: 10, padding: '9px 12px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>🔨 Mini Project: </span>
              <span style={{ fontSize: 12, color: '#78350f' }}>{week.project}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const SkillResult = ({ user }) => {
  const navigate = useNavigate();
  const [result,       setResult]     = useState(null);
  const [aiRoadmap,    setAiRoadmap]  = useState(null);
  const [aiLoading,    setAiLoading]  = useState(false);
  const [aiError,      setAiError]    = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(1);

  useEffect(() => {
    const r = readResult(user);
    if (r) {
      setResult(r);
      const cached = loadRoadmap(user);
      if (cached) setAiRoadmap(cached);
    }
  }, [user]);

  // 🔥 FIX: Read goal/knowledge/reason from the skill result directly
  // No more onboarding key dependency — SkillTest now saves everything
  const generateRoadmap = useCallback(async (r) => {
    if (!r) return;
    setAiLoading(true);
    setAiError(null);

    // Primary: read from skill result (saved by SkillTest)
    // Fallback: try onboarding key (for backward compat)
    const ob = (() => {
      try {
        const keys = [
          `atl_onboarding_${user?.id || user?.email}`,
          `atl_onboarding_${user?.id}`,
          `atl_onboarding_${user?.email}`,
        ].filter(Boolean);
        for (const k of keys) {
          const d = localStorage.getItem(k);
          if (d) return JSON.parse(d);
        }
      } catch {}
      return {};
    })();

    // 🔥 FIX: r.goal and r.knowledge now come from SkillTest (no more empty strings)
    const profile = {
      level:        r.level        || 'beginner',
      topicScores:  r.topicScores  || {},
      goal:         r.goal         || ob.goal  || 'basics',
      knowledge:    r.knowledge    || ob.knowledge || '',
      reason:       r.reason       || ob.role  || 'student',
      dailyTime:    ob.time        || r.roadmap?.dailyTime || '30min',
      weakTopics:   r.weakTopics   || [],
      strongTopics: r.strongTopics || [],
    };

    try {
      const res = await api.roadmap.generate(profile);
      if (res?.success && res?.data) {
        setAiRoadmap(res.data);
        saveRoadmap(user, res.data);
        // Update stored skill result so Home.jsx ZigzagRoadmap works
        try {
          const keys = [`atl_skill_result_${user?.id || user?.email}`, 'atl_skill_result'].filter(Boolean);
          keys.forEach(k => {
            const d = localStorage.getItem(k);
            if (d) {
              const parsed = JSON.parse(d);
              parsed.roadmap = { ...parsed.roadmap, steps: res.data.steps, title: res.data.title, summary: res.data.summary, estimatedWeeks: res.data.estimatedWeeks };
              localStorage.setItem(k, JSON.stringify(parsed));
            }
          });
        } catch {}
      } else {
        setAiError(res?.message || 'Could not generate roadmap');
      }
    } catch (err) {
      setAiError(err.message || 'Network error');
    } finally {
      setAiLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (result && !aiRoadmap) generateRoadmap(result);
  }, [result]); // eslint-disable-line

  const gotoDashboard = () => navigate('/dashboard', { replace: true });

  if (!result) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f9f7', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#9ca3af', marginBottom: 16 }}>No result found.</p>
        <button onClick={() => navigate('/skill-test')} style={btn('#4d4398')}>Take the skill check</button>
      </div>
    </div>
  );

  const { level = 'beginner', score, total = 12, weakTopics = [], strongTopics = [], topicScores } = result;
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG.beginner;

  const dailyTime  = aiRoadmap?.dailyTime || result.roadmap?.dailyTime || '30min';
  const dailyLabel = { '15min': '15 min/day', '30min': '30 min/day', '1hour': '1 hr/day', '2hours': '2+ hrs/day' }[dailyTime] || dailyTime;

  const completedAt   = result.completedAt ? new Date(result.completedAt) : new Date();
  const daysSince     = Math.floor((Date.now() - completedAt) / 86400000);
  const currentWeek   = Math.min(Math.floor(daysSince / 7) + 1, aiRoadmap?.estimatedWeeks || 8);
  const weeksData     = aiRoadmap?.weeks || [];

  // 🔥 Show user's goal if we have it
  const userGoal = result.goal || '';
  const userRole = result.reason || result.role || '';

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f7', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #ede9f4', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#3b2d80', letterSpacing: 1 }}>ATL</div>
            <div style={{ fontSize: 8, fontWeight: 700, color: '#b5b2cc', letterSpacing: 3 }}>ANYTIME LEARNING</div>
          </div>
          <button onClick={gotoDashboard} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
            Go to dashboard →
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 580, margin: '0 auto', padding: '36px 20px 80px' }}>

        {/* Level badge + heading */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>
            Adaptive skill check · {score ?? '—'}/{total} correct
          </p>

          {/* 🔥 Show goal/role if saved */}
          {(userGoal || userRole) && (
            <div style={{ background: '#f0eeff', border: '1px solid #c4b5fd', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {userRole && <span style={{ fontSize: 12, fontWeight: 600, color: '#4d4398' }}>👤 {userRole}</span>}
              {userGoal && <span style={{ fontSize: 12, fontWeight: 600, color: '#4d4398' }}>🎯 Goal: {userGoal}</span>}
            </div>
          )}

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: cfg.bg, border: `1.5px solid ${cfg.border}`, borderRadius: 30, padding: '5px 14px', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: cfg.color }}>{cfg.label} Level</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1a1433', margin: '0 0 8px', lineHeight: 1.2 }}>
            Your Skill Profile
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: 0 }}>{cfg.line}</p>
        </div>

        {/* Per-topic circles */}
        {topicScores && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Topic Breakdown (Adaptive Test)</p>
            <div style={{ display: 'flex', gap: 10 }}>
              {['HTML', 'CSS', 'JavaScript'].map(t => (
                <TopicCircle key={t} topic={t}
                  correct={topicScores[t]?.correct ?? 0}
                  total={topicScores[t]?.total ?? 0} />
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Score',     value: `${score ?? 0}/${total}` },
            { label: 'Duration',  value: `${aiRoadmap?.estimatedWeeks || result.roadmap?.estimatedWeeks || 8} wks` },
            { label: 'Daily',     value: dailyLabel },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #ede9f4', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: .5, marginBottom: 4, textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#1a1433' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Weak / Strong */}
        {(weakTopics.length > 0 || strongTopics?.length > 0) && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {weakTopics.length > 0 && (
              <div style={{ flex: 1, background: '#fff5f5', borderRadius: 10, padding: '12px 14px', border: '1px solid #fecaca' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 8px' }}>🎯 Focus On</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {weakTopics.map(t => <span key={t} style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{t}</span>)}
                </div>
              </div>
            )}
            {strongTopics?.length > 0 && (
              <div style={{ flex: 1, background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', border: '1px solid #bbf7d0' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 8px' }}>✅ Strong At</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {strongTopics.map(t => <span key={t} style={{ background: '#dcfce7', color: '#16a34a', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{t}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── AI ROADMAP SECTION ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1433', margin: '0 0 2px' }}>
                🤖 Your AI-Generated Roadmap
              </p>
              {aiRoadmap && (
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{aiRoadmap.title}</p>
              )}
            </div>
            {aiError && (
              <button onClick={() => generateRoadmap(result)}
                style={{ background: '#f0eeff', color: '#4d4398', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Retry ↻
              </button>
            )}
          </div>

          {aiRoadmap?.keyInsight && (
            <div style={{ background: 'linear-gradient(135deg,#f0eeff,#e8e4ff)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, border: '1px solid #c4b5fd' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', margin: '0 0 3px', letterSpacing: 1, textTransform: 'uppercase' }}>
                🧠 Why this path?
              </p>
              <p style={{ fontSize: 13, color: '#4c1d95', margin: 0, lineHeight: 1.6 }}>{aiRoadmap.keyInsight}</p>
            </div>
          )}

          {aiRoadmap?.summary && (
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: '0 0 14px', fontStyle: 'italic' }}>
              "{aiRoadmap.summary}"
            </p>
          )}

          {aiLoading && <RoadmapLoader />}

          {aiError && !aiLoading && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#dc2626', margin: '0 0 8px', fontWeight: 600 }}>
                Could not generate roadmap
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 12px' }}>{aiError}</p>
              <button onClick={() => generateRoadmap(result)}
                style={{ background: '#4d4398', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Try Again →
              </button>
            </div>
          )}

          {!aiLoading && weeksData.length > 0 && (
            <div>
              {weeksData.map(week => (
                <WeekCard
                  key={week.week}
                  week={week}
                  currentWeek={currentWeek}
                  isExpanded={expandedWeek === week.week}
                  onToggle={() => setExpandedWeek(expandedWeek === week.week ? null : week.week)}
                />
              ))}
            </div>
          )}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => navigate('/lessons')} style={btn('#4d4398', true)}>
            Start Learning →
          </button>
          <button onClick={gotoDashboard} style={btn('transparent', false, '#6b7280', '1px solid #ede9f4')}>
            Go to dashboard
          </button>
          <button
            onClick={() => { clearResult(user); navigate('/skill-test', { replace: true }); }}
            style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 12, cursor: 'pointer', textAlign: 'center', marginTop: 4 }}>
            Retake with different questions
          </button>
        </div>
      </div>
    </div>
  );
};

const btn = (bg, primary, color = '#fff', border = 'none') => ({
  width: '100%', padding: '14px', borderRadius: 10,
  background: bg, color, border, fontSize: 14, fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: primary ? '0 2px 12px rgba(77,67,152,.25)' : 'none',
});

export default SkillResult;