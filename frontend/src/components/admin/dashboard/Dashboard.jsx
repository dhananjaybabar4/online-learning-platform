// src/components/admin/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { api } from "../../../services/api";
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.admin.getDashboardStats();
        if (!cancelled) setStats(res?.data || {});
      } catch {
        if (!cancelled) setStats({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const val = (v) => loading ? null : (v ?? 0);

  const statCards = [
    { label: 'Total Students',   value: val(stats.totalStudents),   icon: '👥', color: '#6366f1' },
    { label: 'Active Lessons',   value: val(stats.activeLessons),   icon: '📚', color: '#f59e0b' },
    { label: 'Total Quizzes',    value: val(stats.totalQuizzes),    icon: '🧠', color: '#ec4899' },
    { label: 'Total Challenges', value: val(stats.totalChallenges), icon: '⚔️', color: '#ef4444' },
  ];

  const quickLinks = [
    { label: 'Users',     icon: '👥', path: '/admin/users',     color: '#6366f1' },
    { label: 'Lessons',   icon: '📚', path: '/admin/lessons',   color: '#f59e0b' },
    { label: 'Quizzes',   icon: '🧠', path: '/admin/quizzes',   color: '#ec4899' },
    { label: 'Stories',   icon: '📖', path: '/admin/story',     color: '#4d4398' },
    { label: 'Resources', icon: '📁', path: '/admin/resources', color: '#0ea5e9' },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">

      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800"></h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: card.color + '18', color: card.color }}
              >
              
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-800">
              {loading
                ? <span className="text-gray-300 animate-pulse">—</span>
                : card.value
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {quickLinks.map((link) => (
            <button
              key={link.label}
              onClick={() => navigate(link.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group"
            >
              <span className="text-2xl">{link.icon}</span>
              <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900">
                {link.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Server Status */}
      <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
        <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
        ATL Server running on port 3001
        <span className="ml-auto">{new Date().toLocaleTimeString()}</span>
      </div>

    </div>
  );
};

export default Dashboard;
