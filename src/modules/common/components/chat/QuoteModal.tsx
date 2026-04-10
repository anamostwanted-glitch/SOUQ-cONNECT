import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, X, PlusCircle, Trash2, Send, SparklesIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Quote, ProductRequest, AppFeatures } from '../../../../core/types';
import { getPriceIntelligence } from '../../../../core/services/geminiService';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../../../core/firebase';
import { handleAiError } from '../../../../core/services/geminiService';
import { handleFirestoreError, OperationType } from '../../../../core/utils/errorHandling';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendQuote: (quoteData: Quote) => Promise<void>;
  request: ProductRequest | null;
  chatId: string;
  features: AppFeatures;
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  onSendQuote,
  request,
  chatId,
  features
}) => {
  const { t, i18n } = useTranslation();

  const [quoteItems, setQuoteItems] = useState<Quote['items']>([
    { id: '1', description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [quoteTax, setQuoteTax] = useState(15);
  const [quoteCurrency, setQuoteCurrency] = useState('SAR');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteValidUntil, setQuoteValidUntil] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  );
  
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [isAnalyzingPrice, setIsAnalyzingPrice] = useState(false);
  const [priceInsight, setPriceInsight] = useState<{
    recommendedPrice: number;
    minPrice: number;
    maxPrice: number;
    analysis: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleGetPriceInsight = async () => {
    if (!request) return;
    setIsAnalyzingPrice(true);
    try {
      const offersSnap = await getDocs(query(
        collection(db, 'offers'),
        where('status', '==', 'accepted'),
        limit(20)
      ));
      const historicalOffers = offersSnap.docs.map(d => d.data());
      
      const insight = await getPriceIntelligence(
        request.productName,
        request.description || '',
        historicalOffers,
        i18n.language
      );
      setPriceInsight(insight);
      
      if (quoteItems.length === 1 && quoteItems[0].unitPrice === 0) {
        setQuoteItems([{ ...quoteItems[0], unitPrice: insight.recommendedPrice }]);
      }
    } catch (error) {
      handleAiError(error, 'Price insight');
    } finally {
      setIsAnalyzingPrice(false);
    }
  };

  const handleSend = async () => {
    if (isSendingQuote) return;
    setIsSendingQuote(true);
    
    const subtotal = quoteItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const total = subtotal + (subtotal * (quoteTax / 100));

    const quoteData: Quote = {
      items: quoteItems,
      subtotal,
      tax: quoteTax,
      total,
      notes: quoteNotes,
      validUntil: quoteValidUntil,
      currency: quoteCurrency
    };

    try {
      await onSendQuote(quoteData);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/quote`, false);
    } finally {
      setIsSendingQuote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-brand-text-main/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl glass-modal overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-brand-border-light flex items-center justify-between bg-brand-primary text-white">
          <div className="flex items-center gap-3">
            <FileText size={24} />
            <h3 className="text-xl font-black">{i18n.language === 'ar' ? 'إنشاء عرض سعر رسمي' : 'Generate Official Quote'}</h3>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-brand-text-main">{i18n.language === 'ar' ? 'البنود' : 'Items'}</h4>
              <div className="flex items-center gap-2">
                {features.priceIntelligence && (
                  <button
                    onClick={handleGetPriceInsight}
                    disabled={isAnalyzingPrice || !request}
                    className="flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-primary-hover bg-brand-primary/10 hover:bg-brand-primary/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isAnalyzingPrice ? (
                      <div className="w-3 h-3 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <SparklesIcon size={14} />
                    )}
                    {i18n.language === 'ar' ? 'ذكاء التسعير' : 'Price Intelligence'}
                  </button>
                )}
                <button 
                  onClick={() => setQuoteItems([...quoteItems, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0 }])}
                  className="text-brand-primary hover:text-brand-primary-hover font-bold text-sm flex items-center gap-1"
                >
                  <PlusCircle size={16} />
                  {i18n.language === 'ar' ? 'إضافة بند' : 'Add Item'}
                </button>
              </div>
            </div>

            {priceInsight && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 space-y-2"
              >
                <div className="flex items-center gap-2 text-brand-primary">
                  <SparklesIcon size={16} />
                  <span className="text-sm font-bold">{i18n.language === 'ar' ? 'توصية الذكاء الاصطناعي' : 'AI Recommendation'}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-2 bg-white rounded-xl shadow-sm border border-brand-border-light">
                    <p className="text-[10px] text-brand-text-muted uppercase">{i18n.language === 'ar' ? 'الموصى به' : 'Recommended'}</p>
                    <p className="text-lg font-black text-brand-primary">{priceInsight.recommendedPrice} <span className="text-[10px]">{quoteCurrency}</span></p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-xl shadow-sm border border-brand-border-light">
                    <p className="text-[10px] text-brand-text-muted uppercase">{i18n.language === 'ar' ? 'الأدنى' : 'Min'}</p>
                    <p className="text-lg font-black text-brand-success">{priceInsight.minPrice} <span className="text-[10px]">{quoteCurrency}</span></p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-xl shadow-sm border border-brand-border-light">
                    <p className="text-[10px] text-brand-text-muted uppercase">{i18n.language === 'ar' ? 'الأعلى' : 'Max'}</p>
                    <p className="text-lg font-black text-brand-warning">{priceInsight.maxPrice} <span className="text-[10px]">{quoteCurrency}</span></p>
                  </div>
                </div>
                <p className="text-xs text-brand-text-muted italic leading-relaxed">{priceInsight.analysis}</p>
              </motion.div>
            )}

            {quoteItems.map((item, index) => (
              <div key={item.id || index} className="grid grid-cols-12 gap-3 items-end bg-brand-background p-4 rounded-2xl border border-brand-border-light">
                <div className="col-span-12 sm:col-span-6 space-y-1">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الوصف' : 'Description'}</label>
                  <input 
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...quoteItems];
                      newItems[index].description = e.target.value;
                      setQuoteItems(newItems);
                    }}
                    className="w-full px-4 py-2 bg-white border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder={i18n.language === 'ar' ? 'اسم المنتج أو الخدمة' : 'Product or service name'}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الكمية' : 'Qty'}</label>
                  <input 
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...quoteItems];
                      newItems[index].quantity = Number(e.target.value);
                      setQuoteItems(newItems);
                    }}
                    className="w-full px-4 py-2 bg-white border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div className="col-span-5 sm:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</label>
                  <input 
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const newItems = [...quoteItems];
                      newItems[index].unitPrice = Number(e.target.value);
                      setQuoteItems(newItems);
                    }}
                    className="w-full px-4 py-2 bg-white border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div className="col-span-3 sm:col-span-1 flex justify-center pb-2">
                  <button 
                    onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== index))}
                    disabled={quoteItems.length === 1}
                    className="text-brand-error hover:text-brand-error disabled:opacity-30"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'الضريبة (%)' : 'Tax (%)'}</label>
              <input 
                type="number"
                value={quoteTax}
                onChange={(e) => setQuoteTax(Number(e.target.value))}
                className="w-full px-4 py-2 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'العملة' : 'Currency'}</label>
              <select 
                value={quoteCurrency}
                onChange={(e) => setQuoteCurrency(e.target.value)}
                className="w-full px-4 py-2 bg-brand-background border border-brand-border rounded-xl outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="دينار">دينار</option>
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="AED">AED</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-brand-text-muted uppercase ml-1">{i18n.language === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}</label>
            <textarea 
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              className="w-full px-4 py-3 bg-brand-background border border-brand-border rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary h-24 resize-none"
              placeholder={i18n.language === 'ar' ? 'شروط الدفع، وقت التوصيل، إلخ...' : 'Payment terms, delivery time, etc...'}
            />
          </div>
        </div>

        <div className="p-6 bg-brand-background border-t border-brand-border-light flex items-center justify-between">
          <div className="text-right">
            <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest leading-none mb-1">
              {i18n.language === 'ar' ? 'الإجمالي النهائي' : 'Final Total'}
            </p>
            <p className="text-2xl font-black text-brand-text-main">
              {quoteItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0) * (1 + quoteTax / 100)} {quoteCurrency}
            </p>
          </div>
          <button 
            onClick={handleSend}
            disabled={isSendingQuote}
            className="px-8 py-4 bg-brand-teal text-white rounded-2xl font-bold hover:bg-brand-teal-dark transition-all shadow-lg shadow-brand-teal/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingQuote ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
            ) : (
              <Send size={20} className={i18n.language === 'ar' ? 'rotate-180' : ''} />
            )}
            {i18n.language === 'ar' ? 'إرسال عرض السعر' : 'Send Quote'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
