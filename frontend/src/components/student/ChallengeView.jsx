// src/components/student/ChallengeView.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const DIFF = {
  easy:   { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Easy'   },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Medium' },
  hard:   { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Hard'   },
};
const XP = { easy: 10, medium: 20, hard: 30 };
const PASS_THRESHOLD = 0.6; // 60% to pass

// ── Timer Hook ───────────────────────────────────────────────────────────────
function useTimer(initSec, onExpire) {
  const [sec, setSec] = useState(initSec);
  const iv   = useRef(null);
  const done = useRef(false);

  const start = useCallback(() => {
    if (iv.current) return;
    iv.current = setInterval(() => {
      setSec(s => {
        if (s <= 1) {
          clearInterval(iv.current); iv.current = null;
          if (!done.current) { done.current = true; onExpire(); }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [onExpire]);

  const stop  = useCallback(() => { clearInterval(iv.current); iv.current = null; }, []);
  const reset = useCallback((n) => { stop(); done.current = false; setSec(n); }, [stop]);
  useEffect(() => () => clearInterval(iv.current), []);

  const mins   = String(Math.floor(sec / 60)).padStart(2, '0');
  const secs   = String(sec % 60).padStart(2, '0');
  const pct    = initSec > 0 ? Math.round((sec / initSec) * 100) : 0;
  const urgent = sec <= 20 && sec > 0;
  return { sec, mins, secs, pct, urgent, start, stop, reset };
}

// ── NavBar ───────────────────────────────────────────────────────────────────
function NavBar({ onLogout, navigate }) {
  return (
    <div className="bg-[#3e2f7f] shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
        <div className="flex flex-col leading-none">
          <span className="text-white font-extrabold text-[22px] tracking-wide">ATL</span>
          <span className="text-white text-[10px] font-medium tracking-[0.2em] opacity-85">ANYTIME LEARNING</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {['Dashboard', 'Lessons', 'Practice', 'Chat', 'Resources'].map(item => (
            <button key={item}
              onClick={() => navigate(item === 'Dashboard' ? '/dashboard' : `/${item.toLowerCase()}`)}
              className="text-white text-sm font-medium hover:text-gray-200">{item}</button>
          ))}
        </div>
        <button onClick={() => { onLogout?.(); navigate('/login'); }}
          className="bg-white text-[#4d4398] px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-100">
          Logout
        </button>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ChallengeView({ user, onLogout }) {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [challenge,  setChallenge]  = useState(null);
  const [questions,  setQuestions]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [phase,      setPhase]      = useState('intro');   // intro | solving | result

  // Solving state
  const [qIndex,     setQIndex]     = useState(0);
  const [answers,    setAnswers]    = useState({});        // { [qId]: 'a'|'b'|'c'|'d' }
  const [submitted,  setSubmitted]  = useState(false);     // current Q submitted?
  const [score,      setScore]      = useState(null);      // { correct, total } after finish

  const timeLimitSec = challenge ? Math.floor((challenge.time_limit_minutes || 5) * 60) : 300;

  const onExpire = useCallback(() => { finishChallenge(true); }, []);
  const timer = useTimer(timeLimitSec, onExpire);

  // ── Fetch challenge + questions ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('atl_access_token') || localStorage.getItem('admin_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // Fetch challenge metadata (use admin route as fallback for student view)
        const cRes  = await fetch(`${API_BASE_URL}/challenges/student`, { headers });
        const cData = await cRes.json();
        const found = (cData.challenges || []).find(c => String(c.id) === String(id));
        if (found) setChallenge(found);

        // Fetch questions
        const qRes  = await fetch(`${API_BASE_URL}/challenges/student/${id}/questions`, { headers });
        const qData = await qRes.json();
        setQuestions(qData.questions || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  // ── Start ────────────────────────────────────────────────────────────────
  const startChallenge = () => {
    setQIndex(0);
    setAnswers({});
    setSubmitted(false);
    setScore(null);
    setPhase('solving');
    timer.reset(timeLimitSec);
    setTimeout(() => timer.start(), 50);
  };

  // ── Per-question submit ──────────────────────────────────────────────────
  const submitAnswer = () => {
    setSubmitted(true);
  };

  // ── Next question ────────────────────────────────────────────────────────
  const nextQuestion = () => {
    if (qIndex < questions.length - 1) {
      setQIndex(q => q + 1);
      setSubmitted(false);
    } else {
      finishChallenge(false);
    }
  };

  // ── Finish ───────────────────────────────────────────────────────────────
  const finishChallenge = useCallback(async (timedOut = false) => {
    timer.stop();
    const correct = questions.filter(q => answers[q.id] === q.correct_option).length;
    const total   = questions.length;
    setScore({ correct, total, timedOut });
    setPhase('result');

    // Award XP if passed
    if (!timedOut && correct / total >= PASS_THRESHOLD) {
      try {
        const token = localStorage.getItem('atl_access_token') || localStorage.getItem('admin_token');
        await fetch(`${API_BASE_URL}/challenges/student/${id}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ xpEarned: XP[challenge?.difficulty] || 10 }),
        });
      } catch {}
    }
  }, [timer, questions, answers, id, challenge]);

  // ── Render helpers ───────────────────────────────────────────────────────
  const currentQ = questions[qIndex];
  const diff     = DIFF[challenge?.difficulty] || DIFF.medium;
  const picked   = answers[currentQ?.id];
  const isCorrect = picked === currentQ?.correct_option;

  const OPTS = ['a', 'b', 'c', 'd'];

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4d4398]" />
    </div>
  );

  if (!loading && questions.length === 0) return (
    <div className="min-h-screen bg-gray-50">
      <NavBar onLogout={onLogout} navigate={navigate} />
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-5xl">🔧</p>
        <p className="text-lg font-semibold text-gray-700">No questions added yet</p>
        <button onClick={() => navigate('/challenges')}
          className="px-5 py-2 bg-[#4d4398] text-white rounded-xl text-sm font-semibold">← Back</button>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // INTRO
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'intro') return (
    <div className="min-h-screen bg-gray-50">
      <NavBar onLogout={onLogout} navigate={navigate} />
      <div className="max-w-xl mx-auto px-4 py-10">
        <button onClick={() => navigate('/challenges')}
          className="text-gray-400 hover:text-gray-700 mb-6 text-sm flex items-center gap-1.5">
          ← Back to Challenges
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#3e2f7f] to-[#5e4fa0] px-6 py-6">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-black text-white leading-tight">
                {challenge?.title || 'Challenge'}
              </h1>
              <span className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${diff.bg} ${diff.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                {diff.label}
              </span>
            </div>
            {challenge?.description && (
              <p className="text-white/75 text-sm mt-2 leading-relaxed">{challenge.description}</p>
            )}
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '❓', label: 'Questions', value: questions.length },
                { icon: '⏱', label: 'Time Limit', value: `${challenge?.time_limit_minutes || 5}m` },
                { icon: '⭐', label: 'XP Reward', value: `+${XP[challenge?.difficulty] || 10}` },
              ].map(s => (
                <div key={s.label} className="text-center bg-gray-50 rounded-xl py-3">
                  <p className="text-lg">{s.icon}</p>
                  <p className="text-lg font-black text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Topic */}
            {challenge?.topic && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Topic</span>
                <span className="px-2.5 py-0.5 bg-[#ede9fe] text-[#4d4398] rounded-full text-xs font-semibold capitalize">
                  {challenge.topic}
                </span>
              </div>
            )}

            {/* Rules */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
              <p className="font-bold mb-1">📋 Rules</p>
              <p>• Answer all {questions.length} questions before time runs out</p>
              <p>• Score ≥ 60% to earn XP</p>
              <p>• After each answer you'll see if you were right</p>
              <p>• You can retry anytime</p>
            </div>

            <button onClick={startChallenge}
              className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white rounded-xl font-black text-base shadow-lg shadow-orange-200 transition-all">
              🚀 Start Challenge
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SOLVING
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'solving' && currentQ) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar onLogout={onLogout} navigate={navigate} />

      {/* Timer bar */}
      <div className={`sticky top-0 z-40 transition-colors ${timer.urgent ? 'bg-red-600' : 'bg-[#3e2f7f]'}`}>
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {questions.map((q, i) => (
              <div key={q.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < qIndex           ? 'bg-green-400'
                  : i === qIndex       ? 'bg-white scale-125'
                  : 'bg-white/30'
                }`}
              />
            ))}
            <span className="text-white/60 text-xs ml-2 font-medium">
              {qIndex + 1}/{questions.length}
            </span>
          </div>

          <span className={`font-mono text-lg font-black text-white ${timer.urgent ? 'animate-pulse' : ''}`}>
            ⏱ {timer.mins}:{timer.secs}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-white/20">
          <div className={`h-full transition-all duration-1000 ${timer.urgent ? 'bg-yellow-300' : 'bg-white/60'}`}
            style={{ width: `${timer.pct}%` }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 w-full space-y-4">

        {/* Question card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${diff.bg} ${diff.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
              {diff.label}
            </span>
            <span className="text-xs text-gray-400 font-medium">Question {qIndex + 1} of {questions.length}</span>
          </div>

          {/* Question text */}
          <p className="text-gray-800 font-semibold text-base leading-relaxed whitespace-pre-line mb-4">
            {currentQ.question_text}
          </p>

          {/* Example input/output */}
          {(currentQ.example_input || currentQ.example_output) && (
            <div className="flex gap-3 mb-4 flex-wrap">
              {currentQ.example_input && (
                <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Input</p>
                  <code className="text-sm text-gray-700 font-mono">{currentQ.example_input}</code>
                </div>
              )}
              {currentQ.example_output && (
                <div className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Output</p>
                  <code className="text-sm text-gray-700 font-mono">{currentQ.example_output}</code>
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className="space-y-2">
            {OPTS.map(opt => {
              const optText = currentQ[`option_${opt}`];
              if (!optText) return null;

              const isPicked  = picked === opt;
              const isRight   = opt === currentQ.correct_option;

              let classes = 'border-gray-100 hover:border-[#4d4398]/30 bg-white';
              if (submitted) {
                if (isRight)               classes = 'border-green-400 bg-green-50';
                else if (isPicked && !isRight) classes = 'border-red-400 bg-red-50';
                else                       classes = 'border-gray-100 bg-white opacity-60';
              } else if (isPicked) {
                classes = 'border-[#4d4398] bg-[#4d4398]/5';
              }

              return (
                <button key={opt}
                  disabled={submitted}
                  onClick={() => setAnswers(a => ({ ...a, [currentQ.id]: opt }))}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${classes}`}>
                  <span className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black ${
                    submitted && isRight              ? 'bg-green-500 text-white'
                    : submitted && isPicked && !isRight ? 'bg-red-500 text-white'
                    : isPicked                        ? 'bg-[#4d4398] text-white'
                    : 'bg-gray-100 text-gray-500'
                  }`}>
                    {submitted && isRight ? '✓' : submitted && isPicked && !isRight ? '✗' : opt.toUpperCase()}
                  </span>
                  <span className={`text-sm font-medium ${
                    submitted && isRight    ? 'text-green-700'
                    : submitted && isPicked ? 'text-red-700'
                    : isPicked              ? 'text-[#4d4398]'
                    : 'text-gray-700'
                  }`}>{optText}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {submitted && currentQ.explanation && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-xl">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">💡 Explanation</p>
              <p className="text-sm text-purple-700">{currentQ.explanation}</p>
            </div>
          )}
        </div>

        {/* Action button */}
        {!submitted ? (
          <button
            onClick={submitAnswer}
            disabled={!picked}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] text-white rounded-xl font-black text-base shadow-lg shadow-orange-200 transition-all">
            ✅ Submit Answer
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className={`w-full py-4 rounded-xl font-black text-base text-white shadow-md active:scale-[0.99] transition-all ${
              isCorrect ? 'bg-green-500 hover:bg-green-600' : 'bg-[#4d4398] hover:bg-[#3e2f7f]'
            }`}>
            {qIndex < questions.length - 1
              ? isCorrect ? '🎉 Next Question →' : '→ Next Question'
              : '🏁 Finish Challenge'
            }
          </button>
        )}
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RESULT
  // ══════════════════════════════════════════════════════════════════════════
  if (phase === 'result' && score !== null) {
    const pct     = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    const passed  = !score.timedOut && pct >= 60;
    const xpEarned = passed ? (XP[challenge?.difficulty] || 10) : 0;

    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar onLogout={onLogout} navigate={navigate} />
        <div className="max-w-md mx-auto px-4 py-12">
          <div className={`rounded-3xl border-2 shadow-xl overflow-hidden ${passed ? 'border-green-300' : 'border-red-300'}`}>
            {/* Result header */}
            <div className={`px-8 py-10 flex flex-col items-center text-center ${
              passed
                ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                : score.timedOut
                  ? 'bg-gradient-to-br from-orange-500 to-red-500'
                  : 'bg-gradient-to-br from-red-500 to-rose-600'
            }`}>
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-5xl mb-4">
                {passed ? '🏆' : score.timedOut ? '⏰' : '😓'}
              </div>
              <h1 className="text-3xl font-black text-white mb-1">
                {passed ? 'Challenge Passed!' : score.timedOut ? "Time's Up!" : 'Try Again'}
              </h1>
              <p className="text-white/80 text-sm">
                {passed
                  ? `You scored ${pct}% — great work!`
                  : score.timedOut
                    ? 'You ran out of time.'
                    : `You scored ${pct}%. Need 60% to pass.`}
              </p>
            </div>

            <div className="bg-white px-8 py-6">
              {/* Score breakdown */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="text-center bg-gray-50 rounded-xl py-3">
                  <p className="text-2xl font-black text-gray-800">{score.correct}/{score.total}</p>
                  <p className="text-xs text-gray-400">Correct</p>
                </div>
                <div className="text-center bg-gray-50 rounded-xl py-3">
                  <p className={`text-2xl font-black ${pct >= 60 ? 'text-green-600' : 'text-red-500'}`}>{pct}%</p>
                  <p className="text-xs text-gray-400">Score</p>
                </div>
                <div className="text-center bg-gray-50 rounded-xl py-3">
                  <p className={`text-2xl font-black ${passed ? 'text-yellow-500' : 'text-gray-400'}`}>
                    {passed ? `+${xpEarned}` : '—'}
                  </p>
                  <p className="text-xs text-gray-400">XP</p>
                </div>
              </div>

              {/* Per-question review */}
              {questions.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Review</p>
                  <div className="space-y-1.5">
                    {questions.map((q, i) => {
                      const given   = answers[q.id];
                      const correct = given === q.correct_option;
                      return (
                        <div key={q.id}
                          className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-sm ${
                            correct ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
                          }`}>
                          <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black mt-0.5 ${
                            correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                          }`}>{correct ? '✓' : '✗'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-700 font-medium leading-snug line-clamp-1">
                              Q{i + 1}. {q.question_text}
                            </p>
                            {!correct && (
                              <p className="text-xs text-green-700 mt-0.5">
                                Correct: <span className="font-bold">{q.correct_option?.toUpperCase()}. {q[`option_${q.correct_option}`]}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button onClick={startChallenge}
                  className={`w-full py-3.5 rounded-xl font-black text-base text-white shadow-md transition-all active:scale-[0.99] ${
                    passed ? 'bg-[#4d4398] hover:bg-[#3e2f7f]' : 'bg-orange-500 hover:bg-orange-600'
                  }`}>
                  {passed ? '🔁 Practice Again' : '🔄 Retry'}
                </button>
                <button onClick={() => navigate('/challenges')}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50">
                  ← All Challenges
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}