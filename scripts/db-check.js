const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove surrounding quotes if any
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('Credentials missing. URL:', supabaseUrl, 'Key exists:', !!supabaseServiceKey);
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Querying existing tables on Supabase Url:', supabaseUrl);
  
  // Try querying cart_items
  const { data: cartData, error: cartError } = await supabase.from('cart_items').select('*').limit(1);
  if (cartError) {
    console.log('cart_items table does not exist or has error:', cartError.message);
  } else {
    console.log('cart_items table exists!');
  }

  // Try querying profiles
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('*').limit(1);
  if (profilesError) {
    console.log('profiles error:', profilesError.message);
  } else {
    console.log('profiles table exists! Columns:', Object.keys(profiles[0] || {}));
  }
}

run().catch(console.error);
