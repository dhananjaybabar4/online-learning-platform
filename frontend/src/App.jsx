// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login        from './pages/Login';
import AdminLogin   from './pages/AdminLogin';
import AuthCallback from './components/student/AuthCallback';
import Onboarding   from './pages/Onboarding';
import LandingPage  from './pages/LandingPage';
import UserSettings from './components/student/users/UserSettings';
import './index.css';

import Home          from './components/student/Home';
import Lessons       from './components/student/Lessons';
import LessonView    from './components/student/LessonView';
import Practice      from './components/student/Practice';
import Chat          from './components/student/Chat';
import Resources     from './components/student/Resources';
import Challenges    from './components/student/Challenges';
import ChallengeView from './components/student/ChallengeView';
import StoryMode     from './components/student/StoryMode';

import AdminPanel    from './components/admin/layout/AdminPanel';
import Dashboard     from './components/admin/dashboard/Dashboard';
import AdminUsers    from './components/admin/users/AdminUsers';
import LessonsList   from './components/admin/lessons/LessonsList';
import LessonsCreate from './components/admin/lessons/LessonsCreate';
import LessonsEdit   from './components/admin/lessons/LessonsEdit';
import StepsList     from './components/admin/lessons/steps/StepsList';
import StepsCreate   from './components/admin/lessons/steps/StepsCreate';
import StepsEdit     from './components/admin/lessons/steps/StepsEdit';
import QuizzesPage   from './components/admin/quizzes/QuizzesPage';
import ResourcesPage from './components/admin/resources/ResourcesPage';

import { StoriesPage, ChaptersPage } from './components/admin/story/StoryAdminPage';
import ChallengesAdmin from './components/admin/challenges/ChallengesAdmin';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const readLS = (...keys) => {
  for (const k of keys.filter(Boolean)) {
    try {
      const raw = localStorage.getItem(k);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return null;
};

/**
 * Check if this user has completed onboarding.
 * Checks (in order):
 *   1. user object flags (onboarding_complete, user_type, goal, role !== ADMIN)
 *   2. localStorage atl_onboarding_<id>
 *   3. localStorage atl_onboarding_<email>
 */
const onboardingDone = (user) => {
  if (!user) return false;

  // Admin users never need onboarding
  if (user.role === 'ADMIN') return true;

  // Check user object flags that indicate onboarding was done
  if (user.onboarding_complete === true) return true;
  if (user.user_type)  return true; // set during onboarding
  if (user.goal)       return true; // set during onboarding
  if (user.skipped)    return true; // skipped onboarding

  // Check localStorage for onboarding data saved by Onboarding.jsx
  const uid = user.id || user._id || user.userId;
  const em  = user.email;

  const stored = readLS(
    uid ? `atl_onboarding_${uid}` : null,
    em  ? `atl_onboarding_${em}`  : null,
  );

  if (stored?.onboarding_complete) return true;

  return false;
};

const getRedirect = (user) => {
  if (!user)                  return '/login';
  if (user.role === 'ADMIN')  return '/admin/dashboard';
  if (!onboardingDone(user))  return '/onboarding';
  return '/dashboard';
};

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const adminToken  = localStorage.getItem('admin_token');
      const adminUser   = localStorage.getItem('admin_user');
      const storedUser  = localStorage.getItem('atl_current_user');
      const accessToken = localStorage.getItem('atl_access_token');

      let loadedUser = null;

      if (adminToken && adminUser) {
        loadedUser = JSON.parse(adminUser);
      } else if (storedUser && accessToken) {
        loadedUser = JSON.parse(storedUser);

        // ── KEY FIX: merge onboarding data into the loaded user ──
        // This ensures onboardingDone() returns true for returning users
        // even if the backend-returned user object doesn't have these fields
        if (loadedUser) {
          const uid = loadedUser.id || loadedUser._id || loadedUser.userId;
          const em  = loadedUser.email;
          const obData = readLS(
            uid ? `atl_onboarding_${uid}` : null,
            em  ? `atl_onboarding_${em}`  : null,
          );
          if (obData?.onboarding_complete) {
            // Merge onboarding fields into user so flags are always present
            loadedUser = {
              ...loadedUser,
              onboarding_complete: true,
              goal:      obData.goal      || loadedUser.goal,
              role_type: obData.role      || loadedUser.role_type,
              user_type: obData.user_type || loadedUser.user_type,
              time:      obData.time      || loadedUser.time,
            };
            // Update the stored user so this merge persists
            localStorage.setItem('atl_current_user', JSON.stringify(loadedUser));
          }
        }
      }

      if (loadedUser) setUser(loadedUser);
    } catch (e) {
      console.error('[App] Failed to load user from localStorage:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── setUser wrapper: also persists merged data ──
  const handleSetUser = (newUser) => {
    if (!newUser) { setUser(null); return; }

    // If onboarding data exists, merge it in before saving
    const uid = newUser.id || newUser._id || newUser.userId;
    const em  = newUser.email;
    const obData = readLS(
      uid ? `atl_onboarding_${uid}` : null,
      em  ? `atl_onboarding_${em}`  : null,
    );

    const merged = obData?.onboarding_complete
      ? {
          ...newUser,
          onboarding_complete: true,
          goal:      obData.goal      || newUser.goal,
          user_type: obData.user_type || newUser.user_type,
          time:      obData.time      || newUser.time,
        }
      : newUser;

    setUser(merged);
    // Persist so next page refresh also has the merged data
    if (!merged.role || merged.role !== 'ADMIN') {
      localStorage.setItem('atl_current_user', JSON.stringify(merged));
    }
  };

  const handleLogout = (isAdmin = false) => {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    window.location.replace(isAdmin ? '/admin-login' : '/login');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#3e2f7f' }}>
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-semibold text-lg">Loading ATL...</p>
      </div>
    </div>
  );

  const protect = (el) => user ? el : <Navigate to="/login" replace />;
  const isAdmin = user?.role === 'ADMIN';
  const obDone  = user ? onboardingDone(user) : false;

  return (
    <Router>
      <Routes>

        {/* ── Landing ─────────────────────────────────────────────── */}
        <Route path="/"
          element={user ? <Navigate to={getRedirect(user)} replace /> : <LandingPage />}
        />

        {/* ── Auth ────────────────────────────────────────────────── */}
        <Route path="/auth/callback"
          element={<AuthCallback setUser={handleSetUser} />}
        />
        <Route path="/login"
          element={
            user ? <Navigate to={getRedirect(user)} replace />
                 : <Login setUser={handleSetUser} />
          }
        />
        <Route path="/admin-login"
          element={
            isAdmin ? <Navigate to="/admin/dashboard" replace />
                    : <AdminLogin setUser={handleSetUser} />
          }
        />

        {/* ── Onboarding ──────────────────────────────────────────── */}
        <Route path="/onboarding" element={
          !user   ? <Navigate to="/login"           replace /> :
          isAdmin ? <Navigate to="/admin/dashboard" replace /> :
          obDone  ? <Navigate to="/dashboard"       replace /> :
                    <Onboarding user={user} setUser={handleSetUser} />
        } />

        {/* ── Dashboard ───────────────────────────────────────────── */}
        <Route path="/dashboard" element={
          !user   ? <Navigate to="/login"      replace /> :
          isAdmin ? <Navigate to="/admin/dashboard" replace /> :
          !obDone ? <Navigate to="/onboarding" replace /> :
                    <Home user={user} onLogout={() => handleLogout(false)} />
        } />
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />

        {/* ── Student routes ──────────────────────────────────────── */}
        <Route path="/lessons"
          element={protect(
            isAdmin
              ? <Navigate to="/admin/lessons" replace />
              : <Lessons user={user} onLogout={() => handleLogout(false)} />
          )}
        />
        <Route path="/lesson/:id"
          element={protect(<LessonView user={user} onLogout={() => handleLogout(false)} />)}
        />
        <Route path="/practice"
          element={protect(<Practice user={user} onLogout={() => handleLogout(false)} />)}
        />
        <Route path="/chat"
          element={protect(<Chat user={user} onLogout={() => handleLogout(false)} />)}
        />
        <Route path="/resources"
          element={protect(<Resources user={user} onLogout={() => handleLogout(false)} />)}
        />
        <Route path="/challenges"
          element={protect(<Challenges user={user} onLogout={() => handleLogout(false)} />)}
        />
        <Route path="/challenges/:id"
          element={protect(<ChallengeView user={user} onLogout={() => handleLogout(false)} />)}
        />
        <Route path="/story"
          element={protect(<StoryMode user={user} onLogout={() => handleLogout(false)} />)}
        />
        <Route path="/settings"
          element={protect(<UserSettings user={user} onLogout={() => handleLogout(false)} />)}
        />

        {/* ── Admin ───────────────────────────────────────────────── */}
        <Route path="/admin/*" element={
          isAdmin
            ? <AdminPanel user={user} onLogout={() => handleLogout(true)} />
            : <Navigate to="/admin-login" replace />
        }>
          <Route index                                        element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"                             element={<Dashboard />} />
          <Route path="panel"                                 element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="users"                                 element={<AdminUsers />} />
          <Route path="lessons"                               element={<LessonsList />} />
          <Route path="lessons/create"                        element={<LessonsCreate />} />
          <Route path="lessons/:lessonId/edit"                element={<LessonsEdit />} />
          <Route path="lesson-steps"                          element={<StepsList />} />
          <Route path="lessons/:lessonId/steps"               element={<StepsList />} />
          <Route path="lessons/:lessonId/steps/create"        element={<StepsCreate />} />
          <Route path="lessons/:lessonId/steps/:stepId/edit"  element={<StepsEdit />} />
          <Route path="quizzes"                               element={<QuizzesPage />} />
          <Route path="resources"                             element={<ResourcesPage />} />
          <Route path="story"                                 element={<StoriesPage />} />
          <Route path="story-chapters"                        element={<ChaptersPage />} />
          <Route path="challenges"                            element={<ChallengesAdmin />} />
          <Route path="challenges/create"                     element={<ChallengesAdmin />} />
        </Route>

        {/* ── 404 fallback ────────────────────────────────────────── */}
        <Route path="*"
          element={<Navigate to={user ? getRedirect(user) : '/'} replace />}
        />

      </Routes>
    </Router>
  );
}

export default App;