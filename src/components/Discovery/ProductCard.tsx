import { motion } from "motion/react";
import { Product } from "../../types";
import { OptimizedImage } from "../../shared/components/OptimizedImage";

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
}

export const ProductCard = ({ product, onClick }: ProductCardProps) => {
  return (
    <motion.div
      layoutId={`product-${product.id}`}
      onClick={() => onClick(product)}
      className="relative overflow-hidden rounded-2xl cursor-pointer bg-gray-100 aspect-[3/4]"
      whileHover={{ scale: 0.98 }}
      whileTap={{ scale: 0.95 }}
    >
      <OptimizedImage
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-full object-cover"
        aspectRatio="3/4"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
    </motion.div>
  );
};
