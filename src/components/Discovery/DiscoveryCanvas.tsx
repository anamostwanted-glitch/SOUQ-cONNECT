import { useState } from "react";
import { Product } from "../../types";
import { ProductCard } from "./ProductCard";
import { ProductDetailSheet } from "./ProductDetailSheet";

const MOCK_PRODUCTS: Product[] = [
  { id: "1", name: "Modern Chair", supplier: "Design Co", category: "Furniture", description: "A sleek, modern chair for your office.", status: "available", imageUrl: "https://picsum.photos/seed/chair/400/600" },
  { id: "2", name: "Smart Watch", supplier: "Tech Inc", category: "Electronics", description: "Stay connected with our latest watch.", status: "available", imageUrl: "https://picsum.photos/seed/watch/400/500" },
  { id: "3", name: "Running Shoes", supplier: "Sporty", category: "Sports", description: "Lightweight shoes for your daily run.", status: "available", imageUrl: "https://picsum.photos/seed/shoes/400/700" },
  { id: "4", name: "Ceramic Vase", supplier: "Artisan", category: "Home", description: "Handcrafted ceramic vase.", status: "available", imageUrl: "https://picsum.photos/seed/vase/400/550" },
  { id: "5", name: "Leather Bag", supplier: "Luxury", category: "Fashion", description: "Premium leather bag.", status: "available", imageUrl: "https://picsum.photos/seed/bag/400/650" },
];

export const DiscoveryCanvas = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Discover</h1>
      <div className="columns-2 gap-4 space-y-4">
        {MOCK_PRODUCTS.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={setSelectedProduct}
          />
        ))}
      </div>
      <ProductDetailSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};
