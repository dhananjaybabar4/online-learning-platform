// frontend/src/pages/Resources.jsx  (Student view)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TYPE_CONFIG = {
  notes:       { icon: '📄', action: 'Download' },
  videos:      { icon: '🎥', action: 'Watch' },
  cheatsheets: { icon: '📋', action: 'Download' },
  articles:    { icon: '📰', action: 'Read' },
};

const FILTERS = [
  { id: 'all',         label: 'All' },
  { id: 'notes',       label: 'Notes' },
  { id: 'videos',      label: 'Videos' },
  { id: 'cheatsheets', label: 'Cheat Sheets' },
  { id: 'articles',    label: 'Articles' },
];

export const Resources = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');

  const handleLogout = () => { if (onLogout) onLogout(); navigate('/'); };

  useEffect(() => {
    fetch(`${API_BASE}/resources`)
      .then(r => r.json())
      .then(json => setResources(json.data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = resources.filter(r => {
    const matchSearch = r.title?.toLowerCase().includes(search.toLowerCase())
      || r.description?.toLowerCase().includes(search.toLowerCase())
      || r.category?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || r.type === filter;
    return matchSearch && matchFilter;
  });

  const handleAction = (resource) => {
    if (!resource.url) return;
    const url = resource.url.startsWith('/') ? `http://localhost:3001${resource.url}` : resource.url;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <div className="bg-[#3e2f7f] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex flex-col leading-none cursor-pointer" onClick={() => navigate('/dashboard')}>
              <div className="text-white font-extrabold text-[22px] tracking-wide">ATL</div>
              <div className="text-white text-[10px] font-medium tracking-[0.2em] opacity-85">ANYTIME LEARNING</div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              {['Dashboard','Lessons','Practice','Chat','Resources'].map(item => (
                <button key={item} onClick={() => navigate('/'+item.toLowerCase())}
                  className={`text-sm font-medium transition-colors ${
                    item === 'Resources'
                      ? 'text-white border-b-2 border-white pb-1'
                      : 'text-white hover:text-gray-200'
                  }`}>
                  {item}
                </button>
              ))}
            </div>
            <button onClick={handleLogout}
              className="bg-white text-[#4d4398] px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors shadow-md">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-black text-gray-900 mb-5">Resources</h1>

        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
        )}

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search resources…"
          className="w-full border border-gray-300 rounded px-3 py-2.5 text-sm focus:outline-none focus:border-[#4d4398] mb-4 bg-white"
        />

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                filter === f.id
                  ? 'bg-[#4d4398] text-white'
                  : 'bg-white border border-gray-300 text-gray-500 hover:border-gray-400'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 rounded-full border-2 border-[#4d4398] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-sm font-medium">No resources found</p>
            <button
              onClick={() => { setSearch(''); setFilter('all'); }}
              className="mt-2 text-xs text-[#4d4398] underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded divide-y divide-gray-100">
            {filtered.map(r => {
              const cfg = TYPE_CONFIG[r.type] || { icon: '📄', action: 'Open' };
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <span className="text-xl flex-shrink-0">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{r.title}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {r.category || r.type}
                      {r.meta ? ` · ${r.meta}` : ''}
                    </p>
                    {r.description && (
                      <p className="text-xs text-gray-400 truncate">{r.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAction(r)}
                    disabled={!r.url}
                    className="bg-[#4d4398] text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-[#3d3375] flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed">
                    {cfg.action}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Resources;