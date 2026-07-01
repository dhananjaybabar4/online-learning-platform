// src/components/admin/lessons/steps/StepsList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../../services/api';

const TYPE_LABELS = {
  text:     'Reading',
  code:     'Code',
  quiz:     'MCQ Quiz',
  exercise: 'Fill In',
  video:    'Video',
  arrange:  'Arrange',
  match:    'Match Pairs',
  bugfix:   'Spot the Bug',
};

const TYPE_COLOR = {
  text:     { bg: '#eff6ff', color: '#1d4ed8' },
  code:     { bg: '#f0fdf4', color: '#15803d' },
  quiz:     { bg: '#fdf4ff', color: '#7e22ce' },
  exercise: { bg: '#fff7ed', color: '#c2410c' },
  video:    { bg: '#fef2f2', color: '#be123c' },
  arrange:  { bg: '#f0f9ff', color: '#0369a1' },
  match:    { bg: '#f0fdfa', color: '#0f766e' },
  bugfix:   { bg: '#fffbeb', color: '#b45309' },
};

export default function StepsList() {
  const navigate = useNavigate();
  const { lessonId: urlLessonId } = useParams();
  const [lessonId, setLessonId] = useState(urlLessonId);
  const [lesson,   setLesson]   = useState(null);
  const [lessons,  setLessons]  = useState([]);
  const [steps,    setSteps]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (!urlLessonId) fetchFirstLesson();
    else { setLessonId(urlLessonId); fetchLessonAndSteps(urlLessonId); }
  }, [urlLessonId]);

  const fetchFirstLesson = async () => {
    try {
      const res = await api.lessons.getAll();
      if (res.success && res.data?.length > 0) {
        const sorted = res.data.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setLessons(sorted);
        setLessonId(sorted[0].id);
        fetchLessonAndSteps(sorted[0].id);
      } else { setError('No lessons found.'); setLoading(false); }
    } catch { setError('Error loading lessons'); setLoading(false); }
  };

  const fetchLessonAndSteps = async (id) => {
    try {
      setLoading(true);
      const [lr, sr] = await Promise.all([api.lessons.getById(id), api.lessons.getSteps(id)]);
      if (lr.success) setLesson(lr.data);
      if (sr.success) {
        setSteps((sr.data || []).sort((a, b) => (a.order_number || a.order || 0) - (b.order_number || b.order || 0)));
      }
    } catch { setError('Error loading steps'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (stepId) => {
    try {
      const res = await api.lessons.deleteStep(lessonId, stepId);
      if (res.success) { setSteps(steps.filter(s => s.id !== stepId)); setDeleteConfirm(null); }
      else alert('Failed to delete step');
    } catch { alert('Error deleting step'); }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontFamily: 'system-ui' }}>Loading...</div>
  );

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Back */}
      <button onClick={() => navigate('/admin/lessons')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4d4398', fontWeight: 600, fontSize: 13, marginBottom: 16, padding: 0 }}>
        ← Back to Lessons
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, color: '#111827' }}>
            {lesson?.title} — Steps
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Manage lesson steps and content</p>

          {!urlLessonId && lessons.length > 1 && (
            <div style={{ marginTop: 12 }}>
              <select value={lessonId}
                onChange={e => { setLessonId(e.target.value); fetchLessonAndSteps(e.target.value); }}
                style={{ padding: '7px 10px', border: '1px solid #d1d5db', fontSize: 13, borderRadius: 0, background: '#fff' }}>
                {lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
              </select>
            </div>
          )}
        </div>

        <button onClick={() => navigate(`/admin/lessons/${lessonId}/steps/create`)}
          style={{ padding: '8px 16px', background: '#4d4398', color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', borderRadius: 0 }}>
          + Add Step
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 12px', color: '#b91c1c', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#3e2f7f' }}>
              {['Order', 'Title', 'Type', 'Content preview', 'Actions'].map((h, i) => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: i === 4 ? 'center' : 'left',
                  fontSize: 12, fontWeight: 600, color: '#fff',
                  width: i === 0 ? 60 : i === 2 ? 110 : i === 4 ? 130 : 'auto',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {steps.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  No steps yet.{' '}
                  <button onClick={() => navigate(`/admin/lessons/${lessonId}/steps/create`)}
                    style={{ background: 'none', border: 'none', color: '#4d4398', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
                    Add the first step →
                  </button>
                </td>
              </tr>
            ) : steps.map((step, i) => {
              const type    = step.step_type || step.type || 'text';
              const tc      = TYPE_COLOR[type] || { bg: '#f3f4f6', color: '#6b7280' };
              const preview = type === 'quiz' || type === 'exercise' || type === 'bugfix' || type === 'arrange' || type === 'match'
                ? step.question_text || step.content
                : type === 'video' ? step.video_url : step.content;

              return (
                <tr key={step.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>
                    {step.order_number || step.order || i + 1}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#111827', fontWeight: 500 }}>
                    {step.title}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', fontSize: 11, fontWeight: 700,
                      background: tc.bg, color: tc.color,
                    }}>
                      {TYPE_LABELS[type] || type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280', maxWidth: 260 }}>
                    {preview
                      ? <span style={{ display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {preview.substring(0, 60)}{preview.length > 60 ? '…' : ''}
                        </span>
                      : <span style={{ color: '#d1d5db' }}>—</span>
                    }
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button onClick={() => navigate(`/admin/lessons/${lessonId}/steps/${step.id}/edit`)}
                        style={{ padding: '4px 12px', background: '#4d4398', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 0 }}>
                        Edit
                      </button>
                      <button onClick={() => setDeleteConfirm(step.id)}
                        style={{ padding: '4px 12px', background: '#fee2e2', color: '#dc2626', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderRadius: 0 }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {steps.length > 0 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid #f3f4f6', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{steps.length} steps</span>
            <button onClick={() => navigate(`/admin/lessons/${lessonId}/steps/create`)}
              style={{ background: 'none', border: 'none', color: '#4d4398', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Add another step
            </button>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', padding: 24, maxWidth: 380, width: '100%', margin: '0 16px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#111827' }}>Delete step?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ padding: '7px 16px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 0 }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                style={{ padding: '7px 16px', border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 0 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}