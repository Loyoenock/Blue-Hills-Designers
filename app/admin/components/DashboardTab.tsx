'use client';

import { motion } from 'motion/react';
import { DollarSign, ShoppingBag, Users, Layers, TrendingUp } from 'lucide-react';
import { Product, Order } from '../../../types';

interface DashboardTabProps {
  totalRevenue: number;
  orders: Order[];
  activeCustomers: number;
  products: Product[];
}

export default function DashboardTab({
  totalRevenue,
  orders,
  activeCustomers,
  products
}: DashboardTabProps) {
  return (
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
            {products.slice(0, 3).map((prod) => {
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
  );
}
