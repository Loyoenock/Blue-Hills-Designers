'use client';

import { motion } from 'motion/react';
import { Search, X, UserCircle, ShoppingBag } from 'lucide-react';

interface CustomersTabProps {
  customerSearch: string;
  setCustomerSearch: (s: string) => void;
  filteredCustomers: any[];
  setOrderSearch: (s: string) => void;
  setActiveTab: (tab: any) => void;
}

export default function CustomersTab({
  customerSearch,
  setCustomerSearch,
  filteredCustomers,
  setOrderSearch,
  setActiveTab,
}: CustomersTabProps) {
  return (
    <motion.div 
      key="customers"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h3 className="font-serif text-xl text-white font-bold">VIP Clientele Directory</h3>
          <p className="text-xs text-white/40">Monitor customer purchasing history, lifetime value, and order recency.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#20D9A1] font-mono uppercase tracking-widest font-bold">● Clientele Insights Live</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
          <input
            type="text"
            placeholder="Search client profiles by name, email, phone..."
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            className="w-full bg-[#111111] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/30 focus:border-[#20D9A1] outline-none transition-all font-mono"
          />
          {customerSearch && (
            <button 
              onClick={() => setCustomerSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Customer Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredCustomers.length === 0 ? (
          <div className="xl:col-span-2 bg-[#111111] border border-dashed border-white/10 rounded-2xl p-12 text-center text-white/40">
            <UserCircle className="w-10 h-10 mx-auto opacity-30 mb-3 text-white" />
            <p className="font-serif font-bold text-lg text-white mb-1">No VIP clientele matched your search</p>
            <p className="text-xs font-mono">Try adjusting your search criteria.</p>
          </div>
        ) : (
          filteredCustomers.map((c) => (
            <div key={c.id} className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-white/20 transition-all">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg text-white font-bold tracking-tight">{c.name}</h4>
                    <p className="text-[10px] text-white/40 font-mono flex items-center gap-1.5">
                      <span className="text-[#20D9A1]">ID:</span> {c.id}
                    </p>
                    <p className="text-xs text-white/60 font-mono">{c.email}</p>
                    {c.phone && <p className="text-xs text-white/50 font-mono">Tel: {c.phone}</p>}
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    VIP Client
                  </span>
                </div>

                {/* Stats / Spend / Orders / Recency */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 bg-black/20 rounded-xl p-3 border border-white/5 font-mono text-[11px]">
                  <div>
                    <span className="text-white/40 uppercase text-[8px] tracking-wider block">Total Orders</span>
                    <span className="text-white font-bold text-sm">{c.totalOrders}</span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase text-[8px] tracking-wider block">Lifetime Spend</span>
                    <span className="text-[#20D9A1] font-bold text-sm">
                      Ugx {c.lifetimeSpend.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase text-[8px] tracking-wider block">Last Order</span>
                    <span className="text-white font-medium text-xs truncate block">{c.lastOrderDate}</span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase text-[8px] tracking-wider block">Status</span>
                    <span className={`text-xs font-bold block ${
                      c.lastOrderStatus === 'Delivered' ? 'text-green-400' :
                      c.lastOrderStatus === 'Processing' ? 'text-blue-400' :
                      c.lastOrderStatus === 'Cancelled' ? 'text-red-400' :
                      c.lastOrderStatus === 'Pending' ? 'text-yellow-400' :
                      'text-white/40'
                    }`}>
                      {c.lastOrderStatus}
                    </span>
                  </div>
                </div>

                {/* Additional Customer Info: Spending & Rewards Points from User profile */}
                <div className="grid grid-cols-2 gap-4 mt-3 bg-black/40 rounded-xl p-3 border border-white/5 font-mono text-[10px]">
                  <div>
                    <span className="text-white/40 uppercase text-[8px] tracking-wider block">Profile Spending</span>
                    <span className="text-white/80 font-bold">${c.spending?.toLocaleString() || '0'}</span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase text-[8px] tracking-wider block">Rewards Points</span>
                    <span className="text-[#20D9A1] font-bold">{c.rewardsPoints?.toLocaleString() || '0'} pts</span>
                  </div>
                </div>
              </div>

              {/* Actions row */}
              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    setOrderSearch(c.email);
                    setActiveTab('orders');
                  }}
                  className="bg-[#5F39FF]/10 hover:bg-[#5F39FF]/20 border border-[#5F39FF]/30 text-[#20D9A1] hover:text-white font-semibold text-xs uppercase font-mono px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> View Orders
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
