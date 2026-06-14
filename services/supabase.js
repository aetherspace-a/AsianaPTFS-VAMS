const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase environment variables (SUPABASE_URL or SUPABASE_KEY) are not set in the environment.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
