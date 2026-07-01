// src/components/admin/lessons/LessonsCreate.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';

const LessonsCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    language: '',
    difficulty: 'beginner',
    image_url: '',
    display_order: 1,
    description: ''
  });

  // Grouped by section — matches student Lessons page sections
  const languageGroups = [
    {
      section: '🌐 Web Development',
      langs: ['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Next.js', 'Tailwind']
    },
    {
      section: '⚙️ Backend & Server',
      langs: ['Node.js', 'Express', 'API', 'REST', 'GraphQL', 'Django', 'Flask', 'PHP', 'Laravel']
    },
    {
      section: '🤖 AI & Machine Learning',
      langs: ['Python', 'AI', 'ML', 'Machine Learning', 'Deep Learning', 'Data Science', 'TensorFlow', 'PyTorch']
    },
    {
      section: '☕ Java & JVM',
      langs: ['Java', 'Kotlin', 'Scala', 'Groovy']
    },
    {
      section: '🗄️ Database',
      langs: ['SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis']
    },
    {
      section: '🛠️ Tools & DevOps',
      langs: ['Git', 'GitHub', 'Docker', 'Kubernetes', 'Linux', 'AWS', 'DevOps']
    },
  ];

  const difficulties = ['beginner', 'intermediate', 'advanced'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Fix image URL path formatting (replace backslashes with forward slashes)
    let processedValue = value;
    if (name === 'image_url' && value) {
      processedValue = value.replace(/\\/g, '/');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.language) {
      setError('Language is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Clean and prepare data for submission
      const submitData = {
        title: formData.title.trim(),
        language: formData.language,
        difficulty: formData.difficulty,
        image_url: formData.image_url ? formData.image_url.replace(/\\/g, '/') : '',
        display_order: parseInt(formData.display_order) || 1,
        description: formData.description.trim()
      };

      console.log('📤 Submitting lesson data:', submitData);

      const response = await api.lessons.create(submitData);

      console.log('📥 Response received:', response);

      if (response.success) {
        // Navigate back to lessons list
        navigate('/admin/lessons');
      } else {
        setError(response.message || 'Failed to create lesson. Please check the server logs.');
      }
    } catch (err) {
      console.error('❌ Error creating lesson:', err);
      setError(err.message || 'Error creating lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            Create New Lesson
          </h1>
          <p className="text-gray-600 mt-2">Fill in the details to create a new lesson</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
                <p className="text-xs mt-2 text-red-600">
                  If this persists, check the browser console and server logs for more details.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
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
            <p className="mt-2 text-sm text-gray-500">
              Optional: Enter the path or URL for the lesson icon (use forward slashes)
            </p>
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
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#4d4398] text-white rounded-lg font-semibold hover:bg-[#5a4fa8] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </span>
              ) : (
                'Save Lesson'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LessonsCreate;