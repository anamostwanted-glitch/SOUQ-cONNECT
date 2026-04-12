import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import { SliderSettings, SliderItem } from '../../../core/types';

export const NeuralFluidSlider: React.FC = () => {
  const [settings, setSettings] = useState<SliderSettings | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'slider_config'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as SliderSettings);
      }
    });
    return () => unsub();
  }, []);

  const [preferredItems, setPreferredItems] = useState<string[]>([]);

  const handleItemClick = (item: SliderItem) => {
    // تتبع التفاعل
    setPreferredItems(prev => [...new Set([item.id, ...prev])].slice(0, 5));
    // هنا يمكن إضافة منطق الانتقال للمنتج أو المورد
    console.log('User interacted with:', item.id);
  };

  useEffect(() => {
    if (!settings || settings.items.length === 0) return;
    
    // التحميل الاستباقي الذكي: تحميل الصورة التالية + الصور المفضلة
    const nextIndex = (currentIndex + 1) % settings.items.length;
    const preloadQueue = [settings.items[nextIndex], ...settings.items.filter(i => preferredItems.includes(i.id))];
    
    preloadQueue.forEach(item => {
      const img = new Image();
      img.src = item.imageUrl;
    });
  }, [currentIndex, settings, preferredItems]);

  useEffect(() => {
    if (!settings || settings.items.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % settings.items.length);
    }, settings.globalSettings.speed || 5000);
    return () => clearInterval(interval);
  }, [settings]);

  if (!settings || settings.items.length === 0) return null;

  const item = settings.items[currentIndex];

  return (
    <div className="relative overflow-hidden rounded-3xl" style={{ width: settings.globalSettings.width, height: settings.globalSettings.height }}>
      <AnimatePresence mode="wait">
        <motion.img
          key={item.id}
          src={item.imageUrl}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => handleItemClick(item)}
        />
      </AnimatePresence>
      <div className="absolute bottom-4 left-4">
        <button 
          className="px-4 py-2 rounded-full text-white font-bold"
          style={{ backgroundColor: item.ctaColor || '#000' }}
        >
          {item.ctaText || 'تسوق الآن'}
        </button>
      </div>
    </div>
  );
};
