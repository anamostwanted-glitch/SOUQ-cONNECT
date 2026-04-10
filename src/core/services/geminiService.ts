import { GoogleGenAI, Type } from "@google/genai";
import { Category, UserProfile, GeminiApiKey, ProductRequest } from "../types";

import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { neuralCache } from '../utils/neuralCache';
import { handleFirestoreError, OperationType, handleAiError as handleAiErrorCentral } from '../utils/errorHandling';
import { AIResilienceManager } from '../utils/AIResilienceManager';

let cachedKeys: GeminiApiKey[] = [];
let lastFetch = 0;
const exhaustedKeys = new Map<string, number>(); // key -> expiry timestamp
const EXHAUST_COOLDOWN = 60 * 60 * 1000; // 1 hour cooldown for an exhausted key

const markKeyAsExhaustedInFirestore = async (key: string) => {
  try {
    const docRef = doc(db, 'settings', 'gemini_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const keys = docSnap.data().keys || [];
      const updatedKeys = keys.map((k: GeminiApiKey) => {
        if (k.key === key) {
          return { ...k, status: 'exhausted', exhaustedAt: new Date().toISOString() };
        }
        return k;
      });
      // We don't want to block the main thread for this
      // updateDoc(docRef, { keys: updatedKeys }).catch(e => console.error('Failed to update key status:', e));
    }
  } catch (e) {
    console.error('Error marking key as exhausted:', e);
  }
};

export const checkAiStatus = async (): Promise<{ available: boolean; reason?: string }> => {
  const apiKey = await getApiKey();
  if (apiKey) return { available: true };
  
  // If no local key, check if proxy is likely to work
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey) return { available: true };

  return { 
    available: false, 
    reason: 'No API key configured. Please check Settings -> Secrets in AI Studio.' 
  };
};

export const getResponseText = (response: any): string => {
  try {
    return typeof response.text === 'function' ? response.text() : (response.text || '');
  } catch (e) {
    console.warn("Error getting response text:", e);
    return '';
  }
};

/**
 * Consolidates AI error handling to provide consistent logging and UX.
 */
export const handleAiError = (error: any, context: string, shouldThrow: boolean = true) => {
  const isInvalid = error.isInvalidKey || 
    error.message?.includes('API key not valid') || 
    error.message?.includes('API_KEY_INVALID') ||
    error.message?.includes('INVALID_ARGUMENT');
  
  const isQuota = error.status === 429 || 
    error.message?.includes('429') || 
    error.message?.includes('RESOURCE_EXHAUSTED') ||
    error.message?.includes('QUOTA_EXHAUSTED');

  if (isInvalid) {
    console.warn(`${context} failed: Invalid API key. AI features will be limited.`);
  } else if (isQuota) {
    console.warn(`${context} failed: Quota exceeded.`);
  } else {
    handleAiErrorCentral(error, context, shouldThrow);
  }
};

const COST_PER_1K_TOKENS = 0.000125; // Estimated cost for Gemini Flash

const executeProxyCall = async (payload: any) => {
  const response = await fetch('/api/gemini/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (response.status === 413) {
    throw new Error('Image or payload is too large for the server. Please try a smaller image.');
  }

  let data: any;
  try {
    data = await response.json();
  } catch (e) {
    const text = await response.text();
    throw new Error(`Proxy response was not JSON (${response.status} ${response.statusText}): ${text.substring(0, 100)}`);
  }

  if (!response.ok) {
    const errorMessage = data.error || 'Proxy AI request failed';
    const error = new Error(errorMessage);
    if (data.isInvalidKey) {
      (error as any).isInvalidKey = true;
    }
    throw error;
  }
  
  return data;
};

const isFailure = (error: any) => {
  return !(error.isMissingKey || error.isInvalidKey || error.message?.includes('API key not valid') || error.message?.includes('No API key available'));
};

export const callAiJson = async (contents: any, schema: any, model: string = "gemini-3-flash-preview") => {
  return AIResilienceManager.execute(async () => {
    const proxyCall = async () => {
      const data = await executeProxyCall({
        contents: [{ role: 'user', parts: [{ text: typeof contents === 'string' ? contents : JSON.stringify(contents) }] }],
        model,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema
        }
      });
      return JSON.parse(data.text);
    };

    const apiKey = await getApiKey();
    
    if (!apiKey) {
      console.log('DEBUG: No local API key found, falling back to server proxy for callAiJson');
      try {
        return await proxyCall();
      } catch (proxyError: any) {
        handleAiError(proxyError, 'Proxy AI call (callAiJson)');
        const error = new Error(proxyError.message || 'No API key available');
        (error as any).isMissingKey = true;
        (error as any).isInvalidKey = proxyError.isInvalidKey || proxyError.message?.includes('API key not valid');
        throw error;
      }
    }

    try {
      return await retryWithBackoff(async (key) => {
        if (!key) {
          const error = new Error('No API key available');
          (error as any).isMissingKey = true;
          throw error;
        }
        const ai = new GoogleGenAI({ apiKey: key });
        const prompt = typeof contents === 'string' ? contents : JSON.stringify(contents);
        
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            // @ts-ignore
            responseSchema: schema
          }
        });

        const text = response.text;
        if (!text) throw new Error('Empty response from AI');
        return JSON.parse(text);
      });
    } catch (e: any) {
      const isKeyError = e.isMissingKey || e.isInvalidKey || e.message?.includes('API key not valid') || e.message?.includes('No API key available');
      
      if (isKeyError) {
        console.log('DEBUG: Local keys exhausted or invalid during callAiJson, falling back to proxy');
        try {
          return await proxyCall();
        } catch (proxyError: any) {
          console.error('DEBUG: Proxy call also failed:', proxyError.message);
          if (proxyError.message?.includes('API key not valid')) {
            console.error('CRITICAL: Server-side GEMINI_API_KEY is invalid. Please update it in AI Studio Secrets.');
          }
          throw proxyError; // Throw so AIResilienceManager can return the proper fallback
        }
      }
      throw e; // Throw so AIResilienceManager can return the proper fallback
    }
  }, null, 'callAiJson', isFailure); // Fallback null for JSON
};

export const callAiText = async (contents: any, model: string = "gemini-3-flash-preview") => {
  return AIResilienceManager.execute(async () => {
    const proxyCall = async () => {
      const data = await executeProxyCall({
        contents: [{ role: 'user', parts: [{ text: typeof contents === 'string' ? contents : JSON.stringify(contents) }] }],
        model
      });
      return data.text || '';
    };

    const apiKey = await getApiKey();

    if (!apiKey) {
      console.log('DEBUG: No local API key found, falling back to server proxy for callAiText');
      try {
        return await proxyCall();
      } catch (proxyError: any) {
        handleAiError(proxyError, 'Proxy AI call (callAiText)');
        const error = new Error(proxyError.message || 'No API key available');
        (error as any).isMissingKey = true;
        (error as any).isInvalidKey = proxyError.isInvalidKey || proxyError.message?.includes('API key not valid');
        throw error;
      }
    }

    try {
      return await retryWithBackoff(async (key) => {
        if (!key) {
          const error = new Error('No API key available');
          (error as any).isMissingKey = true;
          throw error;
        }
        const ai = new GoogleGenAI({ apiKey: key });
        const prompt = typeof contents === 'string' ? contents : JSON.stringify(contents);
        
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        return response.text || '';
      });
    } catch (e: any) {
      console.error(`DEBUG: callAiText - Error: ${e.message}`);
      if (e.isMissingKey || e.isInvalidKey || e.message?.includes('API key not valid')) {
        console.log('DEBUG: Local keys exhausted or invalid during callAiText, falling back to proxy');
        try {
          return await proxyCall();
        } catch (proxyError: any) {
          console.error('DEBUG: Proxy call also failed:', proxyError.message);
          if (proxyError.message?.includes('API key not valid')) {
            console.error('CRITICAL: Server-side GEMINI_API_KEY is invalid. Please update it in AI Studio Secrets.');
          }
          throw proxyError;
        }
      }
      throw e;
    }
  }, '', 'callAiText', isFailure); // Fallback empty string for text
};

const logUsage = async (feature: string, tokens: number, isCached: boolean = false) => {
  try {
    const user = auth.currentUser;
    await addDoc(collection(db, 'usage_logs'), {
      uid: user?.uid || 'anonymous',
      email: user?.email || 'anonymous',
      feature,
      tokens,
      estimatedCost: isCached ? 0 : (tokens / 1000) * COST_PER_1K_TOKENS,
      isCached,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, 'usage_logs', false);
  }
};

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
    handleFirestoreError(e, OperationType.GET, 'settings/gemini_config', false);
  }
  return cachedKeys;
};

const getApiKey = async () => {
  const activeKeys = await fetchKeys();
  const now = Date.now();
  
  console.log('DEBUG: Active keys from Firestore:', activeKeys ? activeKeys.length : 'null');

  // Filter out keys that are currently marked as exhausted
  const availableKeys = activeKeys ? activeKeys.filter(k => {
    const expiry = exhaustedKeys.get(k.key);
    if (expiry && now < expiry) return false;
    if (expiry && now >= expiry) {
      exhaustedKeys.delete(k.key);
    }
    return true;
  }) : [];

  if (availableKeys.length > 0) {
    // Simple random selection from available keys for load balancing
    const selected = availableKeys[Math.floor(Math.random() * availableKeys.length)];
    console.log('DEBUG: Using key from Firestore');
    return selected.key;
  }
  
  // Fallback to env key if no other keys are available and it's not exhausted
  const envKey = process.env.GEMINI_API_KEY;
  console.log('DEBUG: Env GEMINI_API_KEY exists:', !!envKey);
  if (envKey) {
    const expiry = exhaustedKeys.get(envKey);
    if (!expiry || now >= expiry) {
      console.log('DEBUG: Using key from env');
      return envKey;
    } else {
      console.log('DEBUG: Env key is exhausted');
    }
  }
  
  console.log('DEBUG: No API key found in Firestore or Env');
  return null;
};

async function retryWithBackoff<T>(fn: (apiKey: string | null) => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  let lastUsedKey: string | null = null;

  const execute = async (currentRetries: number, currentDelay: number): Promise<T> => {
    try {
      const apiKey = await getApiKey();
      if (!apiKey) {
        console.error('DEBUG: retryWithBackoff - No API key available');
        const error = new Error('No API key available');
        (error as any).isMissingKey = true;
        throw error;
      }
      lastUsedKey = apiKey;
      return await fn(apiKey);
    } catch (error: any) {
      console.error(`DEBUG: retryWithBackoff - Error: ${error.message}`);
      if (error.isMissingKey) {
        throw error;
      }
      const errorString = error instanceof Error ? error.message : JSON.stringify(error);
      const isQuotaError = 
        error?.status === 429 || 
        error?.error?.code === 429 ||
        error?.status === 'RESOURCE_EXHAUSTED' ||
        error?.message?.includes('quota') || 
        error?.message?.includes('RESOURCE_EXHAUSTED') ||
        error?.message?.includes('429') ||
        errorString.includes('429') ||
        errorString.includes('quota');

      if (isQuotaError && lastUsedKey) {
        console.warn(`Quota exceeded for key ${lastUsedKey.substring(0, 5)}... marking as exhausted.`);
        exhaustedKeys.set(lastUsedKey, Date.now() + EXHAUST_COOLDOWN);
        markKeyAsExhaustedInFirestore(lastUsedKey);
      }
      
      const isInvalidKeyError = 
        error?.message?.includes('INVALID_API_KEY') ||
        error?.message?.includes('API_KEY_INVALID') ||
        error?.message?.includes('API key not valid') ||
        error?.message?.includes('INVALID_ARGUMENT') ||
        errorString.includes('INVALID_API_KEY') ||
        errorString.includes('API_KEY_INVALID') ||
        errorString.includes('API key not valid') ||
        errorString.includes('INVALID_ARGUMENT') ||
        error.isInvalidKey === true;

      if (isQuotaError || isInvalidKeyError) {
        if (lastUsedKey) {
          const isInvalid = isInvalidKeyError;
          console.warn(`Key ${isInvalid ? 'invalid' : 'exhausted'}: ${lastUsedKey.substring(0, 8)}... Marking for cooldown.`);
          // Invalid keys get a much longer cooldown (24 hours) as they are unlikely to fix themselves
          exhaustedKeys.set(lastUsedKey, Date.now() + (isInvalid ? EXHAUST_COOLDOWN * 24 : EXHAUST_COOLDOWN));
        }

        if (currentRetries > 0 && !isInvalidKeyError) {
          console.warn(`Quota exceeded, retrying in ${currentDelay}ms with a potentially different key... (${currentRetries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          return execute(currentRetries - 1, currentDelay * 2);
        }
      }
      throw error;
    }
  };

  return execute(retries, delay);
}

export const translateText = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    return await callAiText(`Translate the following text to ${targetLanguage}. Return ONLY the translated text.\n\n${text}`);
  } catch (e) {
    console.warn('Server translation failed, returning original text:', e);
    return text;
  }
};

export const suggestColorHarmony = async (primaryColor: string): Promise<{ secondaryColor: string; reason: string }> => {
  try {
    const result = await callAiJson(
      `Given the primary brand color ${primaryColor}, suggest a secondary text color that is visually harmonious, maintains high contrast for accessibility (WCAG), and feels professional. Return ONLY a JSON object with 'secondaryColor' (hex) and a brief 'reason'.`,
      {
        type: Type.OBJECT,
        properties: {
          secondaryColor: { type: Type.STRING },
          reason: { type: Type.STRING }
        },
        required: ["secondaryColor", "reason"]
      }
    );

    const tokens = (primaryColor.length + JSON.stringify(result).length) / 4;
    await logUsage('Color Harmony', Math.ceil(tokens));
    return result;
  } catch (e) {
    console.warn('Color harmony suggestion failed via proxy:', e);
    return { secondaryColor: '#ffffff', reason: 'AI service unavailable' };
  }
};

// Removed duplicate preFetchNeuralPulse declaration


// ... existing code ...

export const analyzeUserBehavior = async (profile: UserProfile, recentSearches: string[], recentRequests: ProductRequest[]): Promise<{isMomentOfNeed: boolean; reason: string; recommendedAction: string}> => {
  const fallback = { isMomentOfNeed: false, reason: 'Analysis failed', recommendedAction: 'none' };

  return AIResilienceManager.execute(async () => {
    const prompt = `Analyze the user's recent behavior to determine if they are in a "Moment of Need" for concierge assistance.
      
      User Profile: ${JSON.stringify(profile)}
      Recent Searches: ${JSON.stringify(recentSearches)}
      Recent Requests: ${JSON.stringify(recentRequests.map(r => ({ productName: r.productName, status: r.status })))}
      
      Determine if the user is struggling to find a supplier, is indecisive, or needs expert help.
      
      Return JSON: { isMomentOfNeed: boolean, reason: string, recommendedAction: string }`;

    const result = await callAiJson(
      prompt,
      {
        type: Type.OBJECT,
        properties: {
          isMomentOfNeed: { type: Type.BOOLEAN },
          reason: { type: Type.STRING },
          recommendedAction: { type: Type.STRING }
        },
        required: ["isMomentOfNeed", "reason", "recommendedAction"]
      }
    );
    
    const tokens = (prompt.length + JSON.stringify(result).length) / 4;
    await logUsage('Behavior Analysis', Math.ceil(tokens));
    return result;
  }, fallback, 'Behavior analysis', isFailure);
};

export const analyzeNeuralPulseImage = async (base64Data: string, mimeType: string): Promise<any> => {
  const fallback = { found: false, error: 'Analysis failed' };

  return AIResilienceManager.execute(async () => {
    // 1. Semantic Check (0 Tokens)
    const fingerprint = neuralCache.generateImageFingerprint(base64Data);
    const cached = neuralCache.get(fingerprint);
    if (cached) {
      await logUsage('Neural Pulse Image', 0, true);
      return { ...cached, isCached: true };
    }

    const result = await callAiJson(
      [
        { inlineData: { data: base64Data.replace(/^data:image\/\w+;base64,/, ""), mimeType } },
        { text: "[V-SCAN:JSON] Identify product, specs, 3 categories. Return JSON: {productName, specs, suggestedCategories[], confidence}" }
      ],
      {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING },
          specs: { type: Type.STRING },
          suggestedCategories: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidence: { type: Type.NUMBER }
        },
        required: ["productName", "specs", "suggestedCategories", "confidence"]
      }
    );
    
    const tokens = (base64Data.length / 4 + JSON.stringify(result).length) / 4;
    await logUsage('Neural Pulse Image', Math.ceil(tokens));
    
    // Store in Semantic Memory
    neuralCache.set(fingerprint, result);
    return result;
  }, fallback, 'Neural Pulse Image Analysis', isFailure);
};

export const processNeuralPulseVoice = async (transcript: string): Promise<any> => {
  const fallback = { success: false };

  return AIResilienceManager.execute(async () => {
    // 1. Semantic Check (0 Tokens)
    const fingerprint = neuralCache.generateVoiceFingerprint(transcript);
    const cached = neuralCache.get(fingerprint);
    if (cached) {
      await logUsage('Neural Pulse Voice', 0, true);
      return { ...cached, isCached: true };
    }

    const result = await callAiJson(
      `[V-RFQ:JSON] Map transcript to RFQ: "${transcript}". JSON: {product, quantity, budget, urgency, professionalSummary}`,
      {
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
    );
    
    const tokens = (transcript.length + JSON.stringify(result).length) / 4;
    await logUsage('Neural Pulse Voice', Math.ceil(tokens));
    
    // Store in Semantic Memory
    neuralCache.set(fingerprint, result);
    return result;
  }, fallback, 'Neural Pulse Voice Processing', isFailure);
};

export const generateNeuralPulseGeoInsight = async (lat: number, lng: number, recentInterests: string[]): Promise<any> => {
  try {
    // 1. Semantic Check (0 Tokens) - Bucketed location
    const fingerprint = neuralCache.generateGeoFingerprint(lat, lng, recentInterests);
    const cached = neuralCache.get(fingerprint);
    if (cached) {
      await logUsage('Neural Pulse Geo', 0, true);
      return { ...cached, isCached: true };
    }

    const result = await callAiJson(
      `[GEO-INSIGHT:JSON] User @ (${lat}, ${lng}), Interests: [${recentInterests.join(',')}]. Generate Luxurious Proximity Insight. JSON: {hasInsight, title, message, actionLabel}`,
      {
        type: Type.OBJECT,
        properties: {
          hasInsight: { type: Type.BOOLEAN },
          title: { type: Type.STRING },
          message: { type: Type.STRING },
          actionLabel: { type: Type.STRING }
        },
        required: ["hasInsight", "title", "message", "actionLabel"]
      }
    );
    
    const tokens = (recentInterests.join(',').length + JSON.stringify(result).length) / 4;
    await logUsage('Neural Pulse Geo', Math.ceil(tokens));
    
    // Store in Semantic Memory (expires in 1 hour for geo)
    neuralCache.set(fingerprint, result, 60 * 60 * 1000);
    return result;
  } catch (e: any) {
    handleAiError(e, 'Neural Pulse Geo Insight');
    return { hasInsight: false };
  }
};

export const verifyDocument = async (base64Data: string, mimeType: string): Promise<any> => {
  try {
    const result = await callAiJson(
      [
        { inlineData: { data: base64Data.replace(/^data:image\/\w+;base64,/, ""), mimeType } },
        { text: "Analyze this document. Is it a valid commercial registration, tax certificate, or business license? Provide details and the company name if found." }
      ],
      {
        type: Type.OBJECT,
        properties: {
          isLegit: { type: Type.BOOLEAN },
          details: { type: Type.STRING },
          companyName: { type: Type.STRING }
        },
        required: ["isLegit", "details"]
      }
    );

    const tokens = (base64Data.length / 4 + JSON.stringify(result).length) / 4;
    await logUsage('Document Verification', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Document verification');
    return { isLegit: true, details: 'Verification failed due to technical error' };
  }
};

export const optimizeSupplierProfile = async (companyName: string, bio: string, keywords: string[], language: string): Promise<any> => {
  try {
    const result = await callAiJson(
      `Optimize this supplier profile for a B2B2C marketplace. 
        Company: ${companyName}
        Current Bio: ${bio}
        Current Keywords: ${keywords.join(", ")}
        Language: ${language === 'ar' ? 'Arabic' : 'English'}`,
      {
        type: Type.OBJECT,
        properties: {
          suggestedBio: { type: Type.STRING },
          suggestedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["suggestedBio", "suggestedKeywords"]
      }
    );

    const tokens = (companyName.length + bio.length + JSON.stringify(result).length) / 4;
    await logUsage('Profile Optimization', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Profile optimization');
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
    const prompt = `A professional, modern, minimalist logo for a company named "${companyName}" in the "${category}" industry. 
    The style should be high-end, luxury tech, suitable for a B2B platform. 
    Clean lines, professional color palette. No text except maybe a stylized letter. Language: ${language}`;
    
    const responseText = await callAiText(prompt);
    
    let logoUrl = fallback.logoUrl;
    
    const tokens = (prompt.length + (responseText?.length || 0)) / 4;
    await logUsage('Logo Generation', Math.ceil(tokens));

    return {
      logoUrl,
      bgColor: '#000000',
      textColor: '#ffffff',
      font: 'Inter',
      logoText: companyName
    };
  } catch (e: any) {
    handleAiError(e, 'Logo generation');
    return fallback;
  }
};

export const getProfileInsights = async (profileData: any, language: string): Promise<any> => {
  try {
    const result = await callAiJson(
      `Analyze this user profile and provide strategic business insights. 
      Profile: ${JSON.stringify(profileData)}
      Provide a summary, key strengths, and actionable recommendations.
      Return the response in both Arabic and English.`,
      {
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
    );
    const tokens = (JSON.stringify(profileData).length + JSON.stringify(result).length) / 4;
    await logUsage('Profile Insights', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Profile insights');
    return null;
  }
};

export const suggestSupplierCategories = async (profile: any, allCategories: Category[], language: string): Promise<string[]> => {
  try {
    const result = await callAiJson(
      `Based on this supplier profile, suggest the most relevant categories from the provided list.
      Profile: ${JSON.stringify(profile)}
      Categories: ${JSON.stringify(allCategories.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn })))}`,
      {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    );
    const tokens = (JSON.stringify(profile).length + JSON.stringify(result).length) / 4;
    await logUsage('Category Suggestion', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Category suggestion');
    return [];
  }
};

export const suggestCategoriesFromQuery = async (query: string, categories: Category[], language: string): Promise<string[]> => {
  try {
    const categoryList = categories.map(c => ({ 
      id: c.id, 
      nameAr: c.nameAr, 
      nameEn: c.nameEn,
      parentId: c.parentId 
    }));
    
    const result = await callAiJson(
      `Based on the user query, suggest the most relevant category IDs from the provided list.
      User Query: "${query}"
      Available Categories: ${JSON.stringify(categoryList)}
      
      Return a JSON array of category IDs (strings). Limit to top 5 most relevant matches.
      If no good matches are found, return an empty array [].`,
      {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    );
    
    const tokens = (query.length + JSON.stringify(result).length) / 4;
    await logUsage('Query Category Suggestion', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'AI Category suggestion');
    return [];
  }
};

export const askGemini = async (prompt: string): Promise<string> => {
  try {
    return await callAiText(prompt);
  } catch (e: any) {
    handleAiError(e, 'Gemini query');
    return 'Sorry, I could not process your request.';
  }
};

export const suggestPrice = async (title: string, category: string, language: string): Promise<number> => {
  try {
    const result = await callAiJson(
      `Suggest a realistic price estimate in USD for a product: "${title}" in category "${category}". Return ONLY a JSON object with 'price'.`,
      {
        type: Type.OBJECT,
        properties: {
          price: { type: Type.NUMBER }
        },
        required: ["price"]
      }
    );
    return result.price;
  } catch (e: any) {
    handleAiError(e, 'Price suggestion');
    return 0;
  }
};

export const generateKeywords = async (...args: any[]): Promise<string[]> => ['keyword1', 'keyword2'];
export const generateSupplierProposal = async (...args: any[]): Promise<string> => 'Proposal';
export const enhanceRequestDescription = async (description: string, language: string): Promise<string> => {
  try {
    const result = await callAiText(
      `Enhance this product request description to be more professional and detailed for suppliers. 
      Original: ${description}
      Language: ${language === 'ar' ? 'Arabic' : 'English'}
      Return ONLY the enhanced description.`
    );
    const tokens = (description.length + result.length) / 4;
    await logUsage('Description Enhancement', Math.ceil(tokens));
    return result || description;
  } catch (e: any) {
    handleAiError(e, 'Description enhancement');
    return description;
  }
};

export const generateLoadingScreenSettings = async (description: string): Promise<any> => {
  try {
    const result = await callAiJson(
      `Generate loading screen settings based on this description: "${description}".
      Return a JSON object with the following fields:
      - loaderLogoUrl (string, keep empty if not provided)
      - enableNeuralPulse (boolean)
      - enableOrbitalRings (boolean)
      - enableShimmerEffect (boolean)
      - logoAuraStyle ('solid' | 'gradient' | 'pulse' | 'mesh')
      - animationSpeed ('slow' | 'normal' | 'fast')
      - logoAuraColor (hex string)
      - logoAuraOpacity (number, 0-1)
      - logoAuraSpread (number, 1-3)
      - logoAuraBlur (number, 0-150)
      - loaderBackgroundStyle ('solid' | 'gradient' | 'mesh' | 'animated')
      - loaderLogoShape ('square' | 'circle' | 'squircle')
      - loaderLogoAnimation ('none' | 'bounce' | 'rotate' | 'scale' | 'float')
      - loaderBackgroundColor (hex string)
      - loaderProgressBarColor (hex string)
      - loaderCenterText (string)
      - loaderStatusTextAr (string)
      - loaderStatusTextEn (string)
      - loaderFooterTextAr (string)
      - loaderFooterTextEn (string)`,
      {
        type: Type.OBJECT,
        properties: {
          loaderLogoUrl: { type: Type.STRING },
          enableNeuralPulse: { type: Type.BOOLEAN },
          enableOrbitalRings: { type: Type.BOOLEAN },
          enableShimmerEffect: { type: Type.BOOLEAN },
          logoAuraStyle: { type: Type.STRING, enum: ['solid', 'gradient', 'pulse', 'mesh'] },
          animationSpeed: { type: Type.STRING, enum: ['slow', 'normal', 'fast'] },
          logoAuraColor: { type: Type.STRING },
          logoAuraOpacity: { type: Type.NUMBER },
          logoAuraSpread: { type: Type.NUMBER },
          logoAuraBlur: { type: Type.NUMBER },
          loaderBackgroundStyle: { type: Type.STRING, enum: ['solid', 'gradient', 'mesh', 'animated'] },
          loaderLogoShape: { type: Type.STRING, enum: ['square', 'circle', 'squircle'] },
          loaderLogoAnimation: { type: Type.STRING, enum: ['none', 'bounce', 'rotate', 'scale', 'float'] },
          loaderBackgroundColor: { type: Type.STRING },
          loaderProgressBarColor: { type: Type.STRING },
          loaderCenterText: { type: Type.STRING },
          loaderStatusTextAr: { type: Type.STRING },
          loaderStatusTextEn: { type: Type.STRING },
          loaderFooterTextAr: { type: Type.STRING },
          loaderFooterTextEn: { type: Type.STRING }
        },
        required: ["enableNeuralPulse", "enableOrbitalRings", "enableShimmerEffect", "logoAuraStyle", "animationSpeed", "logoAuraColor", "logoAuraOpacity", "logoAuraSpread", "logoAuraBlur", "loaderBackgroundStyle", "loaderLogoShape", "loaderLogoAnimation", "loaderBackgroundColor", "loaderProgressBarColor", "loaderCenterText", "loaderStatusTextAr", "loaderStatusTextEn", "loaderFooterTextAr", "loaderFooterTextEn"]
      }
    );
    
    const tokens = (description.length + JSON.stringify(result).length) / 4;
    await logUsage('Loading Screen Generation', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Loading screen generation');
    return null;
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
    const categoryList = categories.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }));
    
    const result = await callAiJson(
      `Based on the user query, select the most appropriate category ID from the list.
      Query: ${query}
      Categories: ${JSON.stringify(categoryList)}
      Return ONLY a JSON object with 'categoryId'. If no good match, return null.`,
      {
        type: Type.OBJECT,
        properties: {
          categoryId: { type: Type.STRING }
        },
        required: ["categoryId"]
      }
    );
    
    const matched = categories.find(c => c.id === result.categoryId);
    const tokens = (query.length + JSON.stringify(result).length) / 4;
    await logUsage('Product Categorization', Math.ceil(tokens));
    return matched ? matched.id : defaultCat;
  } catch (e: any) {
    handleAiError(e, 'Categorization');
    return defaultCat;
  }
};

export const matchSuppliers = async (query: string, suppliers: UserProfile[], categories: Category[], userLocation?: string): Promise<{uids: string[], reasoning: string}> => {
  if (suppliers.length === 0) return {uids: [], reasoning: 'No suppliers provided'};
  
  try {
    const supplierList = suppliers.map(s => ({ 
      uid: s.uid, 
      name: s.companyName || s.name, 
      bio: s.bio, 
      keywords: s.keywords,
      location: s.location,
      categories: s.categories
    }));

    const data = await callAiJson(
      `Match the best suppliers for this request. 
        Be strict: only return suppliers that truly match the product or service requested.
        
        Request: ${query}
        User Location: ${userLocation || 'Not specified'}
        Suppliers: ${JSON.stringify(supplierList)}
        
        Return a JSON object with:
        - uids: Array of top 3-5 supplier UIDs that best match the request.
        - reasoning: A brief explanation of why these suppliers were chosen.
        
        If no good matches are found, return an empty array for uids. Be very strict.`,
      {
        type: Type.OBJECT,
        properties: {
          uids: { type: Type.ARRAY, items: { type: Type.STRING } },
          reasoning: { type: Type.STRING }
        },
        required: ["uids", "reasoning"]
      }
    );

    return { uids: data.uids || [], reasoning: data.reasoning || '' };
  } catch (e: any) {
    handleAiError(e, 'Matchmaking');
    return { uids: [], reasoning: 'Matchmaking failed' };
  }
};

export const analyzeProductImage = async (base64Data: string, mimeType: string): Promise<any> => {
  const proxyCall = async () => {
    const prompt = `
      Analyze this product image and provide a detailed JSON response with the following fields:
      - productNameEn: Product name in English
      - productNameAr: Product name in Arabic
      - descriptionEn: A compelling product description in English
      - descriptionAr: A compelling product description in Arabic
      - category: One of these categories: Electronics, Fashion, Home, Beauty, Sports, Toys, Other
      - priceEstimate: A realistic price estimate in USD (number)
      - isHighQuality: Boolean indicating if the image is high quality
      - features: Array of 3-5 key product features (strings)
      - keywordsEn: Array of 5-10 SEO keywords in English
      - keywordsAr: Array of 5-10 SEO keywords in Arabic

      Return ONLY the JSON object.
    `;

    const data = await executeProxyCall({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64Data.replace(/^data:image\/\w+;base64,/, ""), mimeType } },
          { text: prompt },
        ],
      }],
      model: "gemini-3-flash-preview",
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(data.text);
  };

  const apiKey = await getApiKey();

  if (!apiKey) {
    console.log('DEBUG: No local API key found, falling back to server proxy for analyzeProductImage');
    try {
      const suggestion = await proxyCall();
      await logUsage('Product Image Analysis Proxy', 2000); 
      return suggestion;
    } catch (proxyError: any) {
      handleAiError(proxyError, 'Proxy Image Analysis');
      return { 
        productNameAr: '', descriptionAr: '',
        productNameEn: '', descriptionEn: '',
        category: '', priceEstimate: 0,
        isHighQuality: false, features: [],
        keywordsAr: [], keywordsEn: [],
        error: proxyError.message
      };
    }
  }

  try {
    return await retryWithBackoff(async (key) => {
      if (!key) {
        const error = new Error('No API key available');
        (error as any).isMissingKey = true;
        throw error;
      }
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = `
        Analyze this product image and provide a detailed JSON response with the following fields:
        - productNameEn: Product name in English
        - productNameAr: Product name in Arabic
        - descriptionEn: A compelling product description in English
        - descriptionAr: A compelling product description in Arabic
        - category: One of these categories: Electronics, Fashion, Home, Beauty, Sports, Toys, Other
        - priceEstimate: A realistic price estimate in USD (number)
        - isHighQuality: Boolean indicating if the image is high quality
        - features: Array of 3-5 key product features (strings)
        - keywordsEn: Array of 5-10 SEO keywords in English
        - keywordsAr: Array of 5-10 SEO keywords in Arabic

        Return ONLY the JSON object.
      `;

      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { data: cleanBase64, mimeType } },
            { text: prompt },
          ],
        }],
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text;
      if (!responseText) throw new Error('Empty response from AI');
      const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const suggestion = JSON.parse(jsonStr);
      
      await logUsage('Product Image Analysis', 2000); // Fixed cost for image analysis
      return suggestion;
    });
  } catch (e: any) {
    if (e.isMissingKey) {
      console.log('DEBUG: Local keys exhausted during analyzeProductImage, falling back to proxy');
      try {
        return await proxyCall();
      } catch (proxyError: any) {
        handleAiError(proxyError, 'Proxy Image Analysis fallback');
      }
    }
    handleAiError(e, 'Image analysis');
    return { 
      productNameAr: '', descriptionAr: '',
      productNameEn: '', descriptionEn: '',
      category: '', priceEstimate: 0,
      isHighQuality: false, features: [],
      keywordsAr: [], keywordsEn: [],
      error: e.message
    };
  }
};

export const generateAlternativeProductImage = async (base64Image: string, mimeType: string, title: string, category: string): Promise<string | null> => {
  const proxyCall = async () => {
    const prompt = `A professional, close-up photography of this product. Place it in the center of the picture on elegant interior design elements. Highlight its uses and applications. Product title: ${title || 'Product'}. Category: ${category || 'General'}. High quality, studio lighting, highly detailed. IMPORTANT: Do not include any text, words, labels, or watermarks in the image. The image should be clean and professional.`;

    const data = await executeProxyCall({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64Image.replace(/^data:image\/\w+;base64,/, ""), mimeType } },
          { text: prompt },
        ],
      }],
      model: "gemini-3-flash-preview"
    });

    // Since Gemini Flash doesn't generate images, we return a placeholder based on the description
    await logUsage('Product Image Generation Proxy', 5000);
    return `https://picsum.photos/seed/${encodeURIComponent(title)}/800/1000`;
  };

  const apiKey = await getApiKey();

  if (!apiKey) {
    console.log('DEBUG: No local API key found, falling back to server proxy for generateAlternativeProductImage');
    try {
      return await proxyCall();
    } catch (proxyError: any) {
      handleAiError(proxyError, 'Proxy Image Generation');
      return null;
    }
  }

  try {
    return await retryWithBackoff(async (key) => {
      if (!key) {
        const error = new Error('No API key available');
        (error as any).isMissingKey = true;
        throw error;
      }
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = `A professional, close-up photography of this product. Place it in the center of the picture on elegant interior design elements. Highlight its uses and applications. Product title: ${title || 'Product'}. Category: ${category || 'General'}. High quality, studio lighting, highly detailed. IMPORTANT: Do not include any text, words, labels, or watermarks in the image. The image should be clean and professional.`;

      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            { inlineData: { data: cleanBase64, mimeType: mimeType } },
            { text: prompt },
          ],
        },
      });

      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content.parts || []) {
          if (part.inlineData) {
            await logUsage('Product Image Generation', 5000); // Higher cost for generation
            return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          }
        }
      }
      return null;
    });
  } catch (e: any) {
    if (e.isMissingKey) {
      console.log('DEBUG: Local keys exhausted during generateAlternativeProductImage, falling back to proxy');
      try {
        return await proxyCall();
      } catch (proxyError: any) {
        handleAiError(proxyError, 'Proxy Image Generation fallback');
      }
    }
    handleAiError(e, 'Image generation');
    return null;
  }
};

export const parseVoiceRequest = async (transcript: string, language: string): Promise<any> => {
  const fallback = { intent: 'search', query: transcript, productName: transcript };
  
  try {
    const result = await callAiJson(
      `Extract the search query, product name, and intent from this voice transcript.
      Transcript: ${transcript}
      Language: ${language}
      Return JSON with 'query', 'productName', 'description', and 'intent'.`,
      {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING },
          productName: { type: Type.STRING },
          description: { type: Type.STRING },
          intent: { type: Type.STRING }
        },
        required: ["query", "intent"]
      }
    );
    const tokens = (transcript.length + JSON.stringify(result).length) / 4;
    await logUsage('Voice Request Parsing', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Voice parsing');
    return fallback;
  }
};

export const analyzeWithdrawalFraud = async (withdrawal: any, userProfile: any, recentWithdrawals: any[]): Promise<any> => {
  try {
    const prompt = `Analyze this withdrawal request for potential fraud in a referral rewards system.
      
      Withdrawal Data: ${JSON.stringify(withdrawal)}
      User Profile: ${JSON.stringify(userProfile)}
      Recent User Withdrawals: ${JSON.stringify(recentWithdrawals)}
      
      Check for:
      1. Rapid point accumulation.
      2. Multiple withdrawals in short time.
      3. Suspicious referral patterns (e.g., many referrals from same IP or device - if available).
      4. Unusual withdrawal amounts.
      
      Return a JSON object with:
      - fraudScore: 0 to 100 (100 is definitely fraud)
      - analysis: Detailed explanation of the score
      - status: 'safe', 'suspicious', or 'high_risk'
      - recommendations: Array of suggested actions for the admin.`;

    const result = await callAiJson(
      prompt,
      {
        type: Type.OBJECT,
        properties: {
          fraudScore: { type: Type.NUMBER },
          analysis: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['safe', 'suspicious', 'high_risk'] },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["fraudScore", "analysis", "status", "recommendations"]
      }
    );
    
    const tokens = (prompt.length + JSON.stringify(result).length) / 4;
    await logUsage('Fraud Analysis', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Fraud analysis');
    return { fraudScore: 0, analysis: 'Analysis failed due to technical error', status: 'safe' };
  }
};

export const analyzeSystemPulse = async (systemData: any, language: string): Promise<any> => {
  try {
    const prompt = `Analyze the current state of this B2B2C marketplace system.
      
      System Data Summary: ${JSON.stringify(systemData)}
      Language: ${language === 'ar' ? 'Arabic' : 'English'}
      
      Provide a "Neural Pulse" analysis:
      1. Overall Status: 'stable', 'active', 'warning', or 'critical'.
      2. A short, punchy headline about the system's current "vibe".
      3. 2-3 specific AI-driven insights or alerts.
      4. A "Growth Score" (0-100).
      
      Return JSON: { status, headline, insights[], growthScore, recommendations[] }`;

    const result = await callAiJson(
      prompt,
      {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ['stable', 'active', 'warning', 'critical'] },
          headline: { type: Type.STRING },
          insights: { type: Type.ARRAY, items: { type: Type.STRING } },
          growthScore: { type: Type.NUMBER },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["status", "headline", "insights", "growthScore"]
      }
    );
    
    const tokens = (prompt.length + JSON.stringify(result).length) / 4;
    await logUsage('System Pulse', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    if (e.isMissingKey) {
      console.warn('System Pulse analysis skipped: No API key available');
    } else {
      handleAiError(e, 'System Pulse analysis');
    }
    return { status: 'stable', headline: 'System Stable', insights: [], growthScore: 100 };
  }
};

export const analyzeAdminSearch = async (query: string, context: any, language: string): Promise<any> => {
  try {
    const prompt = `Analyze this admin search query for a B2B2C marketplace.
    
    Query: "${query}"
    Context (Available Tabs): ${JSON.stringify(context.tabs)}
    Language: ${language === 'ar' ? 'Arabic' : 'English'}
    
    Determine the intent and target of the search.
    Intents: 'navigate' (go to a tab), 'filter' (search with specific criteria), 'action' (perform a task).
    Targets: 'users', 'requests', 'categories', 'withdrawals', 'suppliers', 'ambassadors'.
    
    Return JSON: { intent, target, filters: { role, status, minAmount, maxAmount, dateRange, searchString }, message }`;

    const result = await callAiJson(prompt, {
      type: Type.OBJECT,
      properties: {
        intent: { type: Type.STRING },
        target: { type: Type.STRING },
        filters: { 
          type: Type.OBJECT,
          properties: {
            role: { type: Type.STRING },
            status: { type: Type.STRING },
            minAmount: { type: Type.NUMBER },
            maxAmount: { type: Type.NUMBER },
            dateRange: { type: Type.STRING },
            searchString: { type: Type.STRING }
          }
        },
        message: { type: Type.STRING }
      },
      required: ["intent", "target", "filters"]
    });

    const tokens = (query.length + JSON.stringify(result).length) / 4;
    await logUsage('Admin Search', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Admin Search analysis');
    return { intent: 'filter', target: 'users', filters: { searchString: query } };
  }
};

export const generateProductCopy = async (productName: string, features: string[], targetAudience: string, language: string): Promise<any> => {
  const fallback = { title: productName, description: productName, highlights: [] };
  
  try {
    const result = await callAiJson(
      `Generate a compelling marketing copy for this product.
      Name: ${productName}
      Features: ${features.join(', ')}
      Target Audience: ${targetAudience}
      Language: ${language.startsWith('ar') ? 'Arabic' : 'English'}`,
      {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          highlights: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["title", "description", "highlights"]
      }
    );
    const tokens = (productName.length + features.join(',').length + JSON.stringify(result).length) / 4;
    await logUsage('Product Copy Generation', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Copy generation');
    return fallback;
  }
};

export const enhanceProductImageDescription = async (base64Data: string, mimeType: string, language: string): Promise<any> => {
  const fallback = { suggestions: [], caption: "Product image" };
  
  try {
    const result = await callAiJson(
      {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: `Analyze this product image and suggest how to make it more appealing to buyers in ${language.startsWith('ar') ? 'Arabic' : 'English'}. Also provide a professional caption.` }
        ]
      },
      {
        type: Type.OBJECT,
        properties: {
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          caption: { type: Type.STRING }
        },
        required: ["suggestions", "caption"]
      }
    );
    const tokens = (base64Data.length + JSON.stringify(result).length) / 4;
    await logUsage('Image Enhancement', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Image enhancement');
    return fallback;
  }
};

export const getAiAssistantResponse = async (query: string, context: any, language: string): Promise<string> => {
  const fallback = "I am an AI assistant. How can I help you?";
  
  try {
    const result = await callAiText(
      `You are a helpful B2B2C marketplace assistant.
      User Query: ${query}
      Context: ${JSON.stringify(context)}
      Language: ${language === 'ar' ? 'Arabic' : 'English'}
      Provide a helpful, professional response.`
    );
    const tokens = (query.length + JSON.stringify(context).length + result.length) / 4;
    await logUsage('AI Assistant', Math.ceil(tokens));
    return result || "I'm sorry, I couldn't process that.";
  } catch (e: any) {
    handleAiError(e, 'AI Assistant');
    return fallback;
  }
};

export const generateSmartReplies = async (...args: any[]) => ["Ok", "Thanks", "I'll check"];
export const moderateContent = async (...args: any[]) => ({ isSafe: true, reason: "" });
export const translateAudio = async (...args: any[]) => "Translated audio text";
export const negotiateOffer = async (...args: any[]) => ({ suggestedPrice: 100, reasoning: "Fair market value", shouldRespond: true, message: "Suggested offer" });
export const getPriceIntelligence = async (...args: any[]) => ({ recommendedPrice: 100, minPrice: 80, maxPrice: 120, analysis: "Stable market" });
export const summarizeChat = async (transcript: string, language: string): Promise<string> => {
  const fallback = "Chat summary";
  try {
    const responseText = await callAiText(
      `Summarize the following chat transcript in a concise way.
        Transcript: ${transcript}
        Language: ${language === 'ar' ? 'Arabic' : 'English'}
        Return ONLY the summary text.`
    );

    const tokens = (transcript.length + (responseText?.length || 0)) / 4;
    await logUsage('Chat Summarization', Math.ceil(tokens));
    return responseText || fallback;
  } catch (e: any) {
    handleAiError(e, 'Chat summarization');
    return fallback;
  }
};

export const analyzeChatRisk = async (transcript: string, language: string): Promise<{
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: { type: string; descriptionAr: string; descriptionEn: string; confidence: number }[];
  summaryAr: string;
  summaryEn: string;
  recommendationAr: string;
  recommendationEn: string;
}> => {
  try {
    const prompt = `[RISK-RADAR:JSON] Analyze this chat transcript for business risks (disputes, fraud, off-platform payment, harassment, slow response).
      Transcript: "${transcript}"
      
      Return JSON: {
        riskScore: 0-100,
        riskLevel: "low"|"medium"|"high"|"critical",
        flags: [{type, descriptionAr, descriptionEn, confidence}],
        summaryAr,
        summaryEn,
        recommendationAr,
        recommendationEn
      }`;

    const result = await callAiJson(prompt, {
      type: Type.OBJECT,
      properties: {
        riskScore: { type: Type.NUMBER },
        riskLevel: { type: Type.STRING },
        flags: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              descriptionAr: { type: Type.STRING },
              descriptionEn: { type: Type.STRING },
              confidence: { type: Type.NUMBER }
            },
            required: ["type", "descriptionAr", "descriptionEn", "confidence"]
          }
        },
        summaryAr: { type: Type.STRING },
        summaryEn: { type: Type.STRING },
        recommendationAr: { type: Type.STRING },
        recommendationEn: { type: Type.STRING }
      },
      required: ["riskScore", "riskLevel", "flags", "summaryAr", "summaryEn", "recommendationAr", "recommendationEn"]
    });

    const tokens = (transcript.length + JSON.stringify(result).length) / 4;
    await logUsage('Chat Risk Analysis', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Chat risk analysis');
    return {
      riskScore: 0,
      riskLevel: 'low',
      flags: [],
      summaryAr: 'فشل التحليل',
      summaryEn: 'Analysis failed',
      recommendationAr: 'لا توجد توصيات',
      recommendationEn: 'No recommendations'
    };
  }
};
export const analyzeSentiment = async (...args: any[]) => ({ score: 5, sentiment: "positive" as const, summary: "Sentiment summary" });
export const validatePhoneNumber = async (...args: any[]) => ({ isValid: true, formattedNumber: args[0], country: "Unknown" });
export const generateBrandingSuggestions = async (...args: any[]) => ({ colors: ["#000000"], primaryColor: "#000000", secondaryColor: "#ffffff", fontFamily: "Inter", borderRadius: "md", enableGlassmorphism: true, slogan: "Quality first" });

export const semanticSearch = async (query: string, items: any[], language: string) => {
  if (items.length === 0) return [];
  
  try {
    const itemList = items.map(i => ({ id: i.id, name: i.name, description: i.description, category: i.category }));
    
    const prompt = `Perform a strict semantic search on these items for the query: "${query}"
      Items: ${JSON.stringify(itemList)}
      
      Return a JSON object with a 'results' array of the top 10 item IDs that truly and closely match the query.
      If no items are a good match, return an empty array []. Be very strict.`;

    const data = await callAiJson(prompt, {
      type: Type.OBJECT,
      properties: {
        results: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["results"]
    });
    
    // Log usage
    const tokens = (query.length + JSON.stringify(itemList).length + JSON.stringify(data).length) / 4;
    await logUsage('Semantic Search', Math.ceil(tokens));

    return data.results || [];
  } catch (e: any) {
    handleAiError(e, 'Semantic search');
    return [];
  }
};

export const analyzeImageForSearch = async (base64Data: string, mimeType: string, language: string): Promise<any> => {
  const fallback = { query: "Product from image", keywords: ["product"], category: "General", visualDescription: "A product image" };
  
  const proxyCall = async () => {
    const prompt = `Analyze this image for a B2B marketplace search. 
      Provide:
      1. A concise visual description.
      2. 5-10 relevant keywords.
      3. The most likely product category.
      4. Specific attributes like color, material, and style.
      Language: ${language.startsWith('ar') ? 'Arabic' : 'English'}
      Return ONLY a JSON object.`;

    const data = await executeProxyCall({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64Data.replace(/^data:image\/\w+;base64,/, ""), mimeType } },
          { text: prompt },
        ],
      }],
      model: "gemini-3-flash-preview",
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(data.text);
  };

  const apiKey = await getApiKey();

  if (!apiKey) {
    console.log('DEBUG: No local API key found, falling back to server proxy for analyzeImageForSearch');
    try {
      const data = await proxyCall();
      await logUsage('Image Search Analysis Proxy', 2000);
      return data;
    } catch (proxyError: any) {
      handleAiError(proxyError, 'Proxy Image Search Analysis');
      return fallback;
    }
  }

  try {
    return await retryWithBackoff(async (key) => {
      if (!key) {
        const error = new Error('No API key available');
        (error as any).isMissingKey = true;
        throw error;
      }
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = `Analyze this image for a B2B marketplace search. 
        Provide:
        1. A concise visual description.
        2. 5-10 relevant keywords.
        3. The most likely product category.
        4. Specific attributes like color, material, and style.
        Language: ${language.startsWith('ar') ? 'Arabic' : 'English'}
        Return ONLY a JSON object.`;

      const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { data: cleanBase64, mimeType } },
            { text: prompt },
          ],
        }],
        config: {
          responseMimeType: "application/json",
          // @ts-ignore
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
        },
      });
      
      const responseText = response.text;
      if (!responseText) throw new Error('Empty response from AI');
      const data = JSON.parse(responseText);

      // Log usage
      const tokens = (1000 + JSON.stringify(data).length) / 4; // Image estimation
      await logUsage('Image Search Analysis', Math.ceil(tokens));

      return data;
    });
  } catch (e: any) {
    if (e.isMissingKey) {
      console.log('DEBUG: Local keys exhausted during analyzeImageForSearch, falling back to proxy');
      try {
        return await proxyCall();
      } catch (proxyError: any) {
        handleAiError(proxyError, 'Proxy Image Search Analysis fallback');
      }
    }
    handleAiError(e, 'Image analysis');
    return fallback;
  }
};

export const generateProposal = async (...args: any[]): Promise<string> => 'Proposal';
export const getMarketTrends = async (...args: any[]): Promise<any> => ({ analysis: 'Trends analysis', suggestions: [] });
export const getPriceInsights = async (...args: any[]): Promise<any> => ({ recommendedPrice: 100, analysis: 'Stable market' });
export const getSupplierInsights = async (...args: any[]): Promise<any> => ({ summaryAr: 'Summary', summaryEn: 'Summary' });
export const generateSupplierLogoImage = generateSupplierLogo;
export const analyzeMarketTrends = async (searches: string[], summaries: string[], language: string): Promise<any> => {
  const fallback = { analysis: 'Trends analysis', suggestions: [] };
  try {
    const prompt = `Analyze the following marketplace activity to identify current trends and provide strategic insights.
      Recent Searches: ${JSON.stringify(searches)}
      Chat Summaries: ${JSON.stringify(summaries)}
      Language: ${language === 'ar' ? 'Arabic' : 'English'}
      Provide a detailed analysis of what products/services are trending, what's missing, and recommendations for the platform.
      Return ONLY a JSON object with 'analysis' (string) and 'suggestions' (array of strings).`;

    const result = await callAiJson(prompt, {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING },
        suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["analysis", "suggestions"]
    });

    const tokens = (searches.join(',').length + summaries.join(',').length + JSON.stringify(result).length) / 4;
    await logUsage('Market Trends Analysis', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Market analysis');
    return fallback;
  }
};
export const analyzeSupplierDocument = async (
  base64Image: string,
  mimeType: string,
  language: string
): Promise<any> => {
  const fallback = { 
    isValid: false, 
    confidence: 0,
    extractedData: {},
    analysisAr: 'فشل تحليل المستند.', 
    analysisEn: 'Document analysis failed.',
    recommendationAr: 'يرجى التحقق يدوياً.',
    recommendationEn: 'Please verify manually.'
  };

  const proxyCall = async () => {
    const prompt = `Analyze this commercial document (Commercial Registration, Tax ID, or License) for a supplier verification.
      Language: ${language === 'ar' ? 'Arabic' : 'English'}
      
      Extract the following information if available:
      - Company Name
      - Registration Number
      - Expiry Date
      - Activity/Scope
      
      Evaluate if the document looks authentic and valid.
      Return ONLY a JSON object with:
      - isValid (boolean)
      - confidence (number 0-100)
      - extractedData (object with fields above)
      - analysisAr (string)
      - analysisEn (string)
      - recommendationAr (string)
      - recommendationEn (string)
      - trustScore (number 0-100)`;

    const data = await executeProxyCall({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: base64Image.replace(/^data:image\/\w+;base64,/, ""), mimeType } },
          { text: prompt },
        ],
      }],
      model: "gemini-3-flash-preview",
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(data.text);
  };

  const apiKey = await getApiKey();

  if (!apiKey) {
    console.log('DEBUG: No local API key found, falling back to server proxy for analyzeSupplierDocument');
    try {
      const data = await proxyCall();
      await logUsage('Supplier Document Analysis Proxy', 2000);
      return data;
    } catch (proxyError: any) {
      handleAiError(proxyError, 'Proxy Document Analysis');
      return fallback;
    }
  }

  try {
    return await retryWithBackoff(async (key) => {
      if (!key) {
        const error = new Error('No API key available');
        (error as any).isMissingKey = true;
        throw error;
      }
      const ai = new GoogleGenAI({ apiKey: key });
      const prompt = `Analyze this commercial document (Commercial Registration, Tax ID, or License) for a supplier verification.
        Language: ${language === 'ar' ? 'Arabic' : 'English'}
        
        Extract the following information if available:
        - Company Name
        - Registration Number
        - Expiry Date
        - Activity/Scope
        
        Evaluate if the document looks authentic and valid.
        Return ONLY a JSON object with:
        - isValid (boolean)
        - confidence (number 0-100)
        - extractedData (object with fields above)
        - analysisAr (string)
        - analysisEn (string)
        - recommendationAr (string)
        - recommendationEn (string)
        - trustScore (number 0-100)`;

      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user',
          parts: [
            { inlineData: { data: cleanBase64, mimeType } },
            { text: prompt },
          ],
        }],
        config: {
          responseMimeType: "application/json",
          // @ts-ignore
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
              extractedData: {
                type: Type.OBJECT,
                properties: {
                  companyName: { type: Type.STRING },
                  registrationNumber: { type: Type.STRING },
                  expiryDate: { type: Type.STRING },
                  activity: { type: Type.STRING }
                }
              },
              analysisAr: { type: Type.STRING },
              analysisEn: { type: Type.STRING },
              recommendationAr: { type: Type.STRING },
              recommendationEn: { type: Type.STRING },
              trustScore: { type: Type.NUMBER }
            },
            required: ["isValid", "confidence", "analysisAr", "analysisEn", "recommendationAr", "recommendationEn", "trustScore"]
          }
        },
      });
      
      const responseText = response.text;
      if (!responseText) throw new Error('Empty response from AI');
      const data = JSON.parse(responseText);
      await logUsage('Supplier Document Analysis', 2000); // Fixed cost for image analysis
      return data;
    });
  } catch (e: any) {
    if (e.isMissingKey) {
      console.log('DEBUG: Local keys exhausted during analyzeSupplierDocument, falling back to proxy');
      try {
        return await proxyCall();
      } catch (proxyError: any) {
        handleAiError(proxyError, 'Proxy Document Analysis fallback');
      }
    }
    handleAiError(e, 'Document analysis');
    return fallback;
  }
};

export const analyzeSupplyDemandGap = async (
  categories: Category[],
  requests: ProductRequest[],
  suppliers: UserProfile[],
  language: string
): Promise<any> => {
  const fallback = { 
    analysisAr: 'تحليل الفجوة غير متاح حالياً.', 
    analysisEn: 'Gap analysis is currently unavailable.',
    gaps: [],
    recommendationsAr: [],
    recommendationsEn: []
  };

  try {
    return await retryWithBackoff(async (apiKey) => {
      // Prepare data for AI
      const categoryData = categories.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }));
      const requestData = requests.map(r => ({ categoryId: r.categoryId, status: r.status }));
      const supplierData = suppliers.map(s => ({ categories: s.categories || [] }));

      const prompt = `Analyze the supply and demand gap in our B2B marketplace.
        Categories: ${JSON.stringify(categoryData)}
        Product Requests (Demand): ${JSON.stringify(requestData)}
        Suppliers (Supply): ${JSON.stringify(supplierData)}
        Language: ${language === 'ar' ? 'Arabic' : 'English'}

        Identify categories with high demand (many requests) but low supply (few suppliers).
        Provide a detailed analysis, a list of specific gaps, and strategic recommendations.
        Return ONLY a JSON object with:
        - analysisAr (string)
        - analysisEn (string)
        - gaps (array of objects with { categoryId: string, demandScore: number, supplyScore: number, gapLevel: 'low'|'medium'|'high' })
        - recommendationsAr (array of strings)
        - recommendationsEn (array of strings)`;

      const result = await callAiJson(prompt, {
        type: Type.OBJECT,
        properties: {
          analysisAr: { type: Type.STRING },
          analysisEn: { type: Type.STRING },
          gaps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                categoryId: { type: Type.STRING },
                demandScore: { type: Type.NUMBER },
                supplyScore: { type: Type.NUMBER },
                gapLevel: { type: Type.STRING }
              },
              required: ["categoryId", "demandScore", "supplyScore", "gapLevel"]
            }
          },
          recommendationsAr: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendationsEn: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["analysisAr", "analysisEn", "gaps", "recommendationsAr", "recommendationsEn"]
      });

      await logUsage('Supply-Demand Gap Analysis', Math.ceil((JSON.stringify(categoryData).length + JSON.stringify(requestData).length + JSON.stringify(supplierData).length) / 4));
      return result;
    });
  } catch (e: any) {
    handleAiError(e, 'Gap analysis');
    return fallback;
  }
};
export const generateNegotiationResponse = async (...args: any[]) => 'Response';
export const extractKeywordsFromRequests = async (...args: any[]) => ['keyword'];
export const formatCategoryName = async (...args: any[]) => ({ nameAr: args[0], nameEn: args[0] });
export const suggestCategoryMerges = async (categories: Category[], language: string): Promise<{ sourceId: string; targetId: string; categoryIds: string[]; reasonAr: string; reasonEn: string }[]> => {
  const prompt = `Analyze this list of categories and identify potential duplicates or highly similar categories that should be merged. 
    Categories: ${JSON.stringify(categories.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, parentId: c.parentId })))}
    
    For each potential merge, provide:
    - sourceId: The ID of the category to be removed.
    - targetId: The ID of the category to keep.
    - reasonAr: A brief reason for the merge in Arabic.
    - reasonEn: A brief reason for the merge in English.
    
    Return ONLY a JSON array of objects. If no merges are suggested, return an empty array [].`;

  const proxyCall = async () => {
    const data = await executeProxyCall({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      model: 'gemini-3-flash-preview',
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(data.text);
  };

  const apiKey = await getApiKey();

  if (!apiKey) {
    console.log('DEBUG: No local API key found, falling back to server proxy for suggestCategoryMerges');
    try {
      const parsedResult = await proxyCall();
      return parsedResult.map((s: any) => ({
        ...s,
        categoryIds: [s.sourceId, s.targetId]
      }));
    } catch (proxyError: any) {
      handleAiError(proxyError, 'Proxy Category Merge Analysis');
      return [];
    }
  }

  try {
    return await retryWithBackoff(async (key) => {
      if (!key) {
        const error = new Error('No API key available');
        (error as any).isMissingKey = true;
        throw error;
      }
      if (categories.length < 2) return [];
      
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          // @ts-ignore
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceId: { type: Type.STRING },
                targetId: { type: Type.STRING },
                reasonAr: { type: Type.STRING },
                reasonEn: { type: Type.STRING }
              },
              required: ["sourceId", "targetId", "reasonAr", "reasonEn"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) return [];
      
      const parsedResult = JSON.parse(text);

      return parsedResult.map((s: any) => ({
        ...s,
        categoryIds: [s.sourceId, s.targetId]
      }));
    });
  } catch (e: any) {
    if (e.isMissingKey) {
      console.log('DEBUG: Local keys exhausted during suggestCategoryMerges, falling back to proxy');
      try {
        const parsedResult = await proxyCall();
        return parsedResult.map((s: any) => ({
          ...s,
          categoryIds: [s.sourceId, s.targetId]
        }));
      } catch (proxyError: any) {
        handleAiError(proxyError, 'Proxy Category Merge Analysis fallback');
      }
    }
    handleAiError(e, 'Category merge suggestion');
    return [];
  }
};

export const suggestMainCategories = async (language: string, categoryType: 'product' | 'service', existingCategories: string[]): Promise<string[]> => {
  try {
    const existingList = existingCategories.length > 0 ? `Do not include these existing categories: ${existingCategories.join(', ')}.` : '';
    const prompt = `Suggest 5-8 new main ${categoryType === 'product' ? 'product' : 'service'} categories for a B2B2C marketplace. The language should be ${language}. ${existingList} Return ONLY a JSON array of strings.`;
    
    const result = await callAiJson(prompt, {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    });

    const tokens = (prompt.length + JSON.stringify(result).length) / 4;
    await logUsage('Category Suggestion', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Main category suggestion');
    if (e.message === 'QUOTA_EXHAUSTED' || e.status === 429 || (e.message && e.message.includes('429'))) {
      throw new Error('QUOTA_EXHAUSTED');
    }
    throw e;
  }
};

export const suggestSubcategories = async (parentCategory: string, categoryType: 'product' | 'service', existingSubcategories: string[]): Promise<string[]> => {
  try {
    const existingList = existingSubcategories.length > 0 ? `Do not include these existing subcategories: ${existingSubcategories.join(', ')}.` : '';
    const result = await callAiJson(
      `Suggest 5-8 new ${categoryType === 'product' ? 'product' : 'service'} subcategories for the parent category "${parentCategory}" in a B2B2C marketplace. The language should match the parent category name. ${existingList} Return ONLY a JSON array of strings.`,
      {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    );

    const tokens = (parentCategory.length + existingList.length + JSON.stringify(result).length) / 4;
    await logUsage('Subcategory Suggestion', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Subcategory suggestion');
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
  if (cached && Date.now() - cached.timestamp < 300000) {
    return cached.matches;
  }

  const categoryList = categories.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }));
  
  try {
    const matches = await callAiJson(
      `Based on the product title: "${productInfo.title}" and description: "${productInfo.description}", which of the following categories are the best matches? Return ONLY the IDs of the top 3 matching categories as a JSON array of strings.
        Categories: ${JSON.stringify(categoryList)}`,
      {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    );
    
    neuralCategoryCache.set(cacheKey, { matches, timestamp: Date.now() });
    return matches;
  } catch (e: any) {
    handleAiError(e, 'Neural category suggestion');
    return [];
  }
};

export const predictUserNextStep = async (profile: UserProfile, currentView: string): Promise<any> => {
  try {
    const prompt = `Based on the user's role (${profile.role}), current view (${currentView}), and profile strength, predict the single most valuable next action they should take in the marketplace.
    Return JSON with:
    1. actionId: string (e.g., 'add_product', 'browse_offers', 'complete_profile')
    2. reasonAr: string
    3. reasonEn: string
    4. priority: number (1-10)`;

    const result = await callAiJson(prompt, {
      type: Type.OBJECT,
      properties: {
        actionId: { type: Type.STRING },
        reasonAr: { type: Type.STRING },
        reasonEn: { type: Type.STRING },
        priority: { type: Type.NUMBER }
      },
      required: ["actionId", "reasonAr", "reasonEn", "priority"]
    });
    return result;
  } catch (e: any) {
    handleAiError(e, 'Prediction');
    return null;
  }
};

export const preFetchNeuralPulse = async (profile: UserProfile): Promise<void> => {
  try {
    const cacheKey = `pulse_${profile.uid}`;
    if (neuralCache.get(cacheKey)) return;

    const prompt = `Analyze user profile: ${JSON.stringify({ role: profile.role, name: profile.name })}. Generate a quick status pulse.
    Return JSON: status (excellent/good/needs_attention), headlineEn, headlineAr, growthScore (0-100).`;

    const result = await callAiJson(prompt, {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING },
        headlineEn: { type: Type.STRING },
        headlineAr: { type: Type.STRING },
        growthScore: { type: Type.NUMBER }
      },
      required: ["status", "headlineEn", "headlineAr", "growthScore"]
    });

    neuralCache.set(cacheKey, result, 3600000); // Cache for 1 hour
  } catch (e: any) {
    const isNoKey = e.message === 'No API key available' || e.isMissingKey;
    const isInvalidKey = e.isInvalidKey || e.message?.includes('API key not valid') || e.message?.includes('API_KEY_INVALID');
    const isQuotaError = e?.status === 429 || e?.error?.code === 429 || e?.message?.includes('429') || e?.message?.includes('RESOURCE_EXHAUSTED');

    if (isNoKey) {
      console.warn('Pre-fetch pulse skipped: No API key available');
    } else if (isInvalidKey) {
      console.warn('Pre-fetch pulse skipped: Invalid API key');
    } else if (isQuotaError) {
      console.warn('Pre-fetch pulse skipped: Quota exceeded');
    } else {
      handleAiError(e, 'Pre-fetch pulse');
    }
  }
};

export const analyzeChatSentiment = async (transcript: string, language: string): Promise<any> => {
  try {
    const prompt = `Analyze the sentiment of this chat transcript.
      
      Transcript: ${transcript}
      
      Return a JSON object with:
      - sentiment: 'positive', 'neutral', or 'negative'
      - score: -1 to 1 (where -1 is very negative, 0 is neutral, 1 is very positive)
      - reasoningEn: Brief explanation in English
      - reasoningAr: Brief explanation in Arabic
      - keyEmotions: Array of detected emotions (e.g., ['frustrated', 'satisfied', 'curious'])`;

    const result = await callAiJson(
      prompt,
      {
        type: Type.OBJECT,
        properties: {
          sentiment: { type: Type.STRING, enum: ['positive', 'neutral', 'negative'] },
          score: { type: Type.NUMBER },
          reasoningEn: { type: Type.STRING },
          reasoningAr: { type: Type.STRING },
          keyEmotions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["sentiment", "score", "reasoningEn", "reasoningAr", "keyEmotions"]
      }
    );
    
    const tokens = (prompt.length + JSON.stringify(result).length) / 4;
    await logUsage('Chat Sentiment Analysis', Math.ceil(tokens));
    return result;
  } catch (e: any) {
    handleAiError(e, 'Chat sentiment analysis');
    return { sentiment: 'neutral', score: 0, reasoningEn: 'Analysis failed', reasoningAr: 'فشل التحليل', keyEmotions: [] };
  }
};
