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
  schema?: any;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  image = '/og-image.png',
  url,
  type = 'website',
  schema
}) => {
  const { i18n } = useTranslation();
  const baseTitle = 'Souq Connect - سوق كونيكت';
  const fullTitle = title ? `${title} | ${baseTitle}` : baseTitle;
  const currentUrl = url || window.location.href;
  
  const defaultDesc = i18n.language === 'ar' 
    ? 'سوق كونيكت: المنصة العصبية لـ Multi-Vendor MarketPlace. تواصل مع موردين معتمدين، وأتمت عملية التوريد باستخدام الذكاء الاصطناعي.'
    : 'Souq Connect: The Neural Hub for Multi-Vendor MarketPlace. Connect with verified suppliers and automate sourcing with AI.';

  const finalDesc = description || defaultDesc;

  // Default Organization Schema
  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Souq Connect",
    "url": window.location.origin,
    "logo": `${window.location.origin}/logo.png`,
    "description": finalDesc,
    "sameAs": [
      "https://twitter.com/souqconnect",
      "https://linkedin.com/company/souqconnect"
    ]
  };

  const jsonLd = schema || defaultSchema;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={finalDesc} />
      {keywords && <meta name="keywords" content={keywords} /> }
      <link rel="canonical" href={currentUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Souq Connect" />
      <meta property="og:locale" content={i18n.language === 'ar' ? 'ar_SA' : 'en_US'} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={currentUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={finalDesc} />
      <meta property="twitter:image" content={image} />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>

      <html lang={i18n.language} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'} />
    </Helmet>
  );
};
