'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Heart, ShoppingCart, Star, ArrowLeft, Ruler, 
  Truck, ShieldCheck, MessageSquare, Plus, ChevronRight, Check
} from 'lucide-react';
import { useStore } from '../../../store/useStore';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import MobileNav from '../../../components/MobileNav';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Review } from '../../../types';
import { getSafeImageSrc } from '../../../lib/utils';


export default function ProductClient() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const { products, addToCart, clearCart, wishlist, toggleWishlist, addReview, settings } = useStore();
  const currency = settings?.currencySymbol || 'Ugx';
  const threshold = settings?.freeShippingThreshold ?? 2000;
  
  const [mounted, setMounted] = useState(false);
  const [activeImage, setActiveImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [zoomScale, setZoomScale] = useState(false);

  // Added Toast feedback
  const [addedAlert, setAddedAlert] = useState(false);

  // Review submission state
  const [reviewerName, setReviewerName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Size Guide overlay state
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  // Retrieve current product
  const product = useMemo(() => {
    return products.find(p => p.id === productId);
  }, [products, productId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      if (product) {
        setActiveImage(getSafeImageSrc(product.images?.[0]));
        setSelectedSize(product.sizes[0] || '');
        setSelectedColor(product.colors[0] || '');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [product]);

  // Similar Products suggestion (belonging to same category, excluding current product)
  const similarProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter(p => p.category === product.category && p.id !== product.id)
      .slice(0, 3);
  }, [products, product]);

  if (!mounted) return null;

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0] text-[#1D2B3F]">
        <Header />
        <main className="max-w-md mx-auto px-4 py-24 text-center space-y-4 flex-1 flex flex-col justify-center">
          <p className="font-serif text-lg">Product Registry Not Found</p>
          <p className="text-[#657892] text-xs font-light">The specified custom menswear ID does not exist in our active atelier records.</p>
          <Link href="/shop" className="inline-block bg-[#1C4D8D] text-[#F7F5F0] hover:bg-opacity-95 px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-widest font-sans transition-all shadow-sm">
            Back to Shop
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const isWish = wishlist.includes(product.id);

  const handleAddToCartSubmit = () => {
    addToCart(product, selectedSize, selectedColor, quantity);
    setAddedAlert(true);
    setTimeout(() => setAddedAlert(false), 3000);
  };

  const handleQuickCheckout = () => {
    clearCart();
    addToCart(product, selectedSize, selectedColor, quantity);
    router.push('/checkout?quick=true');
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName || !reviewComment) {
      alert("Please fill out both your name and styling feedback.");
      return;
    }

    addReview(product.id, reviewRating, reviewComment, reviewerName, 'Executive Client');

    setReviewSuccess(true);
    setReviewerName('');
    setReviewComment('');
    setTimeout(() => setReviewSuccess(false), 4000);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F5F0] text-[#1D2B3F]">
      <Header />

      {/* Added Alert Notification */}
      <AnimatePresence>
        {addedAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 16, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-16 left-1/2 z-50 bg-[#C6A15B] text-[#1D2B3F] px-6 py-3 rounded-full shadow-2xl flex items-center gap-2.5 text-sm font-semibold tracking-wider uppercase font-sans"
          >
            <ShoppingCart className="w-5 h-5 text-[#1D2B3F]" />
            <span>Garment added to wardrobe trunk</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumbs Header */}
      <div className="bg-[#1D2B3F] border-b border-[#657892]/20 py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center gap-2 text-xs text-[#F7F5F0]/60 uppercase tracking-widest font-mono">
          <Link href="/shop" className="hover:text-[#F7F5F0] transition-colors">Shop</Link>
          <ChevronRight className="w-3 h-3 text-[#657892]/50" />
          <span className="text-[#F7F5F0]/80">{product.category}</span>
          <ChevronRight className="w-3 h-3 text-[#657892]/50" />
          <span className="text-[#C6A15B] truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-1 w-full" id="product-details-container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
           {/* LEFT: IMAGE GALLERY & ZOOM (5 columns on lg) */}
          <div className="lg:col-span-6 space-y-4">
            <div 
              className="relative aspect-[3/4] bg-[#F7F5F0] rounded-2xl overflow-hidden border border-[#657892]/20 group cursor-zoom-in shadow-sm"
              onClick={() => setZoomScale(!zoomScale)}
            >
              <Image 
                src={getSafeImageSrc(activeImage)}
                alt={product.name}
                fill
                className={`object-cover object-top transition-transform duration-500 ${zoomScale ? 'scale-150' : 'scale-100 group-hover:scale-102'}`}
                sizes="(max-width: 1024px) 100vw, 50vw"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1D2B3F]/10 via-transparent to-transparent pointer-events-none" />
              
              {/* Scale Zoom feedback badge */}
              <div className="absolute bottom-4 right-4 bg-[#1D2B3F]/85 backdrop-blur-md border border-[#657892]/30 rounded-full px-3 py-1 text-[10px] uppercase font-mono tracking-wider text-[#F7F5F0] pointer-events-none select-none">
                {zoomScale ? 'Click to minimize zoom' : 'Click to inspect fabric'}
              </div>
            </div>

            {/* Thumbnail selector gallery */}
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`relative w-16 aspect-[3/4] rounded-lg overflow-hidden border bg-[#F7F5F0] transition-all cursor-pointer ${
                    activeImage === img ? 'border-[#C6A15B] ring-1 ring-[#C6A15B]' : 'border-[#657892]/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image src={getSafeImageSrc(img)} alt={`${product.name} alt ${i}`} fill className="object-cover object-top" sizes="64px" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: COMPREHENSIVE SELECTIONS (6 columns on lg) */}
          <div className="lg:col-span-6 space-y-8 flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Product title & ratings */}
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <span className="text-[10px] uppercase tracking-[0.3em] text-[#1C4D8D] font-mono font-bold">{product.category} atelier</span>
                  <button 
                    onClick={() => toggleWishlist(product.id)}
                    className="p-2 bg-[#F7F5F0] hover:bg-[#1C4D8D]/5 border border-[#657892]/20 rounded-full text-[#1D2B3F]/60 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Heart className={`w-4.5 h-4.5 ${isWish ? 'fill-red-600 text-red-600 border-red-600' : ''}`} />
                  </button>
                </div>
                <h1 className="font-serif text-3xl md:text-4xl text-[#1D2B3F] font-bold leading-tight tracking-tight">{product.name}</h1>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'text-[#C6A15B] fill-[#C6A15B]' : 'text-[#657892]/20'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-[#1D2B3F]/60 font-mono font-medium">{product.rating} / 5</span>
                  <span className="text-[#657892]/20 text-xs font-mono">•</span>
                  <span className="text-xs text-[#657892] font-mono">({product.reviews.length} executive reviews)</span>
                </div>
              </div>

              {/* Price & availability */}
              <div className="border-y border-[#657892]/20 py-4 flex justify-between items-center font-mono">
                <div>
                  <span className="text-[10px] text-[#657892] uppercase tracking-widest block">Investment Value</span>
                  <span className="text-2xl font-bold text-[#1C4D8D]">{currency} {product.price}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#657892] uppercase tracking-widest block">Showroom Status</span>
                  <span className={product.stock > 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                    {product.stock > 0 ? `In Stock (${product.stock} left)` : 'Sold Out'}
                  </span>
                </div>
              </div>

              {/* Rich descriptions */}
              <p className="text-[#1D2B3F]/80 text-xs md:text-sm font-light leading-relaxed">
                {product.description}
              </p>

              {/* Selections Form */}
              <div className="space-y-4 pt-2">
                {/* Size choice */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest text-[#1D2B3F] font-mono font-bold">Size Registry</span>
                    <button 
                      onClick={() => setIsSizeGuideOpen(true)}
                      className="text-[10px] font-mono text-[#657892] hover:text-[#1D2B3F] flex items-center gap-1 uppercase transition-colors cursor-pointer"
                    >
                      <Ruler className="w-3.5 h-3.5" /> Size Guide
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {product.sizes.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSelectedSize(sz)}
                        className={`px-3 py-2 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                          selectedSize === sz 
                            ? 'bg-[#1D2B3F] text-[#F7F5F0] border-[#1D2B3F] font-bold shadow-sm' 
                            : 'border-[#657892]/20 text-[#1D2B3F]/60 hover:border-[#1D2B3F]/40'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Choice */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#1D2B3F] font-mono font-bold">Color Palette</span>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((col) => (
                      <button
                        key={col}
                        onClick={() => setSelectedColor(col)}
                        className={`px-3 py-1.5 rounded text-[10px] border transition-all flex items-center gap-2 cursor-pointer ${
                          selectedColor === col 
                            ? 'bg-[#1C4D8D]/10 text-[#1C4D8D] border-[#1C4D8D]/30 font-semibold' 
                            : 'border-[#657892]/20 text-[#1D2B3F]/50 hover:border-[#1C4D8D]/20'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border border-[#657892]/10" style={{ 
                          backgroundColor: col === 'Midnight Navy' ? '#1e293b' : 
                                          col === 'Charcoal' ? '#475569' : 
                                          col === 'Cognac Brown' ? '#7c2d12' : 
                                          col === 'Obsidian Black' ? '#09090b' : 
                                          col === 'Pristine White' ? '#ffffff' : '#b45309' 
                        }}></span>
                        <span>{col}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-widest text-[#1D2B3F] font-mono font-bold">Quantity</span>
                  <div className="flex items-center border border-[#657892]/20 rounded bg-[#B9CDE5]/10 w-fit">
                    <button 
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 text-[#1D2B3F]/60 hover:text-[#1D2B3F] font-semibold"
                    >
                      -
                    </button>
                    <span className="px-3.5 font-mono text-xs text-[#1D2B3F] font-bold">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                      className="px-3 py-1.5 text-[#1D2B3F]/60 hover:text-[#1D2B3F] font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Sticky-like purchase bar layout */}
              <div className="pt-6 border-t border-[#657892]/20 flex flex-col sm:flex-row gap-4 items-stretch">
                <button
                  onClick={handleAddToCartSubmit}
                  disabled={product.stock <= 0}
                  className="flex-1 bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 text-[#F7F5F0] py-4 rounded-lg font-semibold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 shadow-md hover:shadow-[#1C4D8D]/10 cursor-pointer font-sans"
                  id="add-to-trunk-btn"
                >
                  <ShoppingCart className="w-4.5 h-4.5" />
                  <span>Register to Garment Trunk</span>
                </button>
                <button
                  onClick={handleQuickCheckout}
                  disabled={product.stock <= 0}
                  className="flex-1 bg-[#C6A15B] hover:bg-[#C6A15B]/90 text-[#1D2B3F] py-4 rounded-lg font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 shadow-md hover:shadow-[#C6A15B]/10 cursor-pointer font-sans"
                  id="quick-checkout-btn"
                >
                  <Check className="w-4.5 h-4.5" />
                  <span>Quick Checkout</span>
                </button>
              </div>

            </div>

            {/* Delivery Disclaimer panel */}
            <div className="bg-[#B9CDE5]/10 border border-[#657892]/20 rounded-xl p-4 grid grid-cols-2 gap-4 mt-8">
              <div className="flex gap-2.5 items-start text-xs">
                <Truck className="w-5 h-5 text-[#1C4D8D] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-[#1D2B3F] uppercase tracking-wider text-[9px] font-sans">White-glove Courier</p>
                  <p className="text-[9px] text-[#657892] leading-relaxed font-light font-sans">Hand delivery across Kampala in 3-5 hours. Complimentary on trunks over {currency} {threshold.toLocaleString()}.</p>
                </div>
              </div>
              <div className="flex gap-2.5 items-start text-xs">
                <ShieldCheck className="w-5 h-5 text-[#C6A15B] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-[#1D2B3F] uppercase tracking-wider text-[9px] font-sans">Atelier Warranty</p>
                  <p className="text-[9px] text-[#657892] leading-relaxed font-light font-sans">Custom tailoring adjustments can be made instant and complimentary at our physical showroom lounge.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* REVIEWS SEGMENT */}
        <div className="pt-16 border-t border-[#657892]/20 grid grid-cols-1 lg:grid-cols-12 gap-12" id="reviews-portal">
          {/* Reviews list (7 columns) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex justify-between items-center border-b border-[#657892]/20 pb-4">
              <h3 className="font-serif text-lg text-[#1D2B3F] font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#1C4D8D]" />
                <span>Executive Sartorial Feedback</span>
              </h3>
              <span className="text-xs font-mono text-[#657892]">({product.reviews.length} reviews)</span>
            </div>

            {product.reviews.length === 0 ? (
              <p className="text-xs text-[#657892] font-mono italic">No custom fitting reports compiled yet. Be the first to submit.</p>
            ) : (
              <div className="space-y-4">
                {product.reviews.map((rev, idx) => (
                  <div key={idx} className="bg-[#B9CDE5]/5 border border-[#657892]/15 rounded-xl p-4 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-[#1D2B3F]">{rev.userName}</span>
                      <span className="text-[10px] text-[#657892]/70 font-mono">{rev.date}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'text-[#C6A15B] fill-[#C6A15B]' : 'text-[#657892]/20'}`} />
                      ))}
                    </div>
                    <p className="text-[#1D2B3F]/80 text-xs leading-relaxed font-light">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review form submissions (5 columns) */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="font-serif text-lg text-[#1D2B3F] font-bold border-b border-[#657892]/20 pb-4">
              Compile Garment Report
            </h3>

            {reviewSuccess ? (
              <div className="bg-[#C6A15B]/10 border border-[#C6A15B]/20 rounded-xl p-5 text-center space-y-2">
                <Check className="w-8 h-8 text-[#C6A15B] mx-auto" />
                <h4 className="font-serif text-sm font-bold text-[#1D2B3F]">Feedback Submitted</h4>
                <p className="text-[10px] text-[#657892] leading-relaxed">Thank you, Sir. Your custom sartorial commentary has been appended to this garment&apos;s public registry.</p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="bg-[#B9CDE5]/10 border border-[#657892]/20 rounded-xl p-5 space-y-4 text-xs font-sans">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-[#657892] font-mono">Your Identity</label>
                  <input 
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="e.g. Amama Mbabazi"
                    className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded px-3 py-2 text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none shadow-sm"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-[#657892] font-mono block">Garment Rating</label>
                  <select 
                    value={reviewRating} 
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="bg-[#F7F5F0] border border-[#657892]/30 rounded px-2.5 py-1.5 text-[#1D2B3F] font-mono focus:border-[#1C4D8D] shadow-sm outline-none"
                  >
                    <option value={5}>5 Stars - Perfection</option>
                    <option value={4}>4 Stars - Prestigious</option>
                    <option value={3}>3 Stars - Custom</option>
                    <option value={2}>2 Stars - Needs Taper</option>
                    <option value={1}>1 Star - Flawed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-widest text-[#657892] font-mono">Sartorial Feedback / Comment</label>
                  <textarea 
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={3}
                    placeholder="Describe custom drape, fabric quality, and waist fittings..."
                    className="w-full bg-[#F7F5F0] border border-[#657892]/30 rounded px-3 py-2 text-[#1D2B3F] placeholder-[#657892]/50 focus:border-[#1C4D8D] outline-none resize-none shadow-sm"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#1C4D8D] text-[#F7F5F0] hover:bg-[#1C4D8D]/90 py-3 rounded text-[10px] uppercase font-mono font-bold tracking-widest transition-all cursor-pointer shadow-sm"
                >
                  Publish Report
                </button>
              </form>
            )}
          </div>
        </div>

        {/* SIMILAR PRODUCTS recommendations */}
        {similarProducts.length > 0 && (
          <div className="pt-16 border-t border-[#657892]/20 space-y-6">
            <h3 className="font-serif text-xl text-[#1D2B3F] font-bold tracking-tight">Complementary Sartorial Selections</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {similarProducts.map((p) => (
                <div key={p.id} className="bg-[#F7F5F0] border border-[#657892]/20 rounded-xl overflow-hidden group hover:border-[#1C4D8D]/30 transition-all flex flex-col justify-between shadow-sm">
                  <div className="relative aspect-[3/4] overflow-hidden bg-[#F7F5F0]">
                    <Image src={getSafeImageSrc(p.images?.[0])} alt={p.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 30vw" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-4 space-y-2">
                    <h4 className="font-serif font-bold text-[#1D2B3F] truncate text-sm">{p.name}</h4>
                    <div className="flex justify-between items-center font-mono text-xs">
                      <span className="text-[#1C4D8D] font-semibold">{currency} {p.price}</span>
                      <Link href={`/product/${p.id}`} className="text-[#657892] hover:text-[#1C4D8D] flex items-center gap-0.5">
                        Inspect →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* SIZE GUIDE DYNAMIC OVERLAY MODAL */}
      <AnimatePresence>
        {isSizeGuideOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSizeGuideOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="fixed inset-4 max-w-md mx-auto bg-[#F7F5F0] border border-[#657892]/20 rounded-2xl z-50 p-6 space-y-6 shadow-2xl h-fit max-h-[80vh] m-auto text-[#1D2B3F]"
              id="size-guide-overlay-modal"
            >
              <div className="flex justify-between items-center border-b border-[#657892]/20 pb-4">
                <h3 className="font-serif text-lg text-[#1D2B3F] font-bold flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-[#1C4D8D]" />
                  <span>Sartorial Measurement Chart</span>
                </h3>
                <button onClick={() => setIsSizeGuideOpen(false)} className="text-[#657892] hover:text-[#1D2B3F] p-1 cursor-pointer">
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs font-sans leading-relaxed text-[#1D2B3F]/80">
                <p>All items are cut according to elegant Savile Row guidelines. Use the matrix below to find your fitting:</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono border-collapse border border-[#657892]/20 text-[10px]">
                    <thead>
                      <tr className="bg-[#B9CDE5]/10 border-b border-[#657892]/20 text-[#1D2B3F] font-bold">
                        <th className="p-2 border border-[#657892]/20">EU Size</th>
                        <th className="p-2 border border-[#657892]/20">Chest (in)</th>
                        <th className="p-2 border border-[#657892]/20">Waist (in)</th>
                        <th className="p-2 border border-[#657892]/20">Sleeve (in)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#657892]/10">
                      {[
                        { eu: "48R", ch: "38", ws: "32", sl: "33.5" },
                        { eu: "50R", ch: "40", ws: "34", sl: "34.0" },
                        { eu: "52R", ch: "42", ws: "36", sl: "34.5" },
                        { eu: "54R", ch: "44", ws: "38", sl: "35.0" },
                        { eu: "56R", ch: "46", ws: "40", sl: "35.5" }
                      ].map((r, i) => (
                        <tr key={i} className="hover:bg-[#B9CDE5]/5">
                          <td className="p-2 border border-[#657892]/20 font-bold text-[#1D2B3F]">{r.eu}</td>
                          <td className="p-2 border border-[#657892]/20">{r.ch}</td>
                          <td className="p-2 border border-[#657892]/20">{r.ws}</td>
                          <td className="p-2 border border-[#657892]/20">{r.sl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-[10px] text-[#657892] leading-normal italic">
                  Note: Custom measurements and waist tape taps can be performed instantly by calling our showroom fitting escort directly or contacting the AI Stylist.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button 
                  onClick={() => setIsSizeGuideOpen(false)}
                  className="bg-[#1C4D8D] text-[#F7F5F0] hover:bg-[#1C4D8D]/90 px-5 py-2 rounded text-xs uppercase font-semibold font-sans cursor-pointer transition-all duration-300 shadow-sm"
                >
                  Done
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
