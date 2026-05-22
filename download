import React from 'react';
import { motion } from 'motion/react';
import { X, ShoppingBag } from 'lucide-react';
import { Order, Product } from '../types';
import toast from 'react-hot-toast';

interface MyOrdersModalProps {
  orders: Order[];
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
}

export default function MyOrdersModal({ orders, onClose, onSelectProduct }: MyOrdersModalProps) {
  const statusColors = {
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    confirmed: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-750 text-red-700 border-red-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        className="relative bg-white rounded-[2.5rem] w-full max-w-2xl p-8 md:p-10 shadow-2xl z-10 max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 uppercase">My Ordered Projects</h3>
            <p className="text-xs text-gray-500 mt-1">Click on any order to view details. Confirmed orders release the lock for downloading the files!</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-grow space-y-4 pr-1">
          {orders.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag size={48} className="mx-auto mb-4 opacity-30 animate-bounce" />
              <p className="font-bold text-gray-950">You have not ordered any websites yet.</p>
              <p className="text-sm mt-1 text-gray-500">Browse our marketplace and make your first secure order!</p>
            </div>
          ) : (
            orders.map(order => (
              <div 
                key={order._id}
                onClick={() => {
                  if (order.productId) {
                    onSelectProduct(order.productId);
                    onClose(); // close order panel to see product detail
                  } else {
                    toast.error("Website details are unavailable");
                  }
                }}
                className="p-5 bg-gray-50 rounded-2xl border border-gray-200 transition-all hover:bg-blue-50/20 hover:border-blue-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200 group-hover:bg-blue-50 transition-colors">
                    <ShoppingBag className="text-blue-600 animate-pulse" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-950 group-hover:text-blue-600 transition-colors uppercase leading-tight">
                      {order.productId?.name || 'Unknown Website'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Ordered on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    {order.selectedGuidePack && (
                      <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded tracking-wider inline-block mt-1">
                        + {order.selectedGuidePack.name} (৳{order.selectedGuidePack.price})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-none pt-3 sm:pt-0 border-gray-200/50">
                  <span className={`px-2.5 py-1 text-[10px] font-black tracking-widest uppercase border rounded-full ${statusColors[order.status] || 'bg-gray-100'}`}>
                    {order.status === 'confirmed' ? '✓ CONFIRMED (UNLOCKED)' : order.status.toUpperCase()}
                  </span>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Total Price</p>
                    <p className="text-lg font-black text-gray-950 font-display">৳{order.amount}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-6 border-t mt-6 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-6 py-3 bg-gray-950 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
