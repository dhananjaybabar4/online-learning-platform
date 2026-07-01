// frontend/src/components/admin/resources/ResourcesPage.jsx
import React, { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const adminFetch = async (path, options = {}) => {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
};

// ─── Type config ───────────────────────────────────────────────
const TYPES = [
  { id: 'notes',       label: 'Notes',        icon: '📄', accept: '.pdf,.doc,.docx', action: 'Download' },
  { id: 'videos',      label: 'Videos',       icon: '🎥', accept: null,              action: 'Watch' },
  { id: 'cheatsheets', label: 'Cheat Sheets', icon: '📋', accept: '.pdf',            action: 'Download' },
  { id: 'articles',    label: 'Articles',     icon: '📰', accept: null,              action: 'Read' },
];

const typeMap = Object.fromEntries(TYPES.map(t => [t.id, t]));

// ─── Resource Form ─────────────────────────────────────────────
const ResourceForm = ({ resource, onSave, onClose }) => {
  const [form, setForm] = useState({
    title:        resource?.title        || '',
    description:  resource?.description  || '',
    category:     resource?.category     || '',
    type:         resource?.type         || 'notes',
    url:          resource?.url          || '',
    meta:         resource?.meta         || '',
    is_published: resource?.is_published || false,
  });
  const [file, setFile]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [progress, setProgress] = useState('');
  const fileRef = useRef();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isVideo   = form.type === 'videos';
  const isArticle = form.type === 'articles';
  const needsFile = form.type === 'notes' || form.type === 'cheatsheets';
  const currentType = typeMap[form.type];

  const handleSubmit = async () => {
    setError('');
    if (!form.title.trim())                          { setError('Title is required'); return; }
    if (!form.type)                                  { setError('Type is required'); return; }
    if (isVideo && !form.url.trim())                 { setError('YouTube URL is required'); return; }
    if (needsFile && !file && !resource?.url)        { setError('Please upload a file or provide a URL'); return; }

    setSaving(true);
    setProgress('Uploading…');

    try {
      const token = localStorage.getItem('admin_token');
      const formData = new FormData();
      formData.append('title',        form.title.trim());
      formData.append('description',  form.description);
      formData.append('category',     form.category);
      formData.append('type',         form.type);
      formData.append('url',          form.url);
      formData.append('meta',         form.meta);
      formData.append('is_published', String(form.is_published));
      if (file) formData.append('file', file);

      const method   = resource?.id ? 'PUT' : 'POST';
      const endpoint = resource?.id
        ? `${API_BASE}/admin/resources/${resource.id}`
        : `${API_BASE}/admin/resources`;

      const res  = await fetch(endpoint, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();

      if (json.success) {
        setProgress('');
        onSave(json.data);
      } else {
        setError(json.message || 'Failed to save');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900">{resource?.id ? 'Edit Resource' : 'Add Resource'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-3">
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4d4398]"
              placeholder="Resource title" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4d4398] resize-none"
              rows={2} placeholder="Short description shown on resource card" />
          </div>

          {/* Type + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type *</label>
              <select value={form.type} onChange={e => { set('type', e.target.value); setFile(null); }}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4d4398]">
                {TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
              <input value={form.category} onChange={e => set('category', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4d4398]"
                placeholder="e.g. HTML, CSS, React" />
            </div>
          </div>

          {/* YouTube URL (videos only) */}
          {isVideo && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                🎥 YouTube URL *
              </label>
              <input value={form.url} onChange={e => set('url', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4d4398]"
                placeholder="https://youtube.com/watch?v=..." />
            </div>
          )}

          {/* External URL (articles only) */}
          {isArticle && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Article URL</label>
              <input value={form.url} onChange={e => set('url', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4d4398]"
                placeholder="https://..." />
            </div>
          )}

          {/* File upload (notes / cheatsheets) */}
          {needsFile && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                📎 Upload PDF {!resource?.url && '*'}
              </label>
              <div
                className="mt-1 border-2 border-dashed border-gray-200 rounded-lg px-4 py-5 text-center cursor-pointer hover:border-[#4d4398] transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <div>
                    <p className="text-sm font-semibold text-[#4d4398]">📄 {file.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                ) : resource?.url ? (
                  <div>
                    <p className="text-xs text-gray-500">Current file uploaded</p>
                    <p className="text-xs text-[#4d4398] mt-0.5 underline">Click to replace</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl mb-1">📁</p>
                    <p className="text-sm text-gray-500">Click to upload PDF</p>
                    <p className="text-xs text-gray-400 mt-0.5">Max 100 MB</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept={currentType?.accept || '.pdf'}
                className="hidden" onChange={e => setFile(e.target.files[0] || null)} />
            </div>
          )}

          {/* Meta */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Meta <span className="font-normal text-gray-400 normal-case">(e.g. "45:30" or "25 pages · 2.5 MB")</span>
            </label>
            <input value={form.meta} onChange={e => set('meta', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4d4398]"
              placeholder={isVideo ? '45:30' : '25 pages · 2.5 MB'} />
          </div>

          {/* Publish toggle */}
          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={() => set('is_published', !form.is_published)}
              className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${form.is_published ? 'bg-green-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_published ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-gray-700">Publish immediately</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-[#4d4398] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#3d3475] disabled:opacity-50 flex items-center justify-center gap-2">
            {saving
              ? <><span className="animate-spin w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent inline-block" />{progress}</>
              : resource?.id ? 'Update' : 'Add Resource'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Admin Resources Page ─────────────────────────────────
const ResourcesPage = () => {
  const [resources, setResources]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [filter, setFilter]           = useState('all');
  const [search, setSearch]           = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [editingResource, setEditing] = useState(null);

  const filterTabs = ['all', ...TYPES.map(t => t.id)];

  useEffect(() => {
    adminFetch('/admin/resources/all')
      .then(r => setResources(r.data || []))
      .catch(e => { console.error('Resources fetch error:', e); setError(e.message); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = (saved) => {
    setResources(rs =>
      editingResource ? rs.map(r => r.id === saved.id ? saved : r) : [saved, ...rs]
    );
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resource?')) return;
    const token = localStorage.getItem('admin_token');
    await fetch(`${API_BASE}/admin/resources/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setResources(rs => rs.filter(r => r.id !== id));
  };

  const handleTogglePublish = async (resource) => {
    const token = localStorage.getItem('admin_token');
    const formData = new FormData();
    formData.append('is_published', String(!resource.is_published));
    const res = await fetch(`${API_BASE}/admin/resources/${resource.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const json = await res.json();
    if (json.success) {
      setResources(rs => rs.map(r => r.id === resource.id ? json.data : r));
    }
  };

  const filtered = resources.filter(r => {
    const matchType   = filter === 'all' || r.type === filter;
    const matchSearch = r.title?.toLowerCase().includes(search.toLowerCase())
      || r.category?.toLowerCase().includes(search.toLowerCase())
      || r.description?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="animate-spin w-8 h-8 rounded-full border-2 border-[#4d4398] border-t-transparent" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Resources</h1>
          <p className="text-sm text-gray-400 mt-0.5">{resources.length} total</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-[#4d4398] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#3d3475]">
          + Add Resource
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search resources…"
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#4d4398] mb-4 bg-white" />

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        {filterTabs.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-all ${
              filter === t
                ? 'bg-[#4d4398] text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400'
            }`}>
            {t === 'all' ? 'All' : (typeMap[t]?.icon + ' ' + typeMap[t]?.label)}
          </button>
        ))}
      </div>

      {/* Resource list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm font-medium mb-3">No resources found</p>
          <button onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-[#4d4398] text-white px-4 py-2 rounded-lg text-sm font-semibold">
            + Add Resource
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {filtered.map(r => {
            const t = typeMap[r.type] || { icon: '📄', label: r.type, action: 'Open' };
            return (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
                <span className="text-xl flex-shrink-0">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm truncate">{r.title}</p>
                    <button
                      onClick={() => handleTogglePublish(r)}
                      title="Click to toggle publish"
                      className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                        r.is_published
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {r.is_published ? '● Published' : '○ Draft'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.label}
                    {r.category ? ` · ${r.category}` : ''}
                    {r.meta     ? ` · ${r.meta}`     : ''}
                  </p>
                  {r.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{r.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {r.url && (
                    <a href={r.url.startsWith('/') ? `http://localhost:3001${r.url}` : r.url}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg font-semibold hover:bg-gray-100">
                      {t.action} ↗
                    </a>
                  )}
                  <button
                    onClick={() => { setEditing(r); setShowForm(true); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit">✏️</button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete">🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ResourceForm
          resource={editingResource}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
};

export default ResourcesPage;