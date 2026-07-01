import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const images = ['/one.jpg', '/two.jpg', '/three.jpg'];

const features = [
  { title: 'Lessons',   desc: 'Step-by-step programming lessons for beginners and students preparing for placement.', icon: '📘' },
  { title: 'Practice',  desc: 'Quizzes and typing tests to sharpen your coding skills every single day.',              icon: '✏️' },
  { title: 'AI Chat',   desc: 'Ask doubts in English, Hindi or Marathi — instant answers from our AI assistant.',     icon: '💬' },
  { title: 'Resources', desc: 'Download notes, cheat sheets and study materials — completely free for students.',     icon: '📥' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [currentImg, setCurrentImg] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentImg(prev => (prev + 1) % images.length);
        setFade(true);
      }, 400);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const switchTo = (i) => {
    setFade(false);
    setTimeout(() => { setCurrentImg(i); setFade(true); }, 300);
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#fff', minHeight: '100vh' }}>

      {/* ── NAVBAR ── */}
      <div style={{
        background: '#3b2d80',
        height: '62px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 52px',
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '22px', letterSpacing: '1px' }}>ATL</div>
          <div style={{ color: 'rgba(255,255,255,1)', fontSize: '10px', fontWeight: 600, letterSpacing: '3.5px', marginTop: '2px' }}>ANYTIME LEARNING</div>
        </div>
        <div style={{ display: 'flex', gap: '32px' }}>
          <a href="#about"    style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: '13.5px', fontWeight: 600 }}>About</a>
          <a href="#features" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: '13.5px', fontWeight: 600 }}>Features</a>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{ background: '#fff', color: '#3b2d80', border: 'none', padding: '7px 22px', borderRadius: '7px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
        >
          Login
        </button>
      </div>

      {/* ── HERO ── */}
      <div style={{
        height: '100vh',
        paddingTop: '62px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '48px',
        padding: '62px 72px 0 72px',
        boxSizing: 'border-box',
      }}>

        {/* LEFT */}
        <div style={{ flex: 1, maxWidth: '480px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: 800, color: '#2d2260', lineHeight: 1.15, margin: '0 0 18px 0' }}>
            Learn Coding<br />
            the <span style={{ color: '#4d3fac' }}>Easy Way</span>
          </h1>
          <p style={{ fontSize: '16px', color: '#6b6589', lineHeight: 1.85, margin: '0 0 34px 0', maxWidth: '420px' }}>
            Lessons, quizzes, AI chat support and study resources — all in one place.
            Study at your own pace, anytime, anywhere.
          </p>
          <div style={{ display: 'flex', gap: '14px' }}>
            <button
              onClick={() => navigate('/login')}
              style={{ background: '#3b2d80', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
            >
              Get Started
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{ background: '#fff', color: '#3b2d80', border: '2px solid #3b2d80', padding: '10px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
            >
              Sign In
            </button>
          </div>
        </div>

        {/* RIGHT — cycling image */}
        <div style={{
          flexShrink: 0,
          width: '500px',
          height: '400px',
          borderRadius: '20px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(59,45,128,0.18)',
          background: '#e8e3ff',
        }}>
          <img
            src={images[currentImg]}
            alt={`slide ${currentImg + 1}`}
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', display: 'block',
              opacity: fade ? 1 : 0,
              transition: 'opacity 0.45s ease',
            }}
          />
          <div style={{
            position: 'absolute', bottom: '14px', left: '50%',
            transform: 'translateX(-50%)', display: 'flex', gap: '8px',
          }}>
            {images.map((_, i) => (
              <div key={i} onClick={() => switchTo(i)} style={{
                width: i === currentImg ? '22px' : '8px', height: '8px',
                borderRadius: '4px',
                background: i === currentImg ? '#fff' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', transition: 'all 0.3s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── ABOUT ── */}
      <div id="about" style={{ padding: '80px 72px', textAlign: 'center', background: '#faf9ff', borderTop: '1px solid #ece9f8', borderBottom: '1px solid #ece9f8' }}>
        <div style={{ display: 'inline-block', background: '#ede9ff', color: '#3b2d80', fontSize: '10.5px', fontWeight: 700, padding: '4px 14px', borderRadius: '20px', letterSpacing: '1.5px', marginBottom: '16px' }}>
          ABOUT ATL
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#2d2260', marginBottom: '16px' }}>What is Anytime Learning?</h2>
        <p style={{ fontSize: '15.5px', color: '#6b6589', lineHeight: 1.9, maxWidth: '540px', margin: '0 auto' }}>
          ATL is a learning platform built for students who want to learn coding — whether you are a complete beginner or preparing for placement. No rush, no pressure. Study when you want, how you want.
        </p>
      </div>

      {/* ── FEATURES ── */}
      <div id="features" style={{ padding: '80px 72px', background: '#fff' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 800, color: '#2d2260', marginBottom: '44px' }}>
          What ATL Offers
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', maxWidth: '960px', margin: '0 auto' }}>
          {features.map(f => (
            <div key={f.title} style={{ background: '#faf9ff', border: '1.5px solid #ece9f8', borderRadius: '16px', padding: '28px 24px' }}>
              <div style={{ fontSize: '30px', marginBottom: '14px' }}>{f.icon}</div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#2d2260', marginBottom: '10px' }}>{f.title}</h3>
              <p style={{ fontSize: '13.5px', color: '#6b6589', lineHeight: 1.75, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default LandingPage;