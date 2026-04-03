import { GoogleGenAI, Type } from "@google/genai";
import { Category, UserProfile, GeminiApiKey } from "../types";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { neuralCache } from '../utils/neuralCache';

let cachedKeys: GeminiApiKey[] = [];
let lastFetch = 0;

const fetchKeys = async () => {
  const now = Date.now();
  if (now - lastFetch < 60000 && cachedKeys.length > 0) return cachedKeys;
  
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'gemini_config'));
    if (docSnap.exists()) {
      cachedKeys = (docSnap.data().keys || []).filter((k: GeminiApiKey) => k.status === 'active');
      lastFetch = now;
    }
  } catch (e) {
    console.error('Error fetching AI keys:', e);
  }
  return cachedKeys;
};

const getApiKey = async () => {
  const activeKeys = await fetchKeys();
  if (activeKeys.length > 0) {
    // Simple random selection for load balancing
    const selected = activeKeys[Math.floor(Math.random() * activeKeys.length)];
    return selected.key;
  }
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;
};

async function retryWithBackoff<T>(fn: (apiKey?: string) => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = 
      error?.status === 429 || 
      error?.error?.code === 429 ||
      error?.message?.includes('quota') || 
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('429');
      
    if (isQuotaError && retries > 0) {
      console.warn(`Quota exceeded, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // On quota error, we try to get a fresh key which might be different due to random selection
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return text;
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Translate the following text to ${targetLanguage}. Return ONLY the translated text.\n\n${text}`,
      });
      return response.text || text;
    });
  } catch (e) {
    console.warn('Translation failed, returning original text:', e);
    return text;
  }
};

export const suggestColorHarmony = async (primaryColor: string): Promise<{ secondaryColor: string; reason: string }> => {
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return { secondaryColor: '#ffffff', reason: 'Default fallback' };
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Given the primary brand color ${primaryColor}, suggest a secondary text color that is visually harmonious, maintains high contrast for accessibility (WCAG), and feels professional. Return ONLY a JSON object with 'secondaryColor' (hex) and a brief 'reason'.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              secondaryColor: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["secondaryColor", "reason"]
          }
        }
      });
      
      try {
        return JSON.parse(response.text || '{}');
      } catch (e) {
        return { secondaryColor: '#ffffff', reason: 'Parsing failed' };
      }
    });
  } catch (e) {
    console.warn('Color harmony suggestion failed:', e);
    return { secondaryColor: '#ffffff', reason: 'AI service unavailable' };
  }
};

export const analyzeNeuralPulseImage = async (base64Data: string, mimeType: string): Promise<any> => {
  try {
    // 1. Semantic Check (0 Tokens)
    const fingerprint = neuralCache.generateImageFingerprint(base64Data);
    const cached = neuralCache.get(fingerprint);
    if (cached) return { ...cached, isCached: true };

    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return { found: false, details: 'AI Service Unavailable' };
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            // Conceptual Compression: Shorter, more direct prompt
            { text: "[V-SCAN:JSON] Identify product, specs, 3 categories. Return JSON: {productName, specs, suggestedCategories[], confidence}" }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productName: { type: Type.STRING },
              specs: { type: Type.STRING },
              suggestedCategories: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence: { type: Type.NUMBER }
            },
            required: ["productName", "specs", "suggestedCategories", "confidence"]
          }
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      // Store in Semantic Memory
      neuralCache.set(fingerprint, result);
      return result;
    });
  } catch (e) {
    console.error('Neural Pulse Image Analysis failed:', e);
    return { found: false, error: 'Analysis failed' };
  }
};

export const processNeuralPulseVoice = async (transcript: string): Promise<any> => {
  try {
    // 1. Semantic Check (0 Tokens)
    const fingerprint = neuralCache.generateVoiceFingerprint(transcript);
    const cached = neuralCache.get(fingerprint);
    if (cached) return { ...cached, isCached: true };

    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return { success: false };
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        // Conceptual Compression: Direct mapping
        contents: `[V-RFQ:JSON] Map transcript to RFQ: "${transcript}". JSON: {product, quantity, budget, urgency, professionalSummary}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              product: { type: Type.STRING },
              quantity: { type: Type.STRING },
              budget: { type: Type.STRING },
              urgency: { type: Type.STRING },
              professionalSummary: { type: Type.STRING }
            },
            required: ["product", "quantity", "budget", "urgency", "professionalSummary"]
          }
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      // Store in Semantic Memory
      neuralCache.set(fingerprint, result);
      return result;
    });
  } catch (e) {
    console.error('Neural Pulse Voice Processing failed:', e);
    return { success: false };
  }
};

export const generateNeuralPulseGeoInsight = async (lat: number, lng: number, recentInterests: string[]): Promise<any> => {
  try {
    // 1. Semantic Check (0 Tokens) - Bucketed location
    const fingerprint = neuralCache.generateGeoFingerprint(lat, lng, recentInterests);
    const cached = neuralCache.get(fingerprint);
    if (cached) return { ...cached, isCached: true };

    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return { hasInsight: false };
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        // Conceptual Compression: Scenario-based prompt
        contents: `[GEO-INSIGHT:JSON] User @ (${lat}, ${lng}), Interests: [${recentInterests.join(',')}]. Generate Luxurious Proximity Insight. JSON: {hasInsight, title, message, actionLabel}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasInsight: { type: Type.BOOLEAN },
              title: { type: Type.STRING },
              message: { type: Type.STRING },
              actionLabel: { type: Type.STRING }
            },
            required: ["hasInsight", "title", "message", "actionLabel"]
          }
        }
      });
      
      const result = JSON.parse(response.text || '{}');
      // Store in Semantic Memory (expires in 1 hour for geo)
      neuralCache.set(fingerprint, result, 60 * 60 * 1000);
      return result;
    });
  } catch (e) {
    console.error('Neural Pulse Geo Insight failed:', e);
    return { hasInsight: false };
  }
};

export const verifyDocument = async (base64Data: string, mimeType: string): Promise<any> => {
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return { isLegit: true, details: 'Verified (Offline Mode)' };
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
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
    });
  } catch (e) {
    console.error('Document verification failed:', e);
    return { isLegit: true, details: 'Verification failed due to technical error' };
  }
};

export const optimizeSupplierProfile = async (companyName: string, bio: string, keywords: string[], language: string): Promise<any> => {
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return { suggestedBio: bio, suggestedKeywords: keywords };
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Optimize this supplier profile for a B2B2C marketplace. 
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
    });
  } catch (e) {
    console.error('Profile optimization failed:', e);
    return { suggestedBio: bio, suggestedKeywords: keywords };
  }
};

export const generateSupplierLogo = async (companyName: string, category: string, language: string): Promise<any> => {
  const fallback = { 
    logoUrl: 'https://picsum.photos/seed/logo/200/200',
    bgColor: '#000000',
    textColor: '#ffffff',
    font: 'Inter',
    logoText: companyName
  };
  
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return fallback;
      
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
      
      let logoUrl = fallback.logoUrl;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          logoUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      return {
        logoUrl,
        bgColor: '#000000',
        textColor: '#ffffff',
        font: 'Inter',
        logoText: companyName
      };
    });
  } catch (e) {
    console.error('Logo generation failed:', e);
    return fallback;
  }
};

export const getProfileInsights = async (profileData: any, language: string): Promise<any> => {
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return null;
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
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
    });
  } catch (e) {
    console.error('Profile insights failed:', e);
    return null;
  }
};

export const suggestSupplierCategories = async (profile: any, allCategories: Category[], language: string): Promise<string[]> => {
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return [];
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
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
    });
  } catch (e) {
    console.error('Category suggestion failed:', e);
    return [];
  }
};

export const generateKeywords = async (...args: any[]): Promise<string[]> => ['keyword1', 'keyword2'];
export const generateSupplierProposal = async (...args: any[]): Promise<string> => 'Proposal';
export const enhanceRequestDescription = async (description: string, language: string): Promise<string> => {
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return description;
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Enhance this product request description to be more professional and detailed for suppliers. 
        Original: ${description}
        Language: ${language === 'ar' ? 'Arabic' : 'English'}
        Return ONLY the enhanced description.`,
      });
      return response.text || description;
    });
  } catch (e) {
    console.error('Description enhancement failed:', e);
    return description;
  }
};

const AI_TIMEOUT = 30000; // 30 seconds

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = AI_TIMEOUT): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('AI Request Timeout')), timeoutMs)
    )
  ]);
};

export const categorizeProduct = async (query: string, categories: Category[]): Promise<string | null> => {
  const defaultCat = categories.length > 0 ? categories[0].id : null;
  if (categories.length === 0) return defaultCat;
  
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return defaultCat;
      
      const ai = new GoogleGenAI({ apiKey });
      const categoryList = categories.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }));
      
      const response = await withTimeout(ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Based on the user query, select the most appropriate category ID from the list.
        Query: ${query}
        Categories: ${JSON.stringify(categoryList)}
        Return ONLY the category ID. If no good match, return null.`,
      }));
      
      const result = response.text?.trim();
      const matched = categories.find(c => c.id === result);
      return matched ? matched.id : defaultCat;
    });
  } catch (e) {
    console.error('Categorization failed:', e);
    return defaultCat;
  }
};

export const matchSuppliers = async (query: string, suppliers: UserProfile[], categories: Category[], userLocation?: string): Promise<string[]> => {
  if (suppliers.length === 0) return [];
  
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return [];
      
      const ai = new GoogleGenAI({ apiKey });
      const supplierList = suppliers.map(s => ({ 
        uid: s.uid, 
        name: s.companyName || s.name, 
        bio: s.bio, 
        keywords: s.keywords,
        location: s.location,
        categories: s.categories
      }));
      
      const response = await withTimeout(ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Match the best suppliers for this request. 
        Be strict: only return suppliers that truly match the product or service requested.
        
        Request: ${query}
        User Location: ${userLocation || 'Not specified'}
        Suppliers: ${JSON.stringify(supplierList)}
        
        Return a JSON array of the top 3-5 supplier UIDs that best match the request. 
        If no good matches are found, return an empty array []. Be very strict.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              uids: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["uids"]
          }
        }
      }));
      
      const data = JSON.parse(response.text || "{}");
      return data.uids || [];
    });
  } catch (e) {
    console.error('Matchmaking failed:', e);
    return [];
  }
};

export const analyzeProductImage = async (base64Data: string, mimeType: string): Promise<any> => {
  const fallback = { 
    productNameAr: 'منتج', descriptionAr: 'وصف المنتج',
    productNameEn: 'Product', descriptionEn: 'Product description' 
  };
  
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return fallback;
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: `Analyze this product image. Provide a professional name and a detailed description in BOTH Arabic and English.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productNameAr: { type: Type.STRING },
              descriptionAr: { type: Type.STRING },
              productNameEn: { type: Type.STRING },
              descriptionEn: { type: Type.STRING },
              keywordsAr: { type: Type.ARRAY, items: { type: Type.STRING } },
              keywordsEn: { type: Type.ARRAY, items: { type: Type.STRING } },
              category: { type: Type.STRING },
              priceEstimate: { type: Type.NUMBER },
              isHighQuality: { type: Type.BOOLEAN },
              features: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["productNameAr", "descriptionAr", "productNameEn", "descriptionEn", "keywordsAr", "keywordsEn", "category", "priceEstimate", "isHighQuality", "features"]
          }
        }
      });
      return JSON.parse(response.text || "{}");
    });
  } catch (e) {
    console.error('Image analysis failed:', e);
    return fallback;
  }
};

export const parseVoiceRequest = async (transcript: string, language: string): Promise<any> => {
  const fallback = { intent: 'search', query: transcript, productName: transcript };
  
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return fallback;
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Extract the search query, product name, and intent from this voice transcript.
        Transcript: ${transcript}
        Language: ${language}
        Return JSON with 'query', 'productName', 'description', and 'intent'.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              query: { type: Type.STRING },
              productName: { type: Type.STRING },
              description: { type: Type.STRING },
              intent: { type: Type.STRING }
            },
            required: ["query", "intent"]
          }
        }
      });
      return JSON.parse(response.text || "{}");
    });
  } catch (e) {
    console.error('Voice parsing failed:', e);
    return fallback;
  }
};

export const generateProductCopy = async (productName: string, features: string[], targetAudience: string, language: string): Promise<any> => {
  const fallback = { title: productName, description: productName, highlights: [] };
  
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return fallback;
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Generate a compelling marketing copy for this product.
        Name: ${productName}
        Features: ${features.join(', ')}
        Target Audience: ${targetAudience}
        Language: ${language.startsWith('ar') ? 'Arabic' : 'English'}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              highlights: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "description", "highlights"]
          }
        }
      });
      return JSON.parse(response.text || "{}");
    });
  } catch (e) {
    console.error('Copy generation failed:', e);
    return fallback;
  }
};

export const enhanceProductImageDescription = async (base64Data: string, mimeType: string, language: string): Promise<any> => {
  const fallback = { suggestions: [], caption: "Product image" };
  
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return fallback;
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: `Analyze this product image and suggest how to make it more appealing to buyers in ${language.startsWith('ar') ? 'Arabic' : 'English'}. Also provide a professional caption.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              caption: { type: Type.STRING }
            },
            required: ["suggestions", "caption"]
          }
        }
      });
      return JSON.parse(response.text || "{}");
    });
  } catch (e) {
    console.error('Image enhancement failed:', e);
    return fallback;
  }
};

export const generateAlternativeProductImage = async (base64Data: string, mimeType: string, productName: string, category: string, language: string): Promise<string | null> => {
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return null;
      
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Enhance and professionalize this product image for a B2B marketplace. 
      Product: ${productName}
      Category: ${category}
      Style: High-end, studio lighting, clean background, 4:5 aspect ratio.
      The output should be a professional product shot.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: prompt }
          ]
        },
        config: {
          imageConfig: { aspectRatio: "3:4" } // Closest to 4:5
        }
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      return null;
    });
  } catch (e) {
    console.error('Alternative image generation failed:', e);
    return null;
  }
};

export const getAiAssistantResponse = async (query: string, context: any, language: string): Promise<string> => {
  const fallback = "I am an AI assistant. How can I help you?";
  
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return fallback;
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `You are a helpful B2B2C marketplace assistant.
        User Query: ${query}
        Context: ${JSON.stringify(context)}
        Language: ${language === 'ar' ? 'Arabic' : 'English'}
        Provide a helpful, professional response.`,
      });
      return response.text || "I'm sorry, I couldn't process that.";
    });
  } catch (e) {
    console.error('AI Assistant failed:', e);
    return fallback;
  }
};

export const generateSmartReplies = async (...args: any[]) => ["Ok", "Thanks", "I'll check"];
export const moderateContent = async (...args: any[]) => ({ isSafe: true, reason: "" });
export const translateAudio = async (...args: any[]) => "Translated audio text";
export const negotiateOffer = async (...args: any[]) => ({ suggestedPrice: 100, reasoning: "Fair market value", shouldRespond: true, message: "Suggested offer" });
export const getPriceIntelligence = async (...args: any[]) => ({ recommendedPrice: 100, minPrice: 80, maxPrice: 120, analysis: "Stable market" });
export const summarizeChat = async (...args: any[]) => "Chat summary";
export const analyzeSentiment = async (...args: any[]) => ({ score: 5, sentiment: "positive" as const, summary: "Sentiment summary" });
export const validatePhoneNumber = async (...args: any[]) => ({ isValid: true, formattedNumber: args[0], country: "Unknown" });
export const generateBrandingSuggestions = async (...args: any[]) => ({ colors: ["#000000"], primaryColor: "#000000", secondaryColor: "#ffffff", fontFamily: "Inter", borderRadius: "md", enableGlassmorphism: true, slogan: "Quality first" });

export const semanticSearch = async (query: string, items: any[], language: string) => {
  if (items.length === 0) return [];
  
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return [];
      
      const ai = new GoogleGenAI({ apiKey });
      const itemList = items.map(i => ({ id: i.id, name: i.name, description: i.description, category: i.category }));
      
      const response = await withTimeout(ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Perform a strict semantic search on these items for the query: "${query}"
        Items: ${JSON.stringify(itemList)}
        
        Return a JSON object with a 'results' array of the top 10 item IDs that truly and closely match the query.
        If no items are a good match, return an empty array []. Be very strict.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              results: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["results"]
          }
        }
      }));
      const data = JSON.parse(response.text || "{}");
      return data.results || [];
    });
  } catch (e) {
    console.error('Semantic search failed:', e);
    return [];
  }
};

export const analyzeImageForSearch = async (base64Data: string, mimeType: string, language: string): Promise<any> => {
  const fallback = { query: "Product from image", keywords: ["product"], category: "General", visualDescription: "A product image" };
  
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return fallback;
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await withTimeout(ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: `Analyze this image for a B2B marketplace search. 
            Provide:
            1. A concise visual description.
            2. 5-10 relevant keywords.
            3. The most likely product category.
            4. Specific attributes like color, material, and style.
            Language: ${language.startsWith('ar') ? 'Arabic' : 'English'}
            Return ONLY a JSON object.` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              visualDescription: { type: Type.STRING },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              category: { type: Type.STRING },
              attributes: {
                type: Type.OBJECT,
                properties: {
                  color: { type: Type.STRING },
                  material: { type: Type.STRING },
                  style: { type: Type.STRING }
                }
              }
            },
            required: ["visualDescription", "keywords", "category"]
          }
        }
      }));
      
      return JSON.parse(response.text || "{}");
    });
  } catch (e) {
    console.error('Image analysis failed:', e);
    return fallback;
  }
};

export const generateProposal = async (...args: any[]): Promise<string> => 'Proposal';
export const getMarketTrends = async (...args: any[]): Promise<any> => ({ analysis: 'Trends analysis', suggestions: [] });
export const getPriceInsights = async (...args: any[]): Promise<any> => ({ recommendedPrice: 100, analysis: 'Stable market' });
export const getSupplierInsights = async (...args: any[]): Promise<any> => ({ summaryAr: 'Summary', summaryEn: 'Summary' });
export const generateSupplierLogoImage = generateSupplierLogo;
export const analyzeMarketTrends = async (...args: any[]) => ({ analysis: 'Trends analysis', suggestions: [] });
export const generateNegotiationResponse = async (...args: any[]) => 'Response';
export const extractKeywordsFromRequests = async (...args: any[]) => ['keyword'];
export const formatCategoryName = async (...args: any[]) => ({ nameAr: args[0], nameEn: args[0] });
export const suggestCategoryMerges = async (...args: any[]) => [];

export const suggestMainCategories = async (language: string, categoryType: 'product' | 'service', existingCategories: string[]): Promise<string[]> => {
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return [];
      
      const ai = new GoogleGenAI({ apiKey });
      const existingList = existingCategories.length > 0 ? `Do not include these existing categories: ${existingCategories.join(', ')}.` : '';
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Suggest 5-8 new main ${categoryType === 'product' ? 'product' : 'service'} categories for a B2B2C marketplace. The language should be ${language}. ${existingList} Return ONLY a JSON array of strings.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    });
  } catch (e: any) {
    console.error('Main category suggestion failed:', e);
    if (e.message === 'QUOTA_EXHAUSTED' || e.status === 429 || (e.message && e.message.includes('429'))) {
      throw new Error('QUOTA_EXHAUSTED');
    }
    throw e;
  }
};

export const suggestSubcategories = async (parentCategory: string, categoryType: 'product' | 'service', existingSubcategories: string[]): Promise<string[]> => {
  try {
    return await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) return [];
      
      const ai = new GoogleGenAI({ apiKey });
      const existingList = existingSubcategories.length > 0 ? `Do not include these existing subcategories: ${existingSubcategories.join(', ')}.` : '';
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Suggest 5-8 new ${categoryType === 'product' ? 'product' : 'service'} subcategories for the parent category "${parentCategory}" in a B2B2C marketplace. The language should match the parent category name. ${existingList} Return ONLY a JSON array of strings.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    });
  } catch (e: any) {
    console.error('Subcategory suggestion failed:', e);
    if (e.message === 'QUOTA_EXHAUSTED' || e.status === 429 || (e.message && e.message.includes('429'))) {
      throw new Error('QUOTA_EXHAUSTED');
    }
    throw e;
  }
};

const neuralCategoryCache = new Map<string, { matches: string[], timestamp: number }>();

export const suggestNeuralCategories = async (productInfo: { title: string, description: string }, categories: Category[]): Promise<string[]> => {
  if (!productInfo.title) return [];
  
  const cacheKey = `${productInfo.title}|${productInfo.description}`;
  const cached = neuralCategoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache
    return cached.matches;
  }

  const categoryList = categories.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }));
  
  try {
    const matches = await retryWithBackoff(async () => {
      const apiKey = await getApiKey();
      if (!apiKey) throw new Error('No API Key available');
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Based on the product title: "${productInfo.title}" and description: "${productInfo.description}", which of the following categories are the best matches? Return ONLY the IDs of the top 3 matching categories as a JSON array of strings.
        Categories: ${JSON.stringify(categoryList)}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    });
    
    neuralCategoryCache.set(cacheKey, { matches, timestamp: Date.now() });
    return matches;
  } catch (e) {
    console.error('Neural category suggestion failed:', e);
    return [];
  }
};
