'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, X, AlertCircle } from 'lucide-react';
import { Order, Product } from '../../../types';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialOrder?: Order | null;
  products: Product[];
  onSave: (orderData: any) => Promise<{ success: boolean; error?: string }>;
}

interface LineItemForm {
  productId?: string;
  productName: string;
  price: number;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
  image?: string;
}

export default function OrderFormModal({
  isOpen,
  onClose,
  mode,
  initialOrder,
  products,
  onSave,
}: OrderFormModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [country, setCountry] = useState('Uganda');
  const [district, setDistrict] = useState('Kampala');
  const [city, setCity] = useState('Kampala');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Order['paymentMethod']>('Cash on Delivery');
  const [status, setStatus] = useState<Order['status']>('Pending');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItemForm[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (mode === 'edit' && initialOrder) {
        setCustomerName(initialOrder.customerName || '');
        setCustomerEmail(initialOrder.customerEmail || '');
        setCustomerPhone(initialOrder.customerPhone || '');
        setCountry(initialOrder.shippingAddress?.country || 'Uganda');
        setDistrict(initialOrder.shippingAddress?.district || 'Kampala');
        setCity(initialOrder.shippingAddress?.city || 'Kampala');
        setAddress(initialOrder.shippingAddress?.address || '');
        setPaymentMethod(initialOrder.paymentMethod || 'Cash on Delivery');
        setStatus(initialOrder.status || 'Pending');
        setNotes(initialOrder.notes || '');
        setItems(
          (initialOrder.items || []).map((it) => ({
            productId: it.productId,
            productName: it.productName,
            price: it.price,
            quantity: it.quantity,
            selectedSize: it.selectedSize || 'M',
            selectedColor: it.selectedColor || 'Default',
            image: it.image,
          }))
        );
      } else {
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setCountry('Uganda');
        setDistrict('Kampala');
        setCity('Kampala');
        setAddress('Lubowa Showroom');
        setPaymentMethod('Cash on Delivery');
        setStatus('Pending');
        setNotes('');
        if (products && products.length > 0) {
          const first = products[0];
          setItems([
            {
              productId: first.id,
              productName: first.name,
              price: first.price,
              quantity: 1,
              selectedSize: first.sizes?.[0] || '50R',
              selectedColor: first.colors?.[0] || 'Navy',
              image: first.images?.[0] || 'https://picsum.photos/seed/suit/600/600',
            },
          ]);
        } else {
          setItems([
            {
              productId: undefined,
              productName: 'Bespoke Sartorial Commission',
              price: 350000,
              quantity: 1,
              selectedSize: '50R',
              selectedColor: 'Navy',
            },
          ]);
        }
      }
    }
  }, [isOpen, mode, initialOrder, products]);

  if (!isOpen) return null;

  const totalSum = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);

  const handleAddItem = () => {
    if (products && products.length > 0) {
      const p = products[0];
      setItems([
        ...items,
        {
          productId: p.id,
          productName: p.name,
          price: p.price,
          quantity: 1,
          selectedSize: p.sizes?.[0] || 'M',
          selectedColor: p.colors?.[0] || 'Default',
          image: p.images?.[0],
        },
      ]);
    } else {
      setItems([
        ...items,
        {
          productId: undefined,
          productName: 'Custom Bespoke Item',
          price: 250000,
          quantity: 1,
          selectedSize: 'M',
          selectedColor: 'Default',
        },
      ]);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMessage('Order must have at least one line item.');
      return;
    }
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemProductChange = (index: number, selectedProductId: string) => {
    const selectedProd = products.find((p) => p.id === selectedProductId);
    if (selectedProd) {
      const updated = [...items];
      updated[index] = {
        ...updated[index],
        productId: selectedProd.id,
        productName: selectedProd.name,
        price: selectedProd.price,
        selectedSize: selectedProd.sizes?.[0] || 'M',
        selectedColor: selectedProd.colors?.[0] || 'Default',
        image: selectedProd.images?.[0],
      };
      setItems(updated);
    }
  };

  const handleItemFieldChange = (index: number, field: keyof LineItemForm, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('Client name is required.');
      return;
    }
    if (!customerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setErrorMessage('A valid client email address is required.');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Shipping street address is required.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('At least one order line item is required.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productName.trim()) {
        setErrorMessage(`Item at line ${i + 1} must have a name.`);
        return;
      }
      if (Number(it.price) < 0 || isNaN(Number(it.price))) {
        setErrorMessage(`Item at line ${i + 1} must have a non-negative price.`);
        return;
      }
      if (Number(it.quantity) < 1 || isNaN(Number(it.quantity))) {
        setErrorMessage(`Item at line ${i + 1} must have a quantity of at least 1.`);
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      shippingAddress: {
        country: country.trim(),
        district: district.trim(),
        city: city.trim(),
        address: address.trim(),
      },
      paymentMethod,
      status,
      notes: notes.trim(),
      items: items.map((it) => ({
        productId: it.productId,
        productName: it.productName.trim(),
        price: Number(it.price),
        quantity: Number(it.quantity),
        selectedSize: it.selectedSize.trim() || 'M',
        selectedColor: it.selectedColor.trim() || 'Default',
        image: it.image,
      })),
    };

    try {
      const res = await onSave(payload);
      if (res && res.success) {
        onClose();
      } else {
        setErrorMessage(res?.error || 'Failed to process order request.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while saving the order.');
    } finally {
      setIsSubmitting(false);
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
        className="fixed inset-4 max-w-3xl mx-auto bg-[#111111] border border-white/15 rounded-2xl z-50 overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl h-fit max-h-[90vh]"
        id="order-crud-form-modal"
      >
        <div className="flex justify-between items-center border-b border-white/10 pb-4">
          <div>
            <h3 className="font-serif text-lg text-white font-bold tracking-wide">
              {mode === 'create' ? 'Record New Order Entry' : `Edit Order #${initialOrder?.orderNumber || initialOrder?.id}`}
            </h3>
            <p className="text-white/40 text-xs mt-0.5">
              {mode === 'create'
                ? 'Register a boutique client commission into the BHD Ledger.'
                : 'Modify client contact, line items, shipping address, or order state.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Order Operation Error</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Customer Profile */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#C6A15B] font-semibold">
              1. Client & Contact Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-mono text-white/50 block mb-1">
                  Client Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Lord Alistair Vance"
                  className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white placeholder-white/20 focus:border-[#C6A15B] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-white/50 block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. client@domain.com"
                  className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white placeholder-white/20 focus:border-[#C6A15B] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-white/50 block mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +256 700 000 000"
                  className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white placeholder-white/20 focus:border-[#C6A15B] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Shipping Destination */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#C6A15B] font-semibold">
              2. Shipping Destination
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase font-mono text-white/50 block mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white focus:border-[#C6A15B] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-white/50 block mb-1">
                  District
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white focus:border-[#C6A15B] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-white/50 block mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white focus:border-[#C6A15B] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-mono text-white/50 block mb-1">
                  Street / Showroom Address *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Lubowa Shopping Mall, Unit 4"
                  className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white placeholder-white/20 focus:border-[#C6A15B] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Line Items Editor */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#C6A15B] font-semibold">
                3. Sartorial Commission Items
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1 rounded text-xs text-[#20D9A1] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-black/30 border border-white/10 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
                  <div className="sm:col-span-4">
                    <label className="text-[9px] uppercase font-mono text-white/40 block mb-0.5">
                      Item / Preset
                    </label>
                    <select
                      value={item.productId || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleItemProductChange(idx, e.target.value);
                        } else {
                          handleItemFieldChange(idx, 'productId', undefined);
                        }
                      }}
                      className="w-full bg-black/60 border border-white/10 rounded text-[11px] py-1.5 px-2 text-white focus:outline-none focus:border-[#C6A15B]"
                    >
                      <option value="">Custom Item...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Ugx {p.price})
                        </option>
                      ))}
                    </select>
                    {!item.productId && (
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleItemFieldChange(idx, 'productName', e.target.value)}
                        placeholder="Custom item title"
                        className="w-full bg-black/60 border border-white/10 rounded text-[11px] py-1 px-2 text-white mt-1"
                      />
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] uppercase font-mono text-white/40 block mb-0.5">
                      Size
                    </label>
                    <input
                      type="text"
                      value={item.selectedSize}
                      onChange={(e) => handleItemFieldChange(idx, 'selectedSize', e.target.value)}
                      placeholder="e.g. 50R / M"
                      className="w-full bg-black/60 border border-white/10 rounded text-[11px] py-1.5 px-2 text-white focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] uppercase font-mono text-white/40 block mb-0.5">
                      Color
                    </label>
                    <input
                      type="text"
                      value={item.selectedColor}
                      onChange={(e) => handleItemFieldChange(idx, 'selectedColor', e.target.value)}
                      placeholder="e.g. Navy"
                      className="w-full bg-black/60 border border-white/10 rounded text-[11px] py-1.5 px-2 text-white focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] uppercase font-mono text-white/40 block mb-0.5">
                      Price (Ugx)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(e) => handleItemFieldChange(idx, 'price', Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded text-[11px] py-1.5 px-2 text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[9px] uppercase font-mono text-white/40 block mb-0.5">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemFieldChange(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                      className="w-full bg-black/60 border border-white/10 rounded text-[11px] py-1.5 px-2 text-white font-mono focus:outline-none text-center"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1.5 text-white/40 hover:text-red-400 disabled:opacity-20 transition-colors cursor-pointer"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs font-mono">
              <span className="text-white/60">Derived Total Ledger Sum:</span>
              <span className="font-bold text-[#20D9A1] text-sm">Ugx {totalSum.toLocaleString()}</span>
            </div>
          </div>

          {/* Section 4: Settlement & Status */}
          <div className="space-y-3">
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-[#C6A15B] font-semibold">
              4. Payment & Dispatch Controls
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-mono text-white/50 block mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as Order['paymentMethod'])}
                  className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white focus:outline-none focus:border-[#C6A15B]"
                >
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Visa">Visa / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono text-white/50 block mb-1">
                  Dispatch Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Order['status'])}
                  className="w-full bg-black/40 border border-white/10 rounded-lg text-xs py-2 px-3 text-white focus:outline-none focus:border-[#C6A15B]"
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-white/50 block mb-1">
                Order Notes / Special Fitting Instructions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Include luxury garment bag, deliver by Friday afternoon."
                rows={2}
                className="w-full bg-black/40 border border-white/10 rounded-lg text-xs p-3 text-white placeholder-white/20 focus:border-[#C6A15B] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-xs font-mono uppercase transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#C6A15B] hover:bg-[#b08e4d] text-black font-bold px-6 py-2 rounded-lg text-xs font-mono uppercase transition-all shadow-lg cursor-pointer disabled:opacity-50"
            >
              {isSubmitting
                ? 'Processing...'
                : mode === 'create'
                ? 'Record Order'
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
