// src/components/admin/users/AdminUsers.jsx
import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    usersAPI.getAll()
      .then(r => {
        const list = r.data ?? r;
        setUsers(Array.isArray(list) ? list : []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await usersAPI.delete(id);
      setUsers(us => us.filter(u => u.id !== id));
    } catch (e) {
      alert('Failed to delete user: ' + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = users.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const roleColor = (role) => {
    if (!role) return 'bg-gray-100 text-gray-500 border-gray-200';
    const r = role.toUpperCase();
    if (r === 'ADMIN') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (r === 'STUDENT') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  if (loading) return <p className="text-center py-20 text-sm text-gray-400">Loading...</p>;

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{users.length} total</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="border border-gray-300 px-3 py-2 text-sm w-64 focus:outline-none focus:border-[#4d4398]"
        />
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load users: {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 text-gray-400">
          <p className="text-sm font-semibold mb-1">{search ? 'No users match your search' : 'No users found'}</p>
          {search && (
            <button onClick={() => setSearch('')} className="text-xs text-[#4d4398] mt-2">Clear search</button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 divide-y divide-gray-100">
          {/* Table header */}
          <div className="grid grid-cols-12 px-5 py-2.5 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wide">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Name</div>
            <div className="col-span-4">Email</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-1">Joined</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {filtered.map((user, i) => (
            <div key={user.id} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-gray-50 text-sm">
              <div className="col-span-1 text-gray-400 text-xs">{i + 1}</div>

              {/* Name + avatar */}
              <div className="col-span-3 flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 bg-[#4d4398] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {(user.name || user.email || 'U')[0].toUpperCase()}
                </div>
                <span className="font-medium text-gray-900 truncate">{user.name || '—'}</span>
              </div>

              {/* Email */}
              <div className="col-span-4 text-gray-500 truncate text-xs">{user.email}</div>

              {/* Role */}
              <div className="col-span-2">
                <span className={`text-xs px-2 py-0.5 border font-medium ${roleColor(user.role)}`}>
                  {user.role || 'student'}
                </span>
              </div>

              {/* Joined */}
              <div className="col-span-1 text-xs text-gray-400">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
              </div>

              {/* Delete */}
              <div className="col-span-1 text-right">
                <button
                  onClick={() => handleDelete(user.id)}
                  disabled={deleting === user.id}
                  className="text-xs border border-red-200 text-red-500 px-2 py-1 hover:bg-red-50 disabled:opacity-40"
                >
                  {deleting === user.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;