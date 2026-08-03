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
  Star, MessageSquare, ChevronDown, ChevronUp, Tag, UserCircle, KeyRound
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getSafeImageSrc } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, User, Coupon, Category, Testimonial } from '../../types';
import { getSupabaseClient } from '../../lib/supabase';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import DashboardTab from './components/DashboardTab';
import ProductsTab from './components/ProductsTab';
import CategoriesTab from './components/CategoriesTab';
import TestimonialsTab from './components/TestimonialsTab';
import CouponsTab from './components/CouponsTab';
import OrdersTab from './components/OrdersTab';
import CustomersTab from './components/CustomersTab';
import UsersTab from './components/UsersTab';
import PaymentsTab from './components/PaymentsTab';
import BookingsTab from './components/BookingsTab';
import LogsTab from './components/LogsTab';
import ReconciliationTab from './components/ReconciliationTab';
import SettingsTab from './components/SettingsTab';

const DEFAULT_REVENUE_TARGET = 50000;

export default function Admin() {
  const router = useRouter();
  const { 
    currentUser, login, products, orders, users, auditLogs, payments, settings, bookings, coupons, categories, testimonials,
    adminError, clearAdminError,
    addProduct, updateProduct, deleteProduct, updateOrderStatus, updatePaymentStatus,
    adminAddUser, adminUpdateUser, adminDeleteUser, adminResetUserPassword, updateSettings,
    deleteReview, updateProductStockQuick, updateBookingStatus,
    addCoupon, updateCoupon, deleteCoupon,
    addCategory, updateCategory, deleteCategory,
    addTestimonial, updateTestimonial, deleteTestimonial
  } = useStore();

  // Admin-specific Realtime subscriptions for orders and profiles
  useRealtimeSync({ orders: true, profiles: true });

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'categories' | 'testimonials' | 'coupons' | 'orders' | 'customers' | 'users' | 'logs' | 'payments' | 'settings' | 'bookings' | 'reconciliation'>('dashboard');

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

    let res;
    if (editingTestimonial && editingTestimonial.id) {
      res = await updateTestimonial(editingTestimonial.id, payload, adminName, adminRole);
    } else {
      res = await addTestimonial(payload, adminName, adminRole);
    }
    if (res && !res.success) return;
    setIsTestimonialModalOpen(false);
  };

  const handleOpenDeleteTestimonialModal = (t: Testimonial) => {
    setTestimonialToDelete(t);
    setIsDeleteTestimonialModalOpen(true);
  };

  const handleConfirmDeleteTestimonial = async () => {
    if (testimonialToDelete && testimonialToDelete.id) {
      const res = await deleteTestimonial(testimonialToDelete.id, currentUser?.name || 'Master Admin', currentUser?.role || 'Super Admin');
      if (res && !res.success) return;
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
    
    let res;
    if (editingCategory) {
      res = await updateCategory(editingCategory.id || editingCategory.slug, {
        name: catNameInput.trim(),
        slug,
        description: catDescInput.trim()
      }, adminName, adminRole);
    } else {
      res = await addCategory({
        name: catNameInput.trim(),
        slug,
        description: catDescInput.trim()
      }, adminName, adminRole);
    }
    if (res && !res.success) return;
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
  const [uPassword, setUPassword] = useState('');
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Reset Password & Temp Credential Reveal State
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  const [tempPasswordModalOpen, setTempPasswordModalOpen] = useState(false);
  const [tempPasswordToShow, setTempPasswordToShow] = useState<string | null>(null);
  const [tempPasswordUserEmail, setTempPasswordUserEmail] = useState<string | null>(null);

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

    let res;
    if (editingCoupon && editingCoupon.id) {
      res = await updateCoupon(editingCoupon.id, payload, currentUser?.name || 'Admin', currentUser?.role || 'Staff');
    } else {
      res = await addCoupon(payload, currentUser?.name || 'Admin', currentUser?.role || 'Staff');
    }
    if (res && !res.success) return;

    setIsCouponModalOpen(false);
  };

  const handleOpenDeleteCouponModal = (coupon: Coupon) => {
    setCouponToDelete(coupon);
    setIsDeleteCouponModalOpen(true);
  };

  const handleConfirmDeleteCoupon = async () => {
    if (couponToDelete && couponToDelete.id) {
      const res = await deleteCoupon(couponToDelete.id, currentUser?.name || 'Admin', currentUser?.role || 'Staff');
      if (res && !res.success) return;
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
  const [pDealExpiresAt, setPDealExpiresAt] = useState('');

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

  // Filter customers state
  const [customerSearch, setCustomerSearch] = useState('');

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

  // Reconciliation flags state
  const [reconciliationFlags, setReconciliationFlags] = useState<any[]>([]);
  const [reconciliationSearch, setReconciliationSearch] = useState('');
  const [isLoadingReconciliation, setIsLoadingReconciliation] = useState(false);

  // VIP Clientele derived data (Hooks must be unconditional)
  const customerUsers = useMemo(() => {
    return (users || [])
      .filter(u => u.role === 'Customer')
      .map(u => {
        const userOrders = (orders || []).filter(o => 
          (o.customerEmail && u.email && o.customerEmail.toLowerCase() === u.email.toLowerCase()) ||
          (o.customerName && u.name && o.customerName.toLowerCase() === u.name.toLowerCase())
        );
        const totalOrders = userOrders.length;
        const lifetimeSpend = userOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
        
        let lastOrderDate = 'N/A';
        let lastOrderStatus = 'N/A';
        if (userOrders.length > 0) {
          const sorted = [...userOrders].sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            if (!isNaN(timeA) && !isNaN(timeB)) return timeB - timeA;
            return 0;
          });
          lastOrderDate = sorted[0].date || 'N/A';
          lastOrderStatus = sorted[0].status || 'N/A';
        }
        return {
          ...u,
          totalOrders,
          lifetimeSpend,
          lastOrderDate,
          lastOrderStatus
        };
      });
  }, [users, orders]);

  const filteredCustomers = useMemo(() => {
    return customerUsers.filter(c => {
      const search = customerSearch.toLowerCase().trim();
      if (!search) return true;
      return (
        c.name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        (c.phone && c.phone.toLowerCase().includes(search))
      );
    });
  }, [customerUsers, customerSearch]);

  useEffect(() => {
    if (activeTab === 'reconciliation') {
      const fetchFlags = async () => {
        setIsLoadingReconciliation(true);
        try {
          const supabase = getSupabaseClient();
          if (supabase) {
            const { data, error } = await supabase
              .from('reconciliation_flags')
              .select('*')
              .order('created_at', { ascending: false });
            if (!error && data) {
              setReconciliationFlags(data);
            }
          }
        } catch (err) {
          console.error('Failed to fetch reconciliation flags:', err);
        } finally {
          setIsLoadingReconciliation(false);
        }
      };
      fetchFlags();
    }
  }, [activeTab]);

  const filteredReconciliationFlags = useMemo(() => {
    return (reconciliationFlags || []).filter((flag) => {
      const search = reconciliationSearch.toLowerCase();
      if (!search) return true;
      return (
        (flag.transaction_id || '').toLowerCase().includes(search) ||
        (flag.email || '').toLowerCase().includes(search) ||
        (flag.payment_provider || '').toLowerCase().includes(search) ||
        (flag.raw_error || '').toLowerCase().includes(search)
      );
    });
  }, [reconciliationFlags, reconciliationSearch]);

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
  const [sCourierStdFee, setSCourierStdFee] = useState(() => settings?.courierFees?.standard ?? 50);
  const [sCourierExpFee, setSCourierExpFee] = useState(() => settings?.courierFees?.express ?? 120);
  const [sCourierPickFee, setSCourierPickFee] = useState(() => settings?.courierFees?.pickup ?? 0);
  const [sCourierStdActive, setSCourierStdActive] = useState(() => settings?.courierMethods?.standard !== false);
  const [sCourierExpActive, setSCourierExpActive] = useState(() => settings?.courierMethods?.express !== false);
  const [sCourierPickActive, setSCourierPickActive] = useState(() => settings?.courierMethods?.pickup !== false);
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
      setSCourierStdFee(settings.courierFees?.standard ?? 50);
      setSCourierExpFee(settings.courierFees?.express ?? 120);
      setSCourierPickFee(settings.courierFees?.pickup ?? 0);
      setSCourierStdActive(settings.courierMethods?.standard !== false);
      setSCourierExpActive(settings.courierMethods?.express !== false);
      setSCourierPickActive(settings.courierMethods?.pickup !== false);
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
  const canSeeReconciliation = userRole === 'Super Admin' || userRole === 'Admin';
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
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updateSettings({
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
      },
      courierFees: {
        standard: Number(sCourierStdFee),
        express: Number(sCourierExpFee),
        pickup: Number(sCourierPickFee)
      },
      courierMethods: {
        standard: !!sCourierStdActive,
        express: !!sCourierExpActive,
        pickup: !!sCourierPickActive
      }
    }, currentUser?.name || 'Master Admin', currentUser?.role || 'Super Admin');

    if (res && !res.success) return;

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
      setPDealExpiresAt(prod.dealExpiresAt ? new Date(prod.dealExpiresAt).toISOString().slice(0, 16) : '');
      
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
      setPDealExpiresAt('');
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
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const operatorName = currentUser?.name || 'Master Admin';
    const operatorRole = currentUser?.role || 'Super Admin';
    
    const finalSizes = pSizesInput.split(',').map(s => s.trim()).filter(s => s !== '');
    const finalColors = pColorsInput.split(',').map(c => c.trim()).filter(c => c !== '');

    let calculatedDealExpiresAt: string | null = null;
    let computedIsDeal = pIsDeal;

    if (pIsDeal) {
      if (pDealExpiresAt && pDealExpiresAt.trim() !== '' && !isNaN(new Date(pDealExpiresAt).getTime())) {
        calculatedDealExpiresAt = new Date(pDealExpiresAt).toISOString();
      } else {
        const days = Number(pSecretDays) || 0;
        const hours = Number(pSecretHours) || 0;
        const mins = Number(pSecretMins) || 0;
        const secs = Number(pSecretSecs) || 0;
        const durationMs = (((days * 24 + hours) * 60 + mins) * 60 + secs) * 1000;
        if (durationMs > 0) {
          calculatedDealExpiresAt = new Date(Date.now() + durationMs).toISOString();
        } else {
          computedIsDeal = false;
        }
      }
    }

    const dealPayload = {
      isDealOfTheDay: computedIsDeal,
      discountPercentage: computedIsDeal ? Number(pDiscountPercentage) : 0,
      dealDays: computedIsDeal ? Number(pSecretDays) : undefined,
      dealHours: computedIsDeal ? Number(pSecretHours) : undefined,
      dealMins: computedIsDeal ? Number(pSecretMins) : undefined,
      dealSecs: computedIsDeal ? Number(pSecretSecs) : undefined,
      dealExpiresAt: computedIsDeal ? calculatedDealExpiresAt : null
    };

    let res;
    if (editingProduct) {
      res = await updateProduct(editingProduct.id, {
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
        ...dealPayload
      }, operatorName, operatorRole);
    } else {
      res = await addProduct({
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
        ...dealPayload
      }, operatorName, operatorRole);
    }
    if (res && !res.success) return;
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

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      const operatorName = currentUser?.name || 'Master Admin';
      const operatorRole = currentUser?.role || 'Super Admin';
      const res = await deleteProduct(productToDelete.id, operatorName, operatorRole);
      if (res && !res.success) return;
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
      setUPassword('');
    } else {
      setEditingUser(null);
      setUName('');
      setUEmail('');
      setUPhone('');
      setURole('Customer');
      setUSpending(0);
      setURewardsPoints(0);
      setUPassword('');
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const adminName = currentUser?.name || 'Master Admin';
    const adminRole = currentUser?.role || 'Super Admin';

    let res: { success: boolean; error?: string; temporaryPassword?: string };
    if (editingUser) {
      res = await adminUpdateUser(editingUser.id, {
        name: uName,
        email: uEmail,
        phone: uPhone,
        role: uRole,
        spending: Number(uSpending),
        rewardsPoints: Number(uRewardsPoints)
      }, adminName, adminRole);
      if (!res.success && res.error) {
        alert(res.error);
      } else {
        setIsUserModalOpen(false);
      }
    } else {
      res = await adminAddUser({
        name: uName,
        email: uEmail,
        phone: uPhone,
        role: uRole,
        spending: Number(uSpending),
        rewardsPoints: Number(uRewardsPoints),
        password: uPassword || undefined
      }, adminName, adminRole);

      if (!res.success && res.error) {
        alert(res.error);
      } else {
        setIsUserModalOpen(false);
        if (res.temporaryPassword) {
          setTempPasswordToShow(res.temporaryPassword);
          setTempPasswordUserEmail(uEmail);
          setTempPasswordModalOpen(true);
        }
      }
    }
  };

  const handleOpenResetPasswordModal = (user: User) => {
    setUserToReset(user);
    setResetPasswordInput('');
    setResetPasswordError(null);
    setIsResetPasswordModalOpen(true);
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToReset) return;
    const adminName = currentUser?.name || 'Master Admin';
    const adminRole = currentUser?.role || 'Super Admin';

    setResetPasswordError(null);
    const res = await adminResetUserPassword(
      userToReset.id,
      resetPasswordInput || undefined,
      adminName,
      adminRole
    );

    if (!res.success) {
      setResetPasswordError(res.error || 'Failed to reset user password.');
    } else {
      setIsResetPasswordModalOpen(false);
      if (res.temporaryPassword) {
        setTempPasswordToShow(res.temporaryPassword);
        setTempPasswordUserEmail(userToReset.email);
        setTempPasswordModalOpen(true);
      }
      setUserToReset(null);
    }
  };

  const handleOpenDeleteUserModal = (user: User) => {
    if (!canModifyUsers) {
      alert("Security alert: Your role level does not authorize user hard deletions.");
      return;
    }
    setUserToDelete(user);
    setIsDeleteUserModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (userToDelete) {
      const adminName = currentUser?.name || 'Master Admin';
      const adminRole = currentUser?.role || 'Super Admin';
      const res = await adminDeleteUser(userToDelete.id, adminName, adminRole);
      if (!res.success && res.error) {
        alert(res.error);
      }
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
              { id: 'customers', name: 'VIP Clientele', icon: UserCircle, count: customerUsers.length },
              { id: 'bookings', name: 'Style Bookings', icon: Calendar, count: (bookings || []).length },
              { id: 'payments', name: 'Payment Ledger', icon: CreditCard, count: (payments || []).length },
              { id: 'users', name: 'Authorized Staff', icon: Users },
              { id: 'logs', name: 'Security Audits', icon: FileText, count: auditLogs.length },
              { id: 'reconciliation', name: 'Reconciliation', icon: ShieldAlert, count: reconciliationFlags.length },
              { id: 'settings', name: 'Boutique Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              
              if (tab.id === 'categories' && !canSeeCategories) return null;
              if (tab.id === 'testimonials' && !canSeeTestimonials) return null;
              if (tab.id === 'coupons' && !canSeeCoupons) return null;
              if (tab.id === 'logs' && !canSeeLogs) return null;
              if (tab.id === 'reconciliation' && !canSeeReconciliation) return null;
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
              <DashboardTab
                totalRevenue={totalRevenue}
                orders={orders}
                activeCustomers={activeCustomers}
                products={products}
                revenueTarget={settings?.monthlyRevenueTarget || DEFAULT_REVENUE_TARGET}
              />
            )}

            {/* SUB-TAB 2: PRODUCTS APPAREL REGISTRY */}
            {activeTab === 'products' && (
              <ProductsTab
                canModifyProducts={canModifyProducts}
                handleOpenProductModal={handleOpenProductModal}
                productSearch={productSearch}
                setProductSearch={setProductSearch}
                productCategoryFilter={productCategoryFilter}
                setProductCategoryFilter={setProductCategoryFilter}
                stockStatusFilter={stockStatusFilter}
                setStockStatusFilter={setStockStatusFilter}
                productSort={productSort}
                setProductSort={setProductSort}
                filteredProducts={filteredProducts}
                getSafeImageSrc={getSafeImageSrc}
                updateProductStockQuick={updateProductStockQuick}
                currentUser={currentUser}
                handleOpenDeleteModal={handleOpenDeleteModal}
                expandedReviewsProductId={expandedReviewsProductId}
                setExpandedReviewsProductId={setExpandedReviewsProductId}
                deleteReview={deleteReview}
              />
            )}

            {/* SUB-TAB: CATEGORIES MANAGEMENT */}
            {activeTab === 'categories' && canSeeCategories && (
              <CategoriesTab
                canSeeCategories={canSeeCategories}
                canModifyCategories={canModifyCategories}
                handleOpenCategoryModal={handleOpenCategoryModal}
                categorySearch={categorySearch}
                setCategorySearch={setCategorySearch}
                filteredCategories={filteredCategories}
                products={products}
                handleOpenDeleteCategoryModal={handleOpenDeleteCategoryModal}
              />
            )}

            {/* SUB-TAB: TESTIMONIALS MANAGEMENT */}
            {activeTab === 'testimonials' && canSeeTestimonials && (
              <TestimonialsTab
                canSeeTestimonials={canSeeTestimonials}
                canModifyTestimonials={canModifyTestimonials}
                handleOpenTestimonialModal={handleOpenTestimonialModal}
                testimonialSearch={testimonialSearch}
                setTestimonialSearch={setTestimonialSearch}
                filteredTestimonials={filteredTestimonials}
                updateTestimonial={updateTestimonial}
                currentUser={currentUser}
                handleOpenDeleteTestimonialModal={handleOpenDeleteTestimonialModal}
              />
            )}

            {/* SUB-TAB: COUPONS MANAGEMENT */}
            {activeTab === 'coupons' && canSeeCoupons && (
              <CouponsTab
                canSeeCoupons={canSeeCoupons}
                handleOpenCouponModal={handleOpenCouponModal}
                couponSearch={couponSearch}
                setCouponSearch={setCouponSearch}
                couponTypeFilter={couponTypeFilter}
                setCouponTypeFilter={setCouponTypeFilter}
                couponStatusFilter={couponStatusFilter}
                setCouponStatusFilter={setCouponStatusFilter}
                filteredCoupons={filteredCoupons}
                handleOpenDeleteCouponModal={handleOpenDeleteCouponModal}
              />
            )}

            {/* SUB-TAB 3: ORDER LEDGER MODIFICATIONS */}
            {activeTab === 'orders' && (
              <OrdersTab
                handleExportData={handleExportData}
                orderSearch={orderSearch}
                setOrderSearch={setOrderSearch}
                orderStatusFilter={orderStatusFilter}
                setOrderStatusFilter={setOrderStatusFilter}
                filteredOrders={filteredOrders}
                canModifyOrders={canModifyOrders}
                updateOrderStatus={updateOrderStatus}
                currentUser={currentUser}
                setSelectedOrderDetails={setSelectedOrderDetails}
              />
            )}

            {/* SUB-TAB: VIP CLIENTELE (CUSTOMERS) */}
            {activeTab === 'customers' && (
              <CustomersTab
                customerSearch={customerSearch}
                setCustomerSearch={setCustomerSearch}
                filteredCustomers={filteredCustomers}
                setOrderSearch={setOrderSearch}
                setActiveTab={setActiveTab}
              />
            )}

            {/* SUB-TAB 4: AUTHORIZED STAFF LIST & USER MANAGEMENT */}
            {activeTab === 'users' && (
              <UsersTab
                canModifyUsers={canModifyUsers}
                handleOpenUserModal={handleOpenUserModal}
                userSearch={userSearch}
                setUserSearch={setUserSearch}
                userRoleFilter={userRoleFilter}
                setUserRoleFilter={setUserRoleFilter}
                filteredUsers={filteredUsers}
                currentUser={currentUser}
                handleOpenDeleteUserModal={handleOpenDeleteUserModal}
                handleOpenResetPasswordModal={handleOpenResetPasswordModal}
              />
            )}

            {/* SUB-TAB: PAYMENT LEDGER */}
            {activeTab === 'payments' && (
              <PaymentsTab
                paymentStats={paymentStats}
                paymentSearch={paymentSearch}
                setPaymentSearch={setPaymentSearch}
                paymentStatusFilter={paymentStatusFilter}
                setPaymentStatusFilter={setPaymentStatusFilter}
                paymentMethodFilter={paymentMethodFilter}
                setPaymentMethodFilter={setPaymentMethodFilter}
                filteredPayments={filteredPayments}
                updatePaymentStatus={updatePaymentStatus}
                currentUser={currentUser}
                orders={orders}
              />
            )}

            {/* SUB-TAB: STYLE BOOKINGS */}
            {activeTab === 'bookings' && (
              <BookingsTab
                bookingSearch={bookingSearch}
                setBookingSearch={setBookingSearch}
                bookingStatusFilter={bookingStatusFilter}
                setBookingStatusFilter={setBookingStatusFilter}
                filteredBookings={filteredBookings}
                updateBookingStatus={updateBookingStatus}
                currentUser={currentUser}
              />
            )}

            {/* SUB-TAB 5: SECURITY AUDIT LOGS */}
            {activeTab === 'logs' && canSeeLogs && (
              <LogsTab
                canSeeLogs={canSeeLogs}
                logSearch={logSearch}
                setLogSearch={setLogSearch}
                logActionFilter={logActionFilter}
                setLogActionFilter={setLogActionFilter}
                filteredLogs={filteredLogs}
              />
            )}

            {/* SUB-TAB: RECONCILIATION FLAGS */}
            {activeTab === 'reconciliation' && canSeeReconciliation && (
              <ReconciliationTab
                canSeeReconciliation={canSeeReconciliation}
                reconciliationSearch={reconciliationSearch}
                setReconciliationSearch={setReconciliationSearch}
                isLoadingReconciliation={isLoadingReconciliation}
                filteredReconciliationFlags={filteredReconciliationFlags}
              />
            )}
            {/* SUB-TAB: BOUTIQUE SETTINGS */}
            {activeTab === 'settings' && canSeeSettings && (
              <SettingsTab
                canSeeSettings={canSeeSettings}
                settingsSuccess={settingsSuccess}
                handleSaveSettings={handleSaveSettings}
                sHours={sHours}
                setSHours={setSHours}
                sPhone={sPhone}
                setSPhone={setSPhone}
                sCurrency={sCurrency}
                setSCurrency={setSCurrency}
                sTaxRate={sTaxRate}
                setSTaxRate={setSTaxRate}
                sThreshold={sThreshold}
                setSThreshold={setSThreshold}
                sGreeting={sGreeting}
                setSGreet={setSGreet}
                sSecretOffer={sSecretOffer}
                setSSecretOffer={setSSecretOffer}
                sBanner={sBanner}
                setSBanner={setSBanner}
                sMaintenance={sMaintenance}
                setSMaintenance={setSMaintenance}
                sPayMomo={sPayMomo}
                setSPayMomo={setSPayMomo}
                sPayVisa={sPayVisa}
                setSPayVisa={setSPayVisa}
                sPayCod={sPayCod}
                setSPayCod={setSPayCod}
                sCourierStdFee={sCourierStdFee}
                setSCourierStdFee={setSCourierStdFee}
                sCourierExpFee={sCourierExpFee}
                setSCourierExpFee={setSCourierExpFee}
                sCourierPickFee={sCourierPickFee}
                setSCourierPickFee={setSCourierPickFee}
                sCourierStdActive={sCourierStdActive}
                setSCourierStdActive={setSCourierStdActive}
                sCourierExpActive={sCourierExpActive}
                setSCourierExpActive={setSCourierExpActive}
                sCourierPickActive={sCourierPickActive}
                setSCourierPickActive={setSCourierPickActive}
                settings={settings}
              />
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
                          Target Expiration Date/Time (Optional, overrides static counters)
                        </label>
                        <input 
                          type="datetime-local" 
                          value={pDealExpiresAt} 
                          onChange={(e) => setPDealExpiresAt(e.target.value)} 
                          className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-[#C6A15B] font-bold outline-none font-mono text-xs cursor-pointer focus:border-[#C6A15B]/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono block">
                          Atelier reservation lines close in (Static Fallback)
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

                {!editingUser && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">
                      Temporary Password <span className="normal-case text-white/25">(optional — auto-generated if left blank)</span>
                    </label>
                    <input
                      type="text"
                      value={uPassword}
                      onChange={(e) => setUPassword(e.target.value)}
                      placeholder="Leave blank to auto-generate a secure temporary password"
                      minLength={6}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:border-[#20D9A1] outline-none transition-all font-mono"
                    />
                  </div>
                )}

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

      {/* RESET USER PASSWORD MODAL */}
      <AnimatePresence>
        {isResetPasswordModalOpen && userToReset && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetPasswordModalOpen(false)}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-[#111111] border border-amber-500/30 rounded-2xl z-50 p-6 space-y-5 shadow-2xl"
              id="reset-password-modal"
            >
              <div className="space-y-2 text-center">
                <KeyRound className="w-10 h-10 text-amber-400 mx-auto" />
                <h4 className="font-serif text-lg text-white font-bold tracking-tight">Reset User Password</h4>
                <p className="text-xs text-white/60">
                  Reset authentication credentials for <span className="text-white font-mono font-semibold">&ldquo;{userToReset.name}&rdquo;</span> ({userToReset.email}).
                </p>
              </div>

              {resetPasswordError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl font-mono">
                  {resetPasswordError}
                </div>
              )}

              <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/40 uppercase font-mono tracking-widest block font-bold">
                    New Password <span className="normal-case text-white/25">(optional — auto-generated if left blank)</span>
                  </label>
                  <input
                    type="text"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    placeholder="Leave blank to auto-generate a secure temporary password"
                    minLength={6}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/20 focus:border-amber-400 outline-none transition-all font-mono"
                  />
                </div>

                <div className="flex gap-3 font-mono pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsResetPasswordModalOpen(false)}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TEMPORARY PASSWORD REVEAL MODAL */}
      <AnimatePresence>
        {tempPasswordModalOpen && tempPasswordToShow && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setTempPasswordModalOpen(false);
                setTempPasswordToShow(null);
                setTempPasswordUserEmail(null);
              }}
              className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-0 m-auto w-full max-w-md h-fit bg-[#111111] border border-[#20D9A1]/30 rounded-2xl z-50 p-6 space-y-5 shadow-2xl"
              id="temp-password-modal"
            >
              <div className="space-y-2 text-center">
                <KeyRound className="w-10 h-10 text-[#20D9A1] mx-auto" />
                <h4 className="font-serif text-lg text-white font-bold tracking-tight">Temporary Credentials Issued</h4>
                <p className="text-xs text-white/60">
                  {tempPasswordUserEmail ? `Credentials generated for ${tempPasswordUserEmail}:` : 'The temporary password below has been assigned:'}
                </p>
              </div>

              <div className="bg-black/60 border border-[#20D9A1]/30 rounded-xl p-4 text-center font-mono space-y-2">
                <span className="text-[10px] text-white/40 uppercase tracking-widest block font-bold">Temporary Password</span>
                <p className="text-lg text-[#20D9A1] font-bold tracking-wider select-all break-all">{tempPasswordToShow}</p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-200/80 leading-relaxed font-mono">
                ⚠ Share this password with the user directly and ask them to change it after logging in. It will not be shown again.
              </div>

              <div className="flex justify-end font-mono pt-2">
                <button 
                  onClick={() => {
                    setTempPasswordModalOpen(false);
                    setTempPasswordToShow(null);
                    setTempPasswordUserEmail(null);
                  }}
                  className="w-full bg-[#20D9A1] hover:bg-[#1bb887] text-black font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Acknowledge & Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
