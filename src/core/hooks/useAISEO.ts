import { useState, useEffect } from 'react';
import { generateSEOContent } from '../services/seoService';

/**
 * Core Team: useAISEO Hook
 * Automatically handles the generation and state of AI-Powered SEO metadata
 */
export const useAISEO = (params: {
  type: 'supplier' | 'category' | 'product';
  name: string;
  description?: string;
  language: 'ar' | 'en';
  enabled?: boolean;
}) => {
  const [seoData, setSeoData] = useState<{
    title: string;
    description: string;
    keywords: string[];
    content: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!params.enabled || !params.name) return;

    const fetchSEO = async () => {
      setIsLoading(true);
      const result = await generateSEOContent({
        type: params.type,
        name: params.name,
        description: params.description,
        language: params.language
      });
      if (result) setSeoData(result);
      setIsLoading(false);
    };

    fetchSEO();
  }, [params.name, params.type, params.language, params.enabled]);

  return { seoData, isLoading };
};
