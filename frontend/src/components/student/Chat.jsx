// frontend/src/components/student/Chat.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';

const GOAL_LABELS = {
  placement: 'crack campus placements (DSA + aptitude)',
  job:       'get a frontend/fullstack developer job',
  project:   'build a real-world project',
  basics:    'learn coding from scratch',
  frontend:  'become a frontend developer',
  backend:   'become a backend developer',
  fullstack: 'become a full-stack developer',
  websites:  'build client websites',
  webapps:   'build web apps for clients',
  webapp:    'build my own web app',
  saas:      'launch a SaaS product',
  unsure:    'explore web development',
  ecommerce: 'build e-commerce stores',
  design:    'create beautiful UI/design',
  website:   'build my portfolio website',
  tool:      'build an automation tool',
};

const QUESTION_BANK = {
  html: [
    { q: 'Which tag creates a hyperlink in HTML?', options: ['<link>', '<a>', '<href>', '<url>'], correct: 1, level: 'basic' },
    { q: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Markup Language', 'Home Tool Markup Language'], correct: 0, level: 'basic' },
    { q: 'Which HTML tag displays an image?', options: ['<picture>', '<image>', '<img>', '<src>'], correct: 2, level: 'basic' },
    { q: 'Purpose of semantic HTML like article and section?', options: ['Make text bold', 'Give meaning to content structure', 'Create animations', 'Add styles'], correct: 1, level: 'intermediate' },
    { q: 'Which attribute makes a form input required?', options: ['mandatory', 'required', 'must', 'validate'], correct: 1, level: 'intermediate' },
    { q: 'What does "defer" on a script tag do?', options: ['Stops script loading', 'Loads script after HTML is parsed', 'Runs immediately', 'Delays page load'], correct: 1, level: 'advanced' },
  ],
  css: [
    { q: 'How do you select an element with class "box"?', options: ['#box', '.box', '*box', 'box'], correct: 1, level: 'basic' },
    { q: 'Which property changes text colour?', options: ['font-color', 'text-color', 'color', 'foreground'], correct: 2, level: 'basic' },
    { q: 'What does "display: flex" enable?', options: ['Block layout', 'Flexbox layout for alignment', 'Grid layout', 'Inline layout'], correct: 1, level: 'intermediate' },
    { q: 'What does "position: absolute" do?', options: ['Fixes element to viewport', 'Positions relative to nearest positioned ancestor', 'Removes element', 'Centers the element'], correct: 1, level: 'intermediate' },
    { q: 'What does "z-index" control?', options: ['Zoom level', 'Stacking order of overlapping elements', 'Element width', 'Font size'], correct: 1, level: 'advanced' },
  ],
  javascript: [
    { q: 'How do you declare a variable in modern JavaScript?', options: ['variable x = 5', 'let x = 5', 'declare x = 5', 'set x = 5'], correct: 1, level: 'basic' },
    { q: 'What does console.log() do?', options: ['Creates a log file', 'Prints output to the browser console', 'Saves data', 'Sends a message'], correct: 1, level: 'basic' },
    { q: 'What does "typeof []" return?', options: ['"array"', '"object"', '"list"', '"undefined"'], correct: 1, level: 'intermediate' },
    { q: 'What does "map()" do?', options: ['Finds map items', 'Creates new array by transforming each element', 'Filters elements', 'Sorts array'], correct: 1, level: 'intermediate' },
    { q: 'What is a Promise?', options: ['A server guarantee', 'Object representing eventual completion of async operation', 'A variable type', 'A CSS property'], correct: 1, level: 'advanced' },
  ],
  python: [
    { q: 'How do you print text in Python?', options: ['console.log("hi")', 'print("hi")', 'echo "hi"', 'display("hi")'], correct: 1, level: 'basic' },
    { q: 'Keyword to define a function in Python?', options: ['function', 'def', 'func', 'define'], correct: 1, level: 'intermediate' },
    { q: 'What does "len()" do?', options: ['Makes text longer', 'Returns length of an object', 'Converts to string', 'Counts loops'], correct: 1, level: 'advanced' },
  ],
};

// ─────────────────────────────────────────────────────────
// ROADMAP CARD
// ─────────────────────────────────────────────────────────
const RoadmapCard = ({ roadmap, onViewDashboard, onAskBot }) => {
  if (!roadmap) return null;
  const weeks = roadmap.weeks || [];
  const topicDot = {
    HTML: '#e34c26', CSS: '#264de4', JavaScript: '#f0b429',
    React: '#0891b2', 'Node.js': '#15803d', DSA: '#9333ea', Python: '#3b82f6',
  };
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginTop: 6, maxWidth: '92%' }}>
      <div style={{ background: '#3b2d80', padding: '14px 16px' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '0 0 3px' }}>Your roadmap is ready</p>
        <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0 }}>{roadmap.title}</p>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, margin: '4px 0 0' }}>
          {weeks.length} weeks · {roadmap.dailyTime || '30 min'}/day
        </p>
      </div>
      <div style={{ padding: '12px 16px' }}>
        {weeks.slice(0, 4).map((week, i) => {
          const dot = topicDot[week.focusTopic] || '#6b7280';
          const isFirst = i === 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: isFirst ? dot : '#d1d5db', border: `2px solid ${isFirst ? dot : '#d1d5db'}`, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: isFirst ? 700 : 500, color: isFirst ? '#111' : '#4b5563' }}>
                  Week {week.week} — {week.title}
                </span>
                {week.tasks?.[0] && (
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {week.tasks[0]}
                  </p>
                )}
              </div>
              {isFirst && (
                <span style={{ fontSize: 11, fontWeight: 600, color: dot, background: dot + '15', padding: '2px 8px', borderRadius: 20, flexShrink: 0 }}>
                  Start here
                </span>
              )}
            </div>
          );
        })}
        {weeks.length > 4 && (
          <p style={{ fontSize: 11, color: '#9ca3af', margin: '8px 0 0', textAlign: 'center' }}>+ {weeks.length - 4} more weeks</p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px' }}>
        <button onClick={onViewDashboard}
          style={{ flex: 1, padding: '9px 0', background: '#3b2d80', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          View full roadmap
        </button>
        <button onClick={onAskBot}
          style={{ padding: '9px 14px', background: '#fff', color: '#3b2d80', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
          Ask bot
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// MAIN CHAT
// ─────────────────────────────────────────────────────────
const Chat = ({ user, onLogout }) => {
  const navigate  = useNavigate();
  const location  = useLocation();

  const getUserKey = () => user?.id || user?.email || 'guest';

  const getExistingRoadmap = useCallback(() => {
    try {
      const raw = localStorage.getItem(`atl_ai_roadmap_${getUserKey()}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [user]);

  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [quizActive,  setQuizActive]  = useState(false);
  const [quizStage,   setQuizStage]   = useState(0);
  const [questions,   setQuestions]   = useState([]);
  const [qIndex,      setQIndex]      = useState(0);
  const [answers,     setAnswers]     = useState([]);
  const [timeLeft,    setTimeLeft]    = useState(20);
  const [timerActive, setTimerActive] = useState(false);

  const bottomRef  = useRef(null);
  const timerRef   = useRef(null);
  const askedRef   = useRef(-1);
  const inputRef   = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'roadmap' && !startedRef.current) {
      startedRef.current = true;
      setTimeout(() => startRoadmapFlow(), 100);
    }
  }, []);

  // ── Read onboarding from localStorage (saved by Onboarding.jsx) ──
  const getOnboarding = () => {
    const keys = [user?.id, user?.email, getUserKey()].filter(Boolean);
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(`atl_onboarding_${k}`);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    // Fallback to user object itself (onboarding data merged in)
    if (user?.goal) return user;
    return null;
  };

  const startRoadmapFlow = () => {
    sessionStorage.removeItem('atl_chat_session');
    setQuizActive(true);
    setQuizStage(0);
    setMessages([]);
    setAnswers([]);
    setQIndex(0);
    askedRef.current = -1;

    const ob = getOnboarding();
    const name     = user?.name || user?.firstName || user?.email?.split('@')[0] || 'there';
    const goalKey  = ob?.goal || 'basics';
    const goalText = GOAL_LABELS[goalKey] || goalKey;
    const rawLangs = ob?.languages || [];
    const topicMap = { html: 'html', css: 'css', javascript: 'javascript', python: 'python', nodejs: 'javascript', reactjs: 'javascript' };

    let topic = 'html';
    for (const l of rawLangs) {
      if (l !== 'none' && topicMap[l]) { topic = topicMap[l]; break; }
    }

    const allQs  = QUESTION_BANK[topic] || [];
    const picked = [
      ...allQs.filter(q => q.level === 'basic').slice(0, 2),
      ...allQs.filter(q => q.level === 'intermediate').slice(0, 2),
      ...allQs.filter(q => q.level === 'advanced').slice(0, 1),
    ];
    picked.forEach(q => { q._topic = topic; });
    setQuestions(picked);

    setMessages([
      { id: 'g1', role: 'assistant', content: `Hi ${name}! 👋 I'm ATL Bot.` },
      { id: 'g2', role: 'assistant', content: `Your goal is to **${goalText}**.\n\nI'll ask you **${picked.length} quick questions** on ${topic.toUpperCase()} to find your exact level.` },
      { id: 'g3', role: 'assistant', content: `Each question has **20 seconds**. Ready? 🚀`, isStartPrompt: true, _questions: picked },
    ]);
  };

  const startQuiz = (qs) => {
    setQuizStage(1);
    setQIndex(0);
    setAnswers([]);
    askedRef.current = -1;
    setTimeout(() => _askQuestion(0, qs), 300);
  };

  const _askQuestion = (idx, qs) => {
    if (idx >= qs.length || askedRef.current === idx) return;
    askedRef.current = idx;
    const q = qs[idx];
    setMessages(prev => [...prev, {
      id: `q-${idx}-${Date.now()}`, role: 'assistant',
      content: `**Question ${idx + 1} / ${qs.length}** (${q.level})\n\n${q.q}`,
      isQuestion: true, options: q.options, questionIndex: idx,
    }]);
    setQIndex(idx);
    setTimeLeft(20);
    setTimerActive(true);
  };

  useEffect(() => {
    if (!timerActive) return;
    clearInterval(timerRef.current);
    let secs = 20;
    setTimeLeft(20);
    timerRef.current = setInterval(() => {
      secs--;
      setTimeLeft(secs);
      if (secs <= 0) {
        clearInterval(timerRef.current);
        setTimerActive(false);
        setMessages(prev => [...prev, { id: `to-${Date.now()}`, role: 'assistant', content: `⏰ Time's up! Moving on…` }]);
        setAnswers(prev => {
          const updated = [...prev, { correct: false }];
          setTimeout(() => {
            setQIndex(qi => {
              const next = qi + 1;
              setQuestions(qs => {
                if (next >= qs.length) finishQuizWith(updated, qs);
                else _askQuestion(next, qs);
                return qs;
              });
              return next;
            });
          }, 900);
          return updated;
        });
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  const handleAnswer = useCallback((optIdx, currentQIndex, currentQs) => {
    if (quizStage !== 1) return;
    clearInterval(timerRef.current);
    setTimerActive(false);
    const q          = currentQs[currentQIndex];
    const isCorrect  = optIdx === q.correct;
    setMessages(prev => [
      ...prev,
      { id: `au-${currentQIndex}-${Date.now()}`, role: 'user',      content: q.options[optIdx] },
      { id: `ab-${currentQIndex}-${Date.now()}`, role: 'assistant', content: isCorrect ? `✅ Correct!` : `❌ Answer: **"${q.options[q.correct]}"**` },
    ]);
    const newAnswers = [...answers, { correct: isCorrect, level: q.level, topic: q._topic }];
    setAnswers(newAnswers);
    setTimeout(() => {
      const next = currentQIndex + 1;
      if (next >= currentQs.length) finishQuizWith(newAnswers, currentQs);
      else { _askQuestion(next, currentQs); setQIndex(next); }
    }, 1000);
  }, [quizStage, answers]);

  const finishQuizWith = async (ans, qs) => {
    setQuizStage(2);
    setTimerActive(false);
    clearInterval(timerRef.current);

    const total   = ans.length;
    const correct = ans.filter(a => a.correct).length;
    const pct     = total > 0 ? Math.round((correct / total) * 100) : 0;
    const level   = pct >= 75 ? 'advanced' : pct >= 45 ? 'intermediate' : 'beginner';
    const emoji   = pct >= 75 ? '🔥' : pct >= 45 ? '👍' : '💪';
    const topic   = qs?.[0]?._topic || 'html';
    const weeks   = level === 'beginner' ? 8 : level === 'intermediate' ? 10 : 12;

    const ob       = getOnboarding();
    const goalText = GOAL_LABELS[ob?.goal || 'basics'] || 'learn web development';
    const langs    = (ob?.languages || []).filter(l => l !== 'none').join(', ') || 'none';
    const dailyTime = ob?.time || '30min';

    setMessages(prev => [...prev, {
      id: 'score', role: 'assistant',
      content: `${emoji} **${correct}/${total}** correct (${pct}%) — **${level}** level on ${topic.toUpperCase()}.\n\nBuilding your personalised ${weeks}-week roadmap… 🤖`,
    }]);
    setLoading(true);

    try {
      const response = await api.chat.generateRoadmap([
        {
          role: 'system',
          content: `You are an expert programming tutor at ATL (Anytime Learning) for Indian BCA/engineering students. Create a precise personalised roadmap. Respond ONLY with valid JSON. No markdown, no extra text.`,
        },
        {
          role: 'user',
          content: `Generate a personalised ${weeks}-week learning roadmap.

STUDENT PROFILE (from onboarding):
- Role: ${ob?.role || 'student'}
- Goal: ${goalText}
- Daily time: ${dailyTime}
- Known languages: ${langs}

SKILL TEST RESULT:
- Level: ${level} (${correct}/${total} on ${topic.toUpperCase()} — ${pct}%)
- Weak: ${pct < 50 ? topic : 'none'} | Strong: ${pct >= 75 ? topic : 'none'}

RULES:
1. beginner (<45%) → absolute basics, lots of practice
2. intermediate (45-74%) → skip basics, real projects
3. advanced (>=75%) → advanced patterns, portfolio work
4. 3 specific tasks per week
5. Mini-project every 2 weeks
6. focusTopic: HTML | CSS | JavaScript | React | Node.js | DSA | Python

Return ONLY this JSON (no backticks):
{
  "title": "short track title",
  "summary": "1 sentence personalised to student",
  "estimatedWeeks": ${weeks},
  "dailyTime": "${dailyTime}",
  "keyInsight": "one sentence why we start here",
  "firstLesson": "exact first lesson name",
  "weeks": [{"week":1,"title":"topic","tasks":["t1","t2","t3"],"project":null,"focusTopic":"HTML"}],
  "steps": ["Week 1: label"]
}`,
        },
      ]);

      const raw   = response?.content || response?.message || response?.response || '';
      const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const rm    = JSON.parse(clean);
      localStorage.setItem(`atl_ai_roadmap_${getUserKey()}`, JSON.stringify(rm));
      setQuizStage(3);
      setLoading(false);
      setMessages(prev => [...prev, {
        id: 'rm-result', role: 'assistant',
        content: '🎉 Your roadmap is ready!',
        isRoadmapResult: true, roadmap: rm,
      }]);
    } catch (err) {
      console.error('[Roadmap error]', err);
      setLoading(false);
      setQuizStage(3);
      setMessages(prev => [...prev, {
        id: 'rm-err', role: 'assistant',
        content: 'Something went wrong generating your roadmap. Please try again! 🙏',
      }]);
    }
  };

  const switchToNormalChat = () => {
    setQuizActive(false);
    try {
      const rm = getExistingRoadmap();
      if (rm) {
        const summary = (rm.weeks || []).slice(0, 4).map(w => `  Week ${w.week}: ${w.title} (${w.focusTopic})`).join('\n');
        sessionStorage.setItem('atl_bot_roadmap_context', `STUDENT ROADMAP:\nTitle: ${rm.title}\nFirst lesson: ${rm.firstLesson}\nWeeks:\n${summary}`);
      }
    } catch {}
    setMessages([{
      id: 'bot-ready', role: 'assistant',
      content: `✅ Roadmap saved!\n\nAsk me anything — what to study next, code help, or concept explanations. 💬`,
    }]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || quizActive || loading) return;
    const userMsg = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const systemExtra = sessionStorage.getItem('atl_bot_roadmap_context') || '';
      const response    = await api.chat.sendMessage({ userId: user?.id, message: input, history: messages, systemExtra });
      if (response.success) {
        setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: response.message }]);
      } else throw new Error(response.message || 'Failed');
    } catch {
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally { setLoading(false); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('atl_chat_session');
    onLogout();
    navigate('/');
  };

  const hasRoadmap = !!getExistingRoadmap();
  const isQuizOn   = quizActive && quizStage === 1;
  const NAV_ITEMS  = ['Dashboard', 'Lessons', 'Practice', 'Chat', 'Resources'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── NAVBAR — same as Home.jsx ── */}
      <div className="bg-[#3e2f7f] shadow-md flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex flex-col leading-none">
              <span className="text-white font-extrabold text-[22px] tracking-wide">ATL</span>
              <span className="text-white text-[10px] font-medium tracking-[0.2em] opacity-85">ANYTIME LEARNING</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              {NAV_ITEMS.map(item => (
                <button key={item}
                  onClick={() => navigate(item === 'Dashboard' ? '/dashboard' : '/' + item.toLowerCase())}
                  className={`text-sm font-medium transition-colors ${item === 'Chat' ? 'text-white border-b-2 border-white pb-1' : 'text-white/70 hover:text-white'}`}>
                  {item}
                </button>
              ))}
            </div>
            <button onClick={handleLogout} className="bg-white text-[#4d4398] px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 shadow-md">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* ── CHAT WINDOW ── */}
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div style={{ width: '100%', maxWidth: 680, background: '#fff', borderRadius: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.08)', minHeight: 560 }}>

          {/* Chat header */}
          <div style={{ background: '#3b2d80', padding: '13px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>💬</div>
              <div>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>ATL Support Bot</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 1 }}>Always here to help</div>
              </div>
            </div>

            {isQuizOn && (
              <div style={{ background: timeLeft <= 7 ? '#ef4444' : 'rgba(255,255,255,0.15)', color: '#fff', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, minWidth: 60, textAlign: 'center', transition: 'background 0.3s' }}>
                ⏱ {timeLeft}s
              </div>
            )}

            {!quizActive && !hasRoadmap && (
              <button
                onClick={() => { startedRef.current = false; navigate('/chat?mode=roadmap'); }}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                📋 Create Roadmap
              </button>
            )}

            {isQuizOn && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.2)' }}>
                <div style={{ height: '100%', background: '#fff', borderRadius: 2, transition: 'width 0.3s', width: `${(qIndex / questions.length) * 100}%` }} />
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 420 }}>

            {messages.length === 0 && !quizActive && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ width: 48, height: 48, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 14px' }}>💬</div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#111', margin: '0 0 6px' }}>ATL Support Bot</p>
                <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, margin: '0 0 24px' }}>Ask me anything about coding,<br />your roadmap, or what to study next.</p>
                {!hasRoadmap && (
                  <button
                    onClick={() => { startedRef.current = false; navigate('/chat?mode=roadmap'); }}
                    style={{ background: '#3b2d80', color: '#fff', border: 'none', padding: '11px 28px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    📋 Create my roadmap
                  </button>
                )}
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id}>
                <div style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: msg.isRoadmapResult ? '95%' : '78%',
                    width: msg.isRoadmapResult ? '100%' : undefined,
                    padding: msg.isRoadmapResult ? 0 : '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                    background: msg.isRoadmapResult ? 'transparent' : msg.role === 'user' ? '#3b2d80' : '#f3f4f6',
                    color: msg.role === 'user' ? '#fff' : '#111',
                    fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.isRoadmapResult ? (
                      <RoadmapCard roadmap={msg.roadmap} onViewDashboard={() => navigate('/dashboard')} onAskBot={switchToNormalChat} />
                    ) : (
                      msg.content.split(/\*\*(.*?)\*\*/g).map((part, pi) =>
                        pi % 2 === 1 ? <strong key={pi}>{part}</strong> : part
                      )
                    )}
                  </div>
                </div>

                {msg.isStartPrompt && quizStage === 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      style={{ padding: '10px 24px', background: '#3b2d80', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                      onClick={() => startQuiz(msg._questions)}>
                      Let's go! 🚀
                    </button>
                  </div>
                )}

                {msg.isQuestion && quizStage === 1 && msg.questionIndex === qIndex && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '78%' }}>
                    {msg.options.map((opt, oi) => (
                      <button key={oi}
                        onClick={() => handleAnswer(oi, msg.questionIndex, questions)}
                        style={{ padding: '10px 13px', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'left', color: '#333', fontFamily: 'inherit', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b2d80'; e.currentTarget.style.background = '#f0eeff'; e.currentTarget.style.color = '#3b2d80'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#333'; }}>
                        {String.fromCharCode(65 + oi)}. {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#f3f4f6', padding: '10px 14px', borderRadius: '14px 14px 14px 3px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 150, 300].map(d => (
                    <div key={d} style={{ width: 6, height: 6, background: '#bbb', borderRadius: '50%', animation: 'bounce 1s infinite', animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          {!quizActive && (
            <div style={{ borderTop: '1px solid #eee', padding: '12px 16px', display: 'flex', gap: 8, flexShrink: 0 }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(e)}
                placeholder="Ask anything about your roadmap or coding…"
                disabled={loading}
                style={{ flex: 1, padding: '9px 14px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#111' }}
              />
              <button onClick={handleSend} disabled={loading || !input.trim()}
                style={{ background: '#3b2d80', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 10, cursor: loading || !input.trim() ? 'default' : 'pointer', fontWeight: 600, fontSize: 13, opacity: loading || !input.trim() ? 0.4 : 1, fontFamily: 'inherit' }}>
                Send
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
    </div>
  );
};

export default Chat;