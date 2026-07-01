// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login        from './pages/Login';
import AdminLogin   from './pages/AdminLogin';
import Home         from './pages/Home';
import AuthCallback from './pages/AuthCallback';
import Onboarding   from './pages/Onboarding';
import SkillTest    from './pages/SkillTest';
import SkillResult  from './pages/SkillResult';
import './index.css';

import LandingPage from './pages/LandingPage';

import Lessons       from './components/student/Lessons';
import LessonView    from './components/student/LessonView';
import Practice      from './components/student/Practice';
import Chat          from './components/student/Chat';
import Resources     from './components/student/Resources';
import Challenges    from './components/student/Challenges';
import ChallengeView from './components/student/ChallengeView';

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

// ─── Check skill result ───────────────────────────────────────────────────────
const skillDone = (user) => {
  if (!user) return false;
  if (user.onboarding_complete) return true;
  if (user.skill_level)         return true;
  if (user.goal_track)          return true;
  const keys = [
    `atl_skill_result_${user.id}`,
    `atl_skill_result_${user._id}`,
    `atl_skill_result_${user.userId}`,
    `atl_skill_result_${user.email}`,
    'atl_skill_result',
  ];
  return keys.some(k => { try { return !!localStorage.getItem(k); } catch { return false; } });
};

// ─── Check onboarding done ────────────────────────────────────────────────────
const onboardingDone = (user) => {
  if (!user) return false;
  if (user.onboarding_complete || user.user_type) return true;
  const keys = [
    `atl_onboarding_${user.id}`,
    `atl_onboarding_${user._id}`,
    `atl_onboarding_${user.userId}`,
    `atl_onboarding_${user.email}`,
  ];
  return keys.some(k => { try { return !!localStorage.getItem(k); } catch { return false; } });
};

// ─── Redirect logic ───────────────────────────────────────────────────────────
const getRedirect = (user) => {
  if (!user)                 return '/login';
  if (user.role === 'ADMIN') return '/admin/dashboard';
  if (!onboardingDone(user)) return '/onboarding';
  if (!skillDone(user))      return '/skill-test';
  return '/dashboard';
};

function App() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const adminToken  = localStorage.getItem('admin_token');
      const adminUser   = localStorage.getItem('admin_user');
      const storedUser  = localStorage.getItem('atl_current_user');
      const accessToken = localStorage.getItem('atl_access_token');
      if (adminToken && adminUser)        setUser(JSON.parse(adminUser));
      else if (storedUser && accessToken) setUser(JSON.parse(storedUser));
    } catch {}
    finally { setLoading(false); }
  }, []);

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
        <p className="text-white font-semibold text-lg">Loading ATL…</p>
      </div>
    </div>
  );

  const protect = (el) => user ? el : <Navigate to="/login" replace />;

  return (
    <Router>
      <Routes>

        {/* Landing */}
        <Route path="/" element={user ? <Navigate to={getRedirect(user)} replace /> : <LandingPage />} />

        {/* Auth */}
        <Route path="/auth/callback" element={<AuthCallback setUser={setUser} />} />
        <Route path="/login"       element={user ? <Navigate to={getRedirect(user)} replace /> : <Login setUser={setUser} />} />
        <Route path="/admin-login" element={user?.role === 'ADMIN' ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin setUser={setUser} />} />

        {/* Onboarding */}
        <Route path="/onboarding" element={
          !user                              ? <Navigate to="/login" replace />
          : user.role === 'ADMIN'            ? <Navigate to="/admin/dashboard" replace />
          : onboardingDone(user) && skillDone(user) ? <Navigate to="/dashboard" replace />
          : onboardingDone(user)             ? <Navigate to="/skill-test" replace />
          : <Onboarding user={user} setUser={setUser} />
        } />

        {/* Skill Test */}
        <Route path="/skill-test" element={
          !user                   ? <Navigate to="/login" replace />
          : user.role === 'ADMIN' ? <Navigate to="/admin/dashboard" replace />
          : !onboardingDone(user) ? <Navigate to="/onboarding" replace />
          : skillDone(user)       ? <Navigate to="/dashboard" replace />
          : <SkillTest user={user} />
        } />

        {/* Skill Result */}
        <Route path="/skill-result" element={protect(<SkillResult user={user} />)} />

        {/* Dashboard */}
        <Route path="/dashboard" element={
          !user                   ? <Navigate to="/login" replace />
          : user.role === 'ADMIN' ? <Navigate to="/admin/dashboard" replace />
          : !onboardingDone(user) ? <Navigate to="/onboarding" replace />
          : !skillDone(user)      ? <Navigate to="/skill-test" replace />
          : <Home user={user} onLogout={() => handleLogout(false)} />
        } />
        <Route path="/home" element={<Navigate to="/dashboard" replace />} />

        {/* Student routes */}
        <Route path="/lessons"        element={protect(user?.role === 'ADMIN' ? <Navigate to="/admin/lessons" replace /> : <Lessons user={user} onLogout={() => handleLogout(false)} />)} />
        <Route path="/lesson/:id"     element={protect(<LessonView user={user} onLogout={() => handleLogout(false)} />)} />
        <Route path="/practice"       element={protect(<Practice user={user} onLogout={() => handleLogout(false)} />)} />
        <Route path="/chat"           element={protect(<Chat user={user} onLogout={() => handleLogout(false)} />)} />
        <Route path="/resources"      element={protect(<Resources user={user} onLogout={() => handleLogout(false)} />)} />

        {/* Challenges — only 3 routes */}
        <Route path="/challenges"     element={protect(<Challenges user={user} onLogout={() => handleLogout(false)} />)} />
        <Route path="/challenges/:id" element={protect(<ChallengeView user={user} onLogout={() => handleLogout(false)} />)} />

        {/* Admin */}
        <Route path="/admin/*" element={
          user?.role === 'ADMIN'
            ? <AdminPanel user={user} onLogout={() => handleLogout(true)} />
            : <Navigate to="/admin-login" replace />
        }>
          <Route index                                       element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"                            element={<Dashboard />} />
          <Route path="panel"                                element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="users"                                element={<AdminUsers />} />
          <Route path="lessons"                              element={<LessonsList />} />
          <Route path="lessons/create"                       element={<LessonsCreate />} />
          <Route path="lessons/:lessonId/edit"               element={<LessonsEdit />} />
          <Route path="lesson-steps"                         element={<StepsList />} />
          <Route path="lessons/:lessonId/steps"              element={<StepsList />} />
          <Route path="lessons/:lessonId/steps/create"       element={<StepsCreate />} />
          <Route path="lessons/:lessonId/steps/:stepId/edit" element={<StepsEdit />} />
          <Route path="quizzes"                              element={<QuizzesPage />} />
          <Route path="resources"                            element={<ResourcesPage />} />
          <Route path="story"                                element={<StoriesPage />} />
          <Route path="story-chapters"                       element={<ChaptersPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to={user ? getRedirect(user) : '/'} replace />} />

      </Routes>
    </Router>
  );
}

export default App;