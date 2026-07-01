// src/components/admin/lessons/steps/StepsCreate.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../../services/api';

const STEP_TYPES = [
  { value: 'text',     label: 'Reading',      desc: 'Short concept card.' },
  { value: 'code',     label: 'Code',         desc: 'Show code + expected output.' },
  { value: 'quiz',     label: 'MCQ Quiz',     desc: '4-choice question.' },
  { value: 'exercise', label: 'Fill In',      desc: 'Student types the exact answer.' },
  { value: 'video',    label: 'Video',        desc: 'YouTube or video link.' },
  { value: 'arrange',  label: 'Arrange',      desc: 'Student drags items into order.' },
  { value: 'match',    label: 'Match Pairs',  desc: 'Click a term then its definition.' },
  { value: 'bugfix',   label: 'Spot the Bug', desc: 'Student clicks the buggy line.' },
];

const inp = {
  width: '100%', padding: '8px 10px', border: '1px solid #d1d5db',
  fontSize: 14, outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit', borderRadius: 0, background: '#fff',
};

const label = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 };
const hint  = { fontSize: 11, color: '#9ca3af', fontWeight: 400, marginLeft: 6 };
const row   = { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 };

export default function StepsCreate() {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [lesson,  setLesson]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const [form, setForm] = useState({
    title: '', content: '', step_type: 'text',
    order_number: 1, video_url: '', image_url: '',
    code_snippet: '', expected_output: '', hints: '', question_text: '',
  });

  useEffect(() => {
    api.lessons.getById(lessonId).then(r => r.success && setLesson(r.data)).catch(() => {});
  }, [lessonId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const onChange = e => set(e.target.name, e.target.value);
  const t = form.step_type;

  const validate = () => {
    if (!form.title.trim()) return 'Title is required';
    if (t === 'quiz') {
      if (!form.question_text.trim()) return 'Question is required';
      if (!form.expected_output.trim()) return 'Correct answer (A/B/C/D) is required';
    }
    if (t === 'exercise') {
      if (!form.question_text.trim()) return 'Question is required';
      if (!form.expected_output.trim()) return 'Correct answer is required';
    }
    if (t === 'video' && !form.video_url.trim()) return 'Video URL is required';
    if (t === 'arrange' && !form.content.trim()) return 'Items list is required';
    if (t === 'match' && !form.content.trim()) return 'Term :: definition pairs are required';
    if (t === 'bugfix') {
      if (!form.code_snippet.trim()) return 'Code is required';
      if (!form.code_snippet.includes('// BUG')) return "Mark the buggy line with '// BUG'";
      if (!form.expected_output.trim()) return 'Explanation is required';
    }
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    try {
      setLoading(true); setError(null);
      const res = await api.lessons.createStep(lessonId, {
        ...form, order_number: parseInt(form.order_number) || 1,
      });
      if (res.success) navigate(`/admin/lessons/${lessonId}/steps`);
      else setError(res.message || 'Failed to create step');
    } catch { setError('Error creating step.'); }
    finally { setLoading(false); }
  };

  const selectedType = STEP_TYPES.find(s => s.value === t);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px', fontFamily: 'system-ui, sans-serif' }}>

      <button onClick={() => navigate(`/admin/lessons/${lessonId}/steps`)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4d4398', fontWeight: 600, fontSize: 13, marginBottom: 14, padding: 0 }}>
        ← Back to Steps
      </button>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
            {lesson?.title}
          </p>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Add Step</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 12px', color: '#b91c1c', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Step type dropdown */}
          <div style={row}>
            <label style={label}>
              Step type
              {selectedType && <span style={hint}>— {selectedType.desc}</span>}
            </label>
            <select name="step_type" value={form.step_type} onChange={onChange}
              style={{ ...inp, height: 36 }}>
              {STEP_TYPES.map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={row}>
            <label style={label}>Step title <span style={{ color: '#ef4444' }}>*</span> <span style={hint}>shown in sidebar</span></label>
            <input name="title" value={form.title} onChange={onChange} style={inp}
              placeholder={
                t === 'quiz'     ? 'Quiz: What Does HTML Stand For?' :
                t === 'exercise' ? 'Fill In: The Body Tag' :
                t === 'video'    ? 'Video: HTML in 5 Minutes' :
                t === 'code'     ? 'Your First HTML Page' :
                'What is HTML?'
              } />
          </div>

          {/* Order */}
          <div style={row}>
            <label style={label}>Order number <span style={hint}>lower = appears first</span></label>
            <input type="number" name="order_number" value={form.order_number} onChange={onChange}
              min="1" style={{ ...inp, width: 80 }} />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f3f4f6', margin: '4px 0 16px' }} />

          {/* ── TYPE FIELDS ── */}

          {t === 'text' && (
            <div style={row}>
              <label style={label}>Content <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea name="content" value={form.content} onChange={onChange}
                rows={7} style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }}
                placeholder="HTML stands for HyperText Markup Language..." />
            </div>
          )}

          {t === 'code' && (<>
            <div style={row}>
              <label style={label}>Explanation <span style={hint}>shown above the code</span></label>
              <textarea name="content" value={form.content} onChange={onChange}
                rows={3} style={{ ...inp, resize: 'vertical' }}
                placeholder="This is how you write a basic HTML page." />
            </div>
            <div style={row}>
              <label style={label}>Code snippet <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea name="code_snippet" value={form.code_snippet} onChange={onChange}
                rows={6} style={{ ...inp, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', background: '#fafafa' }}
                placeholder={'<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello World</h1>\n  </body>\n</html>'} />
            </div>
            <div style={row}>
              <label style={label}>Expected output <span style={hint}>student types this to unlock next</span></label>
              <input name="expected_output" value={form.expected_output} onChange={onChange}
                style={{ ...inp, fontFamily: 'monospace' }} placeholder="Hello World" />
            </div>
          </>)}

          {t === 'quiz' && (<>
            <div style={row}>
              <label style={label}>Question <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea name="question_text" value={form.question_text} onChange={onChange}
                rows={3} style={{ ...inp, resize: 'vertical' }}
                placeholder="What does HTML stand for?" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {['a','b','c','d'].map(opt => (
                <div key={opt}>
                  <label style={{ ...label, textTransform: 'uppercase' }}>Option {opt}</label>
                  <input name={`option_${opt}`} value={form[`option_${opt}`] || ''} onChange={onChange}
                    style={inp} placeholder={
                      opt === 'a' ? 'HyperText Markup Language' :
                      opt === 'b' ? 'High Tech Modern Language' :
                      opt === 'c' ? 'HyperText Modern Links' :
                      'Home Tool Markup Language'
                    } />
                </div>
              ))}
            </div>
            <div style={row}>
              <label style={label}>Correct answer <span style={{ color: '#ef4444' }}>*</span></label>
              <select name="expected_output" value={form.expected_output} onChange={onChange}
                style={{ ...inp, width: 100, height: 36 }}>
                <option value="">Pick</option>
                {['a','b','c','d'].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
              </select>
            </div>
            <div style={row}>
              <label style={label}>Hint <span style={hint}>shown after wrong answer</span></label>
              <input name="hints" value={form.hints} onChange={onChange} style={inp}
                placeholder="Think about what markup means..." />
            </div>
          </>)}

          {t === 'exercise' && (<>
            <div style={row}>
              <label style={label}>Question <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea name="question_text" value={form.question_text} onChange={onChange}
                rows={3} style={{ ...inp, resize: 'vertical' }}
                placeholder="Type the tag used to make the biggest heading." />
            </div>
            <div style={row}>
              <label style={label}>Correct answer <span style={{ color: '#ef4444' }}>*</span> <span style={hint}>case-insensitive match</span></label>
              <input name="expected_output" value={form.expected_output} onChange={onChange}
                style={{ ...inp, fontFamily: 'monospace' }} placeholder="<h1>" />
            </div>
            <div style={row}>
              <label style={label}>Hint <span style={hint}>optional</span></label>
              <input name="hints" value={form.hints} onChange={onChange} style={inp}
                placeholder="It starts with h and ends with 1" />
            </div>
          </>)}

          {t === 'video' && (<>
            <div style={row}>
              <label style={label}>Video URL <span style={{ color: '#ef4444' }}>*</span></label>
              <input name="video_url" value={form.video_url} onChange={onChange} style={inp}
                placeholder="https://www.youtube.com/watch?v=..." />
            </div>
            <div style={row}>
              <label style={label}>Description <span style={hint}>shown below the video</span></label>
              <textarea name="content" value={form.content} onChange={onChange}
                rows={3} style={{ ...inp, resize: 'vertical' }}
                placeholder="Watch this short video to understand how HTML works." />
            </div>
          </>)}

          {t === 'arrange' && (<>
            <div style={row}>
              <label style={label}>Question</label>
              <input name="question_text" value={form.question_text} onChange={onChange} style={inp}
                placeholder="Put these HTML tags in the correct order." />
            </div>
            <div style={row}>
              <label style={label}>Items <span style={{ color: '#ef4444' }}>*</span> <span style={hint}>one per line, in correct order</span></label>
              <textarea name="content" value={form.content} onChange={onChange}
                rows={6} style={{ ...inp, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                placeholder={'<!DOCTYPE html>\n<html>\n<head>\n<body>\n</body>\n</html>'} />
            </div>
            <div style={row}>
              <label style={label}>Hint <span style={hint}>optional</span></label>
              <input name="hints" value={form.hints} onChange={onChange} style={inp}
                placeholder="The doctype always goes first." />
            </div>
          </>)}

          {t === 'match' && (<>
            <div style={row}>
              <label style={label}>Question</label>
              <input name="question_text" value={form.question_text} onChange={onChange} style={inp}
                placeholder="Match each HTML tag to what it does." />
            </div>
            <div style={row}>
              <label style={label}>Pairs <span style={{ color: '#ef4444' }}>*</span> <span style={hint}>format: term :: definition, one per line</span></label>
              <textarea name="content" value={form.content} onChange={onChange}
                rows={6} style={{ ...inp, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                placeholder={'<h1> :: Main heading\n<p> :: Paragraph\n<a> :: Link\n<img> :: Image'} />
            </div>
          </>)}

          {t === 'bugfix' && (<>
            <div style={row}>
              <label style={label}>Question</label>
              <input name="question_text" value={form.question_text} onChange={onChange} style={inp}
                placeholder="Find and click the buggy line." />
            </div>
            <div style={row}>
              <label style={label}>Code <span style={{ color: '#ef4444' }}>*</span> <span style={hint}>add // BUG at end of the broken line</span></label>
              <textarea name="code_snippet" value={form.code_snippet} onChange={onChange}
                rows={7} style={{ ...inp, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', background: '#fafafa' }}
                placeholder={'<h1>Hello</h1>\n<p>World<p>  // BUG\n<h2>Done</h2>'} />
            </div>
            <div style={row}>
              <label style={label}>Explanation <span style={{ color: '#ef4444' }}>*</span> <span style={hint}>shown after student finds the bug</span></label>
              <textarea name="expected_output" value={form.expected_output} onChange={onChange}
                rows={3} style={{ ...inp, resize: 'vertical' }}
                placeholder="The closing <p> tag is missing the forward slash." />
            </div>
            <div style={row}>
              <label style={label}>Hint <span style={hint}>shown after 2 wrong clicks</span></label>
              <input name="hints" value={form.hints} onChange={onChange} style={inp}
                placeholder="Look at the paragraph tag..." />
            </div>
          </>)}

          {/* Image URL — all types */}
          <div style={row}>
            <label style={label}>Image URL <span style={hint}>optional</span></label>
            <input name="image_url" value={form.image_url} onChange={onChange} style={inp}
              placeholder="/assets/image.png" />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => navigate(`/admin/lessons/${lessonId}/steps`)}
              disabled={loading}
              style={{ padding: '9px 20px', border: '1px solid #d1d5db', background: '#fff', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', borderRadius: 0 }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ padding: '9px 24px', border: 'none', background: '#4d4398', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, borderRadius: 0 }}>
              {loading ? 'Adding…' : `Add ${selectedType?.label || 'Step'}`}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}