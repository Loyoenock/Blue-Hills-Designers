export interface Review {
  id: string;
  userName: string;
  userRole?: string;
  userCompany?: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: 'Suits' | 'Shirts' | 'Shoes' | 'Accessories';
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
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'Super Admin' | 'Admin' | 'Manager' | 'Staff' | 'Customer';
  spending: number;
  rewardsPoints: number;
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
  status: 'Paid' | 'Pending' | 'Refunded' | 'Failed';
  transactionId: string;
  date: string;
}

