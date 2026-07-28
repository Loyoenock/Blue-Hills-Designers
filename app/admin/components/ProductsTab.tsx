'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Plus, Search, MessageSquare, Edit, Trash2, Star } from 'lucide-react';
import { Product, User } from '../../../types';

interface ProductsTabProps {
  canModifyProducts: boolean;
  handleOpenProductModal: (prod?: Product | null) => void;
  productSearch: string;
  setProductSearch: (s: string) => void;
  productCategoryFilter: string;
  setProductCategoryFilter: (c: string) => void;
  stockStatusFilter: string;
  setStockStatusFilter: (s: string) => void;
  productSort: string;
  setProductSort: (s: string) => void;
  filteredProducts: Product[];
  getSafeImageSrc: (src?: string) => string;
  updateProductStockQuick: (id: string, newStock: number, name: string, role: string) => void;
  currentUser: User | null;
  expandedReviewsProductId: string | null;
  setExpandedReviewsProductId: (id: string | null) => void;
  handleOpenDeleteModal: (p: Product) => void;
  deleteReview: (productId: string, reviewId: string, name: string, role: string) => Promise<any>;
}

export default function ProductsTab({
  canModifyProducts,
  handleOpenProductModal,
  productSearch,
  setProductSearch,
  productCategoryFilter,
  setProductCategoryFilter,
  stockStatusFilter,
  setStockStatusFilter,
  productSort,
  setProductSort,
  filteredProducts,
  getSafeImageSrc,
  updateProductStockQuick,
  currentUser,
  expandedReviewsProductId,
  setExpandedReviewsProductId,
  handleOpenDeleteModal,
  deleteReview,
}: ProductsTabProps) {
  return (
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
  );
}
