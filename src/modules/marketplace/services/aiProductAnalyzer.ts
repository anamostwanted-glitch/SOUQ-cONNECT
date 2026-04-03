import { GoogleGenAI, Type } from '@google/genai';

export interface AIProductSuggestion {
  title: string;
  description: string;
  category: string;
  priceEstimate: number;
  isHighQuality: boolean;
  features: string[];
}

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (error?.status === 429 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function analyzeProductImage(base64Image: string, mimeType: string): Promise<AIProductSuggestion | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = base64Image.split(',')[1] || base64Image;

    return await retryWithBackoff(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: 'Analyze this product image for a marketplace listing. Provide a catchy title, a detailed description, the most appropriate category, an estimated price in USD, whether the image is high quality (well-lit, clear, professional), and a list of key features.' },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              priceEstimate: { type: Type.NUMBER },
              isHighQuality: { type: Type.BOOLEAN },
              features: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['title', 'description', 'category', 'priceEstimate', 'isHighQuality', 'features'],
          },
        },
      });
      return JSON.parse(response.text || '{}') as AIProductSuggestion;
    });
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes('quota')) {
      console.warn('AI Quota exhausted. Falling back to manual entry.');
      throw new Error('QUOTA_EXHAUSTED');
    }
    console.error('Error analyzing product image with AI:', error);
    return null;
  }
}

export async function generateAlternativeProductImage(base64Image: string, mimeType: string, title: string, category: string): Promise<string | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = base64Image.split(',')[1] || base64Image;
    const prompt = `A professional, close-up photography of this product. Place it in the center of the picture on elegant interior design elements. Highlight its uses and applications. Product title: ${title || 'Product'}. Category: ${category || 'General'}. High quality, studio lighting, highly detailed.`;

    return await retryWithBackoff(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: prompt },
          ],
        },
        config: { imageConfig: { aspectRatio: "3:4" } }
      });

      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content.parts || []) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
      return null;
    });
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes('quota')) {
      console.warn('AI Image Generation Quota exhausted.');
      throw new Error('QUOTA_EXHAUSTED');
    }
    console.error('Error generating alternative image:', error);
    return null;
  }
}
