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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('[Seed Script] Credentials missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function isUUID(str) {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function toValidUUID(str) {
  if (!str) return '00000000-0000-0000-0000-000000000000';
  if (isUUID(str)) return str.toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash).toString(16).padStart(8, '0');
  let hex = (absHash + str.split('').map(c => c.charCodeAt(0).toString(16)).join('')).padEnd(32, '0').slice(0, 32);
  hex = hex.replace(/[^a-f0-9]/g, '0');
  return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-4${hex.substr(13, 3)}-8${hex.substr(17, 3)}-${hex.substr(20, 12)}`;
}

async function seedDatabase() {
  console.log('[Seed Script] Initializing Blue Hills Designers single-source database seeding...');

  try {
    // 1. Seed Categories
    const categories = [
      { id: toValidUUID('cat-suits'), name: 'Suits', slug: 'suits', description: 'Bespoke & Ready-to-wear tailored suits' },
      { id: toValidUUID('cat-shirts'), name: 'Shirts', slug: 'shirts', description: 'Egyptian cotton custom tailored shirts' },
      { id: toValidUUID('cat-shoes'), name: 'Shoes', slug: 'shoes', description: 'Italian handcrafted leather footwear' },
      { id: toValidUUID('cat-accessories'), name: 'Accessories', slug: 'accessories', description: 'Silk ties, cufflinks, and leather belts' },
      { id: toValidUUID('cat-bags'), name: 'Bags', slug: 'bags', description: 'Handcrafted full-grain leather bags and totes' }
    ];

    for (const cat of categories) {
      const { error } = await supabase.from('categories').upsert(cat, { onConflict: 'id' });
      if (error) console.warn(`Category upsert warning (${cat.name}):`, error.message);
    }
    console.log('[Seed Script] Categories verified.');

    // 2. Seed App Settings (Singleton ID = 1)
    const settingsPayload = {
      id: 1,
      showroom_hours: 'Sunday to Friday: 9:00 AM to 7:00 PM (Saturdays Closed)',
      support_phone: '+256 772 123456',
      concierge_phone: '+256 772 123456',
      free_shipping_threshold: 2000,
      tax_rate: 18,
      ai_greeting_prefix: 'Good day, Executive.',
      enable_news_banner: true,
      maintenance_mode: false,
      currency_symbol: 'Ugx',
      enable_secret_offer: true,
      payment_methods: {
        mobileMoney: true,
        visa: true,
        cashOnDelivery: true
      },
      courier_standard_fee: 50,
      courier_express_fee: 120,
      courier_pickup_fee: 0,
      courier_methods: {
        standard: true,
        express: true,
        pickup: true
      }
    };
    const { error: settingsErr } = await supabase.from('app_settings').upsert(settingsPayload, { onConflict: 'id' });
    if (settingsErr) console.warn('App settings upsert warning:', settingsErr.message);
    console.log('[Seed Script] App Settings verified.');

    // 3. Seed Luxury Coupons
    const coupons = [
      { id: toValidUUID('coupon-welcome10'), code: 'WELCOME10', discount_type: 'percentage', discount_value: 10, is_active: true, min_subtotal: 0 },
      { id: toValidUUID('coupon-gentleman20'), code: 'GENTLEMAN20', discount_type: 'percentage', discount_value: 20, is_active: true, min_subtotal: 500 },
      { id: toValidUUID('coupon-savilerow50'), code: 'SAVILEROW50', discount_type: 'fixed', discount_value: 50, is_active: true, min_subtotal: 1000 },
      { id: toValidUUID('coupon-kampala30'), code: 'KAMPALA30', discount_type: 'percentage', discount_value: 30, is_active: true, min_subtotal: 750 }
    ];

    for (const coup of coupons) {
      const { error } = await supabase.from('coupons').upsert(coup, { onConflict: 'code' });
      if (error) console.warn(`Coupon upsert warning (${coup.code}):`, error.message);
    }
    console.log('[Seed Script] Coupons verified.');

    // 4. Seed Testimonials
    const testimonials = [
      {
        id: toValidUUID('testi-ssewankambo'),
        quote: 'Blue Hills Designers has completely reshaped corporate fashion in East Africa. The fit of their Savile suit is unmatched. Perfect boardroom armory.',
        name: 'Dr. David Ssewankambo',
        role: 'Managing Director',
        company: 'Standard Capital Uganda',
        display_order: 1,
        is_active: true
      },
      {
        id: toValidUUID('testi-mukasa'),
        quote: 'The Egyptian Poplin White shirt stays exceptionally crisp during long diplomatic flights and state banquets. Their concierge delivery is top tier.',
        name: 'Hon. Andrew Mukasa',
        role: 'Senior Diplomat',
        company: 'Ministry of Foreign Affairs',
        display_order: 2,
        is_active: true
      },
      {
        id: toValidUUID('testi-mugisha'),
        quote: 'I visited their Lubowa showroom for a ready-made corporate suit. The level of personal attention, refreshment service, and premium clothing quality was truly top tier.',
        name: 'Charles Mugisha',
        role: 'Investment VP',
        company: 'Ascent Capital Africa',
        display_order: 3,
        is_active: true
      }
    ];

    for (const t of testimonials) {
      const { error } = await supabase.from('testimonials').upsert(t, { onConflict: 'id' });
      if (error) console.warn(`Testimonial upsert warning (${t.name}):`, error.message);
    }
    console.log('[Seed Script] Testimonials verified.');

    // 5. Seed Curated Master Luxury Products
    const products = [
      {
        id: toValidUUID('prod-monaco-navy'),
        category_id: toValidUUID('cat-suits'),
        name: 'Monaco Navy Ready-to-Wear Suit',
        slug: 'monaco-navy-ready-to-wear-suit',
        description: 'An elegant, high-quality ready-made suit made of fine wool blend imported from Turkey. It features classic lapels, standard pockets, and a clean professional fit. Ideal for daily office wear and business meetings.',
        short_description: 'Fine wool blend imported from Turkey with clean professional fit.',
        price: 1250,
        discount_percentage: 0,
        sizes: ['48R', '50R', '52R', '54R', '56R'],
        colors: ['Midnight Navy', 'Charcoal'],
        stock: 14,
        rating: 4.9,
        is_featured: true,
        is_new: false,
        is_deal: false,
        status: 'Active',
        images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuC6IMogg257U3uh1MtNS7HPgjGVwT2a6GeLfzTMCVYFuVskYnj6fDlCuYrlv0FdF1-KuhJO8Cw3C64A3_YnDyPvjWjzReX0_GkIXvhjxTYwDxTjonhszpsfhfENG3m8weu8uEZgfMISqEkEEKLF_JY4_-LrOBxk5gazOV-8oMMyEBLNXNlKdsbazYKsmNH-82Bugaouk2vagQ0xnRQILrQ2OOs2sztjrnLQpJCXRwPBrkdDitTrLUDXyw'],
        reviews: [
          { id: toValidUUID('rev-1'), userName: 'Amama Mbabazi', userRole: 'Senior Diplomat', rating: 5, comment: 'Impeccable quality. The shoulders sit flawlessly, and the fabric breathes exceptionally well in our climate. The personal styling service at Lubowa was outstanding.', date: '2026-05-12' },
          { id: toValidUUID('rev-2'), userName: 'Patrick Kaboyo', userRole: 'Corporate VP', rating: 5, comment: 'I wore this to our annual shareholder meeting and received endless compliments. Real boardroom power.', date: '2026-06-01' }
        ]
      },
      {
        id: toValidUUID('prod-savile-pinstripe'),
        category_id: toValidUUID('cat-suits'),
        name: 'Savile Midnight Pinstripe Suit',
        slug: 'savile-midnight-pinstripe-suit',
        description: 'A smart business suit with clean pinstripe patterns, imported from Turkey. Made from fine wool fabric, it features a double-breasted button design and comfortable ready-to-wear sleeves. Perfect for corporate managers and business leaders.',
        short_description: 'Fine wool fabric with double-breasted button design and clean pinstripes.',
        price: 1450,
        discount_percentage: 0,
        sizes: ['48R', '50R', '52R', '54R'],
        colors: ['Midnight Black with White Pinstripes', 'Obsidian Gray'],
        stock: 8,
        rating: 5.0,
        is_featured: false,
        is_new: true,
        is_deal: false,
        status: 'Active',
        images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAi8UecRS-XnyrMnJeZL1BQVfI-k0R_gJR1LOmjQdttfkYhoplY3uVFZbanSoR2yMSezA5cR3e61-ad015ej7NHi3pxyGxrkLADT7Q_LZ1GutmVRTp4mDhq-j2uiwCqyCvXNPehFnXRH-LxmBTxPsLco-fna_xAO86vswBmBY2C-2KyB_lA85jIzmULF-qrB23JFySnGOOTlEGa9x7PfP1HLr3OUhu-yYHF7BQNYYBXL3_XdDjAitK2gg'],
        reviews: [
          { id: toValidUUID('rev-3'), userName: 'Charles Mugisha', userRole: 'Investment Banker', rating: 5, comment: 'The quality matches Savile Row. Outstanding service. This suit asserts authority.', date: '2026-06-15' }
        ]
      },
      {
        id: toValidUUID('prod-herringbone-shirts'),
        category_id: toValidUUID('cat-shirts'),
        name: 'Crisp Poplin Herringbone Shirt Set',
        slug: 'crisp-poplin-herringbone-shirt-set',
        description: 'A pack of two high-quality business shirts imported from the UK, made of premium cotton fabric. One comes in plain white and the other in a light blue herringbone pattern. Both feature structured collars and standard French cuffs.',
        short_description: 'Pack of two premium cotton shirts with French cuffs and structured collars.',
        price: 220,
        discount_percentage: 0,
        sizes: ['39', '40', '41', '42', '43'],
        colors: ['Classic Duo (White & Blue)', 'Pure White Pair'],
        stock: 25,
        rating: 4.8,
        is_featured: true,
        is_new: false,
        is_deal: false,
        status: 'Active',
        images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuChMtp4jLNpzg9FCNudNK17V5dgPQ7gdqkInztWABOY1s9Wo0WquLDnHGVLaFpcTJ4l9h6f7O76xtk__qJO_Ydu6Yi8rjMn_p2JvvfRREDwwJDPBy83dd3IQCntFWraFkYmJ3LGWRlxwD6c1rBnh-lIF619KM6eoScw650fwNxZT1n7azvn0SlmFjNVIFyK5tBpwfFwh1WTbVRuvsh2okhFkLe5EGxiuvMmY0nIuf3ePWzFrNsg5MqpzA'],
        reviews: []
      },
      {
        id: toValidUUID('prod-presidential-poplin'),
        category_id: toValidUUID('cat-shirts'),
        name: 'Presidential Poplin White Shirt',
        slug: 'presidential-poplin-white-shirt',
        description: 'A premium business-casual cotton shirt imported from Egypt. It is made of thick, wrinkle-free cotton that stays fresh all day. Designed with a classic Kent collar and simple button cuffs.',
        short_description: 'Thick, wrinkle-free Egyptian cotton with classic Kent collar.',
        price: 190,
        discount_percentage: 0,
        sizes: ['39', '40', '41', '42', '43', '44'],
        colors: ['Pristine White'],
        stock: 30,
        rating: 4.9,
        is_featured: false,
        is_new: false,
        is_deal: false,
        status: 'Active',
        images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBMd6RQeA5FpvP486t2rqeCGXNCX0DP8ADnV8Wv-Ro25LLV5QqM0CBpL__iMTSCOnjqAMx78kno7N5QimxtsNkPR7XNVB64KXrDghBuBropddAROs95oIwiwlJOYoKxBLuWUFVkm6iPpqiKg-2mMFim1J4Bpn55duxvopahw4fK27UKjzQ8mP5P9PRDwrXMcXS3gI1ilE2ECCaI6YFmYFAPrarRhk1Yhkh8Cr4EulhA5zui4_ueB8n3ZA'],
        reviews: [
          { id: toValidUUID('rev-4'), userName: 'Hon. Andrew Mukasa', userRole: 'Cabinet Minister', rating: 5, comment: 'A shirt that never loses its structure. Truly fits the African heat without looking wrinkled.', date: '2026-05-20' }
        ]
      },
      {
        id: toValidUUID('prod-cognac-oxfords'),
        category_id: toValidUUID('cat-shoes'),
        name: 'Imperial Cognac Wholecut Oxfords',
        slug: 'imperial-cognac-wholecut-oxfords',
        description: 'Sleek corporate shoes made of premium leather imported from Turkey. They feature a comfortable cushioned lining and strong, durable leather soles. Ideal for combining with any of our business suits.',
        short_description: 'Premium wholecut leather imported from Turkey with durable leather soles.',
        price: 480,
        discount_percentage: 0,
        sizes: ['41', '42', '43', '44', '45'],
        colors: ['Cognac Brown'],
        stock: 12,
        rating: 5.0,
        is_featured: true,
        is_new: false,
        is_deal: false,
        status: 'Active',
        images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBJyBXI8NaRR-Ck9F2JIpri68oWsCpNA7Ie-oMwo57RWPijvkzyQJtObOPa0rGqyJX9b2iSarTYZ0B-ZUf5YMtgLQLVIFHtgXW-hXS8HqXtoVijqL3nTsOuMFOmp8oazTtu0fjyeKdouINqfmtXIPlV_BiBb50VRTLlLwy-kRcaqVwlXhGkWDIIi3Z_0V7dZlsIQyDe7Swp-FIz1670sbanWFsYnbJPpp_gKYtjtWNCKOGLCw9haspdWA'],
        reviews: [
          { id: toValidUUID('rev-5'), userName: 'Dr. David Ssewankambo', userRole: 'Executive Chairman', rating: 5, comment: 'Exquisite wholecut shoes. The leather is premium, the shape is extremely modern but timeless. Ideal pairing for any dark blue suit.', date: '2026-06-18' }
        ]
      },
      {
        id: toValidUUID('prod-obsidian-monks'),
        category_id: toValidUUID('cat-shoes'),
        name: 'Obsidian Double Monk Straps',
        slug: 'obsidian-double-monk-straps',
        description: 'An elegant statement of style and comfort. Imported from Turkey and crafted with robust full-grain black calfskin, styled with clean, polished gunmetal silver side buckles. Lined with natural leather for breathability, with a durable, slip-resistant sole.',
        short_description: 'Full-grain black calfskin with polished gunmetal silver side buckles.',
        price: 520,
        discount_percentage: 0,
        sizes: ['41', '42', '43', '44'],
        colors: ['Obsidian Black'],
        stock: 9,
        rating: 4.7,
        is_featured: false,
        is_new: false,
        is_deal: false,
        status: 'Active',
        images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuCIiTPJM1DbZp8-SLivCY52EQivclcR97HSMXMjMwh84rbAAsKFIWN-0vlt7f3HPA69D9rNiiHCsvWtsA3_YL-yWytM8km9A3VkonGzdRDctMTsnrA6DHERdam6i317MJRJaj7msB1c3NDKLH6xaKg_CNdlAqzqPVnZsy2Vwl55v-F8B4DSp8MisXE5LDmQzAT4AbcJI6cX1XEmNW3EsP32FdJp75A6KBWXdkRcwEBHBumOpTxMiqx7kw'],
        reviews: []
      },
      {
        id: toValidUUID('prod-emerald-silk'),
        category_id: toValidUUID('cat-accessories'),
        name: 'Emerald Jacquard Silk Tie Set',
        slug: 'emerald-jacquard-silk-tie-set',
        description: 'A touch of luxury for your corporate outfits. Imported from China, this set includes a premium jacquard silk tie and a matching pocket square. Designed to give a neat, professional knot that looks crisp all day.',
        short_description: 'Jacquard silk tie and matching pocket square set.',
        price: 150,
        discount_percentage: 0,
        sizes: ['One Size'],
        colors: ['Emerald Green'],
        stock: 40,
        rating: 4.9,
        is_featured: false,
        is_new: true,
        is_deal: false,
        status: 'Active',
        images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuD3GGmGC1lq3ebCU1W9mOX-CfsyMwa4SWAdF9TyTo1wg7-ga-zvcf_MDn5JW_wtISyBjg2HNciG8q-CCdHS96i2TIsWXLlFbJDRpyNsOVqrcftwcWSFDQKUyp1N6J5g21PI941CMbXy5XaX2bncnqHxnDRk1QnC9Doz53_m_8W99oeomA9E9yp8Sz40LQVf9o_x1ayUjuzCDH6sxZrKUsxdw4tpyjR1Z5guKYUyAkqbvsKk9IWfUaMlDw'],
        reviews: []
      },
      {
        id: toValidUUID('prod-camel-overcoat'),
        category_id: toValidUUID('cat-suits'),
        name: 'Lubowa Camel Hair Executive Overcoat',
        slug: 'lubowa-camel-hair-executive-overcoat',
        description: 'A premium ready-made double-breasted overcoat imported from the UK. Made from soft and warm camel hair, it features wide lapels, deep pockets, and a smooth inner lining. Perfect for cool evenings or international travels.',
        short_description: 'Double-breasted camel hair overcoat with wide lapels and deep pockets.',
        price: 1850,
        discount_percentage: 20,
        sizes: ['48R', '50R', '52R', '54R'],
        colors: ['Classic Camel'],
        stock: 5,
        rating: 5.0,
        is_featured: false,
        is_new: false,
        is_deal: true,
        deal_days: 0,
        deal_hours: 14,
        deal_mins: 40,
        deal_secs: 17,
        deal_expires_at: new Date(Date.now() + (((0 * 24 + 14) * 60 + 40) * 60 + 17) * 1000).toISOString(),
        status: 'Active',
        images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAcO6MS2VWCWZQBnf0cCMZL-YE38o5bhKL5ARNtF7FUxluxGX49GTihEM53aMOry1-nrD7_al2QIuZdb5_xF6hQRMstrxCnP-qzBssHxrRwdhL5HifQg8IxmSoV7U8D7J4nt-im0L7SallxeSH7C4SLlSgqRzuCXUTQFP_l-fUJaV_toItNqWxlBNDXSStF7IlJbvPQcgV073TakLGegDBEMXdblzvIN15XyfiXmti8g4JrQWTDojzvCw'],
        reviews: [
          { id: toValidUUID('rev-6'), userName: 'Kassim Sempijja', userRole: 'Oil & Gas Director', rating: 5, comment: 'Breathtaking quality. The weight is fantastic, and the camel hair texture is incredibly soft. Well worth the investment.', date: '2026-06-20' }
        ]
      },
      {
        id: toValidUUID('prod-calfskin-tote'),
        category_id: toValidUUID('cat-accessories'),
        name: 'Obsidian Calfskin Travel Tote',
        slug: 'obsidian-calfskin-travel-tote',
        description: 'Meticulously engineered from thick, pebbled full-grain calfskin leather. It houses a padded 16" laptop sleeve, separate dynamic document dividers, a custom gold-gilded pen rail, and a secure zippered internal pocket. Complete with a luxurious suede inner lining and robust brass hardware.',
        short_description: 'Full-grain calfskin leather tote with padded 16" laptop sleeve and brass hardware.',
        price: 750,
        discount_percentage: 0,
        sizes: ['One Size'],
        colors: ['Obsidian Black'],
        stock: 6,
        rating: 4.8,
        is_featured: false,
        is_new: false,
        is_deal: false,
        status: 'Active',
        images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBLr-rNoyiFmO6nXoy3EnvQuFw3o76S1sq2P2pnwxu-JM_nXQqH8FqJ0TAalP6sutbr-8uO9JKrZQxDJqeRMi3DDuLaAo46dAJlEYWPYPJ7xTFIk8oqHZHR8F54fV6I5MpSSk3th7gaJgdzZT0MIJSKd1pZcv80cgHNIRqL1xEVBvlHvvM0Xu5fnCO8b2nHJ3egCPWpPHCaI1TwxrXlUW6R6sZTLzGprEmZy4t3MEFxcqzl5k3oSGyFjw'],
        reviews: []
      },
      {
        id: toValidUUID('prod-charcoal-blazer'),
        category_id: toValidUUID('cat-suits'),
        name: 'Charcoal Structured Wool Blazer',
        slug: 'charcoal-structured-wool-blazer',
        description: 'A masterpiece of soft, deconstructed ready-to-wear styling. Imported from Turkey, crafted from a mid-weight wool-cashmere fabric, offering a comfortable, natural shoulder line. Styled with custom mother-of-pearl buttons, an elegant double-vented back, and dynamic patch pockets.',
        short_description: 'Wool-cashmere fabric with natural shoulder line and mother-of-pearl buttons.',
        price: 850,
        discount_percentage: 0,
        sizes: ['48R', '50R', '52R', '54R', '56R'],
        colors: ['Charcoal Gray'],
        stock: 11,
        rating: 4.9,
        is_featured: false,
        is_new: false,
        is_deal: false,
        status: 'Active',
        images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAM1sxMc2tnXe5GtRulON-grniBCQw0AyzhEtySEs5LoH5p-pYIxqeYmZWDVZNkWiSnDZV7KWvRDq3zKhLK5OGIHR5GGHOlg0Tpn3jUJnBRjQFUGa0ufs_p_SgYkrlfHnkBuISuW8RZxe9BjgtSongMhEYViTl1Ko54EbA7F4yHCBkm2kFdD693RXN9ILEDJG5e1u7ec8VW_FJHuz3DLMSwQK-nZxgoFjjaewWqmkKAH-lPPnuTYMtjIQ'],
        reviews: []
      },
      {
        id: toValidUUID('prod-calfskin-loafers'),
        category_id: toValidUUID('cat-shoes'),
        name: 'Prestige Calfskin Penny Loafers',
        slug: 'prestige-calfskin-penny-loafers',
        description: 'The epitome of refined ease. Hand-crafted from premium selection supple calfskin leather. They mold dynamically to your foot and feature a classic apron toe, leather stacked heel, and full leather lining. Masterful craftsmanship with high comfort.',
        short_description: 'Hand-crafted supple calfskin leather with apron toe and stacked heel.',
        price: 420,
        discount_percentage: 0,
        sizes: ['41', '42', '43', '44', '45'],
        colors: ['Muted Walnut', 'Obsidian Black'],
        stock: 10,
        rating: 4.8,
        is_featured: false,
        is_new: false,
        is_deal: false,
        status: 'Active',
        images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBcZwWFnXB-gm1gviBsGoJzMvO4BPS5l0tu_DeRfhI-yL1HiyAA97ZHqrPb4_TJLjxXhlb8wKv8NT_DWHKf7LDm7wb8CqE05i4z3OJuRLNLMJcp6qhg91orjlOvH6VJZySeg56Y5e-qXw0YlKCDTnJvfXHFW9vWR9xF70Qp7M51fjyQN2_CdjpGtUy4hjmAIcuuTINy3KYoTK6v3Bb4G27Wlv5Uf5K3lKy3J6vZbL_e1WU2l5EweCnoUg'],
        reviews: []
      }
    ];

    for (const prod of products) {
      const { images, reviews, ...prodRow } = prod;
      const { error: prodErr } = await supabase.from('products').upsert(prodRow, { onConflict: 'id' });
      if (prodErr) console.warn(`Product upsert warning (${prod.name}):`, prodErr.message);

      // Insert product images
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const imgRow = {
            id: toValidUUID(`img-${prod.id}-${i}`),
            product_id: prod.id,
            image_url: images[i],
            display_order: i + 1
          };
          const { error: imgErr } = await supabase.from('product_images').upsert(imgRow, { onConflict: 'id' });
          if (imgErr) console.warn(`Image upsert warning:`, imgErr.message);
        }
      }

      // Insert product reviews
      if (reviews && reviews.length > 0) {
        for (const rev of reviews) {
          const revRow = {
            id: rev.id,
            product_id: prod.id,
            rating: rev.rating,
            comment: rev.comment,
            user_name: rev.userName,
            user_role: rev.userRole,
            created_at: new Date(rev.date).toISOString()
          };
          const { error: revErr } = await supabase.from('reviews').upsert(revRow, { onConflict: 'id' });
          if (revErr) console.warn(`Review upsert warning:`, revErr.message);
        }
      }
    }
    console.log('[Seed Script] Luxury products, images, and reviews verified.');

    console.log('[Seed Script] Database single-source-of-truth seeding complete successfully!');
  } catch (err) {
    console.error('[Seed Script] Seeding error:', err);
    process.exit(1);
  }
}

seedDatabase();
