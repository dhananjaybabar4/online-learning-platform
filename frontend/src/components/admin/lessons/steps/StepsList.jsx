// src/components/admin/lessons/steps/StepsList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../../services/api';

const TYPE_META = {
  text:     { emoji: '📖', label: 'Reading',      bg: '#eff6ff', color: '#1d4ed8' },
  code:     { emoji: '💻', label: 'Code',         bg: '#f0fdf4', color: '#15803d' },
  quiz:     { emoji: '❓', label: 'MCQ Quiz',     bg: '#fdf4ff', color: '#7e22ce' },
  exercise: { emoji: '✏️', label: 'Fill In',      bg: '#fff7ed', color: '#c2410c' },
  video:    { emoji: '🎬', label: 'Video',        bg: '#fef2f2', color: '#be123c' },
  arrange:  { emoji: '🔀', label: 'Arrange',      bg: '#f0f9ff', color: '#0369a1' },
  match:    { emoji: '🎯', label: 'Match Pairs',  bg: '#f0fdfa', color: '#0f766e' },
  bugfix:   { emoji: '🐛', label: 'Spot the Bug', bg: '#fffbeb', color: '#b45309' },
};

const TypeBadge = ({ type }) => {
  const meta = TYPE_META[type] || { emoji: '📝', label: type || 'text', bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: meta.bg, color: meta.color,
      fontSize: 11, fontWeight: 700,
    }}>
      {meta.emoji} {meta.label}
    </span>
  );
};

// Warn if same type appears consecutive — variety tip
const VarietyWarning = ({ steps }) => {
  const consecutive = [];
  for (let i = 1; i < steps.length; i++) {
    const a = steps[i - 1].step_type || steps[i - 1].type || 'text';
    const b = steps[i].step_type     || steps[i].type     || 'text';
    if (a === b) consecutive.push(i + 1);
  }
  if (!consecutive.length) return null;
  return (
    <div style={{
      background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10,
      padding: '10px 14px', fontSize: 12, color: '#92400e', display: 'flex', gap: 8,
    }}>
      <span>⚠️</span>
      <span>
        <strong>Variety tip:</strong> Steps {consecutive.join(', ')} have the same type as the step before them.
        Mixing types keeps students more engaged — consider changing some of these.
      </span>
    </div>
  );
};

const StepsList = () => {
  const navigate = useNavigate();
  const { lessonId: urlLessonId } = useParams();
  const [lessonId, setLessonId] = useState(urlLessonId);
  const [lesson,  setLesson]  = useState(null);
  const [lessons, setLessons] = useState([]);
  const [steps,   setSteps]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (!urlLessonId) fetchFirstLesson();
    else { setLessonId(urlLessonId); fetchLessonAndSteps(urlLessonId); }
  }, [urlLessonId]);

  const fetchFirstLesson = async () => {
    try {
      const response = await api.lessons.getAll();
      if (response.success && response.data?.length > 0) {
        const sorted = response.data.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setLessons(sorted);
        const first = sorted[0];
        setLessonId(first.id);
        fetchLessonAndSteps(first.id);
      } else {
        setError('No lessons found. Please create a lesson first.');
        setLoading(false);
      }
    } catch {
      setError('Error loading lessons');
      setLoading(false);
    }
  };

  const fetchLessonAndSteps = async (id) => {
    try {
      setLoading(true);
      const [lr, sr] = await Promise.all([
        api.lessons.getById(id),
        api.lessons.getSteps(id),
      ]);
      if (lr.success) setLesson(lr.data);
      if (sr.success) {
        const sorted = (sr.data || []).sort((a, b) =>
          (a.order_number || a.order || 0) - (b.order_number || b.order || 0)
        );
        setSteps(sorted);
      }
    } catch {
      setError('Error loading steps');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (stepId) => {
    try {
      const response = await api.lessons.deleteStep(lessonId, stepId);
      if (response.success) {
        setSteps(steps.filter(s => s.id !== stepId));
        setDeleteConfirm(null);
      } else {
        alert('Failed to delete step');
      }
    } catch {
      alert('Error deleting step');
    }
  };

  // Type distribution summary
  const typeCounts = steps.reduce((acc, s) => {
    const t = s.step_type || s.type || 'text';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#4d4398] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading steps...</p>
      </div>
    </div>
  );

  if (error?.includes('No lessons found')) return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Lessons Found</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button onClick={() => navigate('/admin/lessons/create')}
          className="bg-[#4d4398] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#5a4fa8] transition-colors">
          Create Your First Lesson
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/lessons')}
          className="text-[#4d4398] hover:text-[#5a4fa8] font-medium flex items-center gap-2">
          ← Back to Lessons
        </button>
      </div>

      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            📚 {lesson?.title || 'Lesson'} &rsaquo; Steps
          </h1>
          <p className="text-gray-600 mt-1">Manage lesson steps and content</p>

          {/* Lesson selector */}
          {!urlLessonId && lessons.length > 1 && (
            <div className="mt-4 max-w-md">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Switch Lesson:</label>
              <select value={lessonId}
                onChange={e => { setLessonId(e.target.value); fetchLessonAndSteps(e.target.value); }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d4398] focus:border-[#4d4398] outline-none transition-all">
                {lessons.map(l => (
                  <option key={l.id} value={l.id}>{l.title} ({l.language}) — {l.difficulty}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button onClick={() => navigate(`/admin/lessons/${lessonId}/steps/create`)}
          className="bg-[#4d4398] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#5a4fa8] transition-colors shadow-md flex items-center gap-2">
          <span className="text-xl">+</span> ADD STEP
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Type distribution — only shown when there are steps */}
      {steps.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 18px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
            Step types in this lesson
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(typeCounts).map(([type, count]) => {
              const meta = TYPE_META[type] || { emoji: '📝', label: type, bg: '#f3f4f6', color: '#6b7280' };
              return (
                <span key={type} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: meta.bg, color: meta.color, fontSize: 12, fontWeight: 700 }}>
                  {meta.emoji} {meta.label} <span style={{ background: 'rgba(0,0,0,.1)', borderRadius: 99, padding: '1px 6px', fontSize: 10 }}>{count}</span>
                </span>
              );
            })}
            {Object.keys(typeCounts).length < 4 && (
              <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>
                💡 Add more variety — mix quiz, arrange, match, bugfix types
              </span>
            )}
          </div>
        </div>
      )}

      {/* Variety warning */}
      {steps.length > 1 && <VarietyWarning steps={steps} />}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#3e2f7f] text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold w-16">Order</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Content preview</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {steps.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <span className="text-5xl">📝</span>
                      <p className="text-lg font-semibold">No steps yet</p>
                      <p className="text-sm text-gray-400">Add your first step — try mixing reading, quiz, and code types</p>
                      <button onClick={() => navigate(`/admin/lessons/${lessonId}/steps/create`)}
                        className="mt-2 bg-[#4d4398] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-[#5a4fa8]">
                        + Add First Step
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                steps.map((step, index) => {
                  const type = step.step_type || step.type || 'text';
                  const prevType = index > 0 ? (steps[index-1].step_type || steps[index-1].type || 'text') : null;
                  const sameAsPrev = prevType && prevType === type && index > 0;

                  // Content preview depends on type
                  const getPreview = () => {
                    if (type === 'quiz' || type === 'exercise') return step.question_text || step.content;
                    if (type === 'bugfix') return step.question_text || 'Find the bug in the code';
                    if (type === 'arrange') return step.question_text || 'Drag to order';
                    if (type === 'match') return step.question_text || 'Match pairs';
                    if (type === 'video') return step.video_url || step.content;
                    return step.content;
                  };
                  const preview = getPreview();

                  return (
                    <tr key={step.id} className={`hover:bg-gray-50 transition-colors ${sameAsPrev ? 'bg-yellow-50/30' : ''}`}>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        {step.order_number || step.order || index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {step.title}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <TypeBadge type={type} />
                          {sameAsPrev && <span title="Same type as previous step" style={{ fontSize: 14 }}>⚠️</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        {preview ? (
                          <span className="truncate block">{preview.substring(0, 55)}{preview.length > 55 ? '…' : ''}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => navigate(`/admin/lessons/${lessonId}/steps/${step.id}/edit`)}
                            className="bg-[#4d4398] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#5a4fa8] transition-colors">
                            ✏️ Edit
                          </button>
                          <button onClick={() => setDeleteConfirm(step.id)}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-red-600 transition-colors">
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {steps.length > 0 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{steps.length}</span> total steps
              {steps.length >= 5 && Object.keys(typeCounts).length >= 4 && (
                <span className="ml-3 text-green-700 font-medium">✅ Good variety!</span>
              )}
            </div>
            <button onClick={() => navigate(`/admin/lessons/${lessonId}/steps/create`)}
              className="text-[#4d4398] text-sm font-semibold hover:underline">
              + Add another step
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this step? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepsList;