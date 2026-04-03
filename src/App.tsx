import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { 
  Search, 
  ShoppingBag, 
  User, 
  Heart, 
  Menu, 
  X, 
  ArrowUp, 
  Sparkles,
  Filter,
  LayoutGrid
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
}

// --- Mock Data ---
const PRODUCTS: Product[] = Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  name: [`Elegant Silk Dress`, `Minimalist Watch`, `Leather Tote Bag`, `Velvet Blazer`, `Gold Hoop Earrings`][i % 5],
  price: [299, 150, 450, 320, 85][i % 5],
  category: [`Apparel`, `Accessories`, `Bags`, `Apparel`, `Jewelry`][i % 5],
  image: `https://picsum.photos/seed/${i + 40}/600/800`,
}));

// --- Components ---

const Header = ({ visible }: { visible: boolean }) => (
  <motion.header
    initial={{ y: 0 }}
    animate={{ y: visible ? 0 : -100 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="fixed top-0 left-0 right-0 z-50 h-16 glass flex items-center justify-between px-6"
  >
    <div className="font-display font-semibold text-xl tracking-tight">NEXUS</div>
    <div className="flex items-center gap-4">
      <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
        <Search size={20} strokeWidth={1.5} />
      </button>
      <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
        <Menu size={20} strokeWidth={1.5} />
      </button>
    </div>
  </motion.header>
);

const Footer = ({ visible }: { visible: boolean }) => (
  <motion.footer
    initial={{ y: 0 }}
    animate={{ y: visible ? 0 : 100 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className="fixed bottom-0 left-0 right-0 z-50 h-20 glass flex items-center justify-around px-4 pb-4"
  >
    <button className="flex flex-col items-center gap-1 text-black/40 hover:text-black transition-colors">
      <LayoutGrid size={20} strokeWidth={1.5} />
      <span className="text-[10px] font-medium uppercase tracking-widest">Shop</span>
    </button>
    <button className="flex flex-col items-center gap-1 text-black/40 hover:text-black transition-colors">
      <Heart size={20} strokeWidth={1.5} />
      <span className="text-[10px] font-medium uppercase tracking-widest">Wishlist</span>
    </button>
    <div className="w-12 h-12" /> {/* Space for Orb */}
    <button className="flex flex-col items-center gap-1 text-black/40 hover:text-black transition-colors">
      <ShoppingBag size={20} strokeWidth={1.5} />
      <span className="text-[10px] font-medium uppercase tracking-widest">Cart</span>
    </button>
    <button className="flex flex-col items-center gap-1 text-black/40 hover:text-black transition-colors">
      <User size={20} strokeWidth={1.5} />
      <span className="text-[10px] font-medium uppercase tracking-widest">Profile</span>
    </button>
  </motion.footer>
);

const AINexusOrb = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [orbState, setOrbState] = useState<'default' | 'fast' | 'category'>('default');
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const velocity = Math.abs(latest - lastScrollY.current);
    if (velocity > 50) {
      setOrbState('fast');
    } else {
      setOrbState('default');
    }
    lastScrollY.current = latest;
  });

  const getIcon = () => {
    if (orbState === 'fast') return <ArrowUp size={24} strokeWidth={1.5} />;
    return <Sparkles size={24} strokeWidth={1.5} />;
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: -80 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="absolute left-1/2 -translate-x-1/2 flex flex-col gap-4 items-center"
          >
            {[
              { icon: <Filter size={20} />, label: 'Filter' },
              { icon: <Search size={20} />, label: 'Search' },
              { icon: <Sparkles size={20} />, label: 'AI Suggest' },
            ].map((item, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 glass rounded-full flex items-center justify-center shadow-xl"
              >
                {item.icon}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500",
          isOpen ? "glass-dark text-white" : "glass text-black"
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {isOpen ? <X size={24} strokeWidth={1.5} /> : getIcon()}
        </motion.div>
        
        {/* AI Pulse Effect */}
        {!isOpen && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-black/10"
          />
        )}
      </motion.button>
    </div>
  );
};

const ProductCard = ({ product }: { product: Product }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    className="group relative"
  >
    <div className="aspect-[3/4] overflow-hidden bg-gray-100 rounded-2xl">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        referrerPolicy="no-referrer"
      />
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-2 glass rounded-full">
          <Heart size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
    <div className="mt-4 space-y-1 px-1">
      <h3 className="text-sm font-medium text-black/80">{product.name}</h3>
      <p className="text-xs text-black/40 uppercase tracking-widest">{product.category}</p>
      <p className="text-sm font-semibold">${product.price}</p>
    </div>
  </motion.div>
);

export default function App() {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const direction = latest > lastScrollY.current ? "down" : "up";
    if (latest < 50) {
      setIsNavVisible(true);
    } else if (direction === "down" && isNavVisible) {
      setIsNavVisible(false);
    } else if (direction === "up" && !isNavVisible) {
      setIsNavVisible(true);
    }
    lastScrollY.current = latest;
  });

  return (
    <div className="min-h-screen font-sans selection:bg-black selection:text-white">
      <Header visible={isNavVisible} />
      
      <main className="pt-24 pb-32 px-4 md:px-8 max-w-7xl mx-auto">
        <header className="mb-12">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-6xl font-display font-light tracking-tight mb-4"
          >
            Curated <span className="italic font-normal">Excellence</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-black/50 max-w-md"
          >
            Experience the future of shopping where the interface adapts to your intent.
          </motion.p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
          {PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </main>

      <AINexusOrb />
      <Footer visible={isNavVisible} />

      {/* Luxury Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-100/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100/30 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
