// backend/src/controllers/student.controller.js
const db = require('../config/database');

// ================================
// STUDENT - GET LESSONS WITH PROGRESS
// ================================

exports.getAllLessons = async (req, res) => {
  try {
    const userId = req.user?.id; // From auth middleware (JWT token)
    
    // Fetch all lessons with user progress
    const result = await db.query(`
      SELECT 
        l.id,
        l.title,
        l.language,
        l.difficulty,
        l.image_url,
        l."order" as order_index,
        l.description,
        l.created_at,
        
        -- Count total steps
        COUNT(DISTINCT ls.id) as total_steps,
        
        -- Count completed steps for this user
        COALESCE(
          (SELECT COUNT(*) 
           FROM user_step_progress usp
           JOIN lesson_steps ls2 ON usp.step_id = ls2.id
           WHERE ls2.lesson_id = l.id 
           AND usp.user_id = $1 
           AND usp.completed = true),
          0
        ) as completed_steps,
        
        -- Check if lesson is completed
        CASE 
          WHEN COUNT(DISTINCT ls.id) > 0 AND
               COUNT(DISTINCT ls.id) = 
               (SELECT COUNT(*) 
                FROM user_step_progress usp
                JOIN lesson_steps ls3 ON usp.step_id = ls3.id
                WHERE ls3.lesson_id = l.id 
                AND usp.user_id = $1 
                AND usp.completed = true)
          THEN true
          ELSE false
        END as is_completed,
        
        -- Calculate progress percentage
        CASE 
          WHEN COUNT(DISTINCT ls.id) = 0 THEN 0
          ELSE ROUND(
            (COALESCE(
              (SELECT COUNT(*) 
               FROM user_step_progress usp
               JOIN lesson_steps ls4 ON usp.step_id = ls4.id
               WHERE ls4.lesson_id = l.id 
               AND usp.user_id = $1 
               AND usp.completed = true),
              0
            )::numeric / COUNT(DISTINCT ls.id)::numeric) * 100
          )
        END as percentage,
        
        -- Get topic info (if you have topics table)
        t.id as topic_id,
        t.title as topic_title,
        t.icon as topic_icon
        
      FROM lessons l
      LEFT JOIN lesson_steps ls ON l.id = ls.lesson_id
      LEFT JOIN topics t ON l.topic_id = t.id
      GROUP BY l.id, t.id, t.title, t.icon
      ORDER BY l."order" ASC
    `, [userId || null]);
    
    // Format response
    const lessons = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      language: row.language,
      difficulty: row.difficulty,
      image_url: row.image_url,
      order_index: row.order_index,
      description: row.description,
      created_at: row.created_at,
      topic: row.topic_id ? {
        id: row.topic_id,
        title: row.topic_title,
        icon: row.topic_icon
      } : null,
      progress: {
        total_steps: parseInt(row.total_steps),
        completed_steps: parseInt(row.completed_steps),
        percentage: parseInt(row.percentage),
        is_completed: row.is_completed
      }
    }));
    
    res.json({ 
      success: true, 
      data: lessons 
    });
  } catch (error) {
    console.error('Error fetching student lessons:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching lessons' 
    });
  }
};

// ================================
// STUDENT - GET SINGLE LESSON WITH STEPS
// ================================

exports.getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id;
    
    // Get lesson details
    const lessonResult = await db.query(
      `SELECT * FROM lessons WHERE id = $1`,
      [lessonId]
    );
    
    if (lessonResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lesson not found' 
      });
    }
    
    // Get all steps for this lesson
    const stepsResult = await db.query(`
      SELECT 
        ls.*,
        COALESCE(usp.completed, false) as is_completed
      FROM lesson_steps ls
      LEFT JOIN user_step_progress usp ON ls.id = usp.step_id AND usp.user_id = $1
      WHERE ls.lesson_id = $2
      ORDER BY ls."order" ASC
    `, [userId, lessonId]);
    
    res.json({ 
      success: true, 
      data: {
        ...lessonResult.rows[0],
        steps: stepsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching lesson' 
    });
  }
};

// ================================
// STUDENT - MARK STEP AS COMPLETED
// ================================

exports.completeStep = async (req, res) => {
  try {
    const { stepId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not authenticated' 
      });
    }
    
    // Insert or update progress
    await db.query(`
      INSERT INTO user_step_progress (user_id, step_id, completed, completed_at)
      VALUES ($1, $2, true, NOW())
      ON CONFLICT (user_id, step_id) 
      DO UPDATE SET completed = true, completed_at = NOW()
    `, [userId, stepId]);
    
    // Check if all steps in lesson are completed
    const checkComplete = await db.query(`
      SELECT 
        ls.lesson_id,
        COUNT(ls.id) as total_steps,
        COUNT(usp.id) FILTER (WHERE usp.completed = true) as completed_steps
      FROM lesson_steps ls
      LEFT JOIN user_step_progress usp ON ls.id = usp.step_id AND usp.user_id = $1
      WHERE ls.lesson_id = (SELECT lesson_id FROM lesson_steps WHERE id = $2)
      GROUP BY ls.lesson_id
    `, [userId, stepId]);
    
    const { lesson_id, total_steps, completed_steps } = checkComplete.rows[0];
    const lessonCompleted = total_steps === completed_steps;
    
    // If lesson completed, award XP
    if (lessonCompleted) {
      await db.query(`
        UPDATE user_stats 
        SET total_xp = total_xp + 50,
            lessons_completed = lessons_completed + 1
        WHERE user_id = $1
      `, [userId]);
    }
    
    res.json({ 
      success: true,
      message: 'Step completed',
      lessonCompleted,
      xpAwarded: lessonCompleted ? 50 : 0
    });
  } catch (error) {
    console.error('Error completing step:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error completing step' 
    });
  }
};

// ================================
// STUDENT - GET ALL TOPICS (for filter)
// ================================

exports.getAllTopics = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, title, icon, "order"
      FROM topics
      ORDER BY "order" ASC
    `);
    
    res.json({ 
      success: true, 
      data: result.rows 
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching topics' 
    });
  }
};