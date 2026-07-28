'use client';

import { motion } from 'motion/react';
import { Layers, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Category, Product } from '../../../types';

interface CategoriesTabProps {
  canSeeCategories?: boolean;
  canModifyCategories: boolean;
  handleOpenCategoryModal: (cat?: Category) => void;
  categorySearch: string;
  setCategorySearch: (s: string) => void;
  filteredCategories: Category[];
  products: Product[];
  handleOpenDeleteCategoryModal: (cat: Category) => void;
}

export default function CategoriesTab({
  canSeeCategories,
  canModifyCategories,
  handleOpenCategoryModal,
  categorySearch,
  setCategorySearch,
  filteredCategories,
  products,
  handleOpenDeleteCategoryModal,
}: CategoriesTabProps) {
  if (!canSeeCategories) return null;

  return (
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
  );
}
