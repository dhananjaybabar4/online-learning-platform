const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL is missing in .env file');
  throw new Error('SUPABASE_URL is required');
}

if (!supabaseAnonKey) {
  console.error('❌ SUPABASE_ANON_KEY is missing in .env file');
  throw new Error('SUPABASE_ANON_KEY is required');
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing in .env file');
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}



// Regular client for auth operations (uses anon key, respects RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false
  }
});

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});


module.exports = { supabase, supabaseAdmin };