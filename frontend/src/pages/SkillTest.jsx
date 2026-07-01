// src/pages/SkillTest.jsx
// Adaptive skill check — questions from Groq AI, targeted to user's goal
// Falls back to local question pool if Groq fails

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TOPICS  = ['HTML', 'CSS', 'JavaScript'];
const TOPIC_Q = 4;
const Q_TIME  = 30;

// ── Local fallback question pool ──────────────────────────────────────────────
const QUESTION_POOL = {
  HTML: {
    1: [
      { q:'What does HTML stand for?', opts:['HyperText Markup Language','Home Tool Markup Language','HighText Machine Language','Hyperlink Text Mode Language'], ans:0 },
      { q:'Which tag creates a hyperlink?', opts:['<link>','<href>','<a>','<url>'], ans:2 },
      { q:'Which tag makes the LARGEST heading?', opts:['<heading>','<h6>','<head>','<h1>'], ans:3 },
      { q:'Which HTML tag embeds an image?', opts:['<picture>','<image>','<img>','<src>'], ans:2 },
      { q:'What does the <br> tag do?', opts:['Bold text','Insert line break','Add border','Create button'], ans:1 },
      { q:'Which tag defines a paragraph?', opts:['<para>','<text>','<p>','<pg>'], ans:2 },
    ],
    2: [
      { q:'Which attribute makes a form field required?', opts:['mandatory','validate','must','required'], ans:3 },
      { q:'What does the "alt" attribute on <img> do?', opts:['Sets image size','Links another page','Provides alternative text','Sets image border'], ans:2 },
      { q:'Which tag creates an HTML table row?', opts:['<td>','<th>','<tr>','<row>'], ans:2 },
      { q:'Which HTML5 element is best for navigation links?', opts:['<div>','<nav>','<menu>','<links>'], ans:1 },
      { q:'Which attribute specifies a unique identifier for an element?', opts:['class','name','key','id'], ans:3 },
    ],
    3: [
      { q:'What does the "defer" attribute on <script> do?', opts:['Loads script async immediately','Blocks HTML parsing','Delays script until DOM is ready','Removes script'], ans:2 },
      { q:'Which element represents a self-contained composition (like a blog post)?', opts:['<section>','<article>','<aside>','<main>'], ans:1 },
      { q:'What does the "disabled" attribute do on a form input?', opts:['Hides the input','Makes it read-only','Prevents interaction and excludes from submission','Locks styling'], ans:2 },
    ],
  },
  CSS: {
    1: [
      { q:'Which CSS property changes text color?', opts:['font-color','foreground','text-color','color'], ans:3 },
      { q:'Which CSS property controls space INSIDE a border?', opts:['margin','border','spacing','padding'], ans:3 },
      { q:'How do you select an element with id="title"?', opts:['title','*title','.title','#title'], ans:3 },
      { q:'Which CSS property makes text bold?', opts:['font-weight: bold','text-weight: bold','font-style: bold','bold: true'], ans:0 },
      { q:'Which value hides an element and removes its layout space?', opts:['visibility:hidden','opacity:0','hidden:true','display:none'], ans:3 },
    ],
    2: [
      { q:'Which property controls stacking order of elements?', opts:['layer','stack','z-index','order'], ans:2 },
      { q:'What does "position: absolute" position relative to?', opts:['Body element','Viewport','Previous sibling','Nearest positioned ancestor'], ans:3 },
      { q:'Which CSS value enables flex-item wrapping?', opts:['flex-flow: wrap','wrap: true','display: wrap','flex-wrap: wrap'], ans:3 },
      { q:'What does "box-sizing: border-box" do?', opts:['Adds border automatically','Removes default margin','Fixes overflow','Includes padding+border in element width'], ans:3 },
      { q:'Which unit is relative to the ROOT font size?', opts:['em','%','px','rem'], ans:3 },
    ],
    3: [
      { q:'What does "will-change: transform" do?', opts:['Animates transform','Prevents transform','Disables GPU','Promotes element to its own compositor layer'], ans:3 },
      { q:'What does the CSS :is() pseudo-class do?', opts:['Checks element existence','Applies conditional styles','Targets first match only','Matches any selector in a list, reducing specificity cost'], ans:3 },
      { q:'What is a CSS custom property declared with?', opts:['$name: value','@variable name','var:--name','--name: value'], ans:3 },
    ],
  },
  JavaScript: {
    1: [
      { q:'Which method adds an item to the END of an array?', opts:['unshift()','append()','shift()','push()'], ans:3 },
      { q:'What does typeof "hello" return?', opts:['"word"','"char"','"text"','"string"'], ans:3 },
      { q:'Which keyword declares a constant variable?', opts:['var','fixed','let','const'], ans:3 },
      { q:'What does console.log() do?', opts:['Shows a popup','Writes to a file','Prints to the browser console','Sends data to server'], ans:2 },
      { q:'Which operator checks value AND type equality?', opts:['==','equals()','is()','==='], ans:3 },
    ],
    2: [
      { q:'What is a closure in JavaScript?', opts:['A function that loops','A class with private fields','A sealed object','A function that remembers its outer scope variables'], ans:3 },
      { q:'Which array method returns a NEW array containing only matching elements?', opts:['find()','reduce()','map()','filter()'], ans:3 },
      { q:'What does async/await help you do?', opts:['Make code run faster','Create new threads','Write async code in a synchronous style','Block the main thread'], ans:2 },
      { q:'What does JSON.stringify() do?', opts:['Validates JSON','Copies an object','Parses JSON to object','Converts an object to a JSON string'], ans:3 },
      { q:'What does the spread operator (...) do?', opts:['Creates a rest parameter','Loops through an array','Expands an iterable into individual elements','Declares a function'], ans:2 },
    ],
    3: [
      { q:'What is the output of: console.log(0.1 + 0.2 === 0.3)?', opts:['undefined','true','NaN','false'], ans:3 },
      { q:'What does the "event loop" do?', opts:['Loops through DOM events','Controls CSS animations','Runs loops faster','Moves async callbacks to call stack when it is empty'], ans:3 },
      { q:'What does Promise.all() do?', opts:['Ignores rejections','Returns first resolved','Runs promises one by one','Waits for ALL promises; rejects if any one fails'], ans:3 },
    ],
  },
};

const pickQ = (topic, difficulty, usedIds) => {
  const pool = QUESTION_POOL[topic][difficulty] || QUESTION_POOL[topic][2] || QUESTION_POOL[topic][1] || [];
  const fresh = pool.filter((_, i) => !usedIds.has(`${topic}-${difficulty}-${i}`));
  if (!fresh.length) return null;
  const chosen  = fresh[Math.floor(Math.random() * fresh.length)];
  const realIdx = pool.indexOf(chosen);
  usedIds.add(`${topic}-${difficulty}-${realIdx}`);
  return { ...chosen, id:`${topic}-${difficulty}-${realIdx}`, topic, difficulty };
};

const TOPIC_COLOR = { HTML:'#e34c26', CSS:'#264de4', JavaScript:'#b45309' };
const TOPIC_BG    = { HTML:'#fff4f2', CSS:'#f0f3ff', JavaScript:'#fffef0' };
const TOPIC_ICON  = { HTML:'🌐', CSS:'🎨', JavaScript:'⚡' };
const DIFF_LABEL  = { 1:'Easy', 2:'Medium', 3:'Hard' };
const DIFF_COLOR  = { 1:'#16a34a', 2:'#d97706', 3:'#dc2626' };
const FEEDBACK_OK = ['Nice! 🎯','Correct! ✓','You got it! 💪','Spot on! 🚀'];
const FEEDBACK_NO = ['Not quite — check the answer above','Almost! Now you know for next time','Wrong, but you just learned something 📚'];

// ── Save result to localStorage ──────────────────────────────────────────────
const saveResult = (user, data) => {
  const ids  = [user?.id, user?._id, user?.email].filter(Boolean);
  const payload = JSON.stringify({ ...data, completedAt: new Date().toISOString() });
  ids.forEach(id => { try { localStorage.setItem(`atl_skill_result_${id}`, payload); } catch {} });
  try { localStorage.setItem('atl_skill_result', payload); } catch {}
};

// ── Build result object from topic scores ────────────────────────────────────
const buildResult = (topicScores, state) => {
  const topicAccuracy = {};
  TOPICS.forEach(t => {
    const s = topicScores[t] || { correct:0, total:0 };
    topicAccuracy[t] = s.total > 0 ? s.correct / s.total : 0;
  });
  const overallScore = TOPICS.reduce((sum,t) => sum + (topicScores[t]?.correct||0), 0);
  const overallTotal = TOPICS.reduce((sum,t) => sum + (topicScores[t]?.total||0), 0);
  const ratio        = overallTotal > 0 ? overallScore / overallTotal : 0;
  const level        = ratio >= 0.75 ? 'advanced' : ratio >= 0.45 ? 'intermediate' : 'beginner';
  const weakTopics   = TOPICS.filter(t => topicAccuracy[t] < 0.5);
  const strongTopics = TOPICS.filter(t => topicAccuracy[t] >= 0.75);

  return {
    level,
    levelLabel: { beginner:'Beginner', intermediate:'Intermediate', advanced:'Advanced' }[level],
    score: overallScore,
    total: overallTotal,
    topicScores,
    topicAccuracy,
    weakTopics,
    strongTopics,
    // Carry ALL onboarding context so SkillResult and roadmap generation work
    goal:      state.goal      || '',
    knowledge: state.knowledge || '',
    reason:    state.reason    || '',
    role:      state.reason    || '',
    time:      state.time      || '30min',
    roadmap: {
      title: `${level.charAt(0).toUpperCase() + level.slice(1)} Track`,
      estimatedWeeks: level === 'beginner' ? 8 : level === 'intermediate' ? 10 : 12,
      dailyTime: state.time || '30min',
      steps: {
        beginner:     ['HTML Basics','CSS Fundamentals','JavaScript Intro','Build Your First Page','Mini Project'],
        intermediate: ['JavaScript Deep Dive','React & Hooks','Node.js & APIs','Databases','Full Stack Project'],
        advanced:     ['Advanced Algorithms','System Design','TypeScript','DevOps Basics','Portfolio Project'],
      }[level],
      summary: 'Personalised path based on your adaptive skill check.',
    },
  };
};

// ── Try to fetch Groq-generated questions ────────────────────────────────────
const fetchGroqQuestions = async (state) => {
  try {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const token    = localStorage.getItem('atl_access_token') || localStorage.getItem('token') || '';
    const res = await fetch(`${API_BASE}/skilltest/generate`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
      body: JSON.stringify({
        reason:    state.reason || 'learn coding',
        goal:      state.goal   || 'web development',
        knowledge: state.knowledge || '',
        round: 1,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || !data.questions?.length) return null;
    return { questions: data.questions, sessionToken: data.sessionToken };
  } catch {
    return null;
  }
};

// ── Convert Groq question format to local format ──────────────────────────────
const convertGroqQ = (q, idx) => {
  const topicCycle = TOPICS[idx % TOPICS.length];
  const diffMap    = { beginner:1, intermediate:2, advanced:3, easy:1, medium:2, hard:3 };
  const correctLetter = (q.correct || 'A').toUpperCase();
  const correctIdx    = correctLetter.charCodeAt(0) - 65;
  return {
    q:          q.question,
    opts:       (q.options || []).map(o => o.replace(/^[A-D]\.\s*/, '')),
    ans:        Math.min(3, Math.max(0, correctIdx)),
    topic:      TOPICS.includes(q.topic) ? q.topic : topicCycle,
    difficulty: diffMap[q.difficulty?.toLowerCase()] || 2,
    id:         `groq-${idx}`,
  };
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────
const SkillTest = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const state    = location.state || {};

  const [phase,        setPhase]       = useState('intro');
  const [loadingGroq,  setLoadingGroq] = useState(false);
  const [questions,    setQuestions]   = useState([]);
  const [qIdx,         setQIdx]        = useState(0);
  const [answers,      setAnswers]     = useState([]);
  const [topicScores,  setTopicScores] = useState({ HTML:{correct:0,total:0}, CSS:{correct:0,total:0}, JavaScript:{correct:0,total:0} });
  const [timeLeft,     setTimeLeft]    = useState(Q_TIME);
  const [picked,       setPicked]      = useState(null);
  const [locked,       setLocked]      = useState(false);
  const [feedback,     setFeedback]    = useState('');

  const diffRef  = useRef({ HTML:2, CSS:2, JavaScript:2 });
  const usedIds  = useRef(new Set());
  const timerRef = useRef(null);

  // ── Build questions (Groq first, fallback to local pool) ──
  const startQuiz = useCallback(async () => {
    setLoadingGroq(true);
    setPhase('loading');

    let qs = [];

    // Try Groq
    const groqData = await fetchGroqQuestions(state);
    if (groqData?.questions?.length >= 8) {
      qs = groqData.questions.slice(0, 12).map(convertGroqQ);
    }

    // Fallback: local pool
    if (qs.length < 8) {
      const localUsed = new Set();
      const localDiff = { HTML:2, CSS:2, JavaScript:2 };
      qs = [];
      for (let i = 0; i < TOPIC_Q * TOPICS.length; i++) {
        const topic = TOPICS[i % TOPICS.length];
        const diff  = localDiff[topic];
        const q = pickQ(topic, diff, localUsed)
               || pickQ(topic, diff === 1 ? 2 : 1, localUsed)
               || pickQ(topic, 1, localUsed);
        if (q) qs.push(q);
      }
      usedIds.current = localUsed;
      diffRef.current = localDiff;
    }

    setQuestions(qs);
    setQIdx(0);
    setAnswers([]);
    setTopicScores({ HTML:{correct:0,total:0}, CSS:{correct:0,total:0}, JavaScript:{correct:0,total:0} });
    setPicked(null);
    setLocked(false);
    setFeedback('');
    setLoadingGroq(false);
    setPhase('quiz');
  }, [state]);

  // ── Timer ──
  useEffect(() => {
    if (phase !== 'quiz' || locked) return;
    setTimeLeft(Q_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleAnswer(null); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [qIdx, phase]); // eslint-disable-line

  const handleAnswer = useCallback((choiceIdx) => {
    if (locked) return;
    clearInterval(timerRef.current);
    setLocked(true);
    setPicked(choiceIdx);

    const cur     = questions[qIdx];
    if (!cur) return;
    const correct = choiceIdx === cur.ans;
    const topic   = cur.topic;

    setFeedback((correct ? FEEDBACK_OK : FEEDBACK_NO)[Math.floor(Math.random() * (correct ? FEEDBACK_OK : FEEDBACK_NO).length)]);

    setTopicScores(prev => ({
      ...prev,
      [topic]: { correct: prev[topic].correct + (correct ? 1 : 0), total: prev[topic].total + 1 },
    }));

    diffRef.current = {
      ...diffRef.current,
      [topic]: correct ? Math.min(3, diffRef.current[topic] + 1) : Math.max(1, diffRef.current[topic] - 1),
    };

    const newAnswers = [...answers, { qIdx, correct, topic, difficulty: cur.difficulty, choiceIdx }];
    setAnswers(newAnswers);

    setTimeout(() => {
      if (qIdx < questions.length - 1) {
        setQIdx(i => i + 1);
        setPicked(null);
        setLocked(false);
        setFeedback('');
      } else {
        finalize(newAnswers);
      }
    }, correct ? 900 : 1500);
  }, [locked, qIdx, questions, answers]); // eslint-disable-line

  const finalize = (finalAnswers) => {
    setPhase('evaluating');
    const ts = { HTML:{correct:0,total:0}, CSS:{correct:0,total:0}, JavaScript:{correct:0,total:0} };
    finalAnswers.forEach(a => {
      if (ts[a.topic]) { ts[a.topic].total++; if (a.correct) ts[a.topic].correct++; }
    });
    setTimeout(() => {
      saveResult(user, buildResult(ts, state));
      navigate('/skill-result', { replace: true });
    }, 1400);
  };

  const handleSkip = () => {
    saveResult(user, buildResult(
      { HTML:{correct:0,total:0}, CSS:{correct:0,total:0}, JavaScript:{correct:0,total:0} },
      state
    ));
    navigate('/dashboard', { replace: true });
  };

  // ── INTRO ──
  if (phase === 'intro') return (
    <Wrap>
      <Logo />
      <div style={{ width:'100%', maxWidth:460, marginTop:20 }}>

        {/* Profile banner */}
        {(state.goal || state.knowledge) && (
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'12px 16px', marginBottom:12, display:'flex', gap:10 }}>
            <span style={{ fontSize:20 }}>✅</span>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#15803d' }}>Your profile is ready</div>
              <div style={{ fontSize:12, color:'#166534', marginTop:3, lineHeight:1.6 }}>
                {state.goal      && <span>Goal: <strong>{state.goal}</strong> · </span>}
                {state.knowledge && <span>You know: <strong>{state.knowledge}</strong></span>}
              </div>
            </div>
          </div>
        )}

        {/* Reassurance */}
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'12px 16px', marginBottom:14, display:'flex', gap:10 }}>
          <span style={{ fontSize:20 }}>💡</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#92400e' }}>This is NOT a pass/fail test</div>
            <div style={{ fontSize:12, color:'#b45309', marginTop:3, lineHeight:1.6 }}>
              Wrong answers adjust difficulty so we find your real level. The result builds a roadmap tailored to you.
            </div>
          </div>
        </div>

        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #ede9f4', overflow:'hidden' }}>
          <div style={{ background:'#3b2d80', padding:'24px 24px 20px', textAlign:'center' }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🎯</div>
            <h2 style={{ fontSize:20, fontWeight:800, color:'#fff', margin:'0 0 6px' }}>Adaptive Skill Check</h2>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.75)', margin:0 }}>
              {TOPIC_Q * TOPICS.length} questions · HTML, CSS & JS · ~5 min
            </p>
          </div>

          <div style={{ padding:'20px 24px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
              {[
                { icon:'🔄', text:'Questions adapt as you answer — gets easier or harder' },
                { icon:'📊', text:'Per-topic scores: HTML, CSS, JavaScript' },
                { icon:'🤖', text:'Groq AI uses your scores to build a personalised roadmap' },
                { icon:'🎯', text:'Questions are tailored to your goal and background' },
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:16 }}>{item.icon}</span>
                  <span style={{ fontSize:13, color:'#4b5563' }}>{item.text}</span>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:8 }}>
              {TOPICS.map(t => (
                <div key={t} style={{ flex:1, textAlign:'center', padding:'10px 8px', background:TOPIC_BG[t], borderRadius:10, border:`1px solid ${TOPIC_COLOR[t]}22` }}>
                  <div style={{ fontSize:18 }}>{TOPIC_ICON[t]}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:TOPIC_COLOR[t], marginTop:3 }}>{t}</div>
                  <div style={{ fontSize:10, color:'#9ca3af', marginTop:1 }}>{TOPIC_Q} qs</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:'0 24px 24px' }}>
            <button onClick={startQuiz} style={{ width:'100%', background:'#3b2d80', color:'#fff', border:'none', borderRadius:10, padding:'14px', fontSize:15, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(59,45,128,.3)' }}>
              Start Skill Check →
            </button>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:12 }}>
          <button onClick={handleSkip} style={{ background:'none', border:'none', color:'#c4b5fd', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            Skip → go to dashboard
          </button>
        </div>
      </div>
    </Wrap>
  );

  // ── LOADING (fetching Groq questions) ──
  if (phase === 'loading') return (
    <Wrap>
      <Logo />
      <div style={{ textAlign:'center', marginTop:40 }}>
        <div style={{ width:56, height:56, border:'4px solid #ede9f4', borderTop:'4px solid #4d4398', borderRadius:'50%', margin:'0 auto 20px', animation:'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ fontSize:16, fontWeight:800, color:'#1a1433', margin:'0 0 6px' }}>Generating your questions…</p>
        <p style={{ fontSize:13, color:'#9ca3af' }}>Groq AI is tailoring questions to your goal</p>
      </div>
    </Wrap>
  );

  // ── EVALUATING ──
  if (phase === 'evaluating') return (
    <Wrap>
      <Logo />
      <div style={{ textAlign:'center', marginTop:40 }}>
        <div style={{ width:56, height:56, border:'4px solid #ede9f4', borderTop:'4px solid #4d4398', borderRadius:'50%', margin:'0 auto 20px', animation:'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ fontSize:18, fontWeight:800, color:'#1a1433', margin:'0 0 8px' }}>Calculating your results…</p>
        <p style={{ fontSize:13, color:'#9ca3af' }}>Groq AI is generating your personalised roadmap</p>
      </div>
    </Wrap>
  );

  // ── QUIZ ──
  const cur      = questions[qIdx];
  if (!cur) return null;

  const timerPct   = (timeLeft / Q_TIME) * 100;
  const timerColor = timeLeft > 15 ? '#4d4398' : timeLeft > 7 ? '#d97706' : '#ef4444';

  return (
    <Wrap>
      <Logo />
      <div style={{ width:'100%', maxWidth:500, marginTop:12 }}>

        {/* Topic scores bar */}
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {TOPICS.map(t => {
            const s   = topicScores[t];
            const pct = s.total > 0 ? (s.correct / s.total) * 100 : 0;
            return (
              <div key={t} style={{ flex:1, textAlign:'center', padding:'6px 4px', background:TOPIC_BG[t], borderRadius:8, border:`1px solid ${TOPIC_COLOR[t]}22` }}>
                <div style={{ fontSize:9, fontWeight:700, color:TOPIC_COLOR[t], marginBottom:3 }}>{TOPIC_ICON[t]} {t}</div>
                <div style={{ height:3, background:'#f0eeff', borderRadius:2 }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:TOPIC_COLOR[t], borderRadius:2, transition:'width .3s' }} />
                </div>
                <div style={{ fontSize:9, color:'#9ca3af', marginTop:2 }}>{s.correct}/{s.total}</div>
              </div>
            );
          })}
        </div>

        {/* Question card */}
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #ede9f4', overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,.06)' }}>
          <div style={{ padding:'14px 20px', background:TOPIC_BG[cur.topic], borderBottom:'1px solid #f0eeff', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>{TOPIC_ICON[cur.topic]}</span>
              <span style={{ fontSize:12, fontWeight:700, color:TOPIC_COLOR[cur.topic] }}>{cur.topic}</span>
              <span style={{ fontSize:10, fontWeight:700, color:DIFF_COLOR[cur.difficulty], background:`${DIFF_COLOR[cur.difficulty]}18`, padding:'2px 7px', borderRadius:4 }}>
                {DIFF_LABEL[cur.difficulty]}
              </span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:11, color:'#9ca3af', fontWeight:600 }}>Q{qIdx+1}/{questions.length}</span>
              <span style={{ fontSize:13, fontWeight:800, color:timerColor, fontFamily:'monospace', minWidth:32, textAlign:'right' }}>{timeLeft}s</span>
            </div>
          </div>

          {/* Timer bar */}
          <div style={{ height:3, background:'#f0eeff' }}>
            <div style={{ height:'100%', background:timerColor, width:`${timerPct}%`, transition:'width 1s linear, background .4s' }} />
          </div>

          {/* Question text */}
          <div style={{ padding:'18px 20px 8px' }}>
            <p style={{ fontSize:16, fontWeight:700, color:'#1a1433', lineHeight:1.65, margin:0 }}>{cur.q}</p>
          </div>

          {/* Options */}
          <div style={{ padding:'10px 20px 16px', display:'flex', flexDirection:'column', gap:8 }}>
            {cur.opts.map((opt, i) => {
              const isCorrect = locked && i === cur.ans;
              const isWrong   = locked && picked === i && i !== cur.ans;
              return (
                <button key={i} onClick={() => handleAnswer(i)} disabled={locked} style={{
                  textAlign:'left', padding:'11px 14px', borderRadius:10,
                  border:`1.5px solid ${isCorrect ? '#86efac' : isWrong ? '#fca5a5' : '#ede9f4'}`,
                  background: isCorrect ? '#f0fdf4' : isWrong ? '#fff5f5' : picked === i ? '#faf9ff' : '#fff',
                  cursor: locked ? 'default' : 'pointer',
                  display:'flex', alignItems:'center', gap:10,
                  fontSize:13, color:'#1a1433', fontFamily:'inherit',
                  transition:'border-color .12s, background .12s',
                }}>
                  <span style={{
                    width:26, height:26, borderRadius:7, flexShrink:0, fontSize:11, fontWeight:800,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background: isCorrect ? '#22c55e' : isWrong ? '#ef4444' : '#f0eeff',
                    color: (isCorrect||isWrong) ? '#fff' : '#4d4398',
                  }}>
                    {isCorrect ? '✓' : isWrong ? '✗' : String.fromCharCode(65+i)}
                  </span>
                  <span style={{ flex:1, lineHeight:1.45 }}>{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {locked && feedback && (
            <div style={{ margin:'0 20px 16px', padding:'9px 14px', borderRadius:9, background: picked === cur.ans ? '#f0fdf4' : '#fff5f5', border:`1px solid ${picked === cur.ans ? '#bbf7d0' : '#fecaca'}`, fontSize:13, fontWeight:600, color: picked === cur.ans ? '#16a34a' : '#dc2626' }}>
              {feedback}
              {picked !== cur.ans && (
                <span style={{ color:'#374151', fontWeight:400, display:'block', marginTop:3, fontSize:12 }}>
                  Correct: <strong>{cur.opts[cur.ans]}</strong>
                </span>
              )}
              <span style={{ fontSize:11, color:'#9ca3af', display:'block', marginTop:4, fontWeight:400 }}>
                {picked === cur.ans
                  ? cur.difficulty < 3 ? '↑ Next question is harder' : 'At maximum difficulty'
                  : cur.difficulty > 1 ? '↓ Next question is a bit easier' : 'Staying at easy level'
                }
              </span>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div style={{ display:'flex', gap:4, justifyContent:'center', marginTop:14 }}>
          {questions.map((_, i) => {
            const a   = answers[i];
            const cur = i === qIdx;
            return (
              <div key={i} style={{ height:5, borderRadius:99, width: cur ? 20 : 5, background: a?.correct === true ? '#22c55e' : a?.correct === false ? '#ef4444' : cur ? '#4d4398' : '#e5e0f5', transition:'all .2s' }} />
            );
          })}
        </div>

        <div style={{ textAlign:'center', marginTop:12 }}>
          <button onClick={handleSkip} style={{ background:'none', border:'none', color:'#c4b5fd', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>
            Skip → go to dashboard
          </button>
        </div>
      </div>
    </Wrap>
  );
};

const Wrap = ({ children }) => (
  <div style={{ minHeight:'100vh', background:'#f5f4fb', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
    {children}
  </div>
);

const Logo = () => (
  <div style={{ textAlign:'center', marginBottom:4 }}>
    <div style={{ fontWeight:800, fontSize:20, color:'#3b2d80', letterSpacing:1 }}>ATL</div>
    <div style={{ fontSize:8, fontWeight:700, color:'#b5b2cc', letterSpacing:3.5, marginTop:1 }}>ANYTIME LEARNING</div>
  </div>
);

export default SkillTest;