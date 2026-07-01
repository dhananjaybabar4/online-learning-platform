// backend/src/middleware/student.middleware.js
const { supabase } = require('../config/supabase');

// Student authentication middleware
const studentAuth = async (req, res, next) => {
  try {
    console.log('🔐 Student Auth Middleware - Starting...');
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔑 Student Token Info:', {
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 30)}...` : 'none'
    });

    if (!token) {
      console.error('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access token required. Please login.'
      });
    }

    // Verify token with Supabase
    console.log('🔍 Verifying student token...');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('❌ Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token. Please login again.'
      });
    }

    if (!user) {
      console.error('❌ No user found for token');
      return res.status(401).json({
        success: false,
        error: 'User not found. Please login again.'
      });
    }

    console.log('✅ Student authenticated:', user.email);

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Student auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed: ' + error.message
    });
  }
};

module.exports = {
  studentAuth
};