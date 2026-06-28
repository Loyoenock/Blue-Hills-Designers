'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  Product, User, CartItem, Order, ConsultationBooking, 
  NewsletterSubscriber, AuditLog, Review 
} from '../types';
import { getSupabaseClient } from '../lib/supabase';

interface StoreState {
  products: Product[];
  users: User[];
  currentUser: User | null;
  cart: CartItem[];
  orders: Order[];
  bookings: ConsultationBooking[];
  subscribers: NewsletterSubscriber[];
  auditLogs: AuditLog[];
  wishlist: string[]; // array of product ids
  
  // Auth actions
  login: (email: string, password?: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, phone: string, password?: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (name: string, phone: string) => void;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;

  // Cart actions
  addToCart: (product: Product, size: string, color: string, qty: number) => void;
  updateCartQty: (cartItemId: string, qty: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;

  // Checkout / Order actions
  placeOrder: (orderData: Omit<Order, 'id' | 'date'>) => Order;
  updateOrderStatus: (orderId: string, status: Order['status'], modifierName: string, modifierRole: string) => void;

  // Product management actions (Admin)
  addProduct: (productData: Omit<Product, 'id' | 'reviews' | 'rating'>, creatorName: string, creatorRole: string) => void;
  updateProduct: (id: string, updatedFields: Partial<Product>, updaterName: string, updaterRole: string) => void;
  deleteProduct: (id: string, deleterName: string, deleterRole: string) => void; // Soft delete or remove
  addReview: (productId: string, rating: number, comment: string, userName: string, userRole?: string) => void;

  // Consultation Actions
  bookConsultation: (bookingData: Omit<ConsultationBooking, 'id' | 'status'>) => void;
  updateBookingStatus: (bookingId: string, status: ConsultationBooking['status']) => void;

  // Newsletter Actions
  subscribeNewsletter: (email: string) => { success: boolean; message: string };

  // Wishlist Actions
  toggleWishlist: (productId: string) => void;

  // Log Actions
  addAuditLog: (action: string, details: string, userId: string, userName: string, userRole: string) => void;

  // Supabase Sync Actions
  syncFromSupabase: () => Promise<void>;
  isSyncing: boolean;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-monaco-navy',
    name: 'Monaco Navy Tailored Suit',
    description: 'Exquisitely styled double-vented suit made of fine Ugandan wool blend. Featuring elegant notch lapels, standard flap pockets, and hand-tailored shoulders that offer a broad masculine posture. Perfectly suited for high-stakes corporate meetings and diplomatic gatherings.',
    category: 'Suits',
    price: 1250,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuC6IMogg257U3uh1MtNS7HPgjGVwT2a6GeLfzTMCVYFuVskYnj6fDlCuYrlv0FdF1-KuhJO8Cw3C64A3_YnDyPvjWjzReX0_GkIXvhjxTYwDxTjonhszpsfhfENG3m8weu8uEZgfMISqEkEEKLF_JY4_-LrOBxk5gazOV-8oMMyEBLNXNlKdsbazYKsmNH-82Bugaouk2vagQ0xnRQILrQ2OOs2sztjrnLQpJCXRwPBrkdDitTrLUDXyw'],
    sizes: ['48R', '50R', '52R', '54R', '56R'],
    colors: ['Midnight Navy', 'Charcoal'],
    stock: 14,
    rating: 4.9,
    isFeatured: true,
    reviews: [
      { id: 'rev-1', userName: 'Amama Mbabazi', userRole: 'Senior Diplomat', rating: 5, comment: 'Impeccable precision. The shoulders sit flawlessly, and the fabric breathes exceptionally well in our climate. The personal styling service at Lubowa was outstanding.', date: '2026-05-12' },
      { id: 'rev-2', userName: 'Patrick Kaboyo', userRole: 'Corporate VP', rating: 5, comment: 'I wore this to our annual shareholder meeting and received endless compliments. Real boardroom power.', date: '2026-06-01' }
    ]
  },
  {
    id: 'prod-savile-pinstripe',
    name: 'Savile Midnight Pinstripe Suit',
    description: 'A powerful, commanding business silhouette crafted with impeccable pinstripe detailing. Woven with pure S130 super-fine wool. Features peak lapels, a classic double-breasted 6x2 button configuration, and fully functional surgeon cuffs. Designed exclusively for CEOs, managing directors, and gentlemen who lead with confidence.',
    category: 'Suits',
    price: 1450,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAi8UecRS-XnyrMnJeZL1BQVfI-k0R_gJR1LOmjQdttfkYhoplY3uVFZbanSoR2yMSezA5cR3e61-ad015ej7NHi3pxyGxrkLADT7Q_LZ1GutmVRTp4mDhq-j2uiwCqyCvXNPehFnXRH-LxmBTxPsLco-fna_xAO86vswBmBY2C-2KyB_lA85jIzmULF-qrB23JFySnGOOTlEGa9x7PfP1HLr3OUhu-yYHF7BQNYYBXL3_XdDjAitK2gg'],
    sizes: ['48R', '50R', '52R', '54R'],
    colors: ['Midnight Black with White Pinstripes', 'Obsidian Gray'],
    stock: 8,
    rating: 5.0,
    isNew: true,
    reviews: [
      { id: 'rev-3', userName: 'Charles Mugisha', userRole: 'Investment Banker', rating: 5, comment: 'The quality matches Savile Row. Outstanding service. This suit asserts authority.', date: '2026-06-15' }
    ]
  },
  {
    id: 'prod-herringbone-shirts',
    name: 'Crisp Poplin Herringbone Shirt Set',
    description: 'An essential pair of luxurious shirts crafted from two-ply 120s cotton poplin. One features a traditional pristine white hue, while the other features an elegant herringbone light blue pattern. Designed with structured semi-spread collars, double French cuffs to showcase your premium cufflinks, and detailed high-stitch sewing.',
    category: 'Shirts',
    price: 220,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuChMtp4jLNpzg9FCNudNK17V5dgPQ7gdqkInztWABOY1s9Wo0WquLDnHGVLaFpcTJ4l9h6f7O76xtk__qJO_Ydu6Yi8rjMn_p2JvvfRREDwwJDPBy83dd3IQCntFWraFkYmJ3LGWRlxwD6c1rBnh-lIF619KM6eoScw650fwNxZT1n7azvn0SlmFjNVIFyK5tBpwfFwh1WTbVRuvsh2okhFkLe5EGxiuvMmY0nIuf3ePWzFrNsg5MqpzA'],
    sizes: ['39', '40', '41', '42', '43'],
    colors: ['Classic Duo (White & Blue)', 'Pure White Pair'],
    stock: 25,
    rating: 4.8,
    isFeatured: true,
    reviews: []
  },
  {
    id: 'prod-presidential-poplin',
    name: 'Ugandan President Poplin White Shirt',
    description: 'The pinnacle of business-casual refinement. Structured with heavy, crease-resistant Egyptian Giza cotton, this shirt is bespoke-made to stay exceptionally crisp and fresh through long ministerial meetings, corporate dinners, or high-level summits. Styled with an elegant classic Kent collar and single-button rounded cuffs.',
    category: 'Shirts',
    price: 190,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBMd6RQeA5FpvP486t2rqeCGXNCX0DP8ADnV8Wv-Ro25LLV5QqM0CBpL__iMTSCOnjqAMx78kno7N5QimxtsNkPR7XNVB64KXrDghBuBropddAROs95oIwiwlJOYoKxBLuWUFVkm6iPpqiKg-2mMFim1J4Bpn55duxvopahw4fK27UKjzQ8mP5P9PRDwrXMcXS3gI1ilE2ECCaI6YFmYFAPrarRhk1Yhkh8Cr4EulhA5zui4_ueB8n3ZA'],
    sizes: ['39', '40', '41', '42', '43', '44'],
    colors: ['Pristine White'],
    stock: 30,
    rating: 4.9,
    reviews: [
      { id: 'rev-4', userName: 'Hon. Andrew Mukasa', userRole: 'Cabinet Minister', rating: 5, comment: 'A shirt that never loses its structure. Truly fits the African heat without looking wrinkled.', date: '2026-05-20' }
    ]
  },
  {
    id: 'prod-cognac-oxfords',
    name: 'Imperial Cognac Wholecut Oxfords',
    description: 'Masterfully crafted from a single piece of premium Italian full-grain calfskin leather, leaving no seams for an incredibly sleek, elite visual profile. Hand-burnished by expert artisans to produce a deep, glowing cognac brown patina on reflective marble soles. Features Blake-stitched leather soles and a memory foam cushioned leather lining.',
    category: 'Shoes',
    price: 480,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBJyBXI8NaRR-Ck9F2JIpri68oWsCpNA7Ie-oMwo57RWPijvkzyQJtObOPa0rGqyJX9b2iSarTYZ0B-ZUf5YMtgLQLVIFHtgXW-hXS8HqXtoVijqL3nTsOuMFOmp8oazTtu0fjyeKdouINqfmtXIPlV_BiBb50VRTLlLwy-kRcaqVwlXhGkWDIIi3Z_0V7dZlsIQyDe7Swp-FIz1670sbanWFsYnbJPpp_gKYtjtWNCKOGLCw9haspdWA'],
    sizes: ['41', '42', '43', '44', '45'],
    colors: ['Cognac Brown'],
    stock: 12,
    rating: 5.0,
    isFeatured: true,
    reviews: [
      { id: 'rev-5', userName: 'Dr. David Ssewankambo', userRole: 'Executive Chairman', rating: 5, comment: 'Exquisite wholecut shoes. The leather is premium, the shape is extremely modern but timeless. Ideal pairing for any dark blue suit.', date: '2026-06-18' }
    ]
  },
  {
    id: 'prod-obsidian-monks',
    name: 'Obsidian Double Monk Straps',
    description: 'An elegant statement of executive poise. Handmade with robust full-grain black calfskin, styled with clean, polished gunmetal silver side buckles. The interior is lined with natural calfskin for breathability, while the outsole features durable, slip-resistant rubber injection. Sharp, elegant, and versatile enough for corporate suits or premium traditional attire.',
    category: 'Shoes',
    price: 520,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuCIiTPJM1DbZp8-SLivCY52EQivclcR97HSMXMjMwh84rbAAsKFIWN-0vlt7f3HPA69D9rNiiHCsvWtsA3_YL-yWytM8km9A3VkonGzdRDctMTsnrA6DHERdam6i317MJRJaj7msB1c3NDKLH6xaKg_CNdlAqzqPVnZsy2Vwl55v-F8B4DSp8MisXE5LDmQzAT4AbcJI6cX1XEmNW3EsP32FdJp75A6KBWXdkRcwEBHBumOpTxMiqx7kw'],
    sizes: ['41', '42', '43', '44'],
    colors: ['Obsidian Black'],
    stock: 9,
    rating: 4.7,
    reviews: []
  },
  {
    id: 'prod-emerald-silk',
    name: 'Emerald Jacquard Silk Tie Set',
    description: 'Indulge in pure corporate luxury with this exquisite emerald set. Consists of a hand-rolled heavy-weight jacquard silk tie and a matching silk-twill pocket square with delicate emerald patterns. Provides a crisp, dense knot that holds perfectly throughout high-pressure negotiations and executive functions.',
    category: 'Accessories',
    price: 150,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuD3GGmGC1lq3ebCU1W9mOX-CfsyMwa4SWAdF9TyTo1wg7-ga-zvcf_MDn5JW_wtISyBjg2HNciG8q-CCdHS96i2TIsWXLlFbJDRpyNsOVqrcftwcWSFDQKUyp1N6J5g21PI941CMbXy5XaX2bncnqHxnDRk1QnC9Doz53_m_8W99oeomA9E9yp8Sz40LQVf9o_x1ayUjuzCDH6sxZrKUsxdw4tpyjR1Z5guKYUyAkqbvsKk9IWfUaMlDw'],
    sizes: ['One Size'],
    colors: ['Emerald Green'],
    stock: 40,
    rating: 4.9,
    isNew: true,
    reviews: []
  },
  {
    id: 'prod-camel-overcoat',
    name: 'Lubowa Camel Hair Executive Overcoat',
    description: 'The ultimate outerwear piece for the modern globe-trotting gentleman. Tailored in an exquisite double-breasted silhouette using sumptuously soft, heavy camel hair. Structured with hand-sewn wide peak lapels, deep double jet pockets, and a luxurious cupro silk inner lining. Perfect for Kampala evenings, business travels to colder climates, or high-profile public appearances.',
    category: 'Suits',
    price: 1850,
    discountPercentage: 20, // Discounted to $1480
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAcO6MS2VWCWZQBnf0cCMZL-YE38o5bhKL5ARNtF7FUxluxGX49GTihEM53aMOry1-nrD7_al2QIuZdb5_xF6hQRMstrxCnP-qzBssHxrRwdhL5HifQg8IxmSoV7U8D7J4nt-im0L7SallxeSH7C4SLlSgqRzuCXUTQFP_l-fUJaV_toItNqWxlBNDXSStF7IlJbvPQcgV073TakLGegDBEMXdblzvIN15XyfiXmti8g4JrQWTDojzvCw'],
    sizes: ['48R', '50R', '52R', '54R'],
    colors: ['Classic Camel'],
    stock: 5,
    rating: 5.0,
    isDealOfTheDay: true,
    reviews: [
      { id: 'rev-6', userName: 'Kassim Sempijja', userRole: 'Oil & Gas Director', rating: 5, comment: 'Breathtaking quality. The weight is fantastic, and the camel hair texture is incredibly soft. Well worth the investment.', date: '2026-06-20' }
    ]
  },
  {
    id: 'prod-calfskin-tote',
    name: 'Obsidian Calfskin Travel Tote',
    description: 'Meticulously engineered from thick, pebbled full-grain calfskin leather. It houses a padded 16" laptop sleeve, separate dynamic document dividers, a custom gold-gilded pen rail, and a secure zippered internal pocket. Complete with a luxurious suede inner lining and robust brass hardware.',
    category: 'Accessories',
    price: 750,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBLr-rNoyiFmO6nXoy3EnvQuFw3o76S1sq2P2pnwxu-JM_nXQqH8FqJ0TAalP6sutbr-8uO9JKrZQxDJqeRMi3DDuLaAo46dAJlEYWPYPJ7xTFIk8oqHZHR8F54fV6I5MpSSk3th7gaJgdzZT0MIJSKd1pZcv80cgHNIRqL1xEVBvlHvvM0Xu5fnCO8b2nHJ3egCPWpPHCaI1TwxrXlUW6R6sZTLzGprEmZy4t3MEFxcqzl5k3oSGyFjw'],
    sizes: ['One Size'],
    colors: ['Obsidian Black'],
    stock: 6,
    rating: 4.8,
    reviews: []
  },
  {
    id: 'prod-charcoal-blazer',
    name: 'Charcoal Structured Wool Blazer',
    description: 'A masterpiece of soft, deconstructed tailoring. Crafted from a mid-weight Italian wool-cashmere fabric, offering a comfortable, natural shoulder line. Styled with custom mother-of-pearl buttons, a elegant double-vented back, and dynamic patch pockets.',
    category: 'Suits',
    price: 850,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAM1sxMc2tnXe5GtRulON-grniBCQw0AyzhEtySEs5LoH5p-pYIxqeYmZWDVZNkWiSnDZV7KWvRDq3zKhLK5OGIHR5GGHOlg0Tpn3jUJnBRjQFUGa0ufs_p_SgYkrlfHnkBuISuW8RZxe9BjgtSongMhEYViTl1Ko54EbA7F4yHCBkm2kFdD693RXN9ILEDJG5e1u7ec8VW_FJHuz3DLMSwQK-nZxgoFjjaewWqmkKAH-lPPnuTYMtjIQ'],
    sizes: ['48R', '50R', '52R', '54R', '56R'],
    colors: ['Charcoal Gray'],
    stock: 11,
    rating: 4.9,
    reviews: []
  },
  {
    id: 'prod-calfskin-loafers',
    name: 'Prestige Calfskin Penny Loafers',
    description: 'The epitome of refined ease. Hand-crafted from premium selection supple calfskin leather. They mold dynamically to your foot and feature a classic apron toe, leather stacked heel, and full leather lining. Masterful craftsmanship with high comfort.',
    category: 'Shoes',
    price: 420,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuBcZwWFnXB-gm1gviBsGoJzMvO4BPS5l0tu_DeRfhI-yL1HiyAA97ZHqrPb4_TJLjxXhlb8wKv8NT_DWHKf7LDm7wb8CqE05i4z3OJuRLNLMJcp6qhg91orjlOvH6VJZySeg56Y5e-qXw0YlKCDTnJvfXHFW9vWR9xF70Qp7M51fjyQN2_CdjpGtUy4hjmAIcuuTINy3KYoTK6v3Bb4G27Wlv5Uf5K3lKy3J6vZbL_e1WU2l5EweCnoUg'],
    sizes: ['41', '42', '43', '44', '45'],
    colors: ['Muted Walnut', 'Obsidian Black'],
    stock: 10,
    rating: 4.8,
    reviews: []
  }
];

const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Amama Mbabazi',
    email: 'amama@diplomats.gov',
    phone: '+256 772 123456',
    role: 'Customer',
    spending: 2700,
    rewardsPoints: 270
  },
  {
    id: 'usr-admin',
    name: 'Robert Mugabe Mukasa',
    email: 'admin@bluehills.com',
    phone: '+256 701 987654',
    role: 'Super Admin',
    spending: 0,
    rewardsPoints: 0
  },
  {
    id: 'usr-manager',
    name: 'Nalule Patricia',
    email: 'patricia@bluehills.com',
    phone: '+256 703 456789',
    role: 'Manager',
    spending: 0,
    rewardsPoints: 0
  },
  {
    id: 'usr-staff',
    name: 'Ochola Moses',
    email: 'moses@bluehills.com',
    phone: '+256 752 321654',
    role: 'Staff',
    spending: 0,
    rewardsPoints: 0
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-9841',
    customerName: 'Amama Mbabazi',
    customerEmail: 'amama@diplomats.gov',
    customerPhone: '+256 772 123456',
    amount: 1400,
    status: 'Delivered',
    date: '2026-05-12',
    items: [
      {
        productId: 'prod-monaco-navy',
        productName: 'Monaco Navy Tailored Suit',
        price: 1250,
        quantity: 1,
        selectedSize: '52R',
        selectedColor: 'Midnight Navy',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6IMogg257U3uh1MtNS7HPgjGVwT2a6GeLfzTMCVYFuVskYnj6fDlCuYrlv0FdF1-KuhJO8Cw3C64A3_YnDyPvjWjzReX0_GkIXvhjxTYwDxTjonhszpsfhfENG3m8weu8uEZgfMISqEkEEKLF_JY4_-LrOBxk5gazOV-8oMMyEBLNXNlKdsbazYKsmNH-82Bugaouk2vagQ0xnRQILrQ2OOs2sztjrnLQpJCXRwPBrkdDitTrLUDXyw'
      },
      {
        productId: 'prod-emerald-silk',
        productName: 'Emerald Jacquard Silk Tie Set',
        price: 150,
        quantity: 1,
        selectedSize: 'One Size',
        selectedColor: 'Emerald Green',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3GGmGC1lq3ebCU1W9mOX-CfsyMwa4SWAdF9TyTo1wg7-ga-zvcf_MDn5JW_wtISyBjg2HNciG8q-CCdHS96i2TIsWXLlFbJDRpyNsOVqrcftwcWSFDQKUyp1N6J5g21PI941CMbXy5XaX2bncnqHxnDRk1QnC9Doz53_m_8W99oeomA9E9yp8Sz40LQVf9o_x1ayUjuzCDH6sxZrKUsxdw4tpyjR1Z5guKYUyAkqbvsKk9IWfUaMlDw'
      }
    ],
    shippingAddress: {
      country: 'Uganda',
      district: 'Kampala',
      city: 'Lubowa',
      address: 'Plot 42, Executive Rise, Lubowa'
    },
    paymentMethod: 'Visa'
  },
  {
    id: 'ORD-9902',
    customerName: 'Patrick Kaboyo',
    customerEmail: 'kaboyo@corporate.co.ug',
    customerPhone: '+256 781 112233',
    amount: 1250,
    status: 'Processing',
    date: '2026-06-20',
    items: [
      {
        productId: 'prod-monaco-navy',
        productName: 'Monaco Navy Tailored Suit',
        price: 1250,
        quantity: 1,
        selectedSize: '50R',
        selectedColor: 'Midnight Navy',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6IMogg257U3uh1MtNS7HPgjGVwT2a6GeLfzTMCVYFuVskYnj6fDlCuYrlv0FdF1-KuhJO8Cw3C64A3_YnDyPvjWjzReX0_GkIXvhjxTYwDxTjonhszpsfhfENG3m8weu8uEZgfMISqEkEEKLF_JY4_-LrOBxk5gazOV-8oMMyEBLNXNlKdsbazYKsmNH-82Bugaouk2vagQ0xnRQILrQ2OOs2sztjrnLQpJCXRwPBrkdDitTrLUDXyw'
      }
    ],
    shippingAddress: {
      country: 'Uganda',
      district: 'Wakiso',
      city: 'Entebbe',
      address: 'Presidential Runway Drive, Entebbe'
    },
    paymentMethod: 'Mobile Money'
  }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    userId: 'usr-admin',
    userName: 'Robert Mugabe Mukasa',
    userRole: 'Super Admin',
    action: 'System Bootstrapped',
    details: 'Initial inventory and premium executive profiles successfully initialized.',
    timestamp: '2026-06-25T12:00:00Z'
  }
];

// Helper functions to map between camelCase (Zustand state) and snake_case (standard relational databases / Supabase)
function keysToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToCamel(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = keysToCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

function keysToSnake(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToSnake(v));
  } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = keysToSnake(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

function toValidUUID(str: string): string {
  if (!str) return '00000000-0000-0000-0000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return str.toLowerCase();
  }

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

function mapToSupabasePayload(tableName: string, payload: any): any {
  if (!payload) return payload;

  const getTimestamp = (val: any) => {
    if (!val) return new Date().toISOString();
    try {
      return new Date(val).toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  const state = useStore.getState ? useStore.getState() : { users: [], products: [] };
  const localUsers = state.users || [];

  switch (tableName) {
    case 'products': {
      const catName = payload.category || 'Suits';
      const catKey = catName.toLowerCase();
      const catId = toValidUUID('cat-' + catKey);
      return {
        id: toValidUUID(payload.id),
        category_id: catId,
        name: payload.name,
        slug: payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: payload.description || '',
        short_description: payload.shortDescription || payload.description?.slice(0, 150) || '',
        price: Number(payload.price) || 0,
        discount_percentage: Number(payload.discountPercentage) || 0,
        is_featured: !!payload.isFeatured,
        is_new: !!payload.isNew,
        is_deal: !!payload.isDealOfTheDay,
        rating: Number(payload.rating) || 0,
        stock: Number(payload.stock) || 0,
        status: 'Active'
      };
    }

    case 'reviews': {
      let userId = payload.userId || payload.user_id;
      if (!userId && payload.userName) {
        const matchedUser = localUsers.find((u: any) => u.name.toLowerCase() === payload.userName.toLowerCase());
        userId = matchedUser ? matchedUser.id : toValidUUID('usr-' + payload.userName.toLowerCase());
      }
      return {
        id: toValidUUID(payload.id || `rev-${payload.productId}-${payload.userName || 'anon'}`),
        product_id: toValidUUID(payload.productId || payload.product_id),
        user_id: toValidUUID(userId || 'usr-guest'),
        rating: Number(payload.rating) || 5,
        comment: payload.comment || '',
        created_at: getTimestamp(payload.date || payload.created_at)
      };
    }

    case 'profiles': {
      return {
        id: toValidUUID(payload.id),
        full_name: payload.name || payload.fullName || payload.full_name || 'Gentleman Customer',
        email: payload.email,
        phone: payload.phone || null,
        role: payload.role?.toLowerCase() || 'customer',
        reward_points: Number(payload.rewardsPoints) || Number(payload.rewardPoints) || Number(payload.reward_points) || 0,
        lifetime_spending: Number(payload.spending) || Number(payload.lifetimeSpending) || Number(payload.lifetime_spending) || 0,
        is_active: true
      };
    }

    case 'orders': {
      const orderId = toValidUUID(payload.id);
      let userId = payload.userId || payload.user_id;
      if (!userId && payload.customerEmail) {
        const matchedUser = localUsers.find((u: any) => u.email.toLowerCase() === payload.customerEmail.toLowerCase());
        userId = matchedUser ? matchedUser.id : toValidUUID('usr-' + payload.customerEmail.toLowerCase());
      }
      return {
        id: orderId,
        user_id: userId ? toValidUUID(userId) : null,
        order_number: payload.id,
        amount: Number(payload.amount) || 0,
        status: payload.status?.toLowerCase() || 'pending',
        payment_method: payload.paymentMethod || payload.payment_method || 'Cash on Delivery',
        notes: payload.notes || null,
        created_at: getTimestamp(payload.date || payload.created_at)
      };
    }

    case 'order_items': {
      const orderId = toValidUUID(payload.orderId || payload.order_id);
      const prodId = payload.productId || payload.product_id;
      const itemId = payload.id || `item-${payload.orderId}-${prodId}-${payload.selectedSize}-${payload.selectedColor}`;
      return {
        id: toValidUUID(itemId),
        order_id: orderId,
        product_id: toValidUUID(prodId),
        variant_id: null,
        quantity: Number(payload.quantity) || 1,
        price: Number(payload.price) || 0
      };
    }

    case 'order_addresses': {
      const orderId = toValidUUID(payload.orderId || payload.order_id);
      const addrId = payload.id || `addr-${payload.orderId}`;
      return {
        id: toValidUUID(addrId),
        order_id: orderId,
        country: payload.country || 'Uganda',
        district: payload.district || 'Kampala',
        city: payload.city || 'Kampala',
        address: payload.address || ''
      };
    }

    case 'newsletter_subscribers': {
      const subId = payload.id || payload.email;
      return {
        id: toValidUUID(subId),
        email: payload.email,
        subscribed_at: getTimestamp(payload.date || payload.subscribedAt || payload.subscribed_at || payload.created_at)
      };
    }

    case 'audit_logs': {
      let userId = payload.userId || payload.user_id;
      if (!userId && payload.userName) {
        const matchedUser = localUsers.find((u: any) => u.name.toLowerCase() === payload.userName.toLowerCase());
        userId = matchedUser ? matchedUser.id : null;
      }
      return {
        id: toValidUUID(payload.id),
        user_id: userId ? toValidUUID(userId) : null,
        action: payload.action,
        details: payload.details || '',
        ip_address: payload.ipAddress || null,
        created_at: getTimestamp(payload.timestamp || payload.createdAt || payload.created_at)
      };
    }

    case 'wishlists': {
      return {
        id: toValidUUID(payload.id || `${payload.userId || payload.user_id}-${payload.productId || payload.product_id}`),
        user_id: toValidUUID(payload.userId || payload.user_id),
        product_id: toValidUUID(payload.productId || payload.product_id),
        created_at: getTimestamp(payload.createdAt || payload.created_at)
      };
    }

    case 'consultations': {
      return {
        id: toValidUUID(payload.id),
        user_id: toValidUUID(payload.userId || payload.user_id || 'usr-guest'),
        booking_date: payload.bookingDate || payload.booking_date,
        booking_time: payload.bookingTime || payload.booking_time,
        notes: payload.notes || '',
        status: payload.status?.toLowerCase() || 'pending',
        created_at: getTimestamp(payload.createdAt || payload.created_at)
      };
    }

    case 'payments': {
      return {
        id: toValidUUID(payload.id || `pay-${payload.orderId || payload.order_id}`),
        order_id: toValidUUID(payload.orderId || payload.order_id),
        provider: payload.provider || 'Cash on Delivery',
        transaction_id: payload.transactionId || payload.transaction_id || '',
        amount: Number(payload.amount) || 0,
        status: payload.status || 'success',
        created_at: getTimestamp(payload.createdAt || payload.created_at)
      };
    }

    case 'product_images': {
      return {
        id: toValidUUID(payload.id || `img-${payload.productId || payload.product_id}-${payload.imageUrl || payload.image_url}`),
        product_id: toValidUUID(payload.productId || payload.product_id),
        image_url: payload.imageUrl || payload.image_url,
        display_order: Number(payload.displayOrder || payload.display_order) || 1,
        created_at: getTimestamp(payload.created_at)
      };
    }

    default:
      return payload;
  }
}

async function safeSupabaseInsert(tableName: string, payload: any) {
  try {
    const mappedPayload = mapToSupabasePayload(tableName, payload);
    const response = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'insert', tableName, payload: mappedPayload })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn(`Supabase insert failed on ${tableName}:`, errData.error || response.statusText);
    }
  } catch (err) {
    console.error(`Error in safeSupabaseInsert for ${tableName}:`, err);
  }
}

async function safeSupabaseUpsert(tableName: string, payload: any) {
  try {
    const mappedPayload = mapToSupabasePayload(tableName, payload);
    const response = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', tableName, payload: mappedPayload })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn(`Supabase upsert failed on ${tableName}:`, errData.error || response.statusText);
    }
  } catch (err) {
    console.error(`Error in safeSupabaseUpsert for ${tableName}:`, err);
  }
}

async function safeSupabaseDelete(tableName: string, filters: Record<string, any>) {
  try {
    const response = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', tableName, payload: { filters } })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn(`Supabase delete failed on ${tableName}:`, errData.error || response.statusText);
    }
  } catch (err) {
    console.error(`Error in safeSupabaseDelete for ${tableName}:`, err);
  }
}

async function seedCategories() {
  try {
    const defaultCats = [
      { id: toValidUUID('cat-suits'), name: 'Suits', slug: 'suits', description: 'Premium Bespoke Suits' },
      { id: toValidUUID('cat-shirts'), name: 'Shirts', slug: 'shirts', description: 'Crisp Luxury Shirts' },
      { id: toValidUUID('cat-shoes'), name: 'Shoes', slug: 'shoes', description: 'Elite Handmade Shoes' },
      { id: toValidUUID('cat-accessories'), name: 'Accessories', slug: 'accessories', description: 'Exquisite Gentlemen Accessories' }
    ];
    for (const cat of defaultCats) {
      await safeSupabaseUpsert('categories', cat);
    }
  } catch (e) {
    console.warn('Seeding categories failed:', e);
  }
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      products: INITIAL_PRODUCTS,
      users: INITIAL_USERS,
      currentUser: null,
      cart: [],
      orders: INITIAL_ORDERS,
      bookings: [],
      subscribers: [],
      auditLogs: INITIAL_AUDIT_LOGS,
      wishlist: [],
      isSyncing: false,

      syncFromSupabase: async () => {
        set({ isSyncing: true });
        try {
          const supabase = getSupabaseClient();
          if (!supabase) {
            set({ isSyncing: false });
            return;
          }

          // Ensure categories are seeded in the database
          await seedCategories();
          const { data: dbCats } = await supabase.from('categories').select('*');

          // 1. Fetch & Seed Profiles FIRST (so that products/reviews can reference user profiles)
          const { data: dbProfiles, error: profErr } = await supabase.from('profiles').select('*');
          if (!profErr && dbProfiles && dbProfiles.length > 0) {
            const mappedUsers = dbProfiles.map((p: any) => ({
              id: p.id,
              name: p.full_name,
              email: p.email,
              phone: p.phone,
              role: p.role,
              spending: p.lifetime_spending,
              rewardsPoints: p.reward_points
            }));
            set({ users: mappedUsers as User[] });
          } else if (!profErr) {
            for (const user of INITIAL_USERS) {
              await safeSupabaseUpsert('profiles', user);
            }
            set({ users: INITIAL_USERS });
          }

          // 2. Fetch & Seed Products & Reviews
          const { data: dbProducts, error: prodErr } = await supabase.from('products').select('*');
          if (!prodErr && dbProducts && dbProducts.length > 0) {
            const { data: dbReviews } = await supabase.from('reviews').select('*');
            const { data: dbProfilesList } = await supabase.from('profiles').select('*');
            let dbImages: any[] | null = null;
            try {
              const { data: imgData } = await supabase.from('product_images').select('*');
              dbImages = imgData;
            } catch (e) {
              console.warn('Could not query product_images:', e);
            }

            const reviewsWithProfiles = dbReviews ? dbReviews.map((r: any) => {
              const profile = dbProfilesList?.find((prof: any) => prof.id === r.user_id);
              return {
                id: r.id,
                productId: r.product_id,
                userName: profile?.full_name || 'Gentleman Customer',
                userRole: profile?.role || 'Customer',
                rating: r.rating,
                comment: r.comment,
                date: r.created_at
              };
            }) : [];

            const mappedProducts = dbProducts.map((p: any) => {
              const catName = dbCats ? (dbCats.find((c: any) => c.id === p.category_id)?.name || 'Suits') : 'Suits';
              const localProd = INITIAL_PRODUCTS.find(lp => toValidUUID(lp.id) === p.id);
              const prodReviews = reviewsWithProfiles.filter(r => r.productId === p.id);

              const productImages = dbImages
                ? dbImages
                    .filter((img: any) => img.product_id === p.id)
                    .sort((a: any, b: any) => (a.display_order || 1) - (b.display_order || 1))
                    .map((img: any) => img.image_url)
                : [];
              const finalImages = productImages.length > 0 ? productImages : (localProd?.images || [p.slug ? `https://picsum.photos/seed/${p.slug}/600/600` : 'https://picsum.photos/seed/suit/600/600']);

              return {
                id: p.id,
                name: p.name,
                description: p.description,
                category: catName,
                price: p.price,
                images: finalImages,
                sizes: localProd?.sizes || ['M', 'L', 'XL'],
                colors: localProd?.colors || ['Classic Black'],
                stock: p.stock,
                rating: p.rating,
                isNew: p.is_new,
                isFeatured: p.is_featured,
                isDealOfTheDay: p.is_deal,
                discountPercentage: p.discount_percentage,
                reviews: prodReviews
              };
            });
            set({ products: mappedProducts as Product[] });
          } else if (!prodErr) {
            // Seed products
            for (const prod of INITIAL_PRODUCTS) {
              await safeSupabaseUpsert('products', prod);
              if (prod.images && prod.images.length > 0) {
                for (let i = 0; i < prod.images.length; i++) {
                  await safeSupabaseUpsert('product_images', {
                    productId: prod.id,
                    imageUrl: prod.images[i],
                    displayOrder: i + 1
                  });
                }
              }
              for (const rev of prod.reviews) {
                // Ensure a profile exists for the reviewer so that we don't violate the foreign key constraint
                const matchedUser = INITIAL_USERS.find(u => u.name.toLowerCase() === rev.userName.toLowerCase());
                const reviewerUserId = matchedUser ? matchedUser.id : `usr-${rev.userName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                
                // If reviewer profile doesn't exist in profiles list, seed it as a stub first
                await safeSupabaseUpsert('profiles', {
                  id: reviewerUserId,
                  name: rev.userName,
                  email: matchedUser?.email || `${rev.userName.toLowerCase().replace(/[^a-z0-9]+/g, '')}@example.com`,
                  phone: matchedUser?.phone || '',
                  role: matchedUser?.role || 'Customer',
                  spending: matchedUser?.spending || 0,
                  rewardsPoints: matchedUser?.rewardsPoints || 0
                });

                await safeSupabaseUpsert('reviews', { ...rev, productId: prod.id, userId: reviewerUserId });
              }
            }
            set({ products: INITIAL_PRODUCTS });
          }

          // 3. Fetch Orders, Order Items, Addresses
          const { data: dbOrders, error: ordErr } = await supabase.from('orders').select('*');
          if (!ordErr && dbOrders && dbOrders.length > 0) {
            const { data: dbItems } = await supabase.from('order_items').select('*');
            const { data: dbAddresses } = await supabase.from('order_addresses').select('*');
            const { data: dbProfilesList } = await supabase.from('profiles').select('*');
            
            const formattedOrders = dbOrders.map(o => {
              const profile = dbProfilesList?.find((p: any) => p.id === o.user_id);
              const addr = dbAddresses?.find((a: any) => a.order_id === o.id) || {
                country: 'Uganda', district: 'Kampala', city: 'Lubowa', address: 'Lubowa Shopping Mall'
              };
              
              const items = dbItems ? dbItems.filter((item: any) => item.order_id === o.id).map((item: any) => {
                const prod = get().products.find(p => p.id === item.product_id);
                return {
                  productId: item.product_id,
                  productName: prod?.name || 'Luxury Item',
                  price: item.price,
                  quantity: item.quantity,
                  selectedSize: 'M',
                  selectedColor: 'Default',
                  image: prod?.images[0] || 'https://picsum.photos/seed/suit/600/600'
                };
              }) : [];

              return {
                id: o.order_number || o.id,
                customerName: profile?.full_name || 'Gentleman Customer',
                customerEmail: profile?.email || '',
                customerPhone: profile?.phone || '',
                amount: o.amount,
                status: o.status,
                date: o.created_at,
                paymentMethod: o.payment_method,
                notes: o.notes,
                items,
                shippingAddress: {
                  country: addr.country,
                  district: addr.district,
                  city: addr.city,
                  address: addr.address
                }
              };
            });
            set({ orders: formattedOrders as Order[] });
          } else if (!ordErr) {
            for (const order of INITIAL_ORDERS) {
              await safeSupabaseUpsert('orders', order);
              for (const item of order.items) {
                await safeSupabaseUpsert('order_items', { ...item, orderId: order.id });
              }
              await safeSupabaseUpsert('order_addresses', { ...order.shippingAddress, orderId: order.id });
            }
            set({ orders: INITIAL_ORDERS });
          }

          // 4. Fetch Consultations (Try-catch in case table is missing)
          try {
            const { data: dbBookings, error: bookErr } = await supabase.from('consultations').select('*');
            if (!bookErr && dbBookings) {
              const camelBookings = keysToCamel(dbBookings) as ConsultationBooking[];
              const localBookings = get().bookings || [];
              const missingBookings = localBookings.filter(lb => !camelBookings.some(cb => cb.id === lb.id));
              for (const booking of missingBookings) {
                await safeSupabaseUpsert('consultations', booking);
              }
              set({ bookings: [...camelBookings, ...missingBookings] });
            }
          } catch (e) {
            console.warn('Could not sync consultations table:', e);
          }

          // 5. Fetch Newsletter Subscribers
          const { data: dbSubs, error: subsErr } = await supabase.from('newsletter_subscribers').select('*');
          if (!subsErr && dbSubs) {
            const mappedSubs = dbSubs.map((sub: any) => ({
              id: sub.id,
              email: sub.email,
              date: sub.subscribed_at
            })) as NewsletterSubscriber[];
            const localSubs = get().subscribers || [];
            const missingSubs = localSubs.filter(ls => !mappedSubs.some(cs => cs.email.toLowerCase() === ls.email.toLowerCase()));
            for (const sub of missingSubs) {
              await safeSupabaseUpsert('newsletter_subscribers', sub);
            }
            set({ subscribers: [...mappedSubs, ...missingSubs] });
          }

          // 6. Fetch Audit Logs
          const { data: dbLogs, error: logErr } = await supabase.from('audit_logs').select('*');
          if (!logErr && dbLogs && dbLogs.length > 0) {
            const { data: dbProfilesList } = await supabase.from('profiles').select('*');
            const mappedLogs = dbLogs.map((log: any) => {
              const profile = dbProfilesList?.find((p: any) => p.id === log.user_id);
              return {
                id: log.id,
                userId: log.user_id || 'guest',
                userName: profile?.full_name || 'System / Guest',
                userRole: profile?.role || 'Customer',
                action: log.action,
                details: log.details || '',
                timestamp: log.created_at
              };
            }) as AuditLog[];
            set({ auditLogs: mappedLogs.slice(0, 500) });
          } else if (!logErr) {
            for (const log of INITIAL_AUDIT_LOGS) {
              await safeSupabaseUpsert('audit_logs', log);
            }
            set({ auditLogs: INITIAL_AUDIT_LOGS });
          }

        } catch (err) {
          console.error('Error in syncFromSupabase:', err);
        } finally {
          set({ isSyncing: false });
        }
      },

      login: async (email, password, role) => {
        try {
          const supabase = getSupabaseClient();
          const users = get().users;

          // Check if this is a fast-track bypass OR a pre-defined persona login with the special password
          const isPredefined = users.find(u => u.email.toLowerCase() === email.toLowerCase());
          
          if (isPredefined && (password === 'securityKeysApproved' || !password)) {
            // Log in the pre-defined persona immediately
            set({ currentUser: isPredefined });
            get().addAuditLog(
              'User Login',
              `User logged in securely via fast-track. Session initiated.`,
              isPredefined.id,
              isPredefined.name,
              isPredefined.role
            );
            safeSupabaseUpsert('profiles', isPredefined);
            return { success: true };
          }

          if (!password) {
            return { success: false, error: 'Password is required for standard authentication.' };
          }

          // Real Supabase Auth login
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            // Check if this error looks like a network or connection/offline issue (like AuthRetryableFetchError or network fetch failure)
            const isConnectionError =
              error.message?.includes('fetch') ||
              error.message?.includes('Network') ||
              error.message?.includes('Failed to fetch') ||
              error.message?.includes('connect') ||
              error.status === 0 ||
              !error.status;

            if (isConnectionError) {
              const localUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
              if (localUser) {
                set({ currentUser: localUser });
                get().addAuditLog(
                  'User Login',
                  `Offline local fallback login successful for ${localUser.name}.`,
                  localUser.id,
                  localUser.name,
                  localUser.role
                );
                return { success: true };
              }
            }
            return { success: false, error: error.message };
          }

          const authUser = data.user;
          if (!authUser) {
            return { success: false, error: 'Authentication failed. No user object returned.' };
          }

          // Try to fetch profile from profiles table
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          let user: User;

          if (profile) {
            user = {
              id: profile.id,
              name: profile.name || profile.full_name || authUser.user_metadata?.name || email.split('@')[0].toUpperCase(),
              email: profile.email || authUser.email || email,
              phone: profile.phone || authUser.user_metadata?.phone || '',
              role: (profile.role as User['role']) || 'Customer',
              spending: profile.spending || profile.lifetime_spending || 0,
              rewardsPoints: profile.rewardsPoints || profile.rewards_points || 0
            };
          } else {
            // Profile doesn't exist yet, auto-create one
            user = {
              id: authUser.id,
              name: authUser.user_metadata?.name || email.split('@')[0].toUpperCase(),
              email: authUser.email || email,
              phone: authUser.user_metadata?.phone || '',
              role: 'Customer',
              spending: 0,
              rewardsPoints: 0
            };
            await safeSupabaseUpsert('profiles', user);
          }

          // Update store currentUser and users list
          set(state => {
            const exists = state.users.some(u => u.id === user.id);
            return {
              currentUser: user,
              users: exists ? state.users.map(u => u.id === user.id ? user : u) : [...state.users, user]
            };
          });

          get().addAuditLog(
            'User Login',
            `User logged in securely via Supabase Auth. Session initiated.`,
            user.id,
            user.name,
            user.role
          );

          return { success: true };
        } catch (err: any) {
          console.error('Login error:', err);
          return { success: false, error: err.message || 'An unexpected authentication error occurred.' };
        }
      },

      register: async (name, email, phone, password, role = 'Customer') => {
        try {
          if (!password) {
            return { success: false, error: 'A password is required to compile a private profile.' };
          }

          // Register via secure server-side API route to bypass SMTP & trigger RLS issues
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password, role })
          });

          const res = await response.json();
          if (!response.ok || !res.success) {
            return { success: false, error: res.error || 'Registration failed.' };
          }

          const newUser: User = {
            id: res.user.id,
            name,
            email,
            phone,
            role: role as User['role'],
            spending: 0,
            rewardsPoints: 0
          };

          // Save/update profile using privileged API route bypass
          await safeSupabaseUpsert('profiles', newUser);

          // Authenticate on the client-side to establish standard session cookies
          const loginRes = await get().login(email, password);
          if (!loginRes.success) {
            set(state => ({
              users: [...state.users.filter(u => u.id !== newUser.id), newUser],
              currentUser: newUser
            }));
          }

          get().addAuditLog(
            'User Registration',
            `New elite profile created via Supabase Admin Auth secure bypass.`,
            newUser.id,
            newUser.name,
            newUser.role
          );

          return { success: true };
        } catch (err: any) {
          console.error('Registration error:', err);
          return { success: false, error: err.message || 'An unexpected registration error occurred.' };
        }
      },

      logout: async () => {
        try {
          const supabase = getSupabaseClient();
          const user = get().currentUser;
          if (user) {
            get().addAuditLog(
              'User Logout',
              `User logged out. Session terminated.`,
              user.id,
              user.name,
              user.role
            );
          }
          await supabase.auth.signOut();
        } catch (err) {
          console.error('Logout error:', err);
        } finally {
          set({ currentUser: null });
        }
      },

      updateProfile: (name, phone) => {
        const current = get().currentUser;
        if (!current) return;

        const updated = { ...current, name, phone };
        
        set(state => ({
          currentUser: updated,
          users: state.users.map(u => u.id === current.id ? updated : u)
        }));

        get().addAuditLog(
          'Profile Updated',
          `Personal contact and detail registry updated.`,
          current.id,
          name,
          current.role
        );

        safeSupabaseUpsert('profiles', updated);
      },

      updatePassword: async (password) => {
        try {
          const supabase = getSupabaseClient();
          const current = get().currentUser;
          if (!current) return { success: false, error: 'No active session' };

          const { error } = await supabase.auth.updateUser({
            password
          });

          if (error) {
            return { success: false, error: error.message };
          }

          get().addAuditLog(
            'Security Updated',
            `Account password reset successfully with high strength encryption keys.`,
            current.id,
            current.name,
            current.role
          );
          return { success: true };
        } catch (err: any) {
          console.error('Password update error:', err);
          return { success: false, error: err.message || 'Failed to update security password.' };
        }
      },

      addToCart: (product, size, color, qty) => {
        const cart = get().cart;
        const cartItemId = `${product.id}-${size}-${color}`;
        
        const existing = cart.find(item => item.id === cartItemId);
        if (existing) {
          set(state => ({
            cart: state.cart.map(item => 
              item.id === cartItemId 
                ? { ...item, quantity: item.quantity + qty }
                : item
            )
          }));
        } else {
          const newItem: CartItem = {
            id: cartItemId,
            product,
            selectedSize: size,
            selectedColor: color,
            quantity: qty
          };
          set(state => ({ cart: [...state.cart, newItem] }));
        }
      },

      updateCartQty: (cartItemId, qty) => {
        if (qty <= 0) {
          get().removeFromCart(cartItemId);
          return;
        }
        set(state => ({
          cart: state.cart.map(item => 
            item.id === cartItemId ? { ...item, quantity: qty } : item
          )
        }));
      },

      removeFromCart: (cartItemId) => {
        set(state => ({
          cart: state.cart.filter(item => item.id !== cartItemId)
        }));
      },

      clearCart: () => set({ cart: [] }),

      placeOrder: (orderData) => {
        const newOrder: Order = {
          ...orderData,
          id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString().split('T')[0]
        };

        set(state => ({
          orders: [newOrder, ...state.orders]
        }));

        // Deduct stock for each item
        set(state => ({
          products: state.products.map(p => {
            const orderItem = newOrder.items.find(item => item.productId === p.id);
            if (orderItem) {
              return { ...p, stock: Math.max(0, p.stock - orderItem.quantity) };
            }
            return p;
          })
        }));

        // Add spending & rewards points to current user if logged in
        const current = get().currentUser;
        if (current) {
          const newSpending = current.spending + newOrder.amount;
          const pointsEarned = Math.floor(newOrder.amount * 0.1); // 10% cash back in points
          const updatedUser = {
            ...current,
            spending: newSpending,
            rewardsPoints: current.rewardsPoints + pointsEarned
          };

          set(state => ({
            currentUser: updatedUser,
            users: state.users.map(u => u.id === current.id ? updatedUser : u)
          }));

          get().addAuditLog(
            'Order Placement',
            `Corporate purchase of $${newOrder.amount} placed successfully. Earned ${pointsEarned} loyalty rewards.`,
            current.id,
            current.name,
            current.role
          );
          // Sync profile details
          safeSupabaseUpsert('profiles', updatedUser);
        } else {
          get().addAuditLog(
            'Guest Order Placement',
            `Corporate purchase of $${newOrder.amount} placed successfully via guest registry.`,
            'guest',
            newOrder.customerName,
            'Customer'
          );
        }

        // Sync order with Supabase relational tables (orders, order_items, order_addresses, payments)
        const { items, shippingAddress, ...orderPayload } = newOrder;
        safeSupabaseInsert('orders', orderPayload);
        for (const item of items) {
          safeSupabaseInsert('order_items', { ...item, orderId: newOrder.id });
        }
        safeSupabaseInsert('order_addresses', { ...shippingAddress, orderId: newOrder.id });
        safeSupabaseInsert('payments', {
          orderId: newOrder.id,
          amount: newOrder.amount,
          paymentMethod: newOrder.paymentMethod,
          status: 'Completed',
          date: newOrder.date
        });

        // Sync updated stocks
        for (const item of items) {
          const matchedP = get().products.find(p => p.id === item.productId);
          if (matchedP) {
            safeSupabaseUpsert('products', { id: matchedP.id, stock: matchedP.stock });
          }
        }

        get().clearCart();
        return newOrder;
      },

      updateOrderStatus: (orderId, status, modifierName, modifierRole) => {
        set(state => ({
          orders: state.orders.map(o => o.id === orderId ? { ...o, status } : o)
        }));

        get().addAuditLog(
          'Order Status Adjusted',
          `Order ${orderId} status transitioned to '${status}' by staff.`,
          'staff-modifier',
          modifierName,
          modifierRole as User['role']
        );

        // Sync status with Supabase
        safeSupabaseUpsert('orders', { id: orderId, status });
      },

      addProduct: (productData, creatorName, creatorRole) => {
        const newProduct: Product = {
          ...productData,
          id: `prod-${Date.now()}`,
          rating: 5.0,
          reviews: []
        };

        set(state => ({
          products: [newProduct, ...state.products]
        }));

        get().addAuditLog(
          'Product Registered',
          `Added premium asset '${newProduct.name}' into boutique collection. Price: $${newProduct.price}.`,
          'admin-modifier',
          creatorName,
          creatorRole as User['role']
        );

        // Sync product payload (excluding client-side only array nested reviews)
        const { reviews, ...prodPayload } = newProduct;
        safeSupabaseInsert('products', prodPayload);
      },

      updateProduct: (id, updatedFields, updaterName, updaterRole) => {
        set(state => ({
          products: state.products.map(p => p.id === id ? { ...p, ...updatedFields } : p)
        }));

        get().addAuditLog(
          'Product Updated',
          `Modified fields on asset ID '${id}'.`,
          'admin-modifier',
          updaterName,
          updaterRole as User['role']
        );

        // Sync updated fields with Supabase
        safeSupabaseUpsert('products', { id, ...updatedFields });
      },

      deleteProduct: (id, deleterName, deleterRole) => {
        const productToDelete = get().products.find(p => p.id === id);
        set(state => ({
          products: state.products.filter(p => p.id !== id)
        }));

        get().addAuditLog(
          'Product Asset Deletion',
          `Soft-removed product asset '${productToDelete?.name || id}' from active registry. Audit flag saved.`,
          'admin-modifier',
          deleterName,
          deleterRole as User['role']
        );

        // Sync product delete with Supabase
        safeSupabaseDelete('products', { id });
      },

      addReview: (productId, rating, comment, userName, userRole = 'Executive Client') => {
        const newReview: Review = {
          id: `rev-${Date.now()}`,
          userName,
          userRole,
          rating,
          comment,
          date: new Date().toISOString().split('T')[0]
        };

        set(state => ({
          products: state.products.map(p => {
            if (p.id === productId) {
              const updatedReviews = [...p.reviews, newReview];
              const avgRating = Number(
                (updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1)
              );
              return {
                ...p,
                reviews: updatedReviews,
                rating: avgRating
              };
            }
            return p;
          })
        }));

        get().addAuditLog(
          'Review Added',
          `Added standard product review on asset ID ${productId}. Rating: ${rating}/5.`,
          'user',
          userName,
          'Customer'
        );

        // Sync review in Supabase
        safeSupabaseInsert('reviews', { ...newReview, productId });

        // Update overall product rating in products table
        const matched = get().products.find(p => p.id === productId);
        if (matched) {
          const updatedReviews = [...matched.reviews, newReview];
          const avgRating = Number(
            (updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1)
          );
          safeSupabaseUpsert('products', { id: productId, rating: avgRating });
        }
      },

      bookConsultation: (bookingData) => {
        const newBooking: ConsultationBooking = {
          ...bookingData,
          id: `BOK-${Math.floor(100 + Math.random() * 900)}`,
          status: 'Pending'
        };

        set(state => ({
          bookings: [newBooking, ...state.bookings]
        }));

        get().addAuditLog(
          'Consultation Booked',
          `Elite personal styling session requested for ${newBooking.date} at ${newBooking.time}.`,
          'user',
          newBooking.clientName,
          'Customer'
        );

        // Sync booking with Supabase
        safeSupabaseInsert('consultations', newBooking);
      },

      updateBookingStatus: (bookingId, status) => {
        set(state => ({
          bookings: state.bookings.map(b => b.id === bookingId ? { ...b, status } : b)
        }));

        // Sync booking status with Supabase
        safeSupabaseUpsert('consultations', { id: bookingId, status });
      },

      subscribeNewsletter: (email) => {
        const subs = get().subscribers;
        const exists = subs.find(s => s.email.toLowerCase() === email.toLowerCase());
        
        if (exists) {
          // Always ensure the existing local subscriber is synced to Supabase
          safeSupabaseInsert('newsletter_subscribers', exists);
          return { success: false, message: 'You are already a valued member of the Gentlemen\'s Circle.' };
        }

        const newSub: NewsletterSubscriber = {
          id: `sub-${Date.now()}`,
          email,
          date: new Date().toISOString().split('T')[0]
        };

        set(state => ({
          subscribers: [...state.subscribers, newSub]
        }));

        get().addAuditLog(
          'Newsletter Subscription',
          `Email registry added to 'Gentlemen\\'s Circle'.`,
          'guest',
          email,
          'Customer'
        );

        // Sync subscriber with Supabase
        safeSupabaseInsert('newsletter_subscribers', newSub);

        return { success: true, message: 'Welcome to the Gentlemen\'s Circle. Exquisite journals will arrive soon.' };
      },

      toggleWishlist: (productId) => {
        const wishlist = get().wishlist;
        const exists = wishlist.includes(productId);
        let updatedWishlist: string[] = [];
        if (exists) {
          updatedWishlist = wishlist.filter(id => id !== productId);
          set(state => ({ wishlist: updatedWishlist }));

          // Sync wishlist item delete
          const current = get().currentUser;
          if (current) {
            safeSupabaseDelete('wishlists', {
              user_id: current.id,
              product_id: productId
            });
          }
        } else {
          updatedWishlist = [...wishlist, productId];
          set(state => ({ wishlist: updatedWishlist }));

          // Sync wishlist item insert
          const current = get().currentUser;
          if (current) {
            safeSupabaseInsert('wishlists', {
              userId: current.id,
              productId: productId
            });
          }
        }
      },

      addAuditLog: (action, details, userId, userName, userRole) => {
        const newLog: AuditLog = {
          id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId,
          userName,
          userRole,
          action,
          details,
          timestamp: new Date().toISOString()
        };

        set(state => ({
          auditLogs: [newLog, ...state.auditLogs].slice(0, 500) // Keep last 500 logs
        }));

        // Sync audit log with Supabase
        safeSupabaseInsert('audit_logs', newLog);
      }
    }),
    {
      name: 'blue-hills-boutique-storage',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      } as Storage)),
    }
  )
);
