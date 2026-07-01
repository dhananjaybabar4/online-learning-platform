// src/components/student/Challenges.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const DIFF = {
  easy:   { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Easy'   },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Medium' },
  hard:   { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Hard'   },
};

const XP = { easy: 10, medium: 20, hard: 30 };

export default function Challenges({ user, onLogout }) {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [solved,     setSolved]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');

  useEffect(() => { fetchChallenges(); }, []);

  const fetchChallenges = async () => {
    try {
      const token = localStorage.getItem('atl_access_token') || localStorage.getItem('admin_token');
      const res  = await fetch(`${API_BASE_URL}/challenges/student`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setChallenges(data.challenges || []);
      setSolved(data.solved || []);
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all'
    ? challenges
    : challenges.filter(c => c.difficulty === filter);

  const stats = {
    total:  challenges.length,
    solved: solved.length,
    easy:   challenges.filter(c => c.difficulty === 'easy').length,
    medium: challenges.filter(c => c.difficulty === 'medium').length,
    hard:   challenges.filter(c => c.difficulty === 'hard').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <div className="bg-[#3e2f7f] shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex flex-col leading-none">
            <span className="text-white font-extrabold text-[22px] tracking-wide">ATL</span>
            <span className="text-white text-[10px] font-medium tracking-[0.2em] opacity-85">ANYTIME LEARNING</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['Dashboard', 'Lessons', 'Practice', 'Chat', 'Resources'].map(item => (
              <button key={item}
                onClick={() => navigate(item === 'Dashboard' ? '/dashboard' : `/${item.toLowerCase()}`)}
                className={`text-white text-sm font-medium hover:text-gray-200 transition-colors ${item === 'Practice' ? 'border-b-2 border-white pb-1' : ''}`}>
                {item}
              </button>
            ))}
          </div>
          <button onClick={() => { onLogout?.(); navigate('/login'); }}
            className="bg-white text-[#4d4398] px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-100">
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back */}
        <button onClick={() => navigate('/practice')}
          className="text-gray-400 hover:text-gray-700 mb-6 text-sm flex items-center gap-1.5">
          ← Back to Practice
        </button>

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">⚔️ Challenges</h1>
          <p className="text-gray-500 text-sm mt-1">Solve problems to earn XP and sharpen your skills</p>
        </div>

        {/* Stats strip */}
        {!loading && challenges.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total',   value: stats.total,  color: 'text-[#4d4398]' },
              { label: 'Solved',  value: stats.solved, color: 'text-green-600' },
              { label: 'Attempted', value: stats.total - stats.solved, color: 'text-yellow-600' },
              { label: 'Remaining', value: stats.total - stats.solved, color: 'text-gray-500' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 py-3 text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {['all', 'easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setFilter(d)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                filter === d
                  ? 'bg-[#4d4398] text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-[#4d4398]'
              }`}>
              {d === 'all' ? `All (${stats.total})` : `${DIFF[d]?.label} (${stats[d]})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4d4398]" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">⚔️</p>
            <p className="text-lg font-semibold">No challenges here yet</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {filtered.map((c, i) => {
              const diff    = DIFF[c.difficulty] || DIFF.medium;
              const isSolved = solved.includes(c.id);
              return (
                <div key={c.id}
                  className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${isSolved ? 'opacity-80' : ''}`}>
                  <div className="flex items-center gap-4">
                    {/* Index / solved indicator */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      isSolved ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isSolved ? '✓' : i + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm">{c.title}</h3>
                        {isSolved && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Solved</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400 capitalize">{c.topic}</span>
                        {c.questions_count > 0 && (
                          <span className="text-xs text-gray-400">{c.questions_count} question{c.questions_count !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${diff.bg} ${diff.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                      {diff.label}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">+{XP[c.difficulty] || 10} XP</span>
                    <button
                      onClick={() => navigate(`/challenges/${c.id}`)}
                      className={`px-4 py-1.5 text-white text-sm font-semibold rounded-lg transition-colors ${
                        isSolved
                          ? 'bg-[#4d4398] hover:bg-[#3e2f7f]'
                          : 'bg-orange-500 hover:bg-orange-600'
                      }`}>
                      {isSolved ? 'Redo' : 'Solve →'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}