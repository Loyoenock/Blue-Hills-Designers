'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  Product, User, CartItem, Order, ConsultationBooking, 
  NewsletterSubscriber, AuditLog, Review 
} from '../types';

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
  login: (email: string, role?: string) => { success: boolean; error?: string };
  register: (name: string, email: string, phone: string, role?: string) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (name: string, phone: string) => void;
  updatePassword: (password: string) => { success: boolean };

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

      login: (email, role) => {
        const users = get().users;
        // Case-insensitive email search
        let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (!user && role) {
          // Auto create user if role specified (e.g. login override)
          const newUser: User = {
            id: `usr-${Date.now()}`,
            name: email.split('@')[0].toUpperCase(),
            email,
            role: role as User['role'],
            spending: 0,
            rewardsPoints: 0
          };
          set(state => ({ users: [...state.users, newUser], currentUser: newUser }));
          return { success: true };
        }

        if (user) {
          set({ currentUser: user });
          get().addAuditLog(
            'User Login',
            `User logged in securely. Session initiated.`,
            user.id,
            user.name,
            user.role
          );
          return { success: true };
        }

        return { success: false, error: 'Executive email address not registered.' };
      },

      register: (name, email, phone, role = 'Customer') => {
        const users = get().users;
        const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        
        if (exists) {
          return { success: false, error: 'An account with this premium email already exists.' };
        }

        const newUser: User = {
          id: `usr-${Date.now()}`,
          name,
          email,
          phone,
          role: role as User['role'],
          spending: 0,
          rewardsPoints: 0
        };

        set(state => ({
          users: [...state.users, newUser],
          currentUser: newUser
        }));

        get().addAuditLog(
          'User Registration',
          `New elite profile created.`,
          newUser.id,
          newUser.name,
          newUser.role
        );

        return { success: true };
      },

      logout: () => {
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
        set({ currentUser: null });
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
      },

      updatePassword: (password) => {
        const current = get().currentUser;
        if (!current) return { success: false };

        get().addAuditLog(
          'Security Updated',
          `Account password reset successfully with high strength encryption keys.`,
          current.id,
          current.name,
          current.role
        );
        return { success: true };
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
        } else {
          get().addAuditLog(
            'Guest Order Placement',
            `Corporate purchase of $${newOrder.amount} placed successfully via guest registry.`,
            'guest',
            newOrder.customerName,
            'Customer'
          );
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
      },

      updateBookingStatus: (bookingId, status) => {
        set(state => ({
          bookings: state.bookings.map(b => b.id === bookingId ? { ...b, status } : b)
        }));
      },

      subscribeNewsletter: (email) => {
        const subs = get().subscribers;
        const exists = subs.find(s => s.email.toLowerCase() === email.toLowerCase());
        
        if (exists) {
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

        return { success: true, message: 'Welcome to the Gentlemen\'s Circle. Exquisite journals will arrive soon.' };
      },

      toggleWishlist: (productId) => {
        const wishlist = get().wishlist;
        const exists = wishlist.includes(productId);
        if (exists) {
          set(state => ({ wishlist: state.wishlist.filter(id => id !== productId) }));
        } else {
          set(state => ({ wishlist: [...state.wishlist, productId] }));
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
