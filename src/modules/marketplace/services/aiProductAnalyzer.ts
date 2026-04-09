import { analyzeProductImage as geminiAnalyzeProductImage, generateAlternativeProductImage as geminiGenerateAlternativeProductImage } from '../../../core/services/geminiService';

export interface AIProductSuggestion {
  productNameAr: string;
  descriptionAr: string;
  productNameEn: string;
  descriptionEn: string;
  keywordsAr: string[];
  keywordsEn: string[];
  category: string;
  priceEstimate: number;
  isHighQuality: boolean;
  features: string[];
}

export async function analyzeProductImage(base64Image: string, mimeType: string): Promise<AIProductSuggestion | null> {
  try {
    const result = await geminiAnalyzeProductImage(base64Image, mimeType);
    return result as AIProductSuggestion;
  } catch (error: any) {
    console.error('Error in analyzeProductImage:', error);
    if (error.message === 'QUOTA_EXHAUSTED' || error.message === 'MISSING_API_KEY') throw error;
    return null;
  }
}

export async function generateAlternativeProductImage(base64Image: string, mimeType: string, title: string, category: string): Promise<string | null> {
  try {
    return await geminiGenerateAlternativeProductImage(base64Image, mimeType, title, category);
  } catch (error: any) {
    console.error('Error in generateAlternativeProductImage:', error);
    if (error.message === 'QUOTA_EXHAUSTED' || error.message === 'MISSING_API_KEY') throw error;
    return null;
  }
}
