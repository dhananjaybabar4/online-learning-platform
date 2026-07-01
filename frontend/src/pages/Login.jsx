// src/pages/Login.jsx — updated with onboarding redirect
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

// ─── Helper ──────────────────────────────────────────────────────────────────
const redirectAfterLogin = (user, navigate) => {
  if (!user) return;
  if (user.role === 'ADMIN') {
    navigate('/admin/dashboard', { replace: true });
    return;
  }
  const key = `atl_onboarding_${user.id || user.email}`;
  const done = user.onboarding_complete || user.user_type || localStorage.getItem(key);
  navigate(done ? '/dashboard' : '/onboarding', { replace: true });
};

// ─── Password Field ───────────────────────────────────────────────────────────
const PasswordField = ({ value, onChange, id = 'password', label = 'Password' }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="relative">
        <input
          id={id} name={id} type={show ? 'text' : 'password'} autoComplete="current-password" required
          className="w-full px-4 py-3 pr-11 bg-[#e8eaf6] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d4398] focus:border-transparent text-sm text-gray-900"
          placeholder="••••••••" value={value} onChange={onChange}
          style={{ WebkitAppearance: 'none' }}
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      <style>{`input[type="password"]::-ms-reveal,input[type="password"]::-ms-clear,input[type="password"]::-webkit-credentials-auto-fill-button,input[type="password"]::-webkit-strong-password-auto-fill-button{display:none!important;}`}</style>
    </div>
  );
};

// ─── Login Component ──────────────────────────────────────────────────────────
const Login = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (!val) setEmailError('');
    else if (!gmailRegex.test(val)) setEmailError('Enter a valid Gmail address (e.g. name@gmail.com)');
    else setEmailError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMessage('');

    if (!gmailRegex.test(email)) { setEmailError('Enter a valid Gmail address (e.g. name@gmail.com)'); return; }

    if (!isLogin) {
      if (!firstName.trim() || !lastName.trim()) { setError('Please provide your first and last name.'); return; }
      if (password.length < 8)          { setError('Password must be at least 8 characters.'); return; }
      if (!/[A-Z]/.test(password))      { setError('Password must contain at least one uppercase letter.'); return; }
      if (!/[0-9]/.test(password))      { setError('Password must contain at least one number.'); return; }
    }

    setLoading(true);
    try {
      if (isLogin) {
        // ── LOGIN ──
        const response = await api.auth.login({ email, password });
        if (response.success) {
          // ✅ FIXED: include streak + longest_streak from response
          const userData = {
            id:             response.user.id,
            email:          response.user.email,
            firstName:      response.user.name?.split(' ')[0] || response.user.email,
            lastName:       response.user.name?.split(' ').slice(1).join(' ') || '',
            name:           response.user.name,
            role:           response.user.role,
            avatar_url:     response.user.avatar_url,
            streak:         response.user.streak         ?? 0,
            longest_streak: response.user.longest_streak ?? 0,
          };
          if (response.session?.access_token)  localStorage.setItem('atl_access_token',  response.session.access_token);
          if (response.session?.refresh_token) localStorage.setItem('atl_refresh_token', response.session.refresh_token);
          localStorage.setItem('atl_current_user', JSON.stringify(userData));
          localStorage.setItem('user',             JSON.stringify(userData));
          localStorage.setItem('atl_session',      JSON.stringify(response.session));
          setUser(userData);
          redirectAfterLogin(userData, navigate);
        } else {
          setError(response.error || 'Login failed. Please check your credentials.');
        }

      } else {
        // ── REGISTER ──
        const response = await api.auth.register({
          email, password,
          name: `${firstName} ${lastName}`,
          firstName, lastName,
        });

        if (response.success) {
          // ✅ FIXED: include streak + longest_streak from response
          const userData = {
            id:             response.user.id,
            email:          response.user.email,
            firstName:      response.user.name?.split(' ')[0] || firstName,
            lastName:       response.user.name?.split(' ').slice(1).join(' ') || lastName,
            name:           response.user.name,
            role:           response.user.role,
            avatar_url:     response.user.avatar_url,
            streak:         response.user.streak         ?? 1,
            longest_streak: response.user.longest_streak ?? 1,
          };
          if (response.session?.access_token)  localStorage.setItem('atl_access_token',  response.session.access_token);
          if (response.session?.refresh_token) localStorage.setItem('atl_refresh_token', response.session.refresh_token);
          localStorage.setItem('atl_current_user', JSON.stringify(userData));
          localStorage.setItem('user',             JSON.stringify(userData));
          if (response.session) localStorage.setItem('atl_session', JSON.stringify(response.session));
          setUser(userData);
          setSuccessMessage('🎉 Account created! Setting up your profile...');
          setTimeout(() => redirectAfterLogin(userData, navigate), 800);

        } else {
          if (response.errorCode === 'USER_EXISTS' || response.shouldRedirectToLogin) {
            setError(response.error || 'An account with this email already exists.');
            setTimeout(() => {
              setIsLogin(true);
              setError('');
              setFirstName(''); setLastName(''); setPassword('');
              setSuccessMessage('Please login with your existing account');
              setTimeout(() => setSuccessMessage(''), 3000);
            }, 2000);
          } else {
            setError(response.error || 'Registration failed. Please try again.');
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Cannot connect to server. Please make sure backend is running on http://localhost:3001');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('http://localhost:3001/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.success && data.url) window.location.href = data.url;
      else throw new Error('Failed to initialize Google Sign-In');
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: `url('/code-background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
        <div className="absolute inset-0 bg-black/50" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="bg-[#3e2f7f] h-16 px-8 flex items-center justify-between shadow-md">
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '22px', letterSpacing: '1px' }}>ATL</div>
            <div style={{ color: 'rgba(255,255,255,1)', fontSize: '10px', fontWeight: 600, letterSpacing: '3.5px', marginTop: '2px' }}>ANYTIME LEARNING</div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 bg-white hover:bg-gray-100 text-[#3e2f7f] text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Home
          </button>
        </div>

        <div className="flex items-center justify-center py-8 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl px-10 py-10">
            <div className="text-center mb-6">
              <h2 className="text-4xl font-extrabold text-[#4d4398]">
                {isLogin ? 'Login' : 'Create Account'}
              </h2>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              {!isLogin && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label htmlFor="first-name" className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input id="first-name" name="first-name" type="text"
                      className="w-full px-4 py-3 bg-[#e8eaf6] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d4398] focus:border-transparent text-sm text-gray-900"
                      placeholder="Nikhil" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <label htmlFor="last-name" className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input id="last-name" name="last-name" type="text"
                      className="w-full px-4 py-3 bg-[#e8eaf6] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d4398] focus:border-transparent text-sm text-gray-900"
                      placeholder="Chavan" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">Gmail Address</label>
                <input id="email-address" name="email" type="text" autoComplete="email"
                  className={`w-full px-4 py-3 bg-[#e8eaf6] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d4398] focus:border-transparent text-sm text-gray-900 ${emailError ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200'}`}
                  placeholder="e.g. student@gmail.com" value={email} onChange={handleEmailChange} />
                {emailError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                    {emailError}
                  </p>
                )}
              </div>

              <PasswordField id="password" label="Password" value={password} onChange={e => setPassword(e.target.value)} />

              {!isLogin && (
                <p className="text-xs text-gray-400 -mt-3">Min 8 characters, one uppercase letter, one number.</p>
              )}

              {successMessage && (
                <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-lg border border-green-200 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading}
                className={`w-full bg-[#4d4398] text-white py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wide hover:bg-[#3d3475] transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                {loading
                  ? (isLogin ? 'Signing In...' : 'Creating Account...')
                  : (isLogin ? 'Sign In' : 'Create Account')}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">OR</span></div>
              </div>

              <button type="button" onClick={handleGoogleLogin} disabled={loading}
                className={`w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>

              <div className="text-sm text-center">
                <p className="text-gray-600">
                  {isLogin ? "Don't have an account?" : 'Already have an account?'}
                  <button type="button"
                    onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMessage(''); setPassword(''); setEmailError(''); }}
                    className="font-bold text-[#4d4398] hover:text-[#3d3475] ml-1">
                    {isLogin ? 'Sign up' : 'Log in'}
                  </button>
                </p>
              </div>

              <div className="text-sm text-center">
                <button type="button" onClick={() => navigate('/admin-login')}
                  className="font-bold text-[#4d4398] hover:text-[#3d3475]">
                  Go to Admin Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;