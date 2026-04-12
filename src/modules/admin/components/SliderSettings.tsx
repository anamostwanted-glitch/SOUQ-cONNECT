import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, storage } from '../../../core/firebase';
import { SliderSettings, SliderItem } from '../../../core/types';
import { toast } from 'sonner';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { analyzeSliderImageForFocus, generateSliderMetadata } from '../../../core/services/geminiService';
import { cropImageToFocus, compressImage } from '../../../core/utils/imageCropper';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Image as ImageIcon, Trash2, Save, Link as LinkIcon, Type, Palette, Loader2, Settings2 } from 'lucide-react';

export const SliderSettingsAdmin: React.FC = () => {
  const [settings, setSettings] = useState<SliderSettings | null>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'slider_config'));
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SliderSettings);
      } else {
        setSettings({
          items: [],
          globalSettings: { speed: 5000, transition: 'fade', width: '100%', height: '400px' }
        });
      }
    };
    fetchSettings();
  }, []);

  // Live Preview Auto-Play
  useEffect(() => {
    if (!settings || settings.items.length === 0) return;
    const interval = setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % settings.items.length);
    }, settings.globalSettings.speed || 5000);
    return () => clearInterval(interval);
  }, [settings]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, useAi: boolean) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    setIsUploading(true);
    toast.info(useAi ? 'جاري المعالجة العصبية للصورة...' : 'جاري الرفع المباشر...');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        let finalBlob: Blob = file;

        if (useAi) {
          const compressedBase64 = await compressImage(base64, 800);
          const focus = await analyzeSliderImageForFocus(compressedBase64, file.type || 'image/jpeg');
          const croppedBase64 = await cropImageToFocus(base64, focus, 16/9);
          const response = await fetch(croppedBase64);
          finalBlob = await response.blob();
        }
        
        const storageRef = ref(storage, `slider/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, finalBlob);
        const url = await getDownloadURL(storageRef);
        
        const newItem: SliderItem = { 
          id: Date.now().toString(), 
          imageUrl: url, 
          targetType: 'custom_url',
          ctaText: 'تسوق الآن',
          ctaColor: '#000000'
        };

        const newSettings = { ...settings, items: [newItem, ...settings.items] };
        setSettings(newSettings);
        await setDoc(doc(db, 'settings', 'slider_config'), newSettings);
        toast.success('تمت إضافة الشريحة بنجاح');
        setIsUploading(false);
        
        if (aiFileInputRef.current) aiFileInputRef.current.value = '';
        if (directFileInputRef.current) directFileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('حدث خطأ أثناء معالجة الصورة');
      setIsUploading(false);
    }
  };

  const handleGenerateMetadata = async (item: SliderItem) => {
    setGeneratingId(item.id);
    try {
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const compressed = await compressImage(base64, 800);
        const metadata = await generateSliderMetadata(compressed, blob.type || 'image/jpeg');
        updateItem(item.id, { ctaText: metadata.ctaText, ctaColor: metadata.ctaColor });
        setGeneratingId(null);
        toast.success('تم استخراج الألوان والنصوص بذكاء!');
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      toast.error('فشل التوليد الذكي');
      setGeneratingId(null);
    }
  };

  const updateItem = (id: string, updates: Partial<SliderItem>) => {
    setSettings(prev => prev ? {
      ...prev,
      items: prev.items.map(item => item.id === id ? { ...item, ...updates } : item)
    } : null);
  };

  const handleDelete = (id: string) => {
    setSettings(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== id) } : null);
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      await setDoc(doc(db, 'settings', 'slider_config'), { ...settings });
      toast.success('تم حفظ جميع التغييرات بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ');
    }
  };

  if (!settings) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-primary" size={40} /></div>;

  return (
    <div className="min-h-screen bg-brand-background pb-32 font-sans relative" dir="rtl">
      
      {/* 1. Live Preview Section */}
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-black text-brand-text-main flex items-center gap-3">
              <Sparkles className="text-brand-primary" size={32} />
              استوديو السلايدر العصبي
            </h2>
            <p className="text-brand-text-muted mt-2">إدارة ذكية، معاينة حية، وتجربة مستخدم فخمة.</p>
          </div>
        </div>

        {/* Live Preview Monitor */}
        <div className="w-full aspect-[16/9] md:aspect-[21/9] rounded-[2rem] overflow-hidden relative shadow-2xl border border-white/10 bg-black/5">
          {settings.items.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={previewIndex}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <img src={settings.items[previewIndex]?.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                <div className="absolute bottom-6 left-6 md:bottom-12 md:left-12">
                  <button 
                    className="px-6 py-3 rounded-2xl text-white font-bold shadow-2xl backdrop-blur-md border border-white/20 transition-transform hover:scale-105"
                    style={{ backgroundColor: settings.items[previewIndex]?.ctaColor || '#000' }}
                  >
                    {settings.items[previewIndex]?.ctaText || 'تسوق الآن'}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-brand-text-muted flex-col gap-4">
              <ImageIcon size={48} className="opacity-20" />
              <p>السلايدر فارغ. قم بإضافة صور لتبدأ المعاينة.</p>
            </div>
          )}
        </div>

        {/* Upload Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <input type="file" ref={aiFileInputRef} onChange={(e) => handleImageUpload(e, true)} className="hidden" accept="image/*" />
          <input type="file" ref={directFileInputRef} onChange={(e) => handleImageUpload(e, false)} className="hidden" accept="image/*" />
          
          <button 
            onClick={() => aiFileInputRef.current?.click()} 
            disabled={isUploading}
            className="flex-1 bg-gradient-to-r from-brand-primary to-brand-secondary text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-brand-primary/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            إضافة صورة (قص ذكي)
          </button>
          
          <button 
            onClick={() => directFileInputRef.current?.click()} 
            disabled={isUploading}
            className="flex-1 bg-brand-surface border border-brand-border text-brand-text-main py-4 rounded-2xl font-bold text-lg shadow-sm hover:bg-brand-background transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <ImageIcon />
            رفع مباشر (بدون تعديل)
          </button>
        </div>
      </div>

      {/* 2. Swipeable Deck (Cards) */}
      <div className="pl-4 md:pl-8 pb-8">
        <h3 className="text-xl font-bold text-brand-text-main mb-6 px-4 md:px-0">شرائح السلايدر ({settings.items.length})</h3>
        <div className="flex overflow-x-auto gap-6 snap-x snap-mandatory pb-8 pt-4 px-4 md:px-0 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {settings.items.map((item, index) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="min-w-[90vw] md:min-w-[400px] snap-center bg-brand-surface rounded-[2rem] p-5 border border-brand-border shadow-xl relative group"
            >
              {/* Card Header (Image + Delete) */}
              <div className="relative aspect-video rounded-xl overflow-hidden mb-5 border border-brand-border/50">
                <img src={item.imageUrl} className="w-full h-full object-cover" alt={`Slide ${index}`} />
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-3 right-3 bg-red-500/90 text-white p-2 rounded-xl backdrop-blur-md hover:bg-red-600 transition-colors shadow-lg opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
                <div className="absolute top-3 left-3 bg-black/50 text-white px-3 py-1 rounded-lg backdrop-blur-md text-xs font-bold">
                  شريحة {index + 1}
                </div>
              </div>

              {/* Card Body (Settings) */}
              <div className="space-y-4">
                {/* AI Generation Button */}
                <button 
                  onClick={() => handleGenerateMetadata(item)}
                  disabled={generatingId === item.id}
                  className="w-full py-2.5 bg-brand-primary/10 text-brand-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-primary/20 transition-colors"
                >
                  {generatingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  استخراج النص واللون بالذكاء الاصطناعي
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-text-muted flex items-center gap-1"><Type size={12}/> نص الزر</label>
                    <input 
                      type="text" 
                      value={item.ctaText || ''} 
                      onChange={(e) => updateItem(item.id, { ctaText: e.target.value })}
                      className="w-full p-2.5 bg-brand-background border border-brand-border rounded-xl text-sm outline-none focus:border-brand-primary"
                      placeholder="تسوق الآن"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-brand-text-muted flex items-center gap-1"><Palette size={12}/> لون الزر</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={item.ctaColor || '#000000'} 
                        onChange={(e) => updateItem(item.id, { ctaColor: e.target.value })}
                        className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <input 
                        type="text" 
                        value={item.ctaColor || '#000000'} 
                        onChange={(e) => updateItem(item.id, { ctaColor: e.target.value })}
                        className="flex-1 p-2.5 bg-brand-background border border-brand-border rounded-xl text-sm outline-none focus:border-brand-primary font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-brand-text-muted flex items-center gap-1"><LinkIcon size={12}/> التوجيه (الرابط)</label>
                  <div className="flex gap-2">
                    <select 
                      value={item.targetType || 'custom_url'}
                      onChange={(e) => updateItem(item.id, { targetType: e.target.value as any })}
                      className="w-1/3 p-2.5 bg-brand-background border border-brand-border rounded-xl text-sm outline-none focus:border-brand-primary"
                    >
                      <option value="custom_url">رابط حر</option>
                      <option value="product">منتج</option>
                      <option value="supplier">مورد</option>
                    </select>
                    <input 
                      type="text" 
                      value={item.targetId || item.customUrl || ''} 
                      onChange={(e) => updateItem(item.id, item.targetType === 'custom_url' ? { customUrl: e.target.value } : { targetId: e.target.value })}
                      className="flex-1 p-2.5 bg-brand-background border border-brand-border rounded-xl text-sm outline-none focus:border-brand-primary"
                      placeholder={item.targetType === 'custom_url' ? "https://..." : "أدخل المعرف (ID)"}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 3. Floating Action Bar (Global Settings & Save) */}
      <div className="fixed bottom-4 left-4 right-4 md:left-8 md:right-8 lg:left-72 bg-brand-surface/80 backdrop-blur-2xl border border-brand-border/50 p-4 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] z-50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-brand-background p-2 rounded-2xl border border-brand-border flex-1 md:flex-none">
            <Settings2 size={18} className="text-brand-text-muted ml-2" />
            <input 
              type="number" 
              value={settings.globalSettings.speed} 
              onChange={(e) => setSettings({...settings, globalSettings: {...settings.globalSettings, speed: Number(e.target.value)}})}
              className="w-20 bg-transparent text-sm outline-none text-center font-bold"
              title="سرعة الانتقال (ملي ثانية)"
            />
            <span className="text-xs text-brand-text-muted pr-2 border-r border-brand-border">ms</span>
          </div>
          
          <select 
            value={settings.globalSettings.transition}
            onChange={(e) => setSettings({...settings, globalSettings: {...settings.globalSettings, transition: e.target.value as any}})}
            className="p-3 bg-brand-background border border-brand-border rounded-2xl text-sm outline-none focus:border-brand-primary flex-1 md:flex-none font-bold"
          >
            <option value="fade">تلاشي (Fade)</option>
            <option value="slide">انزلاق (Slide)</option>
            <option value="morph">تحول (Morph)</option>
          </select>
        </div>

        <button 
          onClick={handleSave} 
          className="w-full md:w-auto bg-brand-primary text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
        >
          <Save size={20} />
          حفظ ونشر التحديثات
        </button>
      </div>

    </div>
  );
};
