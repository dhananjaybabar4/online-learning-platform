// backend/src/controllers/steps.controller.js
const { supabase } = require('../config/supabase');

// Get all steps for a lesson
exports.getStepsByLesson = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const { data, error } = await supabase
      .from('lesson_steps')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_number', { ascending: true });  // ✅ CORRECT: using 'order_number' column

    if (error) {
      console.error('❌ Error fetching steps:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching steps',
        error: error.message
      });
    }

    // ✅ Map order_number to 'order' and 'order_index' for frontend compatibility
    const mappedData = data?.map(step => ({
      ...step,
      order: step.order_number,
      order_index: step.order_number,
      type: step.step_type
    })) || [];

    res.json({
      success: true,
      data: mappedData
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get single step by ID
exports.getStepById = async (req, res) => {
  try {
    const { lessonId, stepId } = req.params;

    const { data, error } = await supabase
      .from('lesson_steps')
      .select('*')
      .eq('id', stepId)
      .eq('lesson_id', lessonId)
      .single();

    if (error) {
      console.error('❌ Error fetching step:', error);
      return res.status(404).json({
        success: false,
        message: 'Step not found',
        error: error.message
      });
    }

    // ✅ Map order_number to 'order' and 'order_index' for frontend
    const mappedData = {
      ...data,
      order: data.order_number,
      order_index: data.order_number,
      type: data.step_type
    };

    res.json({
      success: true,
      data: mappedData
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Create new step
exports.createStep = async (req, res) => {
  try {
    const { lessonId } = req.params;
    console.log('📝 Creating step - Request body:', req.body);
    
    const { 
      title, 
      content, 
      type, 
      step_type,
      order,
      order_index,
      order_number,
      video_url, 
      image_url,
      question_text,
      code_snippet,
      code_example,
      expected_output,
      hints
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Accept 'type' or 'step_type' from frontend
    const stepTypeValue = step_type || type || 'text';
    
    // Accept 'order', 'order_index', or 'order_number' from frontend
    const orderValue = order_number || order_index || order || 1;

    const insertData = {
      lesson_id: lessonId,
      title,
      content: content || null,
      step_type: stepTypeValue,
      order_number: orderValue,  // ✅ Using correct 'order_number' column
      video_url: video_url || null,
      image_url: image_url || null,
      question_text: question_text || null,
      code_snippet: code_snippet || null,
      code_example: code_example || null,
      expected_output: expected_output || null,
      hints: hints || null
    };

    console.log('📝 Creating step with data:', insertData);

    const { data, error } = await supabase
      .from('lesson_steps')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating step:', error);
      return res.status(500).json({
        success: false,
        message: 'Error creating step',
        error: error.message
      });
    }

    console.log('✅ Step created:', data);

    // ✅ Map database fields to frontend expected fields
    const mappedData = {
      ...data,
      order: data.order_number,
      order_index: data.order_number,
      type: data.step_type
    };

    res.status(201).json({
      success: true,
      message: 'Step created successfully',
      data: mappedData
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update step
exports.updateStep = async (req, res) => {
  try {
    const { lessonId, stepId } = req.params;
    console.log('✏️ Updating step:', stepId);
    console.log('📝 Update request body:', req.body);
    
    const { 
      title, 
      content, 
      type, 
      step_type,
      order,
      order_index,
      order_number,
      video_url, 
      image_url,
      question_text,
      code_snippet,
      code_example,
      expected_output,
      hints
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    // Accept 'type' or 'step_type' from frontend
    const stepTypeValue = step_type || type || 'text';
    
    // Accept 'order', 'order_index', or 'order_number' from frontend
    const orderValue = order_number || order_index || order || 1;

    const updateData = {
      title,
      content: content || null,
      step_type: stepTypeValue,
      order_number: orderValue,  // ✅ Using correct 'order_number' column
      video_url: video_url || null,
      image_url: image_url || null,
      question_text: question_text || null,
      code_snippet: code_snippet || null,
      code_example: code_example || null,
      expected_output: expected_output || null,
      hints: hints || null,
      updated_at: new Date().toISOString()
    };

    console.log('✏️ Updating step with data:', updateData);

    const { data, error } = await supabase
      .from('lesson_steps')
      .update(updateData)
      .eq('id', stepId)
      .eq('lesson_id', lessonId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating step:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating step',
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
    }

    console.log('✅ Step updated:', data);

    // ✅ Map database fields to frontend expected fields
    const mappedData = {
      ...data,
      order: data.order_number,
      order_index: data.order_number,
      type: data.step_type
    };

    res.json({
      success: true,
      message: 'Step updated successfully',
      data: mappedData
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Delete step
exports.deleteStep = async (req, res) => {
  try {
    const { lessonId, stepId } = req.params;

    const { error } = await supabase
      .from('lesson_steps')
      .delete()
      .eq('id', stepId)
      .eq('lesson_id', lessonId);

    if (error) {
      console.error('❌ Error deleting step:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting step',
        error: error.message
      });
    }

    console.log('✅ Step deleted:', stepId);
    res.json({
      success: true,
      message: 'Step deleted successfully'
    });
  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};