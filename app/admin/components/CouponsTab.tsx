'use client';

import { motion } from 'motion/react';
import { Tag, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Coupon } from '../../../types';

interface CouponsTabProps {
  canSeeCoupons: boolean;
  handleOpenCouponModal: (coupon?: Coupon) => void;
  couponSearch: string;
  setCouponSearch: (s: string) => void;
  couponTypeFilter: string;
  setCouponTypeFilter: (t: string) => void;
  couponStatusFilter: string;
  setCouponStatusFilter: (s: string) => void;
  filteredCoupons: Coupon[];
  handleOpenDeleteCouponModal: (coupon: Coupon) => void;
}

export default function CouponsTab({
  canSeeCoupons,
  handleOpenCouponModal,
  couponSearch,
  setCouponSearch,
  couponTypeFilter,
  setCouponTypeFilter,
  couponStatusFilter,
  setCouponStatusFilter,
  filteredCoupons,
  handleOpenDeleteCouponModal,
}: CouponsTabProps) {
  if (!canSeeCoupons) return null;

  return (
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
  );
}
