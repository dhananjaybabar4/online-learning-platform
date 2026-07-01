// src/components/admin/ChallengesAdmin.jsx
// Admin panel for managing LeetCode-style MCQ challenges

import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const adminFetch = async (path, options = {}) => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
  const res   = await fetch(`${API_BASE}${path}`, {
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

const EMPTY_CHALLENGE = { title: '', description: '', topic: 'HTML', difficulty: 'easy' };
const EMPTY_QUESTION  = {
  question_text: '', example_input: '', example_output: '',
  option_a: '', option_b: '', option_c: '', option_d: '',
  correct_option: 'a', explanation: '',
};

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

  useEffect(() => {
    if (tab === 'challenges') loadChallenges();
    if (tab === 'analytics')  loadAnalytics();
  }, [tab, filterTopic, filterDiff]);

  const loadChallenges = async () => {
    try {
      setLoading(true); setError('');
      const params = new URLSearchParams();
      if (filterTopic !== 'All') params.set('topic', filterTopic);
      if (filterDiff  !== 'All') params.set('difficulty', filterDiff);
      const data = await adminFetch(`/challenges/admin?${params}`);
      setChallenges(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadQuestions = async (challengeId) => {
    try {
      setLoading(true); setError('');
      const data = await adminFetch(`/challenges/admin/${challengeId}/questions`);
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadAnalytics = async () => {
    try {
      setLoading(true); setError('');
      const data = await adminFetch('/challenges/admin/analytics');
      setAnalytics(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  // ── Challenge CRUD ────────────────────────────────────────────────────────
  const handleChallengeSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    try {
      if (editChallengeId) {
        await adminFetch(`/challenges/admin/${editChallengeId}`, { method: 'PUT', body: JSON.stringify(challengeForm) });
        setSuccess('Challenge updated!');
      } else {
        await adminFetch('/challenges/admin', { method: 'POST', body: JSON.stringify(challengeForm) });
        setSuccess('Challenge created!');
      }
      setShowChallengeForm(false); setEditChallengeId(null); setChallengeForm(EMPTY_CHALLENGE);
      loadChallenges();
    } catch (e) { setError(e.message); }
  };

  const handleEditChallenge = (c) => {
    setChallengeForm({ title: c.title, description: c.description, topic: c.topic, difficulty: c.difficulty });
    setEditChallengeId(c.id); setShowChallengeForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Delete this challenge and all its questions?')) return;
    try {
      await adminFetch(`/challenges/admin/${id}`, { method: 'DELETE' });
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
        await adminFetch(`/challenges/admin/questions/${editQuestionId}`, { method: 'PUT', body: JSON.stringify(payload) });
        setSuccess('Question updated!');
      } else {
        await adminFetch('/challenges/admin/questions', { method: 'POST', body: JSON.stringify(payload) });
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
      await adminFetch(`/challenges/admin/questions/${id}`, { method: 'DELETE' });
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { key: 'challenges', label: '📝 Challenges' },
          { key: 'questions',  label: `❓ Questions${activeChallenge ? ` — ${activeChallenge.title}` : ''}` },
          { key: 'analytics',  label: '📊 Analytics' },
        ].map(t => (
          <button key={t.key} onClick={() => {
            setTab(t.key); setError(''); setSuccess('');
            if (t.key === 'challenges') { setActiveChallengeId(null); setActiveChallenge(null); }
          }} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', fontWeight: 600,
            fontSize: 13, cursor: 'pointer',
            background: tab === t.key ? '#4d4398' : '#f1f5f9',
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
                <input value={challengeForm.title}
                  onChange={e => setChallengeForm(p => ({ ...p, title: e.target.value }))}
                  style={s.input} required placeholder="e.g. What does position: relative do?" />
              </div>

              <div style={s.formRow}>
                <label style={s.label}>Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(shown on intro screen)</span></label>
                <textarea value={challengeForm.description}
                  onChange={e => setChallengeForm(p => ({ ...p, description: e.target.value }))}
                  style={{ ...s.textarea, minHeight: 70 }}
                  placeholder="Brief description of what the student needs to know..." />
              </div>

              <div style={s.row2}>
                <div style={s.formRow}>
                  <label style={s.label}>Topic</label>
                  <select value={challengeForm.topic} onChange={e => setChallengeForm(p => ({ ...p, topic: e.target.value }))} style={s.select}>
                    {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={s.formRow}>
                  <label style={s.label}>Difficulty</label>
                  <select value={challengeForm.difficulty} onChange={e => setChallengeForm(p => ({ ...p, difficulty: e.target.value }))} style={s.select}>
                    {DIFFICULTIES.map(d => (
                      <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)} (+{XP[d]} XP)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={s.formActions}>
                <button type="button" style={s.cancelBtn} onClick={() => { setShowChallengeForm(false); setEditChallengeId(null); setChallengeForm(EMPTY_CHALLENGE); setError(''); }}>Cancel</button>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: ds.bg, color: ds.color, border: `1px solid ${ds.border}` }}>
                            {c.difficulty}
                          </span>
                          <span style={{ fontSize: 11, background: '#ede9fe', color: '#4d4398', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{c.topic}</span>
                          <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{c.questions_count || 0} Qs</span>
                          <span style={{ fontSize: 11, background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>+{XP[c.difficulty] || 10} XP</span>
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
                <textarea value={questionForm.question_text}
                  onChange={e => setQuestionForm(p => ({ ...p, question_text: e.target.value }))}
                  style={{ ...s.textarea, minHeight: 80 }} required
                  placeholder="e.g. What is the output of the following code?" />
              </div>

              <div style={s.row2}>
                <div style={s.formRow}>
                  <label style={s.label}>Example Input <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                  <input value={questionForm.example_input} onChange={e => setQuestionForm(p => ({ ...p, example_input: e.target.value }))} style={s.input} placeholder="e.g. x = [1,2,3]" />
                </div>
                <div style={s.formRow}>
                  <label style={s.label}>Example Output <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                  <input value={questionForm.example_output} onChange={e => setQuestionForm(p => ({ ...p, example_output: e.target.value }))} style={s.input} placeholder="e.g. 3" />
                </div>
              </div>

              <div style={s.row2}>
                {['a', 'b'].map(opt => (
                  <div key={opt} style={s.formRow}>
                    <label style={s.label}>Option {opt.toUpperCase()}</label>
                    <input value={questionForm[`option_${opt}`]} onChange={e => setQuestionForm(p => ({ ...p, [`option_${opt}`]: e.target.value }))} style={s.input} required placeholder={`Option ${opt.toUpperCase()}`} />
                  </div>
                ))}
              </div>
              <div style={s.row2}>
                {['c', 'd'].map(opt => (
                  <div key={opt} style={s.formRow}>
                    <label style={s.label}>Option {opt.toUpperCase()}</label>
                    <input value={questionForm[`option_${opt}`]} onChange={e => setQuestionForm(p => ({ ...p, [`option_${opt}`]: e.target.value }))} style={s.input} required placeholder={`Option ${opt.toUpperCase()}`} />
                  </div>
                ))}
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
                <label style={s.label}>Explanation <span style={{ color: '#94a3b8', fontWeight: 400 }}>(shown after wrong answer)</span></label>
                <textarea value={questionForm.explanation} onChange={e => setQuestionForm(p => ({ ...p, explanation: e.target.value }))} style={s.textarea} placeholder="Why is this the correct answer?" />
              </div>

              <div style={s.formActions}>
                <button type="button" style={s.cancelBtn} onClick={() => { setShowQuestionForm(false); setEditQuestionId(null); setQuestionForm(EMPTY_QUESTION); setError(''); }}>Cancel</button>
                <button type="submit" style={s.saveBtn}>{editQuestionId ? 'Update Question' : 'Add Question'}</button>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                  {questions.length} question{questions.length !== 1 ? 's' : ''} in <strong>{activeChallenge?.title}</strong>
                </p>
                <button style={s.addBtn} onClick={() => { setShowQuestionForm(true); setError(''); setSuccess(''); }}>+ Add Question</button>
              </div>

              {loading ? <div style={s.empty}>Loading...</div>
                : questions.length === 0 ? <div style={s.empty}>No questions yet. Add some above.</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {questions.map((q, i) => (
                      <div key={q.id} style={s.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: 1.5 }}>
                              {i + 1}. {q.question_text}
                            </p>
                            {(q.example_input || q.example_output) && (
                              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                {q.example_input && (
                                  <span style={{ fontSize: 12, background: '#f0f9ff', border: '1px solid #bae6fd', padding: '2px 10px', borderRadius: 6, color: '#0369a1' }}>
                                    Input: <code>{q.example_input}</code>
                                  </span>
                                )}
                                {q.example_output && (
                                  <span style={{ fontSize: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 10px', borderRadius: 6, color: '#15803d' }}>
                                    Output: <code>{q.example_output}</code>
                                  </span>
                                )}
                              </div>
                            )}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {['a', 'b', 'c', 'd'].map(opt => (
                                <span key={opt} style={{
                                  fontSize: 12, padding: '3px 10px', borderRadius: 20, border: '1px solid',
                                  background:   q.correct_option === opt ? '#dcfce7' : '#f8fafc',
                                  color:        q.correct_option === opt ? '#16a34a' : '#475569',
                                  borderColor:  q.correct_option === opt ? '#bbf7d0' : '#e2e8f0',
                                  fontWeight:   q.correct_option === opt ? 700 : 400,
                                }}>
                                  {opt.toUpperCase()}. {q[`option_${opt}`]}{q.correct_option === opt ? ' ✓' : ''}
                                </span>
                              ))}
                            </div>
                            {q.explanation && (
                              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#7c3aed', background: '#faf5ff', padding: '6px 10px', borderRadius: 6 }}>
                                💡 {q.explanation}
                              </p>
                            )}
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
          {loading  && <div style={s.empty}>Loading...</div>}
          {!analytics && !loading && <div style={s.empty}>No data yet.</div>}
          {analytics && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Challenges', value: analytics.totalChallenges || 0,  color: '#4d4398' },
                  { label: 'Total Attempts',   value: analytics.totalAttempts   || 0,  color: '#0369a1' },
                  { label: 'Completions',      value: analytics.totalCompleted  || 0,  color: '#16a34a' },
                  { label: 'XP Awarded',       value: `+${analytics.totalXP    || 0}`, color: '#d97706' },
                ].map(s2 => (
                  <div key={s2.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'center' }}>
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
                    <div key={d} style={{ background: '#fff', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: ds.bg, color: ds.color, border: `1px solid ${ds.border}`, display: 'inline-block', marginBottom: 10 }}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </span>
                      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>{rate}%</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{stat.completed} / {stat.attempts} completed</p>
                    </div>
                  );
                })}
              </div>

              <h3 style={s.sectionTitle}>Top Attempted Challenges</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(analytics.topChallenges || []).length === 0 && <div style={s.empty}>No data yet.</div>}
                {(analytics.topChallenges || []).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', minWidth: 28 }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{c.title}</span>
                    <span style={{ fontSize: 11, background: '#ede9fe', color: '#4d4398', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{c.topic}</span>
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
  error:       { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 14 },
  success:     { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 14 },
  filterSelect:{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, background: '#fff', cursor: 'pointer' },
  countTag:    { fontSize: 13, color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: 20 },
  addBtn:      { background: '#4d4398', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  manageBtn:   { padding: '5px 12px', borderRadius: 6, border: '1px solid #c4b5fd', background: '#ede9fe', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#4d4398' },
  editBtn:     { padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' },
  deleteBtn:   { padding: '5px 12px', borderRadius: 6, border: 'none', background: '#fef2f2', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#dc2626' },
  form:        { background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 16 },
  formTitle:   { margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: '#0f172a' },
  row2:        { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  formRow:     { display: 'flex', flexDirection: 'column', gap: 4 },
  label:       { fontSize: 13, fontWeight: 600, color: '#475569' },
  input:       { padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'inherit' },
  textarea:    { padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'inherit', minHeight: 60 },
  select:      { padding: '9px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, background: '#fff', fontFamily: 'inherit' },
  formActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 },
  cancelBtn:   { padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#64748b', fontFamily: 'inherit' },
  saveBtn:     { padding: '9px 22px', borderRadius: 8, border: 'none', background: '#4d4398', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit' },
  card:        { background: '#fff', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  empty:       { textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 14 },
  sectionTitle:{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a' },
};