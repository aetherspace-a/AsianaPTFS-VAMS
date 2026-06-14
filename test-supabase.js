const { supabase } = require('./services/supabase');

async function testSupabase() {
  console.log('Testing Supabase connection...');
  console.log('URL:', process.env.SUPABASE_URL);
  console.log('Key length:', process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.length : 0);
  try {
    const { data, error } = await supabase.from('flights').select('*').limit(1);
    if (error) {
      console.error('❌ Supabase error:', error.message);
      process.exit(1);
    }
    console.log('✅ Supabase connection successful! Data:', data);
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

testSupabase();
