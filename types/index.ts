export interface Review {
  id: string;
  productId?: string;
  userName: string;
  userRole?: string;
  userCompany?: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Category {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  rating: number;
  reviews: Review[];
  isNew?: boolean;
  isFeatured?: boolean;
  isDealOfTheDay?: boolean;
  discountPercentage?: number;
  dealDays?: number;
  dealHours?: number;
  dealMins?: number;
  dealSecs?: number;
  dealExpiresAt?: string | null;
}

export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Staff' | 'Customer';
export type DbUserRole = 'super admin' | 'admin' | 'manager' | 'staff' | 'customer';

export function toDisplayRole(role?: string | null): UserRole | string {
  if (!role) return 'Customer';
  const r = role.trim();
  const lower = r.toLowerCase();
  if (lower === 'super admin' || lower === 'super_admin' || lower === 'superadmin') return 'Super Admin';
  if (lower === 'admin') return 'Admin';
  if (lower === 'manager') return 'Manager';
  if (lower === 'staff') return 'Staff';
  if (lower === 'customer') return 'Customer';
  return r;
}

export function toDbRole(role?: string | null): DbUserRole | string {
  if (!role) return 'customer';
  const display = toDisplayRole(role);
  return display.toLowerCase();
}

export function normalizeRole(role?: string | null): { display: UserRole | string; db: DbUserRole | string } {
  const display = toDisplayRole(role);
  return {
    display,
    db: toDbRole(role),
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  spending: number;
  rewardsPoints: number;
  country?: string;
  district?: string;
  city?: string;
  address?: string;
  source?: 'local-demo' | 'db' | string;
}

export interface Coupon {
  id?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minSubtotal?: number;
  isActive?: boolean;
  expiresAt?: string | null;
  usageLimit?: number | null;
  timesUsed?: number;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  id: string; // unique cart item id (e.g. product.id + size + color)
  product: Product;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
  image: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  status: 'Pending' | 'Processing' | 'Delivered' | 'Cancelled';
  date: string;
  items: OrderItem[];
  shippingAddress: {
    country: string;
    district: string;
    city: string;
    address: string;
  };
  paymentMethod: 'Mobile Money' | 'Visa' | 'Cash on Delivery';
  notes?: string;
}

export interface ConsultationBooking {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  date: string;
  time: string;
  status: 'Pending' | 'Confirmed' | 'Completed';
  notes?: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  date: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Payment {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentMethod: 'Mobile Money' | 'Visa' | 'Cash on Delivery';
  status: 'Paid' | 'Pending' | 'Refunded' | 'Failed' | 'Cancelled';
  transactionId: string;
  date: string;
}

export interface AppSettings {
  showroomHours: string;
  supportPhone: string;
  conciergePhone?: string;
  freeShippingThreshold: number;
  taxRate: number;
  aiGreetingPrefix: string;
  enableNewsBanner: boolean;
  maintenanceMode: boolean;
  currencySymbol: string;
  enableSecretOffer: boolean;
  paymentMethods: {
    mobileMoney: boolean;
    visa: boolean;
    cashOnDelivery: boolean;
  };
}

export interface Testimonial {
  id?: string;
  quote: string;
  name: string;
  role?: string;
  company?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SavedAddress {
  id: string;
  user_id?: string;
  label?: string;
  country: string;
  district: string;
  city: string;
  address: string;
  is_default?: boolean;
  created_at?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export interface StylistConversation {
  id: string;
  user_id?: string | null;
  messages: ChatMessage[];
  updated_at?: string;
}



