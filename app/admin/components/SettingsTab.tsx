'use client';

import { motion } from 'motion/react';
import { Calendar, DollarSign, Compass, CheckCircle, Plus } from 'lucide-react';

interface SettingsTabProps {
  canSeeSettings: boolean;
  settingsSuccess: boolean;
  handleSaveSettings: (e: React.FormEvent) => void;
  sHours: string;
  setSHours: (s: string) => void;
  sPhone: string;
  setSPhone: (s: string) => void;
  sCurrency: string;
  setSCurrency: (s: string) => void;
  sTaxRate: number;
  setSTaxRate: (n: number) => void;
  sThreshold: number;
  setSThreshold: (n: number) => void;
  sGreeting: string;
  setSGreet: (s: string) => void;
  sSecretOffer: boolean;
  setSSecretOffer: (b: boolean) => void;
  sBanner: boolean;
  setSBanner: (b: boolean) => void;
  sMaintenance: boolean;
  setSMaintenance: (b: boolean) => void;
  sPayMomo: boolean;
  setSPayMomo: (b: boolean) => void;
  sPayVisa: boolean;
  setSPayVisa: (b: boolean) => void;
  sPayCod: boolean;
  setSPayCod: (b: boolean) => void;
  settings: any;
}

export default function SettingsTab({
  canSeeSettings,
  settingsSuccess,
  handleSaveSettings,
  sHours,
  setSHours,
  sPhone,
  setSPhone,
  sCurrency,
  setSCurrency,
  sTaxRate,
  setSTaxRate,
  sThreshold,
  setSThreshold,
  sGreeting,
  setSGreet,
  sSecretOffer,
  setSSecretOffer,
  sBanner,
  setSBanner,
  sMaintenance,
  setSMaintenance,
  sPayMomo,
  setSPayMomo,
  sPayVisa,
  setSPayVisa,
  sPayCod,
  setSPayCod,
  settings,
}: SettingsTabProps) {
  if (!canSeeSettings) return null;

  return (
    <motion.div 
      key="settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-5">
        <div>
          <h3 className="font-serif text-xl text-white font-bold">Boutique Configuration Panel</h3>
          <p className="text-white/40 text-xs font-light">Fine-tune operating thresholds, premium showroom listings, and concierge parameters.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#20D9A1] font-mono uppercase tracking-widest font-bold">● System Parameters Live</span>
        </div>
      </div>

      {settingsSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs flex items-center gap-3"
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Boutique configuration parameters successfully persisted and written to logs.</span>
        </motion.div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SECTION 1: SHOWROOM DETAILS */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
              <Calendar className="w-4 h-4 text-white/40" />
              <h4 className="text-xs font-mono font-bold tracking-wider text-white/80 uppercase">Showroom & Support</h4>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Operating Showroom Hours</label>
                <input 
                  type="text" 
                  value={sHours}
                  onChange={(e) => setSHours(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none"
                  placeholder="e.g. Sunday to Friday: 9:00 AM - 7:00 PM"
                  required
                />
                <p className="text-[9px] text-white/30">Display schedule shown to customers when reserving appointments.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Boutique Concierge Phone</label>
                <input 
                  type="text" 
                  value={sPhone}
                  onChange={(e) => setSPhone(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none"
                  placeholder="e.g. +256 772 123456"
                  required
                />
                <p className="text-[9px] text-white/30">Primary hotline listed on order confirmations and checkout supports.</p>
              </div>
            </div>
          </div>

          {/* SECTION 2: LOGISTICS & FINANCIALS */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
              <DollarSign className="w-4 h-4 text-white/40" />
              <h4 className="text-xs font-mono font-bold tracking-wider text-white/80 uppercase">Logistics & Financials</h4>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Currency Code</label>
                  <input 
                    type="text" 
                    value={sCurrency}
                    onChange={(e) => setSCurrency(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none font-mono"
                    placeholder="Ugx"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Luxury/VAT Rate (%)</label>
                  <input 
                    type="number" 
                    value={sTaxRate}
                    onChange={(e) => setSTaxRate(Number(e.target.value))}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none font-mono"
                    placeholder="18"
                    min="0"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Free Shipping Threshold</label>
                <input 
                  type="number" 
                  value={sThreshold}
                  onChange={(e) => setSThreshold(Number(e.target.value))}
                  className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none font-mono"
                  placeholder="2000"
                  min="0"
                  required
                />
                <p className="text-[9px] text-white/30">Free delivery is auto-applied to executive invoices above this value.</p>
              </div>
            </div>
          </div>

          {/* SECTION 3: INTERACTIVE AI EXPERIENCE */}
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 space-y-4 shadow-lg md:col-span-2">
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3">
              <Compass className="w-4 h-4 text-white/40" />
              <h4 className="text-xs font-mono font-bold tracking-wider text-white/80 uppercase">AI Stylist & Interactive Controls</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase tracking-wider font-mono">AI Stylist Greeting Prefix</label>
                  <textarea 
                    value={sGreeting}
                    onChange={(e) => setSGreet(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#5F39FF] outline-none min-h-[80px]"
                    placeholder="Welcome, elegant guest."
                    required
                  />
                  <p className="text-[9px] text-white/30">The initial opening statement when clients seek virtual tailoring consulting.</p>
                </div>
              </div>

              <div className="space-y-4 flex flex-col justify-center">
                {/* TOGGLE: SECRET OFFER */}
                <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                  <div>
                    <span className="text-xs font-semibold text-white block">Secret Offer Section</span>
                    <span className="text-[9px] text-white/40">Display Deal-of-the-Day countdown section on homepage.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSSecretOffer(!sSecretOffer)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sSecretOffer ? 'bg-[#20D9A1]' : 'bg-white/10'}`}
                  >
                    <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sSecretOffer ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* TOGGLE: BANNER */}
                <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                  <div>
                    <span className="text-xs font-semibold text-white block">Exclusive Banner Broadcast</span>
                    <span className="text-[9px] text-white/40">Enable custom collection announcement ribbon at footer/header.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSBanner(!sBanner)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sBanner ? 'bg-[#20D9A1]' : 'bg-white/10'}`}
                  >
                    <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sBanner ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* TOGGLE: MAINTENANCE */}
                <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                  <div>
                    <span className="text-xs font-semibold text-red-400 block">Boutique Maintenance Overrides</span>
                    <span className="text-[9px] text-white/40">Place storefront in read-only reservation-locked mode.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSMaintenance(!sMaintenance)}
                    className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sMaintenance ? 'bg-red-500' : 'bg-white/10'}`}
                  >
                    <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sMaintenance ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* PAYMENT METHODS GROUP */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <span className="text-[10px] text-white/50 uppercase tracking-wider font-mono block">Accepted Payment Methods</span>
                  
                  {/* TOGGLE: MOBILE MONEY */}
                  <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-white block">Mobile Money</span>
                      <span className="text-[9px] text-white/40">Allow MTN & Airtel Mobile Money checkout.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSPayMomo(!sPayMomo)}
                      className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sPayMomo ? 'bg-[#20D9A1]' : 'bg-white/10'}`}
                    >
                      <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sPayMomo ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* TOGGLE: VISA */}
                  <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-white block">Visa & Credit Card</span>
                      <span className="text-[9px] text-white/40">Allow Visa and card payments at checkout.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSPayVisa(!sPayVisa)}
                      className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sPayVisa ? 'bg-[#20D9A1]' : 'bg-white/10'}`}
                    >
                      <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sPayVisa ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* TOGGLE: CASH ON DELIVERY */}
                  <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                    <div>
                      <span className="text-xs font-semibold text-white block">Cash on Delivery</span>
                      <span className="text-[9px] text-white/40">Allow cash payment on concierge delivery.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSPayCod(!sPayCod)}
                      className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 outline-none ${sPayCod ? 'bg-[#20D9A1]' : 'bg-white/10'}`}
                    >
                      <div className={`bg-black w-4 h-4 rounded-full transition-transform duration-200 ${sPayCod ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={() => {
              // Reset local states from store settings
              if (settings) {
                setSHours(settings.showroomHours || '');
                setSPhone(settings.conciergePhone || settings.supportPhone || '');
                setSThreshold(settings.freeShippingThreshold || 0);
                setSTaxRate(settings.taxRate || 0);
                setSGreet(settings.aiGreetingPrefix || '');
                setSBanner(settings.enableNewsBanner !== false);
                setSMaintenance(!!settings.maintenanceMode);
                setSCurrency(settings.currencySymbol || 'Ugx');
                setSSecretOffer(settings.enableSecretOffer !== false);
                setSPayMomo(settings.paymentMethods?.mobileMoney !== false);
                setSPayVisa(settings.paymentMethods?.visa !== false);
                setSPayCod(settings.paymentMethods?.cashOnDelivery !== false);
              }
            }}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs text-white/80 font-medium transition-colors"
          >
            Reset Configuration
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#5F39FF] hover:bg-[#4a26e0] active:scale-98 rounded-xl text-xs text-white font-bold transition-all shadow-md shadow-[#5F39FF]/10 flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            Save Configuration
          </button>
        </div>
      </form>
    </motion.div>
  );
}
