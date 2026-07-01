// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TOPIC_COLOR  = { HTML: '#e34c26', CSS: '#264de4', JavaScript: '#b45309' };
const TOPIC_TAG_BG = { HTML: '#fff4f2', CSS: '#f0f3ff', JavaScript: '#fffef0' };

const GOAL_META = {
  placement: { label: 'Crack Campus Placements', emoji: '🏆', sub: 'DSA + Aptitude',         color: '#f59e0b', bg: '#fffbeb' },
  job:       { label: 'Get a Developer Job',      emoji: '💼', sub: 'Portfolio + Interviews', color: '#3b82f6', bg: '#eff6ff' },
  project:   { label: 'Build a Real Project',     emoji: '🛠️', sub: 'Something to show',     color: '#10b981', bg: '#ecfdf5' },
  basics:    { label: 'Learn Coding from Scratch',emoji: '📖', sub: 'Start from zero',        color: '#8b5cf6', bg: '#f5f3ff' },
  frontend:  { label: 'Become a Frontend Dev',    emoji: '🎨', sub: 'HTML, CSS, JS, React',   color: '#ec4899', bg: '#fdf2f8' },
  backend:   { label: 'Become a Backend Dev',     emoji: '⚙️', sub: 'Node.js, APIs, DBs',    color: '#6366f1', bg: '#eef2ff' },
  fullstack: { label: 'Become Full Stack',         emoji: '🔥', sub: 'Front + Back together', color: '#ef4444', bg: '#fef2f2' },
  websites:  { label: 'Build Client Websites',    emoji: '🌐', sub: 'Fast, polished sites',   color: '#0891b2', bg: '#ecfeff' },
  webapps:   { label: 'Build Web Apps',            emoji: '📱', sub: 'Full apps for clients', color: '#7c3aed', bg: '#f5f3ff' },
  webapp:    { label: 'Build My Own Web App',      emoji: '⚡', sub: 'Interactive + backend', color: '#d97706', bg: '#fffbeb' },
  saas:      { label: 'Launch a SaaS Product',     emoji: '💡', sub: 'Subscription product',  color: '#059669', bg: '#ecfdf5' },
  unsure:    { label: 'Explore Web Development',   emoji: '🧭', sub: 'Help me explore',       color: '#6b7280', bg: '#f9fafb' },
  ecommerce: { label: 'Build E-Commerce Stores',  emoji: '🛒', sub: 'Shopify, custom shops',  color: '#f97316', bg: '#fff7ed' },
  design:    { label: 'Create Beautiful UI',       emoji: '✨', sub: 'Beautiful interfaces',   color: '#db2777', bg: '#fdf2f8' },
  website:   { label: 'Build My Portfolio',        emoji: '🌐', sub: 'Portfolio or info site', color: '#2563eb', bg: '#eff6ff' },
  tool:      { label: 'Build an Automation Tool',  emoji: '🤖', sub: 'Script or utility',     color: '#0d9488', bg: '#f0fdfa' },
};

// ─── Today's date key for daily reset ────────────────────
const getTodayKey = () => new Date().toISOString().slice(0, 10); // "2026-04-19"

const getDailyGoals = (userKey) => {
  try {
    const raw = localStorage.getItem(`atl_daily_goals_${userKey}`);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Reset if it's a new day
    if (saved.date !== getTodayKey()) return null;
    return saved.done || {};
  } catch { return null; }
};

const saveDailyGoals = (userKey, done) => {
  try {
    localStorage.setItem(`atl_daily_goals_${userKey}`, JSON.stringify({
      date: getTodayKey(),
      done,
    }));
  } catch {}
};

// ─────────────────────────────────────────────────────────
// STREAK CARD
// ─────────────────────────────────────────────────────────
const StreakCard = ({ streak }) => (
  <div className="bg-white rounded-xl p-6 border-l-4 border-red-500 shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">Current Streak</p>
        <p className="text-3xl font-bold text-gray-900">
          {streak} <span className="text-lg font-semibold text-gray-500">Days</span>
        </p>
        {streak === 0 && <p className="text-xs text-orange-500 font-bold mt-1">Start today!</p>}
        {streak === 1 && <p className="text-xs text-green-500 font-bold mt-1">🎉 Day 1 — great start!</p>}
        {streak > 1  && <p className="text-xs text-red-500 font-bold mt-1">🔥 Keep it going!</p>}
      </div>
      <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
        <span className="text-3xl">🔥</span>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────
// YOUR GOAL CARD — shows goal + change roadmap option
// ─────────────────────────────────────────────────────────
const YourGoalCard = ({ goal, hasRoadmap, navigate }) => {
  const meta = GOAL_META[goal] || GOAL_META['basics'];
  return (
    <div className="bg-white rounded-xl p-6 border-l-4 shadow-md" style={{ borderColor: meta.color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">Your Goal</p>
          <p className="text-2xl font-bold text-gray-900">{meta.emoji} {meta.label}</p>
          <p className="text-xs text-gray-400 mt-1">{meta.sub}</p>
        </div>
        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={() => navigate('/chat?mode=roadmap')}
            className="bg-[#4d4398] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#3d3475] whitespace-nowrap"
          >
            {hasRoadmap ? 'My Roadmap →' : 'Create Roadmap →'}
          </button>
          {hasRoadmap && (
            <button
              onClick={() => navigate('/chat?mode=roadmap')}
              className="bg-white text-[#4d4398] border border-[#4d4398] px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-50 whitespace-nowrap"
            >
              🔄 Change Goal
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// TODAY'S GOALS with localStorage check tracking
// ─────────────────────────────────────────────────────────
const TodaysGoals = ({ userKey, navigate }) => {
  const [done, setDone] = useState(() => getDailyGoals(userKey) || {});

  const tasks = [
    { id: 'lesson',    emoji: '📖', label: 'Complete 1 Lesson', sub: '+10 XP', route: '/lessons',    accent: 'border-[#4d4398]', xpColor: 'text-[#4d4398]', bg: 'bg-purple-50',  checkColor: '#4d4398' },
    { id: 'quiz',      emoji: '🎯', label: 'Do 1 Quiz',          sub: '+5 XP',  route: '/practice',   accent: 'border-red-400',   xpColor: 'text-red-500',   bg: 'bg-red-50',     checkColor: '#ef4444' },
    { id: 'challenge', emoji: '⚡', label: 'Solve 1 Challenge',  sub: '+15 XP', route: '/challenges', accent: 'border-yellow-400',xpColor: 'text-yellow-600', bg: 'bg-yellow-50',  checkColor: '#d97706' },
  ];

  const doneCount = tasks.filter(t => done[t.id]).length;

  const toggleTask = (e, taskId, route) => {
    e.stopPropagation();
    const newDone = { ...done, [taskId]: !done[taskId] };
    setDone(newDone);
    saveDailyGoals(userKey, newDone);
  };

  const handleCardClick = (route) => {
    navigate(route);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Today's Goals</h2>
          <p className="text-xs text-gray-400 mt-0.5">Resets every day at midnight</p>
        </div>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${doneCount === 3 ? 'bg-green-100 text-green-700' : 'bg-purple-50 text-[#4d4398]'}`}>
          {doneCount === 3 ? '🎉 All done!' : `${doneCount} / 3 done`}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {tasks.map((task) => {
          const isDone = !!done[task.id];
          return (
            <div
              key={task.id}
              onClick={() => handleCardClick(task.route)}
              className={`${task.bg} border-2 ${task.accent} rounded-xl p-4 cursor-pointer hover:shadow-md transition-all ${isDone ? 'opacity-80' : ''}`}
              style={isDone ? { background: '#f0fdf4', borderColor: '#86efac' } : {}}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{isDone ? '✅' : task.emoji}</span>
                {/* Checkbox — click to toggle without navigating */}
                <div
                  onClick={(e) => toggleTask(e, task.id, task.route)}
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                  style={{
                    borderColor: isDone ? '#22c55e' : '#d1d5db',
                    background: isDone ? '#22c55e' : '#fff',
                  }}
                  title={isDone ? 'Mark as not done' : 'Mark as done'}
                >
                  {isDone && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <p className={`text-sm font-bold mb-1 ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                {task.label}
              </p>
              <p className={`text-xs font-black ${isDone ? 'text-green-500' : task.xpColor}`}>
                {isDone ? '✓ Done!' : task.sub}
              </p>
            </div>
          );
        })}
      </div>
      {doneCount === 3 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-sm font-bold text-green-700">🎉 All goals completed for today! Come back tomorrow.</p>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// ROADMAP SECTION
// ─────────────────────────────────────────────────────────
const RoadmapSection = ({ aiRoadmap, navigate }) => {
  const [expanded, setExpanded] = useState(true);
  const hasRoadmap = !!(aiRoadmap?.weeks?.length);

  return (
    <div className="bg-white rounded-xl shadow-lg mb-8 border-t-4 border-[#4d4398]">
      <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Learning Roadmap</h2>
          {hasRoadmap && (
            <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-[#4d4398]">
              <svg className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
        {hasRoadmap && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">🤖 {aiRoadmap.title}</span>
            <button onClick={() => navigate('/skill-result')}
              className="text-sm font-bold text-[#4d4398] hover:underline">View full →</button>
          </div>
        )}
      </div>

      {!hasRoadmap ? (
        <div className="px-8 py-12 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-lg font-bold text-gray-800 mb-2">No AI Roadmap Yet</p>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Take the skill check — ATL Bot will ask you a few questions,<br />
            test your knowledge, and create a personalised week-by-week plan just for you.
          </p>
          <button onClick={() => navigate('/chat?mode=roadmap')}
            className="bg-[#4d4398] text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-[#3d3475]">
            Create My Roadmap →
          </button>
        </div>
      ) : expanded && (
        <div className="px-8 py-6">
          <div className="relative">
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-gray-200" />
            <div className="space-y-4">
              {(aiRoadmap.weeks || []).slice(0, 8).map((week, i) => {
                const isLeft    = i % 2 === 0;
                const isCurrent = i === 0;
                const fc = TOPIC_COLOR[week.focusTopic] || '#4d4398';
                const fb = TOPIC_TAG_BG[week.focusTopic] || '#f0eeff';
                return (
                  <div key={i} className={`flex items-center gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className="w-5/12">
                      <div className={`px-4 py-3 border ${isCurrent ? 'bg-[#4d4398] border-[#4d4398]' : 'bg-white border-gray-200'}`}>
                        <p className={`text-sm font-semibold ${isCurrent ? 'text-white' : 'text-gray-800'}`}>
                          Week {week.week} — {week.title}
                        </p>
                        {week.focusTopic && (
                          <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5"
                            style={{ background: isCurrent ? 'rgba(255,255,255,0.15)' : fb, color: isCurrent ? '#fff' : fc }}>
                            {week.focusTopic}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-2/12 flex justify-center relative z-10">
                      <div className={`w-7 h-7 text-white text-xs font-bold flex items-center justify-center ${isCurrent ? 'bg-[#4d4398]' : 'bg-gray-300'}`}>
                        {i + 1}
                      </div>
                    </div>
                    <div className="w-5/12" />
                  </div>
                );
              })}
            </div>
          </div>
          {(aiRoadmap.weeks?.length || 0) > 8 && (
            <button onClick={() => navigate('/skill-result')}
              className="w-full mt-6 border border-gray-200 text-[#4d4398] py-2 rounded-lg text-sm font-bold hover:bg-gray-50">
              See all {aiRoadmap.weeks.length} weeks →
            </button>
          )}
          <div className="text-center mt-8 pt-6 border-t border-gray-100">
            <button onClick={() => navigate('/chat')}
              className="bg-[#4d4398] text-white px-8 py-3 text-sm font-bold hover:bg-[#3d3475] rounded-lg">
              Ask ATL Bot about my Roadmap
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// MAIN HOME COMPONENT
// ─────────────────────────────────────────────────────────
const Home = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [popupVideoIdx,    setPopupVideoIdx]    = useState(0);

  const popupVideos = [
    { id: 'OyK0oE5rwFY', title: 'Perfect Coding Posture' },
    { id: 'RGaW82k4dK4', title: 'Stay Healthy While Coding' },
  ];

  useEffect(() => {
    if (!user) return;
    const key = `atl_seen_intro_${user.id || user.email}`;
    if (!localStorage.getItem(key)) setShowWelcomePopup(true);
  }, [user]);

  const closeWelcomePopup = () => {
    localStorage.setItem(`atl_seen_intro_${user?.id || user?.email}`, 'true');
    setShowWelcomePopup(false);
    setPopupVideoIdx(0);
  };

  // ── Read onboarding data ──
  const getOnboarding = () => {
    const keys = [user?.id, user?.email].filter(Boolean);
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(`atl_onboarding_${k}`);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    if (user?.goal) return user;
    return null;
  };

  const onboarding = getOnboarding();
  const userGoal   = onboarding?.goal || user?.goal || 'basics';
  const userKey    = user?.id || user?.email || 'guest';

  const aiRoadmap = (() => {
    try {
      const primaryKey = `atl_ai_roadmap_${userKey}`;
      const primary = localStorage.getItem(primaryKey);
      if (primary) return JSON.parse(primary);
      const fallbackKey = `atl_skill_result_${user?.id || user?.email}`;
      const fallback = localStorage.getItem(fallbackKey);
      if (fallback) {
        const parsed = JSON.parse(fallback);
        return parsed?.roadmap || parsed || null;
      }
      return null;
    } catch { return null; }
  })();

  const userName      = user?.name || user?.firstName || user?.email?.split('@')[0] || 'there';
  const joinedDate    = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'January 2026';
  const currentStreak = user?.streak || 0;
  const hasRoadmap    = !!(aiRoadmap?.weeks?.length);
  const currentWeek   = aiRoadmap?.weeks?.[0];
  const nextLesson    = currentWeek?.title || 'HTML Basics';
  const tasksLeft     = currentWeek?.tasks?.length || 3;

  const INTERVIEW_COMPANIES = [
    { name: 'Amazon',    letter: 'A', bg: 'bg-orange-500', from: 'from-orange-50', to: 'to-orange-100', border: 'border-orange-200 hover:border-orange-400', count: 25, practiceLink: 'https://www.geeksforgeeks.org/interview-experiences/amazon-interview-preparation/' },
    { name: 'Microsoft', letter: 'M', bg: 'bg-blue-500',   from: 'from-blue-50',   to: 'to-blue-100',   border: 'border-blue-200 hover:border-blue-400',     count: 30, practiceLink: 'https://www.geeksforgeeks.org/interview-experiences/microsoft-interview-questions/' },
    { name: 'Google',    letter: 'G', bg: 'bg-red-500',    from: 'from-red-50',    to: 'to-red-100',    border: 'border-red-200 hover:border-red-400',       count: 20, practiceLink: 'https://www.geeksforgeeks.org/interview-experiences/google-interview-preparation/' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Welcome Popup */}
      {showWelcomePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-8 relative">
            <button onClick={closeWelcomePopup} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
            <h2 className="text-2xl font-bold text-[#3e2f7f] mb-2 text-center">Welcome to ATL! 🎉</h2>
            <p className="text-gray-500 text-center mb-6">Video {popupVideoIdx + 1} of {popupVideos.length} — {popupVideos[popupVideoIdx].title}</p>
            <div className="rounded-lg overflow-hidden aspect-video bg-gray-900 mb-6">
              <iframe key={popupVideos[popupVideoIdx].id} className="w-full h-full"
                src={`https://www.youtube.com/embed/${popupVideos[popupVideoIdx].id}`}
                title={popupVideos[popupVideoIdx].title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
            <div className="flex gap-3">
              <button onClick={closeWelcomePopup} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200">Skip</button>
              {popupVideoIdx < popupVideos.length - 1
                ? <button onClick={() => setPopupVideoIdx(i => i + 1)} className="flex-1 bg-[#4d4398] text-white py-3 rounded-lg font-bold hover:bg-[#3d3475]">Next →</button>
                : <button onClick={closeWelcomePopup} className="flex-1 bg-[#4d4398] text-white py-3 rounded-lg font-bold hover:bg-[#3d3475]">Get Started 🚀</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <div className="bg-[#3e2f7f] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex flex-col leading-none">
              <span className="text-white font-extrabold text-[22px] tracking-wide">ATL</span>
              <span className="text-white text-[10px] font-medium tracking-[0.2em] opacity-85">ANYTIME LEARNING</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button className="text-white text-sm font-medium border-b-2 border-white pb-1">Dashboard</button>
              {['Lessons', 'Practice', 'Chat', 'Resources'].map(item => (
                <button key={item} onClick={() => navigate('/' + item.toLowerCase())}
                  className="text-white text-sm font-medium hover:text-gray-200">{item}</button>
              ))}
            </div>
            <button onClick={onLogout} className="bg-white text-[#4d4398] px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 shadow-md">Logout</button>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {userName}! 👋</h1>
          <p className="text-gray-600 text-lg">Start your learning journey today</p>
          <p className="text-gray-500 text-sm mt-1">Member since {joinedDate}</p>
        </div>

        {/* ── STATS: Streak + Your Goal ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <StreakCard streak={currentStreak} />
          <YourGoalCard goal={userGoal} hasRoadmap={hasRoadmap} navigate={navigate} />
        </div>

        {/* ── CONTINUE / CREATE BANNER — only show "Create" if no roadmap ── */}
        {hasRoadmap ? (
          <div className="rounded-xl p-6 mb-8 flex items-center justify-between shadow-lg" style={{ background: '#3e2f7f' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">▶</span>
              </div>
              <div>
                <p className="text-white text-xs font-bold uppercase tracking-wider opacity-75 mb-0.5">Continue Learning</p>
                <p className="text-white text-lg font-bold">{nextLesson}</p>
                <p className="text-white text-xs opacity-70 mt-0.5">{tasksLeft} tasks · Week 1</p>
              </div>
            </div>
            <button onClick={() => navigate('/lessons')}
              className="bg-white text-[#3e2f7f] px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors flex-shrink-0 shadow-md">
              Start Now →
            </button>
          </div>
        ) : (
          /* Only show "Create Roadmap" banner if NO roadmap exists */
          <div className="rounded-xl p-6 mb-8 flex items-center justify-between shadow-lg" style={{ background: '#3e2f7f' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🗺️</span>
              </div>
              <div>
                <p className="text-white text-xs font-bold uppercase tracking-wider opacity-75 mb-0.5">Get Started</p>
                <p className="text-white text-lg font-bold">Create Your Personalised Roadmap</p>
                <p className="text-white text-xs opacity-70 mt-0.5">ATL Bot will ask you a few questions and test your level (2 min)</p>
              </div>
            </div>
            <button onClick={() => navigate('/chat?mode=roadmap')}
              className="bg-white text-[#3e2f7f] px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors flex-shrink-0 shadow-md">
              Create Now →
            </button>
          </div>
        )}

        {/* ── TODAY'S GOALS with working checkboxes ── */}
        <TodaysGoals userKey={userKey} navigate={navigate} />

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Lessons',   sub: 'Step by step',     btn: 'EXPLORE',    border: 'border-[#4d4398]', btnCls: 'bg-[#4d4398] hover:bg-[#3d3475]',  route: '/lessons'   },
              { label: 'Practice',  sub: 'Quizzes & more',   btn: 'START QUIZ', border: 'border-green-500', btnCls: 'bg-green-600 hover:bg-green-700',   route: '/practice'  },
              { label: 'AI Chat',   sub: 'Get instant help', btn: 'OPEN CHAT',  border: 'border-indigo-500',btnCls: 'bg-indigo-600 hover:bg-indigo-700', route: '/chat'      },
              { label: 'Resources', sub: 'Study materials',  btn: 'VIEW NOTES', border: 'border-yellow-500',btnCls: 'bg-yellow-500 hover:bg-yellow-600', route: '/resources' },
            ].map((item, i) => (
              <div key={i} onClick={() => navigate(item.route)}
                className={`bg-white rounded-xl p-6 hover:shadow-lg cursor-pointer border-t-4 ${item.border} transition-shadow`}>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.label}</h3>
                <p className="text-gray-500 text-sm mb-5">{item.sub}</p>
                <button className={`w-full ${item.btnCls} text-white py-2 rounded-lg font-bold text-sm shadow-md`}>{item.btn}</button>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <RoadmapSection aiRoadmap={aiRoadmap} navigate={navigate} />

        {/* Interview Practice */}
        <div className="bg-white rounded-xl p-8 shadow-lg border-t-4 border-[#4d4398]">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Interview Practice</h2>
              <p className="text-sm text-gray-500">Top Companies — Real Questions</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {INTERVIEW_COMPANIES.map(company => (
              <div key={company.name}
                className={`bg-gradient-to-br ${company.from} ${company.to} rounded-xl p-6 border-2 ${company.border} hover:shadow-lg transition-all`}>
                <div className="flex items-start mb-4">
                  <div className={`w-14 h-14 ${company.bg} rounded-lg flex items-center justify-center mr-4 shadow-md flex-shrink-0`}>
                    <span className="text-white font-bold text-2xl">{company.letter}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-600">{company.count}+ Questions</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">Practice real {company.name} interview questions — DSA + Behavioural</p>
                <a href={company.practiceLink} target="_blank" rel="noopener noreferrer"
                  className={`block w-full text-center ${company.bg} text-white py-2.5 rounded-lg font-bold text-sm shadow-md hover:opacity-90 transition-opacity`}>
                  📚 Practice Set
                </a>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;