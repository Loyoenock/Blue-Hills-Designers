'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Calendar, ChevronRight, Compass, CreditCard, DollarSign, 
  Download, Edit, Eye, Filter, Grid, HelpCircle, Layers, LogOut, 
  Plus, Printer, RefreshCw, Search, ShieldAlert, ShoppingBag, 
  Trash2, TrendingUp, Users, X, FileText, CheckCircle, Upload, Settings,
  Star, MessageSquare, ChevronDown, ChevronUp, Tag
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSafeImageSrc } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, User, Coupon, Category, Testimonial } from '../../types';
import { getSupabaseClient } from '../../lib/supabase';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';

export default function Admin() {
  const router = useRouter();
  const { 
    currentUser, login, products, orders, users, auditLogs, payments, settings, bookings, coupons, categories, testimonials,
    adminError, clearAdminError,
    addProduct, updateProduct, deleteProduct, updateOrderStatus, updatePaymentStatus,
    adminAddUser, adminUpdateUser, adminDeleteUser, updateSettings,
    deleteReview, updateProductStockQuick, updateBookingStatus,
    addCoupon, updateCoupon, deleteCoupon,
    addCategory, updateCategory, deleteCategory,
    addTestimonial, updateTestimonial, deleteTestimonial
  } = useStore();

  // Admin-specific Realtime subscriptions for orders and profiles
  useRealtimeSync({ orders: true, profiles: true });

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'categories' | 'testimonials' | 'coupons' | 'orders' | 'users' | 'logs' | 'payments' | 'settings' | 'bookings'>('dashboard');

  // Testimonial Management State
  const [testimonialSearch, setTestimonialSearch] = useState('');
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [testiQuoteInput, setTestiQuoteInput] = useState('');
  const [testiNameInput, setTestiNameInput] = useState('');
  const [testiRoleInput, setTestiRoleInput] = useState('');
  const [testiCompanyInput, setTestiCompanyInput] = useState('');
  const [testiDisplayOrderInput, setTestiDisplayOrderInput] = useState<number>(1);
  const [testiIsActiveInput, setTestiIsActiveInput] = useState<boolean>(true);
  const [isDeleteTestimonialModalOpen, setIsDeleteTestimonialModalOpen] = useState(false);
  const [testimonialToDelete, setTestimonialToDelete] = useState<Testimonial | null>(null);

  const handleOpenTestimonialModal = (t?: Testimonial) => {
    if (t) {
      setEditingTestimonial(t);
      setTestiQuoteInput(t.quote);
      setTestiNameInput(t.name);
      setTestiRoleInput(t.role || '');
      setTestiCompanyInput(t.company || '');
      setTestiDisplayOrderInput(t.displayOrder || 1);
      setTestiIsActiveInput(t.isActive ?? true);
    } else {
      setEditingTestimonial(null);
      setTestiQuoteInput('');
      setTestiNameInput('');
      setTestiRoleInput('');
      setTestiCompanyInput('');
      setTestiDisplayOrderInput(((testimonials || []).length + 1));
      setTestiIsActiveInput(true);
    }
    setIsTestimonialModalOpen(true);
  };

  const handleSaveTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testiQuoteInput.trim() || !testiNameInput.trim()) return;

    const adminName = currentUser?.name || 'Master Admin';
    const adminRole = currentUser?.role || 'Super Admin';

    const payload = {
      quote: testiQuoteInput.trim(),
      name: testiNameInput.trim(),
      role: testiRoleInput.trim(),
      company: testiCompanyInput.trim(),
      displayOrder: Number(testiDisplayOrderInput) || 1,
      isActive: testiIsActiveInput
    };

    if (editingTestimonial && editingTestimonial.id) {
      await updateTestimonial(editingTestimonial.id, payload, adminName, adminRole);
    } else {
      await addTestimonial(payload, adminName, adminRole);
    }
    setIsTestimonialModalOpen(false);
  };

  const handleOpenDeleteTestimonialModal = (t: Testimonial) => {
    setTestimonialToDelete(t);
    setIsDeleteTestimonialModalOpen(true);
  };

  const handleConfirmDeleteTestimonial = async () => {
    if (testimonialToDelete && testimonialToDelete.id) {
      await deleteTestimonial(testimonialToDelete.id, currentUser?.name || 'Master Admin', currentUser?.role || 'Super Admin');
    }
    setIsDeleteTestimonialModalOpen(false);
    setTestimonialToDelete(null);
  };

  // Category Management State
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catNameInput, setCatNameInput] = useState('');
  const [catSlugInput, setCatSlugInput] = useState('');
  const [catDescInput, setCatDescInput] = useState('');
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [categoryDeleteError, setCategoryDeleteError] = useState<string | null>(null);

  const handleOpenCategoryModal = (cat?: Category) => {
    if (cat) {
      setEditingCategory(cat);
      setCatNameInput(cat.name);
      setCatSlugInput(cat.slug);
      setCatDescInput(cat.description || '');
    } else {
      setEditingCategory(null);
      setCatNameInput('');
      setCatSlugInput('');
      setCatDescInput('');
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameInput.trim()) return;
    const adminName = currentUser?.name || 'Master Admin';
    const adminRole = currentUser?.role || 'Super Admin';
    const slug = catSlugInput.trim() ? catSlugInput.trim().toLowerCase() : catNameInput.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    if (editingCategory) {
      await updateCategory(editingCategory.id || editingCategory.slug, {
        name: catNameInput.trim(),
        slug,
        description: catDescInput.trim()
      }, adminName, adminRole);
    } else {
      await addCategory({
        name: catNameInput.trim(),
        slug,
        description: catDescInput.trim()
      }, adminName, adminRole);
    }
    setIsCategoryModalOpen(false);
  };

  const handleOpenDeleteCategoryModal = (cat: Category) => {
    setCategoryToDelete(cat);
    setCategoryDeleteError(null);
    const count = (products || []).filter(p => p.category?.toLowerCase() === cat.name.toLowerCase() || p.category?.toLowerCase() === cat.slug.toLowerCase()).length;
    if (count > 0) {
      setCategoryDeleteError(`Cannot delete '${cat.name}': ${count} product(s) are assigned to this category. Reassign or remove those products first.`);
    }
    setIsDeleteCategoryModalOpen(true);
  };

  const handleConfirmDeleteCategory = async () => {
    if (categoryToDelete && !categoryDeleteError) {
      const adminName = currentUser?.name || 'Master Admin';
      const adminRole = currentUser?.role || 'Super Admin';
      const res = await deleteCategory(categoryToDelete.id || categoryToDelete.slug, adminName, adminRole);
      if (!res.success) {
        setCategoryDeleteError(res.message || 'Failed to delete category.');
        return;
      }
      setIsDeleteCategoryModalOpen(false);
      setCategoryToDelete(null);
    }
  };

  // Form and search/filter states for User Management
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPhone, setUPhone] = useState('');
  const [uRole, setURole] = useState<User['role']>('Customer');
  const [uSpending, setUSpending] = useState(0);
  const [uRewardsPoints, setURewardsPoints] = useState(0);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Coupon Management State
  const [couponSearch, setCouponSearch] = useState('');
  const [couponTypeFilter, setCouponTypeFilter] = useState('All');
  const [couponStatusFilter, setCouponStatusFilter] = useState('All');
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [cpnCode, setCpnCode] = useState('');
  const [cpnDiscountType, setCpnDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [cpnDiscountValue, setCpnDiscountValue] = useState<number>(10);
  const [cpnMinSubtotal, setCpnMinSubtotal] = useState<string>('');
  const [cpnExpiresAt, setCpnExpiresAt] = useState<string>('');
  const [cpnUsageLimit, setCpnUsageLimit] = useState<string>('');
  const [cpnIsActive, setCpnIsActive] = useState<boolean>(true);
  const [isDeleteCouponModalOpen, setIsDeleteCouponModalOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  const handleOpenCouponModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCpnCode(coupon.code);
      setCpnDiscountType(coupon.discountType);
      setCpnDiscountValue(coupon.discountValue);
      setCpnMinSubtotal(coupon.minSubtotal !== undefined && coupon.minSubtotal !== null ? String(coupon.minSubtotal) : '');
      setCpnExpiresAt(coupon.expiresAt ? coupon.expiresAt.split('T')[0] : '');
      setCpnUsageLimit(coupon.usageLimit !== undefined && coupon.usageLimit !== null ? String(coupon.usageLimit) : '');
      setCpnIsActive(coupon.isActive ?? true);
    } else {
      setEditingCoupon(null);
      setCpnCode('');
      setCpnDiscountType('percentage');
      setCpnDiscountValue(10);
      setCpnMinSubtotal('');
      setCpnExpiresAt('');
      setCpnUsageLimit('');
      setCpnIsActive(true);
    }
    setIsCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpnCode.trim()) return;

    const payload = {
      code: cpnCode.trim().toUpperCase(),
      discountType: cpnDiscountType,
      discountValue: Number(cpnDiscountValue) || 0,
      minSubtotal: cpnMinSubtotal ? Number(cpnMinSubtotal) : undefined,
      expiresAt: cpnExpiresAt ? new Date(cpnExpiresAt).toISOString() : null,
      usageLimit: cpnUsageLimit ? Number(cpnUsageLimit) : null,
      isActive: cpnIsActive
    };

    if (editingCoupon && editingCoupon.id) {
      await updateCoupon(editingCoupon.id, payload, currentUser?.name || 'Admin', currentUser?.role || 'Staff');
    } else {
      await addCoupon(payload, currentUser?.name || 'Admin', currentUser?.role || 'Staff');
    }

    setIsCouponModalOpen(false);
  };

  const handleOpenDeleteCouponModal = (coupon: Coupon) => {
    setCouponToDelete(coupon);
    setIsDeleteCouponModalOpen(true);
  };

  const handleConfirmDeleteCoupon = async () => {
    if (couponToDelete && couponToDelete.id) {
      await deleteCoupon(couponToDelete.id, currentUser?.name || 'Admin', currentUser?.role || 'Staff');
    }
    setIsDeleteCouponModalOpen(false);
    setCouponToDelete(null);
  };

  // Fast bypass for testing/evaluation
  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Form states for ADD / EDIT Product
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [imageSourceMode, setImageSourceMode] = useState<'url' | 'upload'>('url');
  const [isDragging, setIsDragging] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pCategory, setPCategory] = useState('Suits');
  const [pPrice, setPPrice] = useState(0);
  const [pStock, setPStock] = useState(10);
  const [pSizes, setPSizes] = useState<string[]>(['48R', '50R', '52R']);
  const [pColors, setPColors] = useState<string[]>(['Midnight Navy', 'Charcoal']);
  const [pSizesInput, setPSizesInput] = useState('48R, 50R, 52R');
  const [pColorsInput, setPColorsInput] = useState('Midnight Navy, Charcoal');
  const [pImages, setPImages] = useState<string[]>(['https://lh3.googleusercontent.com/aida-public/AB6AXuAi8UecRS-XnyrMnJeZL1BQVfI-k0R_gJR1LOmjQdttfkYhoplY3uVFZbanSoR2yMSezA5cR3e61-ad015ej7NHi3pxyGxrkLADT7Q_LZ1GutmVRTp4mDhq-j2uiwCqyCvXNPehFnXRH-LxmBTxPsLco-fna_xAO86vswBmBY2C-2KyB_lA85jIzmULF-qrB23JFySnGOOTlEGa9x7PfP1HLr3OUhu-yYHF7BQNYYBXL3_XdDjAitK2gg']);
  const [pIsNew, setPIsNew] = useState(false);
  const [pIsFeatured, setPIsFeatured] = useState(false);
  const [pIsDeal, setPIsDeal] = useState(false);
  const [pDiscountPercentage, setPDiscountPercentage] = useState(0);
  const [pSecretDays, setPSecretDays] = useState(0);
  const [pSecretHours, setPSecretHours] = useState(14);
  const [pSecretMins, setPSecretMins] = useState(42);
  const [pSecretSecs, setPSecretSecs] = useState(19);

  // Delete product safety confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Filter products state
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState('All');
  const [productLabelFilter, setProductLabelFilter] = useState('All');
  const [productSort, setProductSort] = useState('Default');

  // Track expanded reviews for products
  const [expandedReviewsProductId, setExpandedReviewsProductId] = useState<string | null>(null);

  // Filter orders state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');

  // Filter payments state
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');

  // Filter bookings state
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('All');

  // Filter logs state
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('All');

  // Selected Order for detail overlay modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Boutique Settings state
  const [sHours, setSHours] = useState(() => settings?.showroomHours || '');
  const [sPhone, setSPhone] = useState(() => settings?.conciergePhone || settings?.supportPhone || '');
  const [sThreshold, setSThreshold] = useState(() => settings?.freeShippingThreshold || 0);
  const [sTaxRate, setSTaxRate] = useState(() => settings?.taxRate || 0);
  const [sGreeting, setSGreet] = useState(() => settings?.aiGreetingPrefix || '');
  const [sBanner, setSBanner] = useState(() => settings?.enableNewsBanner !== false);
  const [sMaintenance, setSMaintenance] = useState(() => !!settings?.maintenanceMode);
  const [sCurrency, setSCurrency] = useState(() => settings?.currencySymbol || 'Ugx');
  const [sSecretOffer, setSSecretOffer] = useState(() => settings?.enableSecretOffer !== false);
  const [sPayMomo, setSPayMomo] = useState(() => settings?.paymentMethods?.mobileMoney !== false);
  const [sPayVisa, setSPayVisa] = useState(() => settings?.paymentMethods?.visa !== false);
  const [sPayCod, setSPayCod] = useState(() => settings?.paymentMethods?.cashOnDelivery !== false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  // Initialize settings states
  useEffect(() => {
    if (settings) {
      setSHours(settings.showroomHours || '');
      setSPhone(settings.conciergePhone || settings.supportPhone || '');
      setSThreshold(settings.freeShippingThreshold || 0);
      setSTaxRate(settings.taxRate || 0);
      setSGreet(settings.aiGreetingPrefix || '');
      setSBanner(settings.enableNewsBanner !== false);
      setSMaintenance(!!settings.maintenanceMode);
      setSCurrency(settings.currencySymbol || 'Ugx');
      setSSecretOffer(settings.enableSecretOffer !== false);
      setSPayMomo(settings.paymentMethods?.mobileMoney !== false);
      setSPayVisa(settings.paymentMethods?.visa !== false);
      setSPayCod(settings.paymentMethods?.cashOnDelivery !== false);
    }
  }, [settings]);

  const paymentStats = useMemo(() => {
    const list = payments || [];
    const settledSum = list.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    const pendingSum = list.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);
    const refundedSum = list.filter(p => p.status === 'Refunded').reduce((sum, p) => sum + p.amount, 0);
    const failedSum = list.filter(p => p.status === 'Failed').reduce((sum, p) => sum + p.amount, 0);
    return { settledSum, pendingSum, refundedSum, failedSum };
  }, [payments]);

  // Filter products list
  const filteredProducts = useMemo(() => {
    let list = products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                          p.description.toLowerCase().includes(productSearch.toLowerCase());
      const matchCat = productCategoryFilter === 'All' || p.category === productCategoryFilter;
      
      const matchStock = stockStatusFilter === 'All' || 
                         (stockStatusFilter === 'In Stock' && p.stock > 0) ||
                         (stockStatusFilter === 'Low Stock' && p.stock > 0 && p.stock <= 3) ||
                         (stockStatusFilter === 'Out of Stock' && p.stock === 0);
                         
      const matchLabel = productLabelFilter === 'All' ||
                         (productLabelFilter === 'New' && p.isNew) ||
                         (productLabelFilter === 'Featured' && p.isFeatured) ||
                         (productLabelFilter === 'Secret Offer' && p.isDealOfTheDay);
                         
      return matchSearch && matchCat && matchStock && matchLabel;
    });
    
    if (productSort === 'PriceAsc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (productSort === 'PriceDesc') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (productSort === 'StockAsc') {
      list = [...list].sort((a, b) => a.stock - b.stock);
    } else if (productSort === 'StockDesc') {
      list = [...list].sort((a, b) => b.stock - a.stock);
    } else if (productSort === 'NameAsc') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return list;
  }, [products, productSearch, productCategoryFilter, stockStatusFilter, productLabelFilter, productSort]);

  const filteredCoupons = useMemo(() => {
    return (coupons || []).filter(c => {
      const matchesSearch = c.code.toLowerCase().includes(couponSearch.toLowerCase());
      const matchesType = couponTypeFilter === 'All' || c.discountType === couponTypeFilter;
      const matchesStatus = couponStatusFilter === 'All' 
        ? true 
        : couponStatusFilter === 'Active' 
          ? c.isActive !== false 
          : c.isActive === false;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [coupons, couponSearch, couponTypeFilter, couponStatusFilter]);

  const filteredCategories = useMemo(() => {
    return (categories || []).filter(c => {
      const query = categorySearch.toLowerCase().trim();
      if (!query) return true;
      return (
        c.name.toLowerCase().includes(query) ||
        c.slug.toLowerCase().includes(query) ||
        (c.description || '').toLowerCase().includes(query)
      );
    });
  }, [categories, categorySearch]);

  const filteredTestimonials = useMemo(() => {
    return (testimonials || [])
      .filter(t => {
        const query = testimonialSearch.toLowerCase().trim();
        if (!query) return true;
        return (
          t.quote.toLowerCase().includes(query) ||
          t.name.toLowerCase().includes(query) ||
          (t.role || '').toLowerCase().includes(query) ||
          (t.company || '').toLowerCase().includes(query)
        );
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [testimonials, testimonialSearch]);

  if (!mounted) return null;

  // Authorization Shield
  const isAuthorized = currentUser && (currentUser.role === 'Super Admin' || currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'Staff');
  const userRole = currentUser ? currentUser.role : 'Guest';

  // Role based access restrictions
  const canModifyProducts = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Manager';
  const canModifyOrders = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Manager' || userRole === 'Staff';
  const canDeleteProducts = userRole === 'Super Admin' || userRole === 'Admin';
  const canSeeLogs = userRole === 'Super Admin' || userRole === 'Admin';
  const canSeeSettings = userRole === 'Super Admin' || userRole === 'Admin';
  const canSeeCoupons = userRole === 'Super Admin' || userRole === 'Admin';
  const canSeeCategories = userRole === 'Super Admin' || userRole === 'Admin';
  const canModifyCategories = userRole === 'Super Admin' || userRole === 'Admin';
  const canSeeTestimonials = userRole === 'Super Admin' || userRole === 'Admin';
  const canModifyTestimonials = userRole === 'Super Admin' || userRole === 'Admin';
  const canModifyUsers = userRole === 'Super Admin' || userRole === 'Admin';

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-black">
        <main className="max-w-md mx-auto px-4 py-24 text-center space-y-6 flex-1 flex flex-col justify-center">
          <div className="w-16 h-16 rounded-full bg-red-950/20 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl text-white font-bold">BHD Security Intercept</h3>
            <p className="text-white/40 text-xs font-light max-w-xs mx-auto leading-relaxed">
              This panel is restricted to Super Admins, Managers, and Staff. Please sign in with an authorized profile to bypass.
            </p>
          </div>
          <div className="space-y-3">
            <Link 
              href="/login" 
              className="w-full bg-[#5F39FF] text-white py-3 rounded-lg text-xs font-semibold uppercase tracking-widest text-center transition-all block"
              id="bypass-admin-btn"
            >
              Sign In with Authorized Credentials
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Dashboard calculations
  const totalRevenue = orders
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.amount, 0);

  const activeCustomers = users.filter(u => u.role === 'Customer').length;

  // Filter orders list
  const filteredOrders = orders.filter(o => {
    const matchSearch = o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) || o.id.toLowerCase().includes(orderSearch.toLowerCase());
    const matchStatus = orderStatusFilter === 'All' || o.status === orderStatusFilter;
    return matchSearch && matchStatus;
  });

  // Filter users list
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                        (u.phone && u.phone.toLowerCase().includes(userSearch.toLowerCase()));
    const matchRole = userRoleFilter === 'All' || u.role === userRoleFilter;
    return matchSearch && matchRole;
  });

  // Filter payments list
  const filteredPayments = (payments || []).filter(p => {
    const matchSearch = p.customerName.toLowerCase().includes(paymentSearch.toLowerCase()) || 
                        p.id.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        p.orderId.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        p.transactionId.toLowerCase().includes(paymentSearch.toLowerCase());
    const matchStatus = paymentStatusFilter === 'All' || p.status === paymentStatusFilter;
    const matchMethod = paymentMethodFilter === 'All' || p.paymentMethod === paymentMethodFilter;
    return matchSearch && matchStatus && matchMethod;
  });

  // Filter bookings list
  const filteredBookings = (bookings || []).filter(b => {
    const matchSearch = b.clientName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
                        b.clientEmail.toLowerCase().includes(bookingSearch.toLowerCase()) ||
                        (b.clientPhone && b.clientPhone.toLowerCase().includes(bookingSearch.toLowerCase())) ||
                        b.id.toLowerCase().includes(bookingSearch.toLowerCase());
    const matchStatus = bookingStatusFilter === 'All' || b.status === bookingStatusFilter;
    return matchSearch && matchStatus;
  });

  // Filter logs list
  const filteredLogs = (auditLogs || []).filter(log => {
    const matchSearch = log.details.toLowerCase().includes(logSearch.toLowerCase()) || 
                        log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
                        log.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
                        log.userRole.toLowerCase().includes(logSearch.toLowerCase());
    const matchAction = logActionFilter === 'All' || log.action === logActionFilter;
    return matchSearch && matchAction;
  });

  // Handle Save Boutique Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      showroomHours: sHours,
      conciergePhone: sPhone,
      supportPhone: sPhone,
      freeShippingThreshold: Number(sThreshold),
      taxRate: Number(sTaxRate),
      aiGreetingPrefix: sGreeting,
      enableNewsBanner: sBanner,
      maintenanceMode: sMaintenance,
      currencySymbol: sCurrency,
      enableSecretOffer: sSecretOffer,
      paymentMethods: {
        mobileMoney: sPayMomo,
        visa: sPayVisa,
        cashOnDelivery: sPayCod
      }
    }, currentUser?.name || 'Master Admin', currentUser?.role || 'Super Admin');

    setSettingsSuccess(true);
    setTimeout(() => {
      setSettingsSuccess(false);
    }, 4000);
  };

  // Handle open Product create/edit modal
  const handleOpenProductModal = (prod: Product | null = null) => {
    if (!canModifyProducts) {
      alert("Security alert: Your role level does not authorize product mutations.");
      return;
    }
    if (prod) {
      setEditingProduct(prod);
      setPName(prod.name);
      setPDesc(prod.description);
      setPCategory(prod.category);
      setPPrice(prod.price);
      setPStock(prod.stock);
      setPSizes(prod.sizes);
      setPColors(prod.colors);
      setPSizesInput(prod.sizes ? prod.sizes.join(', ') : '');
      setPColorsInput(prod.colors ? prod.colors.join(', ') : '');
      setPImages(prod.images);
      setPIsNew(!!prod.isNew);
      setPIsFeatured(!!prod.isFeatured);
      setPIsDeal(!!prod.isDealOfTheDay);
      setPDiscountPercentage(prod.discountPercentage || 0);
      setPSecretDays(prod.dealDays !== undefined ? prod.dealDays : 0);
      setPSecretHours(prod.dealHours !== undefined ? prod.dealHours : 14);
      setPSecretMins(prod.dealMins !== undefined ? prod.dealMins : 42);
      setPSecretSecs(prod.dealSecs !== undefined ? prod.dealSecs : 19);
      
      // Auto-detect mode based on image type
      if (prod.images && prod.images[0] && prod.images[0].startsWith('data:')) {
        setImageSourceMode('upload');
      } else {
        setImageSourceMode('url');
      }
    } else {
      setEditingProduct(null);
      setPName('');
      setPDesc('');
      setPCategory('Suits');
      setPPrice(450);
      setPStock(10);
      setPSizes(['48R', '50R', '52R']);
      setPColors(['Midnight Navy', 'Charcoal']);
      setPSizesInput('48R, 50R, 52R');
      setPColorsInput('Midnight Navy, Charcoal');
      setPImages(['https://lh3.googleusercontent.com/aida-public/AB6AXuAi8UecRS-XnyrMnJeZL1BQVfI-k0R_gJR1LOmjQdttfkYhoplY3uVFZbanSoR2yMSezA5cR3e61-ad015ej7NHi3pxyGxrkLADT7Q_LZ1GutmVRTp4mDhq-j2uiwCqyCvXNPehFnXRH-LxmBTxPsLco-fna_xAO86vswBmBY2C-2KyB_lA85jIzmULF-qrB23JFySnGOOTlEGa9x7PfP1HLr3OUhu-yYHF7BQNYYBXL3_XdDjAitK2gg']);
      setPIsNew(true);
      setPIsFeatured(false);
      setPIsDeal(false);
      setPDiscountPercentage(0);
      setPSecretDays(0);
      setPSecretHours(14);
      setPSecretMins(42);
      setPSecretSecs(19);
      setImageSourceMode('url');
    }
    setIsProductModalOpen(true);
  };

  const resizeAndStandardizeImage = (dataUrl: string, targetWidth = 750, targetHeight = 1000): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Fill background with exact brand off-white `#F7F5F0`
        ctx.fillStyle = '#F7F5F0';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const imgWidth = img.width;
        const imgHeight = img.height;
        const targetRatio = targetWidth / targetHeight;
        const imgRatio = imgWidth / imgHeight;

        let drawWidth = targetWidth;
        let drawHeight = targetHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (imgRatio > targetRatio) {
          // Image is wider than 3:4, fit to width and center vertically
          drawWidth = targetWidth;
          drawHeight = targetWidth / imgRatio;
          offsetY = (targetHeight - drawHeight) / 2;
        } else {
          // Image is taller than 3:4, fit to height and center horizontally
          drawHeight = targetHeight;
          drawWidth = targetHeight * imgRatio;
          offsetX = (targetWidth - drawWidth) / 2;
        }

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
      img.src = dataUrl;
    });
  };

  const handleImageFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const standardizedResult = await resizeAndStandardizeImage(reader.result);
          setPImages([standardizedResult]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  // Save product (create or update)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const operatorName = currentUser?.name || 'Master Admin';
    const operatorRole = currentUser?.role || 'Super Admin';
    
    const finalSizes = pSizesInput.split(',').map(s => s.trim()).filter(s => s !== '');
    const finalColors = pColorsInput.split(',').map(c => c.trim()).filter(c => c !== '');

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: pName,
        description: pDesc,
        category: pCategory as any,
        price: Number(pPrice),
        stock: Number(pStock),
        sizes: finalSizes,
        colors: finalColors,
        images: pImages,
        isNew: pIsNew,
        isFeatured: pIsFeatured,
        isDealOfTheDay: pIsDeal,
        discountPercentage: pIsDeal ? Number(pDiscountPercentage) : 0,
        dealDays: pIsDeal ? Number(pSecretDays) : undefined,
        dealHours: pIsDeal ? Number(pSecretHours) : undefined,
        dealMins: pIsDeal ? Number(pSecretMins) : undefined,
        dealSecs: pIsDeal ? Number(pSecretSecs) : undefined
      }, operatorName, operatorRole);
    } else {
      addProduct({
        name: pName,
        description: pDesc,
        category: pCategory as any,
        price: Number(pPrice),
        stock: Number(pStock),
        sizes: finalSizes,
        colors: finalColors,
        images: pImages,
        isNew: pIsNew,
        isFeatured: pIsFeatured,
        isDealOfTheDay: pIsDeal,
        discountPercentage: pIsDeal ? Number(pDiscountPercentage) : 0,
        dealDays: pIsDeal ? Number(pSecretDays) : undefined,
        dealHours: pIsDeal ? Number(pSecretHours) : undefined,
        dealMins: pIsDeal ? Number(pSecretMins) : undefined,
        dealSecs: pIsDeal ? Number(pSecretSecs) : undefined
      }, operatorName, operatorRole);
    }
    setIsProductModalOpen(false);
  };

  // Handle open delete safety confirmation
  const handleOpenDeleteModal = (prod: Product) => {
    if (!canDeleteProducts) {
      alert("Security alert: Super Admin or Admin authorization required for product hard deletions.");
      return;
    }
    setProductToDelete(prod);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      const operatorName = currentUser?.name || 'Master Admin';
      const operatorRole = currentUser?.role || 'Super Admin';
      deleteProduct(productToDelete.id, operatorName, operatorRole);
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    }
  };

  // User form modal helpers
  const handleOpenUserModal = (user: User | null = null) => {
    if (!canModifyUsers) {
      alert("Security alert: Your role level does not authorize user mutations.");
      return;
    }
    if (user) {
      setEditingUser(user);
      setUName(user.name);
      setUEmail(user.email);
      setUPhone(user.phone || '');
      setURole(user.role);
      setUSpending(user.spending);
      setURewardsPoints(user.rewardsPoints);
    } else {
      setEditingUser(null);
      setUName('');
      setUEmail('');
      setUPhone('');
      setURole('Customer');
      setUSpending(0);
      setURewardsPoints(0);
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    const adminName = currentUser?.name || 'Master Admin';
    const adminRole = currentUser?.role || 'Super Admin';

    if (editingUser) {
      adminUpdateUser(editingUser.id, {
        name: uName,
        email: uEmail,
        phone: uPhone,
        role: uRole,
        spending: Number(uSpending),
        rewardsPoints: Number(uRewardsPoints)
      }, adminName, adminRole);
    } else {
      adminAddUser({
        name: uName,
        email: uEmail,
        phone: uPhone,
        role: uRole,
        spending: Number(uSpending),
        rewardsPoints: Number(uRewardsPoints)
      }, adminName, adminRole);
    }
    setIsUserModalOpen(false);
  };

  const handleOpenDeleteUserModal = (user: User) => {
    if (!canModifyUsers) {
      alert("Security alert: Your role level does not authorize user hard deletions.");
      return;
    }
    setUserToDelete(user);
    setIsDeleteUserModalOpen(true);
  };

  const handleConfirmDeleteUser = () => {
    if (userToDelete) {
      const adminName = currentUser?.name || 'Master Admin';
      const adminRole = currentUser?.role || 'Super Admin';
      adminDeleteUser(userToDelete.id, adminName, adminRole);
      setIsDeleteUserModalOpen(false);
      setUserToDelete(null);
    }
  };

  // Handle export or print orders
  const handleExportData = (type: 'csv' | 'print') => {
    if (type === 'print') {
      window.print();
    } else {
      alert("Compiling secure order database ledger... CSV downloaded successfully.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#0A0A0A] text-white">

      {/* Admin Panel Header */}
      <div className="border-b border-white/5 bg-[#111111]/60 py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-red-500 font-mono font-bold">Secure Command Core</span>
            </div>
            <h1 className="font-serif text-3xl text-white tracking-tight font-medium">BHD Operations Console</h1>
            <p className="text-white/40 text-xs font-mono">
              Role: <span className="text-[#20D9A1] font-semibold">{currentUser.name} ({currentUser.role})</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Operations:</span>
            <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded">
              {currentUser.role === 'Super Admin' ? 'Root Access' : 'Limited Access'}
            </span>
          </div>
        </div>
      </div>

      {/* Non-blocking Admin Error Banner */}
      {adminError && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 w-full">
          <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-4 flex items-center justify-between text-red-200 text-sm shadow-lg">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
              <span>{adminError}</span>
            </div>
            <button
              onClick={clearAdminError}
              className="text-red-400 hover:text-white p-1 rounded-lg transition-colors ml-4 shrink-0"
              title="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ADMIN SIDEBAR CONTROLS (3 columns on lg) */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-4 space-y-1.5 shadow-xl">
            {[
              { id: 'dashboard', name: 'Boutique Pulse', icon: BarChart },
              { id: 'products', name: 'Apparel Registry', icon: Grid },
              { id: 'categories', name: 'Categories', icon: Layers, count: (categories || []).length },
              { id: 'testimonials', name: 'Testimonials', icon: MessageSquare, count: (testimonials || []).length },
              { id: 'coupons', name: 'Coupons', icon: Tag, count: (coupons || []).length },
              { id: 'orders', name: 'Order Ledger', icon: ShoppingBag, count: orders.length },
              { id: 'bookings', name: 'Style Bookings', icon: Calendar, count: (bookings || []).length },
              { id: 'payments', name: 'Payment Ledger', icon: CreditCard, count: (payments || []).length },
              { id: 'users', name: 'Authorized Staff', icon: Users },
              { id: 'logs', name: 'Security Audits', icon: FileText, count: auditLogs.length },
              { id: 'settings', name: 'Boutique Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              
              if (tab.id === 'categories' && !canSeeCategories) return null;
              if (tab.id === 'testimonials' && !canSeeTestimonials) return null;
              if (tab.id === 'coupons' && !canSeeCoupons) return null;
              if (tab.id === 'logs' && !canSeeLogs) return null;
              if (tab.id === 'settings' && !canSeeSettings) return null;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-left transition-all cursor-pointer ${
                    active 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20 font-bold' 
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                  id={`admin-tab-${tab.id}`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{tab.name}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="bg-[#5F39FF] text-white text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-mono font-bold">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-[10px] text-white/40 leading-relaxed space-y-2">
            <h5 className="font-bold uppercase tracking-wider text-white">ACCESS DEFINITION</h5>
            <p>Super Admin: Full ledger override & hard deletions.</p>
            <p>Admin: Full operations, stock and order updates.</p>
            <p>Manager: Product creation and order updates.</p>
            <p>Staff: Order modifications only.</p>
          </div>
        </aside>

        {/* MAIN ADMIN SHELF (9 columns on lg) */}
        <section className="lg:col-span-9 space-y-8">
          <AnimatePresence mode="wait">
            
            {/* SUB-TAB 1: DASHBOARD PULSE */}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Stats grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                  {[
                    { title: "Boutique Revenue", val: `Ugx ${totalRevenue}`, subtitle: "Net authorized capital holds", icon: DollarSign },
                    { title: "Sartorial Orders", val: orders.length, subtitle: "Trunks registered", icon: ShoppingBag },
                    { title: "Executive Clients", val: activeCustomers, subtitle: "Active VIP registries", icon: Users },
                    { title: "Apparel Stock", val: products.length, subtitle: "Tailoring designs active", icon: Layers }
                  ].map((st, i) => {
                    const Icon = st.icon;
                    return (
                      <div key={i} className="bg-[#111111] border border-white/10 rounded-2xl p-5 space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] text-white/40 uppercase tracking-widest font-mono">{st.title}</span>
                          <Icon className="w-4 h-4 text-[#20D9A1]" />
                        </div>
                        <div className="font-mono text-2xl font-bold text-white">{st.val}</div>
                        <p className="text-[9px] text-white/30 leading-normal">{st.subtitle}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Mid-grid: Mini chart representation using custom stylized css and vectors */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  {/* Top Products representation */}
                  <div className="md:col-span-7 bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4">
                    <h4 className="font-serif text-base text-white font-bold">Top Performing Sartorial Apparel</h4>
                    <div className="space-y-3">
                      {products.slice(0, 3).map((prod, index) => {
                        const totalOrdersOfProd = orders.filter(o => o.items.some(it => it.productId === prod.id)).length;
                        return (
                          <div key={prod.id} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-white/80 font-medium">{prod.name}</span>
                              <span className="text-white/40 font-mono">{totalOrdersOfProd} commissions</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#5F39FF]" 
                                style={{ width: `${Math.min(100, (totalOrdersOfProd * 40) + 20)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Revenue Growth Mini visualization */}
                  <div className="md:col-span-5 bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Monthly Projection</span>
                      <h4 className="font-serif text-lg text-white font-bold flex items-center gap-2">
                        <span>Lubowa Retail Target</span>
                        <TrendingUp className="w-4 h-4 text-[#20D9A1]" />
                      </h4>
                      <p className="text-xs text-white/50 leading-relaxed font-light">Showroom target of Ugx 50,000 corporate investment on menswear collections is 65% completed.</p>
                    </div>

                    <div className="pt-4 font-mono text-sm font-semibold flex justify-between items-center text-[#20D9A1]">
                      <span>65% Achieved</span>
                      <span>Ugx 32,500</span>
                    </div>
                  </div>
                </div>

                {/* Recent orders ledger quick view */}
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4">
                  <h4 className="font-serif text-base text-white font-bold">Active Showroom Registrations</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] uppercase tracking-widest font-mono text-white/40">
                          <th className="py-3 px-2">REGISTRY ID</th>
                          <th className="py-3 px-2">VIP CLIENT</th>
                          <th className="py-3 px-2">ORDER AMOUNT</th>
                          <th className="py-3 px-2">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {orders.slice(0, 3).map((o) => (
                          <tr key={o.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-2 font-mono font-bold text-[#20D9A1]">{o.id}</td>
                            <td className="py-3 px-2 text-white">{o.customerName}</td>
                            <td className="py-3 px-2 font-mono font-semibold">Ugx {o.amount}</td>
                            <td className="py-3 px-2">
                              <span className={`text-[9px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full ${
                                o.status === 'Delivered' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                o.status === 'Processing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB-TAB 2: PRODUCTS APPAREL REGISTRY */}
            {activeTab === 'products' && (
              <motion.div 
                key="products"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="font-serif text-xl text-white font-bold">Showroom Apparel Registry</h3>
                  
                  {canModifyProducts && (
                    <button 
                      onClick={() => handleOpenProductModal()}
                      className="bg-[#5F39FF] hover:bg-opacity-95 text-white px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer"
                      id="create-product-btn"
                    >
                      <Plus className="w-4 h-4" /> Add Product
                    </button>
                  )}
                </div>

                {/* Search & filtering */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-[#111111] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 md:col-span-2">
                    <Search className="w-3.5 h-3.5 text-white/40" />
                    <input 
                      type="text" 
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search apparel name, fabric description..."
                      className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/35 w-full focus:ring-0"
                    />
                  </div>
                  <div>
                    <select 
                      value={productCategoryFilter}
                      onChange={(e) => setProductCategoryFilter(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-1.5 px-3 text-white focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      <option value="Suits">Suits</option>
                      <option value="Shirts">Shirts</option>
                      <option value="Shoes">Shoes</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </div>
                  <div>
                    <select 
                      value={stockStatusFilter}
                      onChange={(e) => setStockStatusFilter(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-1.5 px-3 text-white focus:outline-none cursor-pointer"
                    >
                      <option value="All">All Stock Levels</option>
                      <option value="In Stock">In Stock Only</option>
                      <option value="Low Stock">Low Stock (≤ 3)</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>
                  </div>
                  <div>
                    <select 
                      value={productSort}
                      onChange={(e) => setProductSort(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-1.5 px-3 text-white focus:outline-none cursor-pointer"
                    >
                      <option value="Default">Default Order</option>
                      <option value="PriceAsc">Price: Low to High</option>
                      <option value="PriceDesc">Price: High to Low</option>
                      <option value="StockAsc">Stock: Low to High</option>
                      <option value="StockDesc">Stock: High to Low</option>
                      <option value="NameAsc">Alphabetical (A-Z)</option>
                    </select>
                  </div>
                </div>

                {/* Table representation */}
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] uppercase tracking-widest font-mono text-white/40">
                          <th className="py-3 px-2">Image</th>
                          <th className="py-3 px-2">Product Details</th>
                          <th className="py-3 px-2 font-mono">Category</th>
                          <th className="py-3 px-2 font-mono">Price</th>
                          <th className="py-3 px-2 font-mono">Stock Left</th>
                          <th className="py-3 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredProducts.map((p) => (
                          <Fragment key={p.id}>
                            <tr className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-2">
                                <div className="relative w-8 h-10 rounded overflow-hidden bg-black shrink-0">
                                  <Image src={getSafeImageSrc(p.images?.[0])} alt={p.name} fill className="object-cover" sizes="32px" referrerPolicy="no-referrer" />
                                </div>
                              </td>
                              <td className="py-3 px-2 space-y-0.5">
                                <span className="font-serif font-bold text-white text-xs block">{p.name}</span>
                                <span className="text-[10px] text-white/40 block max-w-xs truncate">{p.description}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {p.isNew && (
                                    <span className="bg-[#20D9A1]/10 border border-[#20D9A1]/20 text-[#20D9A1] text-[8px] px-1 py-0.5 rounded font-mono uppercase tracking-wider">
                                      New
                                    </span>
                                  )}
                                  {p.isFeatured && (
                                    <span className="bg-[#5F39FF]/10 border border-[#5F39FF]/20 text-[#a08eff] text-[8px] px-1 py-0.5 rounded font-mono uppercase tracking-wider">
                                      Featured
                                    </span>
                                  )}
                                  {p.isDealOfTheDay && (
                                    <span className="bg-[#C6A15B]/10 border border-[#C6A15B]/20 text-[#C6A15B] text-[8px] px-1 py-0.5 rounded font-mono uppercase tracking-wider">
                                      Secret Offer ({p.discountPercentage || 0}%)
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 pt-1.5 border-t border-white/5 text-[9px] font-mono">
                                  {p.sizes && p.sizes.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[#C6A15B] font-bold uppercase tracking-wider text-[8px]">Size Registry:</span>
                                      <span className="text-white/60">{p.sizes.join(', ')}</span>
                                    </div>
                                  )}
                                  {p.colors && p.colors.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[#C6A15B] font-bold uppercase tracking-wider text-[8px]">Color Palette:</span>
                                      <span className="text-white/60">{p.colors.join(', ')}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-2 font-mono uppercase text-[10px] text-white/50">{p.category}</td>
                              <td className="py-3 px-2 font-mono font-bold text-[#20D9A1]">Ugx {p.price}</td>
                              <td className="py-3 px-2 font-mono">
                                <div className="flex items-center gap-1 font-mono">
                                  <button 
                                    onClick={() => updateProductStockQuick(p.id, Math.max(0, p.stock - 1), currentUser?.name || 'Admin', currentUser?.role || 'Staff')}
                                    className="w-5 h-5 rounded border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 active:scale-95 transition-all text-[11px]"
                                    title="Decrease Stock"
                                  >
                                    -
                                  </button>
                                  <span className={`w-6 text-center text-[10px] font-bold ${p.stock <= 2 ? 'text-red-400 font-bold' : 'text-white'}`}>
                                    {p.stock}
                                  </span>
                                  <button 
                                    onClick={() => updateProductStockQuick(p.id, p.stock + 1, currentUser?.name || 'Admin', currentUser?.role || 'Staff')}
                                    className="w-5 h-5 rounded border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 active:scale-95 transition-all text-[11px]"
                                    title="Increase Stock"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button 
                                    onClick={() => setExpandedReviewsProductId(expandedReviewsProductId === p.id ? null : p.id)}
                                    className={`p-1.5 rounded border transition-all cursor-pointer relative ${
                                      expandedReviewsProductId === p.id 
                                        ? 'border-[#C6A15B]/40 bg-[#C6A15B]/10 text-[#C6A15B]' 
                                        : 'border-white/5 bg-white/5 hover:border-[#C6A15B]/30 hover:bg-[#C6A15B]/5 text-white/70 hover:text-[#C6A15B]'
                                    }`}
                                    title="Moderate product reviews"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    {p.reviews && p.reviews.length > 0 && (
                                      <span className="absolute -top-1 -right-1 bg-[#C6A15B] text-black font-sans font-extrabold text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center scale-90 font-bold">
                                        {p.reviews.length}
                                      </span>
                                    )}
                                  </button>

                                  <button 
                                    onClick={() => handleOpenProductModal(p)}
                                    className="p-1.5 rounded border border-white/5 bg-white/5 hover:border-[#20D9A1]/30 hover:bg-[#20D9A1]/5 text-white/70 hover:text-[#20D9A1] transition-all cursor-pointer"
                                    title="Edit product details"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleOpenDeleteModal(p)}
                                    className="p-1.5 rounded border border-white/5 bg-white/5 hover:border-red-500/30 hover:bg-red-500/5 text-white/70 hover:text-red-400 transition-all cursor-pointer"
                                    title="Soft delete from showroom"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {expandedReviewsProductId === p.id && (
                              <tr className="bg-black/35 border-b border-white/5">
                                <td colSpan={6} className="py-4 px-6 space-y-3">
                                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                    <h4 className="font-serif font-bold text-white text-xs flex items-center gap-1.5">
                                      <MessageSquare className="w-3.5 h-3.5 text-[#C6A15B]" />
                                      Apparel Reviews & Feedbacks Moderation Panel
                                    </h4>
                                    <button 
                                      onClick={() => setExpandedReviewsProductId(null)}
                                      className="text-white/40 hover:text-white text-[10px] font-mono"
                                    >
                                      Close Panel [✕]
                                    </button>
                                  </div>
                                  
                                  {!p.reviews || p.reviews.length === 0 ? (
                                    <p className="text-[10px] text-white/40 font-serif italic py-2">
                                      No feedback or reviews recorded for this apparel from customers yet.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
                                      {p.reviews.map((rev) => (
                                        <div key={rev.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex justify-between items-start gap-4">
                                          <div className="space-y-1 w-full">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-white text-[11px]">{rev.userName}</span>
                                              <span className="bg-white/10 text-white/60 text-[8px] font-mono px-1 rounded uppercase">
                                                {rev.userRole || 'Customer'}
                                              </span>
                                              <span className="text-[9px] text-white/30 font-mono ml-auto">{rev.date}</span>
                                            </div>
                                            <div className="flex items-center gap-0.5 py-0.5">
                                              {Array.from({ length: 5 }).map((_, i) => (
                                                <Star 
                                                  key={i} 
                                                  className={`w-3 h-3 ${i < rev.rating ? 'text-[#C6A15B] fill-[#C6A15B]' : 'text-white/10'}`} 
                                                />
                                              ))}
                                            </div>
                                            <p className="text-[10px] text-white/75 leading-relaxed italic">
                                              "{rev.comment}"
                                            </p>
                                          </div>
                                          
                                          <button 
                                            onClick={async () => {
                                              if (confirm('Are you sure you want to moderate and remove this review permanently?')) {
                                                await deleteReview(p.id, rev.id, currentUser?.name || 'Moderator', currentUser?.role || 'Admin');
                                              }
                                            }}
                                            className="p-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                            title="Moderate review"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB-TAB: CATEGORIES MANAGEMENT */}
            {activeTab === 'categories' && canSeeCategories && (
              <motion.div 
                key="categories"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-serif text-xl text-white font-bold flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#20D9A1]" />
                      Apparel Categories Registry
                    </h3>
                    <p className="text-[11px] text-white/40 mt-0.5">Manage database-backed merchandise categories and catalog organization.</p>
                  </div>
                  
                  {canModifyCategories && (
                    <button 
                      onClick={() => handleOpenCategoryModal()}
                      className="bg-[#20D9A1] hover:bg-opacity-95 text-black px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#20D9A1]/20 font-mono"
                      id="create-category-btn"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Category
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="bg-[#111111] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 max-w-md">
                    <Search className="w-4 h-4 text-white/40" />
                    <input 
                      type="text" 
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="Search category name, slug, description..."
                      className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/35 w-full focus:ring-0 font-mono"
                      id="category-search-input"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wider text-white/40 font-mono">
                          <th className="py-3.5 px-4">Category Name & Slug</th>
                          <th className="py-3.5 px-4">Description</th>
                          <th className="py-3.5 px-3 text-center">Assigned Products</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-white/80">
                        {filteredCategories.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-white/40 font-mono text-xs">
                              No merchandise categories matching criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredCategories.map((c) => {
                            const productCount = (products || []).filter(p => p.category?.toLowerCase() === c.name.toLowerCase() || p.category?.toLowerCase() === c.slug.toLowerCase()).length;
                            return (
                              <tr key={c.id || c.slug} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-white text-sm">{c.name}</div>
                                  <div className="text-[10px] text-white/40 font-mono font-light">slug: {c.slug}</div>
                                </td>
                                <td className="py-3.5 px-4 text-white/70 max-w-xs font-light text-xs">
                                  {c.description || <span className="text-white/30 italic">No description provided</span>}
                                </td>
                                <td className="py-3.5 px-3 text-center font-mono">
                                  <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded text-xs font-bold text-[#20D9A1]">
                                    {productCount} {productCount === 1 ? 'Product' : 'Products'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    {canModifyCategories && (
                                      <>
                                        <button 
                                          onClick={() => handleOpenCategoryModal(c)}
                                          className="p-1.5 rounded border border-white/5 bg-white/5 hover:border-[#20D9A1]/30 hover:bg-[#20D9A1]/5 text-white/70 hover:text-[#20D9A1] transition-all cursor-pointer"
                                          title="Edit category"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => handleOpenDeleteCategoryModal(c)}
                                          className="p-1.5 rounded border border-white/5 bg-white/5 hover:border-red-500/30 hover:bg-red-500/5 text-white/70 hover:text-red-400 transition-all cursor-pointer"
                                          title="Delete category"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB-TAB: TESTIMONIALS MANAGEMENT */}
            {activeTab === 'testimonials' && canSeeTestimonials && (
              <motion.div 
                key="testimonials"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111111] p-6 rounded-2xl border border-white/10">
                  <div>
                    <h3 className="font-serif text-xl text-white font-bold flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#C6A15B]" />
                      Executive Testimonials
                    </h3>
                    <p className="text-[11px] text-white/40 mt-0.5">Manage customer endorsements and VIP quotes displayed on the public homepage.</p>
                  </div>
                  {canModifyTestimonials && (
                    <button
                      onClick={() => handleOpenTestimonialModal()}
                      className="bg-[#5F39FF] text-white hover:bg-[#4d2ee0] px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#5F39FF]/20 font-mono shrink-0"
                      id="create-testimonial-btn"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Testimonial
                    </button>
                  )}
                </div>

                {/* Filter / Search */}
                <div className="bg-[#111111] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 max-w-md">
                    <Search className="w-4 h-4 text-white/40" />
                    <input 
                      type="text" 
                      value={testimonialSearch}
                      onChange={(e) => setTestimonialSearch(e.target.value)}
                      placeholder="Search quote, author name, role, company..."
                      className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/35 w-full focus:ring-0 font-mono"
                      id="testimonial-search-input"
                    />
                  </div>
                </div>

                {/* Testimonials Table */}
                <div className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wider text-white/40 font-mono">
                          <th className="py-3.5 px-3 text-center w-16">Order</th>
                          <th className="py-3.5 px-4">Author & Role</th>
                          <th className="py-3.5 px-4">Quote</th>
                          <th className="py-3.5 px-3 text-center">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs text-white/80">
                        {filteredTestimonials.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-white/40 font-mono text-xs">
                              No testimonials found matching criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredTestimonials.map((t) => (
                            <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3.5 px-3 text-center font-mono">
                                <span className="bg-white/5 border border-white/10 text-white/70 px-2.5 py-1 rounded text-xs font-bold">
                                  #{t.displayOrder}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 min-w-[180px]">
                                <div className="font-serif font-bold text-white text-sm">{t.name}</div>
                                <div className="text-[10px] text-[#C6A15B] font-mono font-medium">
                                  {t.role}{t.role && t.company ? ' • ' : ''}{t.company}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 max-w-md font-serif italic text-white/80 text-xs leading-relaxed">
                                &ldquo;{t.quote}&rdquo;
                              </td>
                              <td className="py-3.5 px-3 text-center font-mono">
                                {canModifyTestimonials ? (
                                  <button
                                    onClick={() => updateTestimonial(t.id!, { isActive: !t.isActive }, currentUser?.name || 'Master Admin', currentUser?.role || 'Super Admin')}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                                      t.isActive
                                        ? 'bg-[#20D9A1]/10 border-[#20D9A1]/30 text-[#20D9A1] hover:bg-[#20D9A1]/20'
                                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                                    }`}
                                  >
                                    {t.isActive ? 'Active' : 'Inactive'}
                                  </button>
                                ) : (
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                    t.isActive
                                      ? 'bg-[#20D9A1]/10 border-[#20D9A1]/30 text-[#20D9A1]'
                                      : 'bg-white/5 border-white/10 text-white/40'
                                  }`}>
                                    {t.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex justify-end gap-1.5">
                                  {canModifyTestimonials && (
                                    <>
                                      <button 
                                        onClick={() => handleOpenTestimonialModal(t)}
                                        className="p-1.5 rounded border border-white/5 bg-white/5 hover:border-[#20D9A1]/30 hover:bg-[#20D9A1]/5 text-white/70 hover:text-[#20D9A1] transition-all cursor-pointer"
                                        title="Edit testimonial"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleOpenDeleteTestimonialModal(t)}
                                        className="p-1.5 rounded border border-white/5 bg-white/5 hover:border-red-500/30 hover:bg-red-500/5 text-white/70 hover:text-red-400 transition-all cursor-pointer"
                                        title="Delete testimonial"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB-TAB: COUPONS MANAGEMENT */}
            {activeTab === 'coupons' && canSeeCoupons && (
              <motion.div 
                key="coupons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-serif text-xl text-white font-bold flex items-center gap-2">
                      <Tag className="w-5 h-5 text-[#C6A15B]" />
                      Coupons & Promotions Registry
                    </h3>
                    <p className="text-[11px] text-white/40 mt-0.5">Manage luxury promotional discount codes, minimum subtotals, limits, and expiration.</p>
                  </div>
                  
                  <button 
                    onClick={() => handleOpenCouponModal()}
                    className="bg-[#5F39FF] hover:bg-opacity-95 text-white px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#5F39FF]/20"
                    id="create-coupon-btn"
                  >
                    <Plus className="w-4 h-4" /> Add Coupon
                  </button>
                </div>

                {/* Search & filtering */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#111111] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 sm:col-span-1">
                    <Search className="w-3.5 h-3.5 text-white/40" />
                    <input 
                      type="text" 
                      value={couponSearch}
                      onChange={(e) => setCouponSearch(e.target.value)}
                      placeholder="Search code (e.g. WELCOME10)..."
                      className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/35 w-full focus:ring-0"
                    />
                  </div>
                  <div>
                    <select 
                      value={couponTypeFilter}
                      onChange={(e) => setCouponTypeFilter(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-1.5 px-3 text-white focus:outline-none cursor-pointer font-mono"
                    >
                      <option value="All">All Discount Types</option>
                      <option value="percentage">Percentage Off (%)</option>
                      <option value="fixed">Fixed Amount (Ugx)</option>
                    </select>
                  </div>
                  <div>
                    <select 
                      value={couponStatusFilter}
                      onChange={(e) => setCouponStatusFilter(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-1.5 px-3 text-white focus:outline-none cursor-pointer font-mono"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active Only</option>
                      <option value="Inactive">Inactive Only</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-white/70">
                      <thead className="bg-white/5 uppercase text-[9px] font-mono tracking-widest text-white/40 border-b border-white/10">
                        <tr>
                          <th className="py-3.5 px-4 font-bold">Coupon Code</th>
                          <th className="py-3.5 px-3 font-bold">Discount</th>
                          <th className="py-3.5 px-3 font-bold">Min Subtotal</th>
                          <th className="py-3.5 px-3 font-bold">Usage / Limit</th>
                          <th className="py-3.5 px-3 font-bold">Expiration</th>
                          <th className="py-3.5 px-3 font-bold">Status</th>
                          <th className="py-3.5 px-4 text-right font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredCoupons.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-white/40 text-xs font-mono">
                              No coupon records found matching your query.
                            </td>
                          </tr>
                        ) : (
                          filteredCoupons.map((c) => {
                            const isExpired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
                            const isLimitReached = c.usageLimit !== null && c.usageLimit !== undefined && (c.timesUsed || 0) >= c.usageLimit;

                            return (
                              <tr key={c.id || c.code} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-white text-xs tracking-wider bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                                      {c.code}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 font-mono font-bold text-[#20D9A1]">
                                  {c.discountType === 'percentage' 
                                    ? `${c.discountValue}% OFF` 
                                    : `Ugx ${c.discountValue.toLocaleString()} OFF`}
                                </td>
                                <td className="py-3.5 px-3 font-mono text-white/60">
                                  {c.minSubtotal ? `Ugx ${c.minSubtotal.toLocaleString()}` : <span className="text-white/20">—</span>}
                                </td>
                                <td className="py-3.5 px-3 font-mono text-xs">
                                  <span className={isLimitReached ? 'text-red-400 font-bold' : 'text-white'}>
                                    {c.timesUsed || 0}
                                  </span>
                                  <span className="text-white/30"> / {c.usageLimit !== null && c.usageLimit !== undefined ? c.usageLimit : '∞'}</span>
                                </td>
                                <td className="py-3.5 px-3 font-mono text-[11px]">
                                  {c.expiresAt ? (
                                    <span className={isExpired ? 'text-red-400 font-bold' : 'text-white/70'}>
                                      {new Date(c.expiresAt).toLocaleDateString()}
                                    </span>
                                  ) : (
                                    <span className="text-white/30">No expiry</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-3">
                                  {c.isActive === false ? (
                                    <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                                      Disabled
                                    </span>
                                  ) : isExpired ? (
                                    <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                                      Expired
                                    </span>
                                  ) : isLimitReached ? (
                                    <span className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[9px] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                                      Limit Maxed
                                    </span>
                                  ) : (
                                    <span className="bg-[#20D9A1]/10 border border-[#20D9A1]/20 text-[#20D9A1] text-[9px] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                                      Active
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button 
                                      onClick={() => handleOpenCouponModal(c)}
                                      className="p-1.5 rounded border border-white/5 bg-white/5 hover:border-[#20D9A1]/30 hover:bg-[#20D9A1]/5 text-white/70 hover:text-[#20D9A1] transition-all cursor-pointer"
                                      title="Edit coupon"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => handleOpenDeleteCouponModal(c)}
                                      className="p-1.5 rounded border border-white/5 bg-white/5 hover:border-red-500/30 hover:bg-red-500/5 text-white/70 hover:text-red-400 transition-all cursor-pointer"
                                      title="Delete coupon"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB-TAB 3: ORDER LEDGER MODIFICATIONS */}
            {activeTab === 'orders' && (
              <motion.div 
                key="orders"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="font-serif text-xl text-white font-bold">BHD Orders Ledger</h3>

                  <div className="flex gap-2.5">
                    <button 
                      onClick={() => handleExportData('csv')}
                      className="bg-[#111111] hover:bg-white/5 border border-white/10 px-3 py-1.5 rounded text-xs text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#20D9A1]" /> Export CSV
                    </button>
                    <button 
                      onClick={() => handleExportData('print')}
                      className="bg-[#111111] hover:bg-white/5 border border-white/10 px-3 py-1.5 rounded text-xs text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#5F39FF]" /> Print Ledger
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#111111] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 col-span-2">
                    <Search className="w-4 h-4 text-white/40" />
                    <input 
                      type="text" 
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search Order ID, Client names..."
                      className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/35 w-full focus:ring-0"
                    />
                  </div>
                  <div>
                    <select 
                      value={orderStatusFilter}
                      onChange={(e) => setOrderStatusFilter(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white focus:outline-none"
                    >
                      <option value="All">All Dispatches</option>
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Ledger lists */}
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] uppercase tracking-widest font-mono text-white/40">
                          <th className="py-3 px-2">REGISTRY ID</th>
                          <th className="py-3 px-2">CLIENT</th>
                          <th className="py-3 px-2 font-mono">DATE RECORDED</th>
                          <th className="py-3 px-2 font-mono">TOTAL SUM</th>
                          <th className="py-3 px-2 font-mono">STATUS STATE</th>
                          <th className="py-3 px-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-2 font-mono font-bold text-[#20D9A1]">{o.id}</td>
                            <td className="py-3 px-2 space-y-0.5">
                              <span className="font-semibold text-white block">{o.customerName}</span>
                              <span className="text-[10px] text-white/40 block">{o.customerEmail}</span>
                            </td>
                            <td className="py-3 px-2 font-mono text-white/50">{o.date}</td>
                            <td className="py-3 px-2 font-mono font-bold text-white">Ugx {o.amount}</td>
                            <td className="py-3 px-2">
                              {/* Status state modifier dropdown */}
                              {canModifyOrders ? (
                                <select
                                  value={o.status}
                                  onChange={(e) => updateOrderStatus(
                                    o.id, 
                                    e.target.value as any,
                                    currentUser?.name || 'Master Admin',
                                    currentUser?.role || 'Super Admin'
                                  )}
                                  className={`text-[10px] font-mono uppercase font-bold py-1 px-2.5 rounded-full bg-black border border-white/10 outline-none focus:border-[#5F39FF] ${
                                    o.status === 'Delivered' ? 'text-green-400' :
                                    o.status === 'Processing' ? 'text-blue-400' :
                                    o.status === 'Cancelled' ? 'text-red-400' :
                                    'text-yellow-400'
                                  }`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Processing">Processing</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              ) : (
                                <span className={`text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-full ${
                                  o.status === 'Delivered' ? 'bg-green-500/10 text-green-400' :
                                  'bg-yellow-500/10 text-yellow-400'
                                }`}>
                                  {o.status}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <button 
                                onClick={() => setSelectedOrderDetails(o)}
                                className="bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[10px] uppercase font-mono px-2.5 py-1.5 rounded transition-all cursor-pointer"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB-TAB 4: AUTHORIZED STAFF LIST & USER MANAGEMENT */}
            {activeTab === 'users' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
                  <div>
                    <h3 className="font-serif text-xl text-white font-bold">User & BHD Access Directory</h3>
                    <p className="text-xs text-white/40">Manage staff roles, customer profiles, spending metrics, and loyalty keys.</p>
                  </div>
                  {canModifyUsers && (
                    <button
                      onClick={() => handleOpenUserModal(null)}
                      className="bg-[#20D9A1] hover:bg-[#1bb887] text-black font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer font-mono"
                    >
                      <Plus className="w-4 h-4" /> Add New Profile
                    </button>
                  )}
                </div>

                {/* Filter and Search Controls */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search profiles by name, email, phone..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full bg-[#111111] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/30 focus:border-[#20D9A1] outline-none transition-all font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2 bg-[#111111] border border-white/10 rounded-xl px-3 py-1">
                    <Filter className="text-white/40 w-3.5 h-3.5" />
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="bg-transparent border-none text-xs text-white outline-none cursor-pointer pr-4 py-1"
                    >
                      <option value="All" className="bg-[#111111]">All Roles</option>
                      <option value="Super Admin" className="bg-[#111111]">Super Admin</option>
                      <option value="Admin" className="bg-[#111111]">Admin</option>
                      <option value="Manager" className="bg-[#111111]">Manager</option>
                      <option value="Staff" className="bg-[#111111]">Staff</option>
                      <option value="Customer" className="bg-[#111111]">Customer</option>
                    </select>
                  </div>
                </div>

                {/* Grid of Users */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {filteredUsers.length === 0 ? (
                    <div className="xl:col-span-2 bg-[#111111] border border-dashed border-white/10 rounded-2xl p-12 text-center text-white/40">
                      <Users className="w-10 h-10 mx-auto opacity-30 mb-3 text-white" />
                      <p className="font-serif font-bold text-lg text-white mb-1">No profiles matched your filters</p>
                      <p className="text-xs font-mono">Try adjusting your search criteria or register a new profile.</p>
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div key={u.id} className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-white/20 transition-all">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-1">
                              <h4 className="font-serif text-lg text-white font-bold tracking-tight">{u.name}</h4>
                              <p className="text-[10px] text-white/40 font-mono flex items-center gap-1.5">
                                <span className="text-[#20D9A1]">ID:</span> {u.id}
                              </p>
                              <p className="text-xs text-white/60 font-mono">{u.email}</p>
                              {u.phone && <p className="text-xs text-white/50 font-mono">Tel: {u.phone}</p>}
                            </div>
                            <span className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full ${
                              u.role === 'Super Admin' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              u.role === 'Admin' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                              u.role === 'Manager' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              u.role === 'Staff' ? 'bg-yellow-500/10 text-[#20D9A1] border border-yellow-500/20' :
                              'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {u.role}
                            </span>
                          </div>

                          {/* Stats / Spending / Rewards section */}
                          <div className="grid grid-cols-2 gap-4 mt-4 bg-black/20 rounded-xl p-3 border border-white/5 font-mono text-[11px]">
                            <div>
                              <span className="text-white/40 uppercase text-[8px] tracking-wider block">Boutique Spending</span>
                              <span className="text-white font-bold text-sm">${u.spending?.toLocaleString() || '0'}</span>
                            </div>
                            <div>
                              <span className="text-white/40 uppercase text-[8px] tracking-wider block">Rewards Points</span>
                              <span className="text-[#20D9A1] font-bold text-sm">{u.rewardsPoints?.toLocaleString() || '0'} pts</span>
                            </div>
                          </div>

                          <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] text-white/40 leading-relaxed font-mono space-y-1 mt-4">
                            <span className="text-white font-bold uppercase text-[8px] block tracking-widest text-[#20D9A1]">Active Authorization Scope</span>
                            {u.role === 'Super Admin' && <p>✓ Full system mutations, override settings, hard-deletions, security audit decryption.</p>}
                            {u.role === 'Admin' && <p>✓ Operations override, apparel modification, stock allocations, order dispatches.</p>}
                            {u.role === 'Manager' && <p>✓ Product addition, details modification, dispatch updates.</p>}
                            {u.role === 'Staff' && <p>✓ Courier dispatch tracking, client order notes modification.</p>}
                            {u.role === 'Customer' && <p>✓ Private lounge profile, loyalty rewards tracker, personal trunk checks.</p>}
                          </div>
                        </div>

                        {/* Actions row */}
                        {canModifyUsers && (
                          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                            <button
                              onClick={() => handleOpenUserModal(u)}
                              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs uppercase font-mono px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                            {/* Prevent deleting oneself */}
                            {currentUser?.id !== u.id && (
                              <button
                                onClick={() => handleOpenDeleteUserModal(u)}
                                className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-xs uppercase font-mono px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* SUB-TAB: PAYMENT LEDGER */}
            {activeTab === 'payments' && (
              <motion.div 
                key="payments"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
                  <div>
                    <h3 className="font-serif text-xl text-white font-bold">Sartorial Payment Ledger</h3>
                    <p className="text-white/40 text-xs font-light">Monitor transactions, adjust clearance codes, and issue overrides.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#20D9A1] font-mono uppercase tracking-widest font-bold">Ledger Active</span>
                  </div>
                </div>

                {/* Statistics panel */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[
                    { title: "SETTLED AMOUNT", val: `Ugx ${paymentStats.settledSum}`, color: 'text-green-400', desc: 'Cleared funds successfully settled.' },
                    { title: "PENDING DEPOSITS", val: `Ugx ${paymentStats.pendingSum}`, color: 'text-yellow-400', desc: 'Funds awaiting authorization.' },
                    { title: "REFUNDED CAPITAL", val: `Ugx ${paymentStats.refundedSum}`, color: 'text-blue-400', desc: 'Returned to corporate cards.' },
                    { title: "FAILED ATTEMPTS", val: `Ugx ${paymentStats.failedSum}`, color: 'text-red-400', desc: 'Declined transactions.' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-[#111111] border border-white/10 rounded-xl p-4 space-y-1">
                      <span className="text-[8px] text-white/40 uppercase tracking-widest font-mono font-bold block">{stat.title}</span>
                      <div className={`font-mono text-lg font-bold ${stat.color}`}>{stat.val}</div>
                      <p className="text-[9px] text-white/30 leading-normal">{stat.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Search & Filters */}
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
                  <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search payments, customers, order IDs..."
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:border-[#5F39FF] outline-none"
                    />
                    {paymentSearch && (
                      <button 
                        onClick={() => setPaymentSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Status:</span>
                      <select 
                        value={paymentStatusFilter}
                        onChange={(e) => setPaymentStatusFilter(e.target.value)}
                        className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:border-[#5F39FF] outline-none"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Refunded">Refunded</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Method:</span>
                      <select 
                        value={paymentMethodFilter}
                        onChange={(e) => setPaymentMethodFilter(e.target.value)}
                        className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:border-[#5F39FF] outline-none"
                      >
                        <option value="All">All Methods</option>
                        <option value="Visa">Visa Card</option>
                        <option value="Mobile Money">Mobile Money</option>
                        <option value="Cash on Delivery">Cash on Delivery</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Payments Table */}
                <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="border-b border-white/5 bg-white/[0.02] text-[9px] uppercase tracking-widest font-mono text-white/40">
                          <th className="py-3 px-4 font-mono">TRANSACTION ID</th>
                          <th className="py-3 px-4 font-mono">ORDER ID</th>
                          <th className="py-3 px-4">VIP CLIENT</th>
                          <th className="py-3 px-4 font-mono">DATE</th>
                          <th className="py-3 px-4 font-mono">METHOD</th>
                          <th className="py-3 px-4 font-mono">SETTLEMENT SUM</th>
                          <th className="py-3 px-4 font-mono">CLEARANCE STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredPayments.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-12 text-center text-white/30 font-light text-xs">
                              No payment transactions found matching the parameters.
                            </td>
                          </tr>
                        ) : (
                          filteredPayments.map((p) => (
                            <tr key={p.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-4 px-4 font-mono text-white/80 font-bold">{p.transactionId}</td>
                              <td className="py-4 px-4 font-mono font-bold text-[#20D9A1]">{p.orderId}</td>
                              <td className="py-4 px-4 space-y-0.5">
                                <span className="font-semibold text-white block">{p.customerName}</span>
                                <span className="text-[10px] text-white/40 block">{p.customerEmail}</span>
                              </td>
                              <td className="py-4 px-4 font-mono text-white/50">{p.date}</td>
                              <td className="py-4 px-4">
                                <span className="text-white font-medium text-xs flex items-center gap-1.5">
                                  <CreditCard className="w-3.5 h-3.5 text-white/30" />
                                  {p.paymentMethod}
                                </span>
                              </td>
                              <td className="py-4 px-4 font-mono font-bold text-white">Ugx {p.amount}</td>
                              <td className="py-4 px-4">
                                <select
                                  value={p.status}
                                  onChange={(e) => updatePaymentStatus(
                                    p.id, 
                                    e.target.value as any,
                                    currentUser?.name || 'Master Admin',
                                    currentUser?.role || 'Super Admin'
                                  )}
                                  className={`text-[10px] font-mono uppercase font-bold py-1 px-2.5 rounded-full bg-black border border-white/10 outline-none focus:border-[#5F39FF] ${
                                    p.status === 'Paid' ? 'text-green-400' :
                                    p.status === 'Pending' ? 'text-yellow-400' :
                                    p.status === 'Refunded' ? 'text-blue-400' :
                                    'text-red-400'
                                  }`}
                                >
                                  <option value="Paid">Paid</option>
                                  <option value="Pending">Pending</option>
                                  <option value="Refunded">Refunded</option>
                                  <option value="Failed">Failed</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB-TAB: STYLE BOOKINGS */}
            {activeTab === 'bookings' && (
              <motion.div 
                key="bookings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="font-serif text-xl text-white font-bold">Personal Styling Bookings</h3>
                  <div className="flex gap-2.5">
                    <span className="text-[10px] text-[#20D9A1] font-mono uppercase tracking-widest font-bold">Bookings Desk Active</span>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#111111] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 col-span-2">
                    <Search className="w-4 h-4 text-white/40" />
                    <input 
                      type="text" 
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      placeholder="Search Client Name, Email, Phone..."
                      className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/35 w-full focus:ring-0"
                    />
                  </div>
                  <div>
                    <select 
                      value={bookingStatusFilter}
                      onChange={(e) => setBookingStatusFilter(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white focus:outline-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Bookings Table */}
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse font-sans text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] uppercase tracking-widest font-mono text-white/40">
                          <th className="py-3 px-2">BOOKING ID</th>
                          <th className="py-3 px-2">CLIENT DETAILS</th>
                          <th className="py-3 px-2 font-mono">DATE / TIME</th>
                          <th className="py-3 px-2 font-mono">NOTES</th>
                          <th className="py-3 px-2 font-mono">STATUS STATE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-white/30 font-light text-xs">
                              No styling bookings found matching the parameters.
                            </td>
                          </tr>
                        ) : (
                          filteredBookings.map((b) => (
                            <tr key={b.id} className="hover:bg-white/5 transition-colors">
                              <td className="py-3 px-2 font-mono font-bold text-[#20D9A1]">{b.id}</td>
                              <td className="py-3 px-2 space-y-0.5">
                                <span className="font-semibold text-white block">{b.clientName}</span>
                                <span className="text-[10px] text-white/40 block">{b.clientEmail}</span>
                                {b.clientPhone && (
                                  <span className="text-[10px] text-white/40 font-mono block">{b.clientPhone}</span>
                                )}
                              </td>
                              <td className="py-3 px-2 font-mono text-white/70 space-y-0.5">
                                <div className="font-medium text-white">{b.date}</div>
                                <div className="text-[10px] text-white/40">{b.time}</div>
                              </td>
                              <td className="py-3 px-2 text-white/60 max-w-xs truncate" title={b.notes}>
                                {b.notes || <span className="text-white/20 italic">No notes</span>}
                              </td>
                              <td className="py-3 px-2">
                                <select
                                  value={b.status}
                                  onChange={(e) => updateBookingStatus(
                                    b.id, 
                                    e.target.value as any,
                                    currentUser?.name || 'Master Admin',
                                    currentUser?.role || 'Super Admin'
                                  )}
                                  className={`text-[10px] font-mono uppercase font-bold py-1 px-2.5 rounded-full bg-black border border-white/10 outline-none focus:border-[#5F39FF] ${
                                    b.status === 'Completed' ? 'text-green-400' :
                                    b.status === 'Confirmed' ? 'text-blue-400' :
                                    'text-yellow-400'
                                  }`}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Confirmed">Confirmed</option>
                                  <option value="Completed">Completed</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SUB-TAB 5: SECURITY AUDIT LOGS */}
            {activeTab === 'logs' && canSeeLogs && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-xl text-white font-bold">PCI-DSS Cybersecurity Audit Logs</h3>
                  <span className="text-[10px] text-[#20D9A1] font-mono">● ENCRYPTED ACTIVE TRACE</span>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#111111] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 col-span-2">
                    <Search className="w-4 h-4 text-white/40" />
                    <input 
                      type="text" 
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="Search log details, operator, action..."
                      className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/35 w-full focus:ring-0"
                    />
                  </div>
                  <div>
                    <select 
                      value={logActionFilter}
                      onChange={(e) => setLogActionFilter(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white focus:outline-none"
                    >
                      <option value="All">All Audit Events</option>
                      <option value="Product Registered">Product Registered</option>
                      <option value="Product Updated">Product Updated</option>
                      <option value="User Registered">User Registered</option>
                      <option value="User Updated">User Updated</option>
                      <option value="Order Status Adjusted">Order Status Adjusted</option>
                      <option value="Payment Status Adjusted">Payment Status Adjusted</option>
                      <option value="Settings Updated">Settings Updated</option>
                      <option value="Booking Status Adjusted">Booking Status Adjusted</option>
                    </select>
                  </div>
                </div>

                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 font-mono text-[11px] leading-relaxed space-y-3 max-h-[500px] overflow-y-auto font-sans">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center text-white/30 py-8 italic font-sans text-xs">No audit records match the filters.</div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div key={log.id} className="border-b border-white/5 pb-2.5 flex items-start gap-3 font-mono text-[11px]">
                        <span className="text-white/30 shrink-0 font-mono">[{log.timestamp}]</span>
                        <div className="space-y-0.5">
                          <p className="text-[#20D9A1] font-bold uppercase tracking-wider text-[9px] font-mono">Scope: {log.action}</p>
                          <p className="text-white/70 font-sans">{log.details}</p>
                          <p className="text-white/30 text-[9px] font-sans">Operator: {log.userName} ({log.userRole})</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* SUB-TAB: BOUTIQUE SETTINGS */}
            {activeTab === 'settings' && canSeeSettings && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
                  <div>
                    <h3 className="font-serif text-xl text-white font-bold">Boutique Configuration Panel</h3>
                    <p className="text-white/40 text-xs font-light">Fine-tune operating thresholds, premium showroom listings, and concierge parameters.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#20D9A1] font-mono uppercase tracking-widest font-bold">● System Parameters Live</span>
                  </div>
                </div>

                {settingsSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs flex items-center gap-3"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>Boutique configuration parameters successfully persisted and written to logs.</span>
                  </motion.div>
                )}

                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* SECTION 1: SHOWROOM DETAILS */}
                    <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg">
                      <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                        <Calendar className="w-4 h-4 text-white/40" />
                        <h4 className="text-xs font-mono font-bold tracking-wider text-white/80 uppercase">Showroom & Support</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Operating Showroom Hours</label>
                          <input 
                            type="text" 
                            value={sHours}
                            onChange={(e) => setSHours(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none"
                            placeholder="e.g. Sunday to Friday: 9:00 AM - 7:00 PM"
                            required
                          />
                          <p className="text-[9px] text-white/30">Display schedule shown to customers when reserving appointments.</p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Boutique Concierge Phone</label>
                          <input 
                            type="text" 
                            value={sPhone}
                            onChange={(e) => setSPhone(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none"
                            placeholder="e.g. +256 772 123456"
                            required
                          />
                          <p className="text-[9px] text-white/30">Primary hotline listed on order confirmations and checkout supports.</p>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: LOGISTICS & FINANCIALS */}
                    <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg">
                      <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                        <DollarSign className="w-4 h-4 text-white/40" />
                        <h4 className="text-xs font-mono font-bold tracking-wider text-white/80 uppercase">Logistics & Financials</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Currency Code</label>
                            <input 
                              type="text" 
                              value={sCurrency}
                              onChange={(e) => setSCurrency(e.target.value)}
                              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none font-mono"
                              placeholder="Ugx"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Luxury/VAT Rate (%)</label>
                            <input 
                              type="number" 
                              value={sTaxRate}
                              onChange={(e) => setSTaxRate(Number(e.target.value))}
                              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none font-mono"
                              placeholder="18"
                              min="0"
                              max="100"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Free Shipping Threshold</label>
                          <input 
                            type="number" 
                            value={sThreshold}
                            onChange={(e) => setSThreshold(Number(e.target.value))}
                            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none font-mono"
                            placeholder="2000"
                            min="0"
                            required
                          />
                          <p className="text-[9px] text-white/30">Free delivery is auto-applied to executive invoices above this value.</p>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: INTERACTIVE AI EXPERIENCE */}
                    <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg md:col-span-2">
                      <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
                        <Compass className="w-4 h-4 text-white/40" />
                        <h4 className="text-xs font-mono font-bold tracking-wider text-white/80 uppercase">AI Stylist & Interactive Controls</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">AI Stylist Greeting Prefix</label>
                            <textarea 
                              value={sGreeting}
                              onChange={(e) => setSGreet(e.target.value)}
                              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none min-h-[80px]"
                              placeholder="Welcome, elegant guest."
                              required
                            />
                            <p className="text-[9px] text-white/30">The initial opening statement when clients seek virtual tailoring consulting.</p>
                          </div>
                        </div>

                        <div className="space-y-4 flex flex-col justify-center">
                          {/* TOGGLE: SECRET OFFER */}
                          <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                            <div>
                              <span className="text-xs font-semibold text-white block">Secret Offer Section</span>
                              <span className="text-[9px] text-white/40">Display Deal-of-the-Day countdown section on homepage.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSSecretOffer(!sSecretOffer)}
                              className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sSecretOffer ? 'bg-[#20D9A1]' : 'bg-white/10'}`}
                            >
                              <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sSecretOffer ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                          </div>

                          {/* TOGGLE: BANNER */}
                          <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                            <div>
                              <span className="text-xs font-semibold text-white block">Exclusive Banner Broadcast</span>
                              <span className="text-[9px] text-white/40">Enable custom collection announcement ribbon at footer/header.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSBanner(!sBanner)}
                              className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sBanner ? 'bg-[#20D9A1]' : 'bg-white/10'}`}
                            >
                              <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sBanner ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                          </div>

                          {/* TOGGLE: MAINTENANCE */}
                          <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                            <div>
                              <span className="text-xs font-semibold text-red-400 block">Boutique Maintenance Overrides</span>
                              <span className="text-[9px] text-white/40">Place storefront in read-only reservation-locked mode.</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSMaintenance(!sMaintenance)}
                              className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sMaintenance ? 'bg-red-500' : 'bg-white/10'}`}
                            >
                              <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sMaintenance ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                          </div>

                          {/* PAYMENT METHODS GROUP */}
                          <div className="pt-2 border-t border-white/5 space-y-2">
                            <span className="text-[10px] text-white/50 uppercase tracking-wider font-mono block">Accepted Payment Methods</span>
                            
                            {/* TOGGLE: MOBILE MONEY */}
                            <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                              <div>
                                <span className="text-xs font-semibold text-white block">Mobile Money</span>
                                <span className="text-[9px] text-white/40">Allow MTN & Airtel Mobile Money checkout.</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSPayMomo(!sPayMomo)}
                                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sPayMomo ? 'bg-[#20D9A1]' : 'bg-white/10'}`}
                              >
                                <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sPayMomo ? 'translate-x-4' : 'translate-x-0'}`} />
                              </button>
                            </div>

                            {/* TOGGLE: VISA */}
                            <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                              <div>
                                <span className="text-xs font-semibold text-white block">Visa & Credit Card</span>
                                <span className="text-[9px] text-white/40">Allow Visa and card payments at checkout.</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSPayVisa(!sPayVisa)}
                                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sPayVisa ? 'bg-[#20D9A1]' : 'bg-white/10'}`}
                              >
                                <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sPayVisa ? 'translate-x-4' : 'translate-x-0'}`} />
                              </button>
                            </div>

                            {/* TOGGLE: CASH ON DELIVERY */}
                            <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                              <div>
                                <span className="text-xs font-semibold text-white block">Cash on Delivery</span>
                                <span className="text-[9px] text-white/40">Allow cash payment on concierge delivery.</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSPayCod(!sPayCod)}
                                className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sPayCod ? 'bg-[#20D9A1]' : 'bg-white/10'}`}
                              >
                                <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sPayCod ? 'translate-x-4' : 'translate-x-0'}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        // Reset local states from store settings
                        if (settings) {
                          setSHours(settings.showroomHours || '');
                          setSPhone(settings.conciergePhone || settings.supportPhone || '');
                          setSThreshold(settings.freeShippingThreshold || 0);
                          setSTaxRate(settings.taxRate || 0);
                          setSGreet(settings.aiGreetingPrefix || '');
                          setSBanner(settings.enableNewsBanner !== false);
                          setSMaintenance(!!settings.maintenanceMode);
                          setSCurrency(settings.currencySymbol || 'Ugx');
                          setSSecretOffer(settings.enableSecretOffer !== false);
                          setSPayMomo(settings.paymentMethods?.mobileMoney !== false);
                          setSPayVisa(settings.paymentMethods?.visa !== false);
                          setSPayCod(settings.paymentMethods?.cashOnDelivery !== false);
                        }
                      }}
                      className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white/80 font-medium transition-colors"
                    >
                      Reset Configuration
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#5F39FF] hover:bg-[#4a26e0] active:scale-98 rounded-xl text-xs text-white font-bold transition-all shadow-md shadow-[#5F39FF]/10 flex items-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Save Configuration
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </section>

      </main>

      {/* CREATE & EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {isProductModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProductModalOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-4 max-w-xl mx-auto bg-[#111111] border border-white/15 rounded-2xl z-50 overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl h-fit max-h-[90vh]"
              id="product-create-edit-modal"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="font-serif text-lg text-white font-bold">
                  {editingProduct ? 'Edit Sartorial Apparel Details' : 'Register New Showroom Apparel'}
                </h3>
                <button onClick={() => setIsProductModalOpen(false)} className="text-white/60 hover:text-white p-1">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-4 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono">Apparel Title</label>
                  <input 
                    type="text" 
                    value={pName} 
                    onChange={(e) => setPName(e.target.value)} 
                    className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-white outline-none"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono">Tailoring Description</label>
                  <textarea 
                    value={pDesc} 
                    onChange={(e) => setPDesc(e.target.value)} 
                    rows={3}
                    className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-white outline-none resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono">Category</label>
                    <select 
                      value={pCategory} 
                      onChange={(e) => setPCategory(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-white outline-none"
                    >
                      {((categories && categories.length > 0) ? categories.map(c => c.name) : ['Suits', 'Shirts', 'Shoes', 'Accessories']).map(catName => (
                        <option key={catName} value={catName}>{catName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono">Retail Price ($)</label>
                    <input 
                      type="number" 
                      value={pPrice} 
                      onChange={(e) => setPPrice(Number(e.target.value))} 
                      className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-white outline-none font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono">Stock Units</label>
                    <input 
                      type="number" 
                      value={pStock} 
                      onChange={(e) => setPStock(Number(e.target.value))} 
                      className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-white outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono">Available Sizes (Comma Separated)</label>
                    <input 
                      type="text" 
                      value={pSizesInput} 
                      onChange={(e) => setPSizesInput(e.target.value)} 
                      placeholder="e.g. 48R, 50R, 52R"
                      className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-white outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono">Available Colors</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-white/30 uppercase tracking-wider font-mono">Custom Picker:</span>
                        <div className="relative w-4 h-4 rounded-full overflow-hidden border border-white/20 hover:border-[#20D9A1] transition-colors cursor-pointer bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-sm" title="Click to choose custom hex color">
                          <input 
                            type="color" 
                            onChange={(e) => {
                              const newColor = e.target.value;
                              const current = pColorsInput.split(',').map(c => c.trim()).filter(c => c !== '');
                              if (!current.includes(newColor)) {
                                setPColorsInput([...current, newColor].join(', '));
                              }
                            }}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer scale-150"
                          />
                        </div>
                      </div>
                    </div>
                    <input 
                      type="text" 
                      value={pColorsInput} 
                      onChange={(e) => setPColorsInput(e.target.value)} 
                      placeholder="e.g. Midnight Navy, Charcoal"
                      className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-white outline-none font-mono text-xs"
                      required
                    />
                    
                    {/* Visual Color Swatches */}
                    <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto custom-scrollbar">
                      {pColorsInput.split(',').map(c => c.trim()).filter(c => c !== '').map((col, idx) => {
                        const lowerCol = col.toLowerCase();
                        const swatchBg = lowerCol === 'midnight navy' ? '#1D2B3F' : 
                                         lowerCol === 'charcoal' ? '#475569' : 
                                         lowerCol === 'cognac brown' ? '#7c2d12' : 
                                         lowerCol === 'obsidian black' || lowerCol === 'black' ? '#09090b' : 
                                         lowerCol === 'pristine white' || lowerCol === 'white' ? '#ffffff' : 
                                         lowerCol === 'lubowa camel' || lowerCol === 'camel' ? '#c6a15b' : col;
                        return (
                          <div 
                            key={idx}
                            className="flex items-center gap-1 bg-white/5 border border-white/10 hover:border-white/20 px-1.5 py-0.5 rounded text-[9px] text-white/80 transition-all font-mono"
                          >
                            <span 
                              className="w-1.5 h-1.5 rounded-full border border-white/10 shadow-sm" 
                              style={{ backgroundColor: swatchBg }}
                            />
                            <span className="truncate max-w-[80px]">{col}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = pColorsInput.split(',').map(c => c.trim()).filter(c => c !== '');
                                const updated = current.filter(c => c !== col);
                                setPColorsInput(updated.join(', '));
                              }}
                              className="text-white/40 hover:text-red-400 font-bold ml-0.5 transition-colors focus:outline-none"
                              title="Remove color"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Selection Presets */}
                    <div className="space-y-1 pt-1 border-t border-white/5">
                      <span className="text-[8px] text-white/30 uppercase tracking-wider font-mono block">Bespoke Presets</span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { name: 'Midnight Navy', hex: '#1D2B3F' },
                          { name: 'Charcoal', hex: '#475569' },
                          { name: 'Cognac Brown', hex: '#7c2d12' },
                          { name: 'Obsidian Black', hex: '#09090b' },
                          { name: 'Pristine White', hex: '#ffffff' },
                          { name: 'Lubowa Camel', hex: '#c6a15b' }
                        ].map((preset) => {
                          const current = pColorsInput.split(',').map(c => c.trim()).filter(c => c !== '');
                          const isSelected = current.some(c => c.toLowerCase() === preset.name.toLowerCase());
                          return (
                            <button
                              type="button"
                              key={preset.name}
                              onClick={() => {
                                if (isSelected) {
                                  setPColorsInput(current.filter(c => c.toLowerCase() !== preset.name.toLowerCase()).join(', '));
                                } else {
                                  setPColorsInput([...current, preset.name].join(', '));
                                }
                              }}
                              className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[9px] font-mono transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#20D9A1]/10 border-[#20D9A1]/30 text-[#20D9A1]' 
                                  : 'bg-black/40 border-white/5 text-white/50 hover:border-white/10 hover:text-white/80'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full border border-white/10" style={{ backgroundColor: preset.hex }} />
                              <span>{preset.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-3">
                  <span className="text-[9px] uppercase tracking-widest text-[#20D9A1] font-mono block font-bold">Showroom Collection Registries / Labels</span>
                  <div className="grid grid-cols-3 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white">
                      <input 
                        type="checkbox" 
                        checked={pIsNew} 
                        onChange={(e) => setPIsNew(e.target.checked)}
                        className="rounded border-white/10 bg-black text-[#20D9A1] focus:ring-0 outline-none w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[11px] font-medium">New</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white">
                      <input 
                        type="checkbox" 
                        checked={pIsFeatured} 
                        onChange={(e) => setPIsFeatured(e.target.checked)}
                        className="rounded border-white/10 bg-black text-[#20D9A1] focus:ring-0 outline-none w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[11px] font-medium font-sans">Featured</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white">
                      <input 
                        type="checkbox" 
                        checked={pIsDeal} 
                        onChange={(e) => setPIsDeal(e.target.checked)}
                        className="rounded border-white/10 bg-black text-[#20D9A1] focus:ring-0 outline-none w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[11px] font-medium font-sans">Secret Offer</span>
                    </label>
                  </div>

                  {pIsDeal && (
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono">Secret Offer Discount Percentage (%)</label>
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          value={pDiscountPercentage} 
                          onChange={(e) => setPDiscountPercentage(Number(e.target.value))} 
                          className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-[#20D9A1] font-bold outline-none font-mono"
                          required={pIsDeal}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono block">
                          Atelier reservation lines close in
                        </label>
                        
                        <div className="flex gap-4">
                          {/* DAYS CARD */}
                          <div className="flex flex-col items-center justify-center bg-[#132844] border border-[#2C4A70] rounded-2xl p-4 w-24 h-24 shadow-lg shadow-black/30 transition-all focus-within:border-[#C6A15B]/50">
                            <input 
                              type="number" 
                              min="0"
                              max="99"
                              value={pSecretDays} 
                              onChange={(e) => setPSecretDays(Math.max(0, parseInt(e.target.value) || 0))} 
                              className="w-full bg-transparent text-center font-mono text-3xl font-bold text-[#C6A15B] outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              required={pIsDeal}
                              id="product-deal-days-input"
                            />
                            <span className="text-[9px] text-[#657892] uppercase tracking-widest mt-1.5 font-sans font-medium">DAYS</span>
                          </div>

                          {/* HOURS CARD */}
                          <div className="flex flex-col items-center justify-center bg-[#132844] border border-[#2C4A70] rounded-2xl p-4 w-24 h-24 shadow-lg shadow-black/30 transition-all focus-within:border-[#C6A15B]/50">
                            <input 
                              type="number" 
                              min="0"
                              max="99"
                              value={pSecretHours} 
                              onChange={(e) => setPSecretHours(Math.max(0, parseInt(e.target.value) || 0))} 
                              className="w-full bg-transparent text-center font-mono text-3xl font-bold text-[#C6A15B] outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              required={pIsDeal}
                            />
                            <span className="text-[9px] text-[#657892] uppercase tracking-widest mt-1.5 font-sans font-medium">HOURS</span>
                          </div>

                          {/* MINS CARD */}
                          <div className="flex flex-col items-center justify-center bg-[#132844] border border-[#2C4A70] rounded-2xl p-4 w-24 h-24 shadow-lg shadow-black/30 transition-all focus-within:border-[#C6A15B]/50">
                            <input 
                              type="number" 
                              min="0"
                              max="59"
                              value={pSecretMins} 
                              onChange={(e) => setPSecretMins(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} 
                              className="w-full bg-transparent text-center font-mono text-3xl font-bold text-[#C6A15B] outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              required={pIsDeal}
                            />
                            <span className="text-[9px] text-[#657892] uppercase tracking-widest mt-1.5 font-sans font-medium">MINS</span>
                          </div>

                          {/* SECS CARD */}
                          <div className="flex flex-col items-center justify-center bg-[#132844] border border-[#2C4A70] rounded-2xl p-4 w-24 h-24 shadow-lg shadow-black/30 transition-all focus-within:border-[#C6A15B]/50">
                            <input 
                              type="number" 
                              min="0"
                              max="59"
                              value={pSecretSecs} 
                              onChange={(e) => setPSecretSecs(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} 
                              className="w-full bg-transparent text-center font-mono text-3xl font-bold text-[#C6A15B] outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              required={pIsDeal}
                            />
                            <span className="text-[9px] text-[#657892] uppercase tracking-widest mt-1.5 font-sans font-medium">SECS</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono">Apparel Image</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setImageSourceMode('upload')}
                        className={`text-[9px] uppercase tracking-widest font-mono px-2 py-0.5 rounded transition-all ${imageSourceMode === 'upload' ? 'bg-[#20D9A1]/10 text-[#20D9A1] border border-[#20D9A1]/20' : 'text-white/40 hover:text-white/60'}`}
                      >
                        Upload File
                      </button>
                      <button 
                        type="button"
                        onClick={() => setImageSourceMode('url')}
                        className={`text-[9px] uppercase tracking-widest font-mono px-2 py-0.5 rounded transition-all ${imageSourceMode === 'url' ? 'bg-[#20D9A1]/10 text-[#20D9A1] border border-[#20D9A1]/20' : 'text-white/40 hover:text-white/60'}`}
                      >
                        Image URL
                      </button>
                    </div>
                  </div>

                  {imageSourceMode === 'upload' ? (
                    <div className="space-y-2">
                      <div 
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleImageDrop}
                        onClick={() => document.getElementById('product-image-file-input')?.click()}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                          isDragging ? 'border-[#20D9A1] bg-[#20D9A1]/5' : 'border-white/10 hover:border-white/20 bg-black/40'
                        }`}
                      >
                        <input 
                          type="file"
                          id="product-image-file-input"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <Upload className="w-5 h-5 text-white/40" />
                        <span className="text-white/60 text-xs">
                          Drag & drop apparel image here, or <span className="text-[#20D9A1] underline">browse</span>
                        </span>
                        <span className="text-[9px] text-white/30 font-mono uppercase tracking-wider">
                          Supports PNG, JPG, WEBP, SVG
                        </span>
                      </div>
                      {pImages[0] && (
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded p-2">
                          <div className="relative w-12 h-12 rounded overflow-hidden bg-black flex-shrink-0">
                            <img 
                              src={getSafeImageSrc(pImages[0])} 
                              alt="Apparel Preview" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/80 font-mono text-[10px] truncate">
                              {pImages[0].startsWith('data:') ? 'Local Uploaded File' : pImages[0]}
                            </p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setPImages([])}
                            className="text-red-400 hover:text-red-300 px-2 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={pImages[0] || ''} 
                        onChange={(e) => setPImages([e.target.value])} 
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-white outline-none font-mono"
                        required={imageSourceMode === 'url'}
                      />
                      {pImages[0] && (
                        <div className="relative h-24 rounded-lg overflow-hidden bg-black border border-white/5 flex items-center justify-center">
                          <img 
                            src={getSafeImageSrc(pImages[0])} 
                            alt="URL Preview" 
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsProductModalOpen(false)}
                    className="bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded text-xs uppercase font-semibold"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#20D9A1] text-black px-5 py-2.5 rounded text-xs uppercase font-extrabold"
                  >
                    Authorize Mutation
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* HARD DELETION SAFETY MODAL */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-[#111111] border border-red-500/20 rounded-2xl z-50 p-6 space-y-6 shadow-2xl"
              id="product-delete-safety-modal"
            >
              <div className="space-y-3 text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <h4 className="font-serif text-base text-white font-bold uppercase tracking-wider">Confirm Soft Delete Protocol</h4>
                <p className="text-[11px] text-white/40 leading-relaxed max-w-xs mx-auto">
                  Sir, are you absolutely certain you intend to suspend apparel listing <span className="text-white font-semibold">&ldquo;{productToDelete?.name}&rdquo;</span> from showroom visibility?
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="bg-white/5 text-white flex-1 py-2 rounded text-xs uppercase tracking-wider font-semibold border border-white/10"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="bg-red-500 text-white flex-1 py-2 rounded text-xs uppercase tracking-wider font-semibold hover:bg-red-600 transition-colors"
                >
                  Authorize Suspend
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ORDER REVIEW COMPREHENSIVE DETAIL MODAL OVERLAY */}
      <AnimatePresence>
        {selectedOrderDetails && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrderDetails(null)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-4 max-w-lg mx-auto bg-[#111111] border border-white/15 rounded-2xl z-50 overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl h-fit max-h-[85vh]"
              id="order-details-review-overlay"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="font-serif text-lg text-white font-bold">
                  Boutique Dispatch Detail Review
                </h3>
                <button onClick={() => setSelectedOrderDetails(null)} className="text-white/60 hover:text-white p-1">
                  ✕
                </button>
              </div>

              <div className="space-y-4 font-mono text-xs leading-relaxed text-white/80">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Registry Key:</span>
                  <span className="font-bold text-[#20D9A1]">{selectedOrderDetails.id}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Client Profile:</span>
                  <span className="text-white font-sans">{selectedOrderDetails.customerName}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Registered Email:</span>
                  <span className="text-white">{selectedOrderDetails.customerEmail}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Contact Line:</span>
                  <span className="text-white">{selectedOrderDetails.customerPhone}</span>
                </div>
                <div className="border-b border-white/5 pb-2">
                  <span className="text-white/40 block">Shipping Location:</span>
                  <span className="text-white font-sans block mt-1">
                    {selectedOrderDetails.shippingAddress.address}, {selectedOrderDetails.shippingAddress.city}, {selectedOrderDetails.shippingAddress.district}, {selectedOrderDetails.shippingAddress.country}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/40">Settlement Code:</span>
                  <span className="text-white">{selectedOrderDetails.paymentMethod}</span>
                </div>
                
                <div className="space-y-1 border-b border-white/5 pb-2 font-sans">
                  <span className="text-white/40 font-mono text-xs block">Commission Items:</span>
                  {selectedOrderDetails.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs py-1 text-white">
                      <span>{it.productName} (Size {it.selectedSize} × {it.quantity})</span>
                      <span className="font-mono">Ugx {it.price * it.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-sm font-sans font-bold text-white pt-2">
                  <span>Authorized Ledger Sum:</span>
                  <span className="font-mono text-base text-[#20D9A1]">Ugx {selectedOrderDetails.amount}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  onClick={() => setSelectedOrderDetails(null)}
                  className="bg-white/5 hover:bg-white/10 text-white px-5 py-2 rounded text-xs uppercase font-semibold"
                >
                  Close Record
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* USER MANAGEMENT FORM MODAL */}
      <AnimatePresence>
        {isUserModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUserModalOpen(false)}
              className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="fixed inset-4 max-w-md mx-auto bg-[#111111] border border-white/10 rounded-2xl z-50 overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl h-fit max-h-[90vh]"
              id="user-form-modal"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="font-serif text-lg text-white font-bold">
                  {editingUser ? 'Amend Client Profile Key' : 'Create Boutique Profile Key'}
                </h3>
                <button onClick={() => setIsUserModalOpen(false)} className="text-white/60 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">Full Name</label>
                  <input
                    type="text"
                    required
                    value={uName}
                    onChange={(e) => setUName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:border-[#20D9A1] outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">Email Address</label>
                  <input
                    type="email"
                    required
                    value={uEmail}
                    onChange={(e) => setUEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:border-[#20D9A1] outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">Contact Line</label>
                  <input
                    type="text"
                    value={uPhone}
                    onChange={(e) => setUPhone(e.target.value)}
                    placeholder="e.g. +256701234567"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:border-[#20D9A1] outline-none transition-all font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">Authority Role</label>
                    <select
                      value={uRole}
                      onChange={(e) => setURole(e.target.value as any)}
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#20D9A1] transition-all"
                    >
                      <option value="Super Admin" className="bg-[#111111]">Super Admin</option>
                      <option value="Admin" className="bg-[#111111]">Admin</option>
                      <option value="Manager" className="bg-[#111111]">Manager</option>
                      <option value="Staff" className="bg-[#111111]">Staff</option>
                      <option value="Customer" className="bg-[#111111]">Customer</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold font-mono">Loyalty Points</label>
                    <input
                      type="number"
                      value={uRewardsPoints}
                      onChange={(e) => setURewardsPoints(Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#20D9A1] outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold font-mono">Lounge Spending (USD)</label>
                  <input
                    type="number"
                    value={uSpending}
                    onChange={(e) => setUSpending(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#20D9A1] outline-none transition-all font-mono"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/5 font-mono">
                  <button 
                    type="button" 
                    onClick={() => setIsUserModalOpen(false)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl text-xs uppercase font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#20D9A1] hover:bg-[#1bb887] text-black px-5 py-2.5 rounded-xl text-xs uppercase font-extrabold cursor-pointer"
                  >
                    Authorize Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* USER DELETION SAFETY MODAL */}
      <AnimatePresence>
        {isDeleteUserModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteUserModalOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-[#111111] border border-red-500/20 rounded-2xl z-50 p-6 space-y-6 shadow-2xl"
              id="user-delete-safety-modal"
            >
              <div className="space-y-3 text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <h4 className="font-serif text-base text-white font-bold uppercase tracking-wider">Confirm Profile Revocation</h4>
                <p className="text-[11px] text-white/40 leading-relaxed max-w-xs mx-auto">
                  Sir, are you absolutely certain you intend to revoke authorized clearance for <span className="text-white font-semibold">&ldquo;{userToDelete?.name}&rdquo;</span> ({userToDelete?.role})? This protocol will wipe access logs.
                </p>
              </div>

              <div className="flex gap-3 font-mono">
                <button 
                  onClick={() => setIsDeleteUserModalOpen(false)}
                  className="bg-white/5 text-white flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold border border-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDeleteUser}
                  className="bg-red-500 text-white flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold hover:bg-red-600 transition-colors cursor-pointer"
                >
                  Confirm Wipe
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* COUPON ADD/EDIT MODAL */}
      <AnimatePresence>
        {isCouponModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCouponModalOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-lg h-fit max-h-[90vh] overflow-y-auto bg-[#111111] border border-white/10 rounded-2xl z-50 p-6 space-y-6 shadow-2xl"
              id="coupon-modal"
            >
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <h3 className="font-serif text-lg text-white font-bold flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#C6A15B]" />
                  {editingCoupon ? 'Modify Promotional Coupon' : 'Create Luxury Coupon'}
                </h3>
                <button 
                  onClick={() => setIsCouponModalOpen(false)}
                  className="text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCoupon} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">
                    Coupon Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cpnCode}
                    onChange={(e) => setCpnCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER20"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#20D9A1] outline-none transition-all font-mono uppercase tracking-wider"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">
                      Discount Type <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={cpnDiscountType}
                      onChange={(e) => setCpnDiscountType(e.target.value as 'percentage' | 'fixed')}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#20D9A1] outline-none transition-all cursor-pointer font-mono"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (Ugx)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">
                      Discount Value <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={cpnDiscountValue}
                      onChange={(e) => setCpnDiscountValue(Number(e.target.value))}
                      placeholder={cpnDiscountType === 'percentage' ? '20' : '50000'}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#20D9A1] outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">
                      Minimum Subtotal (Ugx)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={cpnMinSubtotal}
                      onChange={(e) => setCpnMinSubtotal(e.target.value)}
                      placeholder="Optional e.g. 100000"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#20D9A1] outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">
                      Usage Limit
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={cpnUsageLimit}
                      onChange={(e) => setCpnUsageLimit(e.target.value)}
                      placeholder="Optional e.g. 100"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#20D9A1] outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={cpnExpiresAt}
                    onChange={(e) => setCpnExpiresAt(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#20D9A1] outline-none transition-all font-mono"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="cpnIsActive"
                    checked={cpnIsActive}
                    onChange={(e) => setCpnIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#20D9A1] bg-black/40 border-white/10 rounded cursor-pointer"
                  />
                  <label htmlFor="cpnIsActive" className="text-xs text-white font-mono cursor-pointer">
                    Enable Coupon for Storefront Checkout
                  </label>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/5 font-mono">
                  <button 
                    type="button" 
                    onClick={() => setIsCouponModalOpen(false)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl text-xs uppercase font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#20D9A1] hover:bg-[#1bb887] text-black px-5 py-2.5 rounded-xl text-xs uppercase font-extrabold cursor-pointer"
                  >
                    {editingCoupon ? 'Update Coupon' : 'Save Coupon'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* COUPON DELETION SAFETY MODAL */}
      <AnimatePresence>
        {isDeleteCouponModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteCouponModalOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-[#111111] border border-red-500/20 rounded-2xl z-50 p-6 space-y-6 shadow-2xl"
              id="coupon-delete-safety-modal"
            >
              <div className="space-y-3 text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <h4 className="font-serif text-base text-white font-bold uppercase tracking-wider">Confirm Coupon Removal</h4>
                <p className="text-[11px] text-white/40 leading-relaxed max-w-xs mx-auto">
                  Sir, are you sure you want to delete coupon code <span className="text-white font-mono font-semibold">&ldquo;{couponToDelete?.code}&rdquo;</span>? Customers will no longer be able to use it.
                </p>
              </div>

              <div className="flex gap-3 font-mono">
                <button 
                  onClick={() => setIsDeleteCouponModalOpen(false)}
                  className="bg-white/5 text-white flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold border border-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDeleteCoupon}
                  className="bg-red-500 text-white flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold hover:bg-red-600 transition-colors cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CATEGORY CREATE/EDIT MODAL */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-[#111111] border border-white/10 rounded-2xl z-50 p-6 space-y-6 shadow-2xl"
              id="category-modal"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#20D9A1]" />
                  <h4 className="font-serif text-lg text-white font-bold">
                    {editingCategory ? 'Edit Merchandise Category' : 'Create Merchandise Category'}
                  </h4>
                </div>
                <button 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">
                    Category Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={catNameInput}
                    onChange={(e) => {
                      setCatNameInput(e.target.value);
                      if (!editingCategory && !catSlugInput) {
                        setCatSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
                    placeholder="e.g. Suits, Outerwear, Knitwear"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#20D9A1] outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={catSlugInput}
                    onChange={(e) => setCatSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                    placeholder="e.g. suits, outerwear"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#20D9A1] outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={catDescInput}
                    onChange={(e) => setCatDescInput(e.target.value)}
                    placeholder="Brief overview of merchandise in this department..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#20D9A1] outline-none transition-all resize-none font-mono"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/5 font-mono">
                  <button 
                    type="button" 
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 rounded-xl text-xs uppercase font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#20D9A1] hover:bg-[#1bb887] text-black px-5 py-2.5 rounded-xl text-xs uppercase font-extrabold cursor-pointer"
                  >
                    {editingCategory ? 'Update Category' : 'Save Category'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CATEGORY DELETION SAFETY MODAL */}
      <AnimatePresence>
        {isDeleteCategoryModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteCategoryModalOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-[#111111] border border-red-500/20 rounded-2xl z-50 p-6 space-y-6 shadow-2xl"
              id="category-delete-safety-modal"
            >
              <div className="space-y-3 text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <h4 className="font-serif text-base text-white font-bold uppercase tracking-wider">Confirm Category Removal</h4>
                
                {categoryDeleteError ? (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-mono text-left leading-relaxed">
                    {categoryDeleteError}
                  </div>
                ) : (
                  <p className="text-[11px] text-white/40 leading-relaxed max-w-xs mx-auto">
                    Sir, are you sure you want to delete category <span className="text-white font-mono font-semibold">&ldquo;{categoryToDelete?.name}&rdquo;</span>?
                  </p>
                )}
              </div>

              <div className="flex gap-3 font-mono">
                <button 
                  onClick={() => setIsDeleteCategoryModalOpen(false)}
                  className="bg-white/5 text-white flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold border border-white/10 cursor-pointer"
                >
                  {categoryDeleteError ? 'Close' : 'Cancel'}
                </button>
                {!categoryDeleteError && (
                  <button 
                    onClick={handleConfirmDeleteCategory}
                    className="bg-red-500 text-white flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TESTIMONIAL CREATE / EDIT MODAL */}
      <AnimatePresence>
        {isTestimonialModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTestimonialModalOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-xl h-fit max-h-[90vh] overflow-y-auto bg-[#111111] border border-white/10 rounded-2xl z-50 p-6 space-y-6 shadow-2xl"
              id="testimonial-modal"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h3 className="font-serif text-lg text-white font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#C6A15B]" />
                  {editingTestimonial ? 'Edit Executive Testimonial' : 'Create Executive Testimonial'}
                </h3>
                <button 
                  onClick={() => setIsTestimonialModalOpen(false)}
                  className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTestimonial} className="space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-white/60 uppercase tracking-wider block">
                    Quote / Endorsement <span className="text-red-400">*</span>
                  </label>
                  <textarea 
                    value={testiQuoteInput}
                    onChange={(e) => setTestiQuoteInput(e.target.value)}
                    required
                    rows={4}
                    placeholder="Enter the client quote..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C6A15B] placeholder-white/30 resize-none"
                    id="testimonial-quote-input"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-white/60 uppercase tracking-wider block">
                      Author Full Name <span className="text-red-400">*</span>
                    </label>
                    <input 
                      type="text"
                      value={testiNameInput}
                      onChange={(e) => setTestiNameInput(e.target.value)}
                      required
                      placeholder="e.g. Dr. David Ssewankambo"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C6A15B] placeholder-white/30"
                      id="testimonial-name-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-white/60 uppercase tracking-wider block">
                      Display Order Number
                    </label>
                    <input 
                      type="number"
                      min={1}
                      value={testiDisplayOrderInput}
                      onChange={(e) => setTestiDisplayOrderInput(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C6A15B] font-mono"
                      id="testimonial-order-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-white/60 uppercase tracking-wider block">
                      Role / Title
                    </label>
                    <input 
                      type="text"
                      value={testiRoleInput}
                      onChange={(e) => setTestiRoleInput(e.target.value)}
                      placeholder="e.g. Managing Director"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C6A15B] placeholder-white/30"
                      id="testimonial-role-input"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-white/60 uppercase tracking-wider block">
                      Company / Organization
                    </label>
                    <input 
                      type="text"
                      value={testiCompanyInput}
                      onChange={(e) => setTestiCompanyInput(e.target.value)}
                      placeholder="e.g. Standard Capital Uganda"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C6A15B] placeholder-white/30"
                      id="testimonial-company-input"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={testiIsActiveInput}
                      onChange={(e) => setTestiIsActiveInput(e.target.checked)}
                      className="w-4 h-4 rounded bg-black/40 border-white/20 text-[#5F39FF] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      id="testimonial-active-checkbox"
                    />
                    <span className="text-xs text-white font-medium">
                      Publish and display this testimonial on the homepage
                    </span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 font-mono">
                  <button
                    type="button"
                    onClick={() => setIsTestimonialModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white/70 hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#5F39FF] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#4d2ee0] transition-all cursor-pointer shadow-lg shadow-[#5F39FF]/20"
                    id="save-testimonial-btn"
                  >
                    {editingTestimonial ? 'Update Testimonial' : 'Create Testimonial'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DELETE TESTIMONIAL MODAL */}
      <AnimatePresence>
        {isDeleteTestimonialModalOpen && testimonialToDelete && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteTestimonialModalOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-[#111111] border border-red-500/20 rounded-2xl z-50 p-6 space-y-6 shadow-2xl"
              id="testimonial-delete-modal"
            >
              <div className="space-y-3 text-center">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <h4 className="font-serif text-base text-white font-bold uppercase tracking-wider">Confirm Testimonial Removal</h4>
                <p className="text-[11px] text-white/40 leading-relaxed max-w-xs mx-auto">
                  Are you sure you want to delete testimonial by <span className="text-white font-mono font-semibold">&ldquo;{testimonialToDelete.name}&rdquo;</span>?
                </p>
              </div>

              <div className="flex gap-3 font-mono">
                <button 
                  onClick={() => setIsDeleteTestimonialModalOpen(false)}
                  className="bg-white/5 text-white flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold border border-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDeleteTestimonial}
                  className="bg-red-500 text-white flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider font-semibold hover:bg-red-600 transition-colors cursor-pointer"
                  id="confirm-delete-testimonial-btn"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
