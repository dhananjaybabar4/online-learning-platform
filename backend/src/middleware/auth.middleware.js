// backend/src/middleware/auth.js
const { supabase, supabaseAdmin } = require('../config/supabase');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Auth Middleware:', {
      hasAuthHeader: !!authHeader,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
    });

    if (!token) {
      console.error('❌ No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('❌ Token verification failed:', error?.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    console.log('✅ User authenticated:', user.email);

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      console.error('❌ No user in request');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log('🔍 Checking admin role for:', req.user.email);

    // Get user role from database
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !userData) {
      console.error('❌ User not found in database:', error?.message);
      return res.status(403).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('👤 User role:', userData.role);

    if (userData.role !== 'ADMIN') {
      console.error('❌ User is not admin:', userData.role);
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    console.log('✅ Admin access granted');
    next();
  } catch (error) {
    console.error('❌ Admin check error:', error);
    return res.status(403).json({
      success: false,
      error: 'Authorization failed'
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin
};