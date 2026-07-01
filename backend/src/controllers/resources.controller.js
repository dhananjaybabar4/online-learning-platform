// backend/src/controllers/resources.controller.js
const { supabaseAdmin } = require('../config/supabase');
const path = require('path');
const fs = require('fs');

// ============================================
// RESOURCES CONTROLLER (Unified)
// Supports: YouTube URL, PDF upload, Notes PDF
// Types: notes | videos | cheatsheets | articles
// ============================================

/**
 * Get published resources (for student /resources page)
 */
const getAllResources = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('resources')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('❌ Get resources error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get ALL resources including drafts (for admin panel)
 */
const getAllResourcesAdmin = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('❌ Get resources (admin) error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get resource by ID
 */
const getResourceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from('resources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ success: false, message: 'Resource not found' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get resources by type
 */
const getResourcesByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { data, error } = await supabaseAdmin
      .from('resources')
      .select('*')
      .eq('type', type)
      .eq('is_published', true)
      .order('title', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create / Upload resource (Admin only)
 * Body fields: title, description, category, type, url, meta, is_published
 * File field:  file (PDF/doc/etc)
 */
const createResource = async (req, res) => {
  try {
    const { title, description, category, type, url, meta, is_published } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Type is required: notes | videos | cheatsheets | articles'
      });
    }

    let file_path = null;
    let resourceUrl = url || null;
    let resourceMeta = meta || null;

    // ── Handle file upload (PDF / notes / cheatsheet) ──
    if (req.file) {
      file_path = `resources/${req.file.filename}`;
      // Serve via express static from /uploads
      resourceUrl = `/uploads/${file_path}`;

      if (!resourceMeta) {
        const mb = (req.file.size / (1024 * 1024)).toFixed(1);
        resourceMeta = `${mb} MB`;
      }
    }

    // ── Validate YouTube URL for video type ──
    if (type === 'videos') {
      if (!resourceUrl) {
        return res.status(400).json({ success: false, message: 'YouTube URL is required for videos' });
      }
      const ytMatch = resourceUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      if (!ytMatch) {
        return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });
      }
    }

    // ── Validate file/url for notes and cheatsheets ──
    if ((type === 'notes' || type === 'cheatsheets') && !resourceUrl) {
      return res.status(400).json({ success: false, message: 'Upload a PDF or provide a URL' });
    }

    const { data, error } = await supabaseAdmin
      .from('resources')
      .insert([{
        title: title.trim(),
        description: description?.trim() || '',
        category: category?.trim() || '',
        type,           // notes | videos | cheatsheets | articles
        url: resourceUrl,
        file_path,
        meta: resourceMeta,
        is_published: is_published === 'true' || is_published === true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Resource created:', data.id);
    res.status(201).json({ success: true, message: 'Resource created successfully', data });
  } catch (error) {
    console.error('❌ Create resource error:', error);
    // Cleanup uploaded file on DB error
    if (req.file) {
      const fp = path.join(__dirname, '../../uploads/resources', req.file.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update resource (Admin only)
 */
const updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, type, url, meta, is_published } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined)        updates.title = title.trim();
    if (description !== undefined)  updates.description = description;
    if (category !== undefined)     updates.category = category;
    if (type !== undefined)         updates.type = type;
    if (url !== undefined)          updates.url = url;
    if (meta !== undefined)         updates.meta = meta;
    if (is_published !== undefined) updates.is_published = is_published === 'true' || is_published === true;

    // Handle new file replacement
    if (req.file) {
      const { data: existing } = await supabaseAdmin
        .from('resources').select('file_path').eq('id', id).single();

      if (existing?.file_path) {
        const oldPath = path.join(__dirname, '../../uploads', existing.file_path);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      updates.file_path = `resources/${req.file.filename}`;
      updates.url = `/uploads/${updates.file_path}`;
      updates.meta = `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`;
    }

    const { data, error } = await supabaseAdmin
      .from('resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, message: 'Resource updated successfully', data });
  } catch (error) {
    console.error('❌ Update resource error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete resource (Admin only)
 */
const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: resource } = await supabaseAdmin
      .from('resources').select('file_path').eq('id', id).single();

    if (resource?.file_path) {
      const fp = path.join(__dirname, '../../uploads', resource.file_path);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }

    const { error } = await supabaseAdmin.from('resources').delete().eq('id', id);
    if (error) throw error;

    console.log('✅ Resource deleted:', id);
    res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('❌ Delete resource error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllResources,
  getAllResourcesAdmin,
  getResourceById,
  getResourcesByType,
  createResource,
  updateResource,
  deleteResource
};