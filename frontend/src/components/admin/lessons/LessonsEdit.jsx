// src/components/admin/lessons/LessonsEdit.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '../../../services/api';

const LessonsEdit = () => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  
  const lessonId = params.lessonId || params.id;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    language: '',
    difficulty: 'beginner',
    image_url: '',
    display_order: 1,
    description: ''
  });

  const languageGroups = [
    { section: '🌐 Web Development',      langs: ['HTML','CSS','JavaScript','TypeScript','React','Vue','Angular','Next.js','Tailwind'] },
    { section: '⚙️ Backend & Server',      langs: ['Node.js','Express','API','REST','GraphQL','Django','Flask','PHP','Laravel'] },
    { section: '🤖 AI & Machine Learning', langs: ['Python','AI','ML','Machine Learning','Deep Learning','Data Science','TensorFlow','PyTorch'] },
    { section: '☕ Java & JVM',            langs: ['Java','Kotlin','Scala','Groovy'] },
    { section: '🗄️ Database',             langs: ['SQL','PostgreSQL','MySQL','MongoDB','Redis'] },
    { section: '🛠️ Tools & DevOps',       langs: ['Git','GitHub','Docker','Kubernetes','Linux','AWS','DevOps'] },
  ];

  const difficulties = ['beginner', 'intermediate', 'advanced'];

  useEffect(() => {
    if (!lessonId || lessonId === 'undefined' || lessonId === 'edit') {
      setError('Invalid lesson ID. Please check your route configuration.');
      setLoading(false);
      return;
    }
    fetchLesson();
  }, [lessonId]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const response = await api.lessons.getById(lessonId);
      
      if (response.success && response.data) {
        const lesson = response.data;
        
        let cleanImageUrl = lesson.image_url || '';
        if (cleanImageUrl) {
          cleanImageUrl = cleanImageUrl.replace(/^.*[\\\/]frontend[\\\/]/, '/');
          cleanImageUrl = cleanImageUrl.replace(/^.*[\\\/]public[\\\/]/, '/');
          cleanImageUrl = cleanImageUrl.replace(/^.*[\\\/]src[\\\/]assets[\\\/]/, '/assets/');
          cleanImageUrl = cleanImageUrl.replace(/\\/g, '/');
          if (cleanImageUrl && !cleanImageUrl.startsWith('/') && !cleanImageUrl.startsWith('http')) {
            cleanImageUrl = '/' + cleanImageUrl;
          }
        }
        
        setFormData({
          title: lesson.title || '',
          language: lesson.language || '',
          difficulty: lesson.difficulty || 'beginner',
          image_url: cleanImageUrl,
          display_order: lesson.display_order || lesson.order || 1,
          description: lesson.description || ''
        });
        setImageError(false);
        setError(null);
      } else {
        setError('Lesson not found');
      }
    } catch (err) {
      setError('Error loading lesson: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    if (name === 'image_url' && value) {
      processedValue = value.replace(/\\/g, '/');
      processedValue = processedValue.replace(/^.*[/]frontend[/]/, '/');
      processedValue = processedValue.replace(/^.*[/]public[/]/, '/');
      processedValue = processedValue.replace(/^.*[/]src[/]assets[/]/, '/assets/');
      processedValue = processedValue.replace(/^src[/]assets[/]/, '/assets/');
      processedValue = processedValue.replace(/^assets[/]/, '/assets/');
      if (processedValue && !processedValue.startsWith('/') && !processedValue.startsWith('http')) {
        processedValue = '/' + processedValue;
      }
    }
    
    if (name === 'image_url') setImageError(false);
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.language) {
      setError('Language is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const submitData = {
        ...formData,
        title: formData.title.trim(),
        description: formData.description.trim(),
        display_order: parseInt(formData.display_order) || 1
      };

      const response = await api.lessons.update(lessonId, submitData);

      if (response.success) {
        navigate('/admin/lessons');
      } else {
        setError(response.message || 'Failed to update lesson');
      }
    } catch (err) {
      setError('Error updating lesson: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#4d4398] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (!lessonId || lessonId === 'undefined' || lessonId === 'edit') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-900 mb-2">Invalid Lesson ID</h2>
          <p className="text-red-700 mb-4">The lesson ID is missing or invalid.</p>
          <button
            onClick={() => navigate('/admin/lessons')}
            className="bg-[#4d4398] text-white px-6 py-2 rounded-lg hover:bg-[#5a4fa8]"
          >
            Back to Lessons
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/lessons')}
          className="text-[#4d4398] hover:text-[#5a4fa8] font-medium flex items-center gap-2"
        >
          ← Back to Lessons
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            ✏️ Edit Lesson
          </h1>
          <p className="text-gray-600 mt-2">Update lesson details</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d4398] focus:border-transparent outline-none transition-all"
              placeholder="e.g., HTML Basics"
              required
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Language <span className="text-red-500">*</span>
            </label>
            <select
              name="language"
              value={formData.language}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d4398] focus:border-transparent outline-none transition-all"
              required
            >
              <option value="">Select Language</option>
              {languageGroups.map(group => (
                <optgroup key={group.section} label={group.section}>
                  {group.langs.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Difficulty
            </label>
            <select
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d4398] focus:border-transparent outline-none transition-all"
            >
              {difficulties.map(diff => (
                <option key={diff} value={diff}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d4398] focus:border-transparent outline-none transition-all resize-none"
              placeholder="Brief description of the lesson..."
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Image URL
            </label>
            <input
              type="text"
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d4398] focus:border-transparent outline-none transition-all"
              placeholder="/assets/html.svg"
            />
            <p className="mt-1 text-sm text-gray-500">
              Use paths like <code className="bg-gray-100 px-1 rounded">/assets/html.svg</code> or a full URL
            </p>

            {/* Image Preview */}
            {formData.image_url && (
              <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-3">Preview:</p>
                <div className="flex items-center gap-4">
                  {!imageError ? (
                    <img 
                      src={formData.image_url}
                      alt="Preview"
                      className="w-20 h-20 object-contain border border-gray-300 rounded-lg bg-white p-1"
                      onError={() => setImageError(true)}
                      onLoad={() => setImageError(false)}
                    />
                  ) : (
                    <div className="w-20 h-20 border-2 border-dashed border-red-300 rounded-lg bg-red-50 flex flex-col items-center justify-center gap-1">
                      <span className="text-2xl">❌</span>
                      <span className="text-xs text-red-500 text-center leading-tight">Image not found</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{imageError ? '⚠️ Cannot load image' : '✅ Image loaded'}</p>
                    <p className="text-xs text-gray-400 mt-1 break-all max-w-xs">{formData.image_url}</p>
                    {imageError && (
                      <p className="text-xs text-red-500 mt-1">
                        Make sure the file exists in your <code className="bg-gray-100 px-1 rounded">public/assets/</code> folder
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Display Order
            </label>
            <input
              type="number"
              name="display_order"
              value={formData.display_order}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4d4398] focus:border-transparent outline-none transition-all"
            />
            <p className="mt-2 text-sm text-gray-500">
              Display order on student home page (lower numbers appear first)
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/lessons')}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#4d4398] text-white rounded-lg font-semibold hover:bg-[#5a4fa8] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LessonsEdit;