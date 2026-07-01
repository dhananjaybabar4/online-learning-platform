// src/components/admin/lessons/steps/StepsEdit.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../../services/api';

const ATL = '#4d4398';

const STEP_TYPES = [
  { value: 'text',     emoji: '📖', label: 'Reading',      color: '#1d4ed8', bg: '#eff6ff',  desc: 'Short concept card. Confirm to unlock.' },
  { value: 'code',     emoji: '💻', label: 'Code',         color: '#15803d', bg: '#f0fdf4',  desc: 'Code block with type-to-unlock challenge.' },
  { value: 'quiz',     emoji: '❓', label: 'MCQ Quiz',     color: '#7e22ce', bg: '#fdf4ff',  desc: '4-choice question. Must get it right.' },
  { value: 'exercise', emoji: '✏️', label: 'Fill In',      color: '#c2410c', bg: '#fff7ed',  desc: 'Type the exact answer to continue.' },
  { value: 'video',    emoji: '🎬', label: 'Video',        color: '#be123c', bg: '#fef2f2',  desc: 'Watch then confirm.' },
  { value: 'arrange',  emoji: '🔀', label: 'Arrange',      color: '#0369a1', bg: '#f0f9ff',  desc: 'Drag items into correct order.' },
  { value: 'match',    emoji: '🎯', label: 'Match Pairs',  color: '#0f766e', bg: '#f0fdfa',  desc: 'Click term, click definition.' },
  { value: 'bugfix',   emoji: '🐛', label: 'Spot the Bug', color: '#b45309', bg: '#fffbeb',  desc: 'Click the buggy line of code.' },
];

const Field = ({ label, hint, required, children }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {hint && <span style={{ fontSize: 11, color: '#9ca3af' }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props}
    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui,sans-serif', ...(props.style || {}) }}
    onFocus={e => (e.target.style.borderColor = ATL)}
    onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
);

const Textarea = ({ rows = 5, mono, ...props }) => (
  <textarea {...props} rows={rows}
    style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 9, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: mono ? 'monospace' : 'system-ui,sans-serif', lineHeight: 1.6, ...(props.style || {}) }}
    onFocus={e => (e.target.style.borderColor = ATL)}
    onBlur={e => (e.target.style.borderColor = '#e5e7eb')} />
);

const InfoBox = ({ color = '#edeaff', textColor = ATL, children }) => (
  <div style={{ background: color, borderRadius: 9, padding: '10px 14px', fontSize: 12, color: textColor, lineHeight: 1.6 }}>
    {children}
  </div>
);

const StepsEdit = () => {
  const navigate = useNavigate();
  const { lessonId, stepId } = useParams();
  const [lesson,  setLesson]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);

  const [form, setForm] = useState({
    title: '', content: '', step_type: 'text', order_number: 1,
    video_url: '', image_url: '', question_text: '',
    code_snippet: '', expected_output: '', hints: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [lr, sr] = await Promise.all([
          api.lessons.getById(lessonId),
          api.lessons.getStepById(lessonId, stepId),
        ]);
        if (lr.success) setLesson(lr.data);
        if (sr.success && sr.data) {
          const s = sr.data;
          setForm({
            title:           s.title           || '',
            content:         s.content         || '',
            step_type:       s.step_type || s.type || 'text',
            order_number:    s.order_number || s.order || 1,
            video_url:       s.video_url        || '',
            image_url:       s.image_url        || '',
            question_text:   s.question_text    || '',
            code_snippet:    s.code_snippet     || '',
            expected_output: s.expected_output  || '',
            hints:           s.hints            || '',
          });
        } else {
          setError('Step not found');
        }
      } catch {
        setError('Error loading step');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [lessonId, stepId]);

  const set  = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const onChange = e => set(e.target.name, e.target.value);
  const t = form.step_type;
  const selectedType = STEP_TYPES.find(s => s.value === t);

  const validate = () => {
    if (!form.title.trim()) return 'Title is required';
    if (t === 'quiz'     && !form.expected_output.trim()) return 'Correct answer (A/B/C/D) is required';
    if (t === 'exercise' && !form.expected_output.trim()) return 'Correct answer is required';
    if (t === 'bugfix'   && !form.code_snippet.includes('// BUG')) return "Mark the buggy line with '// BUG'";
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    try {
      setSaving(true); setError(null);
      const res = await api.lessons.updateStep(lessonId, stepId, {
        ...form, order_number: parseInt(form.order_number) || 1,
      });
      if (res.success) navigate(`/admin/lessons/${lessonId}/steps`);
      else setError(res.message || 'Failed to update step');
    } catch {
      setError('Error updating step. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 38, height: 38, border: `4px solid ${ATL}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
        <p style={{ color: '#6b7280', margin: 0 }}>Loading step…</p>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 60px', fontFamily: 'system-ui,sans-serif' }}>
      <button onClick={() => navigate(`/admin/lessons/${lessonId}/steps`)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: ATL, fontWeight: 600, fontSize: 14, marginBottom: 16, padding: 0 }}>
        ← Back to Steps
      </button>

      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1.5px solid #e5e7eb', background: '#faf9ff' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: '#1e1b4b' }}>✏️ Edit Step</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Lesson: <strong>{lesson?.title}</strong></p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 9, padding: '10px 14px', color: '#b91c1c', fontSize: 13, fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Step type */}
          <Field label="Step type" hint="Changing type may require updating fields below">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {STEP_TYPES.map(st => (
                <button key={st.value} type="button" onClick={() => set('step_type', st.value)}
                  style={{
                    padding: '10px 6px', borderRadius: 10,
                    border: `2px solid ${form.step_type === st.value ? ATL : '#e5e7eb'}`,
                    background: form.step_type === st.value ? st.bg : '#fff',
                    cursor: 'pointer', textAlign: 'center', transition: 'all .15s',
                  }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{st.emoji}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: form.step_type === st.value ? st.color : '#374151' }}>{st.label}</div>
                </button>
              ))}
            </div>
            {selectedType && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                <strong style={{ color: selectedType.color }}>{selectedType.emoji} {selectedType.label}:</strong> {selectedType.desc}
              </p>
            )}
          </Field>

          {/* Title */}
          <Field label="Step title" required hint="Shown in sidebar steps list">
            <Input name="title" value={form.title} onChange={onChange} placeholder="Step title" />
          </Field>

          {/* Order */}
          <Field label="Order number" hint="Lower = appears earlier">
            <Input type="number" name="order_number" value={form.order_number} onChange={onChange} min="1" style={{ width: 100 }} />
          </Field>

          {/* ── TEXT ── */}
          {t === 'text' && (
            <Field label="Content" required hint="Short card — 3–5 sentences max">
              <Textarea name="content" value={form.content} onChange={onChange} rows={8} placeholder="Write the concept explanation here..." />
            </Field>
          )}

          {/* ── CODE ── */}
          {t === 'code' && (
            <>
              <Field label="Intro text" hint="1–2 sentences above the code block">
                <Textarea name="content" value={form.content} onChange={onChange} rows={2} placeholder="Every HTML page follows this structure..." />
              </Field>
              <Field label="Code snippet" required>
                <Textarea name="code_snippet" value={form.code_snippet} onChange={onChange} rows={10} mono style={{ background: '#f8f7ff' }} placeholder="// your code here" />
              </Field>
              <Field label="Expected output">
                <Textarea name="expected_output" value={form.expected_output} onChange={onChange} rows={2} mono style={{ background: '#f0fdf4' }} placeholder="Browser shows: Hello World!" />
              </Field>
              <Field label="Unlock token" hint="Word student must type to unlock continue">
                <Input name="hints" value={form.hints} onChange={onChange} placeholder="e.g. html (auto-detected if blank)" style={{ fontFamily: 'monospace' }} />
              </Field>
            </>
          )}

          {/* ── QUIZ ── */}
          {t === 'quiz' && (
            <>
              <InfoBox><strong>MCQ:</strong> Write 4 options using A) B) C) D) format. Set correct answer to just the letter.</InfoBox>
              <Field label="Question" required>
                <Input name="question_text" value={form.question_text} onChange={onChange} placeholder="What does HTML stand for?" />
              </Field>
              <Field label="Options (A B C D)" required>
                <Textarea name="content" value={form.content} onChange={onChange} rows={5} placeholder={'A) HyperText Markup Language\nB) Home Tool Markup Language\nC) HyperText Modern Language\nD) Hyperlink Text Making Language'} />
              </Field>
              <Field label="Correct answer" required hint="Just one letter: A, B, C, or D">
                <Input name="expected_output" value={form.expected_output}
                  onChange={e => set('expected_output', e.target.value.toUpperCase())}
                  placeholder="A" maxLength={1}
                  style={{ width: 80, textTransform: 'uppercase', fontWeight: 800, fontSize: 18, textAlign: 'center', background: '#f0fdf4', color: '#15803d' }} />
              </Field>
              <Field label="Hint" hint="Shown after 2 wrong attempts">
                <Input name="hints" value={form.hints} onChange={onChange} placeholder="Hint text..." />
              </Field>
            </>
          )}

          {/* ── EXERCISE ── */}
          {t === 'exercise' && (
            <>
              <InfoBox color="#fff7ed" textColor="#c2410c"><strong>Fill in:</strong> Case-insensitive match. Set exactly what student should type.</InfoBox>
              <Field label="Question" required>
                <Input name="question_text" value={form.question_text} onChange={onChange} placeholder="Question for student..." />
              </Field>
              <Field label="Context" hint="Optional extra info">
                <Textarea name="content" value={form.content} onChange={onChange} rows={3} placeholder="Additional context..." />
              </Field>
              <Field label="Correct answer" required>
                <Input name="expected_output" value={form.expected_output} onChange={onChange} placeholder="answer" style={{ fontWeight: 700, color: '#15803d', background: '#f0fdf4' }} />
              </Field>
              <Field label="Hint">
                <Input name="hints" value={form.hints} onChange={onChange} placeholder="Hint text..." />
              </Field>
            </>
          )}

          {/* ── VIDEO ── */}
          {t === 'video' && (
            <>
              <Field label="Video URL" required>
                <Input type="url" name="video_url" value={form.video_url} onChange={onChange} placeholder="https://youtube.com/watch?v=..." />
              </Field>
              <Field label="Description">
                <Textarea name="content" value={form.content} onChange={onChange} rows={3} placeholder="What students will learn..." />
              </Field>
            </>
          )}

          {/* ── ARRANGE ── */}
          {t === 'arrange' && (
            <>
              <InfoBox color="#f0f9ff" textColor="#0369a1"><strong>Arrange:</strong> One item per line. Top-to-bottom order is the correct order. Students see them shuffled.</InfoBox>
              <Field label="Question / instruction" required>
                <Input name="question_text" value={form.question_text} onChange={onChange} placeholder="Put these steps in the correct order:" />
              </Field>
              <Field label="Items in correct order" required hint="One per line">
                <Textarea name="content" value={form.content} onChange={onChange} rows={7} placeholder={"Item 1\nItem 2\nItem 3\nItem 4"} />
              </Field>
              <Field label="Hint">
                <Input name="hints" value={form.hints} onChange={onChange} placeholder="Hint text..." />
              </Field>
            </>
          )}

          {/* ── MATCH ── */}
          {t === 'match' && (
            <>
              <InfoBox color="#f0fdfa" textColor="#0f766e"><strong>Match pairs:</strong> One pair per line as: term :: definition</InfoBox>
              <Field label="Question / instruction" required>
                <Input name="question_text" value={form.question_text} onChange={onChange} placeholder="Match each term to its definition:" />
              </Field>
              <Field label="Term :: Definition pairs" required>
                <Textarea name="content" value={form.content} onChange={onChange} rows={8} placeholder={"term :: definition\nterm2 :: definition2"} />
              </Field>
              <Field label="Hint">
                <Input name="hints" value={form.hints} onChange={onChange} placeholder="Hint text..." />
              </Field>
            </>
          )}

          {/* ── BUGFIX ── */}
          {t === 'bugfix' && (
            <>
              <InfoBox color="#fffbeb" textColor="#b45309"><strong>Spot the bug:</strong> Mark the buggy line with <code>// BUG</code> at the end of that line.</InfoBox>
              <Field label="Challenge question" required>
                <Input name="question_text" value={form.question_text} onChange={onChange} placeholder="This code is broken — click the buggy line." />
              </Field>
              <Field label="Broken code" required hint="Mark buggy line with // BUG">
                <Textarea name="code_snippet" value={form.code_snippet} onChange={onChange} rows={10} mono style={{ background: '#fffbeb' }} placeholder="// your broken code here\n// mark buggy line with // BUG" />
              </Field>
              <Field label="Explanation" required hint="Shown after student finds the bug">
                <Textarea name="expected_output" value={form.expected_output} onChange={onChange} rows={3} placeholder="Explanation of what's wrong and how to fix it." style={{ background: '#f0fdf4' }} />
              </Field>
              <Field label="Hint">
                <Input name="hints" value={form.hints} onChange={onChange} placeholder="Hint text..." />
              </Field>
            </>
          )}

          {/* Image URL — all types */}
          <Field label="Image URL" hint="Optional — displayed at top of step">
            <Input name="image_url" value={form.image_url} onChange={onChange} placeholder="/assets/html-diagram.png" />
          </Field>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={() => navigate(`/admin/lessons/${lessonId}/steps`)}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              disabled={saving}>
              Cancel
            </button>
            <button type="submit"
              style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: ATL, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
              disabled={saving}>
              {saving ? 'Saving…' : '✓ Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StepsEdit;