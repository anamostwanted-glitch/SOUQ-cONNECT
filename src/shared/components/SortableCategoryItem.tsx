import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronRight, ChevronDown, Plus, Check, X, Trash2, Hash, Sparkles, Edit2, Tag, Globe } from 'lucide-react';
import { Category } from '../../core/types';
import { handleFirestoreError, OperationType, handleAiError } from '../../core/utils/errorHandling';
import { CategoryList } from './CategoryList';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { translateText, generateCategorySEO } from '../../core/services/geminiService';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface SortableCategoryItemProps {
  category: Category;
  allCategories: Category[];
  onReorder: (newCategories: Category[]) => void;
  onManageKeywords?: (category: Category) => void;
  onSuggestSubcategories?: (parentId: string) => void;
}

export const SortableCategoryItem: React.FC<SortableCategoryItemProps> = ({ category, allCategories, onReorder, onManageKeywords, onSuggestSubcategories }) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isOptimizingSEO, setIsOptimizingSEO] = useState(false);
  const [newSubAr, setNewSubAr] = useState('');
  const [newSubEn, setNewSubEn] = useState('');
  const [editAr, setEditAr] = useState(category.nameAr);
  const [editEn, setEditEn] = useState(category.nameEn);
  const [editType, setEditType] = useState<'product' | 'service'>(category.categoryType || 'product');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const subCategories = allCategories.filter(c => c.parentId === category.id);
  const hasSubCategories = subCategories.length > 0;

  const handleAddSub = async () => {
    if (!newSubAr || !newSubEn) return;
    try {
      await addDoc(collection(db, 'categories'), {
        nameAr: newSubAr.trim(),
        nameEn: newSubEn.trim(),
        parentId: category.id,
        order: subCategories.length,
        categoryType: category.categoryType || 'product',
        createdAt: new Date().toISOString()
      });
      setNewSubAr('');
      setNewSubEn('');
      setIsAddingSub(false);
      setIsExpanded(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'categories', false);
    }
  };

  const handleEdit = async () => {
    if (!editAr || !editEn) return;
    try {
      await updateDoc(doc(db, 'categories', category.id), {
        nameAr: editAr.trim(),
        nameEn: editEn.trim(),
        categoryType: editType
      });
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${category.id}`, false);
    }
  };

  const handleTranslate = async () => {
    if (!newSubAr) return;
    setIsTranslating(true);
    try {
      const translation = await translateText(newSubAr, 'English');
      setNewSubEn(translation);
    } catch (error) {
      handleAiError(error, 'SortableCategoryItem:handleTranslate', false);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await updateDoc(doc(db, 'categories', category.id), {
        status: 'active',
        approvedAt: new Date().toISOString()
      });
      toast.success(isRtl ? 'تم تفعيل الفئة بنجاح' : 'Category activated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${category.id}`, false);
    } finally {
      setIsApproving(false);
    }
  };

  const handleOptimizeSEO = async () => {
    setIsOptimizingSEO(true);
    try {
      const seoData = await generateCategorySEO(category.nameAr, category.nameEn, category.tier || 'niche');
      if (seoData) {
        await updateDoc(doc(db, 'categories', category.id), {
          ...seoData,
          updatedAt: new Date().toISOString()
        });
        toast.success(isRtl ? 'تم تحسين محركات البحث للفئة بنجاح' : 'Category SEO optimized successfully');
      }
    } catch (error) {
      handleAiError(error, 'SortableCategoryItem:handleOptimizeSEO', false);
    } finally {
      setIsOptimizingSEO(false);
    }
  };

  const handleDelete = async () => {
    try {
      await updateDoc(doc(db, 'categories', category.id), {
        status: 'deleted',
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `categories/${category.id}`, false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-3">
      <div className={`flex items-center gap-4 p-4 bg-brand-surface border ${isDragging ? 'border-brand-primary shadow-xl scale-[1.02]' : 'border-brand-border shadow-sm'} rounded-2xl hover:border-brand-primary/30 hover:shadow-md transition-all group relative`}>
        <div {...attributes} {...listeners} className="cursor-grab text-brand-text-muted/50 hover:text-brand-primary p-3 hover:bg-brand-primary/10 rounded-xl transition-colors">
          <GripVertical size={20} />
        </div>
        
        {hasSubCategories ? (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
            className={`p-3 rounded-xl transition-all ${isExpanded ? 'bg-brand-primary/10 text-brand-primary' : 'bg-brand-background text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10'}`}
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        ) : (
          <div className="w-[36px] flex justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-border" />
          </div>
        )}

        <div className="flex-1 flex items-center justify-between min-w-0 gap-4">
          {isEditing ? (
            <div className="flex flex-col gap-3 bg-brand-background p-3 rounded-2xl border border-brand-border flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="flex items-center gap-2 flex-wrap">
                <input 
                  type="text" 
                  value={editAr}
                  onChange={e => setEditAr(e.target.value)}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
                  placeholder="Arabic Name"
                />
                <div className="relative flex-1 min-w-[120px]">
                  <input 
                    type="text" 
                    value={editEn}
                    onChange={e => setEditEn(e.target.value)}
                    className="w-full px-3 py-2 pr-10 bg-brand-surface border border-brand-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
                    placeholder="English Name"
                  />
                  <button 
                    onClick={async () => {
                      if (!editAr) return;
                      setIsTranslating(true);
                      try {
                        const translation = await translateText(editAr, 'English');
                        setEditEn(translation);
                      } catch (error) {
                        handleAiError(error, 'SortableCategoryItem:handleEdit:translate', false);
                      } finally {
                        setIsTranslating(false);
                      }
                    }}
                    disabled={isTranslating}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-3 text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors"
                  >
                    {isTranslating ? <div className="w-3 h-3 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" /> : <Sparkles size={14} />}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-brand-surface p-1 rounded-xl border border-brand-border">
                  <button 
                    onClick={() => setEditType('product')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${editType === 'product' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text-muted hover:bg-brand-primary/10'}`}
                  >
                    {isRtl ? 'منتجات' : 'Products'}
                  </button>
                  <button 
                    onClick={() => setEditType('service')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${editType === 'service' ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-text-muted hover:bg-brand-primary/10'}`}
                  >
                    {isRtl ? 'خدمات' : 'Services'}
                  </button>
                </div>
                
                <div className="flex items-center gap-1">
                  <button onClick={handleEdit} className="text-brand-success p-3 hover:bg-brand-success/10 rounded-xl transition-colors" title="Save"><Check size={18} /></button>
                  <button onClick={() => setIsEditing(false)} className="text-brand-error p-3 hover:bg-brand-error/10 rounded-xl transition-colors" title="Cancel"><X size={18} /></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-text-main text-base leading-tight truncate">{category.nameAr}</span>
                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${category.categoryType === 'service' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
                  {category.categoryType === 'service' ? (isRtl ? 'خدمة' : 'Service') : (isRtl ? 'منتج' : 'Product')}
                </span>
                {category.status === 'pending' && (
                  <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
                    {isRtl ? 'قيد المراجعة' : 'Pending Review'}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-bold text-brand-text-muted uppercase tracking-widest truncate mt-0.5">{category.nameEn}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {category.status === 'pending' && (
              <button 
                onClick={handleApprove}
                disabled={isApproving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                {isApproving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                {isRtl ? 'موافقة' : 'Approve'}
              </button>
            )}
            {hasSubCategories && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-background rounded-lg border border-brand-border text-xs font-bold text-brand-text-muted">
                <Hash size={12} />
                {subCategories.length}
              </div>
            )}

            {isAddingSub ? (
              <div className="flex items-center gap-2 bg-brand-background p-1.5 rounded-xl border border-brand-border animate-in fade-in slide-in-from-right-2 duration-200">
                <input 
                  type="text" 
                  placeholder="Ar" 
                  value={newSubAr}
                  onChange={e => setNewSubAr(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
                  autoFocus
                />
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="En" 
                    value={newSubEn}
                    onChange={e => setNewSubEn(e.target.value)}
                    className="w-24 px-3 py-1.5 bg-brand-surface border border-brand-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <button 
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-3 text-brand-primary hover:bg-brand-primary/10 rounded-md transition-colors"
                  >
                    {isTranslating ? <div className="w-3 h-3 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" /> : <Sparkles size={12} />}
                  </button>
                </div>
                <div className="flex items-center gap-1 px-1">
                  <button onClick={handleAddSub} className="text-brand-success p-3 hover:bg-brand-success/10 rounded-lg transition-colors"><Check size={16} /></button>
                  <button onClick={() => setIsAddingSub(false)} className="text-brand-error p-3 hover:bg-brand-error/10 rounded-lg transition-colors"><X size={16} /></button>
                </div>
              </div>
            ) : isConfirmingDelete ? (
              <div className="flex items-center gap-2 bg-brand-error/10 p-1.5 rounded-xl border border-brand-error/20 animate-in fade-in slide-in-from-right-2 duration-200">
                <span className="text-xs font-bold text-brand-error uppercase tracking-widest px-2">Confirm?</span>
                <button onClick={handleDelete} className="bg-brand-error text-white p-3 rounded-lg hover:bg-brand-error transition-colors"><Check size={16} /></button>
                <button onClick={() => setIsConfirmingDelete(false)} className="text-brand-error p-3 hover:bg-brand-error/20 rounded-lg transition-colors"><X size={16} /></button>
              </div>
            ) : (
              <div className={`flex items-center gap-1 transition-opacity ${(category.suggestedKeywords?.length || 0) > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {onManageKeywords && (
                  <button onClick={() => onManageKeywords(category)} className="p-3 text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-colors relative group" title="Manage Keywords">
                    <div className="flex items-center gap-1.5">
                      <Tag size={16} className={(category.keywords?.length || 0) === 0 ? 'text-brand-warning' : ''} />
                      {(category.keywords?.length || 0) > 0 && (
                        <span className="text-xs font-medium text-brand-text-muted group-hover:text-brand-primary transition-colors">
                          {category.keywords?.length}
                        </span>
                      )}
                    </div>
                    {(category.suggestedKeywords?.length || 0) > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-brand-warning rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" title="New suggested keywords"></span>
                    )}
                  </button>
                )}
                {onSuggestSubcategories && (
                  <button onClick={() => {
                    onSuggestSubcategories(category.id);
                    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }} className="p-3 text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-colors" title={isRtl ? "اقتراح فئات فرعية" : "Suggest Subcategories"}>
                    <Sparkles size={16} />
                  </button>
                )}
                <button 
                  onClick={handleOptimizeSEO}
                  disabled={isOptimizingSEO}
                  className="p-3 text-brand-primary/70 hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-colors"
                  title={isRtl ? 'تحسين SEO' : 'Optimize SEO'}
                >
                  {isOptimizingSEO ? <div className="w-4 h-4 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" /> : <Globe size={16} />}
                </button>
                <button onClick={() => setIsAddingSub(true)} className="p-3 text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-colors" title="Add Sub"><Plus size={16} /></button>
                <button onClick={() => setIsEditing(true)} className="p-3 text-brand-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-colors" title="Edit"><Edit2 size={16} /></button>
                <button onClick={() => setIsConfirmingDelete(true)} className="p-3 text-brand-error/70 hover:text-brand-error hover:bg-brand-error/10 rounded-xl transition-colors" title="Delete"><Trash2 size={16} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {hasSubCategories && isExpanded && (
        <div className="ml-6 mt-2 border-l-2 border-brand-border pl-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <CategoryList categories={subCategories} allCategories={allCategories} onReorder={onReorder} onManageKeywords={onManageKeywords} onSuggestSubcategories={onSuggestSubcategories} viewMode="list" />
        </div>
      )}
    </div>
  );
};
