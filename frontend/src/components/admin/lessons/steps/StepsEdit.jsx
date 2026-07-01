// src/components/admin/lessons/steps/StepsEdit.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../../services/api';

const STEP_TYPES = [
  { value: 'text',     label: 'Reading',      desc: 'Short concept card.' },
  { value: 'code',     label: 'Code',         desc: 'Code block with type-to-unlock.' },
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

export default function StepsEdit() {
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
    option_a: '', option_b: '', option_c: '', option_d: '',
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
            video_url:       s.video_url       || '',
            image_url:       s.image_url       || '',
            question_text:   s.question_text   || '',
            code_snippet:    s.code_snippet    || '',
            expected_output: s.expected_output || '',
            hints:           s.hints           || '',
            option_a:        s.option_a        || '',
            option_b:        s.option_b        || '',
            option_c:        s.option_c        || '',
            option_d:        s.option_d        || '',
          });
        } else {
          setError('Step not found');
        }
      } catch { setError('Error loading step'); }
      finally { setLoading(false); }
    };
    load();
  }, [lessonId, stepId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const onChange = e => set(e.target.name, e.target.value);
  const t = form.step_type;
  const selectedType = STEP_TYPES.find(s => s.value === t);

  const validate = () => {
    if (!form.title.trim()) return 'Title is required';
    if (t === 'quiz'     && !form.expected_output.trim()) return 'Correct answer is required';
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
    } catch { setError('Error updating step.'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontFamily: 'system-ui' }}>Loading...</div>
  );

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
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Edit Step</h1>
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
            <input name="title" value={form.title} onChange={onChange} style={inp} placeholder="Step title" />
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
                placeholder="Write the concept explanation here..." />
            </div>
          )}

          {t === 'code' && (<>
            <div style={row}>
              <label style={label}>Explanation <span style={hint}>shown above the code</span></label>
              <textarea name="content" value={form.content} onChange={onChange}
                rows={3} style={{ ...inp, resize: 'vertical' }}
                placeholder="Every HTML page follows this structure..." />
            </div>
            <div style={row}>
              <label style={label}>Code snippet <span style={{ color: '#ef4444' }}>*</span></label>
              <textarea name="code_snippet" value={form.code_snippet} onChange={onChange}
                rows={7} style={{ ...inp, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', background: '#fafafa' }}
                placeholder="// your code here" />
            </div>
            <div style={row}>
              <label style={label}>Expected output <span style={hint}>student types this to unlock next</span></label>
              <input name="expected_output" value={form.expected_output} onChange={onChange}
                style={{ ...inp, fontFamily: 'monospace' }} placeholder="Hello World" />
            </div>
            <div style={row}>
              <label style={label}>Unlock token <span style={hint}>word student must type</span></label>
              <input name="hints" value={form.hints} onChange={onChange}
                style={{ ...inp, fontFamily: 'monospace' }} placeholder="html" />
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
                    style={inp} placeholder={`Option ${opt.toUpperCase()}`} />
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
              <input name="hints" value={form.hints} onChange={onChange} style={inp} placeholder="Hint..." />
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
              <label style={label}>Context <span style={hint}>optional extra info</span></label>
              <textarea name="content" value={form.content} onChange={onChange}
                rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Additional context..." />
            </div>
            <div style={row}>
              <label style={label}>Correct answer <span style={{ color: '#ef4444' }}>*</span> <span style={hint}>case-insensitive</span></label>
              <input name="expected_output" value={form.expected_output} onChange={onChange}
                style={{ ...inp, fontFamily: 'monospace' }} placeholder="<h1>" />
            </div>
            <div style={row}>
              <label style={label}>Hint <span style={hint}>optional</span></label>
              <input name="hints" value={form.hints} onChange={onChange} style={inp} placeholder="Hint..." />
            </div>
          </>)}

          {t === 'video' && (<>
            <div style={row}>
              <label style={label}>Video URL <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="url" name="video_url" value={form.video_url} onChange={onChange}
                style={inp} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div style={row}>
              <label style={label}>Description <span style={hint}>shown below the video</span></label>
              <textarea name="content" value={form.content} onChange={onChange}
                rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="What students will learn..." />
            </div>
          </>)}

          {t === 'arrange' && (<>
            <div style={row}>
              <label style={label}>Question <span style={{ color: '#ef4444' }}>*</span></label>
              <input name="question_text" value={form.question_text} onChange={onChange}
                style={inp} placeholder="Put these steps in the correct order:" />
            </div>
            <div style={row}>
              <label style={label}>Items in correct order <span style={{ color: '#ef4444' }}>*</span> <span style={hint}>one per line</span></label>
              <textarea name="content" value={form.content} onChange={onChange}
                rows={6} style={{ ...inp, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                placeholder={'Item 1\nItem 2\nItem 3'} />
            </div>
            <div style={row}>
              <label style={label}>Hint <span style={hint}>optional</span></label>
              <input name="hints" value={form.hints} onChange={onChange} style={inp} placeholder="Hint..." />
            </div>
          </>)}

          {t === 'match' && (<>
            <div style={row}>
              <label style={label}>Question <span style={{ color: '#ef4444' }}>*</span></label>
              <input name="question_text" value={form.question_text} onChange={onChange}
                style={inp} placeholder="Match each term to its definition:" />
            </div>
            <div style={row}>
              <label style={label}>Pairs <span style={{ color: '#ef4444' }}>*</span> <span style={hint}>format: term :: definition, one per line</span></label>
              <textarea name="content" value={form.content} onChange={onChange}
                rows={6} style={{ ...inp, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                placeholder={'<h1> :: Main heading\n<p> :: Paragraph'} />
            </div>
          </>)}

          {t === 'bugfix' && (<>
            <div style={row}>
              <label style={label}>Question</label>
              <input name="question_text" value={form.question_text} onChange={onChange}
                style={inp} placeholder="Find and click the buggy line." />
            </div>
            <div style={row}>
              <label style={label}>Code <span style={{ color: '#ef4444' }}>*</span> <span style={hint}>add // BUG at end of the broken line</span></label>
              <textarea name="code_snippet" value={form.code_snippet} onChange={onChange}
                rows={7} style={{ ...inp, fontFamily: 'monospace', fontSize: 13, resize: 'vertical', background: '#fffbeb' }}
                placeholder={'<h1>Hello</h1>\n<p>World<p>  // BUG\n<h2>Done</h2>'} />
            </div>
            <div style={row}>
              <label style={label}>Explanation <span style={{ color: '#ef4444' }}>*</span> <span style={hint}>shown after bug is found</span></label>
              <textarea name="expected_output" value={form.expected_output} onChange={onChange}
                rows={3} style={{ ...inp, resize: 'vertical' }}
                placeholder="The closing <p> tag is missing the forward slash." />
            </div>
            <div style={row}>
              <label style={label}>Hint <span style={hint}>shown after 2 wrong clicks</span></label>
              <input name="hints" value={form.hints} onChange={onChange} style={inp} placeholder="Look at the paragraph tag..." />
            </div>
          </>)}

          {/* Image URL */}
          <div style={row}>
            <label style={label}>Image URL <span style={hint}>optional</span></label>
            <input name="image_url" value={form.image_url} onChange={onChange}
              style={inp} placeholder="/assets/image.png" />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => navigate(`/admin/lessons/${lessonId}/steps`)}
              disabled={saving}
              style={{ padding: '9px 20px', border: '1px solid #d1d5db', background: '#fff', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', borderRadius: 0 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '9px 24px', border: 'none', background: '#4d4398', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, borderRadius: 0 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}