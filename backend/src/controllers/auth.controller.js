const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');

const router = express.Router();

// ==================== REGISTRATION ====================
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const fullName = `${firstName} ${lastName}`.trim();

    console.log('📝 Registration attempt for:', email);
    console.log('   Name:', fullName);

    // Step 1: Check if user exists in database
    const { data: existingUserInDB } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existingUserInDB) {
      console.log('❌ User already exists in database:', email);
      return res.json({
        success: false,
        error: 'User already registered'
      });
    }

    console.log('✅ User not in database, checking Auth...');

    // Step 2: Check if user exists in Supabase Auth (orphaned user)
    try {
      // Try to get user by email from Auth
      const { data: authUserData, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(email);
      
      if (authUserData && authUserData.user) {
        console.log('⚠️ ORPHANED USER FOUND in Auth:', email);
        console.log('   User ID:', authUserData.user.id);
        console.log('   Attempting cleanup...');
        
        // Delete the orphaned auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserData.user.id);
        
        if (deleteError) {
          console.error('❌ Failed to delete orphaned user:', deleteError);
          return res.json({
            success: false,
            error: 'User cleanup failed. Please contact support.'
          });
        }
        
        console.log('✅ Successfully deleted orphaned auth user');
        
        // Wait a moment for the deletion to propagate
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log('✅ User not in Auth - clean slate');
      }
    } catch (authCheckError) {
      console.log('ℹ️ Auth check completed:', authCheckError.message);
      // If error is "User not found", that's actually good - proceed with registration
    }

    console.log('📝 Creating new auth user...');

    // Step 3: Create new auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          name: fullName,
          firstName: firstName,
          lastName: lastName
        }
      }
    });

    if (signUpError) {
      console.error('❌ Auth signup error:', signUpError);
      return res.json({
        success: false,
        error: signUpError.message
      });
    }

    if (!authData.user) {
      console.error('❌ No user returned from signup');
      return res.json({
        success: false,
        error: 'Registration failed - no user data'
      });
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Step 4: Create database profile
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: authData.user.id,
        email: email,
        name: fullName,
        role: 'STUDENT',
        auth_method: 'email',
        status: 'active',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database insert error:', dbError);
      
      // Cleanup: Delete auth user if database insert fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.log('🧹 Cleaned up auth user after DB failure');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError);
      }
      
      return res.json({
        success: false,
        error: 'Registration failed - database error'
      });
    }

    console.log('✅ User profile created successfully');
    console.log('   User ID:', userData.id);
    console.log('   Email:', userData.email);
    console.log('   Name:', userData.name);

    // Step 5: Return success
    return res.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Registration failed'
    });
  }
});

// ==================== LOGIN ====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    // Sign in with Supabase Auth
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('❌ Login error:', signInError);
      return res.json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Get user profile
    const { data: userData, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (dbError || !userData) {
      console.error('❌ User profile not found:', dbError);
      return res.json({
        success: false,
        error: 'User profile not found'
      });
    }

    console.log('✅ Login successful for:', userData.name);

    return res.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        avatar_url: userData.avatar_url
      },
      session: authData.session
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// ==================== OAUTH CALLBACK (GOOGLE SIGN-IN) ====================
router.post('/callback', async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;

    console.log('🔄 Processing OAuth callback...');
    console.log('Access Token:', access_token ? 'Present ✓' : 'Missing ✗');

    if (!access_token) {
      return res.status(400).json({
        success: false,
        error: 'OAuth callback failed'
      });
    }

    // Get user from access token
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(access_token);

    if (authError || !authUser) {
      console.error('❌ OAuth authentication error:', authError);
      return res.json({
        success: false,
        error: 'OAuth authentication failed'
      });
    }

    console.log('✅ User authenticated:', authUser.email);

    // Check if user exists in database
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (findError) {
      console.error('❌ Database query error:', findError);
      return res.json({
        success: false,
        error: 'Database error'
      });
    }

    let userData;

    if (existingUser) {
      // User exists - return the data
      console.log('✅ Existing user found:', existingUser.email);
      userData = existingUser;
    } else {
      // New user - create profile
      console.log('📝 Creating new user profile for:', authUser.email);

      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert([{
          id: authUser.id,
          email: authUser.email,
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email.split('@')[0],
          role: 'STUDENT',
          auth_method: 'google',
          avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
          status: 'active',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Failed to create user profile:', insertError);
        return res.json({
          success: false,
          error: 'Failed to create user profile'
        });
      }

      userData = newUser;
      console.log('✅ User profile created successfully');
    }

    // Return success response
    return res.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        avatar_url: userData.avatar_url
      },
      session: {
        access_token,
        refresh_token
      }
    });

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'OAuth callback failed'
    });
  }
});

module.exports = router;