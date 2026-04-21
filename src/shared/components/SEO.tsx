import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image = '/og-image.png',
  url = window.location.href,
  type = 'website'
}) => {
  const { i18n } = useTranslation();
  const baseTitle = 'Souq Connect - سوق كونيكت';
  const fullTitle = title ? `${title} | ${baseTitle}` : baseTitle;
  
  const defaultDesc = i18n.language === 'ar' 
    ? 'سوق كونيكت: المنصة العصبية للتجارة بين الشركات. تواصل مع موردين معتمدين، وأتمت عملية التوريد باستخدام الذكاء الاصطناعي.'
    : 'Souq Connect: The Neural Hub for Multi-Vendor MarketPlace. Connect with verified suppliers and automate sourcing with AI.';

  const finalDesc = description || defaultDesc;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={finalDesc} />
      {keywords && <meta name="keywords" content={keywords} /> }
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={finalDesc} />
      <meta property="twitter:image" content={image} />
      
      <html lang={i18n.language} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} />
    </Helmet>
  );
};
