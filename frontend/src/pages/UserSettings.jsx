// frontend/src/pages/UserSettings.jsx
// Optional page where Google users can add password later
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const UserSettings = ({ user, onLogout }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAddPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await api.auth.addPassword({
        userId: user.id,
        password: password
      });

      if (response.success) {
        setSuccess('Password added successfully! You can now login with email and password.');
        setPassword('');
        setConfirmPassword('');
        
        // Update user data
        const updatedUser = {
          ...user,
          has_password: true,
          auth_method: 'both'
        };
        localStorage.setItem('atl_current_user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Add password error:', err);
      setError(err.message || 'Failed to add password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#3e2f7f] h-16 px-8 flex items-center justify-between shadow-md">
        <div className="flex flex-col leading-none">
          <div className="text-white font-extrabold text-[22px] tracking-wide">ATL</div>
          <div className="text-white text-[10px] font-medium tracking-[0.2em] opacity-85">
            ANYTIME LEARNING
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white text-sm hover:underline"
          >
            ← Back to Dashboard
          </button>
          <button
            onClick={onLogout}
            className="bg-white text-[#3e2f7f] px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>
          
          <div className="flex items-center gap-6 mb-6">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Profile"
                className="h-20 w-20 rounded-full"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-[#4d4398] flex items-center justify-center text-white text-2xl font-bold">
                {user.firstName?.charAt(0) || 'U'}
              </div>
            )}
            
            <div>
              <p className="text-lg font-semibold text-gray-900">{user.name || `${user.firstName} ${user.lastName}`}</p>
              <p className="text-gray-600">{user.email}</p>
              <div className="mt-2">
                {user.auth_method === 'google' && !user.has_password && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Signed in with Google
                  </span>
                )}
                {user.auth_method === 'manual' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Email/Password Account
                  </span>
                )}
                {user.auth_method === 'both' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Google + Email/Password
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Password Section (Only for Google users without password) */}
        {user.auth_method === 'google' && !user.has_password && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Password</h2>
            <p className="text-gray-600 mb-6">
              Add a password to your account to enable email/password login in addition to Google sign-in.
            </p>

            <form onSubmit={handleAddPassword} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-[#e8eaf6] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d4398] focus:border-transparent text-sm text-gray-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  className="w-full px-4 py-3 bg-[#e8eaf6] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4d4398] focus:border-transparent text-sm text-gray-900"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full bg-[#4d4398] text-white py-3 px-4 rounded-lg font-bold text-sm uppercase tracking-wide hover:bg-[#3d3475] transition-colors ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Adding Password...' : 'Add Password'}
              </button>
            </form>
          </div>
        )}

        {/* Already has password */}
        {user.has_password && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Login Methods</h2>
            <p className="text-gray-600 mb-4">
              Your account supports multiple login methods:
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-gray-700">Email and Password</span>
              </li>
              {user.auth_method === 'both' && (
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">Google Sign-In</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSettings;