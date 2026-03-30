import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import { HapticButton } from './HapticButton';
import { motion } from 'motion/react';

interface WhatsAppButtonProps {
  phoneNumber: string | undefined;
  productName?: string;
  productId?: string;
  variant?: 'icon' | 'full';
  className?: string;
}

export const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phoneNumber,
  productName,
  productId,
  variant = 'icon',
  className = '',
}) => {
  const { t, i18n } = useTranslation();

  if (!phoneNumber) return null;

  // Clean phone number: remove spaces, plus, and other non-numeric characters
  // but keep the leading plus if it exists for international format
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');

  const generateMessage = () => {
    const isAr = i18n.language === 'ar';
    const baseUrl = window.location.origin;
    const productUrl = productId ? `${baseUrl}/marketplace/${productId}` : '';
    
    if (isAr) {
      return `مرحباً، أنا مهتم بمنتج "${productName || ''}". هل لا يزال متوفراً؟\n${productUrl}`;
    }
    return `Hi, I'm interested in "${productName || ''}". Is it still available?\n${productUrl}`;
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = encodeURIComponent(generateMessage());
    const whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  if (variant === 'full') {
    return (
      <HapticButton
        onClick={handleWhatsAppClick}
        className={`w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-bold hover:bg-[#20bd5a] transition-all shadow-lg hover:shadow-xl active:scale-95 ${className}`}
      >
        <MessageCircle className="w-5 h-5 fill-current" />
        <span>{t('whatsapp_contact', 'Contact via WhatsApp')}</span>
      </HapticButton>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleWhatsAppClick}
      className={`p-2 bg-[#25D366]/10 text-[#25D366] rounded-full hover:bg-[#25D366]/20 transition-colors ${className}`}
      title={t('whatsapp_contact', 'Contact via WhatsApp')}
    >
      <MessageCircle className="w-4 h-4 fill-current" />
    </motion.button>
  );
};
