import { 
  analyzeProductImage as geminiAnalyzeProductImage, 
  generateAlternativeProductImage as geminiGenerateAlternativeProductImage,
  handleAiError 
} from '../../../core/services/geminiService';

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
    handleAiError(error, 'Product image analysis');
    return null;
  }
}

export async function generateAlternativeProductImage(base64Image: string, mimeType: string, title: string, category: string): Promise<string | null> {
  try {
    return await geminiGenerateAlternativeProductImage(base64Image, mimeType, title, category);
  } catch (error: any) {
    handleAiError(error, 'Alternative image generation');
    return null;
  }
}
