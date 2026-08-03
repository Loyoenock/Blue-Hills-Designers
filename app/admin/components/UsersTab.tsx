'use client';

import { motion } from 'motion/react';
import { Plus, Search, Filter, Users, Edit, Trash2, KeyRound } from 'lucide-react';
import { User } from '../../../types';
import { isUUID } from '../../../lib/utils';

interface UsersTabProps {
  canModifyUsers: boolean;
  handleOpenUserModal: (user: User | null) => void;
  userSearch: string;
  setUserSearch: (s: string) => void;
  userRoleFilter: string;
  setUserRoleFilter: (r: string) => void;
  filteredUsers: User[];
  currentUser: User | null;
  handleOpenDeleteUserModal: (user: User) => void;
  handleOpenResetPasswordModal?: (user: User) => void;
}

export default function UsersTab({
  canModifyUsers,
  handleOpenUserModal,
  userSearch,
  setUserSearch,
  userRoleFilter,
  setUserRoleFilter,
  filteredUsers,
  currentUser,
  handleOpenDeleteUserModal,
  handleOpenResetPasswordModal,
}: UsersTabProps) {
  return (
    <motion.div 
      key="users"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h3 className="font-serif text-xl text-white font-bold">User & BHD Access Directory</h3>
          <p className="text-xs text-white/40">Manage staff roles, customer profiles, spending metrics, and loyalty keys.</p>
        </div>
        {canModifyUsers && (
          <button
            onClick={() => handleOpenUserModal(null)}
            className="bg-[#20D9A1] hover:bg-[#1bb887] text-black font-semibold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer font-mono"
          >
            <Plus className="w-4 h-4" /> Add New Profile
          </button>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
          <input
            type="text"
            placeholder="Search profiles by name, email, phone..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full bg-[#111111] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/30 focus:border-[#20D9A1] outline-none transition-all font-mono"
          />
        </div>
        <div className="flex items-center gap-2 bg-[#111111] border border-white/10 rounded-xl px-3 py-1">
          <Filter className="text-white/40 w-3.5 h-3.5" />
          <select
            value={userRoleFilter}
            onChange={(e) => setUserRoleFilter(e.target.value)}
            className="bg-transparent border-none text-xs text-white outline-none cursor-pointer pr-4 py-1"
          >
            <option value="All" className="bg-[#111111]">All Roles</option>
            <option value="Super Admin" className="bg-[#111111]">Super Admin</option>
            <option value="Admin" className="bg-[#111111]">Admin</option>
            <option value="Manager" className="bg-[#111111]">Manager</option>
            <option value="Staff" className="bg-[#111111]">Staff</option>
            <option value="Customer" className="bg-[#111111]">Customer</option>
          </select>
        </div>
      </div>

      {/* Grid of Users */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredUsers.length === 0 ? (
          <div className="xl:col-span-2 bg-[#111111] border border-dashed border-white/10 rounded-2xl p-12 text-center text-white/40">
            <Users className="w-10 h-10 mx-auto opacity-30 mb-3 text-white" />
            <p className="font-serif font-bold text-lg text-white mb-1">No profiles matched your filters</p>
            <p className="text-xs font-mono">Try adjusting your search criteria or register a new profile.</p>
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div key={u.id} className="bg-[#111111] border border-white/10 rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:border-white/20 transition-all">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <h4 className="font-serif text-lg text-white font-bold tracking-tight">{u.name}</h4>
                    <p className="text-[10px] text-white/40 font-mono flex items-center gap-1.5">
                      <span className="text-[#20D9A1]">ID:</span> {u.id}
                    </p>
                    <p className="text-xs text-white/60 font-mono">{u.email}</p>
                    {u.phone && <p className="text-xs text-white/50 font-mono">Tel: {u.phone}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      u.role === 'Super Admin' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      u.role === 'Admin' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                      u.role === 'Manager' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      u.role === 'Staff' ? 'bg-yellow-500/10 text-[#20D9A1] border border-yellow-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {u.role}
                    </span>
                    {(u.source === 'local-demo' || !isUUID(u.id)) && (
                      <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Demo
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats / Spending / Rewards section */}
                <div className="grid grid-cols-2 gap-4 mt-4 bg-black/20 rounded-xl p-3 border border-white/5 font-mono text-[11px]">
                  <div>
                    <span className="text-white/40 uppercase text-[8px] tracking-wider block">Boutique Spending</span>
                    <span className="text-white font-bold text-sm">${u.spending?.toLocaleString() || '0'}</span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase text-[8px] tracking-wider block">Rewards Points</span>
                    <span className="text-[#20D9A1] font-bold text-sm">{u.rewardsPoints?.toLocaleString() || '0'} pts</span>
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-[10px] text-white/40 leading-relaxed font-mono space-y-1 mt-4">
                  <span className="text-white font-bold uppercase text-[8px] block tracking-widest text-[#20D9A1]">Active Authorization Scope</span>
                  {u.role === 'Super Admin' && <p>✓ Full system mutations, override settings, hard-deletions, security audit decryption.</p>}
                  {u.role === 'Admin' && <p>✓ Operations override, apparel modification, stock allocations, order dispatches.</p>}
                  {u.role === 'Manager' && <p>✓ Product addition, details modification, dispatch updates.</p>}
                  {u.role === 'Staff' && <p>✓ Courier dispatch tracking, client order notes modification.</p>}
                  {u.role === 'Customer' && <p>✓ Private lounge profile, loyalty rewards tracker, personal trunk checks.</p>}
                </div>
              </div>

              {/* Actions row */}
              {canModifyUsers && (
                <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleOpenUserModal(u)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs uppercase font-mono px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  {currentUser?.id !== u.id && handleOpenResetPasswordModal && (
                    <button
                      onClick={() => handleOpenResetPasswordModal(u)}
                      className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-semibold text-xs uppercase font-mono px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Reset Password
                    </button>
                  )}
                  {/* Prevent deleting oneself */}
                  {currentUser?.id !== u.id && (
                    <button
                      onClick={() => handleOpenDeleteUserModal(u)}
                      className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-xs uppercase font-mono px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
