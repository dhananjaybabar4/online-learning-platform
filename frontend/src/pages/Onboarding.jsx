// src/pages/Onboarding.jsx
// Warm, smart onboarding — user feels ATL "understanding" them in real time
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  {
    id: 'role',
    q: 'What describes you best?',
    sub: 'This shapes your entire learning path',
    options: [
      { id: 'student',    label: 'Student',         detail: 'College / school',            emoji: '🎓' },
      { id: 'job_seeker', label: 'Job Seeker',       detail: 'Looking for a dev job',       emoji: '💼' },
      { id: 'freelancer', label: 'Freelancer',       detail: 'Building for clients',        emoji: '🧑‍💻' },
      { id: 'personal',   label: 'Personal Project', detail: 'My own idea or startup',      emoji: '🚀' },
    ],
  },
  {
    id: 'goal',
    q: 'What do you want to build?',
    sub: 'Pick the goal that excites you most right now',
    optionsByRole: {
      student: [
        { id: 'placement', label: 'Crack placements',  detail: 'DSA + aptitude interviews', emoji: '🏆' },
        { id: 'job',       label: 'Get a dev job',     detail: 'Portfolio + applications',  emoji: '💼' },
        { id: 'project',   label: 'Build a project',   detail: 'Something real to show',    emoji: '🛠️' },
        { id: 'basics',    label: 'Learn coding',      detail: 'Start from scratch',        emoji: '📖' },
      ],
      job_seeker: [
        { id: 'frontend',  label: 'Frontend Dev',      detail: 'HTML, CSS, JS, React',      emoji: '🎨' },
        { id: 'backend',   label: 'Backend Dev',       detail: 'Node.js, APIs, databases',  emoji: '⚙️' },
        { id: 'fullstack', label: 'Full Stack',        detail: 'Both frontend + backend',   emoji: '🔥' },
        { id: 'unsure',    label: 'Not sure yet',      detail: 'Help me explore',           emoji: '🧭' },
      ],
      freelancer: [
        { id: 'websites',  label: 'Client websites',   detail: 'Fast, clean sites',         emoji: '🌐' },
        { id: 'webapps',   label: 'Web apps',          detail: 'Full apps for clients',     emoji: '📱' },
        { id: 'ecommerce', label: 'Online stores',     detail: 'Shopify, custom shops',     emoji: '🛒' },
        { id: 'design',    label: 'UI + design',       detail: 'Beautiful interfaces',      emoji: '✨' },
      ],
      personal: [
        { id: 'website',   label: 'My website',        detail: 'Portfolio or info site',    emoji: '🌐' },
        { id: 'webapp',    label: 'Web app',           detail: 'Interactive + backend',     emoji: '⚡' },
        { id: 'tool',      label: 'Automation tool',   detail: 'Script or utility',         emoji: '🤖' },
        { id: 'saas',      label: 'SaaS product',      detail: 'Subscription product',      emoji: '💡' },
      ],
    },
  },
  {
    id: 'time',
    q: 'How much time can you give daily?',
    sub: 'Be honest — 15 min every day beats 2 hours once a week',
    options: [
      { id: '15min',  label: '15 minutes',  detail: 'Short but every single day',      emoji: '⚡', weeks: 10 },
      { id: '30min',  label: '30 minutes',  detail: 'Solid pace — lesson + practice',  emoji: '🔥', weeks: 8  },
      { id: '1hour',  label: '1 hour',      detail: 'Fast progress mode',              emoji: '🚀', weeks: 6  },
      { id: '2hours', label: '2 hours+',    detail: 'Intensive track',                 emoji: '💪', weeks: 4  },
    ],
  },
  {
    id: 'languages',
    q: 'What do you already know?',
    sub: 'Be honest — this calibrates your skill test',
    multiSelect: true,
    options: [
      { id: 'none',       label: 'Nothing yet',    detail: 'Complete beginner',     emoji: '🌱' },
      { id: 'html',       label: 'HTML',           detail: 'Web structure',         emoji: '🌐' },
      { id: 'css',        label: 'CSS',            detail: 'Styling',               emoji: '🎨' },
      { id: 'javascript', label: 'JavaScript',     detail: 'Programming logic',     emoji: '⚡' },
      { id: 'python',     label: 'Python',         detail: 'General purpose',       emoji: '🐍' },
      { id: 'reactjs',    label: 'React.js',       detail: 'UI framework',          emoji: '⚛️' },
      { id: 'nodejs',     label: 'Node.js',        detail: 'Backend JS',            emoji: '🟢' },
      { id: 'java',       label: 'Java',           detail: 'OOP language',          emoji: '☕' },
      { id: 'cpp',        label: 'C / C++',        detail: 'Systems programming',   emoji: '⚙️' },
    ],
  },
];

// Smart preview cards shown on the right side as user fills in steps
const buildPreview = (answers, langSel) => {
  const roleLabels   = { student: 'Student', job_seeker: 'Job Seeker', freelancer: 'Freelancer', personal: 'Personal Project' };
  const goalLabels   = { placement:'Crack Placements', job:'Get Dev Job', project:'Build a Project', basics:'Learn Coding', frontend:'Frontend Dev', backend:'Backend Dev', fullstack:'Full Stack', unsure:'Explore Dev', websites:'Client Websites', webapps:'Web Apps', ecommerce:'Online Store', design:'UI + Design', website:'My Website', webapp:'Web App', tool:'Automation Tool', saas:'SaaS Product' };
  const timeLabels   = { '15min': '15 min/day', '30min': '30 min/day', '1hour': '1 hour/day', '2hours': '2+ hours/day' };
  const timeWeeks    = { '15min': 10, '30min': 8, '1hour': 6, '2hours': 4 };

  return {
    role:  roleLabels[answers.role]  || null,
    goal:  goalLabels[answers.goal]  || null,
    time:  timeLabels[answers.time]  || null,
    weeks: timeWeeks[answers.time]   || null,
    langs: langSel.includes('none') ? ['Complete beginner'] : langSel.map(l => ({ html:'HTML', css:'CSS', javascript:'JS', python:'Python', reactjs:'React', nodejs:'Node.js', java:'Java', cpp:'C/C++' }[l] || l)),
    isBeginner: langSel.includes('none'),
  };
};

const Onboarding = ({ user, setUser }) => {
  const navigate  = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [langSel, setLangSel] = useState([]);

  const step    = STEPS[stepIdx];
  const total   = STEPS.length;
  const pct     = Math.round(((stepIdx + 1) / total) * 100);
  const isMulti = step.multiSelect;
  const preview = buildPreview(answers, langSel);

  const options = step.optionsByRole
    ? (step.optionsByRole[answers.role] || Object.values(step.optionsByRole)[0])
    : (step.options || []);

  const toggleLang = (id) => {
    if (id === 'none') { setLangSel(langSel.includes('none') ? [] : ['none']); return; }
    const without = langSel.filter(l => l !== 'none');
    setLangSel(without.includes(id) ? without.filter(l => l !== id) : [...without, id]);
  };

  const selectOpt = (id) => {
    if (isMulti) { toggleLang(id); return; }
    setAnswers(a => ({ ...a, [step.id]: id }));
  };

  const canProceed = () => {
    if (isMulti) return langSel.length > 0;
    return !!answers[step.id];
  };

  const buildKnowledge = () => {
    if (langSel.includes('none')) return 'Complete beginner — no prior coding experience';
    const labelMap = { html:'HTML', css:'CSS', javascript:'JavaScript', python:'Python', reactjs:'React.js', nodejs:'Node.js', java:'Java', cpp:'C/C++' };
    return langSel.map(id => labelMap[id] || id).join(', ') || 'Not specified';
  };

  const markDone = (finalAnswers, knowledge) => {
    const oKey = `atl_onboarding_${user?.id || user?.email}`;
    localStorage.setItem(oKey, JSON.stringify({ ...finalAnswers, knowledge, completedAt: new Date().toISOString() }));
    if (setUser) {
      const upd = { onboarding_complete: true, user_type: finalAnswers.role };
      setUser(prev => ({ ...prev, ...upd }));
      try {
        const s = localStorage.getItem('atl_current_user');
        if (s) localStorage.setItem('atl_current_user', JSON.stringify({ ...JSON.parse(s), ...upd }));
      } catch {}
    }
  };

  const handleNext = () => {
    const newAnswers = { ...answers };
    if (isMulti) newAnswers.languages = langSel.join(',');

    if (stepIdx < total - 1) {
      setStepIdx(i => i + 1);
    } else {
      // Last step — finalize
      const knowledge = buildKnowledge();
      markDone(newAnswers, knowledge);

      const isCompleteBeginnerr = langSel.includes('none');

      if (isCompleteBeginnerr) {
        // Save default beginner result — skip skill test
        const sKey = `atl_skill_result_${user?.id || user?.email}`;
        const weeks = { '15min':10, '30min':8, '1hour':6, '2hours':4 }[newAnswers.time] || 8;
        const defaultResult = {
          level: 'beginner', levelLabel: 'Beginner', levelEmoji: '🌱',
          score: 0, total: 12, skipped: true,
          goal: newAnswers.goal || 'basics',
          knowledge,
          reason: newAnswers.role || 'student',
          role:   newAnswers.role || 'student',
          time:   newAnswers.time || '30min',
          topicScores:  { HTML:{correct:0,total:0}, CSS:{correct:0,total:0}, JavaScript:{correct:0,total:0} },
          weakTopics:   ['HTML','CSS','JavaScript'],
          strongTopics: [],
          roadmap: {
            title: 'Beginner Track',
            estimatedWeeks: weeks,
            dailyTime: newAnswers.time || '30min',
            steps: ['HTML Basics','CSS Fundamentals','JavaScript Intro','Build Your First Page','Mini Project'],
            summary: 'Start from scratch. Build real things step by step.',
          },
          completedAt: new Date().toISOString(),
        };
        try {
          localStorage.setItem(sKey, JSON.stringify(defaultResult));
          localStorage.setItem('atl_skill_result', JSON.stringify(defaultResult));
        } catch {}
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/skill-test', {
          state: {
            reason:    newAnswers.role,
            goal:      newAnswers.goal,
            knowledge,
            time:      newAnswers.time,
          },
          replace: true,
        });
      }
    }
  };

  const handleSkip = () => {
    const oKey = `atl_onboarding_${user?.id || user?.email}`;
    const sKey = `atl_skill_result_${user?.id || user?.email}`;
    localStorage.setItem(oKey, JSON.stringify({ role:'student', goal:'basics', completedAt: new Date().toISOString() }));
    if (!localStorage.getItem(sKey)) {
      localStorage.setItem(sKey, JSON.stringify({
        level:'beginner', levelLabel:'Beginner', levelEmoji:'🌱', score:0, total:12, skipped:true,
        goal:'basics', knowledge:'', reason:'student', role:'student', time:'30min',
        topicScores:{ HTML:{correct:0,total:0}, CSS:{correct:0,total:0}, JavaScript:{correct:0,total:0} },
        weakTopics:['HTML','CSS','JavaScript'], strongTopics:[],
        roadmap:{ title:'Starter Track', estimatedWeeks:8, dailyTime:'30min', steps:['HTML + CSS','JavaScript','React Basics','Projects','Quiz Practice','Final Project'], summary:'Build your foundation one step at a time.' },
        completedAt: new Date().toISOString(),
      }));
    }
    if (setUser) {
      const upd = { onboarding_complete:true, user_type:'student' };
      setUser(prev => ({ ...prev, ...upd }));
      try { const s = localStorage.getItem('atl_current_user'); if (s) localStorage.setItem('atl_current_user', JSON.stringify({ ...JSON.parse(s), ...upd })); } catch {}
    }
    navigate('/dashboard', { replace: true });
  };

  const isBeginnerHint = step.id === 'languages' && langSel.includes('none');
  const isTimeStep     = step.id === 'time';

  return (
    <div style={{ minHeight:'100vh', background:'#f5f4fb', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:"'Segoe UI', -apple-system, sans-serif" }}>

      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:18 }}>
        <span style={{ fontSize:19, fontWeight:800, color:'#3b2d80', letterSpacing:1, display:'block' }}>ATL</span>
        <span style={{ fontSize:9, fontWeight:700, color:'#b5b2cc', letterSpacing:3, display:'block', marginTop:1 }}>ANYTIME LEARNING</span>
      </div>

      {/* LIVE PREVIEW — shown after step 1 */}
      {stepIdx > 0 && (
        <div style={{ width:'100%', maxWidth:420, marginBottom:12, padding:'10px 14px', background:'#fff', borderRadius:10, border:'1px solid #ede9f4', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:10, fontWeight:700, color:'#b5b2cc', letterSpacing:1, textTransform:'uppercase' }}>Your plan:</span>
          {preview.role && <Tag label={preview.role} color="#3b2d80" />}
          {preview.goal && <Tag label={preview.goal} color="#4d4398" />}
          {preview.time && <Tag label={preview.time} color="#059669" />}
          {preview.weeks && <Tag label={`~${preview.weeks} weeks`} color="#d97706" />}
          {preview.langs.map(l => <Tag key={l} label={l} color={l === 'Complete beginner' ? '#16a34a' : '#6b7280'} />)}
        </div>
      )}

      {/* Main card */}
      <div style={{ width:'100%', maxWidth:420, background:'#fff', borderRadius:14, border:'1px solid #e4e1f5', padding:'22px 20px', boxSizing:'border-box' }}>

        {/* Progress */}
        <div style={{ height:3, background:'#f0eeff', borderRadius:2, marginBottom:14 }}>
          <div style={{ height:'100%', width:`${pct}%`, background:'#4d4398', borderRadius:2, transition:'width 0.3s' }} />
        </div>

        <span style={{ fontSize:10, fontWeight:700, color:'#b5b2cc', letterSpacing:1.5, textTransform:'uppercase', marginBottom:5, display:'block' }}>
          Step {stepIdx + 1} of {total}
        </span>
        <p style={{ fontSize:17, fontWeight:700, color:'#1a1433', margin:'0 0 3px', lineHeight:1.3 }}>{step.q}</p>
        <p style={{ fontSize:12, color:'#b5b2cc', margin:'0 0 16px' }}>{step.sub}</p>

        {/* Options */}
        <div style={{ display: isMulti ? 'grid' : 'flex', gridTemplateColumns: isMulti ? '1fr 1fr' : undefined, flexDirection: isMulti ? undefined : 'column', gap:7 }}>
          {options.map(opt => {
            const sel = isMulti ? langSel.includes(opt.id) : answers[step.id] === opt.id;
            return (
              <button key={opt.id}
                style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'10px 12px', borderRadius:9,
                  border:`1.5px solid ${sel ? '#4d4398' : '#e4e1f5'}`,
                  background: sel ? '#f0eeff' : '#fff',
                  cursor:'pointer', textAlign:'left',
                  width:'100%', boxSizing:'border-box', fontFamily:'inherit',
                  transition:'border-color .15s, background .15s',
                }}
                onClick={() => selectOpt(opt.id)}
              >
                {/* Radio / Checkbox */}
                {isMulti ? (
                  <div style={{ width:15, height:15, borderRadius:4, border:`2px solid ${sel ? '#4d4398' : '#ccc'}`, display:'flex', alignItems:'center', justifyContent:'center', background: sel ? '#4d4398' : '#fff', flexShrink:0 }}>
                    {sel && <span style={{ color:'#fff', fontSize:9, fontWeight:900 }}>✓</span>}
                  </div>
                ) : (
                  <div style={{ width:15, height:15, borderRadius:'50%', border:`2px solid ${sel ? '#4d4398' : '#ccc'}`, display:'flex', alignItems:'center', justifyContent:'center', background:'#fff', flexShrink:0 }}>
                    {sel && <div style={{ width:7, height:7, borderRadius:'50%', background:'#4d4398' }} />}
                  </div>
                )}
                <span style={{ fontSize:18, flexShrink:0 }}>{opt.emoji}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <span style={{ fontSize:13, fontWeight:600, color: sel ? '#3b2d80' : '#1a1433', display:'block', lineHeight:1.2 }}>{opt.label}</span>
                  <span style={{ fontSize:10.5, color:'#b5b2cc', display:'block', marginTop:1 }}>{opt.detail}</span>
                </div>
                {/* Time step: show week estimate */}
                {isTimeStep && (
                  <span style={{ fontSize:10, fontWeight:700, color:'#4d4398', background:'#f0eeff', padding:'2px 7px', borderRadius:4, flexShrink:0 }}>
                    ~{opt.weeks}wk
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Beginner shortcut hint */}
        {isBeginnerHint && (
          <div style={{ marginTop:12, padding:'10px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:9 }}>
            <p style={{ fontSize:12, fontWeight:700, color:'#15803d', margin:'0 0 2px' }}>✅ Perfect! We'll skip the skill test</p>
            <p style={{ fontSize:11, color:'#166534', margin:0 }}>
              You'll start directly on Day 1 — HTML from scratch. No test needed.
            </p>
          </div>
        )}

        {/* Nav */}
        <div style={{ display:'flex', gap:8, marginTop:16 }}>
          {stepIdx > 0 && (
            <button
              style={{ padding:'9px 13px', border:'1.5px solid #e4e1f5', borderRadius:8, background:'#fff', color:'#9896b0', fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0, fontFamily:'inherit' }}
              onClick={() => setStepIdx(i => i - 1)}>
              ← Back
            </button>
          )}
          <button
            style={{ flex:1, padding:'10px', border:'none', borderRadius:8, background: canProceed() ? '#3b2d80' : '#d4d0eb', color:'#fff', fontSize:13, fontWeight:700, cursor: canProceed() ? 'pointer' : 'not-allowed', fontFamily:'inherit', transition:'background .15s' }}
            disabled={!canProceed()}
            onClick={handleNext}>
            {stepIdx === total - 1
              ? (langSel.includes('none') ? 'Start Learning 🚀' : 'Start Skill Check →')
              : 'Continue →'
            }
          </button>
        </div>
      </div>

      <button
        style={{ marginTop:14, background:'none', border:'none', color:'#c0bcd8', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}
        onClick={handleSkip}>
        Skip — go to dashboard
      </button>
    </div>
  );
};

// Small tag pill for live preview
const Tag = ({ label, color }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10.5, fontWeight:700, color, background:`${color}15`, padding:'3px 8px', borderRadius:20 }}>
    {label}
  </span>
);

export default Onboarding;