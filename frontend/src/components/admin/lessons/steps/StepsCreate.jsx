// src/components/admin/lessons/steps/StepsCreate.jsx
// 8 interaction types — variety is the anti-boredom engine
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../../services/api';

const ATL = '#4d4398';

/* ─────────────────────────────────────────
   8 STEP TYPES
───────────────────────────────────────── */
const STEP_TYPES = [
  {
    value: 'text',
    emoji: '📖',
    label: 'Reading',
    color: '#1d4ed8',
    bg: '#eff6ff',
    desc: 'Short concept card. Student must confirm before continuing.',
  },
  {
    value: 'code',
    emoji: '💻',
    label: 'Code',
    color: '#15803d',
    bg: '#f0fdf4',
    desc: 'Show code + expected output. Student types one key token to unlock continue.',
  },
  {
    value: 'quiz',
    emoji: '❓',
    label: 'MCQ Quiz',
    color: '#7e22ce',
    bg: '#fdf4ff',
    desc: '4-choice question. Wrong = shake animation. Must get it right to move on.',
  },
  {
    value: 'exercise',
    emoji: '✏️',
    label: 'Fill In',
    color: '#c2410c',
    bg: '#fff7ed',
    desc: 'Student types the exact answer. Enter to check. Case-insensitive match.',
  },
  {
    value: 'video',
    emoji: '🎬',
    label: 'Video',
    color: '#be123c',
    bg: '#fef2f2',
    desc: 'YouTube or video link. Student watches then confirms before continuing.',
  },
  {
    value: 'arrange',
    emoji: '🔀',
    label: 'Arrange',
    color: '#0369a1',
    bg: '#f0f9ff',
    desc: 'Student drags items into the correct order. Satisfying snap when right.',
  },
  {
    value: 'match',
    emoji: '🎯',
    label: 'Match Pairs',
    color: '#0f766e',
    bg: '#f0fdfa',
    desc: 'Click a term then its definition. Cards flip green when matched.',
  },
  {
    value: 'bugfix',
    emoji: '🐛',
    label: 'Spot the Bug',
    color: '#b45309',
    bg: '#fffbeb',
    desc: 'Show broken code. Student clicks the buggy line. Instant explanation.',
  },
];

/* ─────────────────────────────────────────
   REUSABLE FIELD COMPONENTS
───────────────────────────────────────── */
const Field = ({ label, hint, required, children }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {hint && <span style={{ fontSize: 11, color: '#9ca3af' }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    style={{
      width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb',
      borderRadius: 9, fontSize: 14, outline: 'none', boxSizing: 'border-box',
      fontFamily: 'system-ui,sans-serif', ...(props.style || {}),
    }}
    onFocus={e => (e.target.style.borderColor = ATL)}
    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
  />
);

const Textarea = ({ rows = 5, mono, ...props }) => (
  <textarea
    {...props}
    rows={rows}
    style={{
      width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb',
      borderRadius: 9, fontSize: 13, outline: 'none', resize: 'vertical',
      boxSizing: 'border-box',
      fontFamily: mono ? 'monospace' : 'system-ui,sans-serif',
      lineHeight: 1.6, ...(props.style || {}),
    }}
    onFocus={e => (e.target.style.borderColor = ATL)}
    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
  />
);

const InfoBox = ({ color = '#edeaff', textColor = ATL, children }) => (
  <div style={{
    background: color, borderRadius: 9, padding: '10px 14px',
    fontSize: 12, color: textColor, lineHeight: 1.6,
  }}>
    {children}
  </div>
);

/* ─────────────────────────────────────────
   TYPE-SPECIFIC FORM SECTIONS
───────────────────────────────────────── */

const TextFields = ({ form, onChange }) => (
  <Field label="Content" hint="Keep it under 5 sentences — short card, not an essay" required>
    <Textarea
      name="content"
      value={form.content}
      onChange={onChange}
      rows={8}
      placeholder={`HTML stands for HyperText Markup Language.\n\nEvery webpage you visit is built with it.\n\nThink of HTML as the skeleton:\n🏗️ HTML = structure\n🎨 CSS = style\n⚡ JavaScript = behaviour`}
    />
    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
      Tip: Start with 1 bold fact, then 2–3 supporting lines. Use emoji bullets.
    </p>
  </Field>
);

const CodeFields = ({ form, onChange }) => (
  <>
    <Field label="Intro text" hint="1–2 sentences shown above the code block">
      <Textarea
        name="content"
        value={form.content}
        onChange={onChange}
        rows={2}
        placeholder="Every HTML page follows this structure. Copy it, save as index.html, and open in a browser!"
      />
    </Field>
    <Field label="Code snippet" required hint="The actual code students will see">
      <Textarea
        name="code_snippet"
        value={form.code_snippet}
        onChange={onChange}
        rows={10}
        mono
        placeholder={`<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n  </head>\n  <body>\n    <h1>Hello World!</h1>\n  </body>\n</html>`}
        style={{ background: '#f8f7ff' }}
      />
    </Field>
    <Field label="Expected output" hint="What student should see in browser or terminal">
      <Textarea
        name="expected_output"
        value={form.expected_output}
        onChange={onChange}
        rows={2}
        mono
        placeholder="Browser displays: Hello World! as a big bold heading."
        style={{ background: '#f0fdf4' }}
      />
    </Field>
    <Field label="Unlock token" hint="The one word/tag student must type to unlock Continue. Auto-detected from code if left blank.">
      <Input
        name="hints"
        value={form.hints}
        onChange={onChange}
        placeholder="e.g. html (auto-detected if blank)"
        style={{ fontFamily: 'monospace' }}
      />
    </Field>
  </>
);

const QuizFields = ({ form, onChange, set }) => (
  <>
    <InfoBox>
      <strong>MCQ format:</strong> Write 4 options using A) B) C) D) format in the options field.
      Set correct answer to just the letter: A, B, C, or D.
      Student <em>must</em> get it right before moving on — no skipping.
    </InfoBox>
    <Field label="Question" required hint="The question students must answer">
      <Input
        name="question_text"
        value={form.question_text}
        onChange={onChange}
        placeholder="What does HTML stand for?"
      />
    </Field>
    <Field label="Options (A B C D)" required hint="One per line, starting with A) B) C) D)">
      <Textarea
        name="content"
        value={form.content}
        onChange={onChange}
        rows={5}
        placeholder={`A) HyperText Markup Language\nB) Home Tool Markup Language\nC) HyperText Modern Language\nD) Hyperlink Text Making Language`}
      />
    </Field>
    <Field label="Correct answer" required hint="Just one letter — A, B, C, or D">
      <Input
        name="expected_output"
        value={form.expected_output}
        onChange={e => set('expected_output', e.target.value.toUpperCase())}
        placeholder="A"
        maxLength={1}
        style={{
          width: 80, textTransform: 'uppercase', fontWeight: 800,
          fontSize: 18, textAlign: 'center', background: '#f0fdf4', color: '#15803d',
        }}
      />
    </Field>
    <Field label="Hint" hint="Shown after 2 wrong attempts">
      <Input
        name="hints"
        value={form.hints}
        onChange={onChange}
        placeholder="Think about what HTML does — it marks up hypertext for browsers."
      />
    </Field>
  </>
);

const ExerciseFields = ({ form, onChange }) => (
  <>
    <InfoBox color="#fff7ed" textColor="#c2410c">
      <strong>Fill in:</strong> Student types their answer into a text box.
      Matching is case-insensitive. Set the exact word or phrase they should type.
    </InfoBox>
    <Field label="Question" required hint="Shown above the input box">
      <Input
        name="question_text"
        value={form.question_text}
        onChange={onChange}
        placeholder="All visible HTML content goes inside the <___> tag. What is it?"
      />
    </Field>
    <Field label="Context" hint="Optional extra info shown above the input">
      <Textarea
        name="content"
        value={form.content}
        onChange={onChange}
        rows={3}
        placeholder="All visible content on a webpage — text, images, buttons — lives inside one specific tag."
      />
    </Field>
    <Field label="Correct answer" required hint="Exactly what the student should type">
      <Input
        name="expected_output"
        value={form.expected_output}
        onChange={onChange}
        placeholder="body"
        style={{ fontWeight: 700, color: '#15803d', background: '#f0fdf4' }}
      />
    </Field>
    <Field label="Hint" hint="Shown after 2 wrong attempts">
      <Input
        name="hints"
        value={form.hints}
        onChange={onChange}
        placeholder="It comes right after the closing </head> tag."
      />
    </Field>
  </>
);

const VideoFields = ({ form, onChange }) => (
  <>
    <Field label="Video URL" required hint="YouTube or Vimeo link">
      <Input
        type="url"
        name="video_url"
        value={form.video_url}
        onChange={onChange}
        placeholder="https://youtube.com/watch?v=..."
      />
    </Field>
    <Field label="Description" hint="What students will learn from this video">
      <Textarea
        name="content"
        value={form.content}
        onChange={onChange}
        rows={3}
        placeholder="Watch this 5-minute video to see HTML in action in a real browser."
      />
    </Field>
  </>
);

const ArrangeFields = ({ form, onChange }) => (
  <>
    <InfoBox color="#f0f9ff" textColor="#0369a1">
      <strong>Arrange (drag to order):</strong> Give 4–6 items that must be placed in the correct sequence.
      Put each item on its own line. The correct order is top-to-bottom as you write them.
      Students see them shuffled and must drag to match your order.
    </InfoBox>
    <Field label="Question / instruction" required hint="Tell students what they're ordering">
      <Input
        name="question_text"
        value={form.question_text}
        onChange={onChange}
        placeholder="Put these HTML elements in the correct page structure order:"
      />
    </Field>
    <Field
      label="Items in correct order"
      required
      hint="One item per line — this IS the correct order"
    >
      <Textarea
        name="content"
        value={form.content}
        onChange={onChange}
        rows={7}
        placeholder={`<!DOCTYPE html>\n<html>\n<head>\n<body>\n<h1>Hello World</h1>\n</body>\n</html>`}
      />
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
        Tip: 4–6 items works best. More than 7 becomes frustrating.
      </p>
    </Field>
    <Field label="Hint" hint="Shown after 2 wrong attempts">
      <Input
        name="hints"
        value={form.hints}
        onChange={onChange}
        placeholder="The DOCTYPE declaration always goes first, before the html tag."
      />
    </Field>
  </>
);

const MatchFields = ({ form, onChange }) => (
  <>
    <InfoBox color="#f0fdfa" textColor="#0f766e">
      <strong>Match pairs:</strong> Student clicks a term on the left, then its matching definition on the right.
      Write pairs as <code>term :: definition</code> — one pair per line.
      Aim for 4–6 pairs.
    </InfoBox>
    <Field label="Question / instruction" required hint="Tell students what they're matching">
      <Input
        name="question_text"
        value={form.question_text}
        onChange={onChange}
        placeholder="Match each HTML tag to what it does:"
      />
    </Field>
    <Field
      label="Term :: Definition pairs"
      required
      hint="One pair per line in format: term :: definition"
    >
      <Textarea
        name="content"
        value={form.content}
        onChange={onChange}
        rows={8}
        placeholder={`<h1> :: The largest heading on a page\n<p> :: A paragraph of text\n<a> :: A clickable link\n<img> :: An image\n<ul> :: An unordered bullet list\n<div> :: A generic container block`}
      />
    </Field>
    <Field label="Hint" hint="Shown if student makes multiple wrong matches">
      <Input
        name="hints"
        value={form.hints}
        onChange={onChange}
        placeholder="Think about what each tag's name stands for — most are abbreviations."
      />
    </Field>
  </>
);

const BugfixFields = ({ form, onChange }) => (
  <>
    <InfoBox color="#fffbeb" textColor="#b45309">
      <strong>Spot the bug:</strong> Show broken code. Student clicks the line that contains the bug.
      Mark the buggy line with a comment: <code>// BUG</code> at the end of that line.
      Provide a clear explanation of what's wrong and how to fix it.
    </InfoBox>
    <Field label="Question / challenge" required hint="What should the code do?">
      <Input
        name="question_text"
        value={form.question_text}
        onChange={onChange}
        placeholder="This HTML is broken — it won't display correctly. Click the buggy line."
      />
    </Field>
    <Field
      label="Broken code"
      required
      hint="Mark the buggy line with // BUG at the end"
    >
      <Textarea
        name="code_snippet"
        value={form.code_snippet}
        onChange={onChange}
        rows={10}
        mono
        placeholder={`<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n  </head>\n  <body>\n    <h1>Hello World!<h1>  // BUG\n    <p>This is a paragraph.</p>\n  </body>\n</html>`}
        style={{ background: '#fffbeb' }}
      />
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
        Exactly one line should have <code>// BUG</code> — students click that line.
      </p>
    </Field>
    <Field label="Explanation" required hint="Shown after the student finds the bug">
      <Textarea
        name="expected_output"
        value={form.expected_output}
        onChange={onChange}
        rows={3}
        placeholder="The closing tag is wrong: <h1> should be </h1>. In HTML, closing tags need a forward slash."
        style={{ background: '#f0fdf4' }}
      />
    </Field>
    <Field label="Hint" hint="Shown after 2 wrong clicks">
      <Input
        name="hints"
        value={form.hints}
        onChange={onChange}
        placeholder="Look at the heading tag — are the opening and closing tags identical?"
      />
    </Field>
  </>
);

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
const StepsCreate = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    title: '',
    content: '',
    step_type: 'text',
    order_number: 1,
    video_url: '',
    image_url: '',
    code_snippet: '',
    expected_output: '',
    hints: '',
    question_text: '',
  });

  useEffect(() => {
    api.lessons
      .getById(lessonId)
      .then(r => r.success && setLesson(r.data))
      .catch(() => {});
  }, [lessonId]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const onChange = e => set(e.target.name, e.target.value);
  const t = form.step_type;

  /* Validate before submit */
  const validate = () => {
    if (!form.title.trim()) return 'Title is required';
    if (t === 'quiz') {
      if (!form.question_text.trim()) return 'Question is required for quiz steps';
      if (!form.expected_output.trim()) return 'Correct answer (A/B/C/D) is required';
    }
    if (t === 'exercise') {
      if (!form.question_text.trim()) return 'Question is required for fill-in steps';
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
      setLoading(true);
      setError(null);
      const res = await api.lessons.createStep(lessonId, {
        ...form,
        order_number: parseInt(form.order_number) || 1,
      });
      if (res.success) {
        navigate(`/admin/lessons/${lessonId}/steps`);
      } else {
        setError(res.message || 'Failed to create step');
      }
    } catch {
      setError('Error creating step. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedType = STEP_TYPES.find(s => s.value === t);

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 0 60px',
        fontFamily: 'system-ui,sans-serif',
      }}
    >
      <button
        onClick={() => navigate(`/admin/lessons/${lessonId}/steps`)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: ATL, fontWeight: 600, fontSize: 14, marginBottom: 16, padding: 0,
        }}
      >
        ← Back to Steps
      </button>

      <div
        style={{
          background: '#fff', borderRadius: 14,
          border: '1.5px solid #e5e7eb', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px', borderBottom: '1.5px solid #e5e7eb',
            background: '#faf9ff',
          }}
        >
          <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: '#1e1b4b' }}>
            Add Step
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
            Adding to: <strong>{lesson?.title}</strong>
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          {/* Error */}
          {error && (
            <div
              style={{
                background: '#fef2f2', border: '1.5px solid #fca5a5',
                borderRadius: 9, padding: '10px 14px', color: '#b91c1c',
                fontSize: 13, fontWeight: 600,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* ── STEP TYPE SELECTOR ── */}
          <Field label="Step type" hint="Pick the interaction style — variety keeps students engaged">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {STEP_TYPES.map(st => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => set('step_type', st.value)}
                  style={{
                    padding: '10px 6px',
                    borderRadius: 10,
                    border: `2px solid ${form.step_type === st.value ? ATL : '#e5e7eb'}`,
                    background: form.step_type === st.value ? st.bg : '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all .15s',
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{st.emoji}</div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: form.step_type === st.value ? st.color : '#374151',
                    }}
                  >
                    {st.label}
                  </div>
                </button>
              ))}
            </div>
            {selectedType && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                <strong style={{ color: selectedType.color }}>{selectedType.emoji} {selectedType.label}:</strong>{' '}
                {selectedType.desc}
              </p>
            )}
          </Field>

          {/* ── TITLE ── */}
          <Field label="Step title" required hint="Shown in the sidebar steps list">
            <Input
              name="title"
              value={form.title}
              onChange={onChange}
              placeholder={
                t === 'quiz'     ? 'Quiz: What Does HTML Stand For?' :
                t === 'exercise' ? 'Fill In: The Body Tag' :
                t === 'arrange'  ? 'Arrange: HTML Document Structure' :
                t === 'match'    ? 'Match: HTML Tags to Their Purpose' :
                t === 'bugfix'   ? 'Spot the Bug: Broken Heading Tag' :
                t === 'video'    ? 'Video: HTML in 5 Minutes' :
                t === 'code'     ? 'Your First HTML Page' :
                'What is HTML?'
              }
            />
          </Field>

          {/* ── ORDER ── */}
          <Field label="Order number" hint="Lower = appears earlier in lesson">
            <Input
              type="number"
              name="order_number"
              value={form.order_number}
              onChange={onChange}
              min="1"
              style={{ width: 100 }}
            />
          </Field>

          {/* ── TYPE-SPECIFIC FIELDS ── */}
          {t === 'text'     && <TextFields     form={form} onChange={onChange} />}
          {t === 'code'     && <CodeFields     form={form} onChange={onChange} />}
          {t === 'quiz'     && <QuizFields     form={form} onChange={onChange} set={set} />}
          {t === 'exercise' && <ExerciseFields form={form} onChange={onChange} />}
          {t === 'video'    && <VideoFields    form={form} onChange={onChange} />}
          {t === 'arrange'  && <ArrangeFields  form={form} onChange={onChange} />}
          {t === 'match'    && <MatchFields    form={form} onChange={onChange} />}
          {t === 'bugfix'   && <BugfixFields   form={form} onChange={onChange} />}

          {/* ── IMAGE URL (all types) ── */}
          <Field label="Image URL" hint="Optional — shown at top of step">
            <Input
              name="image_url"
              value={form.image_url}
              onChange={onChange}
              placeholder="/assets/html-diagram.png"
            />
          </Field>

          {/* ── VARIETY REMINDER ── */}
          <div
            style={{
              background: '#f8f7ff', border: '1.5px dashed #c4b5fd',
              borderRadius: 10, padding: '10px 14px', fontSize: 12, color: ATL,
            }}
          >
            💡 <strong>Tip:</strong> Avoid using the same step type twice in a row.
            Variety is what makes lessons addictive — mix reading, quiz, code, arrange, and match across your steps.
          </div>

          {/* ── BUTTONS ── */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={() => navigate(`/admin/lessons/${lessonId}/steps`)}
              style={{
                flex: 1, padding: '12px', borderRadius: 10,
                border: '1.5px solid #e5e7eb', background: '#fff',
                color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2, padding: '12px', borderRadius: 10,
                border: 'none', background: ATL, color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
              disabled={loading}
            >
              {loading ? 'Adding…' : `+ Add ${selectedType?.label || 'Step'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StepsCreate;