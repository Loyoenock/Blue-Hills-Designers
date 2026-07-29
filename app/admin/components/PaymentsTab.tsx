'use client';

import { motion } from 'motion/react';
import { CreditCard, Search, X } from 'lucide-react';
import { User } from '../../../types';

interface PaymentsTabProps {
  paymentStats: {
    settledSum: number;
    pendingSum: number;
    refundedSum: number;
    failedSum: number;
  };
  paymentSearch: string;
  setPaymentSearch: (s: string) => void;
  paymentStatusFilter: string;
  setPaymentStatusFilter: (s: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (m: string) => void;
  filteredPayments: any[];
  updatePaymentStatus: (id: string, status: any, name: string, role: string) => Promise<any>;
  currentUser: User | null;
}

export default function PaymentsTab({
  paymentStats,
  paymentSearch,
  setPaymentSearch,
  paymentStatusFilter,
  setPaymentStatusFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  filteredPayments,
  updatePaymentStatus,
  currentUser,
}: PaymentsTabProps) {
  return (
    <motion.div 
      key="payments"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h3 className="font-serif text-xl text-white font-bold">Sartorial Payment Ledger</h3>
          <p className="text-white/40 text-xs font-light">Monitor transactions, adjust clearance codes, and issue overrides.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#20D9A1] font-mono uppercase tracking-widest font-bold">Ledger Active</span>
        </div>
      </div>

      {/* Statistics panel */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { title: "SETTLED AMOUNT", val: `Ugx ${paymentStats.settledSum}`, color: 'text-green-400', desc: 'Cleared funds successfully settled.' },
          { title: "PENDING DEPOSITS", val: `Ugx ${paymentStats.pendingSum}`, color: 'text-yellow-400', desc: 'Funds awaiting authorization.' },
          { title: "REFUNDED CAPITAL", val: `Ugx ${paymentStats.refundedSum}`, color: 'text-blue-400', desc: 'Returned to corporate cards.' },
          { title: "FAILED ATTEMPTS", val: `Ugx ${paymentStats.failedSum}`, color: 'text-red-400', desc: 'Declined transactions.' }
        ].map((stat, i) => (
          <div key={i} className="bg-[#111111] border border-white/10 rounded-xl p-4 space-y-1">
            <span className="text-[8px] text-white/40 uppercase tracking-widest font-mono font-bold block">{stat.title}</span>
            <div className={`font-mono text-lg font-bold ${stat.color}`}>{stat.val}</div>
            <p className="text-[9px] text-white/30 leading-normal">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-[#111111] border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search payments, customers, order IDs..."
            value={paymentSearch}
            onChange={(e) => setPaymentSearch(e.target.value)}
            className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-white/30 focus:border-[#5F39FF] outline-none"
          />
          {paymentSearch && (
            <button 
              onClick={() => setPaymentSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Status:</span>
            <select 
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:border-[#5F39FF] outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Method:</span>
            <select 
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:border-[#5F39FF] outline-none"
            >
              <option value="All">All Methods</option>
              <option value="Visa">Visa Card</option>
              <option value="Mobile Money">Mobile Money</option>
              <option value="Cash on Delivery">Cash on Delivery</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-[9px] uppercase tracking-widest font-mono text-white/40">
                <th className="py-3 px-4 font-mono">TRANSACTION ID</th>
                <th className="py-3 px-4 font-mono">ORDER ID</th>
                <th className="py-3 px-4">VIP CLIENT</th>
                <th className="py-3 px-4 font-mono">DATE</th>
                <th className="py-3 px-4 font-mono">METHOD</th>
                <th className="py-3 px-4 font-mono">SETTLEMENT SUM</th>
                <th className="py-3 px-4 font-mono">CLEARANCE STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-white/30 font-light text-xs">
                    No payment transactions found matching the parameters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4 font-mono text-white/80 font-bold">{p.transactionId}</td>
                    <td className="py-4 px-4 font-mono font-bold text-[#20D9A1]">{p.orderId}</td>
                    <td className="py-4 px-4 space-y-0.5">
                      <span className="font-semibold text-white block">{p.customerName}</span>
                      <span className="text-[10px] text-white/40 block">{p.customerEmail}</span>
                    </td>
                    <td className="py-4 px-4 font-mono text-white/50">{p.date}</td>
                    <td className="py-4 px-4">
                      <span className="text-white font-medium text-xs flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-white/30" />
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-white">Ugx {p.amount}</td>
                    <td className="py-4 px-4">
                      <select
                        value={p.status}
                        onChange={(e) => updatePaymentStatus(
                          p.id, 
                          e.target.value as any,
                          currentUser?.name || 'Master Admin',
                          currentUser?.role || 'Super Admin'
                        )}
                        className={`text-[10px] font-mono uppercase font-bold py-1 px-2.5 rounded-full bg-black border border-white/10 outline-none focus:border-[#5F39FF] ${
                          p.status === 'Paid' ? 'text-green-400' :
                          p.status === 'Pending' ? 'text-yellow-400' :
                          p.status === 'Refunded' ? 'text-blue-400' :
                          'text-red-400'
                        }`}
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                        <option value="Refunded">Refunded</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
