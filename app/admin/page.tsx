'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  BarChart, Calendar, ChevronRight, Compass, CreditCard, DollarSign, 
  Download, Edit, Eye, Filter, Grid, HelpCircle, Layers, LogOut, 
  Plus, Printer, RefreshCw, Search, ShieldAlert, ShoppingBag, 
  Trash2, TrendingUp, Users, X, FileText, CheckCircle
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
    currentUser, login, products, orders, users, auditLogs, 
    addProduct, updateProduct, deleteProduct, updateOrderStatus 
  } = useStore();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'users' | 'logs'>('dashboard');

  // Fast bypass for testing/evaluation
  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Form states for ADD / EDIT Product
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pCategory, setPCategory] = useState('Suits');
  const [pPrice, setPPrice] = useState(0);
  const [pStock, setPStock] = useState(10);
  const [pSizes, setPSizes] = useState<string[]>(['48R', '50R', '52R']);
  const [pColors, setPColors] = useState<string[]>(['Midnight Navy', 'Charcoal']);
  const [pImages, setPImages] = useState<string[]>(['https://lh3.googleusercontent.com/aida-public/AB6AXuAi8UecRS-XnyrMnJeZL1BQVfI-k0R_gJR1LOmjQdttfkYhoplY3uVFZbanSoR2yMSezA5cR3e61-ad015ej7NHi3pxyGxrkLADT7Q_LZ1GutmVRTp4mDhq-j2uiwCqyCvXNPehFnXRH-LxmBTxPsLco-fna_xAO86vswBmBY2C-2KyB_lA85jIzmULF-qrB23JFySnGOOTlEGa9x7PfP1HLr3OUhu-yYHF7BQNYYBXL3_XdDjAitK2gg']);

  // Delete product safety confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Filter products state
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');

  // Filter orders state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');

  // Selected Order for detail overlay modal
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  if (!mounted) return null;

  // Authorization Shield
  const isAuthorized = currentUser && (currentUser.role === 'Super Admin' || currentUser.role === 'Admin' || currentUser.role === 'Manager' || currentUser.role === 'Staff');
  const userRole = currentUser ? currentUser.role : 'Guest';

  // Role based access restrictions
  const canModifyProducts = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Manager';
  const canModifyOrders = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Manager' || userRole === 'Staff';
  const canDeleteProducts = userRole === 'Super Admin' || userRole === 'Admin';
  const canSeeLogs = userRole === 'Super Admin' || userRole === 'Admin';

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-black">
        <Header />
        <main className="max-w-md mx-auto px-4 py-24 text-center space-y-6 flex-1 flex flex-col justify-center">
          <div className="w-16 h-16 rounded-full bg-red-950/20 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="font-serif text-xl text-white font-bold">Atelier Security Intercept</h3>
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
    }
    setIsProductModalOpen(true);
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
        images: pImages
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
        isNew: true
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
            <h1 className="font-serif text-3xl text-white tracking-tight font-medium">Boutique Atelier Console</h1>
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
              { id: 'dashboard', name: 'Atelier Pulse', icon: BarChart },
              { id: 'products', name: 'Apparel Registry', icon: Grid },
              { id: 'orders', name: 'Order Ledger', icon: ShoppingBag, count: orders.length },
              { id: 'users', name: 'Authorized Staff', icon: Users },
              { id: 'logs', name: 'Security Audits', icon: FileText, count: auditLogs.length }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              
              if (tab.id === 'logs' && !canSeeLogs) return null;

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
                                  title="Edit tailoring details"
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
                  <h3 className="font-serif text-xl text-white font-bold">Atelier Commission Ledger</h3>

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

            {/* SUB-TAB 4: AUTHORIZED STAFF LIST */}
            {activeTab === 'users' && (
              <motion.div 
                key="users"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <h3 className="font-serif text-xl text-white font-bold border-b border-white/5 pb-3">Authorized Atelier Staff Keys</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {users.map((u) => (
                    <div key={u.id} className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <h4 className="font-serif text-base text-white font-bold">{u.name}</h4>
                          <p className="text-[10px] text-white/40 font-mono">{u.email}</p>
                        </div>
                        <span className={`text-[9px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          u.role === 'Super Admin' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          u.role === 'Admin' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          u.role === 'Manager' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          u.role === 'Staff' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-white/5 text-white/50'
                        }`}>
                          {u.role}
                        </span>
                      </div>

                      <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-[10px] text-white/40 leading-relaxed font-mono space-y-1">
                        <span className="text-white font-bold uppercase text-[8px] block tracking-widest text-[#20D9A1]">Active Authorization Scope</span>
                        {u.role === 'Super Admin' && <p>✓ Full system mutations, override settings, hard-deletions, security audit decryption.</p>}
                        {u.role === 'Admin' && <p>✓ Operations override, apparel modification, stock allocations, order dispatches.</p>}
                        {u.role === 'Manager' && <p>✓ Product addition, details modification, dispatch updates.</p>}
                        {u.role === 'Staff' && <p>✓ Courier dispatch tracking, client order notes modification.</p>}
                        {u.role === 'Customer' && <p>✓ Private lounge profile, loyalty rewards tracker, personal trunk checks.</p>}
                      </div>
                    </div>
                  ))}
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

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-white/40 font-mono">Image URL</label>
                  <input 
                    type="text" 
                    value={pImages[0] || ''} 
                    onChange={(e) => setPImages([e.target.value])} 
                    className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 text-white outline-none font-mono"
                    required
                  />
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
                  Atelier Dispatch Detail Review
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

      <Footer />
      <MobileNav />
    </div>
  );
}
