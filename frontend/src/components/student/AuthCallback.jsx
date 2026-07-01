// src/components/student/AuthCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../services/api';

const AuthCallback = ({ setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  const needsOnboarding = (user) => {
    if (!user) return false;
    if (user.onboarding_complete === true) return false;
    if (user.user_type) return false;
    const key = `atl_onboarding_${user.id || user.email}`;
    return !localStorage.getItem(key);
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const hashParams   = new URLSearchParams(location.hash.substring(1));
        const searchParams = new URLSearchParams(location.search);

        const accessToken  = hashParams.get('access_token')  || searchParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');

        if (!accessToken) throw new Error('No authentication token received from Google');

        const response = await api.auth.handleCallback(accessToken, refreshToken);

        if (response.success && response.user) {
          if (response.session?.access_token) {
            localStorage.setItem('atl_access_token', response.session.access_token);
          }
          if (response.session?.refresh_token) {
            localStorage.setItem('atl_refresh_token', response.session.refresh_token);
          }
          localStorage.setItem('atl_current_user', JSON.stringify(response.user));
          setUser(response.user);

          setTimeout(() => {
            if (response.user.role === 'ADMIN') {
              navigate('/admin/dashboard', { replace: true });
            } else if (needsOnboarding(response.user)) {
              navigate('/onboarding', { replace: true });
            } else {
              navigate('/dashboard', { replace: true });
            }
          }, 500);
        } else {
          throw new Error(response.error || 'Authentication failed');
        }
      } catch (err) {
        setError(err.message || 'Authentication failed. Please try again.');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [location, navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3e2f7f] to-[#5e4fa0] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-600 text-sm">Redirecting to login page...</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="mt-4 px-6 py-2 bg-[#4d4398] text-white rounded-lg hover:bg-[#3e2f7f]"
          >
            Go to Login Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3e2f7f] to-[#5e4fa0] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-[#4d4398] rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Signing you in...</h2>
        <p className="text-gray-600">Please wait while we complete your authentication.</p>
        <div className="mt-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4d4398] mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;