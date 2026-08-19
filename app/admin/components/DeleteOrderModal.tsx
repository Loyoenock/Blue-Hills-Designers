'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Order } from '../../../types';

interface DeleteOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onConfirmDelete: (orderId: string) => Promise<{ success: boolean; error?: string }>;
}

export default function DeleteOrderModal({
  isOpen,
  onClose,
  order,
  onConfirmDelete,
}: DeleteOrderModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const handleDelete = async () => {
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      const res = await onConfirmDelete(order.id);
      if (res && res.success) {
        onClose();
      } else {
        setErrorMessage(res?.error || 'Failed to delete order from ledger.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black z-50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="fixed inset-4 max-w-md mx-auto bg-[#111111] border border-red-500/30 rounded-2xl z-50 overflow-y-auto p-6 space-y-6 shadow-2xl h-fit max-h-[85vh]"
        id="delete-order-confirm-modal"
      >
        <div className="flex justify-between items-start border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-white font-bold">Delete Ledger Record</h3>
              <p className="text-white/40 text-xs mt-0.5">Permanent database removal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-xs text-red-400">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3 font-mono text-xs text-white/80">
          <p className="text-white/70 leading-relaxed font-sans">
            Are you sure you want to permanently delete order{' '}
            <strong className="text-white font-mono">{order.orderNumber || order.id}</strong>?
          </p>

          <div className="bg-black/50 border border-white/10 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between">
              <span className="text-white/40">Client:</span>
              <span className="font-semibold text-white font-sans">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Total Sum:</span>
              <span className="text-[#20D9A1] font-bold">Ugx {order.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Current Status:</span>
              <span className="text-white font-bold">{order.status}</span>
            </div>
          </div>

          <p className="text-red-400/90 text-[11px] leading-normal font-sans">
            ⚠️ Warning: This hard-deletes the order, associated line items, shipping address, and linked payments from Supabase via foreign-key cascade. This action cannot be undone.
          </p>
        </div>

        <div className="pt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-xs font-mono uppercase transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-lg text-xs font-mono uppercase transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </motion.div>
    </>
  );
}
