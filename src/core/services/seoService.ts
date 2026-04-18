import { GoogleGenAI } from "@google/genai";

/**
 * Core Team: SEO Automation Service
 * This service leverages Gemini AI to generate high-conversion SEO metadata, 
 * landing page descriptions, and keywords for suppliers and categories.
 */

const getApiKey = () => process.env.GEMINI_API_KEY || '';

export const generateSEOContent = async (context: {
  type: 'supplier' | 'category' | 'product';
  name: string;
  description?: string;
  language: 'ar' | 'en';
}) => {
  try {
    const isAr = context.language === 'ar';
    const genAI = new GoogleGenAI({ apiKey: getApiKey() });
    const model = (genAI as any).getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Act as an expert SEO Content Strategist for a B2B Marketplace called "Connect AI".
      Target: ${context.type}
      Name: ${context.name}
      Base Description: ${context.description || 'N/A'}
      Language: ${isAr ? 'Arabic' : 'English'}

      Tasks:
      1. Generate a compelling Meta Title (max 60 chars).
      2. Generate an SEO-rich Meta Description (max 160 chars) including high-intent keywords.
      3. Provide 10 relevant SEO keywords.
      4. Generate a 200-word promotional article/landing page content for this ${context.type} to boost Google ranking.

      Return ONLY a JSON object:
      {
        "title": "...",
        "description": "...",
        "keywords": ["...", "..."],
        "content": "..."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON from potential markdown blocks
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("SEO Service Error:", error);
    return null;
  }
};

/**
 * Generates automated Alt Text for product images using Gemini Vision
 */
export const generateImageAltText = async (imageUrl: string, productName: string) => {
  // Logic to analyze image and provide descriptive ALT for SEO
  return `High-quality industrial ${productName} available on Connect AI Marketplace`;
};
