// src/components/student/Lessons.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const ATL      = '#4d4398';
const ATL_DARK = '#3e2f7f';

/* ─── SECTIONS ─────────────────────────── */
const SECTIONS = [
  { key: 'web',      title: 'Web Development',      icon: '🌐', languages: ['HTML','CSS','JavaScript','TypeScript','React','Vue','Angular','Next.js','Tailwind'] },
  { key: 'ai',       title: 'AI & Machine Learning', icon: '🤖', languages: ['Python','AI','ML','Machine Learning','Deep Learning','Data Science','TensorFlow','PyTorch','NumPy','Pandas'] },
  { key: 'backend',  title: 'Backend & Server',      icon: '⚙️', languages: ['Node.js','Express','API','REST','GraphQL','Django','Flask','FastAPI','Spring','Laravel','PHP'] },
  { key: 'java',     title: 'Java & JVM',            icon: '☕', languages: ['Java','Kotlin','Scala','Groovy'] },
  { key: 'database', title: 'Database',              icon: '🗄️', languages: ['SQL','PostgreSQL','MySQL','MongoDB','Redis','Database'] },
  { key: 'tools',    title: 'Tools & DevOps',        icon: '🛠️', languages: ['Git','GitHub','Docker','Kubernetes','Linux','Bash','CI/CD','DevOps','AWS','Azure'] },
  { key: 'other',    title: 'Other',                 icon: '📚', languages: [] },
];

const LANG_ICONS = {
  HTML:'📄',CSS:'🎨',JavaScript:'⚡',TypeScript:'📘',React:'⚛️',Vue:'💚',Angular:'🔴',
  'Next.js':'▲','Node.js':'🟢',Express:'🚀',Python:'🐍',Java:'☕',Kotlin:'🤖',
  PHP:'🐘',Ruby:'💎',Go:'🔵',Swift:'🍎',Rust:'🦀',SQL:'🗄️',PostgreSQL:'🐘',
  MongoDB:'🍃',Redis:'🔴',Docker:'🐳',Git:'🔀',GitHub:'⚫',AWS:'☁️',
  AI:'🤖',ML:'🧠','Machine Learning':'🧠','Data Science':'📊',API:'🔌',
};
const langIcon = (lang) => LANG_ICONS[lang] || '📚';

const getSectionKey = (lang = '') => {
  const l = lang.trim();
  for (const s of SECTIONS) { if (s.languages.includes(l)) return s.key; }
  return 'other';
};

const DIFF = {
  beginner:     { bg: '#f0fdf4', text: '#15803d' },
  intermediate: { bg: '#fefce8', text: '#a16207' },
  advanced:     { bg: '#fef2f2', text: '#b91c1c' },
};
const diffStyle = (d = '') => DIFF[d?.toLowerCase()] || DIFF.beginner;

/* ─── BOOST SKILLS DATA ────────────────── */
// Moved from Home.jsx — shown at bottom of Lessons page
const BOOST_SKILLS = [
  { name: 'Typing Speed',  icon: '⌨️', desc: 'Improve your coding speed',      color: '#2563eb', link: 'https://www.typingclub.com/' },
  { name: 'Excel Mastery', icon: '📊', desc: 'Shortcuts & data tricks',         color: '#16a34a', link: 'https://edu.gcfglobal.org/en/excel/' },
  { name: 'Git & GitHub',  icon: '🔀', desc: 'Version control essentials',      color: '#4d4398', link: 'https://skills.github.com/' },
  { name: 'VS Code Tips',  icon: '💻', desc: 'IDE productivity hacks',          color: '#7c3aed', link: 'https://code.visualstudio.com/docs/getstarted/keybindings' },
];

/* ─── HEADER ───────────────────────────── */
const Header = ({ onLogout }) => {
  const navigate = useNavigate();
  const NAV = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Lessons',   path: '/lessons'   },
    { label: 'Practice',  path: '/practice'  },
    { label: 'Chat',      path: '/chat'      },
    { label: 'Resources', path: '/resources' },
  ];
  return (
    <header style={{ background: ATL_DARK, position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 1, fontFamily: 'system-ui,sans-serif', lineHeight: 1 }}>ATL</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 8, letterSpacing: 3, fontFamily: 'system-ui,sans-serif', marginTop: 2 }}>ANYTIME LEARNING</div>
        </div>
        <nav style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
          {NAV.map(item => {
            const isActive = item.label === 'Lessons';
            return (
              <button key={item.label} onClick={() => navigate(item.path)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: isActive ? 600 : 400,
                color: '#fff', fontFamily: 'system-ui,sans-serif',
                padding: '0 0 2px 0',
                borderBottom: isActive ? '2px solid #fff' : '2px solid transparent',
                opacity: isActive ? 1 : .8,
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = isActive ? 1 : .8}
              >{item.label}</button>
            );
          })}
        </nav>
        <button onClick={onLogout} style={{ background: '#fff', color: ATL_DARK, border: 'none', borderRadius: 8, padding: '7px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>
          Logout
        </button>
      </div>
    </header>
  );
};

/* ─── LESSON CARD ──────────────────────── */
const LessonCard = ({ lesson }) => {
  const navigate    = useNavigate();
  const diff        = diffStyle(lesson.difficulty);
  const isCompleted = lesson.is_completed;
  const hasProgress = lesson.started && !isCompleted;
  const pct         = lesson.progress_percentage || 0;

  let btnLabel = 'Start Lesson';
  let btnBg    = ATL;
  if (isCompleted) { btnLabel = '✓ Review';   btnBg = '#16a34a'; }
  if (hasProgress) { btnLabel = 'Continue →'; btnBg = ATL; }

  return (
    <div
      onClick={() => navigate(`/lesson/${lesson.id}`)}
      style={{
        background: '#fff', borderRadius: 14,
        border: `1.5px solid ${isCompleted ? '#86efac' : '#e5e7eb'}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        cursor: 'pointer', transition: 'box-shadow .2s, transform .18s',
        boxShadow: '0 1px 3px rgba(0,0,0,.06)',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(77,67,152,.14)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.06)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ height: 3, background: isCompleted ? '#22c55e' : ATL }} />

      <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Difficulty + done badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: diff.bg, color: diff.text, textTransform: 'capitalize' }}>
            {lesson.difficulty || 'Beginner'}
          </span>
          {isCompleted && (
            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>✓ Done</span>
          )}
        </div>

        {/* Icon + title */}
        <div style={{ textAlign: 'center', padding: '4px 0 2px' }}>
          <div style={{ fontSize: 36, marginBottom: 6, lineHeight: 1 }}>
            {lesson.icon || langIcon(lesson.language)}
          </div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e1b4b', lineHeight: 1.3 }}>{lesson.title}</h3>
          {lesson.description && (
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {lesson.description}
            </p>
          )}
        </div>

        {/* Progress bar */}
        {hasProgress && pct > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>
              <span>Progress</span>
              <span style={{ color: ATL, fontWeight: 700 }}>{pct}%</span>
            </div>
            <div style={{ height: 5, background: '#ede9ff', borderRadius: 99 }}>
              <div style={{ height: '100%', width: `${pct}%`, background: ATL, borderRadius: 99 }} />
            </div>
          </div>
        )}

        {/* XP + time */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', fontSize: 11, color: '#9ca3af' }}>
          {lesson.xp_reward          && <span>⭐ {lesson.xp_reward} XP</span>}
          {lesson.estimated_duration && <span>⏱ {lesson.estimated_duration} min</span>}
        </div>

        {/* CTA */}
        <button
          onClick={e => { e.stopPropagation(); navigate(`/lesson/${lesson.id}`); }}
          style={{ width: '100%', background: btnBg, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'system-ui,sans-serif', marginTop: 4 }}
          onMouseEnter={e => e.currentTarget.style.opacity = .88}
          onMouseLeave={e => e.currentTarget.style.opacity = 1}
        >{btnLabel}</button>
      </div>
    </div>
  );
};

/* ─── SECTION ROW ──────────────────────── */
const SectionRow = ({ section, lessons }) => {
  const done = lessons.filter(l => l.is_completed).length;
  const pct  = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', background: '#faf9ff', borderBottom: '1px solid #f0eeff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{section.icon}</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e1b4b' }}>{section.title}</h2>
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{lessons.length} lesson{lessons.length !== 1 ? 's' : ''} · {done} completed</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 100, height: 6, background: '#ede9ff', borderRadius: 99 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : ATL, borderRadius: 99, transition: 'width .5s' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? '#16a34a' : ATL, minWidth: 32 }}>{pct}%</span>
        </div>
      </div>
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {lessons.map(lesson => <LessonCard key={lesson.id} lesson={lesson} />)}
      </div>
    </div>
  );
};

/* ─── BOOST SKILLS SECTION ─────────────── */
// Moved from dashboard — lives at bottom of lessons page
const BoostSkills = () => {
  const [open, setOpen] = useState(false); // collapsed by default

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'system-ui,sans-serif' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🚀</span>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e1b4b' }}>Boost Your Skills</h2>
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Extra resources to level up faster</p>
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Grid — only shown when open */}
      {open && (
        <div style={{ padding: '4px 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {BOOST_SKILLS.map((s, i) => (
            <div key={i} style={{ background: s.color, borderRadius: 12, padding: '16px 14px', color: '#fff', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{s.icon}</div>
              <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>{s.name}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', margin: '0 0 12px', flex: 1 }}>{s.desc}</p>
              <button
                onClick={() => window.open(s.link, '_blank')}
                style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.2)'}
              >
                Open →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── MAIN ─────────────────────────────── */
const Lessons = ({ user, onLogout }) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const res = await api.lessons.student.getAll();
      const all = res?.data || res || [];
      setLessons(Array.isArray(all) ? all.filter(l => l.is_active !== false) : []);
    } catch {
      setError('Unable to load lessons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { if (onLogout) onLogout(); };

  // Group lessons by section
  const grouped = {};
  lessons
    .sort((a, b) => (a.order_number || a.order_index || 0) - (b.order_number || b.order_index || 0))
    .forEach(l => {
      const k = getSectionKey(l.language);
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(l);
    });

  const totalDone    = lessons.filter(l => l.is_completed).length;
  const activeSections = SECTIONS.filter(s => grouped[s.key]?.length > 0);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Header onLogout={handleLogout} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 64px)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${ATL}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#9ca3af', fontSize: 14 }}>Loading lessons…</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,sans-serif' }}>
      <Header onLogout={handleLogout} />
      <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>{error}</p>
        <button onClick={fetchData} style={{ background: ATL, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Try Again</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: 'system-ui,sans-serif' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Header onLogout={handleLogout} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Page heading */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>Programming Lessons</h1>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#9ca3af' }}>Master programming through structured step-by-step lessons</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 18px' }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e1b4b', lineHeight: 1 }}>{totalDone}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Completed</p>
            </div>
          </div>
        </div>

        {/* No lessons state */}
        {activeSections.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 14, border: '2px dashed #e5e7eb' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>📭</div>
            <p style={{ color: '#9ca3af', fontWeight: 600, margin: 0 }}>No lessons available yet</p>
          </div>
        )}

        {/* Lesson sections */}
        {activeSections.map(s => (
          <SectionRow key={s.key} section={s} lessons={grouped[s.key]} />
        ))}

        {/* Boost Skills — moved from Home.jsx, collapsed by default */}
        <BoostSkills />

      </div>
    </div>
  );
};

export default Lessons;