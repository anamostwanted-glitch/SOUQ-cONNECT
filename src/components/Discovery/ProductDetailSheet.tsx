import { motion, AnimatePresence } from "motion/react";
import { Product } from "../../types";
import { X, Heart, Share2 } from "lucide-react";

interface ProductDetailSheetProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailSheet = ({ product, onClose }: ProductDetailSheetProps) => {
  if (!product) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 h-[80vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col gap-4">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-64 object-cover rounded-2xl"
            referrerPolicy="no-referrer"
          />
          <h2 className="text-2xl font-bold">{product.name}</h2>
          <p className="text-gray-600">{product.description}</p>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">{product.category}</span>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">{product.supplier}</span>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-4">
              <button className="p-2 rounded-full hover:bg-gray-100"><Heart /></button>
              <button className="p-2 rounded-full hover:bg-gray-100"><Share2 /></button>
            </div>
            <button className="px-6 py-2 bg-black text-white rounded-full font-medium">
              Contact Supplier
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
