// src/components/student/StoryMode.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const ATL      = '#4d4398';
const ATL_DARK = '#3e2f7f';

const CSS = `
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes popIn   { 0%{opacity:0;transform:translateY(-12px) scale(.9)} 60%{transform:translateY(2px) scale(1.02)} 100%{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes popOut  { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-8px) scale(.95)} }
  @keyframes shake   { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
  .pop-in  { animation: popIn  .25s ease both; }
  .pop-out { animation: popOut .2s ease both; }
  .shake   { animation: shake  .4s ease; }
`;

// ── Ram character images — all in /public/ folder ──
const RAM_IMGS = {
  default:   '/intro.png',
  thinking:  '/thinking.png',
  correct:   '/celebration.png',
  wrong:     '/confuse.png',
  happy:     '/thumbs up.png',
  excited:   '/celebration.png',
  sad:       '/confuse.png',
  play:      '/play.png',
};

const MOODS = {
  default:  { emoji: '🧑‍💻' },
  thinking: { emoji: '🤔'   },
  correct:  { emoji: '😄'   },
  wrong:    { emoji: '😬'   },
  happy:    { emoji: '😄'   },
  excited:  { emoji: '🥳'   },
  sad:      { emoji: '😢'   },
};

// ─── Header ──────────────────────────────────────────────────
const Header = ({ onLogout }) => {
  const navigate = useNavigate();
  const NAV = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Lessons',   path: '/lessons'   },
    { label: 'Practice',  path: '/practice'  },
    { label: 'Chat',      path: '/chat'       },
    { label: 'Resources', path: '/resources' },
  ];
  return (
    <header style={{ background: ATL_DARK, position: 'sticky', top: 0, zIndex: 100 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer', userSelect: 'none' }}>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 1, fontFamily: 'system-ui,sans-serif', lineHeight: 1 }}>ATL</div>
          <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 8, letterSpacing: 3, fontFamily: 'system-ui,sans-serif', marginTop: 2 }}>ANYTIME LEARNING</div>
        </div>
        <nav style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
          {NAV.map(item => {
            const isActive = item.label === 'Practice';
            return (
              <button key={item.label} onClick={() => navigate(item.path)} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                fontWeight: isActive ? 600 : 400, color: '#fff', fontFamily: 'system-ui,sans-serif',
                padding: '0 0 2px 0', borderBottom: isActive ? '2px solid #fff' : '2px solid transparent',
                opacity: isActive ? 1 : .8,
              }}>{item.label}</button>
            );
          })}
        </nav>
        <button onClick={onLogout} style={{ background: '#fff', color: ATL_DARK, border: 'none', padding: '7px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui,sans-serif' }}>
          Logout
        </button>
      </div>
    </header>
  );
};

// ─── Helpers ─────────────────────────────────────────────────
const norm    = s => s?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]=a[i-1]===b[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
};
const fuzzyMatch = (input, answer) => {
  const a = norm(input), b = norm(answer);
  if (a === b) return true;
  if (b.length >= 4 && levenshtein(a, b) <= 1) return true;
  return false;
};

// ── Sync XP to localStorage so Home.jsx XP card stays in sync ──
const syncXpToLocal = (xpEarned) => {
  try {
    const current = parseInt(localStorage.getItem('atl_xp') || '0', 10);
    const updated = current + xpEarned;
    localStorage.setItem('atl_xp',       String(updated));
    localStorage.setItem('atl_xp_total', String(updated));
  } catch {}
};

// ══════════════════════════════════════════════════════════════
// STORY HOME
// ══════════════════════════════════════════════════════════════
const StoryHome = ({ stories, onSelectChapter, onLogout }) => (
  <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: 'system-ui,sans-serif' }}>
    <style>{CSS}</style>
    <Header onLogout={onLogout} />

    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

      {/* Page title */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e1b4b' }}>Story Mode</h1>
        <p style={{ margin: '5px 0 0', fontSize: 13, color: '#6b7280' }}>
          Learn to code by helping Ram build real projects — one chapter at a time.
        </p>
      </div>

      {stories.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '56px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 14, fontWeight: 600 }}>No stories available yet.</p>
        </div>
      )}

      {stories.map(story => {
        const chapters = story.chapters || [];
        const done     = chapters.filter(c => c.completed).length;
        const pct      = chapters.length ? Math.round((done / chapters.length) * 100) : 0;
        const nextIdx  = chapters.findIndex(c => !c.completed);
        const enriched = chapters.map((ch, i) => ({
          ...ch,
          chapterNum: i + 1,
          prev_completed: i === 0 || !!chapters[i - 1]?.completed,
        }));

        return (
          <div key={story.id} style={{ marginBottom: 36 }}>

            {/* ── Story banner ── */}
            <div style={{
              background: story.cover_image
                ? `linear-gradient(rgba(30,27,75,.65), rgba(30,27,75,.75)), url(${story.cover_image}) center/cover no-repeat`
                : `linear-gradient(135deg, ${ATL_DARK} 0%, ${ATL} 100%)`,
              borderRadius: '10px 10px 0 0',
              padding: '24px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                {/* Ram character */}
                <div style={{ width: 72, height: 72, flexShrink: 0 }}>
                  <img src={RAM_IMGS.default} alt="Ram"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,.35))' }}
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                  />
                  <div style={{ fontSize: 40, display: 'none', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>🧑‍💻</div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: '0 0 3px', fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{story.title}</p>
                  {story.description && (
                    <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,.75)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {story.description}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.6)' }}>
                    {chapters.length} chapters · {done} completed
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{pct}%</p>
                <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,.25)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#4ade80' : '#fff', borderRadius: 3, transition: 'width .4s' }} />
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 10, color: 'rgba(255,255,255,.6)' }}>
                  {pct === 100 ? 'Completed! 🎉' : `${chapters.length - done} chapters left`}
                </p>
              </div>
            </div>

            {/* ── Chapter list ── */}
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              padding: '20px 22px',
            }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', top: 36, left: 20, right: 20, height: 2,
                  background: '#e5e7eb', zIndex: 0,
                }} />

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(enriched.length, 5)}, 1fr)`,
                  gap: 12,
                  position: 'relative', zIndex: 1,
                }}>
                  {enriched.map((ch, i) => {
                    const locked  = !ch.prev_completed;
                    const isDone  = ch.completed;
                    const isNext  = !isDone && !locked;
                    const taskCt  = ch.tasks_count || ch.tasks?.length || 0;

                    return (
                      <div key={ch.id}
                        onClick={() => !locked && onSelectChapter(story, ch)}
                        style={{
                          display: 'flex', flexDirection: 'column',
                          cursor: locked ? 'not-allowed' : 'pointer',
                          opacity: locked ? 0.55 : 1,
                        }}>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: isDone ? 18 : locked ? 14 : 16,
                            background: isDone ? '#22c55e' : isNext ? ATL : '#e5e7eb',
                            color: isDone || isNext ? '#fff' : '#9ca3af',
                            fontWeight: 800,
                            border: isNext ? `3px solid ${ATL_DARK}` : isDone ? '3px solid #16a34a' : '3px solid #e5e7eb',
                            boxShadow: isNext ? `0 0 0 4px rgba(77,67,152,.15)` : 'none',
                          }}>
                            {isDone ? '✓' : locked ? '🔒' : ch.icon || i + 1}
                          </div>
                        </div>

                        <div style={{
                          flex: 1,
                          border: `1.5px solid ${isDone ? '#86efac' : isNext ? ATL : '#e5e7eb'}`,
                          background: isDone ? '#f0fdf4' : isNext ? '#fafaff' : '#fafafa',
                          borderRadius: 8,
                          overflow: 'hidden',
                          display: 'flex', flexDirection: 'column',
                        }}>
                          {ch.image_url && !locked ? (
                            <div style={{ height: 72, overflow: 'hidden' }}>
                              <img src={ch.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={e => e.target.parentNode.style.display = 'none'} />
                            </div>
                          ) : (
                            <div style={{ height: 44, background: isDone ? '#dcfce7' : locked ? '#f3f4f6' : '#edeaff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                              {ch.icon || '⭐'}
                            </div>
                          )}

                          <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: isDone ? '#16a34a' : locked ? '#9ca3af' : ATL, textTransform: 'uppercase', letterSpacing: .6 }}>
                              Chapter {ch.chapterNum}
                            </p>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: locked ? '#9ca3af' : '#1e1b4b', lineHeight: 1.35 }}>
                              {ch.title}
                            </p>
                            {isDone && (
                              <div style={{ display: 'flex', gap: 1, margin: '2px 0' }}>
                                {[1,2,3].map(s => <span key={s} style={{ fontSize: 11, opacity: s <= (ch.stars||3) ? 1 : .2 }}>⭐</span>)}
                              </div>
                            )}
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{taskCt} tasks</p>
                          </div>

                          <button
                            disabled={locked}
                            onClick={e => { e.stopPropagation(); if (!locked) onSelectChapter(story, ch); }}
                            style={{
                              width: '100%', border: 'none',
                              padding: '8px 0', fontSize: 12, fontWeight: 700,
                              cursor: locked ? 'not-allowed' : 'pointer',
                              fontFamily: 'system-ui,sans-serif',
                              background: isDone ? '#16a34a' : locked ? '#d1d5db' : ATL,
                              color: '#fff',
                            }}>
                            {isDone ? '↺ Replay' : locked ? 'Locked' : '▶ Start'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom summary row */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    <span style={{ fontWeight: 700, color: '#22c55e' }}>{done}</span> / {chapters.length} done
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    ⚡ <span style={{ fontWeight: 700, color: ATL }}>{done * 30}</span> XP earned
                  </span>
                </div>
                {nextIdx >= 0 && (
                  <button
                    onClick={() => onSelectChapter(story, chapters[nextIdx])}
                    style={{ background: ATL, color: '#fff', border: 'none', padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'system-ui,sans-serif', borderRadius: 6 }}>
                    {done === 0 ? '▶ Start Story' : '▶ Continue'}
                  </button>
                )}
                {pct === 100 && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>🎉 Story Complete!</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════
// FEEDBACK POPUP
// ══════════════════════════════════════════════════════════════
const FeedbackPopup = ({ type, msg }) => {
  if (!type) return null;
  const isOk = type === 'correct';
  return (
    <div style={{
      position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 999, pointerEvents: 'none',
    }} className="pop-in">
      <div style={{
        background: isOk ? '#22c55e' : '#ef4444',
        color: '#fff', fontWeight: 800, padding: '12px 28px',
        fontSize: 15, letterSpacing: .3, boxShadow: '0 4px 20px rgba(0,0,0,.18)',
        fontFamily: 'system-ui,sans-serif', whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 20 }}>{isOk ? '🎉' : '❌'}</span>
        {msg}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// RAM CARD
// ══════════════════════════════════════════════════════════════
const RamCard = ({ mood, dialog, taskIdx, totalTasks, idx }) => {
  const isRight  = taskIdx % 2 === 1;
  const moodData = MOODS[mood] || MOODS.default;
  const ramSrc   = RAM_IMGS[mood] || RAM_IMGS.default;
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => { setImgFailed(false); }, [ramSrc]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: isRight ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 12,
      marginBottom: 24,
    }}>
      <div style={{ width: 90, height: 110, flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        {!imgFailed ? (
          <img
            key={ramSrc}
            src={ramSrc}
            alt="Ram"
            style={{
              width: '100%', height: '100%', objectFit: 'contain',
              transform: isRight ? 'scaleX(-1)' : 'none',
            }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div style={{ fontSize: 56, lineHeight: 1 }}>{moodData.emoji}</div>
        )}
      </div>

      <div style={{
        flex: 1, position: 'relative',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: isRight ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
        padding: '13px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,.06)',
      }}>
        <div style={{
          position: 'absolute',
          bottom: 14,
          [isRight ? 'right' : 'left']: -9,
          width: 0, height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          [isRight ? 'borderLeft' : 'borderRight']: '9px solid #fff',
          filter: 'drop-shadow(' + (isRight ? '2px' : '-2px') + ' 0px 1px rgba(0,0,0,.08))',
        }} />
        <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: ATL, textTransform: 'uppercase', letterSpacing: .8 }}>
          Ram says
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#1e1b4b', lineHeight: 1.6, fontWeight: 500 }}>
          {dialog}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 10, color: '#9ca3af' }}>
          Task {idx + 1} of {totalTasks}
        </p>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// TASK COMPONENTS
// ══════════════════════════════════════════════════════════════

const MCQ = ({ task, onCorrect, onWrong }) => {
  const [sel, setSel]   = useState(null);
  const [done, setDone] = useState(false);
  const letters = ['A', 'B', 'C', 'D'];
  const opts = Array.isArray(task.options)
    ? task.options
    : (() => { try { return JSON.parse(task.options||'[]'); } catch { return []; } })();

  const pick = opt => {
    if (done) return;
    setSel(opt); setDone(true);
    setTimeout(opt === task.correct_answer ? onCorrect : onWrong, 700);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {opts.map((opt, i) => {
        const ok  = done && opt === task.correct_answer;
        const bad = done && sel === opt && !ok;
        const dim = done && !ok && sel !== opt;
        return (
          <button key={i} onClick={() => pick(opt)} disabled={done} style={{
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '13px 16px',
            textAlign: 'left', cursor: done ? 'default' : 'pointer',
            border: `2px solid ${ok ? '#22c55e' : bad ? '#ef4444' : '#e5e7eb'}`,
            background: ok ? '#f0fdf4' : bad ? '#fef2f2' : dim ? '#fafafa' : '#fff',
            fontFamily: 'system-ui,sans-serif', fontSize: 14, fontWeight: 500,
            color: ok ? '#166534' : bad ? '#991b1b' : dim ? '#9ca3af' : '#1e1b4b',
            transition: 'border-color .15s',
          }}>
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: ok ? '#22c55e' : bad ? '#ef4444' : '#f3f4f6', color: ok||bad ? '#fff' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
              {ok ? '✓' : bad ? '✗' : letters[i]}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
};

const TypeAns = ({ task, onCorrect, onWrong }) => {
  const [val, setVal] = useState(task.starter_code || '');
  const [st, setSt]   = useState(null);
  const check = useCallback(() => {
    if (fuzzyMatch(val, task.correct_answer)) { setSt('ok'); setTimeout(onCorrect, 400); }
    else { setSt('bad'); setTimeout(() => setSt(null), 1400); onWrong(); }
  }, [val, task.correct_answer, onCorrect, onWrong]);
  useEffect(() => {
    const h = e => { if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); check(); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [check]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <textarea value={val} onChange={e=>setVal(e.target.value)} rows={4} placeholder="Type your answer…" spellCheck={false}
        className={st==='bad'?'shake':''}
        style={{ width:'100%', padding:'11px 14px', border:`2px solid ${st==='ok'?'#22c55e':st==='bad'?'#ef4444':'#e5e7eb'}`, background:st==='ok'?'#f0fdf4':st==='bad'?'#fef2f2':'#fff', fontFamily:'monospace', fontSize:14, color:'#1e1b4b', resize:'none', outline:'none', boxSizing:'border-box' }} />
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button onClick={check} style={{ flex:1, background:ATL, color:'#fff', border:'none', padding:'11px 0', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'system-ui,sans-serif' }}>
          Check Answer
        </button>
        <span style={{ fontSize:11, color:'#9ca3af', background:'#f3f4f6', padding:'7px 10px', fontFamily:'monospace' }}>Ctrl+S</span>
      </div>
    </div>
  );
};

const FillBlank = ({ task, onCorrect, onWrong }) => {
  const template = task.template || task.question || '';
  const parts    = template.split('___');
  const blanks   = parts.length - 1;
  const answers  = (task.correct_answer || '').split(',').map(s => s.trim());
  const [vals, setVals] = useState(Array(Math.max(blanks, 1)).fill(''));
  const [st, setSt]     = useState(null);
  const refs = useRef([]);

  const check = () => {
    if (blanks === 0) {
      if (fuzzyMatch(vals[0], task.correct_answer)) { setSt('ok'); setTimeout(onCorrect, 400); }
      else { setSt('bad'); setTimeout(() => setSt(null), 1500); onWrong(); }
      return;
    }
    const allMatch = vals.every((v, i) => fuzzyMatch(v, answers[i]||''));
    if (allMatch) { setSt('ok'); setTimeout(onCorrect, 400); }
    else { setSt('bad'); setTimeout(() => setSt(null), 1500); onWrong(); }
  };

  if (parts.length <= 1) return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <p style={{ margin:0, fontSize:16, fontWeight:600, color:'#1e1b4b', lineHeight:1.6 }}>{template}</p>
      <input value={vals[0]||''} onChange={e=>{setVals([e.target.value]);setSt(null);}} onKeyDown={e=>e.key==='Enter'&&check()} placeholder="Type your answer…"
        style={{ padding:'11px 14px', border:`2px solid ${st==='ok'?'#22c55e':st==='bad'?'#ef4444':'#e5e7eb'}`, outline:'none', fontSize:15, fontFamily:'system-ui,sans-serif', boxSizing:'border-box', width:'100%', background:st==='ok'?'#f0fdf4':st==='bad'?'#fef2f2':'#fff' }} />
      <button onClick={check} style={{ background:ATL, color:'#fff', border:'none', padding:'11px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'system-ui,sans-serif' }}>Check Answer</button>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ fontSize:16, lineHeight:2.4, color:'#1e1b4b', fontWeight:500, padding:'12px 0' }}>
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            <span>{p}</span>
            {i < blanks && (
              <input
                ref={el => refs.current[i] = el}
                value={vals[i]}
                onChange={e => { const n=[...vals]; n[i]=e.target.value; setVals(n); if(st==='bad') setSt(null); }}
                onKeyDown={e => { if(e.key==='Enter') { i<blanks-1 ? refs.current[i+1]?.focus() : check(); } }}
                style={{
                  display: 'inline-block',
                  border: 'none',
                  borderBottom: `2.5px solid ${st==='bad'?'#ef4444':ATL}`,
                  outline: 'none',
                  textAlign: 'center',
                  color: st==='bad'?'#ef4444':ATL,
                  fontWeight: 700,
                  fontSize: 16,
                  fontFamily: 'system-ui,sans-serif',
                  background: 'transparent',
                  padding: '0 4px',
                  margin: '0 2px',
                  minWidth: 70,
                  width: Math.max(70, ((answers[i]||'').length * 12 + 24)),
                  verticalAlign: 'middle',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      {st === 'bad' && <p style={{ margin:0, color:'#ef4444', fontSize:13, fontWeight:600 }}>Not quite — check your answer!</p>}
      <button onClick={check} style={{ background:ATL, color:'#fff', border:'none', padding:'11px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'system-ui,sans-serif' }}>Check Answer</button>
    </div>
  );
};

const KeyboardTask = ({ task, onCorrect, onWrong }) => {
  const [pressed, setPressed] = useState([]);
  const [st, setSt]           = useState(null);
  const expected = (task.correct_answer||'CTRL+S').toUpperCase().split('+');
  useEffect(() => {
    const h = e => {
      const c=[];
      if(e.ctrlKey) c.push('CTRL');
      if(e.altKey)  c.push('ALT');
      if(e.shiftKey)c.push('SHIFT');
      const k=e.key.toUpperCase();
      if(!['CONTROL','ALT','SHIFT'].includes(k)) c.push(k);
      setPressed(c);
      if(c.join('+')=== expected.join('+')) { e.preventDefault(); setSt('ok'); setTimeout(onCorrect,700); }
      else if(c.length>=expected.length) { setSt('bad'); setTimeout(()=>{setSt(null);setPressed([]);},1200); onWrong(); }
    };
    window.addEventListener('keydown',h); return()=>window.removeEventListener('keydown',h);
  },[]);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, alignItems:'center' }}>
      <p style={{ margin:0, fontSize:13, color:'#6b7280', fontWeight:600 }}>Press the keyboard shortcut:</p>
      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
        {expected.map((k,i)=>(
          <React.Fragment key={i}>
            {i>0&&<span style={{fontSize:12,color:'#9ca3af'}}>+</span>}
            <span style={{ background:'#1e1b4b', color:'#fff', padding:'8px 14px', fontSize:13, fontWeight:800, fontFamily:'monospace', borderRadius:6, boxShadow:'0 2px 0 rgba(0,0,0,.3)' }}>{k}</span>
          </React.Fragment>
        ))}
      </div>
      {pressed.length>0&&(
        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
          <span style={{ fontSize:11, color:'#9ca3af' }}>You pressed:</span>
          {pressed.map((k,i)=>(
            <span key={i} style={{ background: st==='ok'?'#22c55e':st==='bad'?'#ef4444':'#6b7280', color:'#fff', padding:'5px 10px', fontSize:12, fontFamily:'monospace', fontWeight:700 }}>{k}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const TrueFalse = ({ task, onCorrect, onWrong }) => {
  const [sel, setSel]   = useState(null);
  const [done, setDone] = useState(false);
  const stmt    = task.tf_statement || task.question || '';
  const correct = (task.correct_answer||'').toString().toLowerCase();

  const pick = val => {
    if (done) return;
    setSel(val); setDone(true);
    setTimeout(val === correct ? onCorrect : onWrong, 700);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {stmt && <p style={{ margin:0, fontSize:15, fontWeight:600, color:'#1e1b4b', background:'#f9fafb', border:'1px solid #e5e7eb', padding:'14px 16px', lineHeight:1.6 }}>{stmt}</p>}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {['true','false'].map(v => {
          const isOk  = done && v===correct;
          const isBad = done && sel===v && !isOk;
          return (
            <button key={v} onClick={() => pick(v)} disabled={done} style={{
              padding:'16px', border:`2px solid ${isOk?'#22c55e':isBad?'#ef4444':'#e5e7eb'}`,
              background: isOk?'#f0fdf4':isBad?'#fef2f2':'#fff',
              cursor: done?'default':'pointer', fontFamily:'system-ui,sans-serif',
              fontSize:16, fontWeight:800,
              color: isOk?'#166534':isBad?'#991b1b':'#1e1b4b',
            }}>
              {v==='true' ? '✅ True' : '❌ False'}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DragDrop = ({ task, onCorrect, onWrong, onNext }) => {
  const rawItems = Array.isArray(task.drag_items)
    ? task.drag_items
    : typeof task.drag_items==='string'
      ? task.drag_items.split(',').map(s=>s.trim()).filter(Boolean)
      : (task.correct_answer||'').split('|||').filter(Boolean);
  const correct = (task.correct_answer||'').split('|||').filter(Boolean).length
    ? (task.correct_answer||'').split('|||').filter(Boolean)
    : rawItems;
  const [items,setItems] = useState(()=>shuffle([...rawItems]));
  const [st,setSt]       = useState(null);
  const [dIdx,setDIdx]   = useState(null);
  const [oIdx,setOIdx]   = useState(null);

  const onDrop = (e,i) => { e.preventDefault(); if(dIdx===null||dIdx===i) return; const a=[...items]; const[m]=a.splice(dIdx,1); a.splice(i,0,m); setItems(a); setDIdx(null); setOIdx(null); };
  const check  = () => {
    const ok=correct.length>1?items.every((x,i)=>x===correct[i]):items[0]===task.correct_answer;
    if(ok){setSt('ok');setTimeout(onCorrect,500);}else{setSt('bad');onWrong();}
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <p style={{ margin:0, fontSize:12, fontWeight:600, color:'#6b7280', textAlign:'center' }}>↕ Drag into the correct order</p>
      <div style={{ border:`2px solid ${st==='ok'?'#22c55e':st==='bad'?'#ef4444':'#e5e7eb'}`, padding:8, background:'#f9fafb', display:'flex', flexDirection:'column', gap:6 }}>
        {items.map((item,i)=>(
          <div key={item} draggable
            onDragStart={e=>{setDIdx(i);e.dataTransfer.effectAllowed='move';}}
            onDragOver={e=>{e.preventDefault();setOIdx(i);}}
            onDrop={e=>onDrop(e,i)}
            onDragEnd={()=>{setDIdx(null);setOIdx(null);}}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'#fff', border:`1.5px solid ${oIdx===i?ATL:'#e5e7eb'}`, cursor:st==='ok'?'default':'grab', userSelect:'none', fontSize:14, fontFamily:'system-ui,sans-serif', opacity:dIdx===i?.4:1 }}>
            <span style={{ color:'#9ca3af' }}>⠿</span>
            <span style={{ flex:1, fontWeight:600, color:'#1e1b4b' }}>{item}</span>
            <span style={{ width:24, height:24, background:'#f3f4f6', fontSize:12, color:'#6b7280', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{i+1}</span>
          </div>
        ))}
      </div>
      {st==='bad'&&<p style={{ margin:0, color:'#ef4444', fontSize:13, textAlign:'center', fontWeight:600 }}>Not right — rearrange and try again</p>}
      {st!=='ok'&&<button onClick={check} style={{ background:ATL, color:'#fff', border:'none', padding:'11px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'system-ui,sans-serif' }}>Check Order</button>}
      {st==='bad'&&<button onClick={onNext} style={{ background:'#f9fafb', color:'#6b7280', border:'1.5px solid #e5e7eb', padding:'10px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'system-ui,sans-serif' }}>Skip &amp; Next →</button>}
    </div>
  );
};

const MatchPairs = ({ task, onCorrect, onWrong }) => {
  const rawAnswer=task.correct_answer||'';
  let pairs=[];
  if(rawAnswer.includes('|||')) pairs=rawAnswer.split('|||').map(p=>p.split('::')).filter(p=>p.length===2);
  else if(rawAnswer.includes(',')&&rawAnswer.includes('|')) pairs=rawAnswer.split(',').map(p=>{const[l,r]=p.split('|');return[l?.trim(),r?.trim()];}).filter(p=>p[0]&&p[1]);
  else pairs=rawAnswer.split(',').map(p=>p.split('::')).filter(p=>p.length===2);
  if(pairs.length===0&&task.match_left&&task.match_right){
    const left=Array.isArray(task.match_left)?task.match_left:task.match_left.split(',').map(s=>s.trim());
    const right=Array.isArray(task.match_right)?task.match_right:task.match_right.split(',').map(s=>s.trim());
    pairs=left.map((l,i)=>[l,right[i]]).filter(p=>p[0]&&p[1]);
  }
  const left=pairs.map(p=>p[0]);
  const right=useRef(shuffle(pairs.map(p=>p[1]))).current;
  const[sel,setSel]=useState(null);const[matched,setMatched]=useState([]);const[wrong,setWrong]=useState(null);const[done,setDone]=useState(false);
  const pickL=i=>{if(matched.find(m=>m.l===i))return;setSel({s:'l',i});};
  const pickR=i=>{
    if(matched.find(m=>m.r===i)||!sel||sel.s!=='l')return;
    const lv=left[sel.i],rv=right[i],cr=pairs.find(p=>p[0]===lv)?.[1];
    if(rv===cr){const nm=[...matched,{l:sel.i,r:i}];setMatched(nm);setSel(null);if(nm.length===pairs.length){setDone(true);setTimeout(onCorrect,700);}}
    else{setWrong({l:sel.i,r:i});setTimeout(()=>{setWrong(null);setSel(null);onWrong();},1000);}
  };
  const bStyle=(isM,isSel,isW)=>({width:'100%',padding:'12px 14px',textAlign:'left',fontSize:13,fontWeight:600,cursor:isM?'default':'pointer',border:`1.5px solid ${isM?'#22c55e':isW?'#ef4444':isSel?ATL:'#e5e7eb'}`,background:isM?'#f0fdf4':isW?'#fef2f2':isSel?'#edeaff':'#fff',color:isM?'#166534':isW?'#991b1b':isSel?ATL:'#1e1b4b',fontFamily:'system-ui,sans-serif'});
  return(
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <p style={{margin:0,color:'#6b7280',fontSize:12,fontWeight:600,textAlign:'center'}}>Click a left item, then click its match on the right</p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <div style={{display:'flex',flexDirection:'column',gap:5}}>{left.map((item,i)=>{const isM=matched.find(m=>m.l===i),isSel=sel?.s==='l'&&sel?.i===i,isW=wrong?.l===i;return<button key={i} onClick={()=>pickL(i)} disabled={!!isM||done} style={bStyle(!!isM,!!isSel,!!isW)}>{isM?'✓ ':''}{item}</button>;})}</div>
        <div style={{display:'flex',flexDirection:'column',gap:5}}>{right.map((item,i)=>{const isM=matched.find(m=>m.r===i),isW=wrong?.r===i;return<button key={i} onClick={()=>pickR(i)} disabled={!!isM||done} style={bStyle(!!isM,false,!!isW)}>{isM?'✓ ':''}{item}</button>;})}</div>
      </div>
    </div>
  );
};

const SceneTask = ({ task, onCorrect }) => {
  const total=Number(task.scene_steps)||5;
  const[pos,setPos]=useState(0);const[facing,setFacing]=useState('right');const[done,setDone]=useState(false);
  useEffect(()=>{
    const h=e=>{if(done)return;if(e.key==='ArrowRight'){e.preventDefault();doMove('right');}if(e.key==='ArrowLeft'){e.preventDefault();doMove('left');}};
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h);
  },[total,done,pos]);
  const doMove=dir=>{if(done)return;setFacing(dir);if(dir==='right'){setPos(p=>{const n=Math.min(p+1,total);if(n===total){setDone(true);setTimeout(onCorrect,1000);}return n;});}else{setPos(p=>Math.max(p-1,0));}};
  const pct=(pos/total)*100;
  return(
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <p style={{margin:0,background:'#fffbeb',border:'1px solid #fcd34d',padding:'10px 14px',fontSize:13,fontWeight:600,color:'#92400e',textAlign:'center'}}>
        🎮 {task.scene_instruction||'Help Ram walk to his laptop!'}
      </p>
      <div style={{position:'relative',background:'#e0f2fe',border:'1px solid #e5e7eb',height:100,overflow:'hidden'}}>
        <div style={{position:'absolute',bottom:18,right:16,fontSize:26}}>💻</div>
        <div style={{position:'absolute',bottom:18,left:`calc(${pct*.72}% + 10px)`,fontSize:28,transition:'left 150ms',transform:`scaleX(${facing==='left'?-1:1})`}}>{done?'🎉':'🧑‍💻'}</div>
        {done&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.85)'}}>
          <span style={{background:ATL,color:'#fff',padding:'8px 18px',fontSize:13,fontWeight:700}}>🎉 Ram made it!</span>
        </div>}
      </div>
      <div style={{height:5,background:'#e5e7eb'}}><div style={{height:'100%',width:`${pct}%`,background:done?'#22c55e':ATL,transition:'width .2s'}}/></div>
      <div style={{display:'flex',gap:10,justifyContent:'center'}}>
        <button onClick={()=>doMove('left')}  disabled={done} style={{width:48,height:48,border:'1px solid #e5e7eb',background:'#fff',fontSize:18,cursor:done?'default':'pointer'}}>←</button>
        <button onClick={()=>doMove('right')} disabled={done} style={{width:48,height:48,border:`1px solid ${ATL}`,background:'#edeaff',fontSize:18,cursor:done?'default':'pointer',color:ATL,fontWeight:700}}>→</button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// PLAY SCREEN
// ══════════════════════════════════════════════════════════════
const TYPE_LABELS = { mcq:'Multiple Choice', type:'Type Answer', fill_blank:'Fill in Blank', keyboard:'Keyboard Shortcut', truefalse:'True / False', dragdrop:'Drag & Drop', match:'Match Pairs', scene:'Help Ram!' };
const TYPE_ICONS  = { mcq:'🎯', type:'⌨️', fill_blank:'✏️', keyboard:'🔑', truefalse:'✅', dragdrop:'🧩', match:'🔗', scene:'🎬' };

const CORRECT_MSGS = ['Correct! Great job 👍','That\'s right!','Well done! 🎉','Spot on!','Perfect answer!'];
const WRONG_MSGS   = ['Not quite — try again!','Give it another go!','Almost — try again!','Incorrect, try again!'];
const randFrom = arr => arr[Math.floor(Math.random() * arr.length)];

const PlayScreen = ({ story, chapter, tasks, onComplete, onBack, onLogout }) => {
  const [idx,       setIdx]       = useState(0);
  const [mood,      setMood]      = useState('thinking');
  const [ramTxt,    setRamTxt]    = useState('');
  const [showHint,  setShowHint]  = useState(false);
  const [wrongs,    setWrongs]    = useState(0);
  const [corrects,  setCorrects]  = useState(0);
  const [tKey,      setTKey]      = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [popup,     setPopup]     = useState(null);
  const popTimer = useRef(null);
  const cur = tasks[idx];

  useEffect(() => {
    if (!cur) return;
    setMood(cur.mood || 'thinking');
    setRamTxt(cur.dialog || "Let's do this!");
    setShowHint(false);
    setWrongs(0);
    setAttempted(false);
  }, [idx]);

  const showPopup = (type, msg) => {
    clearTimeout(popTimer.current);
    setPopup({ type, msg });
    popTimer.current = setTimeout(() => setPopup(null), 1800);
  };

  // ── Calculate stars based on final corrects ──────────────────
  const calcStars = (finalCorrects, total) => {
    if (finalCorrects === total) return 3;
    if (finalCorrects >= total * 0.7) return 2;
    if (finalCorrects >= total * 0.4) return 1;
    return 0;
  };

  // ── Advance to next task or finish chapter ───────────────────
  const advance = (countAsCorrect) => {
    const next          = idx + 1;
    const finalCorrects = corrects + (countAsCorrect ? 1 : 0);

    if (next >= tasks.length) {
      const stars = calcStars(finalCorrects, tasks.length);

      // Fire-and-forget: call API, capture real XP from response
      api.story.completeChapter(chapter.id, stars)
        .then(res => {
          const xpAwarded = res?.data?.xp_awarded ?? res?.xp_awarded ?? stars * 10;
          // Sync XP into localStorage so Home.jsx XP card reflects it immediately
          if (xpAwarded > 0) syncXpToLocal(xpAwarded);
          onComplete(finalCorrects, tasks.length, xpAwarded);
        })
        .catch(() => {
          // Still complete the screen even if API fails
          onComplete(finalCorrects, tasks.length, stars * 10);
        });
    } else {
      setIdx(next);
      setTKey(k => k + 1);
    }
  };

  const handleCorrect = () => {
    setCorrects(c => c + 1);
    setMood('happy');
    setRamTxt(randFrom(CORRECT_MSGS));
    showPopup('correct', randFrom(CORRECT_MSGS));
    setTimeout(() => advance(true), 1400);
  };

  const handleWrong = () => {
    const w = wrongs + 1; setWrongs(w); setMood('wrong');
    setAttempted(true);
    const msg = randFrom(WRONG_MSGS);
    setRamTxt(w >= 2 ? 'Check the hint below!' : msg);
    showPopup('wrong', msg);
    if (w >= 2) setShowHint(true);
    setTimeout(() => { setMood(cur?.mood||'thinking'); setRamTxt(cur?.dialog||'Try again!'); }, 2200);
  };

  const handleNext = () => advance(false);

  if (!cur) return null;
  const pct = Math.round((idx / tasks.length) * 100);

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:'system-ui,sans-serif' }}>
      <style>{CSS}</style>
      <Header onLogout={onLogout} />

      {popup && <FeedbackPopup type={popup.type} msg={popup.msg} />}

      {/* Top bar */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'10px 28px', display:'flex', alignItems:'center', gap:14 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:'#6b7280', display:'flex', alignItems:'center' }}>
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'#6b7280' }}>{story?.title} · {chapter.title}</span>
            <span style={{ fontSize:13, fontWeight:700, color:ATL }}>{idx+1} / {tasks.length}</span>
          </div>
          <div style={{ height:5, background:'#e5e7eb' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:ATL, transition:'width .3s' }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {tasks.map((_,i) => (
            <div key={i} style={{ height:6, width:i===idx?18:6, background:i<idx?'#22c55e':i===idx?ATL:'#e5e7eb', transition:'all .2s' }} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:640, margin:'0 auto', padding:'24px 20px 60px' }}>

        <RamCard
          mood={mood}
          dialog={ramTxt}
          taskIdx={idx}
          totalTasks={tasks.length}
          idx={idx}
        />

        {/* Task type chip */}
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#f0f0ff', border:'1px solid #ddd6fe', padding:'4px 12px', marginBottom:12 }}>
          <span style={{ fontSize:14 }}>{TYPE_ICONS[cur.type]||'🎯'}</span>
          <span style={{ fontSize:11, fontWeight:700, color:ATL, textTransform:'uppercase', letterSpacing:.8 }}>{TYPE_LABELS[cur.type]||'Challenge'}</span>
        </div>

        {/* Question */}
        {cur.question && (
          <h2 style={{ margin:'0 0 16px', fontSize:18, fontWeight:700, color:'#1e1b4b', lineHeight:1.4 }}>
            {cur.question}
          </h2>
        )}

        {/* Task */}
        <div key={tKey}>
          {cur.type==='mcq'        && <MCQ         task={cur} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {cur.type==='type'       && <TypeAns      task={cur} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {cur.type==='fill_blank' && <FillBlank    task={cur} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {cur.type==='keyboard'   && <KeyboardTask task={cur} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {cur.type==='truefalse'  && <TrueFalse    task={cur} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {cur.type==='dragdrop'   && <DragDrop     task={cur} onCorrect={handleCorrect} onWrong={handleWrong} onNext={handleNext}/>}
          {cur.type==='match'      && <MatchPairs   task={cur} onCorrect={handleCorrect} onWrong={handleWrong}/>}
          {cur.type==='scene'      && <SceneTask    task={cur} onCorrect={handleCorrect}/>}
        </div>

        {/* Hint */}
        {cur.hint && (
          <div style={{ marginTop:16 }}>
            {!showHint
              ? <button onClick={()=>setShowHint(true)} style={{ width:'100%', padding:'10px', border:'1px dashed #d1d5db', background:'none', color:'#9ca3af', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'system-ui,sans-serif' }}>
                  💡 Need a hint?
                </button>
              : <div style={{ background:'#fefce8', border:'1px solid #e5e7eb', padding:'11px 14px', fontSize:13, color:'#6b7280' }}>
                  💡 <strong style={{ color:'#1e1b4b' }}>Hint:</strong> {cur.hint}
                </div>
            }
          </div>
        )}

        {/* Skip (non-dragdrop) */}
        {attempted && cur.type !== 'dragdrop' && (
          <button onClick={handleNext} style={{ marginTop:10, width:'100%', padding:'10px', border:'1.5px solid #e5e7eb', background:'#f9fafb', color:'#6b7280', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'system-ui,sans-serif' }}>
            {idx+1 >= tasks.length ? 'Finish Chapter →' : 'Skip & Next →'}
          </button>
        )}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// RESULT SCREEN
// ══════════════════════════════════════════════════════════════
const ResultScreen = ({ chapter, correct, total, xpAwarded, onBack, onRetry, onLogout }) => {
  const stars  = correct===total?3:correct>=total*.7?2:correct>=total*.4?1:0;
  const labels = ['Keep trying!','Good start!','Well done!','Perfect!'];
  const pct    = total>0?Math.round((correct/total)*100):0;
  const ramImg = stars >= 2 ? RAM_IMGS.correct : stars === 0 ? RAM_IMGS.sad : RAM_IMGS.happy;
  // Use real XP from API; fall back to stars*10 if for some reason it wasn't passed
  const displayXp = xpAwarded ?? stars * 10;

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:'system-ui,sans-serif' }}>
      <style>{CSS}</style>
      <Header onLogout={onLogout} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'calc(100vh - 64px)', padding:24 }}>
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', maxWidth:380, width:'100%', padding:'28px 28px', textAlign:'center' }}>

          {/* Ram result image */}
          <div style={{ width:120, height:140, margin:'0 auto 4px', display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
            <img src={ramImg} alt="Ram" style={{ width:'100%', height:'100%', objectFit:'contain' }}
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
            />
            <div style={{ display:'none', fontSize:64 }}>{stars>=2?'🎉':stars===0?'😢':'👍'}</div>
          </div>

          <h2 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800, color:'#1e1b4b' }}>{labels[stars]}</h2>
          <p style={{ margin:'0 0 18px', fontSize:13, color:'#6b7280' }}>{chapter?.title}</p>
          <div style={{ display:'flex', gap:4, justifyContent:'center', marginBottom:18 }}>
            {[1,2,3].map(i=><span key={i} style={{ fontSize:32, opacity:i<=stars?1:.2 }}>⭐</span>)}
          </div>

          {/* Stats — real XP shown */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20 }}>
            {[
              { v:`${correct}/${total}`, l:'Correct'  },
              { v:`+${displayXp}`,       l:'XP Earned' },
              { v:`${pct}%`,             l:'Score'     },
            ].map(({v,l})=>(
              <div key={l} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', padding:'12px 8px' }}>
                <p style={{ margin:'0 0 2px', fontSize:20, fontWeight:800, color: l==='XP Earned'?ATL:'#1e1b4b' }}>{v}</p>
                <p style={{ margin:0, fontSize:11, color:'#6b7280', fontWeight:600 }}>{l}</p>
              </div>
            ))}
          </div>

          {/* XP skipped notice (replayed chapter) */}
          {displayXp === 0 && stars > 0 && (
            <p style={{ margin:'0 0 14px', fontSize:11, color:'#9ca3af' }}>
              XP already awarded for this chapter today.
            </p>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {stars<3&&<button onClick={onRetry} style={{ background:'#fff', color:ATL, border:`1.5px solid ${ATL}`, padding:'10px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'system-ui,sans-serif' }}>🔄 Try Again</button>}
            <button onClick={onBack} style={{ background:ATL, color:'#fff', border:'none', padding:'10px', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'system-ui,sans-serif' }}>← Back to Stories</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
export default function StoryMode({ user, onBack, onLogout }) {
  const [screen,   setScreen]   = useState('list');
  const [stories,  setStories]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [curStory, setCurStory] = useState(null);
  const [curCh,    setCurCh]    = useState(null);
  const [tasks,    setTasks]    = useState([]);
  const [rc,       setRc]       = useState(0);
  const [rt,       setRt]       = useState(0);
  const [xp,       setXp]       = useState(0); // ← real XP from API

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const r = await api.story.getAll();
      setStories(r.data || []);
    } catch (e) {
      console.error('StoryMode load error:', e);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  const startChapter = (story, ch) => {
    setCurStory(story); setCurCh(ch);
    setTasks((ch.tasks||[]).sort((a,b)=>a.order_no-b.order_no));
    setScreen('play');
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:'system-ui,sans-serif' }}>
      <style>{CSS}</style>
      <Header onLogout={onLogout} />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'calc(100vh - 64px)' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:36, height:36, border:`3px solid ${ATL}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 12px' }} />
          <p style={{ color:'#9ca3af', fontSize:14, margin:0 }}>Loading…</p>
        </div>
      </div>
    </div>
  );

  if (screen==='list')   return <StoryHome stories={stories} onSelectChapter={startChapter} onLogout={onLogout}/>;
  if (screen==='play')   return (
    <PlayScreen
      story={curStory}
      chapter={curCh}
      tasks={tasks}
      onComplete={(c, t, earnedXp) => { setRc(c); setRt(t); setXp(earnedXp); setScreen('result'); }}
      onBack={() => setScreen('list')}
      onLogout={onLogout}
    />
  );
  if (screen==='result') return (
    <ResultScreen
      chapter={curCh}
      correct={rc}
      total={rt}
      xpAwarded={xp}
      onBack={() => { load(); setScreen('list'); }}
      onRetry={() => setScreen('play')}
      onLogout={onLogout}
    />
  );
  return null;
}