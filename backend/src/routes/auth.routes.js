// backend/src/routes/auth.routes.js - COMPLETE FIXED VERSION
const express = require('express');
const { supabase, supabaseAdmin } = require('../config/supabase');

const router = express.Router();

// ==================== REGISTRATION ====================
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, firstName, lastName } = req.body;

    let fullName;
    if (firstName && lastName) {
      fullName = `${firstName} ${lastName}`.trim();
    } else if (name) {
      fullName = name.trim();
    } else {
      fullName = email.split('@')[0];
    }

    console.log('📝 Registration attempt for:', email);

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

    if (signUpError) {
      console.error('❌ Auth signup error:', signUpError);
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
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch (e) {
        console.error('❌ Cleanup failed:', e);
      }
      return res.json({
        success: false,
        error: 'Registration failed. Please try again.'
      });
    }

    console.log('✅ User profile created!');

    // ✅ CRITICAL: Initialize user_points with streak=1
    const today = new Date().toISOString().split('T')[0];
    const { data: pointsData, error: pointsError } = await supabaseAdmin
      .from('user_points')
      .insert([{
        user_id: userData.id,
        points: 0,
        streak: 1,
        longest_streak: 1,
        last_activity_date: today,
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (pointsError) {
      console.error('❌ Failed to create user_points:', pointsError.message);
      console.error('   Code:', pointsError.code);
      console.error('   Details:', pointsError.details);
    } else {
      console.log('✅ user_points created:', {
        streak: pointsData.streak,
        longest_streak: pointsData.longest_streak,
        last_activity_date: pointsData.last_activity_date
      });
    }

    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    console.log('✅ Registration complete!');

    return res.json({
      success: true,
      message: 'Account created successfully! 🎉',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        streak: 1,
        longest_streak: 1
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

    console.log('✅ Auth verified for:', userData.name);

    // ==================== STREAK UPDATE ====================
    let streak = 0;
    let longestStreak = 0;

    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('📊 Checking streak for user:', userData.id);

      // Get current user_points record
      const { data: pointsData, error: pointsError } = await supabaseAdmin
        .from('user_points')
        .select('*')
        .eq('user_id', userData.id)
        .maybeSingle();

      if (pointsError && pointsError.code !== 'PGRST116') {
        console.error('⚠️ Error fetching user_points:', pointsError.message);
        throw pointsError;
      }

      if (!pointsData) {
        // First login - create record with streak 1
        console.log('🆕 No user_points found - creating with streak=1');
        
        const { data: newPoints, error: insertError } = await supabaseAdmin
          .from('user_points')
          .insert([{
            user_id: userData.id,
            points: 0,
            streak: 1,
            longest_streak: 1,
            last_activity_date: today,
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (insertError) {
          console.error('❌ Failed to create user_points on login:', insertError.message);
          streak = 1;
          longestStreak = 1;
        } else {
          streak = newPoints.streak;
          longestStreak = newPoints.longest_streak;
          console.log('✅ user_points created on login: streak=1');
        }
      } else {
        // User exists - calculate streak
        const lastActivityDate = pointsData.last_activity_date;
        console.log('📅 Existing record found:');
        console.log('   Last activity:', lastActivityDate);
        console.log('   Current streak:', pointsData.streak);
        console.log('   Today:', today);

        if (!lastActivityDate) {
          // NULL last_activity_date - first time
          console.log('ℹ️ last_activity_date is NULL - setting to 1');
          streak = 1;
          longestStreak = Math.max(1, pointsData.longest_streak || 1);
        } else {
          const lastDate = new Date(lastActivityDate + 'T00:00:00Z');
          const todayDate = new Date(today + 'T00:00:00Z');
          const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

          console.log(`   Days diff: ${daysDiff}`);

          if (daysDiff === 0) {
            // Same day
            streak = pointsData.streak || 1;
            longestStreak = pointsData.longest_streak || 1;
            console.log('📌 Same day - streak unchanged:', streak);
          } else if (daysDiff === 1) {
            // Consecutive day
            streak = (pointsData.streak || 1) + 1;
            longestStreak = Math.max(streak, pointsData.longest_streak || 1);
            console.log(`✅ Consecutive day! Streak: ${pointsData.streak} → ${streak}`);
          } else {
            // Gap
            streak = 1;
            longestStreak = Math.max(1, pointsData.longest_streak || 1);
            console.log(`⚠️ Gap of ${daysDiff} days. Streak reset to 1`);
          }
        }

        // Update user_points
        const { error: updateError } = await supabaseAdmin
          .from('user_points')
          .update({
            streak: streak,
            longest_streak: longestStreak,
            last_activity_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userData.id);

        if (updateError) {
          console.error('⚠️ Failed to update user_points:', updateError.message);
        } else {
          console.log(`✅ user_points updated: streak=${streak}, longest=${longestStreak}`);
        }
      }
    } catch (streakError) {
      console.error('⚠️ Streak calculation failed:', streakError.message);
      streak = 0;
      longestStreak = 0;
    }

    console.log('✅ Login successful!');
    console.log(`   Streak: ${streak}, Longest: ${longestStreak}`);

    return res.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        avatar_url: userData.avatar_url,
        streak: streak,
        longest_streak: longestStreak
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

// ==================== LOGOUT ====================
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

// ==================== GOOGLE OAUTH ====================
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

// ==================== OAUTH CALLBACK ====================
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

    const { data: { user }, error: userError } = await supabase.auth.getUser(access_token);

    if (userError || !user) {
      console.error('❌ Failed to get user:', userError);
      return res.status(401).json({
        success: false,
        error: 'Invalid access token'
      });
    }

    console.log('✅ User authenticated via Google:', user.email);

    // Check by EMAIL
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', user.email)
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
      console.log('✅ Existing user found!');
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          auth_method: 'both',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || existingUser.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Failed to update user:', updateError);
        finalUserData = existingUser;
      } else {
        finalUserData = updatedUser;
        console.log('✅ Updated auth_method to "both"');
      }
    } else {
      console.log('📝 Creating NEW user from Google login');

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

    // ==================== STREAK UPDATE FOR OAUTH ====================
    let streak = 0;
    let longestStreak = 0;

    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('📊 Checking streak for OAuth user...');

      const { data: pointsData, error: pointsError } = await supabaseAdmin
        .from('user_points')
        .select('*')
        .eq('user_id', finalUserData.id)
        .maybeSingle();

      if (pointsError && pointsError.code !== 'PGRST116') {
        throw pointsError;
      }

      if (!pointsData) {
        console.log('🆕 Creating first user_points for OAuth - streak=1');
        const { data: newPoints, error: insertError } = await supabaseAdmin
          .from('user_points')
          .insert([{
            user_id: finalUserData.id,
            points: 0,
            streak: 1,
            longest_streak: 1,
            last_activity_date: today,
            updated_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (insertError) {
          console.error('❌ Failed to create user_points:', insertError.message);
          streak = 1;
          longestStreak = 1;
        } else {
          streak = newPoints.streak;
          longestStreak = newPoints.longest_streak;
          console.log('✅ OAuth user_points created');
        }
      } else {
        const lastActivityDate = pointsData.last_activity_date;
        
        if (!lastActivityDate) {
          streak = 1;
          longestStreak = Math.max(1, pointsData.longest_streak || 1);
        } else {
          const lastDate = new Date(lastActivityDate + 'T00:00:00Z');
          const todayDate = new Date(today + 'T00:00:00Z');
          const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

          if (daysDiff === 0) {
            streak = pointsData.streak || 1;
            longestStreak = pointsData.longest_streak || 1;
          } else if (daysDiff === 1) {
            streak = (pointsData.streak || 1) + 1;
            longestStreak = Math.max(streak, pointsData.longest_streak || 1);
          } else {
            streak = 1;
            longestStreak = Math.max(1, pointsData.longest_streak || 1);
          }
        }

        const { error: updateError } = await supabaseAdmin
          .from('user_points')
          .update({
            streak: streak,
            longest_streak: longestStreak,
            last_activity_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', finalUserData.id);

        if (updateError) {
          console.error('⚠️ Failed to update user_points:', updateError.message);
        }
      }
    } catch (streakError) {
      console.error('⚠️ OAuth streak calculation failed:', streakError.message);
      streak = 0;
      longestStreak = 0;
    }

    console.log('✅ OAuth callback successful!');
    console.log(`   Streak: ${streak}, Longest: ${longestStreak}`);

    return res.json({
      success: true,
      user: {
        id: finalUserData.id,
        email: finalUserData.email,
        name: finalUserData.name,
        role: finalUserData.role,
        avatar_url: finalUserData.avatar_url,
        streak: streak,
        longest_streak: longestStreak
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