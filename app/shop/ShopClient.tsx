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
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../../types';
import { getSafeImageSrc } from '../../lib/utils';


function ShopContent({ initialProducts, initialCategories }: { initialProducts?: Product[]; initialCategories?: string[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const storeProducts = useStore((state) => state.products);
  const storeCategories = useStore((state) => state.categories);
  const products = useMemo(() => {
    return storeProducts.length > 0 ? storeProducts : (initialProducts || []);
  }, [storeProducts, initialProducts]);
  const addToCart = useStore((state) => state.addToCart);
  const wishlist = useStore((state) => state.wishlist);
  const toggleWishlist = useStore((state) => state.toggleWishlist);
  const settings = useStore((state) => state.settings);
  const isSyncing = useStore((state) => state.isSyncing);
  const currency = settings?.currencySymbol || 'Ugx';

  const maxPriceLimit = useMemo(() => {
    if (!products || products.length === 0) return 2000;
    const maxVal = Math.max(...products.map(p => Number(p.price) || 0));
    return maxVal > 2000 ? maxVal : 2000;
  }, [products]);

  const [mounted, setMounted] = useState(false);
  const [urlParsed, setUrlParsed] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSize, setSelectedSize] = useState<string>('All');
  const [selectedColor, setSelectedColor] = useState<string>('All');
  const [priceRange, setPriceRange] = useState<number>(10000000); // High initial fallback
  const [sortBy, setSortBy] = useState<string>('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Quick View State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewSize, setQuickViewSize] = useState('');
  const [quickViewColor, setQuickViewColor] = useState('');
  const [quickViewQty, setQuickViewQty] = useState(1);

  // Sync price range once products are fetched or updated
  useEffect(() => {
    if (products && products.length > 0) {
      const maxVal = Math.max(...products.map(p => Number(p.price) || 0));
      if (maxVal > 0) {
        const timer = setTimeout(() => {
          // Only update priceRange to max if it hasn't been set by URL yet
          setPriceRange(prev => (prev === 10000000 ? maxVal : prev));
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [products]);

  // Added Cart toast feedback
  const [addedAlert, setAddedAlert] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Sync state FROM URL search params
  useEffect(() => {
    const timer = setTimeout(() => {
      const cat = searchParams.get('category');
      if (cat) {
        setSelectedCategory(cat);
      }
      const filter = searchParams.get('filter');
      if (filter === 'wishlist') {
        setSelectedCategory('Wishlist');
      }
      
      const q = searchParams.get('search');
      if (q) setSearch(q);

      const size = searchParams.get('size');
      if (size) setSelectedSize(size);

      const color = searchParams.get('color');
      if (color) setSelectedColor(color);

      const maxP = searchParams.get('maxPrice');
      if (maxP) setPriceRange(Number(maxP));

      const sort = searchParams.get('sortBy');
      if (sort) setSortBy(sort);

      const page = searchParams.get('page');
      if (page) setCurrentPage(Number(page));

      setMounted(true);
      setUrlParsed(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Sync state TO URL search params when filters change
  useEffect(() => {
    if (!urlParsed) return;

    const params = new URLSearchParams();
    if (search.trim()) {
      params.set('search', search);
    }
    if (selectedCategory !== 'All') {
      params.set('category', selectedCategory);
    }
    if (selectedSize !== 'All') {
      params.set('size', selectedSize);
    }
    if (selectedColor !== 'All') {
      params.set('color', selectedColor);
    }
    if (priceRange < maxPriceLimit) {
      params.set('maxPrice', priceRange.toString());
    }
    if (sortBy !== 'featured') {
      params.set('sortBy', sortBy);
    }
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }

    const queryString = params.toString();
    const currentQuery = searchParams.toString();

    if (queryString !== currentQuery) {
      const newUrl = `/shop${queryString ? `?${queryString}` : ''}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [search, selectedCategory, selectedSize, selectedColor, priceRange, sortBy, currentPage, maxPriceLimit, urlParsed, router, searchParams]);

  // All categories, sizes, and colors extracted dynamically
  const categories = useMemo(() => {
    const rawCatNames = (storeCategories && storeCategories.length > 0)
      ? storeCategories.map(c => c.name)
      : (initialCategories && initialCategories.length > 0 ? initialCategories : ['Suits', 'Shirts', 'Shoes', 'Accessories']);
    
    const defaults = ['Suits', 'Shirts', 'Shoes', 'Accessories'];
    return Array.from(new Set(['All', ...rawCatNames, ...defaults]));
  }, [storeCategories, initialCategories]);
  const sizes = ['All', '48R', '50R', '52R', '54R', '56R', '39', '40', '41', '42', '43', '44', '45'];
  const colors = ['All', 'Midnight Navy', 'Charcoal', 'Cognac Brown', 'Obsidian Black', 'Pristine White', 'Emerald Green', 'Classic Camel'];

  // Pre-compiled search index for highly performant, multi-word, partial keyword matching
  const searchIndex = useMemo(() => {
    return products.map(p => ({
      id: p.id,
      searchText: `${p.name} ${p.description} ${p.category} ${p.colors.join(' ')} ${p.sizes.join(' ')}`.toLowerCase()
    }));
  }, [products]);

  // Search filter using index
  const searchedProductIds = useMemo(() => {
    if (!search.trim()) return null;
    const terms = search.toLowerCase().trim().split(/\s+/);
    return searchIndex
      .filter(item => terms.every(term => item.searchText.includes(term)))
      .map(item => item.id);
  }, [search, searchIndex]);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search filter via index
    if (searchedProductIds !== null) {
      result = result.filter(p => searchedProductIds.includes(p.id));
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
  }, [products, searchedProductIds, selectedCategory, selectedSize, selectedColor, priceRange, sortBy, wishlist]);

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
    setPriceRange(maxPriceLimit);
    setSortBy('featured');
    setCurrentPage(1);
    router.replace('/shop');
  };

  const handleQuickAdd = (p: Product) => {
    const size = p.sizes[0] || 'One Size';
    const color = p.colors[0] || 'Default';
    addToCart(p, size, color, 1);
    setAddedAlert(true);
    setTimeout(() => setAddedAlert(false), 3000);
  };

  const handleOpenQuickView = (p: Product) => {
    setQuickViewProduct(p);
    setQuickViewSize(p.sizes[0] || '');
    setQuickViewColor(p.colors[0] || '');
    setQuickViewQty(1);
  };

  const handleAddFromQuickView = () => {
    if (!quickViewProduct) return;
    addToCart(quickViewProduct, quickViewSize, quickViewColor, quickViewQty);
    setQuickViewProduct(null);
    setAddedAlert(true);
    setTimeout(() => setAddedAlert(false), 3000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0]">

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
              <span className="text-[#F7F5F0]/90">Boutique Collections</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-[#F7F5F0] tracking-tight mt-2 font-medium">
              {selectedCategory === 'Wishlist' ? 'Your Executive Wishlist' : 'Boutique Collections'}
            </h1>
          </div>
          <p className="text-[#F7F5F0]/60 text-xs sm:text-sm font-light max-w-xs sm:text-right">
            Imported ready-to-wear corporate wear, premium fabrics, and elegant poise. Sourced from Turkey, Egypt, China, and the UK.
          </p>
        </div>
      </div>

      {/* Shop Platform */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-16 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* DESKTOP SIDEBAR FILTER PANEL (25% on lg screens) */}
          <aside className="hidden lg:block lg:col-span-3 space-y-8 border-r border-[#657892]/20 pr-8">
            <div className="flex items-center justify-between border-b border-[#657892]/20 pb-4">
              <h3 className="font-serif text-[#1D2B3F] tracking-widest uppercase text-sm font-semibold">Boutique Filters</h3>
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
                <span className="text-xs text-[#1D2B3F]/80 font-mono font-semibold">Up to {currency} {priceRange}</span>
              </div>
              <input 
                type="range" 
                min="100" 
                max={maxPriceLimit} 
                step={maxPriceLimit > 100000 ? 1000 : 50}
                value={priceRange > maxPriceLimit ? maxPriceLimit : priceRange} 
                onChange={(e) => {
                  setPriceRange(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full accent-[#1C4D8D] bg-[#657892]/20 rounded-lg appearance-none h-1.5"
                id="desktop-price-slider"
              />
              <div className="flex justify-between text-[10px] text-[#657892]/60 font-mono">
                <span>{currency} 100</span>
                <span>{currency} {maxPriceLimit.toLocaleString()}</span>
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
                Need corporate styling assistance? Access our Personal Stylist assistant at any time.
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
            {(selectedCategory !== 'All' || selectedSize !== 'All' || selectedColor !== 'All' || priceRange < maxPriceLimit || search) && (
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
                {priceRange < maxPriceLimit && (
                  <span className="bg-[#1D2B3F] border border-[#657892]/20 text-xs text-[#F7F5F0] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    Max: {currency} {priceRange.toLocaleString()}
                    <X className="w-3 h-3 text-[#C6A15B] hover:text-[#F7F5F0] cursor-pointer" onClick={() => setPriceRange(maxPriceLimit)} />
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
              Displaying {filteredProducts.length} premium curated ready-to-wear styles.
            </p>

            {/* Shelf Grid container */}
            <AnimatePresence mode="wait">
              {isSyncing && products.length === 0 ? (
                <motion.div
                  key="loading-skeletons"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8" : "flex flex-col gap-6"}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div 
                      key={`shop-skeleton-${i}`} 
                      className={`bg-[#F7F5F0] border border-[#657892]/20 rounded-2xl overflow-hidden flex animate-pulse shadow-md ${
                        viewMode === 'list' ? 'flex-col sm:flex-row h-auto sm:h-[240px]' : 'flex-col justify-between h-[550px]'
                      }`}
                    >
                      <div className={`relative bg-neutral-200 ${
                        viewMode === 'list' ? 'h-[240px] sm:w-[240px] shrink-0' : 'h-[320px]'
                      }`} />
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div className="h-6 bg-neutral-300 rounded w-2/3 animate-pulse" />
                            <div className="h-6 bg-neutral-300 rounded w-1/4 animate-pulse" />
                          </div>
                          <div className="h-4 bg-neutral-200 rounded w-1/3 animate-pulse" />
                          <div className="h-12 bg-neutral-200 rounded w-full animate-pulse mt-2" />
                        </div>
                        <div className="border-t border-[#657892]/10 pt-4 flex justify-between items-center">
                          <div className="space-y-1">
                            <div className="h-3 bg-neutral-200 rounded w-20 animate-pulse" />
                            <div className="h-3 bg-neutral-200 rounded w-28 animate-pulse" />
                          </div>
                          <div className="h-8 bg-neutral-300 rounded w-28 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : paginatedProducts.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-24 border border-[#657892]/20 bg-[#F7F5F0] rounded-2xl text-center space-y-4 shadow-sm"
                >
                  <p className="font-serif text-lg text-[#1D2B3F]">No Boutique Records Match Your Selection</p>
                  <p className="text-[#657892] text-xs max-w-sm mx-auto font-light">Refine your search filters above or contact our Lubowa showroom directly to check size availability.</p>
                  <button 
                    onClick={handleResetFilters}
                    className="border border-[#1C4D8D] text-[#1C4D8D] hover:bg-[#1C4D8D]/10 px-5 py-2.5 rounded text-xs uppercase tracking-widest font-semibold transition-all cursor-pointer font-sans"
                  >
                    Clear Boutique Filters
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
                          <Link href={`/product/${p.id}`} className="absolute inset-0 block z-0">
                            <Image 
                              src={getSafeImageSrc(p.images?.[0])}
                              alt={p.name}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 768px) 100vw, 30vw"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                          </Link>
                          
                          {/* Badges */}
                          <div className="absolute top-3.5 left-3.5 flex flex-col gap-1 z-10 pointer-events-none">
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
                            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#F7F5F0]/80 backdrop-blur-md border border-[#657892]/20 text-[#1D2B3F]/60 hover:text-red-500 flex items-center justify-center transition-colors shadow-sm z-10 cursor-pointer"
                          >
                            <Heart className={`w-4.5 h-4.5 ${isWish ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>

                          {/* Hover controls */}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-10">
                            <button 
                              onClick={() => handleOpenQuickView(p)}
                              className="w-11 h-11 rounded-full bg-[#1D2B3F]/80 text-[#F7F5F0] hover:bg-[#1C4D8D] transition-all flex items-center justify-center border border-[#657892]/20 shadow-lg cursor-pointer"
                              title="Quick View"
                            >
                              <Eye className="w-4.5 h-4.5" />
                            </button>
                            <button 
                              onClick={() => handleQuickAdd(p)}
                              className="w-11 h-11 rounded-full bg-[#1D2B3F]/80 text-[#F7F5F0] hover:bg-[#C6A15B] hover:text-[#1D2B3F] transition-all flex items-center justify-center border border-[#657892]/20 shadow-lg cursor-pointer"
                              title="Add to Wardrobe"
                            >
                              <ShoppingCart className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </div>

                        {/* Details Panel */}
                        <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-serif text-lg font-bold text-[#1D2B3F] group-hover:text-[#1C4D8D] transition-colors leading-snug">
                                <Link href={`/product/${p.id}`}>
                                  {p.name}
                                </Link>
                              </h3>
                              <span className="font-mono text-base font-bold text-[#1D2B3F]">{currency} {p.price}</span>
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
                                onClick={() => handleOpenQuickView(p)}
                                className="border border-[#1C4D8D] text-[#1C4D8D] hover:bg-[#1C4D8D]/10 px-3.5 py-2 rounded text-[10px] font-semibold uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                                title="Quick View"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Quick View</span>
                              </button>
                              <button 
                                onClick={() => handleQuickAdd(p)}
                                data-testid="add-to-cart-button"
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
                <h3 className="font-serif text-[#1D2B3F] tracking-widest uppercase text-sm font-semibold">Boutique Sizing Filters</h3>
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
                  <span className="text-xs text-[#1D2B3F]/80 font-mono font-semibold">Up to {currency} {priceRange}</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max={maxPriceLimit} 
                  step={maxPriceLimit > 100000 ? 1000 : 50}
                  value={priceRange > maxPriceLimit ? maxPriceLimit : priceRange} 
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

      {/* PRODUCT QUICK VIEW MODAL */}
      <AnimatePresence>
        {quickViewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickViewProduct(null)}
              className="absolute inset-0 bg-black"
            />
            {/* Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#F7F5F0] border border-[#657892]/20 rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] overflow-y-auto relative z-10 p-6 md:p-8 text-[#1D2B3F]"
              id="quickview-modal"
            >
              <button 
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-4 right-4 text-[#657892] hover:text-[#1D2B3F] p-1 cursor-pointer"
                id="close-quickview-btn"
              >
                ✕
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                {/* Image preview */}
                <div className="relative h-[300px] md:h-[400px] rounded-xl overflow-hidden border border-[#657892]/10">
                  <Image 
                    src={getSafeImageSrc(quickViewProduct.images?.[0])}
                    alt={quickViewProduct.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 40vw"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Details purchase panel */}
                <div className="flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <span className="text-[10px] tracking-widest text-[#C6A15B] font-mono uppercase">{quickViewProduct.category}</span>
                    <h3 className="font-serif text-2xl text-[#1D2B3F] font-bold">
                      <Link href={`/product/${quickViewProduct.id}`} onClick={() => setQuickViewProduct(null)} className="hover:text-[#1C4D8D] transition-colors">
                        {quickViewProduct.name}
                      </Link>
                    </h3>
                    <div className="font-mono text-xl text-[#1D2B3F] font-bold">{currency} {quickViewProduct.price}</div>
                    <p className="text-[#657892] text-xs font-light leading-relaxed">
                      {quickViewProduct.description}
                    </p>
                  </div>

                  {/* Size select */}
                  {quickViewProduct.sizes.length > 0 && quickViewProduct.sizes[0] !== 'One Size' && (
                    <div className="space-y-2">
                      <label className="text-[10px] text-[#657892]/60 uppercase tracking-widest font-mono font-medium">Select Size (Sizing guidelines apply)</label>
                      <div className="flex flex-wrap gap-2">
                        {quickViewProduct.sizes.map((sz) => (
                          <button
                            key={sz}
                            onClick={() => setQuickViewSize(sz)}
                            className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${
                              quickViewSize === sz 
                                ? 'bg-[#1D2B3F] text-[#F7F5F0] border-[#1D2B3F]' 
                                : 'border-[#657892]/20 text-[#1D2B3F] hover:border-[#1D2B3F]'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color select */}
                  {quickViewProduct.colors.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] text-[#657892]/60 uppercase tracking-widest font-mono font-medium">Select Color</label>
                      <div className="flex flex-wrap gap-2">
                        {quickViewProduct.colors.map((cl) => (
                          <button
                            key={cl}
                            onClick={() => setQuickViewColor(cl)}
                            className={`px-3 py-1.5 rounded text-xs border font-mono transition-all cursor-pointer ${
                              quickViewColor === cl 
                                ? 'bg-[#1C4D8D] text-[#F7F5F0] border-[#1C4D8D]' 
                                : 'border-[#657892]/20 text-[#1D2B3F]/80 hover:border-[#1C4D8D]'
                            }`}
                          >
                            {cl}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Qty controls & Add to Cart button */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-[#657892]/20 rounded bg-[#B9CDE5]/20">
                        <button 
                          onClick={() => setQuickViewQty(Math.max(1, quickViewQty - 1))}
                          className="px-3 py-1.5 text-[#1D2B3F]/60 hover:text-[#1D2B3F] cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 font-mono text-sm text-[#1D2B3F] font-semibold">{quickViewQty}</span>
                        <button 
                          onClick={() => setQuickViewQty(quickViewQty + 1)}
                          className="px-3 py-1.5 text-[#1D2B3F]/60 hover:text-[#1D2B3F] cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <button 
                        onClick={handleAddFromQuickView}
                        className="bg-[#1C4D8D] text-[#F7F5F0] hover:bg-[#1C4D8D]/90 px-6 py-2.5 rounded font-semibold uppercase tracking-widest text-xs flex-1 text-center transition-all cursor-pointer"
                        id="add-from-quickview-btn"
                      >
                        Add to Wardrobe
                      </button>
                    </div>

                    <div className="text-[10px] text-center text-[#657892]/50 font-mono">
                      Free delivery included. Sizing advice available on demand.
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ShopProps {
  initialProducts?: Product[];
  initialCategories?: string[];
}

export default function Shop({ initialProducts, initialCategories }: ShopProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center text-[#1D2B3F] font-serif">Loading Boutique Registry...</div>}>
      <ShopContent initialProducts={initialProducts} initialCategories={initialCategories} />
    </Suspense>
  );
}
