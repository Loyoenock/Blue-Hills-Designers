'use client';

import { motion } from 'motion/react';
import { Download, Printer, Search } from 'lucide-react';
import { Order, User } from '../../../types';

interface OrdersTabProps {
  handleExportData: (type: 'csv' | 'print') => void;
  orderSearch: string;
  setOrderSearch: (s: string) => void;
  orderStatusFilter: string;
  setOrderStatusFilter: (s: string) => void;
  filteredOrders: Order[];
  canModifyOrders: boolean;
  updateOrderStatus: (id: string, status: any, name: string, role: string) => Promise<void>;
  currentUser: User | null;
  setSelectedOrderDetails: (order: Order) => void;
}

export default function OrdersTab({
  handleExportData,
  orderSearch,
  setOrderSearch,
  orderStatusFilter,
  setOrderStatusFilter,
  filteredOrders,
  canModifyOrders,
  updateOrderStatus,
  currentUser,
  setSelectedOrderDetails,
}: OrdersTabProps) {
  return (
    <motion.div 
      key="orders"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-serif text-xl text-white font-bold">BHD Orders Ledger</h3>

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
  );
}
