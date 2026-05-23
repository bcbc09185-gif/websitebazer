import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { GuidePack } from '../types';
import toast from 'react-hot-toast';

interface EditGuidePackModalProps {
  pack: GuidePack;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditGuidePackModal({ pack, onClose, onUpdated }: EditGuidePackModalProps) {
  const [name, setName] = useState(pack.name);
  const [price, setPrice] = useState(pack.price.toString());
  const [description, setDescription] = useState(pack.description);
  const [imageUrl, setImageUrl] = useState(pack.images && pack.images[0] ? pack.images[0] : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    if (!price.trim() || isNaN(Number(price))) return toast.error("Price must be a valid number");

    setIsSubmitting(true);
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || "") + `/api/configs/guide-packs/${pack.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price: Number(price),
          description,
          images: imageUrl ? [imageUrl] : []
        })
      });

      if (res.ok) {
        toast.success("Guide pack updated successfully!");
        onUpdated();
        onClose();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.message || "Failed to update guide pack");
      }
    } catch (err) {
      toast.error("Network connection error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        className="relative bg-white rounded-[2rem] w-full max-w-lg p-8 shadow-2xl z-10"
      >
        <div className="flex items-center justify-between border-b pb-4 mb-6">
          <h3 className="text-xl font-bold text-gray-900 uppercase">Edit {pack.key} Package</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider block mb-1">Package Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider block mb-1">Price (৳)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider block mb-1">Image URL</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-gray-400 tracking-wider block mb-1">Pack Features / Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 24/7 Premium Setup, VIP Support, etc..."
              required
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold transition-all text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
