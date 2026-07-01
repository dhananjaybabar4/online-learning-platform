// src/components/admin/quizzes/QuizzesPage.jsx
import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const adminFetch = async (path, options = {}) => {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(`${API_BASE}/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  return res.json();
};

// ─── Simple Modal Wrapper ──────────────────────────────────────
const Modal = ({ title, onClose, children, maxWidth = 'max-w-md' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
    <div className={`bg-white w-full ${maxWidth} rounded-lg shadow-lg flex flex-col max-h-[90vh]`}>
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <h2 className="font-semibold text-gray-800">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>
      {children}
    </div>
  </div>
);

// ─── Quiz Form ─────────────────────────────────────────────────
const QuizForm = ({ quiz, onSave, onClose }) => {
  const [form, setForm] = useState({
    title:         quiz?.title         || '',
    description:   quiz?.description   || '',
    difficulty:    quiz?.difficulty    || 'medium',
    time_limit:    quiz?.time_limit    || 30,
    passing_score: quiz?.passing_score || 70,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = quiz?.id
        ? await adminFetch(`/quizzes/${quiz.id}`, { method: 'PUT',  body: JSON.stringify(form) })
        : await adminFetch('/quizzes',             { method: 'POST', body: JSON.stringify(form) });
      if (res.success) onSave(res.data);
      else setError(res.message || 'Failed to save');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={quiz?.id ? 'Edit Quiz' : 'New Quiz'} onClose={onClose}>
      <div className="px-5 py-4 space-y-3 overflow-y-auto">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4d4398]"
            placeholder="e.g. JavaScript Basics"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4d4398] resize-none"
            rows={2}
            placeholder="Optional description"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select
              value={form.difficulty}
              onChange={e => set('difficulty', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4d4398]"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time (min)</label>
            <input
              type="number" min={1}
              value={form.time_limit}
              onChange={e => set('time_limit', parseInt(e.target.value) || 30)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4d4398]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pass %</label>
            <input
              type="number" min={0} max={100}
              value={form.passing_score}
              onChange={e => set('passing_score', parseInt(e.target.value) || 70)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4d4398]"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 px-5 py-4 border-t">
        <button onClick={onClose} className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 bg-[#4d4398] text-white rounded py-2 text-sm font-semibold hover:bg-[#3d3475] disabled:opacity-50"
        >
          {saving ? 'Saving...' : quiz?.id ? 'Update' : 'Create'}
        </button>
      </div>
    </Modal>
  );
};

// ─── Question Form ─────────────────────────────────────────────
const QuestionForm = ({ quizId, question, onSave, onClose }) => {
  const [form, setForm] = useState({
    question_text:  question?.question_text  || '',
    question_type:  question?.question_type  || 'multiple_choice',
    options:        question?.options?.length ? question.options : ['', '', '', ''],
    correct_answer: question?.correct_answer || '',
    points:         question?.points         || 1,
    explanation:    question?.explanation    || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const updateOpt = (i, v) => { const o = [...form.options]; o[i] = v; set('options', o); };

  const handleSubmit = async () => {
    if (!form.question_text.trim()) { setError('Question text is required'); return; }
    if (!form.correct_answer.trim()) { setError('Correct answer is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        options: form.options.filter(o => o.trim()),
        correct_answer: form.correct_answer.trim(),
      };
      const res = question?.id
        ? await adminFetch(`/quizzes/${quizId}/questions/${question.id}`, { method: 'PUT',  body: JSON.stringify(payload) })
        : await adminFetch(`/quizzes/${quizId}/questions`,                { method: 'POST', body: JSON.stringify(payload) });
      if (res.success) onSave(res.data);
      else setError(res.message || 'Failed to save');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const optionMatches = (opt) =>
    opt.trim().toLowerCase() === form.correct_answer.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">{question?.id ? 'Edit Question' : 'Add Question'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded px-3 py-2">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
            <textarea
              value={form.question_text}
              onChange={e => set('question_text', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4d4398] resize-none"
              rows={3}
              placeholder="Enter the question..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.question_type}
                onChange={e => set('question_type', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4d4398]"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
                <option value="fill_blank">Fill in Blank</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
              <input
                type="number" min={1}
                value={form.points}
                onChange={e => set('points', parseInt(e.target.value) || 1)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4d4398]"
              />
            </div>
          </div>

          {/* Multiple choice options */}
          {form.question_type === 'multiple_choice' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <input
                      value={opt}
                      onChange={e => updateOpt(i, e.target.value)}
                      className={`flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4d4398] ${
                        opt && optionMatches(opt) ? 'border-green-400 bg-green-50' : 'border-gray-300'
                      }`}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* True/False */}
          {form.question_type === 'true_false' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
              <div className="flex gap-2">
                {['True', 'False'].map(v => (
                  <button
                    key={v}
                    onClick={() => set('correct_answer', v)}
                    className={`flex-1 py-2 rounded text-sm font-semibold border transition-all ${
                      form.correct_answer === v
                        ? 'bg-[#4d4398] text-white border-[#4d4398]'
                        : 'border-gray-300 text-gray-600 hover:border-[#4d4398]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Correct answer input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correct Answer *
              {form.question_type === 'multiple_choice' && (
                <span className="font-normal text-gray-400 ml-1 text-xs">— must match an option exactly</span>
              )}
            </label>
            <input
              value={form.correct_answer}
              onChange={e => set('correct_answer', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4d4398]"
              placeholder="Type the correct answer"
            />
            {form.question_type === 'multiple_choice' && form.correct_answer && (
              <p className={`text-xs mt-1 ${
                form.options.some(o => optionMatches(o)) ? 'text-green-600' : 'text-red-500'
              }`}>
                {form.options.some(o => optionMatches(o)) ? '✓ Matches an option' : '✗ Does not match any option'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Explanation <span className="font-normal text-gray-400 text-xs">(optional)</span>
            </label>
            <textarea
              value={form.explanation}
              onChange={e => set('explanation', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4d4398] resize-none"
              rows={2}
              placeholder="Why is this the correct answer?"
            />
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 border-t">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded py-2 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-[#4d4398] text-white rounded py-2 text-sm font-semibold hover:bg-[#3d3475] disabled:opacity-50"
          >
            {saving ? 'Saving...' : question?.id ? 'Update' : 'Add Question'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Questions Panel ───────────────────────────────────────────
const QuestionsPanel = ({ quiz, onClose }) => {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editingQ,  setEditingQ]  = useState(null);

  useEffect(() => {
    adminFetch(`/quizzes/${quiz.id}/questions`)
      .then(r => setQuestions(Array.isArray(r.data) ? r.data : []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  }, [quiz.id]);

  const handleSave = (saved) => {
    setQuestions(qs => editingQ ? qs.map(q => q.id === saved.id ? saved : q) : [...qs, saved]);
    setShowForm(false);
    setEditingQ(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    await adminFetch(`/quizzes/${quiz.id}/questions/${id}`, { method: 'DELETE' });
    setQuestions(qs => qs.filter(q => q.id !== id));
  };

  const typeBadge = {
    multiple_choice: 'bg-blue-50 text-blue-600',
    true_false:      'bg-green-50 text-green-600',
    short_answer:    'bg-purple-50 text-purple-600',
    fill_blank:      'bg-yellow-50 text-yellow-600',
  };

  return (
    <>
      <Modal title={`${quiz.title} — Questions (${questions.length})`} onClose={onClose} maxWidth="max-w-2xl">
        <div className="px-5 py-3 border-b flex justify-end">
          <button
            onClick={() => { setEditingQ(null); setShowForm(true); }}
            className="bg-[#4d4398] text-white px-4 py-1.5 rounded text-sm font-semibold hover:bg-[#3d3475]"
          >
            + Add Question
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-10">Loading...</p>
          ) : questions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-sm font-medium mb-1">No questions yet</p>
              <p className="text-xs mb-4">Click "Add Question" to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#4d4398] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 mb-2">{q.question_text}</p>

                      {/* MCQ options */}
                      {q.options?.filter(Boolean).length > 0 && (
                        <div className="grid grid-cols-2 gap-1 mb-2">
                          {q.options.filter(Boolean).map((opt, oi) => (
                            <div
                              key={oi}
                              className={`text-xs px-2 py-1 rounded ${
                                opt.trim().toLowerCase() === q.correct_answer?.trim().toLowerCase()
                                  ? 'bg-green-50 text-green-700 font-semibold border border-green-200'
                                  : 'bg-gray-50 text-gray-600 border border-gray-200'
                              }`}
                            >
                              {String.fromCharCode(65 + oi)}. {opt}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Non-MCQ correct answer */}
                      {(!q.options || q.options.filter(Boolean).length === 0) && q.correct_answer && (
                        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 mb-2">
                          ✓ {q.correct_answer}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeBadge[q.question_type] || 'bg-gray-50 text-gray-500'}`}>
                          {q.question_type?.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingQ(q); setShowForm(true); }}
                        className="text-xs px-3 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="text-xs px-3 py-1 rounded border border-red-100 text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {showForm && (
        <QuestionForm
          quizId={quiz.id}
          question={editingQ}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingQ(null); }}
        />
      )}
    </>
  );
};

// ─── Main Page ─────────────────────────────────────────────────
const QuizzesPage = () => {
  const [quizzes,      setQuizzes]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [editingQuiz,  setEditingQuiz]  = useState(null);
  const [managingQuiz, setManagingQuiz] = useState(null);

  useEffect(() => {
    adminFetch('/quizzes')
      .then(r => setQuizzes(r.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = (saved) => {
    setQuizzes(qs => editingQuiz ? qs.map(q => q.id === saved.id ? saved : q) : [saved, ...qs]);
    setShowForm(false);
    setEditingQuiz(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quiz and all its questions?')) return;
    await adminFetch(`/quizzes/${id}`, { method: 'DELETE' });
    setQuizzes(qs => qs.filter(q => q.id !== id));
  };

  const diffColor = {
    easy:   'bg-green-50 text-green-600',
    medium: 'bg-yellow-50 text-yellow-600',
    hard:   'bg-red-50 text-red-600',
  };

  if (loading) return <p className="text-sm text-gray-400 text-center py-16">Loading quizzes...</p>;

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Quizzes</h1>
          <p className="text-sm text-gray-400">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}</p>
        </div>
        <button
          onClick={() => { setEditingQuiz(null); setShowForm(true); }}
          className="bg-[#4d4398] text-white px-4 py-2 rounded text-sm font-semibold hover:bg-[#3d3475]"
        >
          + New Quiz
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded px-4 py-2">{error}</p>}

      {/* Empty state */}
      {quizzes.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
          <p className="text-sm font-medium mb-1">No quizzes yet</p>
          <p className="text-xs mb-4">Create your first quiz to get started</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#4d4398] text-white px-4 py-2 rounded text-sm font-semibold hover:bg-[#3d3475]"
          >
            + New Quiz
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-800 text-sm">{quiz.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${diffColor[quiz.difficulty] || 'bg-gray-50 text-gray-500'}`}>
                    {quiz.difficulty}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {quiz.time_limit}min &middot; {quiz.passing_score}% to pass
                  {quiz.description && ` · ${quiz.description}`}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setManagingQuiz(quiz)}
                  className="text-xs px-3 py-1.5 rounded border border-[#4d4398] text-[#4d4398] font-semibold hover:bg-[#4d4398] hover:text-white transition-all"
                >
                  Questions
                </button>
                <button
                  onClick={() => { setEditingQuiz(quiz); setShowForm(true); }}
                  className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(quiz.id)}
                  className="text-xs px-3 py-1.5 rounded border border-red-100 text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <QuizForm
          quiz={editingQuiz}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingQuiz(null); }}
        />
      )}
      {managingQuiz && (
        <QuestionsPanel
          quiz={managingQuiz}
          onClose={() => setManagingQuiz(null)}
        />
      )}
    </div>
  );
};

export default QuizzesPage;
