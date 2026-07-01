// src/components/admin/story/StoryAdminPage.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, ArrowLeft, Image, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';

/* ─── Constants ──────────────────────────────────────────────── */
const TASK_TYPES = [
  { v: 'mcq',        l: 'Multiple Choice', i: '🎯', d: '4 options, one correct'    },
  { v: 'type',       l: 'Type Answer',     i: '⌨️', d: 'Student types the answer'  },
  { v: 'fill_blank', l: 'Fill in Blank',   i: '✏️', d: 'Template with ___ blanks'  },
  { v: 'keyboard',   l: 'Keyboard',        i: '🔑', d: 'Press a shortcut combo'     },
  { v: 'truefalse',  l: 'True / False',    i: '✅', d: 'True or false statement'    },
  { v: 'dragdrop',   l: 'Drag & Drop',     i: '🧩', d: 'Arrange in correct order'  },
  { v: 'match',      l: 'Match Pairs',     i: '🔗', d: 'Connect left to right'      },
  { v: 'scene',      l: "Ram's Scene",     i: '🎬', d: "Ram walks to complete task" },
];

const MOODS  = ['thinking', 'happy', 'excited', 'sad', 'default'];
const MOOD_E = { default: '🧑‍💻', happy: '😄', thinking: '🤔', sad: '😢', excited: '🥳' };
const IMG_POS = ['left', 'center', 'right'];

const B_STORY   = { title: '', description: '', icon: '📖', order_no: 1, cover_image: '', is_published: true };
const B_CHAPTER = { title: '', description: '', icon: '⭐', order_no: 1, story_id: '', image_url: '', image_position: 'center', chapter_dialog: '' };
const B_TASK    = { dialog: '', question: '', mood: 'thinking', type: 'mcq', order_no: 1, options: ['', '', '', ''], correct_answer: '', hint: '', template: '', starter_code: '', chapter_id: '', drag_items: ['', '', ''], match_left: ['', ''], match_right: ['', ''], scene_instruction: '', scene_steps: 5, tf_statement: '' };

/* ─── Shared styles ──────────────────────────────────────────── */
const inp  = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#4d4398] bg-white placeholder:text-gray-300 transition-colors';
const inp2 = inp + ' font-mono';
const lbl  = 'block text-xs font-semibold text-gray-600 mb-1';

/* ─── Primitives ─────────────────────────────────────────────── */
const Spin = () => (
  <div className="w-7 h-7 border-4 border-[#4d4398] border-t-transparent rounded-full animate-spin mx-auto" />
);

const Err = ({ m }) => m ? (
  <div className="flex gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
    <span>⚠</span><span>{m}</span>
  </div>
) : null;

const Modal = ({ title, onClose, onSave, saving, wide = false, children }) => (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div className={`bg-white rounded-2xl flex flex-col shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[92vh]`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
        <h3 className="font-bold text-gray-900 text-base">{title}</h3>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">{children}</div>
      <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
        <button onClick={onClose} className="px-5 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-white transition-colors">
          Cancel
        </button>
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-[#4d4398] text-white rounded-lg text-sm font-semibold hover:bg-[#3e2f7f] disabled:opacity-50 transition-colors">
          <Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  </div>
);

const Table = ({ head, children, footer }) => (
  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-max">
        <thead>
          <tr className="bg-[#4d4398] text-white text-left">
            {head.map(h => <th key={h} className="px-4 py-3 font-semibold text-xs whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
    {footer && (
      <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
        {footer}
      </div>
    )}
  </div>
);

const Tr = ({ i, children }) => (
  <tr className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-[#4d4398]/[0.03] transition-colors`}>
    {children}
  </tr>
);

const Td = ({ children, mono = false, muted = false, className = '' }) => (
  <td className={`px-4 py-3 align-middle ${mono ? 'font-mono' : ''} ${muted ? 'text-gray-400' : 'text-gray-700'} ${className}`}>
    {children}
  </td>
);

const PubBadge = ({ v }) => (
  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${v !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
    {v !== false ? '● Live' : '○ Draft'}
  </span>
);

const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fmtShort = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

/* ════════════════════════════════════════════════════════════════
   STORY FORM
════════════════════════════════════════════════════════════════ */
const StoryForm = ({ f, set, setF, err }) => (
  <>
    <Err m={err} />
    <div>
      <label className={lbl}>Title *</label>
      <input value={f.title} onChange={set('title')} placeholder="e.g. Ram's First Website" className={inp} />
    </div>
    <div>
      <label className={lbl}>Description</label>
      <textarea rows={2} value={f.description} onChange={set('description')} placeholder="What students will learn" className={inp + ' resize-none'} />
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className={lbl}>Emoji / Icon</label>
        <input value={f.icon} onChange={set('icon')} placeholder="📖" className={inp} />
      </div>
      <div>
        <label className={lbl}>Order</label>
        <input type="number" min={1} value={f.order_no} onChange={set('order_no')} className={inp} />
      </div>
      <div>
        <label className={lbl}>Status</label>
        <button type="button"
          onClick={() => setF(p => ({ ...p, is_published: !p.is_published }))}
          className={`w-full py-2 rounded-lg border-2 text-xs font-semibold transition-colors ${f.is_published ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
          {f.is_published ? '● Published' : '○ Draft'}
        </button>
      </div>
    </div>
    <div>
      <label className={lbl}>Cover Image URL <span className="font-normal text-gray-400">(optional)</span></label>
      <input value={f.cover_image} onChange={set('cover_image')} placeholder="https://…/image.jpg" className={inp} />
      {f.cover_image && (
        <img src={f.cover_image} alt="" onError={e => e.target.style.display = 'none'}
          className="mt-2 w-full h-20 object-cover rounded-lg border border-gray-200" />
      )}
    </div>
  </>
);

/* ════════════════════════════════════════════════════════════════
   CHAPTER FORM
════════════════════════════════════════════════════════════════ */
const ChapterForm = ({ f, set, setF, stories, err }) => (
  <>
    <Err m={err} />
    <div>
      <label className={lbl}>Story *</label>
      <select value={f.story_id} onChange={set('story_id')} className={inp}>
        <option value="">— Select Story —</option>
        {stories.map(s => <option key={s.id} value={s.id}>{s.icon} {s.title}</option>)}
      </select>
    </div>
    <div>
      <label className={lbl}>Title *</label>
      <input value={f.title} onChange={set('title')} placeholder="e.g. Chapter 1: Open VS Code" className={inp} />
    </div>
    <div>
      <label className={lbl}>Description</label>
      <textarea rows={2} value={f.description} onChange={set('description')} placeholder="Brief chapter description" className={inp + ' resize-none'} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className={lbl}>Emoji / Icon</label>
        <input value={f.icon} onChange={set('icon')} placeholder="⭐" className={inp} />
      </div>
      <div>
        <label className={lbl}>Order</label>
        <input type="number" min={1} value={f.order_no} onChange={set('order_no')} className={inp} />
      </div>
    </div>
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
        <Image className="w-3.5 h-3.5" /> Chapter Image &amp; Opening Dialog
      </p>
      <div>
        <label className={lbl}>Image URL <span className="font-normal text-gray-400">(shown in intro screen)</span></label>
        <input value={f.image_url} onChange={set('image_url')} placeholder="https://…/chapter.jpg" className={inp} />
        {f.image_url && (
          <img src={f.image_url} alt="" onError={e => e.target.style.display = 'none'}
            className="mt-2 w-full h-20 object-cover rounded-lg border border-gray-200" />
        )}
      </div>
      <div>
        <label className={lbl}>Image Position</label>
        <div className="flex gap-2">
          {IMG_POS.map(p => (
            <button key={p} type="button"
              onClick={() => setF(prev => ({ ...prev, image_position: p }))}
              className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-semibold capitalize transition-colors ${f.image_position === p ? 'border-[#4d4398] bg-[#4d4398]/5 text-[#4d4398]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {p === 'left' ? '◀ Left' : p === 'center' ? '● Center' : 'Right ▶'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={lbl}>Opening Dialog <span className="font-normal text-gray-400">(Ram's speech bubble)</span></label>
        <textarea rows={2} value={f.chapter_dialog} onChange={set('chapter_dialog')}
          placeholder="Hey! I'm Ram 👋 Today we build our first webpage!" className={inp + ' resize-none'} />
      </div>
    </div>
  </>
);

/* ════════════════════════════════════════════════════════════════
   TASK FORM
════════════════════════════════════════════════════════════════ */
const TaskForm = ({ f, setF, set, chapters, stories, err }) => {
  const upD = (i, v) => { const a = [...f.drag_items]; a[i] = v; setF(p => ({ ...p, drag_items: a })); };
  const upL = (i, v) => { const a = [...f.match_left];  a[i] = v; setF(p => ({ ...p, match_left:  a })); };
  const upR = (i, v) => { const a = [...f.match_right]; a[i] = v; setF(p => ({ ...p, match_right: a })); };

  const chsByStory = {};
  chapters.forEach(c => {
    const s = stories.find(s => s.id === c.story_id);
    const k = s ? `${s.icon} ${s.title}` : 'Other';
    if (!chsByStory[k]) chsByStory[k] = [];
    chsByStory[k].push(c);
  });

  return (
    <>
      <Err m={err} />
      <div>
        <label className={lbl}>Chapter *</label>
        <select value={f.chapter_id} onChange={set('chapter_id')} className={inp}>
          <option value="">— Select Chapter —</option>
          {Object.entries(chsByStory).map(([sName, chs]) => (
            <optgroup key={sName} label={sName}>
              {chs.map(c => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label className={lbl}>Ram says * <span className="font-normal text-gray-400">speech bubble text</span></label>
        <textarea rows={2} value={f.dialog} onChange={set('dialog')}
          placeholder="Hey! What HTML tag makes a paragraph?" className={inp + ' resize-none'} />
      </div>
      <div>
        <label className={lbl}>Ram's mood</label>
        <div className="flex gap-2 flex-wrap">
          {MOODS.map(m => (
            <button key={m} type="button" onClick={() => setF(p => ({ ...p, mood: m }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${f.mood === m ? 'border-[#4d4398] bg-[#4d4398]/5 text-[#4d4398]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {MOOD_E[m]} {m}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={lbl}>Task type *</label>
        <div className="grid grid-cols-2 gap-2">
          {TASK_TYPES.map(t => (
            <button key={t.v} type="button" onClick={() => setF(p => ({ ...p, type: t.v }))}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border-2 text-left transition-colors ${f.type === t.v ? 'border-[#4d4398] bg-[#4d4398]/5' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <span>{t.i} {t.l}</span>
              <span className="block text-gray-400 font-normal text-[10px] mt-0.5">{t.d}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={lbl}>Question <span className="font-normal text-gray-400">(shown above task — optional)</span></label>
        <input value={f.question} onChange={set('question')} placeholder="Which HTML tag creates a paragraph?" className={inp} />
      </div>

      {f.type === 'mcq' && (
        <div>
          <label className={lbl}>Options — click letter to mark correct</label>
          <div className="space-y-2">
            {['A', 'B', 'C', 'D'].map((l, i) => (
              <div key={l} className="flex items-center gap-2">
                <button type="button" onClick={() => setF(p => ({ ...p, correct_answer: f.options[i] }))}
                  className={`w-8 h-8 rounded-lg text-xs font-bold border-2 flex-shrink-0 flex items-center justify-center transition-colors ${f.correct_answer === f.options[i] && f.options[i] ? 'bg-green-500 border-green-500 text-white' : 'border-gray-200 text-gray-500 hover:border-[#4d4398]'}`}>
                  {l}
                </button>
                <input value={f.options[i] || ''} onChange={e => { const o = [...f.options]; o[i] = e.target.value; setF(p => ({ ...p, options: o })); }}
                  placeholder={`Option ${l}`} className={inp} />
              </div>
            ))}
          </div>
        </div>
      )}

      {f.type === 'type' && (<>
        <div>
          <label className={lbl}>Starter code <span className="font-normal text-gray-400">(pre-filled in text box)</span></label>
          <input value={f.starter_code} onChange={set('starter_code')} placeholder="<p>___</p>" className={inp2} />
        </div>
        <div>
          <label className={lbl}>Correct answer *</label>
          <input value={f.correct_answer} onChange={set('correct_answer')} placeholder="<p>Hello World</p>" className={inp2} />
        </div>
      </>)}

      {f.type === 'fill_blank' && (<>
        <div>
          <label className={lbl}>Template * <span className="font-normal text-gray-400">use ___ for blanks</span></label>
          <input value={f.template} onChange={set('template')} placeholder="<___>Hello</___>" className={inp2} />
        </div>
        <div>
          <label className={lbl}>Answers * <span className="font-normal text-gray-400">comma-separated in order</span></label>
          <input value={f.correct_answer} onChange={set('correct_answer')} placeholder="p,p" className={inp2} />
        </div>
      </>)}

      {f.type === 'keyboard' && (
        <div>
          <label className={lbl}>Shortcut * <span className="font-normal text-gray-400">e.g. CTRL+S</span></label>
          <input value={f.correct_answer} onChange={set('correct_answer')} placeholder="CTRL+S" className={inp2 + ' uppercase'} />
        </div>
      )}

      {f.type === 'truefalse' && (<>
        <div>
          <label className={lbl}>Statement *</label>
          <textarea rows={2} value={f.tf_statement} onChange={set('tf_statement')}
            placeholder="The <p> tag is used for paragraphs." className={inp + ' resize-none'} />
        </div>
        <div>
          <label className={lbl}>Correct answer *</label>
          <div className="flex gap-2">
            {['true', 'false'].map(v => (
              <button key={v} type="button" onClick={() => setF(p => ({ ...p, correct_answer: v }))}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 capitalize transition-colors ${f.correct_answer === v ? v === 'true' ? 'border-green-400 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {v === 'true' ? '✅ True' : '❌ False'}
              </button>
            ))}
          </div>
        </div>
      </>)}

      {f.type === 'dragdrop' && (
        <div>
          <label className={lbl}>Items in correct order *</label>
          <div className="space-y-2">
            {(f.drag_items || []).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-xs text-gray-400 text-center flex-shrink-0">{i + 1}</span>
                <input value={item} onChange={e => upD(i, e.target.value)} placeholder={`Item ${i + 1}`} className={inp2} />
                {f.drag_items.length > 2 && (
                  <button type="button" onClick={() => setF(p => ({ ...p, drag_items: p.drag_items.filter((_, j) => j !== i) }))}
                    className="text-gray-300 hover:text-red-400 flex-shrink-0"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setF(p => ({ ...p, drag_items: [...p.drag_items, ''] }))}
            className="mt-2 text-xs text-[#4d4398] hover:underline font-semibold">+ Add item</button>
        </div>
      )}

      {f.type === 'match' && (
        <div>
          <label className={lbl}>Match pairs * <span className="font-normal text-gray-400">left ↔ right</span></label>
          <div className="space-y-2">
            {(f.match_left || []).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={f.match_left[i] || ''} onChange={e => upL(i, e.target.value)} placeholder={`Left ${i + 1}`} className={inp} />
                <span className="text-gray-300 font-bold flex-shrink-0">↔</span>
                <input value={f.match_right[i] || ''} onChange={e => upR(i, e.target.value)} placeholder={`Right ${i + 1}`} className={inp} />
                {f.match_left.length > 2 && (
                  <button type="button"
                    onClick={() => setF(p => ({ ...p, match_left: p.match_left.filter((_, j) => j !== i), match_right: p.match_right.filter((_, j) => j !== i) }))}
                    className="text-gray-300 hover:text-red-400 flex-shrink-0"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
          <button type="button"
            onClick={() => setF(p => ({ ...p, match_left: [...p.match_left, ''], match_right: [...p.match_right, ''] }))}
            className="mt-2 text-xs text-[#4d4398] hover:underline font-semibold">+ Add pair</button>
        </div>
      )}

      {f.type === 'scene' && (<>
        <div>
          <label className={lbl}>Instruction *</label>
          <input value={f.scene_instruction} onChange={set('scene_instruction')}
            placeholder="Press → to help Ram walk to his laptop!" className={inp} />
        </div>
        <div>
          <label className={lbl}>Steps to complete <span className="font-normal text-gray-400">(1–20)</span></label>
          <input type="number" min={1} max={20} value={f.scene_steps} onChange={set('scene_steps')} className={inp} />
        </div>
      </>)}

      <div className="pt-3 border-t border-gray-100 space-y-3">
        <div>
          <label className={lbl}>Hint <span className="font-normal text-gray-400">(shown after 2 wrong attempts)</span></label>
          <input value={f.hint} onChange={set('hint')} placeholder="The paragraph tag starts with P…" className={inp} />
        </div>
        <div className="w-28">
          <label className={lbl}>Order</label>
          <input type="number" min={1} value={f.order_no} onChange={set('order_no')} className={inp} />
        </div>
      </div>
    </>
  );
};

/* ════════════════════════════════════════════════════════════════
   STORIES PAGE  — rendered at /admin/story
════════════════════════════════════════════════════════════════ */
export function StoriesPage() {
  const navigate   = useNavigate();
  const [stories,  setStories]  = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);
  const [editId,   setEditId]   = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState(null);
  const [sF,       setSF]       = useState(B_STORY);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [s, c] = await Promise.all([api.story.getStories(), api.story.getChapters()]);
      setStories(s.data || []);
      setChapters(c.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const S = fn => field => e => fn(p => ({ ...p, [field]: e.target.value }));

  const openNew  = () => { setEditId(null); setSF(B_STORY); setErr(null); setModal('story'); };
  const openEdit = s => {
    setEditId(s.id);
    setSF({ title: s.title, description: s.description || '', icon: s.icon || '📖', order_no: s.order_no || 1, cover_image: s.cover_image || '', is_published: s.is_published !== false });
    setErr(null); setModal('story');
  };
  const save = async () => {
    if (!sF.title.trim()) return setErr('Title is required.');
    try {
      setSaving(true); setErr(null);
      editId ? await api.story.updateStory(editId, sF) : await api.story.createStory(sF);
      setModal(null); load();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };
  const del = async id => {
    if (!confirm('Delete story and ALL its chapters & tasks?')) return;
    await api.story.deleteStory(id); load();
  };

  if (loading) return <div className="flex justify-center py-20"><Spin /></div>;

  const sorted = [...stories].sort((a, b) => a.order_no - b.order_no);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{stories.length} stories · {chapters.length} chapters total</p>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-[#4d4398] hover:bg-[#3e2f7f] text-white rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Create Story
        </button>
      </div>

      <Table
        head={['', 'Title', 'Description', 'Chapters', 'Total Tasks', 'Order', 'Status', 'Cover', 'Created', 'Actions']}
        footer={<><span>{stories.length} stories</span><span>{chapters.length} chapters</span></>}
      >
        {sorted.length === 0 && (
          <tr><td colSpan={10} className="px-4 py-14 text-center text-gray-400 text-sm">No stories yet — create the first one!</td></tr>
        )}
        {sorted.map((s, i) => {
          const chs       = chapters.filter(c => c.story_id === s.id);
          const taskTotal = chs.reduce((a, c) => a + (c.tasks_count || 0), 0);
          return (
            <Tr key={s.id} i={i}>
              <Td><span className="text-2xl">{s.icon}</span></Td>
              <Td><span className="font-semibold text-gray-800 block max-w-[160px] truncate">{s.title}</span></Td>
              <Td muted><span className="block max-w-[180px] truncate text-xs">{s.description || '—'}</span></Td>
              <Td><span className="text-sm font-semibold text-gray-700">{chs.length}</span></Td>
              <Td><span className="text-sm font-semibold text-gray-700">{taskTotal}</span></Td>
              <Td muted className="text-center text-sm">{s.order_no}</Td>
              <Td><PubBadge v={s.is_published} /></Td>
              <Td>
                {s.cover_image
                  ? <img src={s.cover_image} alt="" onError={e => e.target.style.display = 'none'} className="w-12 h-8 object-cover rounded border border-gray-200" />
                  : <span className="text-gray-300 text-xs">—</span>}
              </Td>
              <Td muted className="text-xs whitespace-nowrap">{fmtDate(s.created_at)}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  {/* Navigate to chapters page filtered by this story */}
                  <button
                    onClick={() => navigate(`/admin/story-chapters?story=${s.id}`)}
                    className="flex items-center gap-1 px-2 py-1.5 bg-[#4d4398] hover:bg-[#3e2f7f] text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap">
                    📋 Chapters
                  </button>
                  <button onClick={() => openEdit(s)} className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => del(s.id)}   className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </Td>
            </Tr>
          );
        })}
      </Table>

      {modal === 'story' && (
        <Modal title={editId ? 'Edit Story' : 'New Story'} onClose={() => setModal(null)} onSave={save} saving={saving}>
          <StoryForm f={sF} set={S(setSF)} setF={setSF} err={err} />
        </Modal>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   CHAPTERS PAGE — rendered at /admin/story-chapters
════════════════════════════════════════════════════════════════ */
export function ChaptersPage() {
  const navigate = useNavigate();

  // Read ?story= query param to pre-filter
  const params      = new URLSearchParams(window.location.search);
  const initFilter  = params.get('story') || 'all';

  const [stories,     setStories]     = useState([]);
  const [chapters,    setChapters]    = useState([]);
  const [tasks,       setTasks]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [chapterView, setChapterView] = useState(null);
  const [modal,       setModal]       = useState(null);
  const [editId,      setEditId]      = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState(null);
  const [cF,          setCF]          = useState(B_CHAPTER);
  const [tF,          setTF]          = useState(B_TASK);
  const [storyFilter, setStoryFilter] = useState(initFilter);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [s, c, t] = await Promise.all([api.story.getStories(), api.story.getChapters(), api.story.getTasks()]);
      setStories(s.data || []);
      setChapters(c.data || []);
      setTasks(t.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const S = fn => field => e => fn(p => ({ ...p, [field]: e.target.value }));

  /* ── Chapter CRUD ── */
  const newChapter  = (sid = '') => { setEditId(null); setCF({ ...B_CHAPTER, story_id: sid }); setErr(null); setModal('chapter'); };
  const editChapter = c => {
    setEditId(c.id);
    setCF({ title: c.title, description: c.description || '', icon: c.icon || '⭐', order_no: c.order_no || 1, story_id: c.story_id, image_url: c.image_url || '', image_position: c.image_position || 'center', chapter_dialog: c.chapter_dialog || '' });
    setErr(null); setModal('chapter');
  };
  const saveChapter = async () => {
    if (!cF.story_id)     return setErr('Select a story.');
    if (!cF.title.trim()) return setErr('Title is required.');
    try {
      setSaving(true); setErr(null);
      editId ? await api.story.updateChapter(editId, cF) : await api.story.createChapter(cF);
      setModal(null); load();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };
  const delChapter = async id => {
    if (!confirm('Delete chapter and all its tasks?')) return;
    await api.story.deleteChapter(id);
    if (chapterView?.id === id) setChapterView(null);
    load();
  };

  /* ── Task CRUD ── */
  const newTask  = (cid = '') => { setEditId(null); setTF({ ...B_TASK, chapter_id: cid, drag_items: ['', '', ''], match_left: ['', ''], match_right: ['', ''] }); setErr(null); setModal('task'); };
  const editTask = t => {
    setEditId(t.id);
    const o = t.options || [];
    setTF({
      dialog: t.dialog || '', question: t.question || '', mood: t.mood || 'thinking', type: t.type || 'mcq', order_no: t.order_no || 1,
      options: [o[0] || '', o[1] || '', o[2] || '', o[3] || ''],
      correct_answer: t.correct_answer || '', hint: t.hint || '', template: t.template || '',
      starter_code: t.starter_code || '', chapter_id: t.chapter_id || '',
      tf_statement:      t.tf_statement      || t.question || '',
      drag_items:        t.drag_items        || (t.correct_answer ? t.correct_answer.split('|||') : ['', '', '']),
      match_left:        t.match_left        || ['', ''],
      match_right:       t.match_right       || ['', ''],
      scene_instruction: t.scene_instruction || '',
      scene_steps:       t.scene_steps       || 5,
    });
    setErr(null); setModal('task');
  };
  const saveTask = async () => {
    if (!tF.chapter_id)    return setErr('Select a chapter.');
    if (!tF.dialog.trim()) return setErr("Ram's dialog is required.");
    let ca = tF.correct_answer;
    const pl = {
      dialog: tF.dialog, question: tF.question, mood: tF.mood, type: tF.type,
      order_no: Number(tF.order_no) || 1, hint: tF.hint, template: tF.template,
      starter_code: tF.starter_code, chapter_id: tF.chapter_id,
      options: tF.type === 'mcq' ? tF.options.filter(Boolean) : [],
    };
    if (tF.type === 'dragdrop') {
      ca = tF.drag_items.filter(Boolean).join('|||');
      pl.drag_items = tF.drag_items.filter(Boolean);
    } else if (tF.type === 'match') {
      pl.match_left  = tF.match_left.filter(Boolean);
      pl.match_right = tF.match_right.filter(Boolean);
      ca = tF.match_left.filter(Boolean).map((l, i) => `${l}::${tF.match_right[i] || ''}`).join('|||');
    } else if (tF.type === 'truefalse') {
      pl.tf_statement = tF.tf_statement;
      if (!tF.tf_statement?.trim()) return setErr('Statement is required.');
      if (!ca) return setErr('Select True or False.');
    } else if (tF.type === 'scene') {
      pl.scene_instruction = tF.scene_instruction;
      pl.scene_steps = Number(tF.scene_steps) || 5;
      ca = 'scene_complete';
    } else if (!ca?.trim()) {
      return setErr('Correct answer is required.');
    }
    pl.correct_answer = ca;
    try {
      setSaving(true); setErr(null);
      editId ? await api.story.updateTask(editId, pl) : await api.story.createTask(pl);
      setModal(null); load();
    } catch (e) { setErr(e.message); } finally { setSaving(false); }
  };
  const delTask = async id => {
    if (!confirm('Delete this task?')) return;
    await api.story.deleteTask(id); load();
  };

  if (loading) return <div className="flex justify-center py-20"><Spin /></div>;

  /* ── Tasks drill-down view ── */
  if (chapterView) {
    const ch      = chapterView;
    const story   = stories.find(s => s.id === ch.story_id);
    const chTasks = tasks.filter(t => t.chapter_id === ch.id).sort((a, b) => a.order_no - b.order_no);
    return (
      <div className="space-y-4">
        <button onClick={() => setChapterView(null)} className="flex items-center gap-1.5 text-[#4d4398] text-sm font-semibold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Chapters
        </button>
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {ch.image_url && (
              <img src={ch.image_url} alt="" className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                onError={e => e.target.style.display = 'none'} />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl">{ch.icon}</span>
                <h3 className="text-base font-bold text-gray-800 truncate">{ch.title}</h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {story?.icon} {story?.title} · {chTasks.length} tasks · {chTasks.length * 10} XP
              </p>
              {ch.chapter_dialog && (
                <p className="text-xs text-[#4d4398] mt-1 italic">
                  💬 "{ch.chapter_dialog.slice(0, 90)}{ch.chapter_dialog.length > 90 ? '…' : ''}"
                </p>
              )}
            </div>
          </div>
          <button onClick={() => newTask(ch.id)}
            className="flex items-center gap-2 px-4 py-2 bg-[#4d4398] hover:bg-[#3e2f7f] text-white rounded-lg text-sm font-semibold transition-colors flex-shrink-0">
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
        <Table
          head={['#', 'Type', 'Ram says', 'Question', 'Mood', 'Correct Answer', 'Hint', 'Created', 'Actions']}
          footer={<><span>{chTasks.length} tasks</span><span>{chTasks.length * 10} XP</span></>}
        >
          {chTasks.length === 0 && (
            <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">No tasks yet — add the first one!</td></tr>
          )}
          {chTasks.map((t, i) => {
            const tp = TASK_TYPES.find(x => x.v === t.type) || TASK_TYPES[0];
            const shortAns = t.correct_answer
              ? (t.correct_answer.length > 32 ? t.correct_answer.slice(0, 32) + '…' : t.correct_answer)
              : '—';
            return (
              <Tr key={t.id} i={i}>
                <Td mono muted>#{t.order_no}</Td>
                <Td>
                  <span className="inline-flex items-center gap-1 bg-[#4d4398]/10 text-[#4d4398] text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                    {tp.i} {tp.l}
                  </span>
                </Td>
                <Td><span className="block max-w-[180px] truncate text-xs">{t.dialog}</span></Td>
                <Td muted><span className="block max-w-[160px] truncate text-xs">{t.question || '—'}</span></Td>
                <Td className="text-lg">{MOOD_E[t.mood] || '🧑‍💻'}</Td>
                <Td><span className="block max-w-[130px] truncate text-xs font-mono text-gray-500">{shortAns}</span></Td>
                <Td>
                  {t.hint
                    ? <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2 py-0.5 rounded-full">💡 Has hint</span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </Td>
                <Td muted className="text-xs whitespace-nowrap">{fmtShort(t.created_at)}</Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => editTask(t)} className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => delTask(t.id)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </Td>
              </Tr>
            );
          })}
        </Table>
        {modal === 'task' && (
          <Modal title={editId ? 'Edit Task' : 'New Task'} onClose={() => setModal(null)} onSave={saveTask} saving={saving} wide>
            <TaskForm f={tF} setF={setTF} set={S(setTF)} chapters={chapters} stories={stories} err={err} />
          </Modal>
        )}
      </div>
    );
  }

  /* ── Chapters list ── */
  const filtered = storyFilter === 'all' ? [...chapters] : chapters.filter(c => c.story_id === storyFilter);
  const sortedCh = [...filtered].sort((a, b) => a.order_no - b.order_no);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{filtered.length} chapters</p>
          <div className="relative">
            <select value={storyFilter} onChange={e => setStoryFilter(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 bg-white focus:outline-none focus:border-[#4d4398] appearance-none cursor-pointer">
              <option value="all">All stories</option>
              {stories.map(s => <option key={s.id} value={s.id}>{s.icon} {s.title}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        <button onClick={() => newChapter()}
          className="flex items-center gap-2 px-4 py-2 bg-[#4d4398] hover:bg-[#3e2f7f] text-white rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Create Chapter
        </button>
      </div>

      <Table
        head={['', 'Title', 'Story', 'Tasks', 'Order', 'Opening Dialog', 'Image', 'Img Pos', 'Created', 'Actions']}
        footer={<><span>{filtered.length} chapters</span><span>{tasks.length} total tasks</span></>}
      >
        {sortedCh.length === 0 && (
          <tr><td colSpan={10} className="px-4 py-14 text-center text-gray-400 text-sm">No chapters yet — create one!</td></tr>
        )}
        {sortedCh.map((c, i) => {
          const story = stories.find(s => s.id === c.story_id);
          const tc    = tasks.filter(t => t.chapter_id === c.id).length;
          return (
            <Tr key={c.id} i={i}>
              <Td><span className="text-2xl">{c.icon}</span></Td>
              <Td><span className="font-semibold text-gray-800 block max-w-[150px] truncate">{c.title}</span></Td>
              <Td muted>
                {story
                  ? <span className="text-xs flex items-center gap-1">{story.icon} <span className="truncate max-w-[100px]">{story.title}</span></span>
                  : <span className="text-gray-300">—</span>}
              </Td>
              <Td><span className="text-sm font-semibold text-gray-700">{tc}</span></Td>
              <Td muted className="text-center text-sm">{c.order_no}</Td>
              <Td muted><span className="block max-w-[140px] truncate text-xs">{c.chapter_dialog || '—'}</span></Td>
              <Td>
                {c.image_url
                  ? <img src={c.image_url} alt="" onError={e => e.target.style.display = 'none'} className="w-12 h-8 object-cover rounded border border-gray-200" />
                  : <span className="text-gray-300 text-xs">—</span>}
              </Td>
              <Td muted className="text-xs capitalize">{c.image_position || 'center'}</Td>
              <Td muted className="text-xs whitespace-nowrap">{fmtShort(c.created_at)}</Td>
              <Td>
                <div className="flex items-center gap-1">
                  <button onClick={() => setChapterView(c)}
                    className="flex items-center gap-1 px-2 py-1.5 bg-[#4d4398] hover:bg-[#3e2f7f] text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap">
                    ⚡ Tasks
                  </button>
                  <button onClick={() => editChapter(c)} className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => delChapter(c.id)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </Td>
            </Tr>
          );
        })}
      </Table>

      {modal === 'chapter' && (
        <Modal title={editId ? 'Edit Chapter' : 'New Chapter'} onClose={() => setModal(null)} onSave={saveChapter} saving={saving}>
          <ChapterForm f={cF} set={S(setCF)} setF={setCF} stories={stories} err={err} />
        </Modal>
      )}
    </div>
  );
}

// Default export — just StoriesPage (used if someone imports default)
export default StoriesPage;