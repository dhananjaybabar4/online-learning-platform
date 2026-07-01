import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const AdminLogin = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.admin.login(email, password);
      if (response.success && response.token) {
        const adminUser = {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name || 'Admin User',
          role: response.data.role || 'admin',
          status: response.data.status,
        };
        localStorage.setItem('admin_token', response.token);
        localStorage.setItem('admin_user', JSON.stringify(adminUser));
        if (setUser) setUser(adminUser);
        setTimeout(() => navigate('/admin/panel'), 100);
      } else {
        setError(response.error || 'Invalid admin credentials');
      }
    } catch (err) {
      setError('Connection error. Please check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundImage: `url('/code-background.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="bg-[#3e2f7f] h-16 px-8 flex items-center justify-between shadow-md">
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '22px', letterSpacing: '1px' }}>ATL</div>
            <div style={{ color: 'rgba(255,255,255,1)', fontSize: '10px', fontWeight: 600, letterSpacing: '3.5px', marginTop: '2px' }}>ANYTIME LEARNING</div>
          </div>
          {/* Home button — white fill like landing page Login button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 bg-white hover:bg-gray-100 text-[#3e2f7f] text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            
            Home
          </button>
        </div>

        {/* Form */}
        <div className="flex items-center justify-center py-12 px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-10">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-extrabold text-[#4d4398]">Admin Login</h2>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email-address" name="email" type="email" autoComplete="email" required
                  className="w-full px-4 py-3 bg-[#e8eaf6] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d4398] focus:border-transparent text-sm text-gray-900"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password" name="password" type="password" autoComplete="current-password" required
                  className="w-full px-4 py-3 bg-[#e8eaf6] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d4398] focus:border-transparent text-sm text-gray-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg border border-red-200 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className={`w-full bg-[#4d4398] text-white py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wide hover:bg-[#3d3475] transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Authenticating...' : 'LOGIN'}
              </button>

              <div className="text-sm text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="font-bold text-[#4d4398] hover:text-[#3d3475]"
                >
                  Go to Student Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;