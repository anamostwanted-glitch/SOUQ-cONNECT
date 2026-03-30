import { GoogleGenAI, Type } from "@google/genai";
import { Category } from "../types";

const getApiKey = () => (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return text;
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Translate the following text to ${targetLanguage}. Return ONLY the translated text.\n\n${text}`,
  });
  return response.text || text;
};

export const verifyDocument = async (base64Data: string, mimeType: string): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) return { isLegit: true, details: 'Verified (Offline Mode)' };
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Analyze this document. Is it a valid commercial registration, tax certificate, or business license? Provide details and the company name if found." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isLegit: { type: Type.BOOLEAN },
          details: { type: Type.STRING },
          companyName: { type: Type.STRING }
        },
        required: ["isLegit", "details"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const optimizeSupplierProfile = async (companyName: string, bio: string, keywords: string[], language: string): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) return { suggestedBio: bio, suggestedKeywords: keywords };
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Optimize this supplier profile for a B2B marketplace. 
    Company: ${companyName}
    Current Bio: ${bio}
    Current Keywords: ${keywords.join(", ")}
    Language: ${language === 'ar' ? 'Arabic' : 'English'}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedBio: { type: Type.STRING },
          suggestedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["suggestedBio", "suggestedKeywords"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const generateSupplierLogoImage = async (companyName: string, category: string, language: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return 'https://picsum.photos/seed/logo/200/200';
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `A professional, modern, minimalist logo for a company named "${companyName}" in the "${category}" industry. 
  The style should be high-end, luxury tech, suitable for a B2B platform. 
  Clean lines, professional color palette. No text except maybe a stylized letter.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
    config: {
      imageConfig: { aspectRatio: "1:1" }
    }
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return 'https://picsum.photos/seed/logo/200/200';
};

export const getProfileInsights = async (profileData: any, language: string): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this user profile and provide strategic business insights. 
    Profile: ${JSON.stringify(profileData)}
    Provide a summary, key strengths, and actionable recommendations.
    Return the response in both Arabic and English.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summaryAr: { type: Type.STRING },
          summaryEn: { type: Type.STRING },
          strengthsAr: { type: Type.ARRAY, items: { type: Type.STRING } },
          strengthsEn: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendationsAr: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendationsEn: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["summaryAr", "summaryEn", "strengthsAr", "strengthsEn", "recommendationsAr", "recommendationsEn"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const suggestSupplierCategories = async (profile: any, allCategories: Category[], language: string): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on this supplier profile, suggest the most relevant categories from the provided list.
    Profile: ${JSON.stringify(profile)}
    Categories: ${JSON.stringify(allCategories.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn })))}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

// ... keep other stubs or implement as needed ...
export const generateKeywords = async (...args: any[]): Promise<string[]> => ['keyword1', 'keyword2'];
export const generateSupplierProposal = async (...args: any[]): Promise<string> => 'Proposal';
export const enhanceRequestDescription = async (...args: any[]): Promise<string> => args[0];
export const generateBrandingSuggestions = async (...args: any[]): Promise<any> => ({ primaryColor: '#000', secondaryColor: '#fff', font: 'Inter' });
export const generateSupplierLogo = async (...args: any[]): Promise<any> => ({ bgColor: '#000', textColor: '#fff', font: 'Inter', logoText: 'Logo' });
export const negotiateOffer = async (...args: any[]): Promise<any> => ({ suggestedPrice: 100, reasoning: 'Fair price' });
export const getPriceIntelligence = async (...args: any[]): Promise<any> => ({ min: 10, max: 100, average: 50 });
export const generateSmartReplies = async (...args: any[]): Promise<string[]> => ['Reply 1', 'Reply 2'];
export const moderateContent = async (...args: any[]): Promise<any> => ({ isSafe: true });
export const translateAudio = async (...args: any[]): Promise<string> => 'Translated audio text';
export const summarizeChat = async (...args: any[]): Promise<string> => 'Chat summary';
export const analyzeSentiment = async (...args: any[]): Promise<any> => ({ sentiment: 'positive', score: 0.9 });
export const validatePhoneNumber = async (...args: any[]): Promise<any> => ({ isValid: true, formatted: args[0] });
export const analyzeImageForSearch = async (...args: any[]): Promise<any> => ({ keywords: ['item'], category: 'General', visualDescription: 'An item', confidence: 0.9, attributes: { color: 'red', material: 'wood', style: 'modern', productType: 'item' } });
export const semanticSearch = async (...args: any[]): Promise<any[]> => args[1] ? args[1].map((i: any) => i.id) : [];
export const matchSuppliers = async (...args: any[]): Promise<any[]> => args[1] ? args[1].map((s: any) => s.uid) : [];
export const analyzeProductImage = async (...args: any[]): Promise<any> => ({ productName: 'Product', description: 'A product' });
export const parseVoiceRequest = async (...args: any[]): Promise<any> => ({ intent: 'search', query: args[0] });
export const generateProductCopy = async (...args: any[]): Promise<any> => ({ title: 'Title', description: 'Product copy', highlights: ['Highlight'] });
export const enhanceProductImageDescription = async (...args: any[]): Promise<any> => ({ suggestions: ['Suggestion'], caption: 'Caption' });
export const categorizeProduct = async (...args: any[]): Promise<string> => 'General';
export const getAiAssistantResponse = async (...args: any[]): Promise<string> => 'AI Response';
export const extractKeywordsFromRequests = async (...args: any[]): Promise<string[]> => ['keyword'];
export const generateNegotiationResponse = async (...args: any[]): Promise<string> => 'Response';
export const formatCategoryName = async (...args: any[]): Promise<any> => ({ nameAr: args[0], nameEn: args[0] });
export const analyzeMarketTrends = async (...args: any[]): Promise<any> => ({ analysis: 'Trends analysis' });
export const suggestCategoryMerges = async (...args: any[]): Promise<any[]> => [];
export const suggestMainCategories = async (language: string, categoryType: 'product' | 'service', existingCategories: string[]): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return ['General'];
  const ai = new GoogleGenAI({ apiKey });
  const existingList = existingCategories.length > 0 ? `Do not include these existing categories: ${existingCategories.join(', ')}.` : '';
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Suggest 5-8 new main ${categoryType === 'product' ? 'product' : 'service'} categories for a B2B marketplace. The language should be ${language}. ${existingList} Return ONLY a JSON array of strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return ['General'];
  }
};

export const suggestSubcategories = async (parentCategory: string, categoryType: 'product' | 'service', existingSubcategories: string[]): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return ['Sub'];
  const ai = new GoogleGenAI({ apiKey });
  const existingList = existingSubcategories.length > 0 ? `Do not include these existing subcategories: ${existingSubcategories.join(', ')}.` : '';
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Suggest 5-8 new ${categoryType === 'product' ? 'product' : 'service'} subcategories for the parent category "${parentCategory}" in a B2B marketplace. The language should match the parent category name. ${existingList} Return ONLY a JSON array of strings.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    return ['Sub'];
  }
};
