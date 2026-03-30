import { GoogleGenAI, Type } from '@google/genai';

export interface AIProductSuggestion {
  title: string;
  description: string;
  category: string;
  priceEstimate: number;
  isHighQuality: boolean;
  features: string[];
}

export async function analyzeProductImage(base64Image: string, mimeType: string): Promise<AIProductSuggestion | null> {
  try {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API key not found. Skipping AI analysis.');
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Remove data:image/jpeg;base64, prefix if present
    const base64Data = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: 'Analyze this product image for a marketplace listing. Provide a catchy title, a detailed description, the most appropriate category, an estimated price in USD, whether the image is high quality (well-lit, clear, professional), and a list of key features.',
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'A catchy, concise title for the product.' },
            description: { type: Type.STRING, description: 'A detailed, appealing description of the product.' },
            category: { type: Type.STRING, description: 'The most appropriate category (e.g., Electronics, Fashion, Home, Vehicles).' },
            priceEstimate: { type: Type.NUMBER, description: 'An estimated price in USD.' },
            isHighQuality: { type: Type.BOOLEAN, description: 'True if the image is well-lit, clear, and looks professional.' },
            features: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'A list of 3-5 key features or selling points.'
            },
          },
          required: ['title', 'description', 'category', 'priceEstimate', 'isHighQuality', 'features'],
        },
      },
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as AIProductSuggestion;
  } catch (error) {
    console.error('Error analyzing product image with AI:', error);
    return null;
  }
}
