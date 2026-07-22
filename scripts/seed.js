const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
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
  console.log('[Seed Script] Credentials missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedDatabase() {
  console.log('[Seed Script] Initializing Blue Hills Designers database seeding...');

  try {
    // 1. Seed Categories
    const categories = [
      { id: 'cat-suits', name: 'Suits', slug: 'suits', description: 'Bespoke & Ready-to-wear tailored suits' },
      { id: 'cat-shirts', name: 'Shirts', slug: 'shirts', description: 'Egyptian cotton custom tailored shirts' },
      { id: 'cat-shoes', name: 'Footwear', slug: 'footwear', description: 'Italian handcrafted leather footwear' },
      { id: 'cat-accessories', name: 'Accessories', slug: 'accessories', description: 'Silk ties, cufflinks, and leather belts' }
    ];

    for (const cat of categories) {
      const { error } = await supabase.from('categories').upsert(cat, { onConflict: 'id' });
      if (error) console.warn(`Category upsert warning (${cat.name}):`, error.message);
    }
    console.log('[Seed Script] Categories seeded successfully.');

    // 2. Seed Default Admin Profile
    const adminProfile = {
      id: 'usr-admin-001',
      full_name: 'Blue Hills Master Tailor',
      email: 'admin@bluehillsdesigners.com',
      role: 'Super Admin',
      phone: '+256 700 000000',
      lifetime_spending: 0,
      reward_points: 1000
    };
    const { error: profErr } = await supabase.from('profiles').upsert(adminProfile, { onConflict: 'id' });
    if (profErr) console.warn('Admin profile upsert warning:', profErr.message);
    console.log('[Seed Script] Admin profile verified.');

    console.log('[Seed Script] Seeding complete!');
  } catch (err) {
    console.error('[Seed Script] Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();
