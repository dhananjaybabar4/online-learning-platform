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
            className="bg-white text-[#4d4398] px-5 py-2 text-sm font-medium hover:bg-gray-100">
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
              { label: 'Total',     value: stats.total,              color: 'text-[#4d4398]' },
              { label: 'Solved',    value: stats.solved,             color: 'text-green-600' },
              { label: 'Easy',      value: stats.easy,               color: 'text-green-500' },
              { label: 'Remaining', value: stats.total - stats.solved, color: 'text-gray-500' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 py-3 text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-0 mb-5 border border-gray-200 overflow-hidden w-fit">
          {['all', 'easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setFilter(d)}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-r border-gray-200 last:border-r-0 ${
                filter === d
                  ? 'bg-[#4d4398] text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50'
              }`}>
              {d === 'all' ? `All (${stats.total})` : `${DIFF[d]?.label} (${stats[d]})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin h-10 w-10 border-b-2 border-[#4d4398]" />
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
          <div className="bg-white border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_90px_70px_80px_90px] gap-0 px-4 py-2 bg-gray-50 border-b border-gray-200">
              <div className="text-xs font-bold text-gray-400 uppercase">#</div>
              <div className="text-xs font-bold text-gray-400 uppercase">Challenge</div>
              <div className="text-xs font-bold text-gray-400 uppercase text-center">Difficulty</div>
              <div className="text-xs font-bold text-gray-400 uppercase text-center">Questions</div>
              <div className="text-xs font-bold text-gray-400 uppercase text-center">XP</div>
              <div className="text-xs font-bold text-gray-400 uppercase text-center">Action</div>
            </div>

            {filtered.map((c, i) => {
              const diff    = DIFF[c.difficulty] || DIFF.medium;
              const isSolved = solved.includes(c.id);
              return (
                <div key={c.id}
                  className={`grid grid-cols-[40px_1fr_90px_70px_80px_90px] gap-0 items-center px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${isSolved ? 'opacity-80' : ''}`}>

                  {/* Index */}
                  <div className={`w-7 h-7 flex items-center justify-center text-xs font-black flex-shrink-0 ${
                    isSolved ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isSolved ? '✓' : i + 1}
                  </div>

                  {/* Title + topic */}
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">{c.title}</h3>
                      {isSolved && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 font-medium">Solved</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 capitalize mt-0.5">{c.topic}</p>
                  </div>

                  {/* Difficulty */}
                  <div className="flex justify-center">
                    <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-bold ${diff.bg} ${diff.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                      {diff.label}
                    </span>
                  </div>

                  {/* Questions count */}
                  <div className="text-center">
                    <span className="text-xs text-gray-500 font-medium">{c.questions_count || 0}Q</span>
                  </div>

                  {/* XP */}
                  <div className="text-center">
                    <span className="text-xs text-amber-600 font-bold">+{XP[c.difficulty] || 10} XP</span>
                  </div>

                  {/* Action */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => navigate(`/challenges/${c.id}`)}
                      className={`px-3 py-1.5 text-white text-xs font-bold transition-colors ${
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