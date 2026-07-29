'use client';

import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { User } from '../../../types';

interface BookingsTabProps {
  bookingSearch: string;
  setBookingSearch: (s: string) => void;
  bookingStatusFilter: string;
  setBookingStatusFilter: (s: string) => void;
  filteredBookings: any[];
  updateBookingStatus: (id: string, status: any, name: string, role: string) => Promise<any>;
  currentUser: User | null;
}

export default function BookingsTab({
  bookingSearch,
  setBookingSearch,
  bookingStatusFilter,
  setBookingStatusFilter,
  filteredBookings,
  updateBookingStatus,
  currentUser,
}: BookingsTabProps) {
  return (
    <motion.div 
      key="bookings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="font-serif text-xl text-white font-bold">Personal Styling Bookings</h3>
        <div className="flex gap-2.5">
          <span className="text-[10px] text-[#20D9A1] font-mono uppercase tracking-widest font-bold">Bookings Desk Active</span>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#111111] p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 col-span-2">
          <Search className="w-4 h-4 text-white/40" />
          <input 
            type="text" 
            value={bookingSearch}
            onChange={(e) => setBookingSearch(e.target.value)}
            placeholder="Search Client Name, Email, Phone..."
            className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/35 w-full focus:ring-0"
          />
        </div>
        <div>
          <select 
            value={bookingStatusFilter}
            onChange={(e) => setBookingStatusFilter(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-white/5 text-[9px] uppercase tracking-widest font-mono text-white/40">
                <th className="py-3 px-2">BOOKING ID</th>
                <th className="py-3 px-2">CLIENT DETAILS</th>
                <th className="py-3 px-2 font-mono">DATE / TIME</th>
                <th className="py-3 px-2 font-mono">NOTES</th>
                <th className="py-3 px-2 font-mono">STATUS STATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-white/30 font-light text-xs">
                    No styling bookings found matching the parameters.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-[#20D9A1]">{b.id}</td>
                    <td className="py-3 px-2 space-y-0.5">
                      <span className="font-semibold text-white block">{b.clientName}</span>
                      <span className="text-[10px] text-white/40 block">{b.clientEmail}</span>
                      {b.clientPhone && (
                        <span className="text-[10px] text-white/40 font-mono block">{b.clientPhone}</span>
                      )}
                    </td>
                    <td className="py-3 px-2 font-mono text-white/70 space-y-0.5">
                      <div className="font-medium text-white">{b.date}</div>
                      <div className="text-[10px] text-white/40">{b.time}</div>
                    </td>
                    <td className="py-3 px-2 text-white/60 max-w-xs truncate" title={b.notes}>
                      {b.notes || <span className="text-white/20 italic">No notes</span>}
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={b.status}
                        onChange={(e) => updateBookingStatus(
                          b.id, 
                          e.target.value as any,
                          currentUser?.name || 'Master Admin',
                          currentUser?.role || 'Super Admin'
                        )}
                        className={`text-[10px] font-mono uppercase font-bold py-1 px-2.5 rounded-full bg-black border border-white/10 outline-none focus:border-[#5F39FF] ${
                          b.status === 'Completed' ? 'text-green-400' :
                          b.status === 'Confirmed' ? 'text-blue-400' :
                          'text-yellow-400'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
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
