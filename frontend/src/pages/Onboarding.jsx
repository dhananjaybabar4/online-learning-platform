// src/pages/Onboarding.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const P = '#3b2d80';
const P2 = '#4d4398';

// ─── Data ─────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'role',
    title: 'What describes you?',
    sub: 'We\'ll personalise your experience',
    type: 'single',
    options: [
      { id: 'student',    emoji: '🎓', label: 'Student',         sub: 'College / school' },
      { id: 'job_seeker', emoji: '💼', label: 'Job Seeker',       sub: 'Land a dev role' },
      { id: 'freelancer', emoji: '🧑‍💻', label: 'Freelancer',       sub: 'Work with clients' },
      { id: 'personal',   emoji: '🚀', label: 'Personal Project', sub: 'Build for myself' },
    ],
  },
  {
    id: 'goal',
    title: 'What is your main goal?',
    sub: 'Pick one — we\'ll build your roadmap around it',
    type: 'single',
    optionsByRole: {
      student:    [
        { id: 'placement', emoji: '🏆', label: 'Crack placements', sub: 'DSA + aptitude' },
        { id: 'job',       emoji: '💼', label: 'Get a dev job',     sub: 'Portfolio + interviews' },
        { id: 'project',   emoji: '🛠️', label: 'Build a project',   sub: 'Something real to show' },
        { id: 'basics',    emoji: '📖', label: 'Learn to code',     sub: 'Start from zero' },
      ],
      job_seeker: [
        { id: 'frontend',  emoji: '🎨', label: 'Frontend Dev',  sub: 'HTML, CSS, JS, React' },
        { id: 'backend',   emoji: '⚙️', label: 'Backend Dev',   sub: 'Node.js, APIs, DBs' },
        { id: 'fullstack', emoji: '🔥', label: 'Full Stack',    sub: 'Front + back together' },
        { id: 'unsure',    emoji: '🧭', label: 'Not sure yet',  sub: 'Help me explore' },
      ],
      freelancer: [
        { id: 'websites',  emoji: '🌐', label: 'Client websites', sub: 'Fast, polished sites' },
        { id: 'webapps',   emoji: '📱', label: 'Web apps',        sub: 'Full apps for clients' },
        { id: 'ecommerce', emoji: '🛒', label: 'Online stores',   sub: 'Shopify, custom shops' },
        { id: 'design',    emoji: '✨', label: 'UI + Design',      sub: 'Beautiful interfaces' },
      ],
      personal: [
        { id: 'website', emoji: '🌐', label: 'My website',       sub: 'Portfolio or info site' },
        { id: 'webapp',  emoji: '⚡', label: 'Web app',           sub: 'Interactive + backend' },
        { id: 'tool',    emoji: '🤖', label: 'Automation tool',  sub: 'Script or utility' },
        { id: 'saas',    emoji: '💡', label: 'SaaS product',      sub: 'Subscription product' },
      ],
    },
  },
  {
    id: 'time',
    title: 'How much time per day?',
    sub: 'Be honest — consistency beats intensity',
    type: 'single',
    options: [
      { id: '15min',  emoji: '⚡', label: '15 min / day', sub: 'Short but consistent',    weeks: 10 },
      { id: '30min',  emoji: '🔥', label: '30 min / day', sub: 'Lesson + practice daily', weeks: 8  },
      { id: '1hour',  emoji: '🚀', label: '1 hour / day', sub: 'Fast-track mode',         weeks: 6  },
      { id: '2hours', emoji: '💪', label: '2 hours+',      sub: 'Intensive immersion',     weeks: 4  },
    ],
  },
  {
    id: 'languages',
    title: 'What do you already know?',
    sub: 'Select all that apply',
    type: 'multi',
    options: [
      { id: 'none',       emoji: '🌱', label: 'Nothing yet',  sub: 'Complete beginner' },
      { id: 'html',       emoji: '🌐', label: 'HTML',          sub: 'Web structure' },
      { id: 'css',        emoji: '🎨', label: 'CSS',           sub: 'Styling' },
      { id: 'javascript', emoji: '⚡', label: 'JavaScript',    sub: 'Programming logic' },
      { id: 'python',     emoji: '🐍', label: 'Python',        sub: 'General purpose' },
      { id: 'reactjs',    emoji: '⚛️', label: 'React.js',      sub: 'UI framework' },
      { id: 'nodejs',     emoji: '🟢', label: 'Node.js',       sub: 'Backend JS' },
      { id: 'java',       emoji: '☕', label: 'Java',           sub: 'OOP language' },
      { id: 'cpp',        emoji: '⚙️', label: 'C / C++',       sub: 'Systems' },
    ],
  },
];

const TIME_WEEKS = { '15min': 10, '30min': 8, '1hour': 6, '2hours': 4 };
const getUserType = (role) =>
  ({ personal: 'builder', job_seeker: 'career', freelancer: 'freelance', student: 'learner' }[role] || 'learner');

// ─── Save onboarding to backend ───────────────────────────────────────────────
const saveOnboardingToDB = async (userId, data) => {
  try {
    const token = localStorage.getItem('atl_access_token') || '';
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/auth/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId, ...data }),
    });
  } catch (e) {
    console.warn('Onboarding DB save failed (non-fatal):', e.message);
  }
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const Onboarding = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({ role: '', goal: '', time: '', languages: [] });
  const [customGoal, setCustomGoal] = useState('');
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [showCustomGoal, setShowCustomGoal] = useState(false);
  const [customLangInput, setCustomLangInput] = useState('');
  const [customLangs, setCustomLangs] = useState([]);
  const [saving, setSaving] = useState(false);

  const currentStep = STEPS[step];
  const options = currentStep.optionsByRole
    ? (currentStep.optionsByRole[answers.role] || [])
    : currentStep.options;

  const select = (id) => {
    if (currentStep.type === 'single') {
      setAnswers(p => ({ ...p, [currentStep.id]: id }));
    } else {
      setAnswers(p => {
        const cur = p.languages;
        if (id === 'none') return { ...p, languages: ['none'] };
        const without = cur.filter(l => l !== 'none' && l !== id);
        return { ...p, languages: cur.includes(id) ? without : [...without, id] };
      });
    }
  };

  const isSelected = (id) => {
    if (currentStep.type === 'single') return answers[currentStep.id] === id;
    return answers.languages.includes(id);
  };

  const canNext = () => {
    if (step === 0) return !!answers.role;
    if (step === 1) return !!answers.goal || !!customGoal;
    if (step === 2) return !!answers.time;
    if (step === 3) return answers.languages.length > 0 || customLangs.length > 0;
    return false;
  };

  const handleFinish = async () => {
    setSaving(true);
    const allLangs  = [...answers.languages, ...customLangs];
    const finalGoal = customGoal || answers.goal;

    const data = {
      role:                answers.role,
      goal:                finalGoal,
      time:                answers.time,
      languages:           allLangs,
      weeks:               TIME_WEEKS[answers.time] || 8,
      user_type:           getUserType(answers.role),
      onboarding_complete: true,
      completed_at:        new Date().toISOString(),
    };

    const keys = [user?.id, user?.email].filter(Boolean);
    keys.forEach(k => {
      try { localStorage.setItem(`atl_onboarding_${k}`, JSON.stringify(data)); } catch {}
    });

    if (user?.id) await saveOnboardingToDB(user.id, data);

    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('atl_current_user', JSON.stringify(updatedUser));
    setSaving(false);
    navigate('/dashboard');
  };

  const handleSkip = () => {
    const data = {
      role: 'student', goal: 'basics', time: '30min',
      languages: ['none'], weeks: 8, user_type: 'learner',
      onboarding_complete: true, skipped: true,
      completed_at: new Date().toISOString(),
    };
    const keys = [user?.id, user?.email].filter(Boolean);
    keys.forEach(k => {
      try { localStorage.setItem(`atl_onboarding_${k}`, JSON.stringify(data)); } catch {}
    });
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem('atl_current_user', JSON.stringify(updatedUser));
    navigate('/dashboard');
  };

  const handleNext = async () => {
    if (!canNext()) return;
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else await handleFinish();
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const isMulti  = currentStep.type === 'multi';
  const isLast   = step === STEPS.length - 1;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(/bgon.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: 460,
        background: 'rgba(255, 255, 255, 0.93)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.6)',
        padding: '28px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      }}>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#f0eeff', borderRadius: 3, marginBottom: 22 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: P2, borderRadius: 3, transition: 'width .3s' }} />
        </div>

        {/* Step label */}
        <div style={{ fontSize: 11, color: '#bbb', fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
          Step {step + 1} of {STEPS.length}
        </div>

        {/* Question */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 4px', lineHeight: 1.3 }}>{currentStep.title}</h2>
        <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 18px' }}>{currentStep.sub}</p>

        {/* Options */}
        <div style={{
          display: isMulti ? 'grid' : 'flex',
          gridTemplateColumns: isMulti ? '1fr 1fr' : undefined,
          flexDirection: isMulti ? undefined : 'column',
          gap: 8,
        }}>
          {options.map(opt => {
            const sel = isSelected(opt.id);
            return (
              <button key={opt.id} onClick={() => select(opt.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: isMulti ? '10px 12px' : '11px 14px',
                  borderRadius: 10, border: `1.5px solid ${sel ? P2 : '#e8e8f0'}`,
                  background: sel ? '#f0eeff' : 'rgba(255,255,255,0.8)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all .12s', outline: 'none', fontFamily: 'inherit',
                }}>
                <div style={{
                  width: 16, height: 16,
                  borderRadius: isMulti ? 4 : '50%',
                  border: `2px solid ${sel ? P2 : '#d0d0e0'}`,
                  background: isMulti && sel ? P2 : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all .12s',
                }}>
                  {isMulti && sel && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1 4.5l2 2L8 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {!isMulti && sel && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: P2 }} />
                  )}
                </div>
                <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{opt.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: isMulti ? 12 : 13, fontWeight: 600, color: sel ? P : '#1a1a2e', lineHeight: 1.2 }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{opt.sub}</div>
                </div>
                {opt.weeks && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: P2, background: '#f0eeff', padding: '2px 8px', borderRadius: 5, flexShrink: 0 }}>~{opt.weeks}wk</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom goal input (step 1) */}
        {step === 1 && (
          <div style={{ marginTop: 10 }}>
            {!showCustomGoal && !customGoal && (
              <button onClick={() => setShowCustomGoal(true)}
                style={{ fontSize: 12, color: '#aaa', background: 'none', border: '1px dashed #ddd', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>
                + Something else? Type your own goal
              </button>
            )}
            {showCustomGoal && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <input
                  autoFocus
                  value={customGoalInput}
                  onChange={e => setCustomGoalInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && customGoalInput.trim()) { setCustomGoal(customGoalInput.trim()); setAnswers(p => ({ ...p, goal: '' })); setShowCustomGoal(false); setCustomGoalInput(''); } }}
                  placeholder="e.g. Build a mobile app..."
                  style={{ flex: 1, padding: '9px 12px', fontSize: 13, borderRadius: 8, border: `1.5px solid ${P2}`, outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={() => { if (customGoalInput.trim()) { setCustomGoal(customGoalInput.trim()); setAnswers(p => ({ ...p, goal: '' })); setShowCustomGoal(false); setCustomGoalInput(''); } }}
                  style={{ padding: '9px 14px', background: P2, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Add
                </button>
              </div>
            )}
            {customGoal && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '8px 12px', background: '#f0eeff', borderRadius: 8, border: `1px solid ${P2}` }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: P2, flex: 1 }}>✓ {customGoal}</span>
                <button onClick={() => setCustomGoal('')}
                  style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
              </div>
            )}
          </div>
        )}

        {/* Custom language input (step 3) */}
        {step === 3 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={customLangInput}
                onChange={e => setCustomLangInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && customLangInput.trim()) { setCustomLangs(p => [...p, customLangInput.trim()]); setCustomLangInput(''); } }}
                placeholder="Other language? e.g. PHP, Swift..."
                style={{ flex: 1, padding: '8px 12px', fontSize: 12, borderRadius: 8, border: '1px solid #e0e0ea', outline: 'none', fontFamily: 'inherit' }}
              />
              <button onClick={() => { if (customLangInput.trim()) { setCustomLangs(p => [...p, customLangInput.trim()]); setCustomLangInput(''); } }}
                style={{ padding: '8px 12px', background: customLangInput.trim() ? P2 : '#eee', color: customLangInput.trim() ? '#fff' : '#aaa', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: customLangInput.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                Add
              </button>
            </div>
            {customLangs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {customLangs.map((l, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#f0eeff', border: `1px solid ${P2}`, borderRadius: 6, fontSize: 12, fontWeight: 600, color: P2 }}>
                    {l}
                    <button onClick={() => setCustomLangs(p => p.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: '12px 18px', border: '1.5px solid #e0e0ea', borderRadius: 10, background: '#fff', color: '#888', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Back
            </button>
          )}
          <button onClick={handleNext} disabled={!canNext() || saving}
            style={{ flex: 1, padding: '13px', border: 'none', borderRadius: 10, background: canNext() ? P : '#e8e8f0', color: canNext() ? '#fff' : '#bbb', fontSize: 14, fontWeight: 700, cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'background .15s' }}>
            {saving ? 'Saving…' : isLast ? 'Start Learning 🚀' : 'Next →'}
          </button>
        </div>
      </div>

      {/* Skip */}
      <button onClick={handleSkip}
        style={{ marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
        Skip for now
      </button>

    </div>
  );
};

export default Onboarding;