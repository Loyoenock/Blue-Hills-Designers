'use client';

import { motion } from 'motion/react';
import { Search } from 'lucide-react';

interface LogsTabProps {
  canSeeLogs: boolean;
  logSearch: string;
  setLogSearch: (s: string) => void;
  logActionFilter: string;
  setLogActionFilter: (a: string) => void;
  filteredLogs: any[];
}

export default function LogsTab({
  canSeeLogs,
  logSearch,
  setLogSearch,
  logActionFilter,
  setLogActionFilter,
  filteredLogs,
}: LogsTabProps) {
  if (!canSeeLogs) return null;

  return (
    <motion.div 
      key="logs"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h3 className="font-serif text-xl text-white font-bold">PCI-DSS Cybersecurity Audit Logs</h3>
        <span className="text-[10px] text-[#20D9A1] font-mono">● ENCRYPTED ACTIVE TRACE</span>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#111111] p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 col-span-2">
          <Search className="w-4 h-4 text-white/40" />
          <input 
            type="text" 
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            placeholder="Search log details, operator, action..."
            className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/35 w-full focus:ring-0"
          />
        </div>
        <div>
          <select 
            value={logActionFilter}
            onChange={(e) => setLogActionFilter(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white focus:outline-none"
          >
            <option value="All">All Audit Events</option>
            <option value="Product Registered">Product Registered</option>
            <option value="Product Updated">Product Updated</option>
            <option value="User Registered">User Registered</option>
            <option value="User Updated">User Updated</option>
            <option value="Order Status Adjusted">Order Status Adjusted</option>
            <option value="Payment Status Adjusted">Payment Status Adjusted</option>
            <option value="Settings Updated">Settings Updated</option>
            <option value="Booking Status Adjusted">Booking Status Adjusted</option>
          </select>
        </div>
      </div>

      <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 font-mono text-[11px] leading-relaxed space-y-3 max-h-[500px] overflow-y-auto font-sans">
        {filteredLogs.length === 0 ? (
          <div className="text-center text-white/30 py-8 italic font-sans text-xs">No audit records match the filters.</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="border-b border-white/5 pb-2.5 flex items-start gap-3 font-mono text-[11px]">
              <span className="text-white/30 shrink-0 font-mono">[{log.timestamp}]</span>
              <div className="space-y-0.5">
                <p className="text-[#20D9A1] font-bold uppercase tracking-wider text-[9px] font-mono">Scope: {log.action}</p>
                <p className="text-white/70 font-sans">{log.details}</p>
                <p className="text-white/30 text-[9px] font-sans">Operator: {log.userName} ({log.userRole})</p>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
