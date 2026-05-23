import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  CheckCircle, 
  Download, 
  ChevronRight, 
  ShoppingBag,
  Info
} from 'lucide-react';
import { Product, PaymentConfig, GuidePack } from '../types';
import toast from 'react-hot-toast';

interface CheckoutModalProps {
  product: Product;
  userEmail: string;
  onClose: () => void;
  onOrderSuccess: () => void;
}

export default function CheckoutModal({ product, userEmail, onClose, onOrderSuccess }: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState(userEmail || '');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('nagad');
  const [senderPhone, setSenderPhone] = useState('');
  const [transactionId, setTransactionId] = useState('');
  
  const [guidePacks, setGuidePacks] = useState<GuidePack[]>([]);
  const [selectedPack, setSelectedPack] = useState<GuidePack | null>(null);
  const [viewPackDetails, setViewPackDetails] = useState<GuidePack | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        const [payRes, packRes] = await Promise.all([
          fetch((import.meta.env.VITE_API_URL || '') + '/api/configs/payments'),
          fetch((import.meta.env.VITE_API_URL || '') + '/api/configs/guide-packs')
        ]);
        if (payRes.ok) {
          const pays = await payRes.json();
          setPaymentConfigs(pays);
          // Set primary isEnabled method if nagad isn't active
          const activeNagad = pays.find((p: any) => p.method === 'nagad' && p.isEnabled);
          if (!activeNagad) {
            const firstActive = pays.find((p: any) => p.isEnabled);
            if (firstActive) setSelectedMethod(firstActive.method);
          }
        }
        if (packRes.ok) {
          const packs = await packRes.json();
          setGuidePacks(packs);
        }
      } catch (err) {
        console.error("Error loading checkout configs:", err);
      }
    };
    loadConfigs();
  }, []);

  const activeMethodConfig = paymentConfigs.find(p => p.method === selectedMethod);
  const finalPrice = product.price + (selectedPack?.price || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail) {
      toast.error("Please fill Name and Email fields!");
      return;
    }
    if (selectedMethod === 'nagad' && (!senderPhone || !transactionId)) {
      toast.error("Please fill sender phone and transaction ID!");
      return;
    }

    setLoading(true);
    try {
      const orderBody = {
        productId: product._id,
        userEmail: userEmail,
        amount: finalPrice,
        customerName,
        customerEmail,
        customerWhatsapp,
        paymentMethod: selectedMethod,
        transactionId,
        senderPhone,
        selectedGuidePack: selectedPack ? {
          key: selectedPack.key,
          name: selectedPack.name,
          price: selectedPack.price,
          description: selectedPack.description
        } : undefined
      };

      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderBody)
      });

      if (res.ok) {
        toast.success("Order Placed Successfully! Access details inside User Account.");
        onOrderSuccess();
        onClose();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to submit order");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-md" />
      
      <motion.div 
        initial={{ scale: 0.95, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 30, opacity: 0 }}
        className="relative bg-white rounded-[3rem] w-full max-w-6xl overflow-hidden shadow-2xl z-10 flex flex-col lg:flex-row max-h-[90vh]"
      >
        {/* Left Column: Form Info */}
        <div className="flex-1 p-6 md:p-12 overflow-y-auto space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.25em] bg-blue-50 px-3 py-1.5 rounded-full inline-block mb-3">Secure Checkout</span>
              <h3 className="text-3xl font-bold text-gray-900">Configure & Buy Now</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full lg:hidden text-gray-400">
              <X size={20} />
            </button>
          </div>

          {/* Product Box */}
          <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-gray-400 font-bold tracking-wider">Product Selection</p>
              <h4 className="font-bold text-xl text-gray-900 truncate max-w-xs">{product.name}</h4>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-gray-400 font-bold tracking-wider">Price</p>
              <p className="text-2xl font-display font-black text-blue-600">৳{product.price}</p>
            </div>
          </div>

          {/* IMPORTANT ENGLISH NOTICE exactly as requested */}
          <div className="p-6 bg-gradient-to-r from-blue-650 to-indigo-600 rounded-3xl text-white shadow-xl relative overflow-hidden bg-blue-600">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Clock size={120} />
            </div>
            <h5 className="font-black uppercase tracking-wider text-[11px] text-blue-200 mb-2">⏱️ Priority Delivery Notice</h5>
            <p className="text-lg md:text-xl font-medium leading-relaxed font-sans">
              "Within 24 hours your website code lock will be unlocked and a message will be sent to your Gmail."
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 text-lg">1. Buyer Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase">Your Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    value={customerName} 
                    onChange={e => setCustomerName(e.target.value)} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter full name"
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase">Gmail Address <span className="text-red-500">*</span></label>
                  <input 
                    type="email" 
                    value={customerEmail} 
                    onChange={e => setCustomerEmail(e.target.value)} 
                    className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter Gmail/Email"
                    required 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-400 uppercase">WhatsApp Number (Optional)</label>
                <input 
                  type="text" 
                  value={customerWhatsapp} 
                  onChange={e => setCustomerWhatsapp(e.target.value)} 
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 017XXXXXX (WhatsApp)"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-4">
              <h4 className="font-bold text-gray-900 text-lg">2. Choose Payment Method</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { method: 'nagad', label: 'Nagad', icon: '🇧🇩' },
                  { method: 'bkash', label: 'bKash', icon: '🇧🇩' },
                  { method: 'rocket', label: 'Rocket', icon: '🚀' },
                  { method: 'upay', label: 'Upay', icon: '📱' },
                  { method: 'bank', label: 'Bank', icon: '🏦' },
                  { method: 'card', label: 'Card', icon: '💳' },
                ].map(item => {
                  const methodConfig = paymentConfigs.find(c => c.method === item.method);
                  const isEnabled = methodConfig?.isEnabled ?? false;
                  const isSelected = selectedMethod === item.method;
                  
                  return (
                    <button
                      key={item.method}
                      type="button"
                      disabled={!isEnabled}
                      onClick={() => isEnabled && setSelectedMethod(item.method)}
                      className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center relative ${
                        !isEnabled ? 'opacity-40 bg-gray-50 border-gray-100 cursor-not-allowed text-gray-400' :
                        isSelected ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm font-bold' :
                        'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <span className="text-xl mb-1">{item.icon}</span>
                      <span className="text-sm block">{item.label}</span>
                      {!isEnabled && (
                        <span className="absolute top-1 right-1 text-[8px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded uppercase font-black tracking-tight scale-75">OFF</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Transaction block for NAGAD */}
              {selectedMethod === 'nagad' && (
                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 space-y-4 animate-fadeIn">
                  <div>
                    <p className="text-sm text-amber-900 font-semibold">
                      📢 Nagad Payment Instructions (Send Money):
                    </p>
                    <p className="text-base text-amber-950 mt-1">
                      First send money to our Nagad number <strong className="text-amber-800 text-xl font-black">01339885689</strong>. Then provide your sender number and transaction ID below.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-amber-700 uppercase"> Sender Mobile Number (Number from which you paid) <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={senderPhone} 
                        onChange={e => setSenderPhone(e.target.value)} 
                        className="w-full p-3 bg-white border border-amber-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        placeholder="e.g. 013XXXXXXXX"
                        required={selectedMethod === 'nagad'}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-amber-700 uppercase">Transaction ID <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={transactionId} 
                        onChange={e => setTransactionId(e.target.value)} 
                        className="w-full p-3 bg-white border border-amber-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        placeholder="e.g. 9X48JH67L"
                        required={selectedMethod === 'nagad'}
                      />
                    </div>
                  </div>
                </div>
              )}
              {selectedMethod !== 'nagad' && activeMethodConfig && (
                <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200">
                  <p className="text-sm font-bold text-blue-900 uppercase tracking-tight">Instructions for {activeMethodConfig.label}:</p>
                  <p className="text-base text-blue-950 mt-2 font-mono whitespace-pre-wrap">{activeMethodConfig.details || "Send money to configured merchant details."}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-blue-700 uppercase"> Sender Phone / AC </label>
                      <input 
                        type="text" 
                        value={senderPhone} 
                        onChange={e => setSenderPhone(e.target.value)} 
                        className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Sender number"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-blue-700 uppercase">Transaction ID</label>
                      <input 
                        type="text" 
                        value={transactionId} 
                        onChange={e => setTransactionId(e.target.value)} 
                        className="w-full p-3 bg-white border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Transaction reference"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-6">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold transition-all"
              >
                Close
              </button>
              <button 
                type="submit" 
                className="flex-1 py-4 bg-gray-950 hover:bg-slate-900 text-white font-black text-base shadow-xl rounded-xl transition-all" 
                disabled={loading}
              >
                {loading ? "Processing Order..." : `Confirm Order (Total: ৳${finalPrice})`}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Guide Pack Selection with visual pop details */}
        <div className="w-full lg:w-[400px] bg-slate-50 border-l border-gray-100 p-8 md:p-12 overflow-y-auto space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Enhance setup</p>
                <h4 className="text-2xl font-bold text-gray-900">Guide Packs</h4>
                <p className="text-xs text-gray-500 mt-1">Select one guide package for expert developer setup assistance. Click on a pack to see descriptions & screenshots.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full hidden lg:block text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {guidePacks.map(pack => {
                const isSelected = selectedPack?.key === pack.key;
                return (
                  <div 
                    key={pack.key}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected ? 'bg-indigo-50/50 border-indigo-600 text-indigo-950 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setViewPackDetails(pack)}
                  >
                    <div className="flex items-start justify-between min-w-0">
                      <div className="min-w-0 flex-grow pr-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {pack.key} Plan
                        </span>
                        <h5 className="font-bold text-base text-gray-900 mt-1.5 truncate">{pack.name}</h5>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed italic">"{pack.description}"</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-display font-black text-lg text-gray-900">৳{pack.price}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4 border-t border-gray-100/60 pt-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isSelected) setSelectedPack(null);
                          else setSelectedPack(pack);
                        }}
                        className={`text-xs px-3 py-1.5 font-bold rounded-xl flex-grow text-center transition-all ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-105 bg-gray-100 text-gray-75 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected ? '✓ Selected Pack' : '+ Select Pack'}
                      </button>
                      <button
                        type="button"
                        className="text-xs px-3 py-1.5 text-indigo-600 hover:bg-blue-50 hover:text-indigo-800 rounded-xl"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h5 className="text-xs uppercase font-black text-gray-400 tracking-wider mb-2">Order Price Details</h5>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500">Website Price:</span>
              <span className="font-semibold text-gray-900">৳{product.price}</span>
            </div>
            {selectedPack && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500">Guide Plan ({selectedPack.name}):</span>
                <span className="font-semibold text-indigo-600">+৳{selectedPack.price}</span>
              </div>
            )}
            <div className="flex justify-between text-lg py-2 border-t border-gray-200/80 mt-2 font-bold text-gray-950">
              <span>Total Amount:</span>
              <span className="text-blue-600 text-xl font-display font-black">৳{finalPrice}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Guide Pack Internal Info Pop Over Dialog details exactly as requested */}
      <AnimatePresence>
        {viewPackDetails && (
          <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewPackDetails(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 relative z-[20010] shadow-2xl space-y-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] bg-indigo-50 px-2 py-1 rounded">
                    pack specification
                  </span>
                  <h4 className="text-2xl font-bold text-gray-900 mt-2">{viewPackDetails.name}</h4>
                  <p className="text-3xl font-black text-blue-600 font-display mt-1">৳{viewPackDetails.price}</p>
                </div>
                <button onClick={() => setViewPackDetails(null)} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
                  <X size={20} />
                </button>
              </div>

              {viewPackDetails.images && viewPackDetails.images[0] && (
                <img src={viewPackDetails.images[0]} alt={viewPackDetails.name} className="w-full h-48 object-cover rounded-2xl shadow-sm" />
              )}

              <div className="space-y-4">
                <p className="text-xs font-bold uppercase text-gray-400">Details & Inclusions</p>
                <p className="text-sm text-gray-600 leading-relaxed italic">
                  "{viewPackDetails.description}"
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  variant="outline" 
                  className="flex-grow py-3 px-4 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl"
                  onClick={() => setViewPackDetails(null)}
                >
                  Close Details
                </button>
                <button 
                  className={`flex-grow py-3 px-4 text-sm font-bold rounded-xl text-white ${selectedPack?.key === viewPackDetails.key ? 'bg-red-650 bg-red-650 bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  onClick={() => {
                    if (selectedPack?.key === viewPackDetails.key) {
                      setSelectedPack(null);
                    } else {
                      setSelectedPack(viewPackDetails);
                    }
                    setViewPackDetails(null);
                  }}
                >
                  {selectedPack?.key === viewPackDetails.key ? 'Deselect Pack' : 'Select Pack & Add to Order'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
