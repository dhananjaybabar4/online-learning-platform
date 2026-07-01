// src/components/admin/layout/AdminPanel.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';

const AdminPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading,   setLoading]   = useState(true);
  const [user,      setUser]      = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    checkAdminAccess();
    updateActiveTab();
  }, [location.pathname]);

  const updateActiveTab = () => {
    const path = location.pathname;
    if      (path.includes('/dashboard'))                             setActiveTab('dashboard');
    else if (path.includes('/users'))                                 setActiveTab('users');
    else if (path.includes('/lesson') || path.includes('/step'))      setActiveTab('lessons');
    else if (path.includes('/quiz'))                                  setActiveTab('quizzes');
    else if (path.includes('/story'))                                 setActiveTab('story');
    else if (path.includes('/resources'))                             setActiveTab('resources');
    else if (path.includes('/challenges'))                            setActiveTab('challenges');
  };

  const checkAdminAccess = async () => {
    if (!location.pathname.startsWith('/admin')) return;
    try {
      const token           = localStorage.getItem('admin_token');
      const adminUserString = localStorage.getItem('admin_user');
      if (!token || !adminUserString) { setLoading(false); return; }
      const adminUser = JSON.parse(adminUserString);
      if (adminUser.role?.toUpperCase() !== 'ADMIN') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        setLoading(false);
        return;
      }
      setUser(adminUser);
      setLoading(false);
    } catch {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/admin-login', { replace: true });
  };

  const navTabs = [
    { id: 'dashboard',  name: 'Dashboard',   icon: '📊', path: '/admin/dashboard' },
    { id: 'users',      name: 'Users',        icon: '👥', path: '/admin/users' },
    {
      id: 'lessons', name: 'Lessons', icon: '📖', path: '/admin/lessons',
      subTabs: [
        { name: 'Lessons', path: '/admin/lessons',      icon: '📖' },
        { name: 'Steps',   path: '/admin/lesson-steps', icon: '📋' },
      ],
    },
    { id: 'quizzes',    name: 'Quizzes',      icon: '❓', path: '/admin/quizzes' },
    {
      id: 'story', name: 'Story Mode', icon: '🎭', path: '/admin/story',
      subTabs: [
        { name: 'Stories',  path: '/admin/story',          icon: '📖' },
        { name: 'Chapters', path: '/admin/story-chapters', icon: '⭐' },
      ],
    },
    { id: 'resources',  name: 'Resources',    icon: '📚', path: '/admin/resources' },
    {
      id: 'challenges', name: 'Challenges', icon: '🎯', path: '/admin/challenges',
      subTabs: [
        { name: 'All Challenges', path: '/admin/challenges',        icon: '🎯' },
        { name: 'Create',         path: '/admin/challenges/create', icon: '➕' },
      ],
    },
  ];

  const activeTabData  = navTabs.find(tab => tab.id === activeTab);
  const hasSubTabs     = activeTabData?.subTabs && activeTabData.subTabs.length > 0;
  const isActive       = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const getPageTitle = () => {
    if (activeTabData) {
      if (hasSubTabs) {
        const activeSubTab = activeTabData.subTabs.find(sub => isActive(sub.path.split('?')[0]));
        return activeSubTab ? activeSubTab.name : activeTabData.name;
      }
      return activeTabData.name;
    }
    return 'Admin Panel';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#4d4398] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* TOP HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">

        {/* Brand bar */}
        <div className="bg-[#3e2f7f] text-white">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex flex-col leading-none">
              <div className="text-white font-extrabold text-[22px] tracking-wide">ATL</div>
              <div className="text-white text-[10px] font-medium tracking-[0.2em] opacity-85">ANYTIME LEARNING</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs opacity-75">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-medium text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Main nav tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6">
            <nav className="flex items-center gap-1 overflow-x-auto">
              {navTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); navigate(tab.path.split('?')[0]); }}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-[#4d4398] text-[#4d4398] font-semibold bg-[#4d4398]/5'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="text-sm">{tab.name}</span>
                  {tab.badge && (
                    <span className="text-[9px] bg-[#7c3aed] text-white px-1.5 py-0.5 rounded-full font-bold ml-0.5">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Sub-nav tabs */}
        {hasSubTabs && (
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="px-6">
              <nav className="flex items-center gap-1 overflow-x-auto">
                {activeTabData.subTabs.map((subTab) => (
                  <button
                    key={subTab.path}
                    onClick={() => navigate(subTab.path.split('?')[0])}
                    className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap text-sm ${
                      isActive(subTab.path.split('?')[0])
                        ? 'border-[#4d4398] text-[#4d4398] font-semibold bg-white'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/50'
                    }`}
                  >
                    <span>{subTab.icon}</span>
                    <span>{subTab.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Page title */}
        <div className="bg-white px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-800">{getPageTitle()}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage your learning content</p>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="p-6 min-h-[calc(100vh-250px)]">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-3 px-6">
        <div className="flex items-center justify-between text-xs text-gray-600" />
      </footer>
    </div>
  );
};

export default AdminPanel;