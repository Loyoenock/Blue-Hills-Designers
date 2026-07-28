'use client';

import { motion } from 'motion/react';
import { MessageSquare, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Testimonial, User } from '../../../types';

interface TestimonialsTabProps {
  canSeeTestimonials?: boolean;
  canModifyTestimonials: boolean;
  handleOpenTestimonialModal: (t?: Testimonial) => void;
  testimonialSearch: string;
  setTestimonialSearch: (s: string) => void;
  filteredTestimonials: Testimonial[];
  updateTestimonial: (id: string, updates: Partial<Testimonial>, adminName: string, adminRole: string) => Promise<any>;
  currentUser: User | null;
  handleOpenDeleteTestimonialModal: (t: Testimonial) => void;
}

export default function TestimonialsTab({
  canSeeTestimonials,
  canModifyTestimonials,
  handleOpenTestimonialModal,
  testimonialSearch,
  setTestimonialSearch,
  filteredTestimonials,
  updateTestimonial,
  currentUser,
  handleOpenDeleteTestimonialModal,
}: TestimonialsTabProps) {
  if (!canSeeTestimonials) return null;

  return (
    <motion.div 
      key="testimonials"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111111] p-6 rounded-2xl border border-white/10">
        <div>
          <h3 className="font-serif text-xl text-white font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#C6A15B]" />
            Executive Testimonials
          </h3>
          <p className="text-[11px] text-white/40 mt-0.5">Manage customer endorsements and VIP quotes displayed on the public homepage.</p>
        </div>
        {canModifyTestimonials && (
          <button
            onClick={() => handleOpenTestimonialModal()}
            className="bg-[#5F39FF] text-white hover:bg-[#4d2ee0] px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#5F39FF]/20 font-mono shrink-0"
            id="create-testimonial-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Testimonial
          </button>
        )}
      </div>

      {/* Filter / Search */}
      <div className="bg-[#111111] p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 max-w-md">
          <Search className="w-4 h-4 text-white/40" />
          <input 
            type="text" 
            value={testimonialSearch}
            onChange={(e) => setTestimonialSearch(e.target.value)}
            placeholder="Search quote, author name, role, company..."
            className="bg-transparent border-0 outline-none text-xs text-white placeholder-white/35 w-full focus:ring-0 font-mono"
            id="testimonial-search-input"
          />
        </div>
      </div>

      {/* Testimonials Table */}
      <div className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wider text-white/40 font-mono">
                <th className="py-3.5 px-3 text-center w-16">Order</th>
                <th className="py-3.5 px-4">Author & Role</th>
                <th className="py-3.5 px-4">Quote</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-white/80">
              {filteredTestimonials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-white/40 font-mono text-xs">
                    No testimonials found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredTestimonials.map((t) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-3 text-center font-mono">
                      <span className="bg-white/5 border border-white/10 text-white/70 px-2.5 py-1 rounded text-xs font-bold">
                        #{t.displayOrder}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 min-w-[180px]">
                      <div className="font-serif font-bold text-white text-sm">{t.name}</div>
                      <div className="text-[10px] text-[#C6A15B] font-mono font-medium">
                        {t.role}{t.role && t.company ? ' • ' : ''}{t.company}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-md font-serif italic text-white/80 text-xs leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </td>
                    <td className="py-3.5 px-3 text-center font-mono">
                      {canModifyTestimonials ? (
                        <button
                          onClick={() => updateTestimonial(t.id!, { isActive: !t.isActive }, currentUser?.name || 'Master Admin', currentUser?.role || 'Super Admin')}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                            t.isActive
                              ? 'bg-[#20D9A1]/10 border-[#20D9A1]/30 text-[#20D9A1] hover:bg-[#20D9A1]/20'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                          }`}
                        >
                          {t.isActive ? 'Active' : 'Inactive'}
                        </button>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          t.isActive
                            ? 'bg-[#20D9A1]/10 border-[#20D9A1]/30 text-[#20D9A1]'
                            : 'bg-white/5 border-white/10 text-white/40'
                        }`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        {canModifyTestimonials && (
                          <>
                            <button 
                              onClick={() => handleOpenTestimonialModal(t)}
                              className="p-1.5 rounded border border-white/5 bg-white/5 hover:border-[#20D9A1]/30 hover:bg-[#20D9A1]/5 text-white/70 hover:text-[#20D9A1] transition-all cursor-pointer"
                              title="Edit testimonial"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleOpenDeleteTestimonialModal(t)}
                              className="p-1.5 rounded border border-white/5 bg-white/5 hover:border-red-500/30 hover:bg-red-500/5 text-white/70 hover:text-red-400 transition-all cursor-pointer"
                              title="Delete testimonial"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
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
