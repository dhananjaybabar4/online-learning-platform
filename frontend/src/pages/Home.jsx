// src/pages/Home.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const TOPIC_COLOR  = { HTML: '#e34c26', CSS: '#264de4', JavaScript: '#b45309' };
const TOPIC_TAG_BG = { HTML: '#fff4f2', CSS: '#f0f3ff', JavaScript: '#fffef0' };

// ─────────────────────────────────────────────────────────
// FLOATING TOAST
// ─────────────────────────────────────────────────────────
const FloatingToast = ({ show, onClose, anchorRef, type }) => {
  const toastRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [arrowStyle, setArrowStyle] = useState({});

  useEffect(() => {
    if (!show || !anchorRef?.current) return;
    const calcPos = () => {
      const rect   = anchorRef.current.getBoundingClientRect();
      const toastW = 320;
      let top  = rect.bottom + 12 + window.scrollY;
      let left = rect.left + window.scrollX;
      if (left + toastW > window.innerWidth - 16) left = window.innerWidth - toastW - 16;
      if (left < 16) left = 16;
      setPos({ top, left });
      setArrowStyle({ left: Math.max(16, Math.min(toastW - 32, rect.left + rect.width / 2 - left)) });
    };
    calcPos();
    window.addEventListener('resize', calcPos);
    window.addEventListener('scroll', calcPos);
    return () => { window.removeEventListener('resize', calcPos); window.removeEventListener('scroll', calcPos); };
  }, [show, anchorRef]);

  if (!show) return null;
  const isStreak  = type === 'streak';
  const border    = isStreak ? 'border-red-300'   : 'border-purple-300';
  const arrow     = isStreak ? '#fca5a5'           : '#c4b5fd';

  return (
    <div ref={toastRef} className={`fixed z-50 bg-white border-2 ${border} rounded-xl shadow-2xl`}
      style={{ top: pos.top, left: pos.left, width: 320 }}>
      <div className="absolute -top-3" style={{ left: arrowStyle.left, width:0, height:0, borderLeft:'12px solid transparent', borderRight:'12px solid transparent', borderBottom:`12px solid ${arrow}` }} />
      <div className="absolute" style={{ top:-10, left:(arrowStyle.left||0)+2, width:0, height:0, borderLeft:'10px solid transparent', borderRight:'10px solid transparent', borderBottom:'10px solid white', zIndex:1 }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            {isStreak ? (
              <>
                <p className="text-sm font-semibold text-gray-800">🔥 About Your Streak</p>
                <p className="text-xs text-gray-600">Days in a row you've been active on ATL.</p>
                <p className="text-xs text-gray-600">⚠️ Skip 1 day → streak resets to 0!</p>
                <p className="text-xs text-gray-600">✅ Any lesson, quiz, or battle keeps it alive.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-800">⚡ About Your XP</p>
                <p className="text-xs text-gray-600">Earn XP by completing activities on ATL.</p>
                <p className="text-xs text-gray-600">⚡ Lesson +10 | Quiz +5 | Challenge +15 | Battle +20</p>
                <p className="text-xs text-gray-600">🥉 Bronze → 🥈 Silver at 200 XP</p>
              </>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none flex-shrink-0">×</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// STREAK CARD  — border-l-4 border-red-500
// ─────────────────────────────────────────────────────────
const StreakCard = ({ streak, showToast, onToggle }) => {
  const cardRef = useRef(null);
  return (
    <>
      <div ref={cardRef} onClick={onToggle}
        className="bg-white rounded-xl p-6 border-l-4 border-red-500 shadow-md cursor-pointer hover:shadow-lg transition-shadow select-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Current Streak</p>
            <p className="text-3xl font-bold text-gray-900">{streak} <span className="text-lg font-semibold text-gray-500">Days</span></p>
            {!streak && <p className="text-xs text-orange-500 font-bold mt-1">Start today!</p>}
          </div>
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🔥</span>
          </div>
        </div>
      </div>
      <FloatingToast show={showToast} onClose={onToggle} anchorRef={cardRef} type="streak" />
    </>
  );
};

// ─────────────────────────────────────────────────────────
// XP + BADGE CARD  — md:col-span-2, border-l-4 border-purple
// ─────────────────────────────────────────────────────────
const XpCard = ({ ppPoints, showToast, onToggle }) => {
  const cardRef    = useRef(null);
  const xpPct      = Math.min(100, Math.round((ppPoints / 200) * 100));
  const xpToSilver = Math.max(0, 200 - ppPoints);

  return (
    <>
      <div ref={cardRef} onClick={onToggle}
        className="md:col-span-2 bg-white rounded-xl p-6 border-l-4 border-[#4d4398] shadow-md cursor-pointer hover:shadow-lg transition-shadow select-none">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 mb-2">ATL Score (XP)</p>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-5xl">🥉</span>
              <div>
                <p className="text-xl font-bold text-gray-900">Bronze</p>
                <p className="text-xs text-gray-500">{xpToSilver} XP to Silver</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress to Silver</span>
                <span>{ppPoints} / 200 XP</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-[#4d4398] h-2 rounded-full transition-all duration-500" style={{ width:`${xpPct}%` }} />
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 text-center min-w-[90px] border border-purple-100 flex-shrink-0">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-1">
              <span className="text-xl">⚡</span>
            </div>
            <p className="text-2xl font-bold text-[#4d4398]">{ppPoints}</p>
            <p className="text-xs text-gray-500 font-medium">XP Points</p>
            <p className="text-[10px] text-gray-400">ATL Score</p>
          </div>
        </div>
      </div>
      <FloatingToast show={showToast} onClose={onToggle} anchorRef={cardRef} type="xp" />
    </>
  );
};

// ─────────────────────────────────────────────────────────
// ROADMAP SECTION — border-t-4, zigzag square nodes
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
            Take the skill check — Groq AI will analyse your HTML, CSS & JS level<br/>
            and create a personalised week-by-week plan just for you.
          </p>
          <button onClick={() => navigate('/skill-test')}
            className="bg-[#4d4398] text-white px-8 py-3 rounded-lg text-sm font-bold hover:bg-[#3d3475]">
            Take Skill Check →
          </button>
        </div>
      ) : expanded && (
        <div className="px-8 py-8">
          {aiRoadmap.keyInsight && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-5 py-4 mb-8">
              <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-1">🧠 Why this path?</p>
              <p className="text-sm text-purple-800 leading-relaxed">{aiRoadmap.keyInsight}</p>
            </div>
          )}

          {/* Zigzag — square numbered nodes, alternating left/right cards */}
          <div className="relative">
            <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-8">
              {(aiRoadmap.weeks || []).slice(0, 8).map((week, i) => {
                const isLeft    = i % 2 === 0;
                const isCurrent = i === 0;
                const fc = TOPIC_COLOR[week.focusTopic]  || '#4d4398';
                const fb = TOPIC_TAG_BG[week.focusTopic] || '#f0eeff';
                return (
                  <div key={i} className={`flex items-center gap-4 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* Card */}
                    <div className="w-5/12">
                      <div className={`px-5 py-4 border transition-colors ${
                        isCurrent
                          ? 'bg-[#4d4398] border-[#4d4398]'
                          : 'border-gray-200 bg-gray-50 hover:border-[#4d4398] hover:bg-[#4d4398]/5'
                      }`}>
                        <p className={`text-sm font-bold mb-2 ${isCurrent ? 'text-white' : 'text-gray-900'}`}>
                          Week {week.week}: {week.title}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {week.focusTopic && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded"
                              style={{ background: isCurrent ? 'rgba(255,255,255,.2)' : fb, color: isCurrent ? '#fff' : fc }}>
                              {week.focusTopic}
                            </span>
                          )}
                          {isCurrent && <span className="text-xs font-black bg-white text-[#4d4398] px-2 py-0.5 rounded">NOW</span>}
                          {!isCurrent && <span className="text-xs text-gray-400">🔒</span>}
                          {week.tasks?.length > 0 && (
                            <span className={`text-xs ${isCurrent ? 'text-white/70' : 'text-gray-400'}`}>{week.tasks.length} tasks</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Square numbered node */}
                    <div className="w-2/12 flex justify-center relative z-10">
                      <div className={`w-9 h-9 text-white text-sm font-black flex items-center justify-center shadow-md ${
                        isCurrent ? 'bg-[#4d4398]' : 'bg-gray-300'
                      }`}>
                        {isCurrent ? '▶' : i + 1}
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
              Ask ATL Bot for Detailed Roadmap
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────
const Home = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // 🔥 FIX: XP now reads from localStorage (real tracking until backend is wired)
  const getLocalXP = () => parseInt(localStorage.getItem('atl_xp') || '0');
  const [ppPoints,          setPpPoints]          = useState(() => getLocalXP() || user?.pp_points || 0);
  const [showTutorialVideo, setShowTutorialVideo] = useState(false);
  const [showWelcomePopup,  setShowWelcomePopup]  = useState(false);
  const [popupVideoIdx,     setPopupVideoIdx]      = useState(0);
  const [skillsExpanded,    setSkillsExpanded]    = useState(true);
  const [activeToast,       setActiveToast]       = useState(null);

  const toggleToast = (type) => setActiveToast(prev => prev === type ? null : type);

  const popupVideos = [
    { id: 'OyK0oE5rwFY', title: 'Perfect Coding Posture' },
    { id: 'RGaW82k4dK4', title: 'Stay Healthy While Coding' },
  ];

  useEffect(() => {
    // Sync XP: prefer localStorage, fallback to user.pp_points from Supabase
    const localXP = getLocalXP();
    if (localXP > 0) {
      setPpPoints(localXP);
    } else if (user?.pp_points !== undefined) {
      setPpPoints(user.pp_points);
    }
  }, [user]);

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

  const aiRoadmap = (() => {
    try {
      const k = `atl_ai_roadmap_${user?.id || user?.email || 'guest'}`;
      const d = localStorage.getItem(k);
      return d ? JSON.parse(d) : null;
    } catch { return null; }
  })();

  const userName   = user?.name || user?.firstName || user?.email?.split('@')[0] || 'there';
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long' })
    : 'January 2026';

  const additionalSkills = [
    { name:'Typing Speed',  icon:'⌨️', description:'Improve your coding speed',  color:'from-blue-500 to-blue-600'     },
    { name:'Excel Mastery', icon:'📊', description:'Shortcuts & data tricks',     color:'from-green-500 to-green-600'   },
    { name:'Git & GitHub',  icon:'🔀', description:'Version control essentials',  color:'from-[#4d4398] to-[#3e2f7f]'  },
    { name:'VS Code Tips',  icon:'💻', description:'IDE productivity hacks',      color:'from-indigo-500 to-indigo-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Welcome Popup */}
      {showWelcomePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-8 relative">
            <button onClick={closeWelcomePopup} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
            <h2 className="text-2xl font-bold text-[#3e2f7f] mb-2 text-center">Welcome to ATL! 🎉</h2>
            <p className="text-gray-500 text-center mb-6">Video {popupVideoIdx+1} of {popupVideos.length} — {popupVideos[popupVideoIdx].title}</p>
            <div className="rounded-lg overflow-hidden aspect-video bg-gray-900 mb-6">
              <iframe key={popupVideos[popupVideoIdx].id} className="w-full h-full"
                src={`https://www.youtube.com/embed/${popupVideos[popupVideoIdx].id}`}
                title={popupVideos[popupVideoIdx].title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
            <div className="flex gap-3">
              <button onClick={closeWelcomePopup} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200">Skip</button>
              {popupVideoIdx < popupVideos.length - 1
                ? <button onClick={() => setPopupVideoIdx(i => i+1)} className="flex-1 bg-[#4d4398] text-white py-3 rounded-lg font-bold hover:bg-[#3d3475]">Next →</button>
                : <button onClick={closeWelcomePopup} className="flex-1 bg-[#4d4398] text-white py-3 rounded-lg font-bold hover:bg-[#3d3475]">Get Started 🚀</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {showTutorialVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full p-8 relative">
            <button onClick={() => setShowTutorialVideo(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-[#3e2f7f] mb-6 text-center">Getting Started</h2>
            <div className="rounded-lg overflow-hidden aspect-video bg-gray-900 mb-6">
              <iframe className="w-full h-full" src="https://www.youtube.com/embed/zOjov-2OZ0E"
                title="Getting Started" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
            <button onClick={() => setShowTutorialVideo(false)} className="w-full bg-[#4d4398] text-white py-3 rounded-lg font-bold hover:bg-[#3d3475]">Close</button>
          </div>
        </div>
      )}

      {/* Navbar */}
      <div className="bg-[#3e2f7f] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex flex-col leading-none">
              <span className="text-white font-extrabold text-[22px] tracking-wide">ATL</span>
              <span className="text-white text-[10px] font-medium tracking-[0.2em] opacity-85">ANYTIME LEARNING</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button className="text-white text-sm font-medium border-b-2 border-white pb-1">Dashboard</button>
              {['Lessons','Practice','Chat','Resources'].map(item => (
                <button key={item} onClick={() => navigate('/'+item.toLowerCase())}
                  className="text-white text-sm font-medium hover:text-gray-200">{item}</button>
              ))}
            </div>
            <button onClick={onLogout} className="bg-white text-[#4d4398] px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 shadow-md">Logout</button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {userName}! 👋</h1>
          <p className="text-gray-600 text-lg">Start your learning journey today</p>
          <p className="text-gray-500 text-sm mt-1">Member since {joinedDate}</p>
        </div>

        {/* 🔥 CONTINUE LEARNING BANNER — most important CTA */}
        {(() => {
          const skillResult = (() => {
            try {
              const keys = [`atl_skill_result_${user?.id || user?.email}`, 'atl_skill_result'];
              for (const k of keys) { const d = localStorage.getItem(k); if (d) return JSON.parse(d); }
            } catch {} return null;
          })();
          const hasRoadmap = !!(aiRoadmap?.weeks?.length || skillResult?.roadmap?.steps?.length);
          const currentWeek = aiRoadmap?.weeks?.[0];
          const nextLesson  = currentWeek?.title || skillResult?.roadmap?.steps?.[0] || 'HTML Basics';
          const tasksLeft   = currentWeek?.tasks?.length || 3;

          return hasRoadmap ? (
            <div className="bg-gradient-to-r from-[#3b2d80] to-[#4d4398] rounded-xl p-6 mb-8 flex items-center justify-between shadow-lg">
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
              <button
                onClick={() => navigate('/lessons')}
                className="bg-white text-[#3b2d80] px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors flex-shrink-0 shadow-md"
              >
                Start Now →
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-[#3b2d80] to-[#4d4398] rounded-xl p-6 mb-8 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🎯</span>
                </div>
                <div>
                  <p className="text-white text-xs font-bold uppercase tracking-wider opacity-75 mb-0.5">Get Started</p>
                  <p className="text-white text-lg font-bold">Take the Skill Check</p>
                  <p className="text-white text-xs opacity-70 mt-0.5">Groq AI will build your personalised roadmap</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/skill-test')}
                className="bg-white text-[#3b2d80] px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors flex-shrink-0 shadow-md"
              >
                Take Test →
              </button>
            </div>
          );
        })()}

        {/* Stats — border-l-4 style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StreakCard streak={user?.streak||0} showToast={activeToast==='streak'} onToggle={() => toggleToast('streak')} />
          <XpCard ppPoints={ppPoints} showToast={activeToast==='xp'} onToggle={() => toggleToast('xp')} />
        </div>

        {/* Watch Banner */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-4 p-5">
            <button onClick={() => setShowTutorialVideo(true)}
              className="w-12 h-12 rounded-full bg-[#4d4398] flex items-center justify-center flex-shrink-0 hover:bg-[#3d3475] transition-colors">
              <svg className="w-5 h-5 text-white ml-0.5" fill="white" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </button>
            <div>
              <p className="text-sm font-bold text-gray-900">Getting Started — Watch before coding</p>
              <p className="text-xs text-gray-500 mt-0.5">Quick tutorial · 3 min · Recommended for new students</p>
            </div>
          </div>
          <button onClick={() => setShowTutorialVideo(true)}
            className="bg-[#4d4398] text-white px-6 text-sm font-bold hover:bg-[#3d3475] flex-shrink-0 flex items-center gap-2 self-stretch">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
            </svg>
            Watch Now
          </button>
        </div>

        {/* Today's Goals */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Today's Goals</h2>
              <p className="text-xs text-gray-400 mt-0.5">Resets every day at midnight</p>
            </div>
            <span className="bg-purple-50 text-[#4d4398] text-xs font-bold px-3 py-1.5 rounded-full">0 / 3 done</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { emoji:'📖', label:'Complete 1 Lesson',  xp:'+10 XP', route:'/lessons',    accent:'border-[#4d4398]', xpColor:'text-[#4d4398]', bg:'bg-purple-50'  },
              { emoji:'🎯', label:'Do 1 Quiz',           xp:'+5 XP',  route:'/practice',   accent:'border-red-400',   xpColor:'text-red-500',   bg:'bg-red-50'     },
              { emoji:'⚡', label:'Solve 1 Challenge',   xp:'+15 XP', route:'/challenges', accent:'border-yellow-400',xpColor:'text-yellow-600', bg:'bg-yellow-50'  },
            ].map((task, i) => (
              <div key={i} onClick={() => navigate(task.route)}
                className={`${task.bg} border-2 ${task.accent} rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{task.emoji}</span>
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                </div>
                <p className="text-sm font-bold text-gray-800 mb-1">{task.label}</p>
                <p className={`text-xs font-black ${task.xpColor}`}>{task.xp}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions — border-t-4, tall cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-5">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label:'Lessons',   sub:'Step by step',     btn:'EXPLORE',    border:'border-[#4d4398]', btnCls:'bg-[#4d4398] hover:bg-[#3d3475]',  route:'/lessons'   },
              { label:'Practice',  sub:'Quizzes & more',   btn:'START QUIZ', border:'border-green-500', btnCls:'bg-green-600 hover:bg-green-700',   route:'/practice'  },
              { label:'AI Chat',   sub:'Get instant help', btn:'OPEN CHAT',  border:'border-indigo-500',btnCls:'bg-indigo-600 hover:bg-indigo-700', route:'/chat'      },
              { label:'Resources', sub:'Study materials',  btn:'VIEW NOTES', border:'border-yellow-500',btnCls:'bg-yellow-500 hover:bg-yellow-600', route:'/resources' },
            ].map((item, i) => (
              <div key={i} onClick={() => navigate(item.route)}
                className={`bg-white rounded-xl p-6 hover:shadow-lg cursor-pointer border-t-4 ${item.border} transition-shadow`}>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.label}</h3>
                <p className="text-gray-500 text-sm mb-5">{item.sub}</p>
                <button className={`w-full ${item.btnCls} text-white py-2 rounded-lg font-bold text-sm shadow-md`}>{item.btn}</button>
              </div>
            ))}
            <div onClick={() => navigate('/practice')}
              className="bg-gradient-to-br from-red-500 to-orange-600 rounded-xl p-6 hover:shadow-lg cursor-pointer text-white transition-shadow">
              <div className="w-12 h-12 bg-white bg-opacity-25 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚔️</span>
              </div>
              <h3 className="text-lg font-bold mb-1">Battle Arena</h3>
              <p className="text-sm opacity-90 mb-1">1vs1 Battle</p>
              <p className="text-xs opacity-70 mb-5">Battle with World</p>
              <button className="w-full bg-white text-red-600 py-2 rounded-lg font-bold text-sm hover:bg-gray-100">START BATTLE</button>
            </div>
          </div>
        </div>

        {/* Roadmap */}
        <RoadmapSection aiRoadmap={aiRoadmap} navigate={navigate} />

        {/* Boost Skills — gradient cards */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Boost Your Skills</h2>
            <button onClick={() => setSkillsExpanded(e => !e)} className="text-gray-400 hover:text-gray-700">
              <svg className={`w-5 h-5 transition-transform ${skillsExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {skillsExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {additionalSkills.map((skill, i) => (
                <div key={i} className={`bg-gradient-to-br ${skill.color} rounded-xl p-6 text-white`}>
                  <div className="text-5xl mb-4">{skill.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{skill.name}</h3>
                  <p className="text-sm text-white/90 mb-4">{skill.description}</p>
                  <button className="w-full bg-white/20 hover:bg-white/30 text-white py-2 rounded-lg font-bold text-sm">Start Learning</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interview Practice — gradient bg cards, big letter avatar */}
        <div className="bg-white rounded-xl p-8 shadow-lg border-t-4 border-[#4d4398]">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Interview Practice</h2>
              <p className="text-sm text-gray-500">Top Companies Questions</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name:'Amazon',    letter:'A', bg:'bg-orange-500', from:'from-orange-50', to:'to-orange-100', border:'border-orange-200 hover:border-orange-400', count:25 },
              { name:'Microsoft', letter:'M', bg:'bg-blue-500',   from:'from-blue-50',   to:'to-blue-100',   border:'border-blue-200 hover:border-blue-400',     count:30 },
              { name:'Google',    letter:'G', bg:'bg-red-500',    from:'from-red-50',    to:'to-red-100',    border:'border-red-200 hover:border-red-400',       count:20 },
            ].map(company => (
              <div key={company.name} onClick={() => navigate('/practice')}
                className={`bg-gradient-to-br ${company.from} ${company.to} rounded-xl p-6 border-2 ${company.border} hover:shadow-lg cursor-pointer transition-all`}>
                <div className="flex items-start mb-4">
                  <div className={`w-14 h-14 ${company.bg} rounded-lg flex items-center justify-center mr-4 shadow-md flex-shrink-0`}>
                    <span className="text-white font-bold text-2xl">{company.letter}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-600">{company.count} Questions</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">Practice real {company.name} interview questions</p>
                <button className={`w-full ${company.bg} text-white py-3 rounded-lg font-bold text-sm shadow-md`}>PRACTICE</button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Home;