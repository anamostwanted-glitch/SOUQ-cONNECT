export interface Product {
  id: string;
  name: string;
  supplier: string;
  category: string;
  description: string;
  status: 'available' | 'out_of_stock' | 'pending';
  imageUrl: string;
  price?: number; // Kept for logic, but hidden in UI
}
