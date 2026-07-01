// src/components/admin/challenges/ChallengesAdmin.jsx
import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// All admin challenge calls go to /api/admin/challenges/...
const adminFetch = async (path, options = {}) => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
  const res   = await fetch(`${API_BASE}/admin/challenges${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch {}
    throw new Error(body.error || body.message || 'Request failed');
  }
  return res.json();
};

const TOPICS       = ['HTML', 'CSS', 'JavaScript', 'Python', 'Logic'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const XP           = { easy: 10, medium: 20, hard: 30 };

const DIFF_STYLE = {
  easy:   { bg: '#dcfce7', color: '#16a34a', border: '#bbf7d0' },
  medium: { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  hard:   { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
};

const EMPTY_CHALLENGE = { title: '', description: '', topic: 'Python', difficulty: 'easy', time_limit_minutes: 5 };
const EMPTY_QUESTION  = {
  question_text: '', example_input: '', example_output: '',
  option_a: '', option_b: '', option_c: '', option_d: '',
  correct_option: 'a', explanation: '',
};

const PATTERN_QUESTIONS = [
  {
    question_text: "What is the output of the following Python code?\n\nfor i in range(1, 4):\n    print('*' * i)",
    example_input: '', example_output: '*\n**\n***',
    option_a: '*\n**\n***', option_b: '***\n**\n*', option_c: '*\n*\n*', option_d: '***\n***\n***',
    correct_option: 'a',
    explanation: "'*' * i repeats the star i times. So i=1 gives *, i=2 gives **, i=3 gives ***.",
  },
  {
    question_text: "What is the output of this code?\n\nfor i in range(3, 0, -1):\n    print('*' * i)",
    example_input: '', example_output: '***\n**\n*',
    option_a: '*\n**\n***', option_b: '***\n**\n*', option_c: '***\n***\n***', option_d: '* * *\n* *\n*',
    correct_option: 'b',
    explanation: "range(3, 0, -1) counts DOWN: 3, 2, 1. So we print ***, then **, then *.",
  },
  {
    question_text: "What does the following code print?\n\nfor i in range(1, 5):\n    print(i)",
    example_input: '', example_output: '1\n2\n3\n4',
    option_a: '1 2 3 4', option_b: '1\n2\n3\n4\n5', option_c: '1\n2\n3\n4', option_d: '0\n1\n2\n3',
    correct_option: 'c',
    explanation: "range(1, 5) generates 1, 2, 3, 4. The stop value (5) is NOT included.",
  },
  {
    question_text: "What is the output?\n\nfor i in range(1, 4):\n    print(str(i) * i)",
    example_input: '', example_output: '1\n22\n333',
    option_a: '1\n22\n333', option_b: '1\n2\n3', option_c: '111\n222\n333', option_d: '1\n4\n9',
    correct_option: 'a',
    explanation: "str(i) * i repeats the digit i times. i=1 → '1', i=2 → '22', i=3 → '333'.",
  },
  {
    question_text: "Which code correctly prints a right-angle star triangle with 4 rows?\n\n*\n**\n***\n****",
    example_input: '', example_output: '*\n**\n***\n****',
    option_a: "for i in range(4):\n    print('*' * i)",
    option_b: "for i in range(1, 5):\n    print('*' * i)",
    option_c: "for i in range(4, 0, -1):\n    print('*' * i)",
    option_d: "for i in range(1, 4):\n    print('*' * i)",
    correct_option: 'b',
    explanation: "range(1, 5) gives 1,2,3,4. Printing '*'*i gives *, **, ***, **** — exactly 4 rows.",
  },
  {
    question_text: "What does this code print?\n\nfor i in range(1, 4):\n    for j in range(i):\n        print('*', end='')\n    print()",
    example_input: '', example_output: '*\n**\n***',
    option_a: '*\n**\n***', option_b: '***\n***\n***', option_c: '* ** ***', option_d: '*\n*\n*',
    correct_option: 'a',
    explanation: "Inner loop runs j times for each row i. print() at the end adds a newline after each row.",
  },
  {
    question_text: "What is the output of this pattern code?\n\nfor i in range(1, 5):\n    print(i, end=' ')",
    example_input: '', example_output: '1 2 3 4 ',
    option_a: '1\n2\n3\n4', option_b: '1 2 3 4', option_c: '1 2 3 4 ', option_d: '1234',
    correct_option: 'b',
    explanation: "end=' ' means a space is printed instead of a newline after each number.",
  },
  {
    question_text: "What does the following code output?\n\nfor i in range(1, 4):\n    print(' ' * (3 - i) + '*' * i)",
    example_input: '', example_output: '  *\n **\n***',
    option_a: '*\n**\n***', option_b: '***\n**\n*', option_c: '  *\n **\n***', option_d: '*  \n**  \n***',
    correct_option: 'c',
    explanation: "Spaces + stars: i=1 has 2 spaces + 1 star, i=2 has 1 space + 2 stars, i=3 has 0 spaces + 3 stars.",
  },
  {
    question_text: "What is the output?\n\nn = 4\nfor i in range(1, n + 1):\n    print(i * '*', end='\\n')",
    example_input: 'n = 4', example_output: '*\n**\n***\n****',
    option_a: '*\n**\n***\n****', option_b: '****\n***\n**\n*', option_c: '* ** *** ****', option_d: '1\n2\n3\n4',
    correct_option: 'a',
    explanation: "i * '*' multiplies the string '*' by i. For n=4, prints *, **, ***, **** on separate lines.",
  },
  {
    question_text: "How many stars does this code print in total?\n\nfor i in range(1, 5):\n    print('*' * i)",
    example_input: '', example_output: '10',
    option_a: '4', option_b: '8', option_c: '10', option_d: '16',
    correct_option: 'c',
    explanation: "Stars per row: 1 + 2 + 3 + 4 = 10 total. Formula: n*(n+1)/2 = 4*5/2 = 10.",
  },
];

export default function ChallengesAdmin() {
  const [tab,            setTab]            = useState('challenges');
  const [challenges,     setChallenges]     = useState([]);
  const [analytics,      setAnalytics]      = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');
  const [success,        setSuccess]        = useState('');

  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeForm,     setChallengeForm]      = useState(EMPTY_CHALLENGE);
  const [editChallengeId,   setEditChallengeId]    = useState(null);

  const [activeChallengeId, setActiveChallengeId] = useState(null);
  const [activeChallenge,   setActiveChallenge]    = useState(null);
  const [questions,         setQuestions]          = useState([]);
  const [showQuestionForm,  setShowQuestionForm]   = useState(false);
  const [questionForm,      setQuestionForm]       = useState(EMPTY_QUESTION);
  const [editQuestionId,    setEditQuestionId]     = useState(null);

  const [filterTopic, setFilterTopic] = useState('All');
  const [filterDiff,  setFilterDiff]  = useState('All');
  const [generatingPatterns, setGeneratingPatterns] = useState(false);

  useEffect(() => {
    if (tab === 'challenges') loadChallenges();
    if (tab === 'analytics')  loadAnalytics();
  }, [tab, filterTopic, filterDiff]);

  // path is relative to /api/admin/challenges
  // e.g. loadChallenges → GET /api/admin/challenges?topic=...
  const loadChallenges = async () => {
    try {
      setLoading(true); setError('');
      const params = new URLSearchParams();
      if (filterTopic !== 'All') params.set('topic', filterTopic);
      if (filterDiff  !== 'All') params.set('difficulty', filterDiff);
      const qs = params.toString();
      const data = await adminFetch(qs ? `?${qs}` : '');
      setChallenges(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadQuestions = async (challengeId) => {
    try {
      setLoading(true); setError('');
      // GET /api/admin/challenges/:id/questions
      const data = await adminFetch(`/${challengeId}/questions`);
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true); setError('');
      // GET /api/admin/challenges/analytics
      const data = await adminFetch('/analytics');
      setAnalytics(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const generatePatternQuestions = async () => {
    if (!activeChallengeId) return;
    if (!window.confirm(`Add ${PATTERN_QUESTIONS.length} pattern questions to "${activeChallenge?.title}"?`)) return;
    setGeneratingPatterns(true); setError(''); setSuccess('');
    let added = 0;
    for (const q of PATTERN_QUESTIONS) {
      try {
        // POST /api/admin/challenges/questions
        await adminFetch('/questions', {
          method: 'POST',
          body: JSON.stringify({ ...q, challenge_id: activeChallengeId }),
        });
        added++;
      } catch (e) { console.error('Failed to add question:', e.message); }
    }
    setSuccess(`✅ Added ${added} pattern questions!`);
    loadQuestions(activeChallengeId);
    setGeneratingPatterns(false);
  };

  // ── Challenge CRUD ────────────────────────────────────────────────────────
  const handleChallengeSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      const payload = { ...challengeForm, time_limit_minutes: Number(challengeForm.time_limit_minutes) || 5 };
      if (editChallengeId) {
        // PUT /api/admin/challenges/:id
        await adminFetch(`/${editChallengeId}`, { method: 'PUT', body: JSON.stringify(payload) });
        setSuccess('Challenge updated!');
      } else {
        // POST /api/admin/challenges
        await adminFetch('', { method: 'POST', body: JSON.stringify(payload) });
        setSuccess('Challenge created!');
      }
      setShowChallengeForm(false); setEditChallengeId(null); setChallengeForm(EMPTY_CHALLENGE);
      loadChallenges();
    } catch (e) { setError(e.message); }
  };

  const handleEditChallenge = (c) => {
    setChallengeForm({ title: c.title, description: c.description, topic: c.topic, difficulty: c.difficulty, time_limit_minutes: c.time_limit_minutes || 5 });
    setEditChallengeId(c.id); setShowChallengeForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Delete this challenge?')) return;
    try {
      // DELETE /api/admin/challenges/:id
      await adminFetch(`/${id}`, { method: 'DELETE' });
      setChallenges(prev => prev.filter(c => c.id !== id));
      setSuccess('Challenge deleted.');
    } catch (e) { setError(e.message); }
  };

  const handleManageQuestions = (c) => {
    setActiveChallengeId(c.id); setActiveChallenge(c);
    setTab('questions'); loadQuestions(c.id);
  };

  // ── Question CRUD ─────────────────────────────────────────────────────────
  const handleQuestionSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      const payload = { ...questionForm, challenge_id: activeChallengeId };
      if (editQuestionId) {
        // PUT /api/admin/challenges/questions/:id
        await adminFetch(`/questions/${editQuestionId}`, { method: 'PUT', body: JSON.stringify(payload) });
        setSuccess('Question updated!');
      } else {
        // POST /api/admin/challenges/questions
        await adminFetch('/questions', { method: 'POST', body: JSON.stringify(payload) });
        setSuccess('Question added!');
      }
      setShowQuestionForm(false); setEditQuestionId(null); setQuestionForm(EMPTY_QUESTION);
      loadQuestions(activeChallengeId);
    } catch (e) { setError(e.message); }
  };

  const handleEditQuestion = (q) => {
    setQuestionForm({
      question_text: q.question_text || '', example_input: q.example_input || '',
      example_output: q.example_output || '', option_a: q.option_a || '',
      option_b: q.option_b || '', option_c: q.option_c || '', option_d: q.option_d || '',
      correct_option: q.correct_option || 'a', explanation: q.explanation || '',
    });
    setEditQuestionId(q.id); setShowQuestionForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      // DELETE /api/admin/challenges/questions/:id
      await adminFetch(`/questions/${id}`, { method: 'DELETE' });
      setQuestions(prev => prev.filter(q => q.id !== id));
      setSuccess('Question deleted.');
    } catch (e) { setError(e.message); }
  };

  return (
    <div style={{ fontFamily: 'inherit', maxWidth: 960, margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#0f172a' }}>⚡ Challenges</h1>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Manage LeetCode-style MCQ challenges for students</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid #e2e8f0', overflow: 'hidden', width: 'fit-content' }}>
        {[
          { key: 'challenges', label: '📝 Challenges' },
          { key: 'questions',  label: `❓ Questions${activeChallenge ? ` — ${activeChallenge.title}` : ''}` },
          { key: 'analytics',  label: '📊 Analytics' },
        ].map((t, i, arr) => (
          <button key={t.key} onClick={() => {
            setTab(t.key); setError(''); setSuccess('');
            if (t.key === 'challenges') { setActiveChallengeId(null); setActiveChallenge(null); }
          }} style={{
            padding: '8px 18px', borderRadius: 0, border: 'none',
            borderRight: i < arr.length - 1 ? '1px solid #e2e8f0' : 'none',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
            background: tab === t.key ? '#4d4398' : '#f8fafc',
            color:      tab === t.key ? '#fff'    : '#64748b',
          }}>{t.label}</button>
        ))}
      </div>

      {error   && <div style={s.error}>{error}</div>}
      {success && <div style={s.success}>{success}</div>}

      {/* ── CHALLENGES TAB ── */}
      {tab === 'challenges' && (
        <>
          {showChallengeForm ? (
            <form onSubmit={handleChallengeSubmit} style={s.form}>
              <h2 style={s.formTitle}>{editChallengeId ? 'Edit Challenge' : 'New Challenge'}</h2>
              <div style={s.formRow}>
                <label style={s.label}>Title</label>
                <input value={challengeForm.title} onChange={e => setChallengeForm(p => ({ ...p, title: e.target.value }))} style={s.input} required placeholder="e.g. Python Star Patterns" />
              </div>
              <div style={s.formRow}>
                <label style={s.label}>Description</label>
                <textarea value={challengeForm.description} onChange={e => setChallengeForm(p => ({ ...p, description: e.target.value }))} style={{ ...s.textarea, minHeight: 70 }} placeholder="Brief description..." />
              </div>
              <div style={s.row3}>
                <div style={s.formRow}>
                  <label style={s.label}>Topic</label>
                  <select value={challengeForm.topic} onChange={e => setChallengeForm(p => ({ ...p, topic: e.target.value }))} style={s.select}>
                    {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={s.formRow}>
                  <label style={s.label}>Difficulty</label>
                  <select value={challengeForm.difficulty} onChange={e => setChallengeForm(p => ({ ...p, difficulty: e.target.value }))} style={s.select}>
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)} (+{XP[d]} XP)</option>)}
                  </select>
                </div>
                <div style={s.formRow}>
                  <label style={s.label}>Time Limit (minutes)</label>
                  <input type="number" min="1" max="60" value={challengeForm.time_limit_minutes} onChange={e => setChallengeForm(p => ({ ...p, time_limit_minutes: e.target.value }))} style={s.input} required />
                </div>
              </div>
              <div style={s.formActions}>
                <button type="button" style={s.cancelBtn} onClick={() => { setShowChallengeForm(false); setEditChallengeId(null); setChallengeForm(EMPTY_CHALLENGE); }}>Cancel</button>
                <button type="submit" style={s.saveBtn}>{editChallengeId ? 'Update' : 'Create Challenge'}</button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} style={s.filterSelect}>
                  <option value="All">All Topics</option>
                  {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)} style={s.filterSelect}>
                  <option value="All">All Difficulties</option>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
                <span style={s.countTag}>{challenges.length} challenges</span>
              </div>
              <button style={s.addBtn} onClick={() => { setShowChallengeForm(true); setError(''); setSuccess(''); }}>+ Add Challenge</button>
            </div>
          )}

          {!showChallengeForm && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading  && <div style={s.empty}>Loading...</div>}
              {!loading && challenges.length === 0 && <div style={s.empty}>No challenges yet. Create one above.</div>}
              {!loading && challenges.map(c => {
                const ds = DIFF_STYLE[c.difficulty] || DIFF_STYLE.easy;
                return (
                  <div key={c.id} style={s.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{c.title}</h3>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', background: ds.bg, color: ds.color, border: `1px solid ${ds.border}` }}>{c.difficulty}</span>
                          <span style={{ fontSize: 11, background: '#ede9fe', color: '#4d4398', padding: '2px 8px', fontWeight: 600 }}>{c.topic}</span>
                          <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', fontWeight: 600 }}>{c.questions_count || 0} Qs</span>
                          <span style={{ fontSize: 11, background: '#fef3c7', color: '#d97706', padding: '2px 8px', fontWeight: 600 }}>+{XP[c.difficulty] || 10} XP</span>
                          <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', fontWeight: 600 }}>⏱ {c.time_limit_minutes || 5}m</span>
                        </div>
                        {c.description && <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>{c.description}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button style={s.manageBtn} onClick={() => handleManageQuestions(c)}>Questions</button>
                        <button style={s.editBtn}   onClick={() => handleEditChallenge(c)}>Edit</button>
                        <button style={s.deleteBtn} onClick={() => handleDeleteChallenge(c.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── QUESTIONS TAB ── */}
      {tab === 'questions' && (
        <>
          {!activeChallengeId ? (
            <div style={s.empty}>Select a challenge from the Challenges tab to manage its questions.</div>
          ) : showQuestionForm ? (
            <form onSubmit={handleQuestionSubmit} style={s.form}>
              <h2 style={s.formTitle}>{editQuestionId ? 'Edit Question' : 'Add Question'}</h2>
              <div style={s.formRow}>
                <label style={s.label}>Question Text</label>
                <textarea value={questionForm.question_text} onChange={e => setQuestionForm(p => ({ ...p, question_text: e.target.value }))} style={{ ...s.textarea, minHeight: 100, fontFamily: 'monospace', fontSize: 13 }} required placeholder={"What is the output?\n\nfor i in range(1, 4):\n    print('*' * i)"} />
              </div>
              <div style={s.row2}>
                <div style={s.formRow}>
                  <label style={s.label}>Example Input (optional)</label>
                  <input value={questionForm.example_input} onChange={e => setQuestionForm(p => ({ ...p, example_input: e.target.value }))} style={{ ...s.input, fontFamily: 'monospace' }} placeholder="e.g. n = 4" />
                </div>
                <div style={s.formRow}>
                  <label style={s.label}>Example Output (optional)</label>
                  <input value={questionForm.example_output} onChange={e => setQuestionForm(p => ({ ...p, example_output: e.target.value }))} style={{ ...s.input, fontFamily: 'monospace' }} placeholder={"*\n**\n***"} />
                </div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px 14px', marginBottom: -8 }}>
                <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1 }}>Answer Options</p>
                <div style={s.row2}>
                  {['a', 'b'].map(opt => (
                    <div key={opt} style={s.formRow}>
                      <label style={s.label}>Option {opt.toUpperCase()}</label>
                      <input value={questionForm[`option_${opt}`]} onChange={e => setQuestionForm(p => ({ ...p, [`option_${opt}`]: e.target.value }))} style={{ ...s.input, fontFamily: 'monospace' }} required />
                    </div>
                  ))}
                </div>
                <div style={{ ...s.row2, marginTop: 10 }}>
                  {['c', 'd'].map(opt => (
                    <div key={opt} style={s.formRow}>
                      <label style={s.label}>Option {opt.toUpperCase()}</label>
                      <input value={questionForm[`option_${opt}`]} onChange={e => setQuestionForm(p => ({ ...p, [`option_${opt}`]: e.target.value }))} style={{ ...s.input, fontFamily: 'monospace' }} required />
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ maxWidth: 220 }}>
                <div style={s.formRow}>
                  <label style={s.label}>Correct Answer</label>
                  <select value={questionForm.correct_option} onChange={e => setQuestionForm(p => ({ ...p, correct_option: e.target.value }))} style={s.select}>
                    {['a', 'b', 'c', 'd'].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div style={s.formRow}>
                <label style={s.label}>Explanation</label>
                <textarea value={questionForm.explanation} onChange={e => setQuestionForm(p => ({ ...p, explanation: e.target.value }))} style={s.textarea} placeholder="Why is this the correct answer?" />
              </div>
              <div style={s.formActions}>
                <button type="button" style={s.cancelBtn} onClick={() => { setShowQuestionForm(false); setEditQuestionId(null); setQuestionForm(EMPTY_QUESTION); }}>Cancel</button>
                <button type="submit" style={s.saveBtn}>{editQuestionId ? 'Update Question' : 'Add Question'}</button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  <strong>{questions.length}</strong> question{questions.length !== 1 ? 's' : ''} in <strong>{activeChallenge?.title}</strong>
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={generatePatternQuestions} disabled={generatingPatterns} style={{ padding: '8px 14px', border: '1px solid #c4b5fd', background: generatingPatterns ? '#f5f3ff' : '#ede9fe', color: '#4d4398', fontWeight: 700, fontSize: 13, cursor: generatingPatterns ? 'not-allowed' : 'pointer' }}>
                    {generatingPatterns ? '⏳ Adding...' : '🌟 Add Pattern Questions'}
                  </button>
                  <button style={s.addBtn} onClick={() => { setShowQuestionForm(true); setError(''); setSuccess(''); }}>+ Add Question</button>
                </div>
              </div>
              {loading ? <div style={s.empty}>Loading...</div>
                : questions.length === 0 ? <div style={s.empty}>No questions yet.</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {questions.map((q, i) => (
                      <div key={q.id} style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <pre style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.6, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {i + 1}. {q.question_text}
                            </pre>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {['a', 'b', 'c', 'd'].map(opt => (
                                <span key={opt} style={{ fontSize: 12, padding: '3px 10px', border: '1px solid', background: q.correct_option === opt ? '#dcfce7' : '#f8fafc', color: q.correct_option === opt ? '#16a34a' : '#475569', borderColor: q.correct_option === opt ? '#bbf7d0' : '#e2e8f0', fontWeight: q.correct_option === opt ? 700 : 400, fontFamily: 'monospace' }}>
                                  {opt.toUpperCase()}. {q[`option_${opt}`]}{q.correct_option === opt ? ' ✓' : ''}
                                </span>
                              ))}
                            </div>
                            {q.explanation && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#7c3aed', background: '#faf5ff', padding: '6px 10px' }}>💡 {q.explanation}</p>}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button style={s.editBtn}   onClick={() => handleEditQuestion(q)}>Edit</button>
                            <button style={s.deleteBtn} onClick={() => handleDeleteQuestion(q.id)}>Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </>
          )}
        </>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === 'analytics' && (
        <div>
          {loading    && <div style={s.empty}>Loading...</div>}
          {!analytics && !loading && <div style={s.empty}>No data yet.</div>}
          {analytics && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Challenges', value: analytics.totalChallenges || 0,   color: '#4d4398' },
                  { label: 'Total Attempts',   value: analytics.totalAttempts   || 0,   color: '#0369a1' },
                  { label: 'Completions',      value: analytics.totalCompleted  || 0,   color: '#16a34a' },
                  { label: 'XP Awarded',       value: `+${analytics.totalXP    || 0}`,  color: '#d97706' },
                ].map(s2 => (
                  <div key={s2.label} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '16px 18px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: s2.color, fontFamily: 'monospace' }}>{s2.value}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>{s2.label}</p>
                  </div>
                ))}
              </div>
              <h3 style={s.sectionTitle}>Completion by Difficulty</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                {DIFFICULTIES.map(d => {
                  const ds   = DIFF_STYLE[d];
                  const stat = analytics.byDifficulty?.[d] || { attempts: 0, completed: 0 };
                  const rate = stat.attempts > 0 ? Math.round((stat.completed / stat.attempts) * 100) : 0;
                  return (
                    <div key={d} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '16px 18px' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', background: ds.bg, color: ds.color, border: `1px solid ${ds.border}`, display: 'inline-block', marginBottom: 10 }}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </span>
                      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{rate}%</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{stat.completed} / {stat.attempts} completed</p>
                    </div>
                  );
                })}
              </div>
              <h3 style={s.sectionTitle}>Top Attempted Challenges</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(analytics.topChallenges || []).length === 0 && <div style={s.empty}>No data yet.</div>}
                {(analytics.topChallenges || []).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', minWidth: 28 }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{c.title}</span>
                    <span style={{ fontSize: 11, background: '#ede9fe', color: '#4d4398', padding: '2px 8px', fontWeight: 600 }}>{c.topic}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>{c.attempt_count} attempts</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{c.complete_count} solved</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  error:        { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '10px 14px', marginBottom: 12, fontSize: 14 },
  success:      { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '10px 14px', marginBottom: 12, fontSize: 14 },
  filterSelect: { padding: '7px 12px', border: '1px solid #e2e8f0', fontSize: 14, background: '#fff', cursor: 'pointer', borderRadius: 0 },
  countTag:     { fontSize: 13, color: '#64748b', background: '#f1f5f9', padding: '4px 10px' },
  addBtn:       { background: '#4d4398', color: '#fff', border: 'none', padding: '9px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer', borderRadius: 0 },
  manageBtn:    { padding: '5px 12px', border: '1px solid #c4b5fd', background: '#ede9fe', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#4d4398', borderRadius: 0 },
  editBtn:      { padding: '5px 12px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', borderRadius: 0 },
  deleteBtn:    { padding: '5px 12px', border: 'none', background: '#fef2f2', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#dc2626', borderRadius: 0 },
  form:         { background: '#fff', border: '1px solid #e2e8f0', padding: 24, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 },
  formTitle:    { margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#0f172a' },
  row2:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  row3:         { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 },
  formRow:      { display: 'flex', flexDirection: 'column', gap: 4 },
  label:        { fontSize: 13, fontWeight: 600, color: '#475569' },
  input:        { padding: '9px 12px', border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'inherit', borderRadius: 0 },
  textarea:     { padding: '9px 12px', border: '1px solid #e2e8f0', fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', minHeight: 60, borderRadius: 0 },
  select:       { padding: '9px 12px', border: '1px solid #e2e8f0', fontSize: 14, background: '#fff', fontFamily: 'inherit', borderRadius: 0 },
  formActions:  { display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 },
  cancelBtn:    { padding: '9px 18px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#64748b', fontFamily: 'inherit', borderRadius: 0 },
  saveBtn:      { padding: '9px 22px', border: 'none', background: '#4d4398', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', borderRadius: 0 },
  card:         { background: '#fff', border: '1px solid #e2e8f0', padding: '14px 16px' },
  empty:        { textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 },
  sectionTitle: { margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a' },
};