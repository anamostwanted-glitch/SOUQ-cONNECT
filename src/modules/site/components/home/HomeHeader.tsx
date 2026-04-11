import React from 'react';
import { useTranslation } from 'react-i18next';

interface HomeHeaderProps {
  logoUrl: string;
  siteName: string;
  heroTitle: string;
  heroDescription: string;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ logoUrl, siteName, heroTitle, heroDescription }) => {
  const { t } = useTranslation();
  return (
    <div className="text-center mb-12">
      <img src={logoUrl} alt={siteName} className="w-24 h-24 mx-auto mb-6 rounded-full" />
      <h1 className="text-4xl font-bold text-brand-text mb-4">{heroTitle}</h1>
      <p className="text-xl text-brand-text-secondary">{heroDescription}</p>
    </div>
  );
};
