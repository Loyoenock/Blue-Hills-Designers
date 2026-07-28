'use client';

import { motion } from 'motion/react';
import { Search } from 'lucide-react';

interface ReconciliationTabProps {
  canSeeReconciliation: boolean;
  reconciliationSearch: string;
  setReconciliationSearch: (s: string) => void;
  isLoadingReconciliation: boolean;
  filteredReconciliationFlags: any[];
}

export default function ReconciliationTab({
  canSeeReconciliation,
  reconciliationSearch,
  setReconciliationSearch,
  isLoadingReconciliation,
  filteredReconciliationFlags,
}: ReconciliationTabProps) {
  if (!canSeeReconciliation) return null;

  return (
    <motion.div 
      key="reconciliation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h3 className="font-serif text-xl text-white font-bold">Payment Reconciliation Flags</h3>
        <span className="text-[10px] text-amber-400 font-mono">● READ-ONLY AUDIT FLAGS</span>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#111111] p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 col-span-3">
          <Search className="w-4 h-4 text-white/40" />
          <input 
            type="text" 
            value={reconciliationSearch}
            onChange={(e) => setReconciliationSearch(e.target.value)}
            placeholder="Search transaction ID, client email, payment provider, or raw error..."
            className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/35 w-full focus:ring-0"
          />
        </div>
      </div>

      <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 font-mono text-[11px] leading-relaxed space-y-3 max-h-[500px] overflow-y-auto font-sans">
        {isLoadingReconciliation ? (
          <div className="text-center text-white/30 py-8 font-sans text-xs">Loading reconciliation flags...</div>
        ) : filteredReconciliationFlags.length === 0 ? (
          <div className="text-center text-white/30 py-8 italic font-sans text-xs">No reconciliation records match the filter.</div>
        ) : (
          filteredReconciliationFlags.map((flag) => (
            <div key={flag.id} className="border-b border-white/5 pb-2.5 flex items-start gap-3 font-mono text-[11px]">
              <span className="text-white/30 shrink-0 font-mono">[{flag.created_at ? new Date(flag.created_at).toISOString() : 'N/A'}]</span>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-amber-400 font-bold uppercase tracking-wider text-[9px] font-mono">Txn: {flag.transaction_id || 'N/A'}</span>
                  <span className="text-white/60 font-mono text-[10px]">Ugx {(flag.amount || 0).toLocaleString()}</span>
                </div>
                <p className="text-white/70 font-sans">Client: {flag.email || 'N/A'} ({flag.payment_provider || 'N/A'})</p>
                <p className="text-red-400/90 font-mono text-[10px] bg-red-950/20 p-2 rounded border border-red-500/10 mt-1">Error: {flag.raw_error || 'Unspecified exception'}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
