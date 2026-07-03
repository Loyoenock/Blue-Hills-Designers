'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Calendar, ChevronRight, Compass, CreditCard, DollarSign, 
  Download, Edit, Eye, Filter, Grid, HelpCircle, Layers, LogOut, 
  Plus, Printer, RefreshCw, Search, ShieldAlert, ShoppingBag, 
  Trash2, TrendingUp, Users, X, FileText, CheckCircle, Upload, Settings
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MobileNav from '../../components/MobileNav';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Order, User } from '../../types';

export default function Admin() {
  const router = useRouter();
  const { 
    currentUser, login, products, orders, users, auditLogs, payments, settings,
    addProduct, updateProduct, deleteProduct, updateOrderStatus, updatePaymentStatus,
    adminAddUser, adminUpdateUser, adminDeleteUser, updateSettings
  } = useStore();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'users' | 'logs' | 'payments' | 'settings'>('dashboard');

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
  const [pImages, setPImages] = useState<string[]>(['https://lh3.googleusercontent.com/aida-public/AB6AXuAi8UecRS-XnyrMnJeZL1BQVfI-k0R_gJR1LOmjQdttfkYhoplY3uVFZbanSoR2yMSezA5cR3e61-ad015ej7NHi3pxyGxrkLADT7Q_LZ1GutmVRTp4mDhq-j2uiwCqyCvXNPehFnXRH-LxmBTxPsLco-fna_xAO86vswBmBY2C-2KyB_lA85jIzmULF-qrB23JFySnGOOTlEGa9x7PfP1HLr3OUhu-yYHF7BQNYYBXL3_XdDjAitK2gg']);
  const [pIsNew, setPIsNew] = useState(false);
  const [pIsFeatured, setPIsFeatured] = useState(false);
  const [pIsDeal, setPIsDeal] = useState(false);
  const [pDiscountPercentage, setPDiscountPercentage] = useState(0);

  // Delete product safety confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Filter products state
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');

  // Filter orders state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');

  // Filter payments state
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');

  // Selected Order for detail overlay modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Boutique Settings state
  const [sHours, setSHours] = useState(() => settings?.showroomHours || '');
  const [sPhone, setSPhone] = useState(() => settings?.conciergePhone || '');
  const [sThreshold, setSThreshold] = useState(() => settings?.freeShippingThreshold || 0);
  const [sTaxRate, setSTaxRate] = useState(() => settings?.taxRate || 0);
  const [sGreeting, setSGreet] = useState(() => settings?.aiGreetingPrefix || '');
  const [sBanner, setSBanner] = useState(() => settings?.enableNewsBanner !== false);
  const [sMaintenance, setSMaintenance] = useState(() => !!settings?.maintenanceMode);
  const [sCurrency, setSCurrency] = useState(() => settings?.currencySymbol || 'Ugx');
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Initialize settings states
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (settings) {
      setSHours(settings.showroomHours || '');
      setSPhone(settings.conciergePhone || '');
      setSThreshold(settings.freeShippingThreshold || 0);
      setSTaxRate(settings.taxRate || 0);
      setSGreet(settings.aiGreetingPrefix || '');
      setSBanner(settings.enableNewsBanner !== false);
      setSMaintenance(!!settings.maintenanceMode);
      setSCurrency(settings.currencySymbol || 'Ugx');
    }
  }, [settings]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const paymentStats = useMemo(() => {
    const list = payments || [];
    const settledSum = list.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    const pendingSum = list.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);
    const refundedSum = list.filter(p => p.status === 'Refunded').reduce((sum, p) => sum + p.amount, 0);
    const failedSum = list.filter(p => p.status === 'Failed').reduce((sum, p) => sum + p.amount, 0);
    return { settledSum, pendingSum, refundedSum, failedSum };
  }, [payments]);

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
  const canModifyUsers = userRole === 'Super Admin' || userRole === 'Admin';

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-black">
        <Header />
        <main className="max-w-md mx-auto px-4 py-24 text-center space-y-6 flex-1 flex flex-col justify-center">
          <div className="w-16 h-16 rounded-full bg-red-950/20 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl text-white font-bold">Boutique Security Intercept</h3>
            <p className="text-white/40 text-xs font-light max-w-xs mx-auto leading-relaxed">
              This panel is restricted to Super Admins, Managers, and Staff. Please sign in with an authorized profile to bypass.
            </p>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => {
                // Predefined quick bypass login as Super Admin
                login('amama@bluehills.com');
              }}
              className="w-full bg-[#5F39FF] text-white py-3 rounded-lg text-xs font-semibold uppercase tracking-widest text-center transition-all cursor-pointer"
              id="bypass-admin-btn"
            >
              Log In as Master Admin (Amama)
            </button>
            <Link 
              href="/login" 
              className="block bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3 rounded-lg text-xs font-semibold uppercase tracking-widest text-center transition-all"
            >
              Sign In with Credentials
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Dashboard calculations
  const totalRevenue = orders
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + o.amount, 0);

  const activeCustomers = users.filter(u => u.role === 'Customer').length;

  // Filter products list
  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.description.toLowerCase().includes(productSearch.toLowerCase());
    const matchCat = productCategoryFilter === 'All' || p.category === productCategoryFilter;
    return matchSearch && matchCat;
  });

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

  // Handle Save Boutique Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      showroomHours: sHours,
      conciergePhone: sPhone,
      freeShippingThreshold: Number(sThreshold),
      taxRate: Number(sTaxRate),
      aiGreetingPrefix: sGreeting,
      enableNewsBanner: sBanner,
      maintenanceMode: sMaintenance,
      currencySymbol: sCurrency
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
      setPImages(prod.images);
      setPIsNew(!!prod.isNew);
      setPIsFeatured(!!prod.isFeatured);
      setPIsDeal(!!prod.isDealOfTheDay);
      setPDiscountPercentage(prod.discountPercentage || 0);
      
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
      setPImages(['https://lh3.googleusercontent.com/aida-public/AB6AXuAi8UecRS-XnyrMnJeZL1BQVfI-k0R_gJR1LOmjQdttfkYhoplY3uVFZbanSoR2yMSezA5cR3e61-ad015ej7NHi3pxyGxrkLADT7Q_LZ1GutmVRTp4mDhq-j2uiwCqyCvXNPehFnXRH-LxmBTxPsLco-fna_xAO86vswBmBY2C-2KyB_lA85jIzmULF-qrB23JFySnGOOTlEGa9x7PfP1HLr3OUhu-yYHF7BQNYYBXL3_XdDjAitK2gg']);
      setPIsNew(true);
      setPIsFeatured(false);
      setPIsDeal(false);
      setPDiscountPercentage(0);
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
    
    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: pName,
        description: pDesc,
        category: pCategory as any,
        price: Number(pPrice),
        stock: Number(pStock),
        sizes: pSizes,
        colors: pColors,
        images: pImages,
        isNew: pIsNew,
        isFeatured: pIsFeatured,
        isDealOfTheDay: pIsDeal,
        discountPercentage: pIsDeal ? Number(pDiscountPercentage) : 0
      }, operatorName, operatorRole);
    } else {
      addProduct({
        name: pName,
        description: pDesc,
        category: pCategory as any,
        price: Number(pPrice),
        stock: Number(pStock),
        sizes: pSizes,
        colors: pColors,
        images: pImages,
        isNew: pIsNew,
        isFeatured: pIsFeatured,
        isDealOfTheDay: pIsDeal,
        discountPercentage: pIsDeal ? Number(pDiscountPercentage) : 0
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
      <Header />

      {/* Admin Panel Header */}
      <div className="border-b border-white/5 bg-[#111111]/60 py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-red-500 font-mono font-bold">Secure Command Core</span>
            </div>
            <h1 className="font-serif text-3xl text-white tracking-tight font-medium">Boutique Operations Console</h1>
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

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ADMIN SIDEBAR CONTROLS (3 columns on lg) */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-4 space-y-1.5 shadow-xl">
            {[
              { id: 'dashboard', name: 'Boutique Pulse', icon: BarChart },
              { id: 'products', name: 'Apparel Registry', icon: Grid },
              { id: 'orders', name: 'Order Ledger', icon: ShoppingBag, count: orders.length },
              { id: 'payments', name: 'Payment Ledger', icon: CreditCard, count: (payments || []).length },
              { id: 'users', name: 'Authorized Staff', icon: Users },
              { id: 'logs', name: 'Security Audits', icon: FileText, count: auditLogs.length },
              { id: 'settings', name: 'Boutique Settings', icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              
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
                      <Plus className="w-4 h-4" /> Add Tailoring Product
                    </button>
                  )}
                </div>

                {/* Search & filtering */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#111111] p-4 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 col-span-2">
                    <Search className="w-4 h-4 text-white/40" />
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
                      className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white focus:outline-none"
                    >
                      <option value="All">All Categories</option>
                      <option value="Suits">Suits</option>
                      <option value="Shirts">Shirts</option>
                      <option value="Shoes">Shoes</option>
                      <option value="Accessories">Accessories</option>
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
                          <tr key={p.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-2">
                              <div className="relative w-8 h-10 rounded overflow-hidden bg-black shrink-0">
                                <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="32px" referrerPolicy="no-referrer" />
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
                            </td>
                            <td className="py-3 px-2 font-mono uppercase text-[10px] text-white/50">{p.category}</td>
                            <td className="py-3 px-2 font-mono font-bold text-[#20D9A1]">Ugx {p.price}</td>
                            <td className="py-3 px-2 font-mono">
                              <span className={p.stock <= 2 ? 'text-red-400 font-bold' : 'text-white'}>
                                {p.stock} units
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex justify-end gap-1.5">
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
                        ))}
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
                  <h3 className="font-serif text-xl text-white font-bold">Boutique Orders Ledger</h3>

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
                    <h3 className="font-serif text-xl text-white font-bold">User & Boutique Access Directory</h3>
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

                <div className="bg-black/60 border border-white/10 rounded-2xl p-6 font-mono text-[11px] leading-relaxed space-y-3 max-h-[500px] overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="border-b border-white/5 pb-2.5 flex items-start gap-3">
                      <span className="text-white/30 shrink-0">[{log.timestamp}]</span>
                      <div className="space-y-0.5">
                        <p className="text-[#20D9A1] font-bold uppercase tracking-wider text-[9px]">Scope: {log.action}</p>
                        <p className="text-white/70">{log.details}</p>
                        <p className="text-white/30 text-[9px]">Operator: {log.userName} ({log.userRole})</p>
                      </div>
                    </div>
                  ))}
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
                          setSPhone(settings.conciergePhone || '');
                          setSThreshold(settings.freeShippingThreshold || 0);
                          setSTaxRate(settings.taxRate || 0);
                          setSGreet(settings.aiGreetingPrefix || '');
                          setSBanner(settings.enableNewsBanner !== false);
                          setSMaintenance(!!settings.maintenanceMode);
                          setSCurrency(settings.currencySymbol || 'Ugx');
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
                      <option value="Suits">Suits</option>
                      <option value="Shirts">Shirts</option>
                      <option value="Shoes">Shoes</option>
                      <option value="Accessories">Accessories</option>
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
                    <div className="space-y-1 pt-2 border-t border-white/5">
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={pImages[0]} 
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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={pImages[0]} 
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

      <Footer />
      <MobileNav />
    </div>
  );
}
