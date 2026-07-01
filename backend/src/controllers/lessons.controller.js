// backend/src/controllers/lessons.controller.js
const { supabaseAdmin } = require('../config/supabase');

// Use admin client for all operations
const supabase = supabaseAdmin;

// ================================
// LESSONS CRUD
// ================================

// GET all lessons
exports.getAllLessons = async (req, res) => {
  try {
    console.log('📚 Fetching all lessons...');
    
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });
    
    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    console.log(`✅ Fetched ${data?.length || 0} lessons`);
    
    // Map order_index back to display_order for frontend compatibility
    const mappedData = data?.map(lesson => ({
      ...lesson,
      display_order: lesson.order_index
    })) || [];
    
    res.json({ 
      success: true, 
      data: mappedData
    });
  } catch (error) {
    console.error('❌ Error fetching lessons:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching lessons',
      error: error.message
    });
  }
};

// GET lesson by ID
exports.getLessonById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📖 Fetching lesson: ${id}`);
    
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lesson not found' 
      });
    }
    
    console.log(`✅ Found lesson: ${data.title}`);
    
    // Map order_index to display_order for frontend
    const mappedData = {
      ...data,
      display_order: data.order_index
    };
    
    res.json({ 
      success: true, 
      data: mappedData
    });
  } catch (error) {
    console.error('❌ Error fetching lesson:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching lesson',
      error: error.message
    });
  }
};

// CREATE lesson - USING EXPLICIT FIELD MAPPING
exports.createLesson = async (req, res) => {
  try {
    const { 
      title, 
      language, 
      difficulty, 
      image_url, 
      display_order,
      description,
      topic_id,
      module_id,
      xp_reward,
      estimated_duration,
      icon
    } = req.body;
    
    console.log('➕ Creating lesson - Request body:', req.body);
    
    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }
    
    // ✅ Build insert object with ONLY valid column names
    const insertData = {
      title: title.trim(),
      description: description || null,
      language: language || null,
      difficulty: difficulty || 'beginner',
      image_url: image_url || null,
      icon: icon || '📖',
      order_index: display_order ? parseInt(display_order) : 1,
      topic_id: topic_id ? parseInt(topic_id) : null,
      module_id: module_id || null,
      xp_reward: xp_reward ? parseInt(xp_reward) : 10,
      estimated_duration: estimated_duration ? parseInt(estimated_duration) : 15,
      is_active: true
    };
    
    console.log('📦 Insert data being sent to Supabase:', JSON.stringify(insertData, null, 2));
    
    const { data, error } = await supabase
      .from('lessons')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase insert error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      throw error;
    }
    
    console.log('✅ Lesson created:', data.id);
    
    // ✅ Map order_index back to display_order for frontend
    const responseData = {
      ...data,
      display_order: data.order_index
    };
    
    res.status(201).json({ 
      success: true, 
      data: responseData,
      message: 'Lesson created successfully' 
    });
  } catch (error) {
    console.error('❌ Error creating lesson:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating lesson',
      error: error.message
    });
  }
};

// UPDATE lesson
exports.updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      language, 
      difficulty, 
      image_url, 
      display_order,
      order,
      description,
      topic_id,
      module_id,
      xp_reward,
      estimated_duration,
      icon,
      is_active
    } = req.body;
    
    console.log(`📝 Updating lesson: ${id}`, { display_order, order });
    
    // Prepare update data - ONLY include fields that are defined
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (language !== undefined) updateData.language = language;
    if (difficulty !== undefined) updateData.difficulty = difficulty;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (icon !== undefined) updateData.icon = icon;
    
    // ✅ Handle both display_order and order
    if (display_order !== undefined) {
      updateData.order_index = parseInt(display_order);
    } else if (order !== undefined) {
      updateData.order_index = parseInt(order);
    }
    
    if (topic_id !== undefined) updateData.topic_id = topic_id ? parseInt(topic_id) : null;
    if (module_id !== undefined) updateData.module_id = module_id;
    if (xp_reward !== undefined) updateData.xp_reward = parseInt(xp_reward);
    if (estimated_duration !== undefined) updateData.estimated_duration = parseInt(estimated_duration);
    if (is_active !== undefined) updateData.is_active = is_active;
    
    console.log('📦 Update data:', JSON.stringify(updateData, null, 2));
    
    const { data, error } = await supabase
      .from('lessons')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase update error:', error);
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lesson not found' 
      });
    }
    
    console.log('✅ Lesson updated:', data.id);
    
    // Map order_index back to display_order for frontend
    const mappedData = {
      ...data,
      display_order: data.order_index
    };
    
    res.json({ 
      success: true, 
      data: mappedData,
      message: 'Lesson updated successfully' 
    });
  } catch (error) {
    console.error('❌ Error updating lesson:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating lesson',
      error: error.message
    });
  }
};

// DELETE lesson
exports.deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting lesson: ${id}`);
    
    const { data, error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('❌ Supabase delete error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lesson not found' 
      });
    }
    
    console.log('✅ Lesson deleted');
    
    res.json({ 
      success: true,
      message: 'Lesson deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting lesson:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting lesson',
      error: error.message
    });
  }
};

// ================================
// LESSON STEPS
// ================================

// GET steps for a lesson
exports.getStepsByLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;
    console.log(`📋 Fetching steps for lesson: ${lessonId}`);
    
    // 🔧 FIX: Use order_number instead of order_index for lesson_steps table
    const { data, error } = await supabase
      .from('lesson_steps')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_number', { ascending: true });  // ✅ FIXED: order_number
    
    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
    
    console.log(`✅ Found ${data?.length || 0} steps`);
    
    // ✅ Map order_number to 'order' for frontend compatibility
    const mappedData = data?.map(step => ({
      ...step,
      order: step.order_number,  // ✅ FIXED: order_number
      type: step.step_type
    })) || [];
    
    res.json({ 
      success: true, 
      data: mappedData
    });
  } catch (error) {
    console.error('❌ Error fetching steps:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching steps',
      error: error.message
    });
  }
}

// GET step by ID
exports.getStepById = async (req, res) => {
  try {
    const { stepId } = req.params;
    console.log(`📋 Fetching step: ${stepId}`);
    
    const { data, error } = await supabase
      .from('lesson_steps')
      .select('*')
      .eq('id', stepId)
      .single();
    
    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Step not found' 
      });
    }
    
    console.log('✅ Found step');
    
    // ✅ Map order_number to 'order' and step_type to 'type' for frontend
    const mappedData = {
      ...data,
      order: data.order_number,  // ✅ FIXED: order_number
      type: data.step_type
    };
    
    res.json({ 
      success: true, 
      data: mappedData
    });
  } catch (error) {
    console.error('❌ Error fetching step:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching step',
      error: error.message
    });
  }
};

// CREATE step
exports.createStep = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { 
      title,
      step_type, 
      type,
      content, 
      order, 
      question_text,
      code_snippet,
      expected_output,
      hints,
      video_url,
      image_url
    } = req.body;
    
    console.log(`📝 Creating step for lesson: ${lessonId}`, req.body);
    
    // Accept either 'type' or 'step_type' from frontend
    const stepTypeValue = step_type || type || 'text';
    
    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }
    
    // ✅ Build insert object with correct column names
    const stepData = {
      lesson_id: lessonId,
      title: title.trim(),
      step_type: stepTypeValue,           // Database column: step_type
      content: content || null,
      order_number: parseInt(order) || 1,  // ✅ FIXED: order_number
      question_text: question_text || null,
      code_snippet: code_snippet || null,
      expected_output: expected_output || null,
      hints: hints || null,
      video_url: video_url || null,
      image_url: image_url || null
    };
    
    console.log('📦 Prepared step data:', JSON.stringify(stepData, null, 2));
    
    const { data, error } = await supabase
      .from('lesson_steps')
      .insert(stepData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase insert error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }
    
    console.log('✅ Step created:', data.id);
    
    // ✅ Map database fields to frontend expected fields
    const mappedData = {
      ...data,
      order: data.order_number,  // ✅ FIXED: order_number
      type: data.step_type      // Map step_type to 'type'
    };
    
    res.status(201).json({ 
      success: true, 
      data: mappedData,
      message: 'Step created successfully' 
    });
  } catch (error) {
    console.error('❌ Error creating step:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating step',
      error: error.message
    });
  }
};

// UPDATE step
exports.updateStep = async (req, res) => {
  try {
    const { stepId } = req.params;
    const { 
      title,
      step_type,
      type,
      content, 
      order, 
      question_text,
      code_snippet,
      expected_output,
      hints,
      video_url,
      image_url
    } = req.body;
    
    console.log(`📝 Updating step: ${stepId}`, req.body);
    
    // Prepare update data - ONLY include fields that are defined
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    if (title !== undefined) updateData.title = title.trim();
    
    // Accept either 'step_type' or 'type' from frontend
    if (step_type !== undefined) {
      updateData.step_type = step_type;
    } else if (type !== undefined) {
      updateData.step_type = type;
    }
    
    if (content !== undefined) updateData.content = content;
    
    // ✅ Map 'order' to 'order_number' for database
    if (order !== undefined) updateData.order_number = parseInt(order);  // ✅ FIXED: order_number
    
    if (question_text !== undefined) updateData.question_text = question_text;
    if (code_snippet !== undefined) updateData.code_snippet = code_snippet;
    if (expected_output !== undefined) updateData.expected_output = expected_output;
    if (hints !== undefined) updateData.hints = hints;
    if (video_url !== undefined) updateData.video_url = video_url;
    if (image_url !== undefined) updateData.image_url = image_url;
    
    console.log('📦 Update data:', JSON.stringify(updateData, null, 2));
    
    const { data, error } = await supabase
      .from('lesson_steps')
      .update(updateData)
      .eq('id', stepId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase update error:', error);
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({ 
        success: false, 
        message: 'Step not found' 
      });
    }
    
    console.log('✅ Step updated');
    
    // ✅ Map database fields to frontend expected fields
    const mappedData = {
      ...data,
      order: data.order_number,  // ✅ FIXED: order_number
      type: data.step_type      // Map step_type to 'type'
    };
    
    res.json({ 
      success: true, 
      data: mappedData,
      message: 'Step updated successfully' 
    });
  } catch (error) {
    console.error('❌ Error updating step:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating step',
      error: error.message
    });
  }
};

// DELETE step
exports.deleteStep = async (req, res) => {
  try {
    const { stepId } = req.params;
    console.log(`🗑️ Deleting step: ${stepId}`);
    
    const { data, error } = await supabase
      .from('lesson_steps')
      .delete()
      .eq('id', stepId)
      .select();
    
    if (error) {
      console.error('❌ Supabase delete error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Step not found' 
      });
    }
    
    console.log('✅ Step deleted');
    
    res.json({ 
      success: true,
      message: 'Step deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting step:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting step',
      error: error.message
    });
  }
};

module.exports = exports;