// src/components/student/LessonView.jsx
// Full points integration: +1 per step, +5 lesson complete, +2/+5 assessment
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

const sleep = ms => new Promise(r => setTimeout(r, ms));

const PURPLE  = '#4d4398';
const PURPLE2 = '#3e2f7f';
const LIGHT   = '#eeecfb';
const INK     = '#1a1523';
const MUTED   = '#6b7280';
const BORDER  = '#e4e1f0';
const GREEN   = '#16a34a';
const RED     = '#dc2626';
const CREAM   = '#f7f6fb';

/* ══════════════════════════════════════════
   POINTS HELPER — with client-side dedup
══════════════════════════════════════════ */
const awardXP = async ({ userId, points, reason, refId, refType, meta }) => {
  // Client-side dedup: skip if already awarded this ref+reason combo
  if (refId) {
    const dedupKey = `atl_xp_awarded_${refId}_${reason}`;
    if (localStorage.getItem(dedupKey)) return;
    localStorage.setItem(dedupKey, '1');
  }
  // Update local XP total
  try {
    const k   = 'atl_xp_total';
    const cur = parseInt(localStorage.getItem(k) || '0', 10);
    localStorage.setItem(k, String(cur + points));
  } catch {}
  // Send to backend (backend also has 24h server-side dedup)
  try {
    await api.points.award({ user_id: userId, points, reason, ref_id: refId, ref_type: refType, meta });
  } catch {}
};

/* ══════════════════════════════════════════
   XP TOAST
══════════════════════════════════════════ */
const XPToast = ({ show, points, onDone }) => {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [show, onDone]);
  if (!show) return null;
  return (
    <>
      <style>{`@keyframes xpPop{0%{opacity:0;transform:translateY(0) scale(.8)}20%{opacity:1;transform:translateY(-12px) scale(1.05)}80%{opacity:1;transform:translateY(-18px) scale(1)}100%{opacity:0;transform:translateY(-30px) scale(.9)}}`}</style>
      <div style={{ position:'fixed',bottom:80,right:28,zIndex:300,background:PURPLE2,color:'#fff',borderRadius:24,padding:'9px 18px',fontSize:14,fontWeight:800,boxShadow:'0 6px 24px rgba(77,67,152,.28)',animation:'xpPop 1.6s ease forwards',pointerEvents:'none',letterSpacing:.3 }}>
        ⚡ +{points} XP
      </div>
    </>
  );
};

/* ══════════════════════════════════════════
   CORRECT POPUP
══════════════════════════════════════════ */
const CorrectPopup = ({ show, onClose, firstTry }) => {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onClose, 1500);
    return () => clearTimeout(t);
  }, [show, onClose]);
  if (!show) return null;
  return (
    <>
      <style>{`@keyframes popIn{from{opacity:0;transform:translate(-50%,-50%) scale(.82)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}`}</style>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200 }} />
      <div style={{ position:'fixed',top:'50%',left:'50%',zIndex:201,background:'#fff',borderRadius:20,padding:'28px 44px',textAlign:'center',boxShadow:'0 12px 48px rgba(77,67,152,.18)',animation:'popIn .18s cubic-bezier(.34,1.4,.64,1)',pointerEvents:'none' }}>
        <div style={{ fontSize:46,marginBottom:8 }}>{firstTry ? '🎉' : '✅'}</div>
        <div style={{ fontSize:20,fontWeight:800,color:PURPLE2 }}>{firstTry ? 'First try!' : 'Correct!'}</div>
      </div>
    </>
  );
};

/* ══════════════════════════════════════════
   PRIMITIVES
══════════════════════════════════════════ */
const Btn = ({ onClick, children, variant='primary', disabled, style={} }) => {
  const base = { padding:'12px 24px',borderRadius:10,fontSize:14,fontWeight:700,cursor:disabled?'not-allowed':'pointer',border:'none',transition:'all .15s',fontFamily:'inherit',...style };
  if (variant==='primary') return <button onClick={onClick} disabled={disabled} style={{ ...base,background:disabled?'#c4b5fd':PURPLE,color:'#fff',boxShadow:disabled?'none':'0 2px 10px rgba(77,67,152,.22)' }}>{children}</button>;
  if (variant==='ghost')   return <button onClick={onClick} disabled={disabled} style={{ ...base,background:'transparent',color:MUTED,border:`1.5px solid ${BORDER}` }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={{ ...base,background:LIGHT,color:PURPLE }}>{children}</button>;
};

const OkBanner = ({ text }) => (
  <div style={{ display:'flex',alignItems:'center',gap:8,padding:'11px 14px',borderRadius:10,background:'#f0fdf4',border:'1px solid #bbf7d0',color:GREEN,fontSize:13,marginBottom:14 }}>
    <span>✓</span><span>{text}</span>
  </div>
);

const CodeBlock = ({ code }) => {
  const [copied,setCopied]=useState(false);
  const copy=()=>{navigator.clipboard.writeText(code).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),1400);};
  return (
    <div style={{ borderRadius:12,overflow:'hidden',border:'1px solid #2d2b55',marginBottom:16 }}>
      <div style={{ background:'#1e1b3a',padding:'8px 16px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <div style={{ display:'flex',gap:6 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c=><span key={c} style={{ width:10,height:10,borderRadius:'50%',background:c,display:'block' }} />)}
        </div>
        <button onClick={copy} style={{ background:'rgba(255,255,255,.08)',border:'none',color:'#9ca3af',borderRadius:5,padding:'3px 10px',fontSize:11,cursor:'pointer' }}>
          {copied?'✓ copied':'copy'}
        </button>
      </div>
      <pre style={{ background:'#1e1b3a',color:'#cdd6f4',margin:0,padding:'16px 20px',fontSize:13,lineHeight:1.8,overflowX:'auto',fontFamily:"'JetBrains Mono','Fira Code',monospace" }}>
        <code>{code}</code>
      </pre>
    </div>
  );
};

const TopBar = ({ title, done, total, onExit }) => {
  const pct = total ? Math.round((done/total)*100) : 0;
  return (
    <div style={{ position:'sticky',top:0,zIndex:100,background:'#fff',borderBottom:`1px solid ${BORDER}` }}>
      <div style={{ height:3,background:'#ede9fe' }}>
        <div style={{ height:'100%',width:`${pct}%`,background:PURPLE,transition:'width .5s ease' }} />
      </div>
      <div style={{ padding:'0 20px',height:52,display:'flex',alignItems:'center',gap:12 }}>
        <button onClick={onExit} style={{ background:'none',border:'none',cursor:'pointer',color:'#c4bdd8',fontSize:20,padding:'4px 6px',lineHeight:1,flexShrink:0 }}>✕</button>
        <span style={{ flex:1,fontSize:14,fontWeight:700,color:INK,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{title}</span>
        <span style={{ fontSize:12,color:MUTED,flexShrink:0,background:LIGHT,padding:'3px 10px',borderRadius:20 }}>{done}/{total}</span>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   STEP RENDERERS
══════════════════════════════════════════ */
const ReadStep = ({ step, onNext }) => {
  const [ready,setReady]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setReady(true),800);return()=>clearTimeout(t);},[step.id]);
  const lines=(step.content||'').split('\n').filter(l=>l.trim());
  return (
    <div>
      {step.image_url&&<img src={step.image_url} alt="" onError={e=>e.target.style.display='none'} style={{ width:'100%',maxHeight:200,objectFit:'cover',borderRadius:12,marginBottom:20 }} />}
      <div style={{ fontSize:15.5,lineHeight:1.9,color:'#2e2840' }}>
        {lines.map((line,i)=><p key={i} style={{ marginBottom:12 }}>{line}</p>)}
      </div>
      {step.code_snippet&&<CodeBlock code={step.code_snippet} />}
      {ready&&<Btn onClick={onNext} style={{ marginTop:22,width:'100%' }}>Got it — Continue →</Btn>}
    </div>
  );
};

const VideoStep = ({ step, onNext }) => {
  const [confirmed,setConfirmed]=useState(false);
  const m=(step.video_url||'').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  const embed=m?`https://www.youtube.com/embed/${m[1]}?rel=0`:null;
  return (
    <div>
      {step.content&&<p style={{ fontSize:15,color:'#4a4560',marginBottom:16,lineHeight:1.75 }}>{step.content}</p>}
      {embed?(<div style={{ borderRadius:12,overflow:'hidden',aspectRatio:'16/9',background:'#000',marginBottom:16 }}><iframe src={embed} style={{ width:'100%',height:'100%',border:'none' }} allowFullScreen title={step.title} /></div>)
        :step.video_url?(<a href={step.video_url} target="_blank" rel="noreferrer" style={{ display:'flex',alignItems:'center',gap:12,padding:'14px 18px',borderRadius:12,background:LIGHT,color:PURPLE,fontWeight:600,fontSize:14,textDecoration:'none',marginBottom:16 }}>▶ Watch the video</a>)
        :(<div style={{ padding:'40px',borderRadius:12,background:'#f9f9f7',textAlign:'center',color:'#bbb',marginBottom:16,border:`1px dashed ${BORDER}` }}>Video coming soon</div>)
      }
      {!confirmed?<Btn variant="ghost" onClick={()=>setConfirmed(true)} style={{ width:'100%' }}>I watched it ✓</Btn>
        :<Btn onClick={onNext} style={{ marginTop:14,width:'100%' }}>Continue →</Btn>}
    </div>
  );
};

const CodeStep = ({ step, onNext }) => {
  const [val,setVal]=useState('');
  const [status,setStatus]=useState(null);
  const inputRef=useRef();
  const token=(()=>{
    if(step.hints&&!step.hints.includes(' ')&&step.hints.length<25)return step.hints;
    const c=step.code_snippet||'';
    const tag=c.match(/<(\w+)>/);if(tag)return tag[1];
    const kw=c.match(/(?:const|let|function|def|class|import)\s+(\w+)/);if(kw)return kw[1];
    return null;
  })();
  const check=()=>{
    if(!token||val.trim().toLowerCase()===token.toLowerCase()){setStatus('ok');}
    else{setStatus('err');setTimeout(()=>{setStatus(null);setVal('');inputRef.current?.focus();},800);}
  };
  return (
    <div>
      {step.content&&<p style={{ fontSize:15,color:'#4a4560',marginBottom:16,lineHeight:1.75 }}>{step.content}</p>}
      <CodeBlock code={step.code_snippet||''} />
      {step.expected_output&&(<div style={{ display:'flex',gap:8,padding:'10px 14px',borderRadius:10,background:'#f8fffe',border:'1px solid #c6f4e8',color:'#256b57',fontSize:13,marginBottom:14 }}><span>→</span><span><strong>Result:</strong> {step.expected_output}</span></div>)}
      {token&&status!=='ok'?(
        <div style={{ marginTop:4 }}>
          <p style={{ fontSize:13,color:MUTED,marginBottom:10 }}>Type <code style={{ background:LIGHT,color:PURPLE,padding:'2px 8px',borderRadius:5,fontFamily:'monospace',fontSize:12.5,fontWeight:700 }}>{token}</code> to continue</p>
          <div style={{ display:'flex',gap:8 }}>
            <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)} onKeyDown={e=>e.key==='Enter'&&check()} autoFocus style={{ flex:1,padding:'11px 14px',borderRadius:9,fontSize:14,fontFamily:'monospace',outline:'none',border:`1.5px solid ${status==='err'?'#fca5a5':BORDER}`,background:status==='err'?'#fff5f5':'#fff',color:INK }} />
            <Btn onClick={check}>Check</Btn>
          </div>
          {status==='err'&&<p style={{ fontSize:12,color:RED,marginTop:6 }}>Not quite — try again</p>}
        </div>
      ):(<Btn onClick={onNext} style={{ marginTop:16,width:'100%' }}>Continue →</Btn>)}
    </div>
  );
};

const QuizStep = ({ step, onNext }) => {
  const [picked,setPicked]=useState(null);
  const [done,setDone]=useState(false);
  const [attempts,setAttempts]=useState(0);
  const [popup,setPopup]=useState(false);
  const [firstTry,setFirstTry]=useState(false);
  const options=(step.content||'').split('\n').map(l=>l.trim()).filter(l=>/^[A-D][).]/i.test(l)).map(l=>({key:l[0].toUpperCase(),text:l.slice(2).trim()}));
  const correct=(step.expected_output||'').trim().toUpperCase();
  const pick=async k=>{
    if(done)return;setPicked(k);
    if(k===correct){setDone(true);setFirstTry(attempts===0);setPopup(true);}
    else{setAttempts(a=>a+1);await sleep(600);setPicked(null);}
  };
  return (
    <div>
      <CorrectPopup show={popup} onClose={()=>setPopup(false)} firstTry={firstTry} />
      <p style={{ fontSize:17,fontWeight:700,color:INK,marginBottom:22,lineHeight:1.6 }}>{step.question_text||step.title}</p>
      <div style={{ display:'flex',flexDirection:'column',gap:9 }}>
        {options.map(({key,text})=>{
          const isC=done&&key===correct,isW=picked===key&&key!==correct;
          return(<button key={key} onClick={()=>pick(key)} disabled={done} style={{ textAlign:'left',padding:'13px 16px',borderRadius:10,fontSize:14,border:`1.5px solid ${isC?'#86efac':isW?'#fca5a5':BORDER}`,background:isC?'#f0fdf4':isW?'#fff5f5':'#fff',cursor:done?'default':'pointer',display:'flex',alignItems:'center',gap:12,color:INK,fontFamily:'inherit',transition:'all .12s' }}>
            <span style={{ width:26,height:26,borderRadius:7,flexShrink:0,fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',background:isC?'#22c55e':isW?'#ef4444':LIGHT,color:(isC||isW)?'#fff':PURPLE }}>{isC?'✓':isW?'✗':key}</span>{text}
          </button>);
        })}
      </div>
      {attempts>=2&&!done&&step.hints&&<p style={{ fontSize:13,color:MUTED,marginTop:14,fontStyle:'italic' }}>Hint: {step.hints}</p>}
      {done&&!popup&&<Btn onClick={onNext} style={{ marginTop:18,width:'100%' }}>Continue →</Btn>}
    </div>
  );
};

const FillStep = ({ step, onNext }) => {
  const [val,setVal]=useState('');
  const [status,setStatus]=useState(null);
  const [attempts,setAttempts]=useState(0);
  const [popup,setPopup]=useState(false);
  const [firstTry,setFirstTry]=useState(false);
  const ref=useRef();
  useEffect(()=>{ref.current?.focus();},[step.id]);
  const correct=(step.expected_output||'').trim();
  const check=async()=>{
    if(!val.trim())return;
    if(val.trim().toLowerCase()===correct.toLowerCase()){setStatus('ok');setFirstTry(attempts===0);setPopup(true);}
    else{setStatus('err');setAttempts(a=>a+1);await sleep(600);setStatus(null);setVal('');ref.current?.focus();}
  };
  return (
    <div>
      <CorrectPopup show={popup} onClose={()=>setPopup(false)} firstTry={firstTry} />
      {step.content&&<div style={{ background:'#f8f7fc',borderRadius:10,padding:'12px 16px',marginBottom:16,fontSize:14,color:'#4a4560',lineHeight:1.75,border:`1px solid ${BORDER}` }}>{step.content}</div>}
      <p style={{ fontSize:17,fontWeight:700,color:INK,marginBottom:18,lineHeight:1.6 }}>{step.question_text||step.title}</p>
      {status!=='ok'?(
        <>
          <div style={{ display:'flex',gap:8 }}>
            <input ref={ref} value={val} onChange={e=>{setVal(e.target.value);setStatus(null);}} onKeyDown={e=>e.key==='Enter'&&check()} placeholder="Your answer…" style={{ flex:1,padding:'13px 16px',borderRadius:10,fontSize:15,outline:'none',fontFamily:'monospace',color:INK,border:`1.5px solid ${status==='err'?'#fca5a5':BORDER}`,background:status==='err'?'#fff5f5':'#fff' }} />
            <Btn onClick={check}>Check</Btn>
          </div>
          {status==='err'&&<p style={{ fontSize:12,color:RED,marginTop:6 }}>Not quite — try again</p>}
          {attempts>=2&&step.hints&&<p style={{ fontSize:13,color:MUTED,marginTop:10,fontStyle:'italic' }}>Hint: {step.hints}</p>}
        </>
      ):!popup?(<><OkBanner text={`Correct — "${correct}"`} /><Btn onClick={onNext} style={{ width:'100%' }}>Continue →</Btn></>):null}
    </div>
  );
};

const ArrangeStep = ({ step, onNext }) => {
  const correct=(step.content||'').split('\n').map(l=>l.trim()).filter(Boolean);
  const [items,setItems]=useState(()=>[...correct].sort(()=>Math.random()-.5));
  const [drag,setDrag]=useState(null);
  const [over,setOver]=useState(null);
  const [checked,setChecked]=useState(false);
  const [solved,setSolved]=useState(false);
  const [attempts,setAttempts]=useState(0);
  const drop=()=>{if(drag===null||over===null||drag===over){setDrag(null);setOver(null);return;}const next=[...items];const[m]=next.splice(drag,1);next.splice(over,0,m);setItems(next);setDrag(null);setOver(null);setChecked(false);};
  const check=()=>{setChecked(true);if(items.every((it,i)=>it===correct[i]))setSolved(true);else{setAttempts(a=>a+1);setTimeout(()=>setChecked(false),900);}};
  return (
    <div>
      <p style={{ fontSize:16,fontWeight:700,color:INK,marginBottom:6 }}>{step.question_text||step.title}</p>
      <p style={{ fontSize:12,color:MUTED,marginBottom:16 }}>Drag to reorder</p>
      <div style={{ display:'flex',flexDirection:'column',gap:7,marginBottom:14 }}>
        {items.map((item,i)=>{const ok=checked&&item===correct[i],bad=checked&&!solved&&item!==correct[i];return<div key={item} draggable onDragStart={()=>setDrag(i)} onDragEnter={()=>setOver(i)} onDragEnd={drop} onDragOver={e=>e.preventDefault()} style={{ padding:'11px 14px',borderRadius:9,cursor:'grab',userSelect:'none',fontSize:13.5,fontFamily:'monospace',color:'#2e2840',display:'flex',alignItems:'center',gap:10,border:`1.5px solid ${ok?'#86efac':bad?'#fca5a5':over===i&&drag!==i?'#c4b5fd':BORDER}`,background:ok?'#f0fdf4':bad?'#fff5f5':drag===i?LIGHT:'#fff',transition:'all .12s' }}><span style={{ color:'#d4cef0' }}>⠿</span>{item}</div>;})}
      </div>
      {attempts>=2&&!solved&&step.hints&&<p style={{ fontSize:13,color:MUTED,marginBottom:10,fontStyle:'italic' }}>Hint: {step.hints}</p>}
      {!solved?<Btn onClick={check} style={{ width:'100%' }}>Check order</Btn>:<><OkBanner text="Correct order!" /><Btn onClick={onNext} style={{ width:'100%' }}>Continue →</Btn></>}
    </div>
  );
};

const MatchStep = ({ step, onNext }) => {
  const pairs=(step.content||'').split('\n').map(l=>l.trim()).filter(l=>l.includes('::')).map((l,i)=>{const[t,d]=l.split('::').map(s=>s.trim());return{id:i,t,d};});
  const [selT,setSelT]=useState(null);
  const [matched,setMatched]=useState(new Set());
  const [wrong,setWrong]=useState(null);
  const [done,setDone]=useState(false);
  const [shuffled]=useState(()=>[...pairs].sort(()=>Math.random()-.5));
  const pickD=async id=>{if(matched.has(id)||selT===null)return;if(selT===id){const nm=new Set(matched);nm.add(id);setMatched(nm);setSelT(null);if(nm.size===pairs.length)setDone(true);}else{setWrong(id);await sleep(500);setWrong(null);setSelT(null);}};
  const cs=(border,bg,cursor,opacity=1)=>({padding:'9px 12px',borderRadius:9,textAlign:'left',fontSize:13,border:`1.5px solid ${border}`,background:bg,cursor,color:INK,transition:'all .12s',opacity,fontFamily:'inherit'});
  return (
    <div>
      <p style={{ fontSize:16,fontWeight:700,color:INK,marginBottom:6 }}>{step.question_text||step.title}</p>
      <p style={{ fontSize:12,color:MUTED,marginBottom:16 }}>Click a term, then its match</p>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
        <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
          <p style={{ fontSize:10,fontWeight:800,color:'#bbb',textTransform:'uppercase',letterSpacing:1,marginBottom:4 }}>Terms</p>
          {pairs.map(p=>{const iM=matched.has(p.id),iS=selT===p.id;return<button key={p.id} onClick={()=>{if(!iM){setSelT(p.id);setWrong(null);}}} disabled={iM} style={{...cs(iM?'#86efac':iS?'#a78bfa':BORDER,iM?'#f0fdf4':iS?LIGHT:'#fff',iM?'default':'pointer'),fontFamily:'monospace',fontWeight:iS?700:400,color:iM?GREEN:INK}}>{iM?'✓ ':''}{p.t}</button>;})}
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
          <p style={{ fontSize:10,fontWeight:800,color:'#bbb',textTransform:'uppercase',letterSpacing:1,marginBottom:4 }}>Definitions</p>
          {shuffled.map(p=>{const iM=matched.has(p.id),iW=wrong===p.id;return<button key={p.id} onClick={()=>pickD(p.id)} disabled={iM||selT===null} style={{...cs(iM?'#86efac':iW?'#fca5a5':BORDER,iM?'#f0fdf4':iW?'#fff5f5':'#fff',(iM||selT===null)?'default':'pointer',selT===null&&!iM?.45:1),color:iM?GREEN:INK}}>{iM?'✓ ':''}{p.d}</button>;})}
        </div>
      </div>
      <p style={{ fontSize:11,color:MUTED,textAlign:'center',marginTop:10 }}>{matched.size}/{pairs.length} matched</p>
      {done&&<><OkBanner text="All matched!" /><Btn onClick={onNext} style={{ width:'100%' }}>Continue →</Btn></>}
    </div>
  );
};

const BugfixStep = ({ step, onNext }) => {
  const raw=(step.code_snippet||'').split('\n');
  const bugIdx=raw.findIndex(l=>l.includes('// BUG'));
  const lines=raw.map(l=>l.replace('// BUG','').trimEnd());
  const [clicked,setClicked]=useState(null);
  const [solved,setSolved]=useState(false);
  const [attempts,setAttempts]=useState(0);
  const [popup,setPopup]=useState(false);
  const click=async i=>{if(solved)return;setClicked(i);if(i===bugIdx){setSolved(true);setPopup(true);}else{setAttempts(a=>a+1);await sleep(600);setClicked(null);}};
  return (
    <div>
      <CorrectPopup show={popup} onClose={()=>setPopup(false)} firstTry={attempts===0} />
      <p style={{ fontSize:16,fontWeight:700,color:INK,marginBottom:6 }}>{step.question_text||step.title}</p>
      <p style={{ fontSize:13,color:MUTED,marginBottom:14 }}>Click the line with the bug</p>
      <div style={{ borderRadius:12,overflow:'hidden',marginBottom:14,border:'1px solid #2d2b55' }}>
        <div style={{ background:'#1e1b3a',padding:'8px 16px',display:'flex',gap:6 }}>{['#ff5f57','#febc2e','#28c840'].map(c=><span key={c} style={{ width:10,height:10,borderRadius:'50%',background:c,display:'block' }} />)}</div>
        {lines.map((line,i)=>{const isF=solved&&i===bugIdx,isW=clicked===i&&i!==bugIdx;return<div key={i} onClick={()=>!solved&&click(i)} style={{ padding:'5px 16px',cursor:solved?'default':'pointer',display:'flex',gap:14,alignItems:'center',background:isF?'rgba(34,197,94,.1)':isW?'rgba(239,68,68,.09)':'#1e1b3a',borderLeft:`3px solid ${isF?'#22c55e':isW?'#ef4444':'transparent'}`,transition:'all .12s' }}><span style={{ fontSize:11,color:'#4b5563',minWidth:18,textAlign:'right',userSelect:'none',fontFamily:'monospace' }}>{i+1}</span><code style={{ fontSize:13,color:isF?'#86efac':isW?'#fca5a5':'#cdd6f4',whiteSpace:'pre',fontFamily:"'JetBrains Mono',monospace",lineHeight:1.8 }}>{line||' '}</code></div>;})}
      </div>
      {attempts>=2&&!solved&&step.hints&&<p style={{ fontSize:13,color:MUTED,marginBottom:10,fontStyle:'italic' }}>Hint: {step.hints}</p>}
      {solved&&!popup&&(<><div style={{ background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'12px 16px',marginBottom:12 }}><p style={{ fontSize:13,fontWeight:700,color:GREEN,marginBottom:4 }}>Bug on line {bugIdx+1}</p><p style={{ fontSize:13,color:'#15803d',lineHeight:1.65 }}>{step.expected_output}</p></div><Btn onClick={onNext} style={{ width:'100%' }}>Continue →</Btn></>)}
    </div>
  );
};

/* ══════════════════════════════════════════
   ASSESSMENT
══════════════════════════════════════════ */
const Assessment = ({ lesson, steps, onFinish }) => {
  const quizSteps=steps.filter(s=>{const t=(s.step_type||s.type||'').toLowerCase();return t==='quiz'||t==='exercise';});
  const [qIdx,setQIdx]=useState(0);
  const [score,setScore]=useState(0);
  const [picked,setPicked]=useState(null);
  const [filled,setFilled]=useState('');
  const [result,setResult]=useState(null);
  const [done,setDone]=useState(false);
  const [popup,setPopup]=useState(false);
  const [firstTry,setFirstTry]=useState(false);
  const [attempts,setAttempts]=useState(0);

  useEffect(()=>{if(quizSteps.length===0)onFinish({score:100,xp:1,passed:true});},[]);
  if(quizSteps.length===0||done)return null;

  const cur=(quizSteps[qIdx]);
  const type=(cur?.step_type||cur?.type||'').toLowerCase();
  const isQuiz=type==='quiz';
  const correct=(cur?.expected_output||'').trim().toUpperCase();
  const opts=isQuiz?(cur.content||'').split('\n').map(l=>l.trim()).filter(l=>/^[A-D][).]/i.test(l)).map(l=>({key:l[0].toUpperCase(),text:l.slice(2).trim()})):[];

  const advance=(newScore)=>{
    setTimeout(()=>{
      setPopup(false);setResult(null);setPicked(null);setFilled('');setAttempts(0);
      if(qIdx<quizSteps.length-1){setQIdx(i=>i+1);}
      else{const pct=Math.round((newScore/quizSteps.length)*100);setDone(true);const xp=pct>=90?5:pct>=70?3:pct>=50?2:0;onFinish({score:pct,xp,passed:pct>=50});}
    },1600);
  };

  const submit=async(ans)=>{
    const ok=isQuiz?ans===correct:ans.trim().toLowerCase()===(cur.expected_output||'').trim().toLowerCase();
    if(ok){const ns=score+1;setScore(ns);setResult('ok');setFirstTry(attempts===0);setPopup(true);advance(ns);}
    else{setResult('err');setPicked(ans);setAttempts(a=>a+1);await sleep(700);setResult(null);setPicked(null);}
  };

  return (
    <div>
      <CorrectPopup show={popup} onClose={()=>{}} firstTry={firstTry} />
      <div style={{ background:PURPLE2,borderRadius:14,padding:'18px 22px',marginBottom:24,color:'#fff' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12 }}>
          <div>
            <div style={{ fontSize:10,fontWeight:700,letterSpacing:1.5,color:'#c4b5fd',textTransform:'uppercase',marginBottom:3 }}>Assessment</div>
            <div style={{ fontSize:16,fontWeight:700 }}>{lesson?.title}</div>
          </div>
          <div style={{ fontSize:20,fontWeight:800 }}>{qIdx+1}<span style={{ fontSize:13,color:'#c4b5fd',fontWeight:400 }}>/{quizSteps.length}</span></div>
        </div>
        <div style={{ height:3,background:'rgba(255,255,255,.15)',borderRadius:99 }}>
          <div style={{ height:'100%',width:`${(qIdx/quizSteps.length)*100}%`,background:'#818cf8',borderRadius:99,transition:'width .4s' }} />
        </div>
      </div>
      <p style={{ fontSize:17,fontWeight:700,color:INK,marginBottom:20,lineHeight:1.6 }}>{isQuiz?(cur.question_text||cur.title):cur.title}</p>
      {isQuiz?(
        <div style={{ display:'flex',flexDirection:'column',gap:9 }}>
          {opts.map(({key,text})=>{const isC=result==='ok'&&picked===key,isW=result==='err'&&picked===key;return<button key={key} onClick={()=>{if(!result&&!popup){setPicked(key);submit(key);}}} style={{ textAlign:'left',padding:'13px 16px',borderRadius:10,fontSize:14,border:`1.5px solid ${isC?'#86efac':isW?'#fca5a5':BORDER}`,background:isC?'#f0fdf4':isW?'#fff5f5':'#fff',cursor:result?'default':'pointer',display:'flex',alignItems:'center',gap:12,color:INK,fontFamily:'inherit',transition:'all .12s' }}><span style={{ width:26,height:26,borderRadius:7,flexShrink:0,fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',background:isC?'#22c55e':isW?'#ef4444':LIGHT,color:(isC||isW)?'#fff':PURPLE }}>{isC?'✓':isW?'✗':key}</span>{text}</button>;})}
        </div>
      ):(
        <div style={{ display:'flex',gap:8 }}>
          <input value={filled} onChange={e=>setFilled(e.target.value)} onKeyDown={e=>e.key==='Enter'&&filled.trim()&&submit(filled)} placeholder="Type your answer…" autoFocus style={{ flex:1,padding:'13px 16px',borderRadius:10,fontSize:15,outline:'none',fontFamily:'monospace',color:INK,border:`1.5px solid ${result==='err'?'#fca5a5':BORDER}`,background:result==='err'?'#fff5f5':'#fff' }} />
          <Btn onClick={()=>filled.trim()&&submit(filled)}>Check</Btn>
        </div>
      )}
      {result==='err'&&<div style={{ marginTop:12,padding:'10px 14px',borderRadius:10,fontSize:13,fontWeight:600,background:'#fff5f5',color:RED,border:'1px solid #fecaca' }}>✗ Not quite — try again</div>}
    </div>
  );
};

/* ══════════════════════════════════════════
   DONE SCREEN
══════════════════════════════════════════ */
const DoneScreen = ({ lesson, navigate, assessResult }) => {
  const {score,xp,passed}=assessResult||{};
  const emoji=xp>=5?'🏆':xp>=3?'🌟':xp>=1?'✅':'📖';
  const msg=xp>=5?'Outstanding!':xp>=3?'Great job!':xp>=1?'Lesson complete':'Keep practicing';
  const clr=xp>=5?'#d97706':xp>=3?PURPLE:xp>=1?GREEN:MUTED;
  return (
    <div style={{ minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ textAlign:'center',padding:'40px 20px',maxWidth:400 }}>
        <div style={{ fontSize:60,marginBottom:12 }}>{emoji}</div>
        <h2 style={{ fontSize:26,fontWeight:800,color:INK,marginBottom:6 }}>{msg}</h2>
        <p style={{ fontSize:15,color:MUTED,marginBottom:28 }}>{lesson?.title}</p>
        {score!==undefined&&(
          <div style={{ display:'inline-flex',flexDirection:'column',alignItems:'center',background:'#fff',border:`1px solid ${BORDER}`,borderRadius:16,padding:'22px 40px',marginBottom:28,gap:6 }}>
            <div style={{ fontSize:44,fontWeight:900,color:clr }}>{score}<span style={{ fontSize:18,color:MUTED }}>%</span></div>
            <div style={{ fontSize:12,color:MUTED,fontWeight:600,letterSpacing:.5 }}>Assessment score</div>
            {xp>0&&<div style={{ marginTop:8,background:LIGHT,border:`1px solid #c4b5fd`,borderRadius:8,padding:'6px 16px',fontSize:13,fontWeight:700,color:PURPLE }}>+{xp} XP earned</div>}
            {xp===0&&score<50&&<div style={{ marginTop:8,fontSize:13,color:RED,fontWeight:600 }}>Score 50%+ to earn XP</div>}
          </div>
        )}
        {score!==undefined&&score<50&&<p style={{ fontSize:13,color:MUTED,marginBottom:20,lineHeight:1.7 }}>You need <strong>50% or higher</strong> to earn XP. Review and retry.</p>}
        <div style={{ display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap' }}>
          {score!==undefined&&score<50&&<Btn variant="ghost" onClick={()=>window.location.reload()} style={{ minWidth:110 }}>Retry</Btn>}
          <Btn variant="ghost" onClick={()=>navigate('/lessons')} style={{ minWidth:110 }}>All lessons</Btn>
          <Btn onClick={()=>navigate('/dashboard')} style={{ minWidth:110 }}>Dashboard →</Btn>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
const LessonView = ({ user }) => {
  const params   = useParams();
  const lessonId = params.lessonId||params.id||params.lessonID||params.lesson_id||Object.values(params)[0];
  const navigate = useNavigate();

  const [lesson,setLesson]=useState(null);
  const [steps,setSteps]=useState([]);
  const [idx,setIdx]=useState(0);
  const [completed,setCompleted]=useState(new Set());
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [phase,setPhase]=useState('lesson');
  const [assessResult,setAssessResult]=useState(null);
  const [xpToast,setXpToast]=useState({show:false,points:0});
  const topRef=useRef();
  const storageKey=`atl_p_${lessonId}`;

  useEffect(()=>{
    if(!lessonId||lessonId==='undefined'){setError('Lesson not found');setLoading(false);return;}
    let cancelled=false;
    (async()=>{
      try{
        setLoading(true);setError(null);
        const lr=await api.lessons.student.getById(lessonId);
        if(cancelled)return;
        if(!lr?.success)throw new Error(lr?.message||'Lesson not found');
        setLesson(lr.data);
        const sr=await api.lessons.student.getSteps(lessonId);
        if(cancelled)return;
        const sorted=[...(sr?.data||[])].sort((a,b)=>(a.order_number||a.order||0)-(b.order_number||b.order||0));
        setSteps(sorted);
        try{const s=JSON.parse(localStorage.getItem(storageKey)||'{}');if(s.completed)setCompleted(new Set(s.completed));if(typeof s.idx==='number')setIdx(s.idx);}catch{}
      }catch(e){if(!cancelled)setError(e.message||'Failed to load');}
      finally{if(!cancelled)setLoading(false);}
    })();
    return()=>{cancelled=true;};
  },[lessonId]);

  useEffect(()=>{if(!steps.length)return;try{localStorage.setItem(storageKey,JSON.stringify({completed:[...completed],idx}));}catch{}},[completed,idx]);

  const giveXP=useCallback(async(points,reason,refId,refType,meta)=>{
    setXpToast({show:true,points});
    await awardXP({userId:user?.id,points,reason,refId,refType,meta});
  },[user]);

  const next=useCallback(async()=>{
    const nc=new Set(completed);nc.add(idx);setCompleted(nc);
    await giveXP(1,'step_complete',steps[idx]?.id,'step',{title:steps[idx]?.title});
    if(idx>=steps.length-1){
      await giveXP(5,'lesson_complete',lessonId,'lesson',{title:lesson?.title});
      localStorage.removeItem(storageKey);
      try{await api.lessons.student.markComplete?.(lessonId,{steps_completed:steps.length,total_steps:steps.length,xp_earned:5});}catch{}
      setPhase('assessment');
    }else{
      setIdx(i=>i+1);
      setTimeout(()=>topRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),60);
    }
  },[idx,steps,completed,giveXP,lessonId,lesson]);

  const goTo=useCallback((i)=>{if(i<0||i>=steps.length)return;setIdx(i);setTimeout(()=>topRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),60);},[steps]);

  const handleAssessmentDone=useCallback(async(result)=>{
    setAssessResult(result);
    if(result.xp>0){
      const reason=result.score>=90?'assessment_ace':'assessment_pass';
      await giveXP(result.xp,reason,lessonId,'assessment',{score:result.score,title:lesson?.title});
    }
    try{localStorage.setItem(`atl_lesson_score_${lessonId}`,JSON.stringify({xp:result.xp,score:result.score,completedAt:new Date().toISOString()}));}catch{}
    try{await api.lessons.student.saveAssessment?.(lessonId,{assessment_score:result.score,xp_earned:result.xp,status:'completed'});}catch{}
    setPhase('done');
  },[giveXP,lessonId,lesson]);

  if(loading)return(<div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:CREAM }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><div style={{ width:28,height:28,border:`3px solid ${PURPLE}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin .8s linear infinite' }} /></div>);
  if(error)return(<div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:CREAM }}><div style={{ textAlign:'center',padding:24 }}><p style={{ color:MUTED,marginBottom:16,fontSize:14 }}>{error}</p><Btn onClick={()=>navigate('/lessons')}>Back to lessons</Btn></div></div>);

  const cur=steps[idx];
  const type=(cur?.step_type||cur?.type||'text').toLowerCase();
  const renderStep=()=>{
    if(!cur)return null;
    const k=cur.id||idx,p={step:cur,onNext:next};
    switch(type){
      case 'quiz':     return<QuizStep    key={k}{...p}/>;
      case 'exercise': return<FillStep    key={k}{...p}/>;
      case 'code':     return<CodeStep    key={k}{...p}/>;
      case 'video':    return<VideoStep   key={k}{...p}/>;
      case 'arrange':  return<ArrangeStep key={k}{...p}/>;
      case 'match':    return<MatchStep   key={k}{...p}/>;
      case 'bugfix':   return<BugfixStep  key={k}{...p}/>;
      default:         return<ReadStep    key={k}{...p}/>;
    }
  };

  return (
    <div style={{ minHeight:'100vh',background:CREAM,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <XPToast show={xpToast.show} points={xpToast.points} onDone={()=>setXpToast({show:false,points:0})} />
      {phase!=='done'&&<TopBar title={lesson?.title||''} done={phase==='assessment'?steps.length:completed.size} total={steps.length} onExit={()=>navigate('/lessons')} />}
      {phase==='done'?(
        <DoneScreen lesson={lesson} navigate={navigate} assessResult={assessResult} />
      ):(
        <div style={{ flex:1,overflowY:'auto' }}>
          <div ref={topRef} style={{ maxWidth:640,margin:'0 auto',padding:'32px 24px 80px' }}>
            {phase==='assessment'&&<Assessment lesson={lesson} steps={steps} onFinish={handleAssessmentDone} />}
            {phase==='lesson'&&(
              !cur?(
                <p style={{ textAlign:'center',color:MUTED,paddingTop:60 }}>No steps yet.</p>
              ):(
                <>
                  <h1 style={{ fontSize:22,fontWeight:800,color:INK,lineHeight:1.3,marginBottom:22,letterSpacing:-.3 }}>{cur.title}</h1>
                  {renderStep()}
                  {idx>0&&(
                    <div style={{ marginTop:20 }}>
                      <button onClick={()=>goTo(idx-1)} style={{ padding:'9px 18px',borderRadius:9,border:`1.5px solid ${BORDER}`,background:'#fff',color:MUTED,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}>← Previous</button>
                    </div>
                  )}
                  <div style={{ display:'flex',gap:5,justifyContent:'center',paddingTop:26,flexWrap:'wrap' }}>
                    {Array.from({length:steps.length},(_,i)=>(
                      <div key={i} onClick={()=>goTo(i)} style={{ height:4,borderRadius:99,cursor:'pointer',transition:'all .2s',width:i===idx?22:4,background:completed.has(i)?'#a78bfa':i===idx?PURPLE:'#e5e0f5' }} />
                    ))}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonView;