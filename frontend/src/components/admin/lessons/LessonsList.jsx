// src/components/admin/lessons/LessonsList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';

const LessonsList = () => {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const response = await api.lessons.getAll();
      
      if (response.success) {
        // Sort by display_order
        const sorted = (response.data || []).sort((a, b) => 
          (a.display_order || a.order || 999) - (b.display_order || b.order || 999)
        );
        setLessons(sorted);
      } else {
        setError('Failed to fetch lessons');
      }
    } catch (err) {
      console.error('Error fetching lessons:', err);
      setError('Error loading lessons');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (lessonId) => {
    try {
      const response = await api.lessons.delete(lessonId);
      
      if (response.success) {
        setLessons(lessons.filter(lesson => lesson.id !== lessonId));
        setDeleteConfirm(null);
      } else {
        alert('Failed to delete lesson');
      }
    } catch (err) {
      console.error('Error deleting lesson:', err);
      alert('Error deleting lesson');
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLessons = lessons.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(lessons.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#4d4398] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lessons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            📚 Lessons
          </h1>
          <p className="text-gray-600 mt-1">Manage all learning lessons</p>
        </div>
        <button
          onClick={() => navigate('/admin/lessons/create')}
          className="bg-[#4d4398] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#5a4fa8] transition-colors shadow-md flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          CREATE LESSON
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#3e2f7f] text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">#</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Image</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Title</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Language</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Difficulty</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Order</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentLessons.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">📚</span>
                      <p className="text-lg font-medium">No lessons found</p>
                      <p className="text-sm">Create your first lesson to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentLessons.map((lesson, index) => (
                  <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {lesson.image_url ? (
                        <img 
                          src={lesson.image_url} 
                          alt={lesson.title}
                          className="w-12 h-12 object-contain rounded border border-gray-200 bg-gray-50"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="1.5"%3E%3Crect x="3" y="3" width="18" height="18" rx="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpath d="m21 15-5-5L5 21"/%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs border border-gray-200">
                          No img
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {lesson.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                        {lesson.language || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        lesson.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                        lesson.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        lesson.difficulty === 'advanced' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {lesson.difficulty || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-semibold">
                      {lesson.display_order || lesson.order || (indexOfFirstItem + index + 1)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/lessons/${lesson.id}/steps`)}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                        >
                          📋 Steps
                        </button>
                        <button
                          onClick={() => navigate(`/admin/lessons/${lesson.id}/edit`)}
                          className="bg-[#4d4398] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#5a4fa8] transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(lesson.id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, lessons.length)} of {lessons.length} lessons
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      currentPage === i + 1
                        ? 'bg-[#4d4398] text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this lesson? This action cannot be undone and will also delete all associated steps and quizzes.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-6 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonsList;