// backend/src/routes/auth.routes.js - FIXED VERSION
const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');

const router = express.Router();

// Registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, firstName, lastName } = req.body;

    // Handle both formats
    let fullName;
    if (firstName && lastName) {
      fullName = `${firstName} ${lastName}`.trim();
    } else if (name) {
      fullName = name.trim();
    } else {
      fullName = email.split('@')[0];
    }

    console.log('📝 Registration attempt for:', email);
    console.log('   Name:', fullName);

    // ✅ STEP 0: Check if user already exists in database FIRST
    const { data: existingDbUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingDbUser) {
      console.log('⚠️ User already exists in database:', email);
      return res.json({
        success: false,
        error: 'An account with this email already exists. Please login instead.',
        errorCode: 'USER_EXISTS',
        shouldRedirectToLogin: true
      });
    }

    // Step 1: Create auth user directly using admin
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: fullName,
        firstName: firstName || fullName.split(' ')[0],
        lastName: lastName || fullName.split(' ').slice(1).join(' ')
      }
    });

    // If auth user creation fails
    if (signUpError) {
      console.error('❌ Auth signup error:', signUpError);

      // If user already exists in auth (but not in DB - orphaned user)
      if (signUpError.message?.includes('already') || signUpError.code === '23505') {
        console.log('⚠️ User exists in Auth but not in DB (orphaned user), cleaning up...');
        
        try {
          // Get the auth user
          const { data: authUserData } = await supabaseAdmin.auth.admin.listUsers();
          const orphanedUser = authUserData.users.find(u => u.email === email);
          
          if (orphanedUser) {
            // Delete the orphaned auth user
            await supabaseAdmin.auth.admin.deleteUser(orphanedUser.id);
            console.log('🧹 Deleted orphaned auth user');
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Retry creating the user
            const { data: retryAuthData, error: retryError } = await supabaseAdmin.auth.admin.createUser({
              email: email,
              password: password,
              email_confirm: true,
              user_metadata: {
                name: fullName,
                firstName: firstName || fullName.split(' ')[0],
                lastName: lastName || fullName.split(' ').slice(1).join(' ')
              }
            });

            if (retryError || !retryAuthData?.user) {
              console.error('❌ Retry failed:', retryError);
              return res.json({
                success: false,
                error: 'Registration failed. Please try again.'
              });
            }

            // Create DB profile with retried auth user
            const { data: retryUserData, error: retryDbError } = await supabaseAdmin
              .from('users')
              .insert([{
                id: retryAuthData.user.id,
                email: email,
                name: fullName,
                role: 'STUDENT',
                auth_method: 'email',
                status: 'active',
                created_at: new Date().toISOString()
              }])
              .select()
              .single();

            if (retryDbError) {
              console.error('❌ DB insert failed after retry:', retryDbError);
              await supabaseAdmin.auth.admin.deleteUser(retryAuthData.user.id);
              return res.json({
                success: false,
                error: 'Registration failed. Please try again.'
              });
            }

            // Create session
            const { data: retrySession } = await supabase.auth.signInWithPassword({ email, password });

            console.log('✅ Registration successful after cleanup!');
            return res.json({
              success: true,
              message: 'Account created successfully! 🎉',
              user: {
                id: retryUserData.id,
                email: retryUserData.email,
                name: retryUserData.name,
                role: retryUserData.role
              },
              session: retrySession?.session
            });
          }
        } catch (cleanupError) {
          console.error('❌ Cleanup failed:', cleanupError);
        }
      }

      return res.json({
        success: false,
        error: signUpError.message || 'Registration failed'
      });
    }

    if (!authData?.user) {
      console.error('❌ No user returned from signup');
      return res.json({
        success: false,
        error: 'Registration failed'
      });
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Step 2: Create database profile
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

      // ✅ NEW: Check if it's a duplicate email error
      if (dbError.code === '23505' || dbError.message?.includes('duplicate') || dbError.message?.includes('unique')) {
        console.log('⚠️ Duplicate email detected in database');
        
        // Cleanup auth user
        try {
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          console.log('🧹 Cleaned up auth user');
        } catch (cleanupError) {
          console.error('❌ Cleanup failed:', cleanupError);
        }
        
        return res.json({
          success: false,
          error: 'An account with this email already exists. Please login instead.',
          errorCode: 'USER_EXISTS',
          shouldRedirectToLogin: true
        });
      }

      // Other database errors
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        console.log('🧹 Cleaned up auth user after DB failure');
      } catch (cleanupError) {
        console.error('❌ Cleanup failed:', cleanupError);
      }

      return res.json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }

    console.log('✅ Registration successful!');
    console.log('   User ID:', userData.id);
    console.log('   Email:', userData.email);
    console.log('   Name:', userData.name);

    // Step 3: Create session for the new user
    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Return success with session
    return res.json({
      success: true,
      message: 'Account created successfully! 🎉',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      },
      session: sessionData?.session
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed. Please try again.'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    // Sign in with Supabase
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

    // Get user profile using ADMIN client
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

    console.log('✅ Login successful for:', email);

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

// Logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      await supabase.auth.signOut();
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({
      success: true,
      message: 'Logged out'
    });
  }
});

// Google OAuth
router.post('/google', async (req, res) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:5173/auth/callback'
      }
    });

    if (error) throw error;

    res.json({
      success: true,
      url: data.url
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({
      success: false,
      error: 'Google sign-in failed'
    });
  }
});

// ✅✅✅ CRITICAL FIX: Handle OAuth Callback - CHECK EMAIL FIRST, NOT ID ✅✅✅
router.post('/callback', async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body;

    console.log('🔄 Processing OAuth callback...');

    if (!access_token) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      });
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);

    if (userError || !user) {
      console.error('❌ Failed to get user:', userError);
      return res.status(401).json({
        success: false,
        error: 'Invalid access token'
      });
    }

    console.log('✅ User authenticated via Google:', user.email);
    console.log('   Google Auth ID:', user.id);

    // ============================================================================
    // 🔑 KEY FIX: Check by EMAIL, not ID!
    // ============================================================================
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', user.email)  // 👈👈👈 CHECK BY EMAIL!
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Database fetch error:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Database error occurred'
      });
    }

    let finalUserData;

    if (existingUser) {
      // ============================================================================
      // USER EXISTS: Update to "both", don't create new row!
      // ============================================================================
      console.log('✅ Existing user found!');
      console.log('   Email:', existingUser.email);
      console.log('   Existing ID in DB:', existingUser.id);
      console.log('   Current auth_method:', existingUser.auth_method);
      console.log('   Google gave us ID:', user.id);
      console.log('   → Will UPDATE existing row (not create new)');
      
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          auth_method: 'both',  // Can now use email OR Google
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || existingUser.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email)  // 👈👈👈 UPDATE BY EMAIL!
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Failed to update user:', updateError);
        finalUserData = existingUser;
      } else {
        finalUserData = updatedUser;
        console.log('✅ Updated auth_method to "both"');
        console.log('   ID stayed the same:', updatedUser.id);
      }
      
    } else {
      // ============================================================================
      // NEW USER: First time seeing this email
      // ============================================================================
      console.log('📝 Creating NEW user (first time with this email)');
      console.log('   Email:', user.email);
      console.log('   Google Auth ID:', user.id);

      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert([{
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
          role: 'STUDENT',
          auth_method: 'google',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          status: 'active',
          has_password: false,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) {
        console.error('❌ Failed to create user:', insertError);
        
        // Check if another request created it
        const { data: recheckUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        
        if (recheckUser) {
          console.log('✅ Found user created by another request');
          finalUserData = recheckUser;
        } else {
          return res.status(500).json({
            success: false,
            error: 'Failed to create user profile'
          });
        }
      } else {
        finalUserData = newUser;
        console.log('✅ New user created');
      }
    }

    console.log('✅ OAuth callback successful!');
    console.log('   Final ID in DB:', finalUserData.id);
    console.log('   Final email:', finalUserData.email);
    console.log('   Final auth_method:', finalUserData.auth_method);

    return res.json({
      success: true,
      user: {
        id: finalUserData.id,
        email: finalUserData.email,
        name: finalUserData.name,
        role: finalUserData.role,
        avatar_url: finalUserData.avatar_url
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