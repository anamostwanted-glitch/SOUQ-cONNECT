import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Category, MarketplaceItem } from '../../../core/types';
import { 
  User, Building2, Phone, Mail, Globe, MapPin, Tag, ArrowLeft, Edit2, 
  Check, X, Save, Camera, UserPlus, UserMinus, Sparkles, ShieldCheck, 
  ShieldAlert, FileText, Wand2, Palette, Link as LinkIcon, Calendar,
  MessageSquare, Heart, Share2, MoreHorizontal, Settings, Activity,
  ShoppingBag, Star, TrendingUp, Award, RefreshCw, Lightbulb,
  LayoutDashboard, Package, Bookmark, Receipt, BarChart2,
  Hammer, Zap, Droplets, Wrench, Briefcase, Cpu, Layers, Monitor, ChevronRight, Plus
} from 'lucide-react';
import { HapticButton } from '../../../shared/components/HapticButton';
import { Avatar, AvatarFallback, AvatarImage } from "../../../shared/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../shared/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../shared/components/ui/card";
import { Badge } from "../../../shared/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../shared/components/ui/tooltip";
import { ScrollArea } from "../../../shared/components/ui/scroll-area";

import { NotificationSettings } from '../../../shared/components/NotificationSettings';
import { AICategorySelector } from './AICategorySelector';

export const CustomerProfileLayout = (props: any) => {
  const { profile, isOwner, isEditing, setIsEditing, isSaving, handleSaveProfile, isUploading, handleCoverUpload, handleLogoUpload, editCoverUrl, editLogoUrl, editName, setEditName, onBack, t, i18n } = props;
  const isRtl = i18n.language === 'ar';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-brand-background pb-32 md:pb-12 font-sans">
        {/* Header Area */}
        <div className="relative h-48 md:h-64 w-full bg-brand-surface overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/10 via-transparent to-brand-background/90" />
          
          {onBack && (
            <button onClick={onBack} className="absolute top-6 left-6 z-40 p-3 bg-brand-surface/50 backdrop-blur-xl rounded-full hover:bg-brand-surface/80 transition-colors shadow-sm border border-brand-border/50">
              <ArrowLeft size={20} className="text-brand-text-main" />
            </button>
          )}

          {/* AI Insights Panel (Glass Card) */}
          {isOwner && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-6 right-6 left-20 md:left-auto md:w-96 z-30 bg-brand-surface/60 backdrop-blur-xl border border-brand-primary/20 rounded-2xl p-4 shadow-lg shadow-brand-primary/5"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary shrink-0 relative">
                  <Sparkles size={18} className="animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-warning rounded-full animate-ping" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-brand-text-main mb-1 flex items-center gap-2">
                    {isRtl ? 'مرحباً بك في مركز التحكم' : 'Welcome to Control Center'}
                  </h4>
                  <p className="text-xs text-brand-text-muted leading-relaxed">
                    {isRtl 
                      ? 'بناءً على طلباتك السابقة، وجدنا 3 موردين جدد في فئة "المقاولات" قد يثيرون اهتمامك.' 
                      : 'Based on your recent requests, we found 3 new suppliers in "Construction" that might interest you.'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-30">
          <div className="flex flex-col items-center md:items-start md:flex-row gap-6">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-brand-background shadow-xl shadow-brand-primary/10 bg-brand-surface relative z-10 transition-transform duration-500 group-hover:scale-[1.02]">
                <AvatarImage src={isEditing ? editLogoUrl : profile.logoUrl || ''} className="object-cover" />
                <AvatarFallback className="text-4xl bg-brand-surface text-brand-text-muted">
                  <User size={40} />
                </AvatarFallback>
              </Avatar>
              {isOwner && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                  <label className="flex flex-col items-center justify-center cursor-pointer hover:text-white/80 transition-colors">
                    {isUploading ? <RefreshCw size={24} className="animate-spin mb-1" /> : <Camera size={24} className="mb-1" />}
                    <span className="text-[10px] font-bold tracking-wider uppercase">{isRtl ? 'تغيير' : 'Change'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
                  </label>
                </div>
              )}
            </div>

            {/* Info & Actions */}
            <div className="flex-1 text-center md:text-left rtl:md:text-right mt-2 md:mt-16">
              {isEditing ? (
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)}
                  className="text-2xl md:text-3xl font-black text-brand-text-main bg-brand-surface border border-brand-border rounded-xl px-4 py-2 w-full max-w-sm focus:ring-2 focus:ring-brand-primary/50 outline-none shadow-sm"
                  placeholder={isRtl ? 'الاسم' : 'Name'}
                />
              ) : (
                <h1 className="text-2xl md:text-3xl font-black text-brand-text-main tracking-tight">
                  {profile.name || (isRtl ? 'مستخدم جديد' : 'New User')}
                </h1>
              )}
              <p className="text-sm text-brand-text-muted mt-1 flex items-center justify-center md:justify-start gap-2">
                <Badge variant="outline" className="bg-brand-surface border-brand-border text-brand-text-muted font-medium">
                  {isRtl ? 'عميل' : 'Customer'}
                </Badge>
                <span className="flex items-center gap-1"><MapPin size={14} /> {profile.location || (isRtl ? 'غير محدد' : 'Not specified')}</span>
              </p>
            </div>

            {/* Edit Button */}
            {isOwner && (
              <div className="mt-4 md:mt-16">
                {isEditing ? (
                  <div className="flex gap-2">
                    <HapticButton onClick={handleSaveProfile} disabled={isSaving} className="px-6 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-sm hover:bg-brand-primary-hover transition-all flex items-center gap-2">
                      {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                      {isRtl ? 'حفظ' : 'Save'}
                    </HapticButton>
                    <HapticButton onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-brand-surface text-brand-text-muted border border-brand-border rounded-xl font-bold hover:bg-brand-surface-hover transition-all">
                      {isRtl ? 'إلغاء' : 'Cancel'}
                    </HapticButton>
                  </div>
                ) : (
                  <HapticButton onClick={() => setIsEditing(true)} className="px-6 py-2.5 bg-brand-surface text-brand-text-main border border-brand-border rounded-xl font-bold shadow-sm hover:border-brand-primary/30 hover:shadow-md transition-all flex items-center gap-2 group">
                    <Edit2 size={16} className="text-brand-text-muted group-hover:text-brand-primary transition-colors" />
                    {isRtl ? 'تعديل الملف' : 'Edit Profile'}
                  </HapticButton>
                )}
              </div>
            )}
          </div>

          {/* Swipeable Tabs */}
          <div className="mt-12">
            <Tabs defaultValue="rfqs" className="w-full">
              <TabsList className="w-full justify-start bg-transparent border-b border-brand-border rounded-none p-0 h-auto overflow-x-auto flex-nowrap hide-scrollbar">
                <TabsTrigger value="rfqs" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary rounded-none px-6 py-4 text-sm font-bold text-brand-text-muted hover:text-brand-text-main transition-colors whitespace-nowrap">
                  <LayoutDashboard size={16} className="mr-2 rtl:ml-2 rtl:mr-0 inline-block" />
                  {isRtl ? 'طلباتي' : 'My RFQs'}
                </TabsTrigger>
                <TabsTrigger value="saved" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary rounded-none px-6 py-4 text-sm font-bold text-brand-text-muted hover:text-brand-text-main transition-colors whitespace-nowrap">
                  <Bookmark size={16} className="mr-2 rtl:ml-2 rtl:mr-0 inline-block" />
                  {isRtl ? 'المحفوظات' : 'Saved'}
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary rounded-none px-6 py-4 text-sm font-bold text-brand-text-muted hover:text-brand-text-main transition-colors whitespace-nowrap">
                  <Settings size={16} className="mr-2 rtl:ml-2 rtl:mr-0 inline-block" />
                  {isRtl ? 'الإعدادات' : 'Settings'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="rfqs" className="mt-8 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mock RFQ Card */}
                  <div className="bg-brand-surface rounded-[2rem] p-6 border border-brand-border shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
                        <Package size={24} />
                      </div>
                      <Badge variant="outline" className="bg-brand-warning/10 text-brand-warning border-brand-warning/20">
                        {isRtl ? 'قيد المراجعة' : 'Under Review'}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-brand-text-main mb-2">
                      {isRtl ? 'طلب مواد بناء' : 'Construction Materials Request'}
                    </h3>
                    <p className="text-sm text-brand-text-muted mb-6">
                      {isRtl ? 'تم تقديم الطلب منذ يومين. بانتظار عروض الموردين.' : 'Request submitted 2 days ago. Waiting for supplier offers.'}
                    </p>
                    <div className="w-full bg-brand-background rounded-full h-2 mb-2 overflow-hidden">
                      <div className="bg-brand-primary h-2 rounded-full w-1/3" />
                    </div>
                    <div className="flex justify-between text-xs text-brand-text-muted font-medium">
                      <span>{isRtl ? 'تم التقديم' : 'Submitted'}</span>
                      <span>{isRtl ? 'تلقي العروض' : 'Receiving Offers'}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="saved" className="mt-8 outline-none">
                <div className="text-center py-20 bg-brand-surface rounded-[2.5rem] border border-brand-border border-dashed">
                  <Bookmark size={48} className="mx-auto text-brand-text-muted/30 mb-4" />
                  <p className="text-brand-text-muted font-medium">{isRtl ? 'لا توجد عناصر محفوظة' : 'No saved items yet'}</p>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-8 outline-none">
                <div className="bg-brand-surface rounded-[2.5rem] p-8 border border-brand-border shadow-sm">
                  <h3 className="text-lg font-bold text-brand-text-main mb-6">{isRtl ? 'إعدادات الحساب' : 'Account Settings'}</h3>
                  {isOwner && (
                    <div className="space-y-8">
                      <NotificationSettings profile={profile} onUpdateProfile={() => {}} />
                      
                      <div className="pt-6 border-t border-brand-border">
                        <h4 className="text-sm font-bold text-brand-text-main mb-4">{isRtl ? 'تفضيلات اللغة' : 'Language Preferences'}</h4>
                        <div className="flex items-center justify-between p-4 bg-brand-background rounded-2xl border border-brand-border">
                          <div>
                            <p className="font-medium text-brand-text-main">{isRtl ? 'لغة الواجهة' : 'Interface Language'}</p>
                            <p className="text-xs text-brand-text-muted mt-1">{isRtl ? 'العربية' : 'English'}</p>
                          </div>
                          <HapticButton className="px-4 py-2 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold hover:bg-brand-surface-hover transition-colors">
                            {isRtl ? 'تغيير' : 'Change'}
                          </HapticButton>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export const SupplierProfileLayout = (props: any) => {
  const { 
    profile, isOwner, isEditing, setIsEditing, isSaving, handleSaveProfile, 
    isUploading, handleCoverUpload, handleLogoUpload, editCoverUrl, editLogoUrl, 
    editName, setEditName, editCompanyName, setEditCompanyName, editBio, setEditBio, 
    handleOptimizeProfile, isOptimizing, onBack, t, i18n, supplierProducts,
    handleGenerateAILogo, isGeneratingLogo, isVerifying, handleVerifyDocument, verificationError,
    categories, editCategories, handleCategoryToggle, isSuggestingCategories, handleSuggestCategories,
    activeCategoryTab, setActiveCategoryTab
  } = props;
  const isRtl = i18n.language === 'ar';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-brand-background pb-32 md:pb-12 font-sans">
        {/* Cover Image */}
        <div 
          className="relative h-64 md:h-80 w-full bg-brand-surface overflow-hidden bg-cover bg-center group"
          style={{ backgroundImage: (isEditing ? editCoverUrl : profile.coverUrl) ? `url(${isEditing ? editCoverUrl : profile.coverUrl})` : undefined }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-brand-background/90" />
          
          {onBack && (
            <button onClick={onBack} className="absolute top-6 left-6 z-40 p-3 bg-brand-surface/50 backdrop-blur-xl rounded-full hover:bg-brand-surface/80 transition-colors shadow-sm border border-brand-border/50">
              <ArrowLeft size={20} className="text-brand-text-main" />
            </button>
          )}

          {isOwner && (
            <div className="absolute inset-0 z-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]">
              <label className="flex items-center gap-2 px-6 py-3 bg-brand-surface/90 backdrop-blur-xl text-brand-text-main rounded-full text-sm font-bold shadow-lg hover:bg-brand-surface transition-all cursor-pointer transform hover:scale-105 active:scale-95 border border-brand-border/50">
                {isUploading ? <RefreshCw size={20} className="animate-spin" /> : <Camera size={20} />}
                {isRtl ? 'تغيير الغلاف' : 'Change Cover'}
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" disabled={isUploading} />
              </label>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-30">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Avatar & Quick Info Sidebar */}
            <div className="w-full md:w-1/3 flex flex-col items-center md:items-start">
              <div className="relative group">
                <Avatar className="w-40 h-40 md:w-48 md:h-48 border-8 border-brand-background shadow-2xl shadow-brand-primary/10 bg-brand-surface relative z-10 transition-transform duration-500 group-hover:scale-[1.02] rounded-3xl">
                  <AvatarImage src={isEditing ? editLogoUrl : profile.logoUrl || ''} className="object-cover rounded-2xl" />
                  <AvatarFallback className="text-5xl bg-brand-surface text-brand-text-muted rounded-2xl">
                    <Building2 size={48} />
                  </AvatarFallback>
                </Avatar>
                
                {isOwner && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 text-white rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                    <label className="flex flex-col items-center justify-center cursor-pointer hover:text-white/80 transition-colors mb-2">
                      {isUploading ? <RefreshCw size={24} className="animate-spin mb-1" /> : <Camera size={24} className="mb-1" />}
                      <span className="text-[10px] font-bold tracking-wider uppercase">{isRtl ? 'تغيير الشعار' : 'Change Logo'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
                    </label>
                    <button 
                      onClick={handleGenerateAILogo} 
                      disabled={isGeneratingLogo}
                      className="flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase hover:text-brand-primary transition-colors"
                    >
                      {isGeneratingLogo ? <RefreshCw size={12} className="animate-spin" /> : <Wand2 size={12} />}
                      {isRtl ? 'توليد بالذكاء' : 'AI Generate'}
                    </button>
                  </div>
                )}
              </div>

              <div className="w-full mt-6 text-center md:text-left rtl:md:text-right">
                {isEditing ? (
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={editCompanyName} 
                      onChange={e => setEditCompanyName(e.target.value)}
                      className="text-2xl font-black text-brand-text-main bg-brand-surface border border-brand-border rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-brand-primary/50 outline-none shadow-sm"
                      placeholder={isRtl ? 'اسم الشركة' : 'Company Name'}
                    />
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)}
                      className="text-sm font-medium text-brand-text-muted bg-brand-surface border border-brand-border rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-brand-primary/50 outline-none shadow-sm"
                      placeholder={isRtl ? 'اسم الممثل' : 'Representative Name'}
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-black text-brand-text-main tracking-tight">
                      {profile.companyName || profile.name || (isRtl ? 'مورد جديد' : 'New Supplier')}
                    </h1>
                    {profile.companyName && profile.name && (
                      <p className="text-sm text-brand-text-muted mt-1 font-medium">{profile.name}</p>
                    )}
                  </>
                )}

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
                  {profile.isVerified ? (
                    <Badge variant="outline" className="bg-brand-primary/10 border-brand-primary/20 text-brand-primary font-bold px-3 py-1">
                      <ShieldCheck size={14} className="mr-1 rtl:ml-1 rtl:mr-0 inline-block" />
                      {isRtl ? 'مورد معتمد' : 'Verified Supplier'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-brand-warning/10 border-brand-warning/20 text-brand-warning font-bold px-3 py-1">
                      <ShieldAlert size={14} className="mr-1 rtl:ml-1 rtl:mr-0 inline-block" />
                      {isRtl ? 'غير معتمد' : 'Unverified'}
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-brand-surface border-brand-border text-brand-text-muted font-medium px-3 py-1">
                    <Star size={14} className="mr-1 rtl:ml-1 rtl:mr-0 inline-block text-brand-warning" />
                    4.8 (120)
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full mt-8 space-y-3">
                {isOwner ? (
                  isEditing ? (
                    <div className="flex gap-2">
                      <HapticButton onClick={handleSaveProfile} disabled={isSaving} className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-sm hover:bg-brand-primary-hover transition-all flex items-center justify-center gap-2">
                        {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                        {isRtl ? 'حفظ' : 'Save'}
                      </HapticButton>
                      <HapticButton onClick={() => setIsEditing(false)} className="flex-1 py-3 bg-brand-surface text-brand-text-muted border border-brand-border rounded-xl font-bold hover:bg-brand-surface-hover transition-all flex items-center justify-center">
                        <X size={18} className="mr-2 rtl:ml-2 rtl:mr-0" />
                        {isRtl ? 'إلغاء' : 'Cancel'}
                      </HapticButton>
                    </div>
                  ) : (
                    <>
                      <HapticButton onClick={() => setIsEditing(true)} className="w-full py-3 bg-brand-surface text-brand-text-main border border-brand-border rounded-xl font-bold shadow-sm hover:border-brand-primary/30 hover:shadow-md transition-all flex items-center justify-center gap-2 group">
                        <Edit2 size={18} className="text-brand-text-muted group-hover:text-brand-primary transition-colors" />
                        {isRtl ? 'تعديل الملف' : 'Edit Profile'}
                      </HapticButton>
                      {!profile.isVerified && (
                        <div className="mt-4 p-4 bg-brand-warning/10 border border-brand-warning/20 rounded-2xl">
                          <h4 className="text-sm font-bold text-brand-warning mb-2 flex items-center gap-2">
                            <ShieldAlert size={16} />
                            {isRtl ? 'توثيق الحساب' : 'Verify Account'}
                          </h4>
                          <p className="text-xs text-brand-warning/80 mb-3">
                            {isRtl ? 'قم برفع السجل التجاري لتوثيق حسابك.' : 'Upload your commercial register to verify.'}
                          </p>
                          <label className="flex items-center justify-center gap-2 w-full py-2 bg-brand-warning text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-brand-warning/90 transition-colors">
                            {isVerifying ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
                            {isRtl ? 'رفع المستند' : 'Upload Document'}
                            <input type="file" accept=".pdf,image/*" className="hidden" onChange={handleVerifyDocument} disabled={isVerifying} />
                          </label>
                          {verificationError && <p className="text-xs text-brand-destructive mt-2">{verificationError}</p>}
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className="flex gap-2">
                    <HapticButton className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-sm hover:bg-brand-primary-hover transition-all flex items-center justify-center gap-2">
                      <MessageSquare size={18} />
                      {isRtl ? 'مراسلة' : 'Message'}
                    </HapticButton>
                    <HapticButton className="flex-1 py-3 bg-brand-surface text-brand-text-main border border-brand-border rounded-xl font-bold shadow-sm hover:border-brand-primary/30 hover:shadow-md transition-all flex items-center justify-center gap-2">
                      <UserPlus size={18} />
                      {isRtl ? 'متابعة' : 'Follow'}
                    </HapticButton>
                  </div>
                )}
              </div>

              {/* Performance Metrics (Sparklines) */}
              <div className="w-full mt-8 bg-brand-surface rounded-[2rem] p-6 border border-brand-border shadow-sm">
                <h3 className="text-sm font-bold text-brand-text-muted uppercase tracking-widest mb-4">{isRtl ? 'الأداء' : 'Performance'}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-brand-text-main font-medium flex items-center gap-2"><Activity size={16} className="text-brand-primary" /> {isRtl ? 'سرعة الرد' : 'Response Rate'}</span>
                    <span className="text-sm font-black text-brand-text-main">98%</span>
                  </div>
                  <div className="w-full bg-brand-background rounded-full h-1.5 overflow-hidden">
                    <div className="bg-brand-primary h-1.5 rounded-full w-[98%]" />
                  </div>
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-sm text-brand-text-main font-medium flex items-center gap-2"><Award size={16} className="text-brand-warning" /> {isRtl ? 'الصفقات المنجزة' : 'Completed Deals'}</span>
                    <span className="text-sm font-black text-brand-text-main">45</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full mt-8 md:mt-24">
              {/* AI Bio Section */}
              <div className="bg-brand-surface/50 backdrop-blur-sm rounded-[2.5rem] p-8 border border-brand-border shadow-sm mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <h3 className="text-lg font-black text-brand-text-main flex items-center gap-2">
                    <FileText size={20} className="text-brand-primary" />
                    {isRtl ? 'نبذة عن الشركة' : 'About Company'}
                  </h3>
                  {isOwner && isEditing && (
                    <HapticButton 
                      onClick={handleOptimizeProfile}
                      disabled={isOptimizing}
                      className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-xl text-xs font-bold hover:bg-brand-primary/20 transition-colors flex items-center gap-2"
                    >
                      {isOptimizing ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                      {isRtl ? 'تحسين بالذكاء الاصطناعي' : 'Optimize with AI'}
                    </HapticButton>
                  )}
                </div>

                {isEditing ? (
                  <textarea 
                    value={editBio} 
                    onChange={e => setEditBio(e.target.value)}
                    className="w-full h-32 bg-brand-background border border-brand-border rounded-2xl p-4 text-sm text-brand-text-main focus:ring-2 focus:ring-brand-primary/50 outline-none resize-none shadow-inner relative z-10"
                    placeholder={isRtl ? 'اكتب نبذة عن شركتك...' : 'Write about your company...'}
                  />
                ) : (
                  <p className="text-sm text-brand-text-muted leading-relaxed relative z-10">
                    {profile.bio || (isRtl ? 'لم يتم إضافة نبذة بعد.' : 'No bio added yet.')}
                  </p>
                )}
              </div>

              {/* Categories Section */}
              {isEditing && (
                <div className="bg-brand-surface/50 backdrop-blur-sm rounded-[2.5rem] p-8 border border-brand-border shadow-sm mb-8 relative z-10">
                  <h3 className="text-lg font-black text-brand-text-main flex items-center gap-2 mb-6">
                    <Layers size={20} className="text-brand-primary" />
                    {isRtl ? 'فئات المنتجات' : 'Product Categories'}
                  </h3>
                  <AICategorySelector
                    categories={categories}
                    selectedCategoryIds={editCategories}
                    onChange={props.setEditCategories}
                    isRtl={isRtl}
                  />
                </div>
              )}

              {/* Swipeable Tabs */}
              <Tabs defaultValue="portfolio" className="w-full">
                <TabsList className="w-full justify-start bg-transparent border-b border-brand-border rounded-none p-0 h-auto overflow-x-auto flex-nowrap hide-scrollbar mb-8">
                  <TabsTrigger value="portfolio" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary rounded-none px-6 py-4 text-sm font-bold text-brand-text-muted hover:text-brand-text-main transition-colors whitespace-nowrap">
                    <Package size={16} className="mr-2 rtl:ml-2 rtl:mr-0 inline-block" />
                    {isRtl ? 'المنتجات والأعمال' : 'Products & Portfolio'}
                  </TabsTrigger>
                  <TabsTrigger value="offers" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary rounded-none px-6 py-4 text-sm font-bold text-brand-text-muted hover:text-brand-text-main transition-colors whitespace-nowrap">
                    <Receipt size={16} className="mr-2 rtl:ml-2 rtl:mr-0 inline-block" />
                    {isRtl ? 'العروض النشطة' : 'Active Offers'}
                  </TabsTrigger>
                  <TabsTrigger value="reviews" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary rounded-none px-6 py-4 text-sm font-bold text-brand-text-muted hover:text-brand-text-main transition-colors whitespace-nowrap">
                    <Star size={16} className="mr-2 rtl:ml-2 rtl:mr-0 inline-block" />
                    {isRtl ? 'التقييمات' : 'Reviews'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="portfolio" className="outline-none">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {supplierProducts && supplierProducts.length > 0 ? (
                      supplierProducts.map((product: MarketplaceItem) => (
                        <div key={product.id} className="aspect-square bg-brand-surface rounded-2xl border border-brand-border overflow-hidden group relative cursor-pointer">
                          <img src={product.images?.[0] || 'https://picsum.photos/seed/product/400/400'} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                            <h4 className="text-white font-bold text-sm truncate">{product.title}</h4>
                            <p className="text-white/80 text-xs font-medium">{product.price} {product.currency}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-20 bg-brand-surface rounded-[2.5rem] border border-brand-border border-dashed">
                        <Package size={48} className="mx-auto text-brand-text-muted/30 mb-4" />
                        <p className="text-brand-text-muted font-medium">{isRtl ? 'لا توجد منتجات بعد' : 'No products yet'}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="offers" className="outline-none">
                  <div className="text-center py-20 bg-brand-surface rounded-[2.5rem] border border-brand-border border-dashed">
                    <Receipt size={48} className="mx-auto text-brand-text-muted/30 mb-4" />
                    <p className="text-brand-text-muted font-medium">{isRtl ? 'لا توجد عروض نشطة' : 'No active offers'}</p>
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="outline-none">
                  <div className="text-center py-20 bg-brand-surface rounded-[2.5rem] border border-brand-border border-dashed">
                    <Star size={48} className="mx-auto text-brand-text-muted/30 mb-4" />
                    <p className="text-brand-text-muted font-medium">{isRtl ? 'لا توجد تقييمات بعد' : 'No reviews yet'}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export const AdminProfileLayout = (props: any) => {
  const { profile, isOwner, isEditing, setIsEditing, isSaving, handleSaveProfile, isUploading, handleLogoUpload, editLogoUrl, editName, setEditName, onBack, t, i18n } = props;
  const isRtl = i18n.language === 'ar';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-brand-background pb-32 md:pb-12 font-sans">
        {/* Header Area */}
        <div className="relative h-48 md:h-56 w-full bg-brand-surface border-b border-brand-border overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 via-transparent to-brand-background/90" />
          
          {onBack && (
            <button onClick={onBack} className="absolute top-6 left-6 z-40 p-3 bg-brand-surface/50 backdrop-blur-xl rounded-full hover:bg-brand-surface/80 transition-colors shadow-sm border border-brand-border/50">
              <ArrowLeft size={20} className="text-brand-text-main" />
            </button>
          )}

          {/* System Health Indicator */}
          <div className="absolute top-6 right-6 z-40 flex items-center gap-2 bg-brand-success/10 border border-brand-success/20 px-4 py-2 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 bg-brand-success rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span className="text-xs font-bold text-brand-success tracking-widest uppercase">{isRtl ? 'النظام مستقر' : 'System Healthy'}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-30">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            
            {/* Avatar & Info */}
            <div className="flex flex-col items-center md:items-start shrink-0">
              <div className="relative group">
                <Avatar className="w-32 h-32 border-4 border-brand-background shadow-xl bg-brand-surface relative z-10 rounded-2xl">
                  <AvatarImage src={isEditing ? editLogoUrl : profile.logoUrl || ''} className="object-cover rounded-xl" />
                  <AvatarFallback className="text-4xl bg-brand-surface text-brand-text-muted rounded-xl">
                    <ShieldCheck size={40} className="text-brand-primary" />
                  </AvatarFallback>
                </Avatar>
                {isOwner && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                    <label className="flex flex-col items-center justify-center cursor-pointer hover:text-white/80 transition-colors">
                      {isUploading ? <RefreshCw size={24} className="animate-spin mb-1" /> : <Camera size={24} className="mb-1" />}
                      <span className="text-[10px] font-bold tracking-wider uppercase">{isRtl ? 'تغيير' : 'Change'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-4 text-center md:text-left rtl:md:text-right w-full">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)}
                    className="text-2xl font-black text-brand-text-main bg-brand-surface border border-brand-border rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-brand-primary/50 outline-none shadow-sm"
                    placeholder={isRtl ? 'الاسم' : 'Name'}
                  />
                ) : (
                  <h1 className="text-2xl font-black text-brand-text-main tracking-tight">
                    {profile.name || 'Admin'}
                  </h1>
                )}
                <Badge variant="outline" className="mt-2 bg-brand-primary/10 border-brand-primary/20 text-brand-primary font-bold px-3 py-1">
                  <ShieldAlert size={14} className="mr-1 rtl:ml-1 rtl:mr-0 inline-block" />
                  {isRtl ? 'مدير النظام' : 'System Admin'}
                </Badge>
              </div>

              {isOwner && (
                <div className="mt-6 w-full">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <HapticButton onClick={handleSaveProfile} disabled={isSaving} className="flex-1 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-sm hover:bg-brand-primary-hover transition-all flex items-center justify-center gap-2">
                        {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                        {isRtl ? 'حفظ' : 'Save'}
                      </HapticButton>
                      <HapticButton onClick={() => setIsEditing(false)} className="flex-1 py-2.5 bg-brand-surface text-brand-text-muted border border-brand-border rounded-xl font-bold hover:bg-brand-surface-hover transition-all flex items-center justify-center">
                        <X size={16} />
                      </HapticButton>
                    </div>
                  ) : (
                    <HapticButton onClick={() => setIsEditing(true)} className="w-full py-2.5 bg-brand-surface text-brand-text-main border border-brand-border rounded-xl font-bold shadow-sm hover:border-brand-primary/30 hover:shadow-md transition-all flex items-center justify-center gap-2 group">
                      <Edit2 size={16} className="text-brand-text-muted group-hover:text-brand-primary transition-colors" />
                      {isRtl ? 'تعديل الملف' : 'Edit Profile'}
                    </HapticButton>
                  )}
                </div>
              )}
            </div>

            {/* Dashboard Content */}
            <div className="flex-1 w-full mt-8 md:mt-16 space-y-6">
              
              {/* AI Executive Summary */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-surface/80 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-brand-primary/20 shadow-xl shadow-brand-primary/5 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary shrink-0">
                    <Sparkles size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-brand-text-main mb-2 flex items-center gap-2">
                      {isRtl ? 'موجز الذكاء الاصطناعي' : 'AI Executive Summary'}
                    </h3>
                    <p className="text-sm text-brand-text-muted leading-relaxed font-medium">
                      {isRtl 
                        ? 'النظام مستقر. تم رصد زيادة بنسبة 15% في طلبات فئة "المقاولات" اليوم. يوجد 5 كلمات مفتاحية جديدة تحتاج لمراجعتك في لوحة التحكم.' 
                        : 'System is stable. A 15% increase in "Construction" requests detected today. There are 5 new keywords awaiting your review in the dashboard.'}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Quick Access Grid (Bento Style) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  onClick={() => (window as any).navigateApp?.('dashboard')}
                  className="bg-brand-surface rounded-[2rem] p-6 border border-brand-border shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all cursor-pointer group flex flex-col justify-between aspect-square md:aspect-auto md:h-48"
                >
                  <div className="p-3 bg-brand-background rounded-2xl w-fit text-brand-text-main group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-colors">
                    <LayoutDashboard size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-text-main mb-1">{isRtl ? 'لوحة التحكم' : 'Dashboard'}</h4>
                    <p className="text-xs text-brand-text-muted">{isRtl ? 'إدارة المنصة بالكامل' : 'Manage the entire platform'}</p>
                  </div>
                </div>
                
                <div 
                  onClick={() => (window as any).navigateApp?.('settings')}
                  className="bg-brand-surface rounded-[2rem] p-6 border border-brand-border shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all cursor-pointer group flex flex-col justify-between aspect-square md:aspect-auto md:h-48"
                >
                  <div className="p-3 bg-brand-background rounded-2xl w-fit text-brand-text-main group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-colors">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-text-main mb-1">{isRtl ? 'إعدادات المنصة' : 'Platform Settings'}</h4>
                    <p className="text-xs text-brand-text-muted">{isRtl ? 'تكوين الفئات والكلمات' : 'Configure categories & keywords'}</p>
                  </div>
                </div>

                <div className="bg-brand-surface rounded-[2rem] p-6 border border-brand-border shadow-sm hover:shadow-md hover:border-brand-primary/30 transition-all cursor-pointer group flex flex-col justify-between aspect-square md:aspect-auto md:h-48">
                  <div className="p-3 bg-brand-background rounded-2xl w-fit text-brand-text-main group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-colors">
                    <BarChart2 size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-text-main mb-1">{isRtl ? 'تقارير الأداء' : 'Performance Reports'}</h4>
                    <p className="text-xs text-brand-text-muted">{isRtl ? 'تحليل نمو المنصة' : 'Analyze platform growth'}</p>
                  </div>
                </div>
              </div>

              {/* Activity Log */}
              <div className="bg-brand-surface rounded-[2.5rem] p-8 border border-brand-border shadow-sm">
                <h3 className="text-lg font-black text-brand-text-main mb-6 flex items-center gap-2">
                  <Activity size={20} className="text-brand-primary" />
                  {isRtl ? 'سجل النشاطات' : 'Activity Log'}
                </h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-brand-border before:to-transparent">
                  {/* Mock Activity Items */}
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-brand-surface bg-brand-primary/20 text-brand-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <Tag size={16} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-brand-background p-4 rounded-2xl border border-brand-border shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-sm text-brand-text-main">{isRtl ? 'اعتماد كلمات مفتاحية' : 'Approved Keywords'}</h4>
                        <time className="text-[10px] font-medium text-brand-text-muted">10:30 AM</time>
                      </div>
                      <p className="text-xs text-brand-text-muted">{isRtl ? 'تم اعتماد 3 كلمات مفتاحية في فئة المقاولات' : 'Approved 3 keywords in Construction category'}</p>
                    </div>
                  </div>
                  
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-brand-surface bg-brand-warning/20 text-brand-warning shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-brand-background p-4 rounded-2xl border border-brand-border shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-sm text-brand-text-main">{isRtl ? 'توثيق مورد' : 'Verified Supplier'}</h4>
                        <time className="text-[10px] font-medium text-brand-text-muted">09:15 AM</time>
                      </div>
                      <p className="text-xs text-brand-text-muted">{isRtl ? 'تم توثيق حساب شركة الأفق للتجارة' : 'Verified Horizon Trading account'}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
