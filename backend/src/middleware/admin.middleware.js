// backend/src/middleware/admin.middleware.js
const { supabase, supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');

// Get JWT_SECRET with fallback
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Combined middleware to authenticate and verify admin access
const adminAuth = async (req, res, next) => {
  try {
    console.log('🔐 [MIDDLEWARE] Admin Auth Check');
    
    // Step 1: Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('   Token preview:', token ? `${token.substring(0, 30)}...` : 'none');

    if (!token) {
      console.error('❌ [MIDDLEWARE] No token provided');
      return res.status(401).json({
        success: false,
        error: 'Access token required. Please login.'
      });
    }

    // Step 2: Try to detect and verify custom JWT token first
    try {
      // Decode without verification first to check structure
      const decoded = jwt.decode(token, { complete: true });
      
      console.log('🔍 [MIDDLEWARE] Token structure:', {
        hasHeader: !!decoded?.header,
        hasPayload: !!decoded?.payload,
        hasAdminId: !!decoded?.payload?.adminId
      });
      
      // Check if it's our custom admin token (has adminId in payload)
      if (decoded && decoded.payload && decoded.payload.adminId) {
        console.log('🔍 [MIDDLEWARE] Detected custom admin token');
        
        // ✅ FIX: Verify the token with our JWT secret
        const verified = jwt.verify(token, JWT_SECRET);
        
        console.log('✅ [MIDDLEWARE] Custom token verified, adminId:', verified.adminId);
        
        // Fetch admin from database using the 'admins' table
        const { data: adminData, error: adminError } = await supabaseAdmin
          .from('admins')
          .select('id, email, name, role, status')
          .eq('id', verified.adminId)
          .eq('status', 'active')
          .single();

        if (adminError) {
          console.error('❌ [MIDDLEWARE] Database error:', adminError.message);
          return res.status(401).json({
            success: false,
            error: 'Admin verification failed'
          });
        }

        if (!adminData) {
          console.error('❌ [MIDDLEWARE] Admin not found in database');
          return res.status(401).json({
            success: false,
            error: 'Invalid token or inactive admin'
          });
        }

        if (adminData.status !== 'active') {
          console.error('❌ [MIDDLEWARE] Admin account is inactive');
          return res.status(401).json({
            success: false,
            error: 'Admin account is inactive'
          });
        }

        console.log('✅ [MIDDLEWARE] Admin verified (custom):', adminData.email);

        // Create user object in Supabase-compatible format
        const user = {
          id: adminData.id,
          email: adminData.email,
          user_metadata: {
            name: adminData.name
          }
        };

        // Attach to request
        req.user = user;
        req.userData = adminData;
        req.isCustomToken = true;

        return next();
      }
    } catch (jwtError) {
      // If JWT verification fails, it might be a Supabase token
      if (jwtError.name === 'JsonWebTokenError' || jwtError.name === 'TokenExpiredError') {
        console.log('🔍 [MIDDLEWARE] Custom token verification failed, trying Supabase...');
        console.log('   Error:', jwtError.message);
      } else {
        throw jwtError; // Re-throw unexpected errors
      }
    }

    // Step 3: Token is not a custom JWT, verify with Supabase
    console.log('🔍 [MIDDLEWARE] Verifying with Supabase...');
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

    if (error) {
      console.error('❌ [MIDDLEWARE] Supabase verification failed:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token. Please login again.'
      });
    }

    if (!supabaseUser) {
      console.error('❌ [MIDDLEWARE] No user found');
      return res.status(401).json({
        success: false,
        error: 'User not found. Please login again.'
      });
    }

    console.log('✅ [MIDDLEWARE] Supabase token verified:', supabaseUser.email);

    // Check if user is admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role, email, name, is_active')
      .eq('id', supabaseUser.id)
      .single();

    if (userError || !userData) {
      console.error('❌ [MIDDLEWARE] User not found in database');
      return res.status(403).json({
        success: false,
        error: 'User not found in database'
      });
    }

    if (!userData.is_active) {
      console.error('❌ [MIDDLEWARE] Account is inactive');
      return res.status(403).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    if (userData.role !== 'ADMIN') {
      console.error('❌ [MIDDLEWARE] Not an admin. Role:', userData.role);
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    console.log('✅ [MIDDLEWARE] Admin verified (Supabase):', userData.email);

    // Attach to request
    req.user = supabaseUser;
    req.userData = userData;
    req.isCustomToken = false;

    return next();

  } catch (error) {
    console.error('❌ [MIDDLEWARE] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization failed: ' + error.message
    });
  }
};

module.exports = { adminAuth };