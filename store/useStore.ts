'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  Product, User, CartItem, Order, ConsultationBooking, 
  NewsletterSubscriber, AuditLog, Review, Payment, AppSettings, Coupon, Category, Testimonial, SavedAddress, ChatMessage,
  toDisplayRole, toDbRole
} from '../types';
import { getSupabaseClient } from '../lib/supabase';
import { isNetworkOrConnectionError } from '../lib/utils';

interface StoreState {
  products: Product[];
  users: User[];
  currentUser: User | null;
  currentUserId?: string | null;
  cart: CartItem[];
  appliedCoupon: Coupon | null;
  coupons: Coupon[];
  categories: Category[];
  testimonials: Testimonial[];
  selectedShippingMethod: 'standard' | 'express' | 'pickup';
  cartError: string | null;
  orders: Order[];
  payments: Payment[];
  settings: AppSettings;
  bookings: ConsultationBooking[];
  subscribers: NewsletterSubscriber[];
  auditLogs: AuditLog[];
  wishlist: string[]; // array of product ids
  savedAddresses: SavedAddress[];
  adminError: string | null;
  clearAdminError: () => void;

  // Saved Address actions
  fetchSavedAddresses: () => Promise<void>;
  addSavedAddress: (addressData: { label?: string; country: string; district: string; city: string; address: string; is_default?: boolean }) => Promise<{ success: boolean; error?: string }>;
  updateSavedAddress: (id: string, updatedFields: Partial<SavedAddress>) => Promise<{ success: boolean; error?: string }>;
  deleteSavedAddress: (id: string) => Promise<{ success: boolean; error?: string }>;
  setDefaultAddress: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Stylist Conversation actions
  loadStylistHistory: () => Promise<{ success: boolean; messages?: ChatMessage[]; error?: string }>;
  saveStylistMessage: (messages: ChatMessage[]) => Promise<{ success: boolean; error?: string }>;

  // Testimonial management actions (Admin)
  addTestimonial: (testimonialData: Partial<Testimonial>, adminName?: string, adminRole?: string) => Promise<{ success: boolean; error?: string }>;
  updateTestimonial: (id: string, updatedFields: Partial<Testimonial>, adminName?: string, adminRole?: string) => Promise<{ success: boolean; error?: string }>;
  deleteTestimonial: (id: string, adminName?: string, adminRole?: string) => Promise<{ success: boolean; error?: string }>;
  
  // Auth actions
  login: (email: string, password?: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, phone: string, password?: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (name: string, phone: string) => Promise<void> | void;
  updateAddress: (country: string, district: string, city: string, address: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordRecovery: (password: string) => Promise<{ success: boolean; error?: string }>;

  // Cart actions
  addToCart: (product: Product, size: string, color: string, qty: number) => void;
  updateCartQty: (cartItemId: string, qty: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  clearCartError: () => void;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  setShippingMethod: (method: 'standard' | 'express' | 'pickup') => void;

  // Coupon management actions (Admin)
  addCoupon: (couponData: Partial<Coupon>, adminName?: string, adminRole?: string) => Promise<{ success: boolean; error?: string }>;
  updateCoupon: (id: string, updatedFields: Partial<Coupon>, adminName?: string, adminRole?: string) => Promise<{ success: boolean; error?: string }>;
  deleteCoupon: (id: string, adminName?: string, adminRole?: string) => Promise<{ success: boolean; error?: string }>;

  // Category management actions (Admin)
  addCategory: (categoryData: Partial<Category>, adminName?: string, adminRole?: string) => Promise<{ success: boolean; error?: string }>;
  updateCategory: (id: string, updatedFields: Partial<Category>, adminName?: string, adminRole?: string) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string, adminName?: string, adminRole?: string) => Promise<{ success: boolean; message?: string; error?: string }>;

  // Checkout / Order actions
  placeOrder: (orderData: Omit<Order, 'id' | 'date'> & { id?: string; date?: string; paymentId?: string; paymentStatus?: Payment['status']; paymentTransactionId?: string; }, skipDbSync?: boolean) => Order;
  updateOrderStatus: (orderId: string, status: Order['status'], modifierName: string, modifierRole: string) => Promise<{ success: boolean; error?: string }>;
  updatePaymentStatus: (paymentId: string, status: Payment['status'], modifierName: string, modifierRole: string) => Promise<{ success: boolean; error?: string }>;
  updateSettings: (newSettings: Partial<AppSettings>, updaterName: string, updaterRole: string) => Promise<{ success: boolean; error?: string }>;

  // Product management actions (Admin)
  addProduct: (productData: Omit<Product, 'id' | 'reviews' | 'rating'>, creatorName: string, creatorRole: string) => Promise<{ success: boolean; error?: string }>;
  updateProduct: (id: string, updatedFields: Partial<Product>, updaterName: string, updaterRole: string) => Promise<{ success: boolean; error?: string }>;
  deleteProduct: (id: string, deleterName: string, deleterRole: string) => Promise<{ success: boolean; error?: string }>; // Soft delete or remove
  addReview: (productId: string, rating: number, comment: string, userName: string, userRole?: string) => void;
  deleteReview: (productId: string, reviewId: string, modifierName: string, modifierRole: string) => Promise<{ success: boolean; error?: string }>;
  updateProductStockQuick: (productId: string, newStock: number, modifierName: string, modifierRole: string) => Promise<{ success: boolean; error?: string }>;

  // User management actions (Admin)
  adminAddUser: (userData: Omit<User, 'id'>, adminName: string, adminRole: string) => Promise<{ success: boolean; error?: string }>;
  adminUpdateUser: (id: string, updatedFields: Partial<User>, adminName: string, adminRole: string) => Promise<{ success: boolean; error?: string }>;
  adminDeleteUser: (id: string, adminName: string, adminRole: string) => Promise<{ success: boolean; error?: string }>;

  // Consultation Actions
  bookConsultation: (bookingData: Omit<ConsultationBooking, 'id' | 'status'>) => void;
  updateBookingStatus: (bookingId: string, status: ConsultationBooking['status'], modifierName: string, modifierRole: string) => Promise<{ success: boolean; error?: string }>;

  // Newsletter Actions
  subscribeNewsletter: (email: string) => { success: boolean; message: string };

  // Wishlist Actions
  toggleWishlist: (productId: string) => void;

  // Log Actions
  addAuditLog: (action: string, details: string, userId: string, userName: string, userRole: string) => void;

  // Supabase Sync & Realtime Patch Actions
  syncFromSupabase: () => Promise<void>;
  fetchLatestState: () => Promise<void>;
  seedIfEmpty: () => Promise<void>;
  applyProductChange: (payload: any) => void;
  applyReviewChange: (payload: any) => void;
  applyOrderChange: (payload: any) => void;
  applyProfileChange: (payload: any) => void;
  isSyncing: boolean;
}

export const INITIAL_CATEGORIES: Category[] = [
  { name: 'Suits', slug: 'suits', description: 'Bespoke & Ready-to-wear tailored suits' },
  { name: 'Shirts', slug: 'shirts', description: 'Egyptian cotton custom tailored shirts' },
  { name: 'Shoes', slug: 'shoes', description: 'Italian handcrafted leather footwear' },
  { name: 'Accessories', slug: 'accessories', description: 'Silk ties, cufflinks, and leather belts' }
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-monaco-navy',
    name: 'Monaco Navy Ready-to-Wear Suit',
    description: 'An elegant, high-quality ready-made suit made of fine wool blend imported from Turkey. It features classic lapels, standard pockets, and a clean professional fit. Ideal for daily office wear and business meetings.',
    category: 'Suits',
    price: 1250,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuC6IMogg257U3uh1MtNS7HPgjGVwT2a6GeLfzTMCVYFuVskYnj6fDlCuYrlv0FdF1-KuhJO8Cw3C64A3_YnDyPvjWjzReX0_GkIXvhjxTYwDxTjonhszpsfhfENG3m8weu8uEZgfMISqEkEEKLF_JY4_-LrOBxk5gazOV-8oMMyEBLNXNlKdsbazYKsmNH-82Bugaouk2vagQ0xnRQILrQ2OOs2sztjrnLQpJCXRwPBrkdDitTrLUDXyw'],
    sizes: ['48R', '50R', '52R', '54R', '56R'],
    colors: ['Midnight Navy', 'Charcoal'],
    stock: 14,
    rating: 4.9,
    isFeatured: true,
    reviews: [
      { id: 'rev-1', userName: 'Amama Mbabazi', userRole: 'Senior Diplomat', rating: 5, comment: 'Impeccable quality. The shoulders sit flawlessly, and the fabric breathes exceptionally well in our climate. The personal styling service at Lubowa was outstanding.', date: '2026-05-12' },
      { id: 'rev-2', userName: 'Patrick Kaboyo', userRole: 'Corporate VP', rating: 5, comment: 'I wore this to our annual shareholder meeting and received endless compliments. Real boardroom power.', date: '2026-06-01' }
    ]
  },
  {
    id: 'prod-savile-pinstripe',
    name: 'Savile Midnight Pinstripe Suit',
    description: 'A smart business suit with clean pinstripe patterns, imported from Turkey. Made from fine wool fabric, it features a double-breasted button design and comfortable ready-to-wear sleeves. Perfect for corporate managers and business leaders.',
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
    description: 'A pack of two high-quality business shirts imported from the UK, made of premium cotton fabric. One comes in plain white and the other in a light blue herringbone pattern. Both feature structured collars and standard French cuffs.',
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
    name: 'Presidential Poplin White Shirt',
    description: 'A premium business-casual cotton shirt imported from Egypt. It is made of thick, wrinkle-free cotton that stays fresh all day. Designed with a classic Kent collar and simple button cuffs.',
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
    description: 'Sleek corporate shoes made of premium leather imported from Turkey. They feature a comfortable cushioned lining and strong, durable leather soles. Ideal for combining with any of our business suits.',
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
    description: 'An elegant statement of style and comfort. Imported from Turkey and crafted with robust full-grain black calfskin, styled with clean, polished gunmetal silver side buckles. Lined with natural leather for breathability, with a durable, slip-resistant sole. Sharp, elegant, and versatile enough for corporate suits or premium professional attire.',
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
    description: 'A touch of luxury for your corporate outfits. Imported from China, this set includes a premium jacquard silk tie and a matching pocket square. Designed to give a neat, professional knot that looks crisp all day.',
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
    description: 'A premium ready-made double-breasted overcoat imported from the UK. Made from soft and warm camel hair, it features wide lapels, deep pockets, and a smooth inner lining. Perfect for cool evenings or international travels.',
    category: 'Suits',
    price: 1850,
    discountPercentage: 20, // Discounted to $1480
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAcO6MS2VWCWZQBnf0cCMZL-YE38o5bhKL5ARNtF7FUxluxGX49GTihEM53aMOry1-nrD7_al2QIuZdb5_xF6hQRMstrxCnP-qzBssHxrRwdhL5HifQg8IxmSoV7U8D7J4nt-im0L7SallxeSH7C4SLlSgqRzuCXUTQFP_l-fUJaV_toItNqWxlBNDXSStF7IlJbvPQcgV073TakLGegDBEMXdblzvIN15XyfiXmti8g4JrQWTDojzvCw'],
    sizes: ['48R', '50R', '52R', '54R'],
    colors: ['Classic Camel'],
    stock: 5,
    rating: 5.0,
    isDealOfTheDay: true,
    dealDays: 0,
    dealHours: 14,
    dealMins: 40,
    dealSecs: 17,
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
    description: 'A masterpiece of soft, deconstructed ready-to-wear styling. Imported from Turkey, crafted from a mid-weight wool-cashmere fabric, offering a comfortable, natural shoulder line. Styled with custom mother-of-pearl buttons, an elegant double-vented back, and dynamic patch pockets.',
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
    id: 'usr-super-admin',
    name: 'Super Admin',
    email: 'admin@bluehillsdesigners.com',
    phone: '+256 700 000000',
    role: 'Super Admin',
    spending: 0,
    rewardsPoints: 0,
    source: 'local-demo'
  },
  {
    id: 'usr-1',
    name: 'Amama Mbabazi',
    email: 'amama@diplomats.gov',
    phone: '+256 772 123456',
    role: 'Customer',
    spending: 2700,
    rewardsPoints: 270,
    source: 'local-demo'
  },
  {
    id: 'usr-admin',
    name: 'Robert Mugabe Mukasa',
    email: 'admin@bluehills.com',
    phone: '+256 701 987654',
    role: 'Super Admin',
    spending: 0,
    rewardsPoints: 0,
    source: 'local-demo'
  },
  {
    id: 'usr-manager',
    name: 'Nalule Patricia',
    email: 'patricia@bluehills.com',
    phone: '+256 703 456789',
    role: 'Manager',
    spending: 0,
    rewardsPoints: 0,
    source: 'local-demo'
  },
  {
    id: 'usr-staff',
    name: 'Ochola Moses',
    email: 'moses@bluehills.com',
    phone: '+256 752 321654',
    role: 'Staff',
    spending: 0,
    rewardsPoints: 0,
    source: 'local-demo'
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: toValidUUID('ORD-9841'),
    orderNumber: 'ORD-9841',
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
    id: toValidUUID('ORD-9902'),
    orderNumber: 'ORD-9902',
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

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'PAY-9841',
    orderId: toValidUUID('ORD-9841'),
    customerName: 'Amama Mbabazi',
    customerEmail: 'amama@diplomats.gov',
    amount: 1400,
    paymentMethod: 'Visa',
    status: 'Paid',
    transactionId: 'TXN-VISA-9841A',
    date: '2026-05-12'
  },
  {
    id: 'PAY-9902',
    orderId: toValidUUID('ORD-9902'),
    customerName: 'Patrick Kaboyo',
    customerEmail: 'kaboyo@corporate.co.ug',
    amount: 1250,
    paymentMethod: 'Mobile Money',
    status: 'Paid',
    transactionId: 'TXN-MM-9902B',
    date: '2026-06-20'
  }
];

const INITIAL_SETTINGS: AppSettings = {
  showroomHours: 'Sunday to Friday: 9:00 AM to 7:00 PM (Saturdays Closed)',
  supportPhone: '+256 772 123456',
  freeShippingThreshold: 2000,
  taxRate: 18,
  aiGreetingPrefix: 'Good day, Executive.',
  enableNewsBanner: true,
  maintenanceMode: false,
  currencySymbol: 'Ugx',
  enableSecretOffer: true,
  paymentMethods: {
    mobileMoney: true,
    visa: true,
    cashOnDelivery: true
  }
};

export const INITIAL_TESTIMONIALS: Testimonial[] = [
  {
    id: toValidUUID('testi-ssewankambo'),
    quote: "Blue Hills Designers has completely reshaped corporate fashion in East Africa. The fit of their Savile suit is unmatched. Perfect boardroom armory.",
    name: "Dr. David Ssewankambo",
    role: "Managing Director",
    company: "Standard Capital Uganda",
    displayOrder: 1,
    isActive: true
  },
  {
    id: toValidUUID('testi-mukasa'),
    quote: "The Egyptian Poplin White shirt stays exceptionally crisp during long diplomatic flights and state banquets. Their concierge delivery is top tier.",
    name: "Hon. Andrew Mukasa",
    role: "Senior Diplomat",
    company: "Ministry of Foreign Affairs",
    displayOrder: 2,
    isActive: true
  },
  {
    id: toValidUUID('testi-mugisha'),
    quote: "I visited their Lubowa showroom for a ready-made corporate suit. The level of personal attention, refreshment service, and premium clothing quality was truly top tier.",
    name: "Charles Mugisha",
    role: "Investment VP",
    company: "Ascent Capital Africa",
    displayOrder: 3,
    isActive: true
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

function capitalizeRole(role: string): User['role'] {
  return toDisplayRole(role) as User['role'];
}

function isUUID(str: string): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function toValidUUID(str: string): string {
  if (!str) return '00000000-0000-0000-0000-000000000000';
  if (isUUID(str)) {
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

export const mapUiPaymentStatusToDb = (status: string): string => {
  const s = status?.toLowerCase() || '';
  if (s === 'paid' || s === 'success' || s === 'completed') return 'success';
  if (s === 'pending') return 'pending';
  if (s === 'refunded') return 'refunded';
  if (s === 'failed') return 'failed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  return 'pending';
};

export const mapDbPaymentStatusToUi = (status: string): 'Paid' | 'Pending' | 'Refunded' | 'Failed' | 'Cancelled' => {
  const s = status?.toLowerCase() || '';
  if (s === 'success' || s === 'paid' || s === 'completed') return 'Paid';
  if (s === 'pending') return 'Pending';
  if (s === 'refunded') return 'Refunded';
  if (s === 'failed') return 'Failed';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  return 'Pending';
};

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

  const state = useStore.getState ? useStore.getState() : { users: [], products: [], orders: [], payments: [] };
  const localUsers = state.users || [];

  switch (tableName) {
    case 'products': {
      const existingProd = state.products?.find((p: any) => p.id === payload.id || toValidUUID(p.id) === toValidUUID(payload.id));
      const fullProd = existingProd ? { ...existingProd, ...payload } : payload;

      const catName = fullProd.category || 'Suits';
      const loadedCategories = (state as any).categories || [];
      const matchedCat = loadedCategories.find(
        (c: any) => c.name?.toLowerCase() === catName.toLowerCase() || c.slug?.toLowerCase() === catName.toLowerCase()
      );
      const catId = matchedCat?.id && isUUID(matchedCat.id) ? matchedCat.id : undefined;
      const prodName = fullProd.name || 'Luxury Product';
      const slug = fullProd.slug || (prodName ? prodName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'product');

      return {
        id: toValidUUID(fullProd.id),
        ...(catId ? { category_id: catId } : {}),
        name: prodName,
        slug,
        description: fullProd.description || '',
        short_description: fullProd.shortDescription || fullProd.description?.slice(0, 150) || '',
        sizes: fullProd.sizes || [],
        colors: fullProd.colors || [],
        price: fullProd.price !== undefined && fullProd.price !== null ? Number(fullProd.price) : 0,
        discount_percentage: Number(fullProd.discountPercentage) || 0,
        is_featured: !!fullProd.isFeatured,
        is_new: !!fullProd.isNew,
        is_deal: !!fullProd.isDealOfTheDay,
        deal_days: fullProd.dealDays !== undefined && fullProd.dealDays !== null ? Number(fullProd.dealDays) : null,
        deal_hours: fullProd.dealHours !== undefined && fullProd.dealHours !== null ? Number(fullProd.dealHours) : null,
        deal_mins: fullProd.dealMins !== undefined && fullProd.dealMins !== null ? Number(fullProd.dealMins) : null,
        deal_secs: fullProd.dealSecs !== undefined && fullProd.dealSecs !== null ? Number(fullProd.dealSecs) : null,
        deal_expires_at: fullProd.dealExpiresAt ? new Date(fullProd.dealExpiresAt).toISOString() : null,
        rating: Number(fullProd.rating) || 0,
        stock: Number(fullProd.stock) || 0,
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
        role: toDbRole(payload.role),
        reward_points: Number(payload.rewardsPoints) || Number(payload.rewardPoints) || Number(payload.reward_points) || 0,
        lifetime_spending: Number(payload.spending) || Number(payload.lifetimeSpending) || Number(payload.lifetime_spending) || 0,
        is_active: true
      };
    }

    case 'orders': {
      const existingOrder = state.orders?.find((o: any) => o.id === payload.id || toValidUUID(o.id) === toValidUUID(payload.id));
      const fullOrder = existingOrder ? { ...existingOrder, ...payload } : payload;
      const orderId = toValidUUID(fullOrder.id);
      let userId = fullOrder.userId || fullOrder.user_id;
      if (!userId && fullOrder.customerEmail) {
        const matchedUser = localUsers.find((u: any) => u.email?.toLowerCase() === fullOrder.customerEmail.toLowerCase());
        userId = matchedUser ? matchedUser.id : toValidUUID('usr-' + fullOrder.customerEmail.toLowerCase());
      }
      return {
        id: orderId,
        user_id: userId ? toValidUUID(userId) : null,
        order_number: fullOrder.id,
        amount: Number(fullOrder.amount) || 0,
        status: (() => {
          const s = fullOrder.status?.toLowerCase() || 'pending';
          if (s === 'delivered' || s === 'completed') return 'completed';
          if (s === 'processing') return 'processing';
          if (s === 'cancelled' || s === 'canceled') return 'cancelled';
          return 'pending';
        })(),
        payment_method: fullOrder.paymentMethod || fullOrder.payment_method || 'Cash on Delivery',
        notes: fullOrder.notes || null,
        created_at: getTimestamp(fullOrder.date || fullOrder.createdAt || fullOrder.created_at)
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
      const existingPay = state.payments?.find((p: any) => p.id === payload.id || toValidUUID(p.id) === toValidUUID(payload.id));
      const fullPay = existingPay ? { ...existingPay, ...payload } : payload;
      const rawStatus = fullPay.status;
      return {
        id: toValidUUID(fullPay.id || `pay-${fullPay.orderId || fullPay.order_id}`),
        order_id: toValidUUID(fullPay.orderId || fullPay.order_id),
        provider: fullPay.paymentMethod || fullPay.provider || 'Cash on Delivery',
        transaction_id: fullPay.transactionId || fullPay.transaction_id || '',
        amount: Number(fullPay.amount) || 0,
        status: mapUiPaymentStatusToDb(rawStatus),
        created_at: getTimestamp(fullPay.date || fullPay.createdAt || fullPay.created_at)
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

    case 'coupons': {
      return {
        id: payload.id ? toValidUUID(payload.id) : undefined,
        code: payload.code ? payload.code.trim().toUpperCase() : '',
        discount_type: payload.discountType || payload.discount_type || 'percentage',
        discount_value: Number(payload.discountValue ?? payload.discount_value) || 0,
        min_subtotal: payload.minSubtotal !== undefined && payload.minSubtotal !== null ? Number(payload.minSubtotal) : null,
        is_active: payload.isActive !== undefined ? !!payload.isActive : (payload.is_active !== undefined ? !!payload.is_active : true),
        expires_at: payload.expiresAt || payload.expires_at || null,
        usage_limit: payload.usageLimit !== undefined && payload.usageLimit !== null ? Number(payload.usageLimit) : null,
        times_used: Number(payload.timesUsed ?? payload.times_used) || 0,
        created_by: payload.createdBy || payload.created_by ? toValidUUID(payload.createdBy || payload.created_by) : null,
        updated_at: new Date().toISOString()
      };
    }

    case 'categories': {
      const name = payload.name ? String(payload.name).trim() : '';
      const slug = payload.slug ? String(payload.slug).trim().toLowerCase() : name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return {
        ...(payload.id && isUUID(payload.id) ? { id: payload.id } : {}),
        name,
        slug,
        description: payload.description || ''
      };
    }

    case 'testimonials': {
      return {
        ...(payload.id && isUUID(payload.id) ? { id: payload.id } : {}),
        quote: payload.quote ? String(payload.quote).trim() : '',
        name: payload.name ? String(payload.name).trim() : '',
        role: payload.role ? String(payload.role).trim() : null,
        company: payload.company ? String(payload.company).trim() : null,
        display_order: typeof payload.displayOrder === 'number' ? payload.displayOrder : (typeof payload.display_order === 'number' ? payload.display_order : 1),
        is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : (payload.is_active !== undefined ? Boolean(payload.is_active) : true),
        updated_at: new Date().toISOString()
      };
    }

    case 'app_settings': {
      return {
        id: 1,
        showroom_hours: payload.showroomHours || payload.showroom_hours || '',
        support_phone: payload.supportPhone || payload.support_phone || '',
        concierge_phone: payload.conciergePhone || payload.concierge_phone || payload.supportPhone || '',
        free_shipping_threshold: payload.freeShippingThreshold !== undefined && payload.freeShippingThreshold !== null ? Number(payload.freeShippingThreshold) : 0,
        tax_rate: payload.taxRate !== undefined && payload.taxRate !== null ? Number(payload.taxRate) : 0,
        ai_greeting_prefix: payload.aiGreetingPrefix || payload.ai_greeting_prefix || '',
        enable_news_banner: payload.enableNewsBanner !== undefined ? !!payload.enableNewsBanner : (payload.enable_news_banner !== undefined ? !!payload.enable_news_banner : true),
        maintenance_mode: payload.maintenanceMode !== undefined ? !!payload.maintenanceMode : (payload.maintenance_mode !== undefined ? !!payload.maintenance_mode : false),
        currency_symbol: payload.currencySymbol || payload.currency_symbol || 'Ugx',
        enable_secret_offer: payload.enableSecretOffer !== undefined ? !!payload.enableSecretOffer : (payload.enable_secret_offer !== undefined ? !!payload.enable_secret_offer : true),
        payment_method_mobile_money: payload.paymentMethods?.mobileMoney !== undefined ? !!payload.paymentMethods.mobileMoney : (payload.payment_method_mobile_money !== undefined ? !!payload.payment_method_mobile_money : true),
        payment_method_visa: payload.paymentMethods?.visa !== undefined ? !!payload.paymentMethods.visa : (payload.payment_method_visa !== undefined ? !!payload.payment_method_visa : true),
        payment_method_cash_on_delivery: payload.paymentMethods?.cashOnDelivery !== undefined ? !!payload.paymentMethods.cashOnDelivery : (payload.payment_method_cash_on_delivery !== undefined ? !!payload.payment_method_cash_on_delivery : true),
        updated_at: new Date().toISOString()
      };
    }

    default:
      return payload;
  }
}

function isPrivateStoragePath(url: string): boolean {
  if (!url) return false;
  return !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:');
}

async function uploadProductImage(userId: string, productId: string, imageBase64: string, index: number): Promise<string> {
  let ext = 'png';
  if (imageBase64.startsWith('data:')) {
    const match = imageBase64.match(/data:image\/([a-zA-Z0-9+]+);/);
    if (match && match[1]) {
      ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    }
  }

  try {
    const headers = await getAuthHeaders();
    if (!headers.Authorization && !headers['Authorization']) {
      console.warn('Cannot upload image to storage: User is not authenticated.');
      return imageBase64;
    }
    const response = await fetchWithRetry('/api/storage', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'upload',
        userId,
        featureName: 'products',
        itemId: toValidUUID(productId),
        fileBase64: imageBase64,
        extension: ext
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.path) {
        return data.path;
      }
    } else {
      console.error('Failed to upload image to Supabase Storage:', await response.text());
    }
  } catch (err) {
    console.error('Error uploading product image:', err);
  }
  return imageBase64;
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return !!(url && anonKey);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3, initialDelayMs = 500): Promise<Response> {
  // Inject Authorization Bearer token if active session is available
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${session.access_token}`
        };
      }
    }
  } catch (authErr) {
    console.warn('Could not inject Authorization header to api fetch:', authErr);
  }

  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, options);
      
      // Retry on internal server errors (5xx)
      if (!response.ok && response.status >= 500 && attempt < maxRetries) {
        attempt++;
        const delayTime = initialDelayMs * Math.pow(2, attempt) + Math.random() * 100;
        console.warn(`Server error ${response.status} fetching ${url}. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delayTime)}ms...`);
        await delay(delayTime);
        continue;
      }
      
      return response;
    } catch (err: any) {
      const errMsg = err?.message || (typeof err === 'string' ? err : String(err || ''));
      const isConnError = isNetworkOrConnectionError(err);

      if (isConnError && attempt < maxRetries) {
        attempt++;
        const delayTime = initialDelayMs * Math.pow(2, attempt) + Math.random() * 100;
        console.warn(`Connection/Network error during fetch to ${url}: ${errMsg}. Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delayTime)}ms...`);
        await delay(delayTime);
        continue;
      }
      
      throw err;
    }
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }
  } catch (err) {
    console.warn('Failed to retrieve active auth session for headers:', err);
  }
  return headers;
}

async function safeSupabaseInsert(tableName: string, payload: any): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    console.warn(`Supabase offline fallback: insert on ${tableName} skipped (unconfigured).`);
    return { success: true };
  }

  try {
    const mappedPayload = mapToSupabasePayload(tableName, payload);
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry('/api/db', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'insert', tableName, payload: mappedPayload })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errorMsg = errData.error || response.statusText || `Database insert failed on ${tableName}`;
      console.warn(`Supabase insert failed on ${tableName}:`, errorMsg);
      return { success: false, error: errorMsg };
    }
    return { success: true };
  } catch (err: any) {
    const errMsg = err?.message || (typeof err === 'string' ? err : String(err || ''));
    if (isNetworkOrConnectionError(err)) {
      console.warn(`Supabase offline fallback: insert on ${tableName} skipped (unreachable after retries: ${errMsg}).`);
      return { success: true };
    } else {
      console.error(`Error in safeSupabaseInsert for ${tableName}:`, err);
      return { success: false, error: errMsg };
    }
  }
}

async function safeSupabaseUpsert(tableName: string, payload: any, options?: any): Promise<{ success: boolean; error?: string }> {
  if (tableName === 'profiles' && payload?.id && !isUUID(payload.id)) {
    return {
      success: false,
      error: 'This record only exists locally and has no corresponding database entry to delete/update. Refresh the page — if it persists, this is a demo/seed record that should be removed from the codebase, not deleted via the admin panel.'
    };
  }
  if (!isSupabaseConfigured()) {
    console.warn(`Supabase offline fallback: upsert on ${tableName} skipped (unconfigured).`);
    return { success: true };
  }

  try {
    const mappedPayload = mapToSupabasePayload(tableName, payload);
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry('/api/db', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'upsert', tableName, payload: mappedPayload, options })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errorMsg = errData.error || response.statusText || `Database update failed on ${tableName}`;
      console.warn(`Supabase upsert failed on ${tableName}:`, errorMsg);
      return { success: false, error: errorMsg };
    }
    return { success: true };
  } catch (err: any) {
    const errMsg = err?.message || (typeof err === 'string' ? err : String(err || ''));
    if (isNetworkOrConnectionError(err)) {
      console.warn(`Supabase offline fallback: upsert on ${tableName} skipped (unreachable after retries: ${errMsg}).`);
      return { success: true };
    } else {
      console.error(`Error in safeSupabaseUpsert for ${tableName}:`, err);
      return { success: false, error: errMsg };
    }
  }
}

async function safeSupabaseDelete(tableName: string, filters: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  if (tableName === 'profiles' && filters?.id && !isUUID(filters.id)) {
    return {
      success: false,
      error: 'This record only exists locally and has no corresponding database entry to delete/update. Refresh the page — if it persists, this is a demo/seed record that should be removed from the codebase, not deleted via the admin panel.'
    };
  }
  if (!isSupabaseConfigured()) {
    console.warn(`Supabase offline fallback: delete on ${tableName} skipped (unconfigured).`);
    return { success: true };
  }

  try {
    const headers = await getAuthHeaders();
    const response = await fetchWithRetry('/api/db', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'delete', tableName, payload: { filters } })
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errorMsg = errData.error || response.statusText || `Database delete failed on ${tableName}`;
      console.warn(`Supabase delete failed on ${tableName}:`, errorMsg);
      return { success: false, error: errorMsg };
    }
    return { success: true };
  } catch (err: any) {
    const errMsg = err?.message || (typeof err === 'string' ? err : String(err || ''));
    if (isNetworkOrConnectionError(err)) {
      console.warn(`Supabase offline fallback: delete on ${tableName} skipped (unreachable after retries: ${errMsg}).`);
      return { success: true };
    } else {
      console.error(`Error in safeSupabaseDelete for ${tableName}:`, err);
      return { success: false, error: errMsg };
    }
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



let isSyncingInProgress = false;

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      products: [],
      users: [],
      currentUser: null,
      cart: [],
      appliedCoupon: null,
      coupons: [],
      categories: [],
      testimonials: [],
      selectedShippingMethod: 'standard',
      cartError: null,
      adminError: null,
      clearAdminError: () => set({ adminError: null }),
      orders: [],
      payments: [],
      settings: INITIAL_SETTINGS,
      bookings: [],
      subscribers: [],
      auditLogs: [],
      wishlist: [],
      savedAddresses: [],
      isSyncing: true,

      seedIfEmpty: async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        try {
          const { data: { session } } = await supabase.auth.getSession();
          const activeUserId = session?.user?.id;
          let loggedInUserRole = 'Guest';
          if (activeUserId) {
            const { data: myProfile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', activeUserId)
              .maybeSingle();
            if (myProfile) {
              loggedInUserRole = myProfile.role?.toLowerCase() || 'customer';
            }
          }
          const isAdminOrStaff = ['super admin', 'admin', 'manager', 'staff'].includes(loggedInUserRole);
          if (!isAdminOrStaff) return;

          // Check categories
          const { data: dbCats } = await supabase.from('categories').select('id, slug').limit(5);
          if (!dbCats || dbCats.length === 0) {
            await seedCategories();
          }

          // Check profiles
          const { data: dbProfiles } = await supabase.from('profiles').select('id').limit(1);
          if (!dbProfiles || dbProfiles.length === 0) {
            for (const user of INITIAL_USERS) {
              if (isUUID(user.id)) {
                await safeSupabaseUpsert('profiles', user);
              }
            }
          }

          // Check products
          const { data: dbProducts } = await supabase.from('products').select('id').limit(1);
          if (!dbProducts || dbProducts.length === 0) {
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
              for (const rev of prod.reviews || []) {
                const matchedUser = INITIAL_USERS.find(u => u.name.toLowerCase() === rev.userName.toLowerCase());
                const reviewerUserId = matchedUser && isUUID(matchedUser.id) ? matchedUser.id : null;
                if (reviewerUserId) {
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
            }
          }

          // Check orders
          const { data: dbOrders } = await supabase.from('orders').select('id').limit(1);
          if (!dbOrders || dbOrders.length === 0) {
            for (const order of INITIAL_ORDERS) {
              await safeSupabaseUpsert('orders', order);
              for (const item of order.items) {
                await safeSupabaseUpsert('order_items', { ...item, orderId: order.id });
              }
              await safeSupabaseUpsert('order_addresses', { ...order.shippingAddress, orderId: order.id });
            }
          }

          // Check testimonials
          const { data: dbTesti } = await supabase.from('testimonials').select('id').limit(1);
          if (!dbTesti || dbTesti.length === 0) {
            for (const t of INITIAL_TESTIMONIALS) {
              await safeSupabaseUpsert('testimonials', t);
            }
          }
        } catch (e) {
          console.warn('[seedIfEmpty] Seeding error:', e);
        }
      },

      fetchLatestState: async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        // 1. Categories & Settings
        const { data: dbCats } = await supabase.from('categories').select('*');
        if (dbCats) {
          const realCats = dbCats.filter((c: any) => c.slug !== 'app-settings');
          const mappedCategories: Category[] = realCats.map((c: any) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description || '',
            createdAt: c.created_at,
            updatedAt: c.updated_at
          }));
          set({ categories: mappedCategories });
        }

        const { data: dbSettings } = await supabase.from('app_settings').select('*').limit(1).maybeSingle();
        if (dbSettings) {
          set({
            settings: {
              showroomHours: dbSettings.showroom_hours || INITIAL_SETTINGS.showroomHours,
              supportPhone: dbSettings.support_phone || dbSettings.concierge_phone || INITIAL_SETTINGS.supportPhone,
              conciergePhone: dbSettings.concierge_phone || dbSettings.support_phone || INITIAL_SETTINGS.supportPhone,
              freeShippingThreshold: dbSettings.free_shipping_threshold !== null && dbSettings.free_shipping_threshold !== undefined ? Number(dbSettings.free_shipping_threshold) : INITIAL_SETTINGS.freeShippingThreshold,
              taxRate: dbSettings.tax_rate !== null && dbSettings.tax_rate !== undefined ? Number(dbSettings.tax_rate) : INITIAL_SETTINGS.taxRate,
              aiGreetingPrefix: dbSettings.ai_greeting_prefix || INITIAL_SETTINGS.aiGreetingPrefix,
              enableNewsBanner: dbSettings.enable_news_banner !== undefined && dbSettings.enable_news_banner !== null ? dbSettings.enable_news_banner : true,
              maintenanceMode: dbSettings.maintenance_mode !== undefined && dbSettings.maintenance_mode !== null ? dbSettings.maintenance_mode : false,
              currencySymbol: dbSettings.currency_symbol || INITIAL_SETTINGS.currencySymbol,
              enableSecretOffer: dbSettings.enable_secret_offer !== undefined && dbSettings.enable_secret_offer !== null ? dbSettings.enable_secret_offer : true,
              paymentMethods: {
                mobileMoney: dbSettings.payment_method_mobile_money !== undefined && dbSettings.payment_method_mobile_money !== null ? dbSettings.payment_method_mobile_money : true,
                visa: dbSettings.payment_method_visa !== undefined && dbSettings.payment_method_visa !== null ? dbSettings.payment_method_visa : true,
                cashOnDelivery: dbSettings.payment_method_cash_on_delivery !== undefined && dbSettings.payment_method_cash_on_delivery !== null ? dbSettings.payment_method_cash_on_delivery : true
              }
            }
          });
        }

        // 2. Profiles / Users
        const { data: dbProfiles, error: profilesError } = await supabase.from('profiles').select('*');
        if (dbProfiles !== null && !profilesError) {
          const mappedUsers = dbProfiles
            .filter((p: any) => p && p.id && isUUID(p.id))
            .map((p: any) => ({
              id: p.id,
              name: p.full_name || p.name || 'Gentleman Customer',
              email: p.email || '',
              phone: p.phone || '',
              role: capitalizeRole(p.role),
              spending: p.lifetime_spending || p.spending || 0,
              rewardsPoints: p.reward_points || p.rewardsPoints || 0,
              source: 'db'
            }));
          set({ users: mappedUsers as User[] });
        } else {
          set({ users: [] });
        }

        // 3. Products & Reviews & Product Images
        const { data: dbProducts } = await supabase.from('products').select('*');
        const { data: dbReviews } = await supabase.from('reviews').select('*');
        const { data: dbProfilesList } = await supabase.from('public_profile_names').select('id, full_name, role');
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
            rating: Number(r.rating) || 5,
            comment: r.comment || '',
            date: r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
          };
        }) : [];

        const mappedProducts = (dbProducts || []).map((p: any) => {
          const catName = dbCats ? (dbCats.find((c: any) => c.id === p.category_id)?.name || 'Suits') : 'Suits';
          const prodReviews = reviewsWithProfiles.filter(r => r.productId === p.id || toValidUUID(r.productId) === p.id);

          const productImages = dbImages
            ? dbImages
                .filter((img: any) => img.product_id === p.id)
                .sort((a: any, b: any) => (a.display_order || 1) - (b.display_order || 1))
                .map((img: any) => img.image_url)
            : [];
          const rawImages = (Array.isArray(p.images) && p.images.length > 0) ? p.images : [];
          const finalImages = productImages.length > 0
            ? productImages
            : (rawImages.length > 0 ? rawImages : [p.slug ? `https://picsum.photos/seed/${p.slug}/600/600` : 'https://picsum.photos/seed/suit/600/600']);

          let parsedSizes = (Array.isArray(p.sizes) && p.sizes.length > 0)
            ? p.sizes
            : ['M', 'L', 'XL'];
          let parsedColors = (Array.isArray(p.colors) && p.colors.length > 0)
            ? p.colors
            : ['Classic Black'];
          let dealDays = p.deal_days !== undefined && p.deal_days !== null ? Number(p.deal_days) : 0;
          let dealHours = p.deal_hours !== undefined && p.deal_hours !== null ? Number(p.deal_hours) : 14;
          let dealMins = p.deal_mins !== undefined && p.deal_mins !== null ? Number(p.deal_mins) : 40;
          let dealSecs = p.deal_secs !== undefined && p.deal_secs !== null ? Number(p.deal_secs) : 17;

          if (p.short_description) {
            try {
              const parsed = JSON.parse(p.short_description);
              if (parsed && typeof parsed === 'object') {
                if ((p.deal_days === undefined || p.deal_days === null) && parsed.dealDays !== undefined && parsed.dealDays !== null) dealDays = Number(parsed.dealDays);
                if ((p.deal_hours === undefined || p.deal_hours === null) && parsed.dealHours !== undefined && parsed.dealHours !== null) dealHours = Number(parsed.dealHours);
                if ((p.deal_mins === undefined || p.deal_mins === null) && parsed.dealMins !== undefined && parsed.dealMins !== null) dealMins = Number(parsed.dealMins);
                if ((p.deal_secs === undefined || p.deal_secs === null) && parsed.dealSecs !== undefined && parsed.dealSecs !== null) dealSecs = Number(parsed.dealSecs);
              }
            } catch {}
          }

          return {
            id: p.id,
            name: p.name || 'Luxury Product',
            description: p.description || '',
            category: catName,
            price: Number(p.price) || 0,
            images: finalImages,
            sizes: parsedSizes,
            colors: parsedColors,
            stock: Number(p.stock) || 0,
            rating: Number(p.rating) || 0,
            isNew: !!p.is_new,
            isFeatured: !!p.is_featured,
            isDealOfTheDay: !!p.is_deal,
            discountPercentage: Number(p.discount_percentage) || 0,
            dealDays,
            dealHours,
            dealMins,
            dealSecs,
            dealExpiresAt: p.deal_expires_at !== undefined ? p.deal_expires_at : null,
            reviews: prodReviews
          };
        });

        const combinedProducts = mappedProducts;

        // Signed URLs resolution
        const privatePaths: string[] = [];
        combinedProducts.forEach((p: any) => {
          if (p.images) {
            p.images.forEach((img: string) => {
              if (isPrivateStoragePath(img)) {
                privatePaths.push(img);
              }
            });
          }
        });

        let signedUrlsMap: Record<string, string> = {};
        if (privatePaths.length > 0) {
          try {
            const headers = await getAuthHeaders();
            if (headers.Authorization || headers['Authorization']) {
              const response = await fetchWithRetry('/api/storage', {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'getSignedUrls', paths: privatePaths })
              });
              if (response.ok) {
                const data = await response.json();
                if (data.signedUrls) {
                  data.signedUrls.forEach((item: any) => {
                    if (item.signedUrl) {
                      signedUrlsMap[item.path] = item.signedUrl;
                    }
                  });
                }
              }
            }
          } catch (e) {
            console.warn('Failed to resolve signed URLs:', e);
          }
        }

        const resolvedProducts = combinedProducts.map((p: any) => {
          const resolvedImages = p.images.map((img: string) => {
            if (isPrivateStoragePath(img)) {
              return signedUrlsMap[img] || img;
            }
            return img;
          });
          return { ...p, images: resolvedImages };
        });

        set({ products: resolvedProducts as Product[] });

        // 4. Orders
        const { data: dbOrders } = await supabase.from('orders').select('*');
        const { data: dbItems } = await supabase.from('order_items').select('*');
        const { data: dbAddresses } = await supabase.from('order_addresses').select('*');

        const formattedOrders = (dbOrders || []).map(o => {
          const profile: any = dbProfiles?.find((p: any) => p.id === o.user_id) || dbProfilesList?.find((p: any) => p.id === o.user_id);
          const addr = dbAddresses?.find((a: any) => a.order_id === o.id) || {
            country: 'Uganda', district: 'Kampala', city: 'Lubowa', address: 'Lubowa Shopping Mall'
          };
          
          const items = dbItems ? dbItems.filter((item: any) => item.order_id === o.id).map((item: any) => {
            const prod = resolvedProducts.find(p => p.id === item.product_id);
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
            id: o.id,
            orderNumber: o.order_number || o.id,
            customerName: profile?.full_name || 'Gentleman Customer',
            customerEmail: profile?.email || '',
            customerPhone: profile?.phone || '',
            amount: o.amount,
            status: (() => {
              const s = o.status?.toLowerCase() || 'pending';
              if (s === 'completed' || s === 'delivered') return 'Delivered';
              if (s === 'processing') return 'Processing';
              if (s === 'cancelled') return 'Cancelled';
              return 'Pending';
            })(),
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

        // 4b. Payments
        try {
          const { data: dbPayments } = await supabase.from('payments').select('*');
          if (dbPayments) {
            const formattedPayments: Payment[] = dbPayments.map((p: any) => {
              const matchedOrder = (formattedOrders || []).find((o: any) => o.id === p.order_id || toValidUUID(o.id) === p.order_id || o.orderNumber === p.order_id) ||
                get().orders.find((o: any) => o.id === p.order_id || toValidUUID(o.id) === p.order_id || o.orderNumber === p.order_id);
              const matchedUser = dbProfiles?.find((prof: any) => prof.id === p.user_id) || get().users?.find((u: any) => u.id === p.user_id);

              return {
                id: p.id,
                orderId: p.order_id || matchedOrder?.id || '',
                customerName: matchedUser?.full_name || matchedUser?.name || matchedOrder?.customerName || p.customer_name || 'Gentleman Customer',
                customerEmail: matchedUser?.email || matchedOrder?.customerEmail || p.customer_email || '',
                amount: p.amount !== undefined && p.amount !== null ? Number(p.amount) : (matchedOrder?.amount || 0),
                paymentMethod: p.provider || matchedOrder?.paymentMethod || 'Mobile Money',
                status: mapDbPaymentStatusToUi(p.status),
                transactionId: p.transaction_id || p.id,
                date: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
              };
            });

            set({ payments: formattedPayments });
          }
        } catch (payErr) {
          console.warn('Failed to fetch payments from DB:', payErr);
        }

        // 5. Consultations
        try {
          const { data: dbBookings } = await supabase.from('consultations').select('*');
          if (dbBookings) {
            const camelBookings = keysToCamel(dbBookings) as ConsultationBooking[];
            set({ bookings: camelBookings });
          }
        } catch {}

        // 6. Newsletter
        try {
          const { data: dbSubs } = await supabase.from('newsletter_subscribers').select('*');
          if (dbSubs) {
            const mappedSubs = dbSubs.map((sub: any) => ({
              id: sub.id,
              email: sub.email,
              date: sub.subscribed_at
            })) as NewsletterSubscriber[];
            set({ subscribers: mappedSubs });
          }
        } catch {}

        // 7. Audit Logs
        try {
          const { data: dbLogs } = await supabase.from('audit_logs').select('*');
          if (dbLogs && dbLogs.length > 0) {
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
          }
        } catch {}

        // 8. Coupons
        try {
          const { data: dbCoupons } = await supabase.from('coupons').select('*');
          if (dbCoupons) {
            const mappedCoupons: Coupon[] = dbCoupons.map((c: any) => ({
              id: c.id,
              code: c.code,
              discountType: c.discount_type,
              discountValue: Number(c.discount_value) || 0,
              minSubtotal: c.min_subtotal !== null && c.min_subtotal !== undefined ? Number(c.min_subtotal) : undefined,
              isActive: c.is_active ?? true,
              expiresAt: c.expires_at || null,
              usageLimit: c.usage_limit !== null && c.usage_limit !== undefined ? Number(c.usage_limit) : null,
              timesUsed: Number(c.times_used) || 0,
              createdBy: c.created_by || null,
              createdAt: c.created_at,
              updatedAt: c.updated_at
            }));
            set({ coupons: mappedCoupons });
          }
        } catch (couponErr) {
          console.warn('Failed to fetch coupons from DB:', couponErr);
        }

        // 10. Testimonials
        try {
          const { data: dbTestimonials } = await supabase.from('testimonials').select('*').order('display_order', { ascending: true });
          if (dbTestimonials && dbTestimonials.length > 0) {
            const mappedTestimonials: Testimonial[] = dbTestimonials.map((t: any) => ({
              id: t.id,
              quote: t.quote,
              name: t.name,
              role: t.role || '',
              company: t.company || '',
              displayOrder: typeof t.display_order === 'number' ? t.display_order : 1,
              isActive: t.is_active ?? true,
              createdAt: t.created_at,
              updatedAt: t.updated_at
            }));
            set({ testimonials: mappedTestimonials });
          }
        } catch (testiErr) {
          console.warn('Failed to fetch testimonials from DB:', testiErr);
        }

        // 9. Auth session & Wishlist
        try {
          const { data: authData } = await supabase.auth.getUser();
          const authUser = authData?.user;
          const targetUserId = authUser?.id || get().currentUserId;

          if (targetUserId) {
            const { data: p } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', targetUserId)
              .maybeSingle();
            
            const meta = authUser?.user_metadata || {};
            const userObj: User = {
              id: targetUserId,
              name: p?.full_name || p?.name || authUser?.user_metadata?.name || (authUser ? authUser.email?.split('@')[0].toUpperCase() : 'Gentleman Customer'),
              email: p?.email || authUser?.email || '',
              phone: p?.phone || authUser?.user_metadata?.phone || '',
              role: p ? capitalizeRole(p.role) : 'Customer',
              spending: p ? (p.lifetime_spending || p.spending || 0) : 0,
              rewardsPoints: p ? (p.reward_points || p.rewardsPoints || 0) : 0,
              country: meta.country || undefined,
              district: meta.district || undefined,
              city: meta.city || undefined,
              address: meta.address || undefined
            };
            set({ currentUser: userObj });

            try {
              const { data: dbWishlists } = await supabase
                .from('wishlists')
                .select('product_id')
                .eq('user_id', targetUserId);
              if (dbWishlists) {
                set({ wishlist: dbWishlists.map((w: any) => w.product_id) });
              }
            } catch {}

            try {
              const { data: dbAddresses } = await supabase
                .from('saved_addresses')
                .select('*')
                .eq('user_id', targetUserId)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });
              if (dbAddresses) {
                set({ savedAddresses: dbAddresses });
              }
            } catch {}
          }
        } catch {}
      },

      syncFromSupabase: async () => {
        if (isSyncingInProgress) return;
        isSyncingInProgress = true;
        set({ isSyncing: true });

        try {
          await get().seedIfEmpty();
          await get().fetchLatestState();
          set({ cartError: null });
        } catch (err: any) {
          console.error('[syncFromSupabase] Sync error:', err);
        } finally {
          isSyncingInProgress = false;
          set({ isSyncing: false });
        }
      },

      applyProductChange: (payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        const products = get().products;

        if (eventType === 'DELETE') {
          const deletedId = oldRow?.id || newRow?.id;
          if (deletedId) {
            set({ products: products.filter(p => p.id !== deletedId) });
          }
          return;
        }

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (!newRow) return;
          const prodId = newRow.id;
          const existingIndex = products.findIndex(p => p.id === prodId || toValidUUID(p.id) === prodId);
          const existing = existingIndex !== -1 ? products[existingIndex] : null;

          let parsedSizes = (Array.isArray(newRow.sizes) && newRow.sizes.length > 0)
            ? newRow.sizes
            : (existing?.sizes || ['M', 'L', 'XL']);
          let parsedColors = (Array.isArray(newRow.colors) && newRow.colors.length > 0)
            ? newRow.colors
            : (existing?.colors || ['Classic Black']);
          let dealDays = newRow.deal_days !== undefined && newRow.deal_days !== null ? Number(newRow.deal_days) : (existing?.dealDays ?? 0);
          let dealHours = newRow.deal_hours !== undefined && newRow.deal_hours !== null ? Number(newRow.deal_hours) : (existing?.dealHours ?? 14);
          let dealMins = newRow.deal_mins !== undefined && newRow.deal_mins !== null ? Number(newRow.deal_mins) : (existing?.dealMins ?? 40);
          let dealSecs = newRow.deal_secs !== undefined && newRow.deal_secs !== null ? Number(newRow.deal_secs) : (existing?.dealSecs ?? 17);

          if (newRow.short_description) {
            try {
              const parsed = JSON.parse(newRow.short_description);
              if (parsed && typeof parsed === 'object') {
                if ((newRow.deal_days === undefined || newRow.deal_days === null) && parsed.dealDays !== undefined) dealDays = Number(parsed.dealDays);
                if ((newRow.deal_hours === undefined || newRow.deal_hours === null) && parsed.dealHours !== undefined) dealHours = Number(parsed.dealHours);
                if ((newRow.deal_mins === undefined || newRow.deal_mins === null) && parsed.dealMins !== undefined) dealMins = Number(parsed.dealMins);
                if ((newRow.deal_secs === undefined || newRow.deal_secs === null) && parsed.dealSecs !== undefined) dealSecs = Number(parsed.dealSecs);
              }
            } catch {}
          }

          const catName = newRow.category || existing?.category || 'Suits';

          const updatedProduct: Product = {
            id: prodId,
            name: newRow.name || existing?.name || 'Luxury Asset',
            description: newRow.description || existing?.description || '',
            category: catName,
            price: newRow.price !== undefined ? Number(newRow.price) : (existing?.price || 0),
            images: existing?.images || (newRow.slug ? [`https://picsum.photos/seed/${newRow.slug}/600/600`] : ['https://picsum.photos/seed/suit/600/600']),
            sizes: parsedSizes,
            colors: parsedColors,
            stock: newRow.stock !== undefined ? Number(newRow.stock) : (existing?.stock || 0),
            rating: newRow.rating !== undefined ? Number(newRow.rating) : (existing?.rating || 0),
            isNew: newRow.is_new !== undefined ? !!newRow.is_new : (existing?.isNew || false),
            isFeatured: newRow.is_featured !== undefined ? !!newRow.is_featured : (existing?.isFeatured || false),
            isDealOfTheDay: newRow.is_deal !== undefined ? !!newRow.is_deal : (existing?.isDealOfTheDay || false),
            discountPercentage: newRow.discount_percentage !== undefined ? Number(newRow.discount_percentage) : (existing?.discountPercentage || 0),
            dealDays,
            dealHours,
            dealMins,
            dealSecs,
            dealExpiresAt: newRow.deal_expires_at !== undefined ? newRow.deal_expires_at : (existing?.dealExpiresAt || null),
            reviews: existing?.reviews || []
          };

          if (existingIndex !== -1) {
            const newProducts = [...products];
            newProducts[existingIndex] = updatedProduct;
            set({ products: newProducts });
          } else {
            set({ products: [updatedProduct, ...products] });
          }
        }
      },

      applyReviewChange: (payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        const targetProductId = newRow?.product_id || oldRow?.product_id;
        if (!targetProductId) return;

        const products = get().products;
        const targetProd = products.find(p => p.id === targetProductId);
        if (!targetProd) return;

        let updatedReviews = [...(targetProd.reviews || [])];

        if (eventType === 'DELETE') {
          const deletedId = oldRow?.id || newRow?.id;
          if (deletedId) {
            updatedReviews = updatedReviews.filter(r => r.id !== deletedId);
          }
        } else if (eventType === 'INSERT') {
          if (newRow && !updatedReviews.some(r => r.id === newRow.id)) {
            const matchedUser = get().users.find(u => u.id === newRow.user_id);
            const newReview: Review = {
              id: newRow.id,
              productId: newRow.product_id,
              userName: matchedUser?.name || 'Gentleman Customer',
              userRole: matchedUser?.role || 'Customer',
              rating: Number(newRow.rating) || 5,
              comment: newRow.comment || '',
              date: newRow.created_at ? newRow.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
            };
            updatedReviews.unshift(newReview);
          }
        } else if (eventType === 'UPDATE') {
          if (newRow) {
            updatedReviews = updatedReviews.map(r => r.id === newRow.id ? {
              ...r,
              rating: Number(newRow.rating) || r.rating,
              comment: newRow.comment || r.comment,
            } : r);
          }
        }

        const avgRating = updatedReviews.length > 0
          ? Number((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1))
          : targetProd.rating;

        const updatedProducts = products.map(p => p.id === targetProductId ? {
          ...p,
          rating: avgRating,
          reviews: updatedReviews
        } : p);

        set({ products: updatedProducts });
      },

      applyOrderChange: (payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        const orders = get().orders;

        if (eventType === 'DELETE') {
          const deletedId = oldRow?.id || newRow?.id;
          if (deletedId) {
            set({ orders: orders.filter(o => o.id !== deletedId && o.orderNumber !== deletedId) });
          }
          return;
        }

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (!newRow) return;
          const orderId = newRow.id;
          const existingIndex = orders.findIndex(o => o.id === orderId || o.orderNumber === newRow.order_number);
          const existing = existingIndex !== -1 ? orders[existingIndex] : null;

          const formattedStatus = (() => {
            const s = newRow.status?.toLowerCase() || 'pending';
            if (s === 'completed' || s === 'delivered') return 'Delivered';
            if (s === 'processing') return 'Processing';
            if (s === 'cancelled') return 'Cancelled';
            return 'Pending';
          })();

          const updatedOrder: Order = {
            id: orderId,
            orderNumber: newRow.order_number || existing?.orderNumber || newRow.id,
            customerName: existing?.customerName || 'Gentleman Customer',
            customerEmail: existing?.customerEmail || '',
            customerPhone: existing?.customerPhone || '',
            amount: newRow.amount !== undefined ? Number(newRow.amount) : (existing?.amount || 0),
            status: formattedStatus as Order['status'],
            date: newRow.created_at || existing?.date || new Date().toISOString(),
            paymentMethod: newRow.payment_method || existing?.paymentMethod || 'Mobile Money',
            notes: newRow.notes || existing?.notes || '',
            items: existing?.items || [],
            shippingAddress: existing?.shippingAddress || { country: 'Uganda', district: 'Kampala', city: 'Lubowa', address: 'Lubowa Showroom' }
          };

          if (existingIndex !== -1) {
            const newOrders = [...orders];
            newOrders[existingIndex] = updatedOrder;
            set({ orders: newOrders });
          } else {
            set({ orders: [updatedOrder, ...orders] });
          }
        }
      },

      applyProfileChange: (payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        const users = get().users;

        if (eventType === 'DELETE') {
          const deletedId = oldRow?.id || newRow?.id;
          if (deletedId) {
            set({ users: users.filter(u => u.id !== deletedId) });
          }
          return;
        }

        if (eventType === 'INSERT' || eventType === 'UPDATE') {
          if (!newRow) return;
          const userId = newRow.id;
          const existingIndex = users.findIndex(u => u.id === userId);

          const updatedUser: User = {
            id: userId,
            name: newRow.full_name || newRow.name || 'Gentleman Customer',
            email: newRow.email || '',
            phone: newRow.phone || '',
            role: capitalizeRole(newRow.role) as User['role'],
            spending: newRow.lifetime_spending || newRow.spending || 0,
            rewardsPoints: newRow.reward_points || newRow.rewardsPoints || 0
          };

          if (existingIndex !== -1) {
            const newUsers = [...users];
            newUsers[existingIndex] = updatedUser;
            set({ users: newUsers });
          } else {
            set({ users: [...users, updatedUser] });
          }

          if (get().currentUser?.id === userId) {
            set(state => ({
              currentUser: state.currentUser ? { ...state.currentUser, ...updatedUser } : updatedUser
            }));
          }
        }
      },

      login: async (email, password) => {
        try {
          const supabase = getSupabaseClient();

          if (!password) {
            return { success: false, error: 'Password is required for standard authentication.' };
          }

          let resUser = null;
          let resSession = null;

          try {
            // Call rate-limited, secure server-side login endpoint
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password })
            });

            const res = await response.json().catch(() => ({}));
            if (!response.ok || !res.success) {
              const errorMessage = res.error || res.message;
              if ((response.status === 502 || response.status === 503 || response.status === 504) && !errorMessage) {
                return { success: false, error: 'Our authentication service is temporarily unavailable. Please try again shortly.' };
              }
              return { success: false, error: errorMessage || 'Authentication failed.' };
            }

            resUser = res.user;
            resSession = res.session;
          } catch (fetchErr) {
            console.warn('[STORE] Server login fetch failed:', fetchErr);
            return { success: false, error: 'Our authentication service is temporarily unavailable. Please try again shortly.' };
          }

          if (!resUser) {
            return { success: false, error: 'Authentication failed.' };
          }

          // Sync local Supabase client state if present
          if (supabase && resSession) {
            try {
              await supabase.auth.setSession({
                access_token: resSession.access_token,
                refresh_token: resSession.refresh_token
              });
            } catch (sessionErr) {
              console.warn('[STORE] Failed to sync client-side Supabase session:', sessionErr);
            }
          }

          // Load profile details from database if possible
          let user: User = {
            id: resUser.id,
            name: resUser.name,
            email: resUser.email,
            phone: resUser.phone,
            role: capitalizeRole(resUser.role) as User['role'],
            spending: 0,
            rewardsPoints: 0
          };

          if (supabase) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

              if (profile) {
                user = {
                  ...user,
                  spending: profile.spending || profile.lifetime_spending || 0,
                  rewardsPoints: profile.rewardsPoints || profile.rewards_points || 0,
                  country: profile.country || undefined,
                  district: profile.district || undefined,
                  city: profile.city || undefined,
                  address: profile.address || undefined
                };
              }
            } catch (dbErr) {
              console.warn('[STORE] Failed to retrieve DB profile details on login:', dbErr);
            }

            // Fetch user's wishlist from Supabase
            try {
              const { data: dbWishlists, error: wishErr } = await supabase
                .from('wishlists')
                .select('product_id')
                .eq('user_id', user.id);
              if (!wishErr && dbWishlists) {
                const productIds = dbWishlists.map((w: any) => w.product_id);
                set({ wishlist: productIds });
              }
            } catch (wishErr) {
              console.warn('Failed to load wishlist from Supabase on login:', wishErr);
            }
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
            `User logged in securely via Supabase Auth and server-side rate limits.`,
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

      register: async (name, email, phone, password) => {
        try {
          if (!password) {
            return { success: false, error: 'A password is required to compile a private profile.' };
          }

          // Register via secure server-side API route
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
          });

          const res = await response.json();
          if (!response.ok || !res.success || !res.user) {
            return { success: false, error: res.error || 'Registration failed.' };
          }

          const newUser: User = {
            id: res.user.id,
            name: res.user.name || name,
            email: res.user.email || email,
            phone: res.user.phone || phone,
            role: (res.user.role || 'Customer') as User['role'],
            spending: 0,
            rewardsPoints: 0
          };

          // Add user locally first to support offline/local fallback login
          set(state => ({
            users: [...state.users.filter(u => u.id !== newUser.id), newUser]
          }));

          // Save/update profile using privileged API route bypass
          await safeSupabaseUpsert('profiles', newUser);

          // Do not automatically login on registration as per user guidelines
          // We just log the audit log and return success.

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
          if (supabase) {
            await supabase.auth.signOut();
          }
          await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        } catch (err) {
          console.error('Logout error:', err);
        } finally {
          set({ currentUser: null });
        }
      },

      updateProfile: async (name, phone) => {
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

        await safeSupabaseUpsert('profiles', updated);

        const supabase = getSupabaseClient();
        if (supabase) {
          try {
            await supabase.auth.updateUser({
              data: {
                name,
                phone
              }
            });
          } catch (e) {
            console.warn('Failed to update auth metadata for profile:', e);
          }
        }
      },

      updateAddress: async (country, district, city, address) => {
        try {
          const supabase = getSupabaseClient();
          const current = get().currentUser;
          if (!current) return { success: false, error: 'No active session' };

          const updated = { 
            ...current, 
            country, 
            district, 
            city, 
            address 
          };

          set(state => ({
            currentUser: updated,
            users: state.users.map(u => u.id === current.id ? updated : u)
          }));

          get().addAuditLog(
            'Address Updated',
            `Saved billing and dispatch address updated.`,
            current.id,
            current.name,
            current.role
          );

          if (supabase) {
            const { error } = await supabase.auth.updateUser({
              data: {
                country,
                district,
                city,
                address
              }
            });
            if (error) throw error;
          }

          return { success: true };
        } catch (err: any) {
          console.error('Update address error:', err);
          return { success: false, error: err.message || 'Failed to update address.' };
        }
      },

      fetchSavedAddresses: async () => {
        try {
          const supabase = getSupabaseClient();
          const current = get().currentUser;
          if (!current || !supabase) return;
          const { data, error } = await supabase
            .from('saved_addresses')
            .select('*')
            .eq('user_id', current.id)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false });
          if (!error && data) {
            set({ savedAddresses: data });
          }
        } catch (e) {
          console.error('Failed to fetch saved addresses:', e);
        }
      },

      loadStylistHistory: async () => {
        try {
          const current = get().currentUser;
          const supabase = getSupabaseClient();
          if (!current || !supabase) {
            return { success: false, error: 'User not authenticated' };
          }
          const { data, error } = await supabase
            .from('stylist_conversations')
            .select('*')
            .eq('user_id', current.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.warn('Failed to load stylist history from Supabase:', error.message);
            return { success: false, error: error.message };
          }

          if (data && Array.isArray(data.messages)) {
            return { success: true, messages: data.messages as ChatMessage[] };
          }
          return { success: true, messages: [] };
        } catch (err: any) {
          console.warn('Error loading stylist history:', err);
          return { success: false, error: err?.message || 'Failed to load stylist history' };
        }
      },

      saveStylistMessage: async (messages: ChatMessage[]) => {
        try {
          const current = get().currentUser;
          const supabase = getSupabaseClient();
          if (!current || !supabase) {
            return { success: false, error: 'User not authenticated' };
          }

          const { data: existing, error: selectErr } = await supabase
            .from('stylist_conversations')
            .select('id')
            .eq('user_id', current.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (selectErr) {
            console.warn('Error querying stylist_conversations:', selectErr.message);
          }

          if (existing?.id) {
            const { error } = await supabase
              .from('stylist_conversations')
              .update({
                messages,
                updated_at: new Date().toISOString()
              })
              .eq('id', existing.id);

            if (error) {
              console.warn('Failed to update stylist conversation:', error.message);
              return { success: false, error: error.message };
            }
          } else {
            const { error } = await supabase
              .from('stylist_conversations')
              .insert({
                user_id: current.id,
                messages,
                updated_at: new Date().toISOString()
              });

            if (error) {
              console.warn('Failed to insert stylist conversation:', error.message);
              return { success: false, error: error.message };
            }
          }

          return { success: true };
        } catch (err: any) {
          console.warn('Error saving stylist conversation:', err);
          return { success: false, error: err?.message || 'Failed to save stylist conversation' };
        }
      },

      addSavedAddress: async (addressData) => {
        try {
          const current = get().currentUser;
          if (!current) return { success: false, error: 'User not authenticated' };
          const supabase = getSupabaseClient();

          const existingAddresses = get().savedAddresses || [];
          const isFirst = existingAddresses.length === 0;
          const makeDefault = addressData.is_default ?? isFirst;

          const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `addr-${Date.now()}`;
          const newAddress: SavedAddress = {
            id: newId,
            user_id: current.id,
            label: addressData.label || 'Home',
            country: addressData.country || 'Uganda',
            district: addressData.district || '',
            city: addressData.city || '',
            address: addressData.address || '',
            is_default: makeDefault,
            created_at: new Date().toISOString()
          };

          let updatedAddresses = existingAddresses;
          if (makeDefault) {
            updatedAddresses = updatedAddresses.map(a => ({ ...a, is_default: false }));
          }
          updatedAddresses = [newAddress, ...updatedAddresses];
          set({ savedAddresses: updatedAddresses });

          if (supabase) {
            if (makeDefault) {
              await supabase
                .from('saved_addresses')
                .update({ is_default: false })
                .eq('user_id', current.id);
            }
            const { error } = await supabase.from('saved_addresses').insert({
              id: newAddress.id,
              user_id: current.id,
              label: newAddress.label,
              country: newAddress.country,
              district: newAddress.district,
              city: newAddress.city,
              address: newAddress.address,
              is_default: newAddress.is_default
            });
            if (error) {
              console.error('Supabase error inserting saved address:', error);
            }
          }

          get().addAuditLog(
            'Saved Address Added',
            `Added saved address "${newAddress.label || 'New Address'}" for ${current.name}`,
            current.id,
            current.name,
            current.role
          );

          return { success: true };
        } catch (err: any) {
          return { success: false, error: err?.message || 'Failed to add saved address' };
        }
      },

      updateSavedAddress: async (id, updatedFields) => {
        try {
          const current = get().currentUser;
          if (!current) return { success: false, error: 'User not authenticated' };
          const supabase = getSupabaseClient();

          const existingAddresses = get().savedAddresses || [];
          const makeDefault = updatedFields.is_default === true;

          let updatedAddresses = existingAddresses.map(a => {
            if (a.id === id) {
              return { ...a, ...updatedFields };
            }
            if (makeDefault) {
              return { ...a, is_default: false };
            }
            return a;
          });

          set({ savedAddresses: updatedAddresses });

          if (supabase) {
            if (makeDefault) {
              await supabase
                .from('saved_addresses')
                .update({ is_default: false })
                .eq('user_id', current.id);
            }
            const { error } = await supabase
              .from('saved_addresses')
              .update(updatedFields)
              .eq('id', id);
            if (error) {
              console.error('Supabase error updating saved address:', error);
            }
          }

          return { success: true };
        } catch (err: any) {
          return { success: false, error: err?.message || 'Failed to update saved address' };
        }
      },

      deleteSavedAddress: async (id) => {
        try {
          const current = get().currentUser;
          if (!current) return { success: false, error: 'User not authenticated' };
          const supabase = getSupabaseClient();

          const existingAddresses = get().savedAddresses || [];
          const target = existingAddresses.find(a => a.id === id);
          let filtered = existingAddresses.filter(a => a.id !== id);

          if (target?.is_default && filtered.length > 0) {
            filtered = filtered.map((a, idx) => idx === 0 ? { ...a, is_default: true } : a);
            if (supabase) {
              await supabase
                .from('saved_addresses')
                .update({ is_default: true })
                .eq('id', filtered[0].id);
            }
          }

          set({ savedAddresses: filtered });

          if (supabase) {
            const { error } = await supabase
              .from('saved_addresses')
              .delete()
              .eq('id', id);
            if (error) {
              console.error('Supabase error deleting saved address:', error);
            }
          }

          return { success: true };
        } catch (err: any) {
          return { success: false, error: err?.message || 'Failed to delete saved address' };
        }
      },

      setDefaultAddress: async (id) => {
        return get().updateSavedAddress(id, { is_default: true });
      },

      updatePassword: async (password) => {
        try {
          const supabase = getSupabaseClient();
          const current = get().currentUser;
          if (!current) return { success: false, error: 'No active session' };

          if (!supabase) {
            return { success: false, error: 'Cannot update password while database is offline or unconfigured.' };
          }

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

      forgotPassword: async (email) => {
        try {
          const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          const res = await response.json();
          if (!response.ok || !res.success) {
            return { success: false, error: res.error || 'Failed to dispatch password recovery link.' };
          }
          return { success: true };
        } catch (err: any) {
          console.error('ForgotPassword error:', err);
          return { success: false, error: err.message || 'Failed to trigger reset password transmission.' };
        }
      },

      resetPasswordRecovery: async (password) => {
        try {
          const supabase = getSupabaseClient();
          
          // Call rate-limited, secure server-side update password API
          const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
          });

          const res = await response.json();
          if (!response.ok || !res.success) {
            return { success: false, error: res.error || 'Failed to apply new security credentials.' };
          }

          if (supabase) {
            const { error, data } = await supabase.auth.updateUser({
              password
            });
            if (error) {
              console.warn('Client session password sync warning:', error.message);
            }

            const authUser = data?.user || (await supabase.auth.getUser()).data.user;
            if (authUser) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .maybeSingle();

              let user: User;
              if (profile) {
                user = {
                  id: profile.id,
                  name: profile.name || profile.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0].toUpperCase() || 'Gentleman Customer',
                  email: profile.email || authUser.email || '',
                  phone: profile.phone || authUser.user_metadata?.phone || '',
                  role: capitalizeRole(profile.role),
                  spending: profile.spending || profile.lifetime_spending || 0,
                  rewardsPoints: profile.rewardsPoints || profile.rewards_points || 0
                };
              } else {
                user = {
                  id: authUser.id,
                  name: authUser.user_metadata?.name || authUser.email?.split('@')[0].toUpperCase() || 'Gentleman Customer',
                  email: authUser.email || '',
                  phone: authUser.user_metadata?.phone || '',
                  role: 'Customer',
                  spending: 0,
                  rewardsPoints: 0
                };
              }
              set({ currentUser: user });
            }
          }
          return { success: true };
        } catch (err: any) {
          console.error('ResetPasswordRecovery error:', err);
          return { success: false, error: err.message || 'Failed to update security credentials.' };
        }
      },

      addToCart: (product, size, color, qty) => {
        const cart = get().cart;
        const products = get().products;
        const dbProduct = products.find(p => p.id === product.id) || product;
        const maxStock = dbProduct.stock;

        const cartItemId = `${product.id}-${size}-${color}`;
        const existing = cart.find(item => item.id === cartItemId);
        
        // Count total qty of this product in cart
        const totalProductQtyInCart = cart.reduce((sum, item) => item.product.id === product.id ? sum + item.quantity : sum, 0);
        
        if (totalProductQtyInCart + qty > maxStock) {
          const allowedQty = maxStock - totalProductQtyInCart;
          if (allowedQty <= 0) {
            set({ cartError: `Cannot add more ${product.name}. Out of stock! (Available: ${maxStock})` });
            return;
          } else {
            set({ cartError: `Only added ${allowedQty} of ${product.name} due to stock limits.` });
            qty = allowedQty;
          }
        } else {
          set({ cartError: null });
        }

        let updatedCart: CartItem[] = [];
        if (existing) {
          updatedCart = cart.map(item => 
            item.id === cartItemId 
              ? { ...item, quantity: item.quantity + qty }
              : item
          );
        } else {
          const newItem: CartItem = {
            id: cartItemId,
            product,
            selectedSize: size,
            selectedColor: color,
            quantity: qty
          };
          updatedCart = [...cart, newItem];
        }

        set({ cart: updatedCart });
        
        // Sync with Supabase (non-blocking, optimistic)
        const syncCartToSupabase = async (cartList: CartItem[]) => {
          try {
            const supabase = getSupabaseClient();
            const currentUser = get().currentUser;
            if (supabase && currentUser) {
              await supabase.auth.updateUser({ data: { cart: cartList } });
            }
          } catch (e) {
            console.warn('Silent fallback for Supabase cart sync:', e);
          }
        };
        syncCartToSupabase(updatedCart);
      },

      updateCartQty: (cartItemId, qty) => {
        if (qty <= 0) {
          get().removeFromCart(cartItemId);
          return;
        }

        const cart = get().cart;
        const itemToUpdate = cart.find(item => item.id === cartItemId);
        if (!itemToUpdate) return;

        const products = get().products;
        const dbProduct = products.find(p => p.id === itemToUpdate.product.id) || itemToUpdate.product;
        const maxStock = dbProduct.stock;

        // Calculate total qty of this product in other cart items
        const otherItemsQty = cart
          .filter(item => item.id !== cartItemId && item.product.id === dbProduct.id)
          .reduce((sum, item) => sum + item.quantity, 0);

        if (otherItemsQty + qty > maxStock) {
          const allowedQty = maxStock - otherItemsQty;
          if (allowedQty <= 0) {
            set({ cartError: `Cannot update. ${dbProduct.name} is out of stock!` });
            return;
          } else {
            set({ cartError: `Capped quantity of ${dbProduct.name} to ${allowedQty} units due to available stock.` });
            qty = allowedQty;
          }
        } else {
          set({ cartError: null });
        }

        const updatedCart = cart.map(item => 
          item.id === cartItemId ? { ...item, quantity: qty } : item
        );

        set({ cart: updatedCart });
        
        // Sync
        const syncCartToSupabase = async (cartList: CartItem[]) => {
          try {
            const supabase = getSupabaseClient();
            const currentUser = get().currentUser;
            if (supabase && currentUser) {
              await supabase.auth.updateUser({ data: { cart: cartList } });
            }
          } catch (e) {
            console.warn('Silent fallback for Supabase cart sync:', e);
          }
        };
        syncCartToSupabase(updatedCart);
      },

      removeFromCart: (cartItemId) => {
        const updatedCart = get().cart.filter(item => item.id !== cartItemId);
        set({ cart: updatedCart });
        
        // Sync
        const syncCartToSupabase = async (cartList: CartItem[]) => {
          try {
            const supabase = getSupabaseClient();
            const currentUser = get().currentUser;
            if (supabase && currentUser) {
              await supabase.auth.updateUser({ data: { cart: cartList } });
            }
          } catch (e) {
            console.warn('Silent fallback for Supabase cart sync:', e);
          }
        };
        syncCartToSupabase(updatedCart);
      },

      clearCart: () => {
        set({ cart: [] });
        // Sync
        const syncCartToSupabase = async () => {
          try {
            const supabase = getSupabaseClient();
            const currentUser = get().currentUser;
            if (supabase && currentUser) {
              await supabase.auth.updateUser({ data: { cart: [] } });
            }
          } catch (e) {
            console.warn('Silent fallback for Supabase cart sync:', e);
          }
        };
        syncCartToSupabase();
      },

      clearCartError: () => set({ cartError: null }),

      applyCoupon: (code) => {
        const sanitizedCode = code.trim().toUpperCase();
        let couponsList = get().coupons || [];

        let coupon = couponsList.find(c => c.code.trim().toUpperCase() === sanitizedCode);

        if (!coupon) {
          return { success: false, message: 'Invalid luxury coupon code.' };
        }

        if (coupon.isActive === false) {
          return { success: false, message: 'This coupon code is currently inactive.' };
        }

        if (coupon.expiresAt) {
          const expiry = new Date(coupon.expiresAt);
          if (!isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
            return { success: false, message: 'This coupon code has expired.' };
          }
        }

        if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
          if ((coupon.timesUsed || 0) >= coupon.usageLimit) {
            return { success: false, message: 'This coupon code has reached its maximum usage limit.' };
          }
        }

        const subtotal = get().cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
          return { success: false, message: `This coupon requires a minimum subtotal of Ugx ${coupon.minSubtotal}.` };
        }

        set({ appliedCoupon: coupon });
        return { success: true, message: `Coupon ${coupon.code} applied successfully!` };
      },

      addCoupon: async (couponData, adminName, adminRole) => {
        const previousCoupons = get().coupons;
        const code = (couponData.code || '').trim().toUpperCase();
        const newCoupon: Coupon = {
          id: couponData.id || `cpn-${Math.random().toString(36).substring(2, 11)}`,
          code,
          discountType: couponData.discountType || 'percentage',
          discountValue: Number(couponData.discountValue) || 0,
          minSubtotal: couponData.minSubtotal !== undefined && couponData.minSubtotal !== null ? Number(couponData.minSubtotal) : undefined,
          isActive: couponData.isActive !== undefined ? couponData.isActive : true,
          expiresAt: couponData.expiresAt || null,
          usageLimit: couponData.usageLimit !== undefined && couponData.usageLimit !== null ? Number(couponData.usageLimit) : null,
          timesUsed: Number(couponData.timesUsed) || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        set(state => ({
          coupons: [newCoupon, ...state.coupons.filter(c => c.code !== code)]
        }));

        if (adminName) {
          get().addAuditLog(
            'Coupon Created',
            `Admin created new coupon '${newCoupon.code}' (${newCoupon.discountValue}${newCoupon.discountType === 'percentage' ? '%' : ' Ugx'} off).`,
            'admin-modifier',
            adminName,
            adminRole as User['role']
          );
        }

        const dbRes = await safeSupabaseInsert('coupons', newCoupon);
        if (dbRes && !dbRes.success) {
          set({ coupons: previousCoupons, adminError: `Failed to save coupon '${newCoupon.code}': ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        get().syncFromSupabase();
        return { success: true };
      },

      updateCoupon: async (id, updatedFields, adminName, adminRole) => {
        const previousCoupons = get().coupons;
        const existing = previousCoupons.find(c => c.id === id || c.code === id);
        const updatedCoupon: Coupon = {
          ...(existing || {}),
          ...updatedFields,
          code: updatedFields.code ? updatedFields.code.trim().toUpperCase() : (existing?.code || ''),
          id: existing?.id || id,
          updatedAt: new Date().toISOString()
        } as Coupon;

        set(state => ({
          coupons: state.coupons.map(c => (c.id === id || c.code === id) ? updatedCoupon : c)
        }));

        if (adminName) {
          get().addAuditLog(
            'Coupon Updated',
            `Admin updated coupon '${updatedCoupon.code}'.`,
            'admin-modifier',
            adminName,
            adminRole as User['role']
          );
        }

        const dbRes = await safeSupabaseUpsert('coupons', updatedCoupon);
        if (dbRes && !dbRes.success) {
          set({ coupons: previousCoupons, adminError: `Failed to update coupon '${updatedCoupon.code}': ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        get().syncFromSupabase();
        return { success: true };
      },

      deleteCoupon: async (id, adminName, adminRole) => {
        const previousCoupons = get().coupons;
        const couponToDelete = previousCoupons.find(c => c.id === id || c.code === id);

        set(state => ({
          coupons: state.coupons.filter(c => c.id !== id && c.code !== id)
        }));

        if (adminName) {
          get().addAuditLog(
            'Coupon Deleted',
            `Admin deleted coupon '${couponToDelete?.code || id}'.`,
            'admin-modifier',
            adminName,
            adminRole as User['role']
          );
        }

        const dbRes = await safeSupabaseDelete('coupons', { id: couponToDelete?.id || id });
        if (dbRes && !dbRes.success) {
          set({ coupons: previousCoupons, adminError: `Failed to delete coupon '${couponToDelete?.code || id}': ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        get().syncFromSupabase();
        return { success: true };
      },

      addCategory: async (categoryData, adminName, adminRole) => {
        const name = (categoryData.name || '').trim();
        if (!name) return { success: false, error: 'Category name is required.' };
        const slug = categoryData.slug?.trim().toLowerCase() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const newCat: Category = {
          name,
          slug,
          description: categoryData.description || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const previousCategories = get().categories;

        // Optimistic state update
        set(state => ({
          categories: [...(state.categories || []).filter(c => c.slug !== slug), newCat]
        }));

        if (adminName) {
          get().addAuditLog(
            'Category Registered',
            `Admin registered new category '${name}' (${slug}).`,
            'admin-modifier',
            adminName,
            adminRole as User['role']
          );
        }

        const dbRes = await safeSupabaseUpsert('categories', newCat);
        if (dbRes && !dbRes.success) {
          set({ categories: previousCategories, adminError: `Failed to save category '${newCat.name}': ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        await get().fetchLatestState();
        return { success: true };
      },

      updateCategory: async (id, updatedFields, adminName, adminRole) => {
        const previousCategories = get().categories || [];
        const existingCat = previousCategories.find(c => c.id === id || c.slug === id);
        if (!existingCat) return { success: false, error: 'Category not found.' };
        const name = updatedFields.name?.trim() || existingCat.name;
        const slug = updatedFields.slug?.trim().toLowerCase() || existingCat.slug;
        const updatedCat: Category = {
          ...existingCat,
          ...updatedFields,
          id: existingCat.id || id,
          name,
          slug,
          updatedAt: new Date().toISOString()
        };

        set(state => ({
          categories: (state.categories || []).map(c => (c.id === id || c.slug === id) ? updatedCat : c)
        }));

        if (adminName) {
          get().addAuditLog(
            'Category Modified',
            `Admin modified category '${updatedCat.name}'.`,
            'admin-modifier',
            adminName,
            adminRole as User['role']
          );
        }

        const dbRes = await safeSupabaseUpsert('categories', updatedCat);
        if (dbRes && !dbRes.success) {
          set({ categories: previousCategories, adminError: `Failed to update category '${updatedCat.name}': ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        await get().fetchLatestState();
        return { success: true };
      },

      deleteCategory: async (id, adminName, adminRole) => {
        const previousCategories = get().categories || [];
        const categoryToDelete = previousCategories.find(c => c.id === id || c.slug === id);
        if (!categoryToDelete) return { success: false, message: 'Category not found.', error: 'Category not found.' };

        // Block deletion if products reference this category
        const referencingProducts = (get().products || []).filter(p => p.category?.toLowerCase() === categoryToDelete.name.toLowerCase() || p.category?.toLowerCase() === categoryToDelete.slug.toLowerCase());
        if (referencingProducts.length > 0) {
          return { success: false, message: `Cannot delete '${categoryToDelete.name}': ${referencingProducts.length} product(s) reference this category. Reassign or delete those products first.` };
        }

        set(state => ({
          categories: (state.categories || []).filter(c => c.id !== id && c.slug !== id)
        }));

        if (adminName) {
          get().addAuditLog(
            'Category Removed',
            `Admin deleted category '${categoryToDelete.name}'.`,
            'admin-modifier',
            adminName,
            adminRole as User['role']
          );
        }

        let dbRes: { success: boolean; error?: string } = { success: true };
        if (categoryToDelete.id) {
          dbRes = await safeSupabaseDelete('categories', { id: categoryToDelete.id });
        }
        if (!dbRes.success) {
          set({ categories: previousCategories, adminError: `Failed to delete category '${categoryToDelete.name}': ${dbRes.error}` });
          return { success: false, message: `Failed to delete category: ${dbRes.error}`, error: dbRes.error };
        }
        await get().fetchLatestState();
        return { success: true };
      },

      addTestimonial: async (testimonialData, adminName, adminRole) => {
        const quote = (testimonialData.quote || '').trim();
        const name = (testimonialData.name || '').trim();
        if (!quote || !name) return { success: false, error: 'Quote and name are required.' };
        const newTestimonial: Testimonial = {
          quote,
          name,
          role: testimonialData.role?.trim() || '',
          company: testimonialData.company?.trim() || '',
          displayOrder: typeof testimonialData.displayOrder === 'number' ? testimonialData.displayOrder : ((get().testimonials || []).length + 1),
          isActive: testimonialData.isActive !== undefined ? Boolean(testimonialData.isActive) : true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const previousTestimonials = get().testimonials || [];

        set(state => ({
          testimonials: [...(state.testimonials || []), newTestimonial]
        }));

        if (adminName) {
          get().addAuditLog(
            'Testimonial Created',
            `Admin created new testimonial for '${name}'.`,
            'admin-modifier',
            adminName,
            adminRole as User['role']
          );
        }

        const dbRes = await safeSupabaseInsert('testimonials', newTestimonial);
        if (dbRes && !dbRes.success) {
          set({ testimonials: previousTestimonials, adminError: `Failed to save testimonial for '${name}': ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        await get().fetchLatestState();
        return { success: true };
      },

      updateTestimonial: async (id, updatedFields, adminName, adminRole) => {
        const previousTestimonials = get().testimonials || [];
        const existing = previousTestimonials.find(t => t.id === id);
        const updatedTestimonial: Testimonial = {
          ...(existing || {}),
          ...updatedFields,
          id: existing?.id || id,
          updatedAt: new Date().toISOString()
        } as Testimonial;

        set(state => ({
          testimonials: (state.testimonials || []).map(t => t.id === id ? updatedTestimonial : t)
        }));

        if (adminName) {
          get().addAuditLog(
            'Testimonial Updated',
            `Admin updated testimonial for '${updatedTestimonial.name}'.`,
            'admin-modifier',
            adminName,
            adminRole as User['role']
          );
        }

        const dbRes = await safeSupabaseUpsert('testimonials', updatedTestimonial);
        if (dbRes && !dbRes.success) {
          set({ testimonials: previousTestimonials, adminError: `Failed to update testimonial for '${updatedTestimonial.name}': ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        await get().fetchLatestState();
        return { success: true };
      },

      deleteTestimonial: async (id, adminName, adminRole) => {
        const previousTestimonials = get().testimonials || [];
        const testimonialToDelete = previousTestimonials.find(t => t.id === id);

        set(state => ({
          testimonials: (state.testimonials || []).filter(t => t.id !== id)
        }));

        if (adminName) {
          get().addAuditLog(
            'Testimonial Deleted',
            `Admin deleted testimonial for '${testimonialToDelete?.name || id}'.`,
            'admin-modifier',
            adminName,
            adminRole as User['role']
          );
        }

        let dbRes: { success: boolean; error?: string } = { success: true };
        if (testimonialToDelete?.id) {
          dbRes = await safeSupabaseDelete('testimonials', { id: testimonialToDelete.id });
        }
        if (!dbRes.success) {
          set({ testimonials: previousTestimonials, adminError: `Failed to delete testimonial: ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        await get().fetchLatestState();
        return { success: true };
      },

      removeCoupon: () => {
        set({ appliedCoupon: null });
      },

      setShippingMethod: (method) => {
        set({ selectedShippingMethod: method });
      },

      placeOrder: (orderData, skipDbSync = false) => {
        const orderId = (orderData.id && orderData.id.includes('-') && orderData.id.length > 20)
          ? orderData.id 
          : toValidUUID(orderData.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`);
        const orderNum = orderData.orderNumber || (orderData.id && orderData.id.startsWith('ORD-') ? orderData.id : `ORD-${Math.floor(1000 + Math.random() * 9000)}`);

        const newOrder: Order = {
          ...orderData,
          id: orderId,
          orderNumber: orderNum,
          date: orderData.date || new Date().toISOString().split('T')[0]
        } as Order;

        const newPayment: Payment = {
          id: orderData.paymentId || `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
          orderId: newOrder.id,
          customerName: newOrder.customerName,
          customerEmail: newOrder.customerEmail,
          amount: newOrder.amount,
          paymentMethod: newOrder.paymentMethod,
          status: orderData.paymentStatus 
            ? mapDbPaymentStatusToUi(orderData.paymentStatus) 
            : (newOrder.paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid'),
          transactionId: orderData.paymentTransactionId || (newOrder.paymentMethod === 'Cash on Delivery' 
            ? 'COD-PENDING' 
            : `TXN-${newOrder.paymentMethod === 'Visa' ? 'VISA' : 'MM'}-${Math.floor(100000 + Math.random() * 900000)}`),
          date: newOrder.date
        };

        set(state => ({
          orders: [newOrder, ...state.orders],
          payments: [newPayment, ...(state.payments || [])]
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
          if (!skipDbSync) {
            // Sync profile details
            safeSupabaseUpsert('profiles', updatedUser);
          }
        } else {
          get().addAuditLog(
            'Guest Order Placement',
            `Corporate purchase of $${newOrder.amount} placed successfully via guest registry.`,
            'guest',
            newOrder.customerName,
            'Customer'
          );
        }

        if (!skipDbSync) {
          // Sync order with Supabase relational tables (orders, order_items, order_addresses, payments)
          const { items, shippingAddress, ...orderPayload } = newOrder;
          safeSupabaseInsert('orders', orderPayload);
          for (const item of items) {
            safeSupabaseInsert('order_items', { ...item, orderId: newOrder.id });
          }
          safeSupabaseInsert('order_addresses', { ...shippingAddress, orderId: newOrder.id });
          safeSupabaseInsert('payments', newPayment);
        }

        get().clearCart();
        return newOrder;
      },

      updateOrderStatus: async (orderId, status, modifierName, modifierRole) => {
        const previousOrders = get().orders;
        const targetOrder = previousOrders.find(o => o.id === orderId || o.orderNumber === orderId);
        const resolvedOrderId = targetOrder ? targetOrder.id : orderId;

        set(state => ({
          orders: state.orders.map(o => (o.id === resolvedOrderId || o.orderNumber === orderId) ? { ...o, status } : o)
        }));

        get().addAuditLog(
          'Order Status Adjusted',
          `Order ${targetOrder?.orderNumber || resolvedOrderId} status transitioned to '${status}' by staff.`,
          'staff-modifier',
          modifierName,
          modifierRole as User['role']
        );

        // Sync status with Supabase using resolved UUID
        const dbRes = await safeSupabaseUpsert('orders', { id: resolvedOrderId, status });
        if (dbRes && !dbRes.success) {
          set({ orders: previousOrders, adminError: `Failed to update order status: ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        return { success: true };
      },

      updatePaymentStatus: async (paymentId, status, modifierName, modifierRole) => {
        const previousPayments = get().payments || [];
        const previousOrders = get().orders || [];

        const targetPayment = previousPayments.find(p => p.id === paymentId);
        if (!targetPayment) {
          return { success: false, error: 'Payment record not found.' };
        }

        const updatedPayment: Payment = {
          ...targetPayment,
          status
        };

        // Resolve linked order
        const targetOrder = previousOrders.find(
          o => o.id === targetPayment.orderId || o.orderNumber === targetPayment.orderId || toValidUUID(o.id) === targetPayment.orderId
        );

        let updatedOrder: Order | null = null;
        let nextOrderStatus: Order['status'] | null = null;

        if (targetOrder) {
          if (status === 'Paid') {
            if (targetOrder.status === 'Pending') {
              nextOrderStatus = 'Processing';
            }
          } else if (status === 'Cancelled' || status === 'Failed') {
            if (targetOrder.status !== 'Cancelled') {
              nextOrderStatus = 'Cancelled';
            }
          }

          if (nextOrderStatus && nextOrderStatus !== targetOrder.status) {
            updatedOrder = {
              ...targetOrder,
              status: nextOrderStatus
            };
          }
        }

        // Optimistic state updates
        set(state => ({
          payments: (state.payments || []).map(p => p.id === paymentId ? updatedPayment : p),
          orders: updatedOrder 
            ? (state.orders || []).map(o => o.id === targetOrder!.id ? updatedOrder! : o)
            : state.orders
        }));

        const refDetails = `for Order ${targetOrder?.orderNumber || targetPayment.orderId} (Client: ${targetPayment.customerName})`;
        get().addAuditLog(
          'Payment Status Adjusted',
          `Payment status ${refDetails} adjusted to '${status}' by ${modifierName || 'staff'}.${updatedOrder ? ` Linked order ${targetOrder?.orderNumber || updatedOrder.id} status transitioned to '${updatedOrder.status}'.` : ''}`,
          'staff-modifier',
          modifierName,
          modifierRole as User['role']
        );

        // Perform DB updates
        const dbPayRes = await safeSupabaseUpsert('payments', updatedPayment);
        if (dbPayRes && !dbPayRes.success) {
          set({ 
            payments: previousPayments, 
            orders: previousOrders, 
            adminError: `Failed to update payment status: ${dbPayRes.error}` 
          });
          return { success: false, error: dbPayRes.error };
        }

        if (updatedOrder && targetOrder) {
          const dbOrderRes = await safeSupabaseUpsert('orders', { id: targetOrder.id, status: updatedOrder.status });
          if (dbOrderRes && !dbOrderRes.success) {
            set({ 
              payments: previousPayments, 
              orders: previousOrders, 
              adminError: `Failed to sync linked order status: ${dbOrderRes.error}` 
            });
            return { success: false, error: dbOrderRes.error };
          }
        }

        return { success: true };
      },

      updateSettings: async (newSettings, modifierName, modifierRole) => {
        const previousSettings = get().settings;
        const updated = { ...previousSettings, ...newSettings };
        set({ settings: updated });

        get().addAuditLog(
          'Settings Updated',
          `Boutique configuration settings updated by ${modifierName}.`,
          'staff-modifier',
          modifierName,
          modifierRole as User['role']
        );

        // Sync settings to Supabase app_settings table
        const dbRes = await safeSupabaseUpsert('app_settings', updated);
        if (dbRes && !dbRes.success) {
          set({ settings: previousSettings, adminError: `Failed to update settings: ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        return { success: true };
      },

      addProduct: async (productData, creatorName, creatorRole) => {
        const previousProducts = get().products;
        const productId = `prod-${Date.now()}`;
        const userId = get().currentUser?.id || 'admin';

        // Upload any base64 images to Supabase Storage
        const finalImages: string[] = [];
        if (productData.images) {
          for (let i = 0; i < productData.images.length; i++) {
            const img = productData.images[i];
            if (img.startsWith('data:')) {
              const uploadedPath = await uploadProductImage(userId, productId, img, i);
              finalImages.push(uploadedPath);
            } else {
              finalImages.push(img);
            }
          }
        }

        const newProduct: Product = {
          ...productData,
          images: finalImages,
          id: productId,
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
        const dbRes = await safeSupabaseInsert('products', prodPayload);
        if (dbRes && !dbRes.success) {
          set({ products: previousProducts, adminError: `Failed to add product '${newProduct.name}': ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }

        // Sync images in product_images table
        if (finalImages && finalImages.length > 0) {
          for (let i = 0; i < finalImages.length; i++) {
            await safeSupabaseInsert('product_images', {
              productId,
              imageUrl: finalImages[i],
              displayOrder: i + 1
            });
          }
        }

        // Re-sync from Supabase to resolve signed URLs
        get().syncFromSupabase();
        return { success: true };
      },

      updateProduct: async (id, updatedFields, updaterName, updaterRole) => {
        const previousProducts = get().products;
        const userId = get().currentUser?.id || 'admin';

        // Upload any new base64 images to Supabase Storage
        const finalImages: string[] = [];
        if (updatedFields.images) {
          for (let i = 0; i < updatedFields.images.length; i++) {
            const img = updatedFields.images[i];
            if (img.startsWith('data:')) {
              const uploadedPath = await uploadProductImage(userId, id, img, i);
              finalImages.push(uploadedPath);
            } else {
              finalImages.push(img);
            }
          }
        }

        const finalFields = updatedFields.images 
          ? { ...updatedFields, images: finalImages }
          : updatedFields;

        // Check for deleted images to remove from Supabase Storage
        const originalProduct = previousProducts.find(p => p.id === id || toValidUUID(p.id) === toValidUUID(id));
        if (originalProduct && originalProduct.images && updatedFields.images) {
          const removedImages = originalProduct.images.filter(
            (img: string) => isPrivateStoragePath(img) && !finalImages.includes(img)
          );
          for (const imgToDelete of removedImages) {
            try {
              const headers = await getAuthHeaders();
              if (headers.Authorization || headers['Authorization']) {
                await fetchWithRetry('/api/storage', {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({ action: 'delete', path: imgToDelete })
                });
              }
            } catch (err) {
              console.warn('Failed to delete removed image from storage:', imgToDelete, err);
            }
          }
        }

        const fullUpdatedProduct = originalProduct 
          ? { ...originalProduct, ...finalFields }
          : { id, ...finalFields };

        set(state => ({
          products: state.products.map(p => (p.id === id || toValidUUID(p.id) === toValidUUID(id)) ? (fullUpdatedProduct as Product) : p)
        }));

        get().addAuditLog(
          'Product Updated',
          `Modified fields on asset ID '${id}'.`,
          'admin-modifier',
          updaterName,
          updaterRole as User['role']
        );

        // Sync updated fields with Supabase
        const dbRes = await safeSupabaseUpsert('products', fullUpdatedProduct);
        if (dbRes && !dbRes.success) {
          set({ products: previousProducts, adminError: `Failed to update product '${fullUpdatedProduct.name || id}': ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }

        // Update product_images table
        if (updatedFields.images) {
          // Delete old image references in DB
          await safeSupabaseDelete('product_images', { product_id: toValidUUID(id) });

          // Insert new image references
          for (let i = 0; i < finalImages.length; i++) {
            await safeSupabaseInsert('product_images', {
              productId: id,
              imageUrl: finalImages[i],
              displayOrder: i + 1
            });
          }
        }

        // Re-sync from Supabase to resolve signed URLs
        get().syncFromSupabase();
        return { success: true };
      },

      deleteProduct: async (id, deleterName, deleterRole) => {
        const previousProducts = get().products;
        const productToDelete = previousProducts.find(p => p.id === id);

        // Delete all images associated with this product from Supabase Storage
        if (productToDelete && productToDelete.images) {
          for (const img of productToDelete.images) {
            if (isPrivateStoragePath(img)) {
              try {
                const headers = await getAuthHeaders();
                if (headers.Authorization || headers['Authorization']) {
                  await fetchWithRetry('/api/storage', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ action: 'delete', path: img })
                  });
                }
              } catch (err) {
                console.warn('Failed to delete image from storage during product deletion:', img, err);
              }
            }
          }
        }

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
        const dbRes = await safeSupabaseDelete('products', { id });
        if (dbRes && !dbRes.success) {
          set({ products: previousProducts, adminError: `Failed to delete product '${productToDelete?.name || id}': ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        return { success: true };
      },

      adminAddUser: async (userData, adminName, adminRole) => {
        try {
          const headers = await getAuthHeaders();
          const response = await fetchWithRetry('/api/admin/users/create', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              name: userData.name,
              email: userData.email,
              phone: userData.phone || '',
              role: userData.role || 'Customer',
              spending: userData.spending || 0,
              rewardsPoints: userData.rewardsPoints || 0,
              password: (userData as any).password
            })
          });

          const res = await response.json().catch(() => ({}));
          if (!response.ok || !res.success) {
            const errorMsg = res.error || 'Failed to create user account.';
            set({ adminError: `Failed to add user '${userData.name}': ${errorMsg}` });
            return { success: false, error: errorMsg };
          }

          const createdUser: User = {
            id: res.user.id,
            name: res.user.name || userData.name,
            email: res.user.email || userData.email,
            phone: res.user.phone || userData.phone || '',
            role: capitalizeRole(res.user.role || userData.role),
            spending: userData.spending || 0,
            rewardsPoints: userData.rewardsPoints || 0,
            source: 'db'
          };

          set(state => ({
            users: [createdUser, ...state.users.filter(u => u.id !== createdUser.id)]
          }));

          get().addAuditLog(
            'User Registered',
            `Admin registered a new user '${createdUser.name}' with role '${createdUser.role}'.`,
            'admin-modifier',
            adminName,
            adminRole as User['role']
          );

          return { success: true };
        } catch (err: any) {
          const errorMsg = err?.message || 'Failed to create user profile.';
          set({ adminError: `Failed to add user '${userData.name}': ${errorMsg}` });
          return { success: false, error: errorMsg };
        }
      },

      adminUpdateUser: async (id, updatedFields, adminName, adminRole) => {
        if (!isUUID(id)) {
          return {
            success: false,
            error: 'This record only exists locally and has no corresponding database entry to delete/update. Refresh the page — if it persists, this is a demo/seed record that should be removed from the codebase, not deleted via the admin panel.'
          };
        }
        const previousUsers = get().users;
        const previousCurrentUser = get().currentUser;
        set(state => {
          const updatedUsers = state.users.map(u => u.id === id ? { ...u, ...updatedFields } : u);
          const currentUser = state.currentUser && state.currentUser.id === id 
            ? { ...state.currentUser, ...updatedFields } 
            : state.currentUser;
          return {
            users: updatedUsers,
            currentUser
          };
        });

        const targetUser = get().users.find(u => u.id === id);
        if (targetUser) {
          get().addAuditLog(
            'User Updated',
            `Admin updated profile settings/role for '${targetUser.name}'.`,
            'admin-modifier',
            adminName,
            adminRole as User['role']
          );

          const dbRes = await safeSupabaseUpsert('profiles', targetUser);
          if (dbRes && !dbRes.success) {
            set({ users: previousUsers, currentUser: previousCurrentUser, adminError: `Failed to update user '${targetUser.name}': ${dbRes.error}` });
            return { success: false, error: dbRes.error };
          }
        }
        return { success: true };
      },

      adminDeleteUser: async (id, adminName, adminRole) => {
        if (!isUUID(id)) {
          return {
            success: false,
            error: 'This record only exists locally and has no corresponding database entry to delete/update. Refresh the page — if it persists, this is a demo/seed record that should be removed from the codebase, not deleted via the admin panel.'
          };
        }
        const previousUsers = get().users;
        const userToDelete = previousUsers.find(u => u.id === id);
        set(state => ({
          users: state.users.filter(u => u.id !== id)
        }));

        get().addAuditLog(
          'User Deletion',
          `Admin removed user profile '${userToDelete?.name || id}' from authorized registers.`,
          'admin-modifier',
          adminName,
          adminRole as User['role']
        );

        const dbRes = await safeSupabaseDelete('profiles', { id });
        if (dbRes && !dbRes.success) {
          set({ users: previousUsers, adminError: `Failed to delete user '${userToDelete?.name || id}': ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        return { success: true };
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

      deleteReview: async (productId, reviewId, modifierName, modifierRole) => {
        const previousProducts = get().products;
        set(state => ({
          products: state.products.map(p => {
            if (p.id === productId) {
              const updatedReviews = p.reviews.filter(r => r.id !== reviewId);
              const avgRating = updatedReviews.length > 0 
                ? Number((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1))
                : 5.0;
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
          'Product Review Removed',
          `Removed review '${reviewId}' from product ID '${productId}' by staff moderation.`,
          'admin-modifier',
          modifierName,
          modifierRole as User['role']
        );

        // Sync review deletion in Supabase
        const dbRes = await safeSupabaseDelete('reviews', { id: reviewId });
        if (dbRes && !dbRes.success) {
          set({ products: previousProducts, adminError: `Failed to delete review: ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }

        // Update overall product rating in products table
        const matched = get().products.find(p => p.id === productId);
        if (matched) {
          const updatedReviews = matched.reviews.filter(r => r.id !== reviewId);
          const avgRating = updatedReviews.length > 0
            ? Number((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1))
            : 5.0;
          await safeSupabaseUpsert('products', { id: productId, rating: avgRating });
        }
        return { success: true };
      },

      updateProductStockQuick: async (productId, newStock, modifierName, modifierRole) => {
        const previousProducts = get().products;
        set(state => ({
          products: state.products.map(p => p.id === productId ? { ...p, stock: newStock } : p)
        }));

        get().addAuditLog(
          'Product Stock Adjusted',
          `Quick adjusted stock level of product ID '${productId}' to ${newStock} units.`,
          'admin-modifier',
          modifierName,
          modifierRole as User['role']
        );

        // Sync to Supabase
        const dbRes = await safeSupabaseUpsert('products', { id: productId, stock: newStock });
        if (dbRes && !dbRes.success) {
          set({ products: previousProducts, adminError: `Failed to update product stock: ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        return { success: true };
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

      updateBookingStatus: async (bookingId, status, modifierName, modifierRole) => {
        const previousBookings = get().bookings;
        set(state => ({
          bookings: state.bookings.map(b => b.id === bookingId ? { ...b, status } : b)
        }));

        const booking = get().bookings?.find(b => b.id === bookingId);
        const refDetails = booking ? `for Client: ${booking.clientName} on ${booking.date}` : `ID ${bookingId}`;

        get().addAuditLog(
          'Booking Status Adjusted',
          `Booking status ${refDetails} adjusted to '${status}' by staff.`,
          'staff-modifier',
          modifierName,
          modifierRole as User['role']
        );

        // Sync booking status with Supabase (must be lowercase)
        const dbRes = await safeSupabaseUpsert('consultations', { id: bookingId, status: status.toLowerCase() });
        if (dbRes && !dbRes.success) {
          set({ bookings: previousBookings, adminError: `Failed to update booking status: ${dbRes.error}` });
          return { success: false, error: dbRes.error };
        }
        return { success: true };
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

        // Sync audit log with Supabase if actor is authorized (admin/staff or authenticated valid user UUID)
        const currentUser = get().currentUser;
        const currentUserRole = (currentUser?.role || '').toLowerCase();
        const isAdminOrStaff = ['super admin', 'admin', 'manager', 'staff'].includes(currentUserRole);
        const isValidUserUuid = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

        if (isAdminOrStaff || (currentUser?.id && currentUser.id === userId && isValidUserUuid)) {
          safeSupabaseInsert('audit_logs', newLog);
        }
      }
    }),
    {
      name: 'blue-hills-boutique-storage',
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
        savedAddresses: state.savedAddresses,
        settings: state.settings,
        currentUserId: state.currentUser?.id || null,
        appliedCoupon: state.appliedCoupon,
        selectedShippingMethod: state.selectedShippingMethod,
      }),
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
