'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Search, Grid, List, SlidersHorizontal, ChevronRight, 
  Heart, ShoppingCart, Star, Eye, RefreshCw, X
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import MobileNav from '../../components/MobileNav';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../../types';

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { products, addToCart, wishlist, toggleWishlist } = useStore();

  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSize, setSelectedSize] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<number>(2000); // Max Ugx 2000
  const [sortBy, setSortBy] = useState<string>('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Added Cart toast feedback
  const [addedAlert, setAddedAlert] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Sync state with URL search params
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      const cat = searchParams.get('category');
      if (cat) {
        setSelectedCategory(cat);
      }
      const filter = searchParams.get('filter');
      if (filter === 'wishlist') {
        setSelectedCategory('Wishlist');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // All categories, sizes, and colors extracted dynamically
  const categories = ['All', 'Suits', 'Shirts', 'Shoes', 'Accessories'];
  const sizes = ['All', '48R', '50R', '52R', '54R', '56R', '39', '40', '41', '42', '43', '44', '45'];
  const colors = ['All', 'Midnight Navy', 'Charcoal', 'Cognac Brown', 'Obsidian Black', 'Pristine White', 'Emerald Green', 'Classic Camel'];

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Wishlist') {
        result = result.filter(p => wishlist.includes(p.id));
      } else {
        result = result.filter(p => p.category === selectedCategory);
      }
    }

    // Size filter
    if (selectedSize !== 'All') {
      result = result.filter(p => p.sizes.includes(selectedSize));
    }

    // Color filter
    if (selectedColor !== 'All') {
      result = result.filter(p => p.colors.some(c => c.toLowerCase().includes(selectedColor.toLowerCase())));
    }

    // Price range filter
    result = result.filter(p => p.price <= priceRange);

    // Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [products, search, selectedCategory, selectedSize, selectedColor, priceRange, sortBy, wishlist]);

  // Paginated chunk
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('All');
    setSelectedSize('All');
    setSelectedColor('All');
    setPriceRange(2000);
    setSortBy('featured');
    setCurrentPage(1);
    router.push('/shop');
  };

  const handleQuickAdd = (p: Product) => {
    const size = p.sizes[0] || 'One Size';
    const color = p.colors[0] || 'Default';
    addToCart(p, size, color, 1);
    setAddedAlert(true);
    setTimeout(() => setAddedAlert(false), 3000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0]">
      <Header />

      {/* Added Alert Notification */}
      <AnimatePresence>
        {addedAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 16, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-16 left-1/2 z-50 bg-[#C6A15B] text-[#1D2B3F] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-sm font-semibold tracking-wider uppercase"
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Added to executive wardrobe</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumbs Header */}
      <div className="bg-[#1D2B3F] border-b border-[#657892]/20 py-8">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#F7F5F0]/60 uppercase tracking-widest font-mono">
              <Link href="/" className="hover:text-[#C6A15B] transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3 text-[#F7F5F0]/40" />
              <span className="text-[#F7F5F0]/90">Atelier Collections</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-[#F7F5F0] tracking-tight mt-2 font-medium">
              {selectedCategory === 'Wishlist' ? 'Your Executive Wishlist' : 'Atelier Collections'}
            </h1>
          </div>
          <p className="text-[#F7F5F0]/60 text-xs sm:text-sm font-light max-w-xs sm:text-right">
            Hand-tailoring, high-performance fibers, and modern African poise. Crafted at Lubowa Shopping Mall.
          </p>
        </div>
      </div>

      {/* Shop Platform */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-16 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* DESKTOP SIDEBAR FILTER PANEL (25% on lg screens) */}
          <aside className="hidden lg:block lg:col-span-3 space-y-8 border-r border-[#657892]/20 pr-8">
            <div className="flex items-center justify-between border-b border-[#657892]/20 pb-4">
              <h3 className="font-serif text-[#1D2B3F] tracking-widest uppercase text-sm font-semibold">Atelier Filters</h3>
              <button 
                onClick={handleResetFilters}
                className="text-[10px] text-[#657892]/70 hover:text-[#1D2B3F] flex items-center gap-1 font-mono uppercase transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Department Accordion-like block */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-widest text-[#C6A15B] font-mono font-bold">Category Registry</h4>
              <div className="flex flex-col space-y-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left text-sm py-1.5 px-2.5 rounded transition-colors flex justify-between items-center ${
                      selectedCategory === cat 
                        ? 'bg-[#1C4D8D]/10 text-[#1C4D8D] font-semibold border-l-2 border-[#1C4D8D]' 
                        : 'text-[#1D2B3F]/70 hover:text-[#1D2B3F] hover:bg-[#1D2B3F]/5'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] font-mono ${selectedCategory === cat ? 'text-[#1C4D8D]/75' : 'text-[#1D2B3F]/40'}`}>
                      {cat === 'All' 
                        ? products.length 
                        : cat === 'Wishlist'
                          ? wishlist.length
                          : products.filter(p => p.category === cat).length
                      }
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Slider */}
            <div className="space-y-3 pt-4 border-t border-[#657892]/20">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] uppercase tracking-widest text-[#C6A15B] font-mono font-bold">Price Range</h4>
                <span className="text-xs text-[#1D2B3F]/80 font-mono font-semibold">Up to Ugx {priceRange}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max="2000" 
                step="50"
                value={priceRange} 
                onChange={(e) => {
                  setPriceRange(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full accent-[#1C4D8D] bg-[#657892]/20 rounded-lg appearance-none h-1.5"
                id="desktop-price-slider"
              />
              <div className="flex justify-between text-[10px] text-[#657892]/60 font-mono">
                <span>Ugx 100</span>
                <span>Ugx 2,000</span>
              </div>
            </div>

            {/* Sizing Guides */}
            <div className="space-y-3 pt-4 border-t border-[#657892]/20">
              <h4 className="text-[10px] uppercase tracking-widest text-[#C6A15B] font-mono font-bold">Size Registry</h4>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => {
                      setSelectedSize(sz);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1.5 rounded text-[10px] font-mono border transition-all ${
                      selectedSize === sz 
                        ? 'bg-[#1D2B3F] text-[#F7F5F0] border-[#1D2B3F] font-bold' 
                        : 'border-[#657892]/20 text-[#1D2B3F]/60 hover:border-[#1D2B3F]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Swatch */}
            <div className="space-y-3 pt-4 border-t border-[#657892]/20">
              <h4 className="text-[10px] uppercase tracking-widest text-[#C6A15B] font-mono font-bold">Color Palette</h4>
              <div className="flex flex-col space-y-1">
                {colors.map((col) => (
                  <button
                    key={col}
                    onClick={() => {
                      setSelectedColor(col);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left text-xs py-1 px-2 rounded transition-colors flex items-center gap-2 ${
                      selectedColor === col 
                        ? 'bg-[#1D2B3F]/10 text-[#1D2B3F] font-semibold' 
                        : 'text-[#1D2B3F]/60 hover:text-[#1D2B3F]'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-[#657892]/20" style={{ 
                      backgroundColor: col === 'All' ? 'transparent' : 
                                      col === 'Midnight Navy' ? '#1e293b' : 
                                      col === 'Charcoal' ? '#475569' : 
                                      col === 'Cognac Brown' ? '#7c2d12' : 
                                      col === 'Obsidian Black' ? '#09090b' : 
                                      col === 'Pristine White' ? '#ffffff' : 
                                      col === 'Emerald Green' ? '#047857' : 
                                      col === 'Classic Camel' ? '#b45309' : 'transparent' 
                    }}></span>
                    <span>{col}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[#657892]/20 pt-6 text-center">
              <p className="text-[10px] text-[#657892] font-mono italic">
                Need bespoke styling assistance? Access our Personal Stylist assistant at any time.
              </p>
            </div>
          </aside>

          {/* MAIN PRODUCT SHELF (75% on lg screens) */}
          <section className="lg:col-span-9 space-y-8">
            {/* Top filters/search bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-[#F7F5F0] border border-[#657892]/20 p-4 rounded-xl shadow-sm">
              {/* Search bar */}
              <div className="flex items-center gap-2.5 bg-[#F7F5F0] border border-[#657892]/20 rounded-lg px-3 py-2 flex-1 max-w-md focus-within:border-[#1C4D8D]">
                <Search className="w-4 h-4 text-[#657892]/60" />
                <input 
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Inquire specific product or fabric..."
                  className="bg-transparent border-0 outline-none text-xs text-[#1D2B3F] placeholder-[#657892]/50 w-full focus:ring-0"
                  id="shop-search-input"
                />
              </div>

              {/* View layout controls & Sorting */}
              <div className="flex items-center justify-between sm:justify-end gap-4">
                <button 
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-1.5 bg-[#1C4D8D]/10 border border-[#1C4D8D]/20 px-3.5 py-2 rounded text-xs text-[#1C4D8D] hover:bg-[#1C4D8D]/20"
                  id="mobile-filters-trigger"
                >
                  <SlidersHorizontal className="w-4 h-4 text-[#C6A15B]" />
                  <span>Filters</span>
                </button>

                <div className="flex items-center gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="bg-[#F7F5F0] border border-[#657892]/20 rounded-lg text-xs text-[#1D2B3F] py-2 px-3 focus:border-[#1C4D8D] focus:outline-none"
                    id="shop-sort-select"
                  >
                    <option value="featured">Featured Order</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating">Executive Rating</option>
                  </select>

                  {/* Grid Toggle buttons */}
                  <div className="hidden sm:flex border border-[#657892]/20 rounded-lg p-0.5 bg-[#F7F5F0]">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-[#1C4D8D] text-[#F7F5F0]' : 'text-[#1D2B3F]/40 hover:text-[#1D2B3F]'}`}
                      title="Grid Layout"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-[#1C4D8D] text-[#F7F5F0]' : 'text-[#1D2B3F]/40 hover:text-[#1D2B3F]'}`}
                      title="List Layout"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Active filters feedback list */}
            {(selectedCategory !== 'All' || selectedSize !== 'All' || selectedColor !== 'All' || priceRange < 2000 || search) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-[#657892] font-mono">Active registries:</span>
                {selectedCategory !== 'All' && (
                  <span className="bg-[#1D2B3F] border border-[#657892]/20 text-xs text-[#F7F5F0] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    Category: {selectedCategory}
                    <X className="w-3 h-3 text-[#C6A15B] hover:text-[#F7F5F0] cursor-pointer" onClick={() => setSelectedCategory('All')} />
                  </span>
                )}
                {selectedSize !== 'All' && (
                  <span className="bg-[#1D2B3F] border border-[#657892]/20 text-xs text-[#F7F5F0] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    Size: {selectedSize}
                    <X className="w-3 h-3 text-[#C6A15B] hover:text-[#F7F5F0] cursor-pointer" onClick={() => setSelectedSize('All')} />
                  </span>
                )}
                {selectedColor !== 'All' && (
                  <span className="bg-[#1D2B3F] border border-[#657892]/20 text-xs text-[#F7F5F0] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    Color: {selectedColor}
                    <X className="w-3 h-3 text-[#C6A15B] hover:text-[#F7F5F0] cursor-pointer" onClick={() => setSelectedColor('All')} />
                  </span>
                )}
                {priceRange < 2000 && (
                  <span className="bg-[#1D2B3F] border border-[#657892]/20 text-xs text-[#F7F5F0] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    Max: Ugx {priceRange}
                    <X className="w-3 h-3 text-[#C6A15B] hover:text-[#F7F5F0] cursor-pointer" onClick={() => setPriceRange(2000)} />
                  </span>
                )}
                {search && (
                  <span className="bg-[#1D2B3F] border border-[#657892]/20 text-xs text-[#F7F5F0] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    Search: &ldquo;{search}&rdquo;
                    <X className="w-3 h-3 text-[#C6A15B] hover:text-[#F7F5F0] cursor-pointer" onClick={() => setSearch('')} />
                  </span>
                )}
              </div>
            )}

            {/* Product count display */}
            <p className="text-xs text-[#657892] font-mono">
              Displaying {filteredProducts.length} premium tailoring registries.
            </p>

            {/* Shelf Grid container */}
            <AnimatePresence mode="wait">
              {paginatedProducts.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-24 border border-[#657892]/20 bg-[#F7F5F0] rounded-2xl text-center space-y-4 shadow-sm"
                >
                  <p className="font-serif text-lg text-[#1D2B3F]">No Sartorial Records Match Your Registry</p>
                  <p className="text-[#657892] text-xs max-w-sm mx-auto font-light">Refine your custom filters above or contact our Lubowa boutique master tailors directly to commission a customized run.</p>
                  <button 
                    onClick={handleResetFilters}
                    className="border border-[#1C4D8D] text-[#1C4D8D] hover:bg-[#1C4D8D]/10 px-5 py-2.5 rounded text-xs uppercase tracking-widest font-semibold transition-all cursor-pointer font-sans"
                  >
                    Clear Sizing Registry
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key={`${viewMode}-${selectedCategory}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={
                    viewMode === 'grid' 
                      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8" 
                      : "flex flex-col gap-6"
                  }
                >
                  {paginatedProducts.map((p) => {
                    const isWish = wishlist.includes(p.id);
                    return (
                      <div 
                        key={p.id} 
                        className={`bg-[#F7F5F0] border border-[#657892]/20 rounded-2xl overflow-hidden group hover:border-[#1C4D8D]/30 transition-all duration-300 shadow-md ${
                          viewMode === 'list' ? 'flex flex-col sm:flex-row h-auto sm:h-[240px]' : 'flex flex-col justify-between'
                        }`}
                      >
                        {/* Image Panel */}
                        <div className={`relative bg-[#F7F5F0] overflow-hidden ${
                          viewMode === 'list' ? 'h-[240px] sm:w-[240px] shrink-0' : 'h-[320px]'
                        }`}>
                          <Image 
                            src={p.images[0]}
                            alt={p.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 30vw"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                          
                          {/* Badges */}
                          <div className="absolute top-3.5 left-3.5 flex flex-col gap-1">
                            <span className="bg-[#1D2B3F]/85 backdrop-blur-md text-[#F7F5F0] border border-[#657892]/20 text-[8px] font-mono font-semibold uppercase px-2 py-0.5 rounded shadow-sm">
                              {p.category}
                            </span>
                            {p.isNew && (
                              <span className="bg-[#C6A15B] text-[#1D2B3F] text-[8px] font-mono font-extrabold tracking-widest uppercase px-2 py-0.5 rounded shadow">
                                NEW
                              </span>
                            )}
                          </div>

                          <button 
                            onClick={() => toggleWishlist(p.id)}
                            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#F7F5F0]/80 backdrop-blur-md border border-[#657892]/20 text-[#1D2B3F]/60 hover:text-red-500 flex items-center justify-center transition-colors shadow-sm"
                          >
                            <Heart className={`w-4.5 h-4.5 ${isWish ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>
                        </div>

                        {/* Details Panel */}
                        <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-serif text-lg font-bold text-[#1D2B3F] group-hover:text-[#1C4D8D] transition-colors leading-snug">
                                {p.name}
                              </h3>
                              <span className="font-mono text-base font-bold text-[#1D2B3F]">Ugx {p.price}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-[#C6A15B] fill-[#C6A15B]" />
                              <span className="text-[10px] text-[#657892] font-medium font-mono">{p.rating} / 5</span>
                              <span className="text-[10px] text-[#657892]/50 font-mono">({p.reviews.length} reviews)</span>
                            </div>
                            <p className="text-[#657892] text-xs font-light leading-relaxed line-clamp-2">
                              {p.description}
                            </p>
                          </div>

                          {/* Quick selection options summary */}
                          <div className="border-t border-[#657892]/10 pt-4 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                            <div className="text-[10px] text-[#657892]/70 font-mono space-y-0.5">
                              <div>Sizings: {p.sizes.join(', ')}</div>
                              <div>Colors: {p.colors.join(', ')}</div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleQuickAdd(p)}
                                className="bg-[#1C4D8D] text-[#F7F5F0] hover:bg-opacity-90 px-4 py-2 rounded text-[10px] font-semibold uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>Add to Wardrobe</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Animated Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-8 border-t border-[#657892]/10 font-mono">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-1.5 rounded border border-[#657892]/20 text-xs text-[#1D2B3F]/60 hover:text-[#1D2B3F] disabled:opacity-40 disabled:hover:text-[#1D2B3F]/60 transition-colors bg-[#F7F5F0]"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded text-xs flex items-center justify-center border transition-all ${
                      currentPage === i + 1 
                        ? 'bg-[#1C4D8D] text-[#F7F5F0] border-[#1C4D8D] font-bold' 
                        : 'border-[#657892]/20 text-[#1D2B3F]/60 hover:border-[#1D2B3F] bg-[#F7F5F0]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3.5 py-1.5 rounded border border-[#657892]/20 text-xs text-[#1D2B3F]/60 hover:text-[#1D2B3F] disabled:opacity-40 disabled:hover:text-[#1D2B3F]/60 transition-colors bg-[#F7F5F0]"
                >
                  Next
                </button>
              </div>
            )}
          </section>

        </div>
      </main>

      {/* MOBILE COLLAPSIBLE FILTERS SHEET */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="fixed inset-0 bg-black z-50 lg:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-[#F7F5F0] z-50 lg:hidden rounded-t-2xl border-t border-[#657892]/20 overflow-y-auto p-6 space-y-6 text-[#1D2B3F]"
            >
              <div className="flex justify-between items-center border-b border-[#657892]/20 pb-4">
                <h3 className="font-serif text-[#1D2B3F] tracking-widest uppercase text-sm font-semibold">Atelier Sizing Filters</h3>
                <button 
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-[#657892] hover:text-[#1D2B3F] p-1"
                >
                  ✕
                </button>
              </div>

              {/* Department Accordion-like block */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase tracking-widest text-[#C6A15B] font-mono font-bold">Category Registry</h4>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setCurrentPage(1);
                        setMobileFiltersOpen(false);
                      }}
                      className={`text-left text-xs py-2 px-3 rounded transition-colors ${
                        selectedCategory === cat 
                          ? 'bg-[#1C4D8D] text-[#F7F5F0] font-semibold' 
                          : 'bg-[#657892]/10 text-[#1D2B3F]/70 hover:text-[#1D2B3F]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] uppercase tracking-widest text-[#C6A15B] font-mono font-bold">Price Range</h4>
                  <span className="text-xs text-[#1D2B3F]/80 font-mono font-semibold">Up to Ugx {priceRange}</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="2000" 
                  step="50"
                  value={priceRange} 
                  onChange={(e) => {
                    setPriceRange(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full accent-[#1C4D8D] bg-[#657892]/20 rounded-lg appearance-none h-1.5"
                  id="mobile-price-slider"
                />
              </div>

              {/* Sizing Guides */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase tracking-widest text-[#C6A15B] font-mono font-bold">Size Registry</h4>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => {
                        setSelectedSize(sz);
                        setCurrentPage(1);
                        setMobileFiltersOpen(false);
                      }}
                      className={`px-3 py-2 rounded text-[10px] font-mono border transition-all ${
                        selectedSize === sz 
                          ? 'bg-[#1D2B3F] text-[#F7F5F0] border-[#1D2B3F] font-bold' 
                          : 'border-[#657892]/20 text-[#1D2B3F]/60 hover:border-[#1D2B3F]'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  onClick={() => {
                    handleResetFilters();
                    setMobileFiltersOpen(false);
                  }}
                  className="bg-[#F7F5F0] border border-[#657892]/20 text-[#1D2B3F] text-xs py-3 rounded-lg uppercase tracking-wider flex-1 text-center font-sans hover:bg-[#657892]/5"
                >
                  Reset Registry
                </button>
                <button
                  onClick={() => setMobileFiltersOpen(false)}
                  className="bg-[#1C4D8D] text-[#F7F5F0] text-xs py-3 rounded-lg uppercase tracking-widest flex-1 text-center font-semibold font-sans"
                >
                  Apply Filters
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

export default function Shop() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center text-[#1D2B3F] font-serif">Loading Atelier Registry...</div>}>
      <ShopContent />
    </Suspense>
  );
}
