// src/components/student/Practice.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StoryMode from './StoryMode';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const studentFetch = async (path, options = {}) => {
  const token = localStorage.getItem('atl_access_token') || localStorage.getItem('admin_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return res.json();
};

const answersMatch = (a, b) => {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
};

const DIFF_COLOR = {
  easy:   'text-green-700 bg-green-50',
  medium: 'text-yellow-700 bg-yellow-50',
  hard:   'text-red-700 bg-red-50',
};

// ─── Quiz List ─────────────────────────────────────────────────
const QuizList = ({ quizzes, onSelect }) => {
  if (quizzes.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">No quizzes available yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {quizzes.map(quiz => {
        const qCount = quiz.quiz_questions?.length || 0;
        return (
          <div
            key={quiz.id}
            className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-gray-300 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-gray-800 text-sm">{quiz.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${DIFF_COLOR[quiz.difficulty] || 'text-gray-500 bg-gray-50'}`}>
                  {quiz.difficulty}
                </span>
              </div>
              {quiz.description && (
                <p className="text-xs text-gray-400 truncate mb-1">{quiz.description}</p>
              )}
              <p className="text-xs text-gray-400">
                {quiz.time_limit || 30} min &middot; {qCount} question{qCount !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => onSelect(quiz)}
              className="ml-4 flex-shrink-0 bg-[#4d4398] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-[#3d3475] transition-colors"
            >
              Start
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ─── Quiz Screen ───────────────────────────────────────────────
const QuizScreen = ({ quiz, questions, onFinish, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState((quiz.time_limit || 30) * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); onFinish(answers); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const current  = questions[currentIndex];
  const answered = answers[current?.id] !== undefined;
  const mins     = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs     = String(timeLeft % 60).padStart(2, '0');

  const handleAnswer = (val) => setAnswers(prev => ({ ...prev, [current.id]: val }));
  const handleNext   = () => currentIndex < questions.length - 1 ? setCurrentIndex(i => i + 1) : onFinish(answers);
  const handlePrev   = () => currentIndex > 0 && setCurrentIndex(i => i - 1);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
          Exit
        </button>
        <span className="text-xs text-gray-400">{currentIndex + 1} / {questions.length}</span>
        <span className={`text-xs font-bold tabular-nums px-3 py-1.5 border rounded-lg ${timeLeft < 60 ? 'text-red-600 border-red-200 bg-red-50' : 'text-gray-600 border-gray-200 bg-gray-50'}`}>
          {mins}:{secs}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 h-1 rounded-full mb-6">
        <div className="bg-[#4d4398] h-1 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
      </div>

      {/* Question card */}
      {current && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-semibold text-gray-800 mb-4">{current.question_text}</p>

          {/* MCQ */}
          {current.question_type === 'multiple_choice' && current.options?.filter(Boolean).length > 0 && (
            <div className="space-y-2">
              {current.options.filter(Boolean).map((opt, i) => (
                <button key={i} onClick={() => handleAnswer(opt)}
                  className={`w-full text-left px-4 py-3 border rounded-lg text-sm transition-colors ${
                    answers[current.id] === opt
                      ? 'bg-[#4d4398] text-white border-[#4d4398]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#4d4398]'
                  }`}>
                  <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                </button>
              ))}
            </div>
          )}

          {/* True/False */}
          {current.question_type === 'true_false' && (
            <div className="flex gap-3">
              {['True', 'False'].map(v => (
                <button key={v} onClick={() => handleAnswer(v)}
                  className={`flex-1 py-3 border rounded-lg text-sm font-semibold transition-colors ${
                    answers[current.id] === v
                      ? 'bg-[#4d4398] text-white border-[#4d4398]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#4d4398]'
                  }`}>
                  {v}
                </button>
              ))}
            </div>
          )}

          {/* Short answer / Fill blank */}
          {(current.question_type === 'short_answer' || current.question_type === 'fill_blank') && (
            <input
              type="text"
              value={answers[current.id] || ''}
              onChange={e => handleAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#4d4398]"
            />
          )}

          <p className="text-xs text-gray-400 mt-3">{current.points || 1} pt</p>
        </div>
      )}

      {/* Nav buttons */}
      <div className="flex gap-3 mb-4">
        <button onClick={handlePrev} disabled={currentIndex === 0}
          className={`flex-1 py-2.5 border rounded-lg text-sm font-semibold ${
            currentIndex === 0 ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
          Previous
        </button>
        <button onClick={handleNext} disabled={!answered}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${
            answered ? 'bg-[#4d4398] text-white hover:bg-[#3d3475]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}>
          {currentIndex === questions.length - 1 ? 'Submit' : 'Next'}
        </button>
      </div>

      {/* Question dots */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {questions.map((q, i) => (
          <button key={i} onClick={() => setCurrentIndex(i)}
            className={`w-7 h-7 text-xs font-bold border rounded-md ${
              i === currentIndex      ? 'bg-[#4d4398] text-white border-[#4d4398]' :
              answers[q.id]           ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                        'bg-white text-gray-400 border-gray-200'
            }`}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Result Screen ─────────────────────────────────────────────
const ResultScreen = ({ quiz, questions, answers, onRetry, onBack }) => {
  const score       = questions.reduce((acc, q) => acc + (answersMatch(answers[q.id], q.correct_answer) ? (q.points || 1) : 0), 0);
  const totalPoints = questions.reduce((acc, q) => acc + (q.points || 1), 0);
  const pct         = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
  const passed      = pct >= (quiz.passing_score || 70);
  const correct     = questions.filter(q => answersMatch(answers[q.id], q.correct_answer)).length;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Score summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center mb-6">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">{quiz.title}</p>
        <p className="text-5xl font-bold text-gray-800 mb-1">{pct}%</p>
        <p className="text-sm text-gray-400 mb-4">{score} / {totalPoints} points</p>
        <div className="w-full bg-gray-100 h-1.5 rounded-full mb-5">
          <div className={`h-1.5 rounded-full ${pct >= 70 ? 'bg-green-500' : 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-center gap-8 text-sm">
          <div>
            <p className="text-xl font-bold text-gray-800">{correct}</p>
            <p className="text-xs text-gray-400">Correct</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <p className="text-xl font-bold text-gray-800">{questions.length - correct}</p>
            <p className="text-xs text-gray-400">Wrong</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${passed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {passed ? 'Passed' : 'Failed'}
            </span>
          </div>
        </div>
      </div>

      {/* Answer review */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Answer Review</p>
      <div className="space-y-2 mb-6">
        {questions.map((q, i) => {
          const userAnswer = answers[q.id] || '';
          const isCorrect  = answersMatch(userAnswer, q.correct_answer);
          return (
            <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center text-xs font-bold rounded ${isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 mb-2">{q.question_text}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="text-gray-400">Your answer:</span>
                    <span className={`px-2 py-0.5 rounded font-medium ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {userAnswer || 'No answer'}
                    </span>
                    {!isCorrect && (
                      <>
                        <span className="text-gray-400">Correct:</span>
                        <span className="px-2 py-0.5 rounded font-medium bg-green-50 text-green-700">{q.correct_answer}</span>
                      </>
                    )}
                  </div>
                  {q.explanation && <p className="text-xs text-gray-400 mt-1">{q.explanation}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}  className="flex-1 border border-gray-300 text-gray-700 py-2.5 text-sm font-semibold rounded-lg hover:bg-gray-50">Back</button>
        <button onClick={onRetry} className="flex-1 bg-[#4d4398] text-white py-2.5 text-sm font-semibold rounded-lg hover:bg-[#3d3475]">Retry</button>
      </div>
    </div>
  );
};

// ─── Main Practice ─────────────────────────────────────────────
const Practice = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [view,             setView]             = useState('menu');
  const [quizzes,          setQuizzes]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [activeQuiz,       setActiveQuiz]       = useState(null);
  const [activeQuestions,  setActiveQuestions]  = useState([]);
  const [finalAnswers,     setFinalAnswers]      = useState({});
  const [loadingQuiz,      setLoadingQuiz]      = useState(false);

  useEffect(() => {
    studentFetch('/quizzes')
      .then(r => { const raw = r.data ?? r; setQuizzes(Array.isArray(raw) ? raw : []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectQuiz = async (quiz) => {
    setLoadingQuiz(true);
    try {
      const res = await studentFetch(`/quizzes/${quiz.id}/questions`);
      const raw = res.data ?? res;
      setActiveQuiz(quiz);
      setActiveQuestions(Array.isArray(raw) ? raw : []);
      setView('quiz');
    } catch { setError('Failed to load quiz questions'); }
    finally { setLoadingQuiz(false); }
  };

  const handleFinish        = (ans) => { setFinalAnswers(ans); setView('result'); };
  const handleRetry         = () => { setFinalAnswers({}); setView('quiz'); };
  const handleBackToQuizzes = () => { setView('quizzes'); setActiveQuiz(null); setActiveQuestions([]); setFinalAnswers({}); };
  const handleBackToMenu    = () => setView('menu');

  // ── Full-screen takeovers ──────────────────────────────────
  if (view === 'story') return <StoryMode user={user} onLogout={onLogout} onBack={handleBackToMenu} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#3e2f7f]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-14">
            <div className="flex flex-col leading-none cursor-pointer" onClick={() => navigate('/dashboard')}>
              <span className="text-white font-bold text-lg tracking-wide">ATL</span>
              <span className="text-white text-[9px] tracking-widest opacity-75">ANYTIME LEARNING</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              {[
                { label: 'Dashboard', path: '/dashboard' },
                { label: 'Lessons',   path: '/lessons' },
                { label: 'Practice',  path: '/practice' },
                { label: 'Chat',      path: '/chat' },
                { label: 'Resources', path: '/resources' },
              ].map(item => (
                <button key={item.label} onClick={() => navigate(item.path)}
                  className={`text-sm font-medium ${item.label === 'Practice' ? 'text-white border-b border-white pb-0.5' : 'text-white/70 hover:text-white'}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <button onClick={onLogout} className="bg-white text-[#4d4398] px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* MENU */}
        {view === 'menu' && (
          <div>
            <h1 className="text-lg font-bold text-gray-800 mb-4">Practice</h1>
            <div className="space-y-2">
              {[
                {
                  label:    'Quizzes',
                  desc:     'Test your knowledge',
                  action:   () => setView('quizzes'),
                  external: false,
                },
                {
                  label:    'Story Mode',
                  desc:     'Type your way through the story',
                  action:   () => setView('story'),
                  external: false,
                },
                {
                  label:    'Challenges',
                  desc:     'Solve coding problems · HTML / CSS / JS / Python / Logic',
                  action:   () => navigate('/challenges'),
                  external: false,
                  badge:    '⚡',
                },
                {
                  label:    'Typing Test',
                  desc:     'Improve speed on MonkeyType',
                  action:   () => window.open('https://monkeytype.com', '_blank'),
                  external: true,
                },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3.5 hover:border-gray-300 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    {item.badge && <span className="text-lg">{item.badge}</span>}
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.external ? 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' : 'M9 5l7 7-7 7'} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* QUIZZES */}
        {view === 'quizzes' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={handleBackToMenu} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Quizzes</h1>
                <p className="text-xs text-gray-400">{quizzes.length} available</p>
              </div>
            </div>

            {loading ? (
              <p className="text-center py-12 text-sm text-gray-400">Loading...</p>
            ) : error ? (
              <p className="text-center py-12 text-sm text-red-500">{error}</p>
            ) : (
              <QuizList quizzes={quizzes} onSelect={handleSelectQuiz} />
            )}
          </>
        )}

        {/* QUIZ IN PROGRESS */}
        {(view === 'quiz' || loadingQuiz) && (
          loadingQuiz
            ? <p className="text-center py-12 text-sm text-gray-400">Loading...</p>
            : <QuizScreen quiz={activeQuiz} questions={activeQuestions} onFinish={handleFinish} onBack={handleBackToQuizzes} />
        )}

        {/* RESULT */}
        {view === 'result' && (
          <ResultScreen quiz={activeQuiz} questions={activeQuestions} answers={finalAnswers} onRetry={handleRetry} onBack={handleBackToQuizzes} />
        )}
      </div>
    </div>
  );
};

export default Practice;