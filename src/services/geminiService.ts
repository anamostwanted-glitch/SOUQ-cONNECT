import { GoogleGenAI, Type } from "@google/genai";
import { Category } from "../types";
import { db } from "../firebase";
import { collection, query, where, getDocs, addDoc, limit } from "firebase/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function callAiWithRetry<T>(fn: () => Promise<T>, maxAttempts = 5, initialDelay = 2000): Promise<T> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const isRateLimit = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
      
      if (isRateLimit && attempt < maxAttempts) {
        // Exponential backoff with jitter
        const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.warn(`AI Rate limit hit. Retrying in ${Math.round(delay)}ms (Attempt ${attempt}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('AI Max attempts reached');
}

export async function translateText(text: string, targetLang: 'English' | 'Arabic'): Promise<string> {
  if (!text || !text.trim()) return '';
  
  try {
    // 1. Check Cache first
    const cacheRef = collection(db, 'translation_cache');
    const q = query(
      cacheRef, 
      where('text', '==', text.trim()), 
      where('targetLang', '==', targetLang),
      limit(1)
    );
    
    const cacheSnap = await getDocs(q);
    if (!cacheSnap.empty) {
      console.log('Using cached translation for:', text.substring(0, 20) + '...');
      return cacheSnap.docs[0].data().translation;
    }

    // 2. If not in cache, call AI
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the following text to ${targetLang}. Provide only the translation, no extra text: "${text}"`,
    }));
    
    const translation = response.text?.trim() || '';

    // 3. Save to Cache if successful
    if (translation) {
      await addDoc(cacheRef, {
        text: text.trim(),
        targetLang,
        translation,
        createdAt: new Date().toISOString()
      });
    }

    return translation;
  } catch (error) {
    console.error('Translation error:', error);
    return '';
  }
}

export async function verifyDocument(base64Image: string, mimeType: string): Promise<{ isLegit: boolean, details: string, companyName?: string, expiryDate?: string }> {
  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        {
          text: `You are an expert document verification agent. Analyze this commercial registration or tax document.
          1. Determine if it looks like a legitimate official document.
          2. Extract the Company Name and Expiry Date if visible.
          3. Provide a brief summary of the document.
          
          Return ONLY a JSON object:
          {
            "isLegit": boolean,
            "details": "string summary",
            "companyName": "string or null",
            "expiryDate": "string or null"
          }`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isLegit: { type: Type.BOOLEAN },
            details: { type: Type.STRING },
            companyName: { type: Type.STRING },
            expiryDate: { type: Type.STRING }
          },
          required: ["isLegit", "details"]
        }
      }
    }));
    
    return JSON.parse(response.text || '{"isLegit": false, "details": "Failed to parse document"}');
  } catch (error) {
    console.error('Document verification error:', error);
    return { isLegit: false, details: "AI Verification service unavailable" };
  }
}

export async function categorizeProduct(searchQuery: string, categories: Category[]): Promise<string | null> {
  if (!categories.length) return null;

  // 1. Check Cache
  const cacheKey = `${searchQuery.trim().toLowerCase()}`;
  const cacheRef = collection(db, 'categorization_cache');
  const q = query(cacheRef, where('key', '==', cacheKey), limit(1));
  const cacheSnap = await getDocs(q);
  if (!cacheSnap.empty) {
    console.log('Using cached categorization for:', searchQuery);
    return (cacheSnap.docs[0].data() as any).categoryId;
  }

  const categoryList = categories.map(c => {
    const parent = c.parentId ? categories.find(p => p.id === c.parentId) : null;
    const parentName = parent ? `${parent.nameEn} > ` : '';
    return `${c.id}: ${parentName}${c.nameEn} / ${c.nameAr}`;
  }).join('\n');

  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a categorization expert for a B2B marketplace.
      The user is searching for: "${searchQuery}".
      
      Your task is to find the most semantically relevant category from the list below.
      The search query might be in Arabic, English, or a mix. 
      
      Rules:
      1. Return ONLY the category ID.
      2. Be as specific as possible (prefer subcategories).
      3. If the request is totally unrelated to all categories, return the ID of the most general category or "NONE" only as a last resort.
      4. Semantic Match: The category must be a logical fit for the product. For example, "خزانه" (Cabinet/Wardrobe) is furniture and should NOT be matched to "Car Maintenance" (صيانة سيارات) unless it's a specialized automotive tool cabinet.
      5. Language: The query might be in Arabic or English. "خزانه" means Cabinet/Safe/Wardrobe.
      
      Categories:
      ${categoryList}`,
      config: {
        temperature: 0.1,
        responseMimeType: "text/plain",
      },
    }));

    const categoryId = response.text?.trim();
    if (categoryId === "NONE") return null;
    
    // Verify the returned ID exists in our list
    const exists = categories.find(c => c.id === categoryId);
    const result = exists ? categoryId : null;

    // 2. Save to Cache
    if (result) {
      await addDoc(cacheRef, {
        key: cacheKey,
        categoryId: result,
        createdAt: new Date().toISOString()
      });
    }

    return result;
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for categorization. Using default behavior.");
    } else {
      console.error("AI Categorization Error:", error);
    }
    return null;
  }
}

export async function getAiAssistantResponse(message: string, context: string): Promise<string> {
  try {
    // 1. Check Cache
    const cacheKey = `assistant_${message.trim().toLowerCase()}_${context.substring(0, 50).toLowerCase()}`;
    const cacheRef = collection(db, 'assistant_cache');
    const q = query(cacheRef, where('key', '==', cacheKey), limit(1));
    const cacheSnap = await getDocs(q);
    if (!cacheSnap.empty) {
      console.log('Using cached assistant response');
      return cacheSnap.docs[0].data().response;
    }

    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a helpful assistant for "Souq Connect", a marketplace platform.
      User message: "${message}"
      Context: ${context}
      
      Provide a helpful, concise response in the same language as the user.`,
      config: {
        temperature: 0.7,
      },
    }));
    const result = response.text || '';

    // 2. Save to Cache
    if (result) {
      await addDoc(cacheRef, {
        key: cacheKey,
        response: result,
        createdAt: new Date().toISOString()
      });
    }

    return result;
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for assistant.");
    } else {
      console.error("AI Assistant Error:", error);
    }
    return "I'm sorry, I'm having trouble connecting right now.";
  }
}

export async function enhanceRequestDescription(shortDescription: string, language: string = 'ar'): Promise<string> {
  // 1. Check Cache
  const cacheKey = `${shortDescription.trim().toLowerCase()}_${language}`;
  const cacheRef = collection(db, 'enhancement_cache');
  const q = query(cacheRef, where('key', '==', cacheKey), limit(1));
  const cacheSnap = await getDocs(q);
  if (!cacheSnap.empty) {
    console.log('Using cached enhancement for:', shortDescription.substring(0, 20) + '...');
    return cacheSnap.docs[0].data().enhancedDescription;
  }

  const prompt = language === 'ar' 
    ? `أنت خبير في صياغة طلبات الشراء (RFQs) لقطاع الأعمال (B2B). 
       العميل قدم الوصف التالي: "${shortDescription}". 
       أعد صياغة هذا الطلب بشكل احترافي للغاية ليكون جذاباً للموردين.
       يجب أن يتضمن النص:
       - عنواناً واضحاً للمنتج/الخدمة.
       - تفاصيل فنية دقيقة (بناءً على السياق).
       - دعوة صريحة للموردين لتقديم عروض أسعار تنافسية.
       - أسلوب لغوي راقٍ وعملي.
       اجعل النتيجة في فقرة واحدة مركزة ولا تضف معلومات غير موجودة في الأصل، فقط قم بتنظيمها وتجميلها.`
    : `You are a B2B procurement expert specializing in drafting high-quality Requests for Quotation (RFQs). 
       The customer provided this description: "${shortDescription}".
       Rewrite this request to be highly professional, structured, and appealing to top-tier suppliers.
       The description should include:
       - A clear product/service title.
       - Technical specifications (based on context).
       - A clear call to action for suppliers to provide competitive quotes.
       - A sophisticated business tone.
       Keep the output as a single cohesive paragraph. Do not invent details; focus on clarifying and professionalizing the existing information.`;

  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    }));
    const enhancedDescription = response.text?.trim() || shortDescription;

    // 2. Save to Cache
    await addDoc(cacheRef, {
      key: cacheKey,
      enhancedDescription,
      createdAt: new Date().toISOString()
    });

    return enhancedDescription;
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for enhancement. Using original description.");
    } else {
      console.error("AI Enhancement Error:", error);
    }
    return shortDescription;
  }
}

export async function generateSupplierProposal(requestDescription: string, language: string = 'ar'): Promise<string> {
  try {
    // 1. Check Cache
    const cacheKey = `proposal_${requestDescription.trim().toLowerCase()}_${language}`;
    const cacheRef = collection(db, 'proposal_cache');
    const q = query(cacheRef, where('key', '==', cacheKey), limit(1));
    const cacheSnap = await getDocs(q);
    if (!cacheSnap.empty) {
      console.log('Using cached proposal');
      return cacheSnap.docs[0].data().proposal;
    }

    const prompt = language === 'ar'
      ? `أنت مساعد ذكي لموردين ومقدمي خدمات على منصة. العميل يطلب التالي: "${requestDescription}".
         مهمتك هي كتابة رسالة عرض (Proposal) احترافية، مقنعة، وودودة من المورد للعميل.
         يجب أن تبدأ بالترحيب، ثم إظهار فهم المشكلة، ثم عرض الاستعداد للعمل.
         اجعلها قصيرة (حوالي 3-4 أسطر) ولا تضع أسعاراً محددة بل اتركها للتفاوض.`
      : `You are a smart assistant for suppliers on a service platform. The customer is requesting: "${requestDescription}".
         Your task is to write a professional, persuasive, and friendly proposal message from the supplier to the customer.
         Start with a greeting, show understanding of the problem, and express readiness to help.
         Keep it short (about 3-4 lines) and do not include specific prices, leave that for negotiation.`;

    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    }));
    const result = response.text?.trim() || "";

    // 2. Save to Cache
    if (result) {
      await addDoc(cacheRef, {
        key: cacheKey,
        proposal: result,
        createdAt: new Date().toISOString()
      });
    }

    return result;
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for proposal generation.");
    } else {
      console.error("AI Proposal Error:", error);
    }
    return "";
  }
}

export async function suggestMainCategories(language: string, existingCategories: string[] = []): Promise<string[]> {
  try {
    const existingList = existingCategories.length > 0 
      ? `\n\nDO NOT suggest any of these existing categories:\n${existingCategories.join(', ')}`
      : '';

    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a B2B marketplace taxonomy expert. Suggest 10-15 high-level, broad main categories for a comprehensive B2B wholesale marketplace (e.g., Electronics, Fashion, Industrial Machinery, Food & Beverage).${existingList}
      Return ONLY a JSON array of strings in ${language === 'ar' ? 'Arabic' : 'English'}.`,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    }));

    return JSON.parse(response.text || '[]');
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for main category suggestions.");
    } else {
      console.error("AI Main Category Suggestion Error:", error);
    }
    return [];
  }
}

export async function suggestCategoryMerges(categories: any[], language: string): Promise<any[]> {
  try {
    const categoriesData = categories.map(c => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, parentId: c.parentId }));
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a taxonomy expert. Analyze the following categories and identify duplicates or highly similar categories that should be merged.
      Only suggest merges for categories that share the same parentId (or are both main categories with null/empty parentId).
      Categories: ${JSON.stringify(categoriesData)}
      
      Return ONLY a JSON array of objects with:
      - categoryIds: array of strings (the IDs of the categories to merge, must be at least 2)
      - suggestedNameAr: string (the best Arabic name for the merged category)
      - suggestedNameEn: string (the best English name for the merged category)
      - reason: string (brief reason for merging in ${language === 'ar' ? 'Arabic' : 'English'})`,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              categoryIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedNameAr: { type: Type.STRING },
              suggestedNameEn: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["categoryIds", "suggestedNameAr", "suggestedNameEn", "reason"]
          }
        }
      },
    }));

    return JSON.parse(response.text || '[]');
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for category merge suggestions.");
    } else {
      console.error("AI Category Merge Suggestion Error:", error);
    }
    return [];
  }
}

export async function suggestSubcategories(categoryName: string, existingSubcategories: string[] = []): Promise<string[]> {
  try {
    const existingList = existingSubcategories.length > 0 
      ? `\n\nDO NOT suggest any of these existing subcategories:\n${existingSubcategories.join(', ')}`
      : '';

    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `For a marketplace category named "${categoryName}", suggest 5 relevant subcategories.${existingList}
      Provide only the names in a comma-separated list, no extra text.`,
    }));
    const text = response.text || '';
    return text.split(',').map(s => s.trim()).filter(s => s.length > 0);
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for subcategory suggestions.");
    } else {
      console.error("AI Suggestion Error:", error);
    }
    return [];
  }
}

export async function semanticSearch(query: string, items: any[], language: string): Promise<string[]> {
  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Given the user query: "${query}" in language: ${language}, filter and rank the following JSON list of items based on semantic relevance.
      Return ONLY a JSON array of the IDs of the relevant items, sorted by relevance.
      Items: ${JSON.stringify(items.map(i => ({ id: i.id || i.uid, text: JSON.stringify(i) })))}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    }));
    return JSON.parse(response.text || '[]');
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for semantic search.");
    } else {
      console.error("Semantic Search Error:", error);
    }
    return items.map(i => i.id || i.uid);
  }
}

export async function parseVoiceRequest(text: string, language: string): Promise<{ productName: string, description: string, expectedQuantity: number }> {
  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse this user voice request into a JSON object with 'productName', 'description', and 'expectedQuantity' (number) in ${language}. Request: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            description: { type: Type.STRING },
            expectedQuantity: { type: Type.NUMBER }
          },
          required: ["productName", "description", "expectedQuantity"]
        }
      }
    }));
    return JSON.parse(response.text || '{"productName": "", "description": "", "expectedQuantity": 1}');
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for voice parsing.");
    } else {
      console.error("Voice Parsing Error:", error);
    }
    return { productName: text, description: "", expectedQuantity: 1 };
  }
}

export async function generateNegotiationResponse(customerMessage: string, offerPrice: number, minPrice: number, language: string): Promise<{ responseMessage: string, newOfferPrice: number | null }> {
  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an AI negotiation agent for a supplier. 
      The customer offered/said: "${customerMessage}". 
      Your current offer price is ${offerPrice}. Your minimum acceptable price is ${minPrice}. 
      Respond professionally in ${language}. If the customer's offer is above or equal to your minimum price, you can accept it or counter-offer slightly higher. If it's below, politely decline or counter-offer at or above your minimum price.
      Return a JSON object with 'responseMessage' (your reply) and 'newOfferPrice' (number, or null if you accept their price or refuse to change).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            responseMessage: { type: Type.STRING },
            newOfferPrice: { type: Type.NUMBER }
          },
          required: ["responseMessage"]
        }
      }
    }));
    return JSON.parse(response.text || '{"responseMessage": "I cannot accept this offer.", "newOfferPrice": null}');
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for negotiation.");
    } else {
      console.error("Negotiation Error:", error);
    }
    return { responseMessage: "Error processing negotiation.", newOfferPrice: null };
  }
}

export async function translateAudio(base64Audio: string, mimeType: string, targetLang: string): Promise<string> {
  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType } },
          { text: `Transcribe and translate this audio to ${targetLang}. Return ONLY the translated text.` }
        ]
      }
    }));
    return response.text?.trim() || '';
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for audio translation.");
    } else {
      console.error("Audio Translation Error:", error);
    }
    return '';
  }
}

export async function matchSuppliers(queryText: string, suppliers: any[], categories: Category[], customerLocation?: string): Promise<string[]> {
  if (!suppliers.length) return [];

  // 1. Check Cache
  // We cache based on query and customer location. 
  // Note: We don't cache based on the full supplier list because it's too large for a key, 
  // but usually the supplier pool is relatively stable for a given category/query.
  const cacheKey = `match_${queryText.trim().toLowerCase()}_${customerLocation || 'any'}`;
  const cacheRef = collection(db, 'matchmaking_cache');
  const q = query(cacheRef, where('key', '==', cacheKey), limit(1));
  
  try {
    const cacheSnap = await getDocs(q);
    if (!cacheSnap.empty) {
      const cachedData = cacheSnap.docs[0].data() as any;
      // Check if cache is fresh (e.g., less than 24 hours old)
      const createdAt = new Date(cachedData.createdAt).getTime();
      const now = new Date().getTime();
      if (now - createdAt < 24 * 60 * 60 * 1000) {
        console.log('Using cached matchmaking for:', queryText);
        return cachedData.supplierIds;
      }
    }
  } catch (err) {
    console.error("Error checking matchmaking cache:", err);
  }

  // Sort suppliers by location proximity (improved string match)
  const sortedSuppliers = [...suppliers].sort((a, b) => {
    if (!customerLocation) return 0;
    
    const locA = (a.location || '').toLowerCase().trim();
    const locB = (b.location || '').toLowerCase().trim();
    const custLoc = customerLocation.toLowerCase().trim();

    // Exact match gets highest priority
    if (locA === custLoc && locB !== custLoc) return -1;
    if (locB === custLoc && locA !== custLoc) return 1;

    // Partial match (e.g., same city/region)
    const aPartial = custLoc.includes(locA) || locA.includes(custLoc);
    const bPartial = custLoc.includes(locB) || locB.includes(custLoc);
    if (aPartial && !bPartial) return -1;
    if (bPartial && !aPartial) return 1;

    return 0;
  });

  // Limit to top 20 suppliers to avoid exceeding AI token limits and improve speed
  const topSuppliers = sortedSuppliers.slice(0, 20);

  const supplierList = topSuppliers.map(s => {
    const suppCategories = s.categories?.map((cId: string) => {
      const cat = categories.find(c => c.id === cId);
      return cat ? `${cat.nameEn}/${cat.nameAr}` : '';
    }).filter(Boolean).join(', ') || 'No specific categories';
    
    return `ID: ${s.uid} | Name: ${s.companyName || s.name} | Location: ${s.location || 'Unknown'} | Categories: ${suppCategories} | Keywords: ${s.keywords?.join(', ') || ''} | Desc: ${s.description || ''}`;
  }).join('\n');

  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Given the customer's request: "${queryText}", which of the following suppliers are the best match? 
      Consider both their specialization (categories/keywords) and their proximity to the customer (Customer Location: ${customerLocation || 'Unknown'}).
      
      Return a JSON array of strings containing ONLY the IDs of the top 5 best matching suppliers, ranked from best to worst.
      If none are a good match, return an empty array [].
      
      Suppliers:
      ${supplierList}`,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      },
    }));
    const text = response.text?.trim() || '[]';
    const supplierIds = JSON.parse(text);

    // 2. Save to Cache
    if (supplierIds.length > 0) {
      await addDoc(cacheRef, {
        key: cacheKey,
        supplierIds,
        createdAt: new Date().toISOString()
      });
    }

    return supplierIds;
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for matchmaking.");
    } else {
      console.error("AI Matchmaking Error:", error);
    }
    return [];
  }
}

export async function analyzeProductImage(base64Image: string, mimeType: string, language: string): Promise<{productName: string, description: string} | null> {
  try {
    // 1. Check Cache (using a simple hash of the image data)
    const imageHash = `img_${base64Image.length}_${base64Image.substring(0, 50)}_${base64Image.substring(base64Image.length - 50)}`;
    const cacheRef = collection(db, 'image_analysis_cache');
    const q = query(cacheRef, where('hash', '==', imageHash), where('language', '==', language), limit(1));
    const cacheSnap = await getDocs(q);
    if (!cacheSnap.empty) {
      console.log('Using cached image analysis');
      return cacheSnap.docs[0].data().result;
    }

    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
        {
          text: `Analyze this image and provide a product name and a professional description suitable for a B2B marketplace.
          Respond in ${language === 'ar' ? 'Arabic' : 'English'}.
          Return ONLY a valid JSON object with the following structure:
          {
            "productName": "A concise, clear name for the product",
            "description": "A detailed, professional description of the product, its potential uses, and key features visible in the image."
          }`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["productName", "description"]
        }
      }
    }));
    
    const text = response.text?.trim() || '{}';
    const result = JSON.parse(text);

    // 2. Save to Cache
    if (result.productName) {
      await addDoc(cacheRef, {
        hash: imageHash,
        language,
        result,
        createdAt: new Date().toISOString()
      });
    }

    return result;
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for image analysis.");
    } else {
      console.error("AI Image Analysis Error:", error);
    }
    return null;
  }
}

export async function negotiateOffer(chatHistory: string, currentPrice: number, minPrice: number, language: string): Promise<{ shouldRespond: boolean; message?: string; suggestedPrice?: number }> {
  try {
    const langContext = language === 'ar' ? 'Arabic' : 'English';
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      You are an AI sales assistant for a supplier in a B2B marketplace. 
      Your goal is to negotiate with a customer to close a deal at the best possible price, but never going below the minimum price.
      
      Current Price: ${currentPrice}
      Minimum Price: ${minPrice}
      Chat History:
      ${chatHistory}
      
      Rules:
      1. If the customer is asking for a price below the minimum, politely decline and offer the minimum price or a price close to it.
      2. If the customer is asking for a discount that is still above the minimum, you can offer a small discount to encourage the sale.
      3. If the customer is just asking questions, answer them professionally and encourage them to accept the current offer.
      4. Be professional, helpful, and concise.
      5. Respond in ${langContext}.
      
      Return a JSON object: { "shouldRespond": boolean, "message": "string (the response to the customer)", "suggestedPrice": number (the new price if you are offering a discount, otherwise the current price) }.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            shouldRespond: { type: Type.BOOLEAN },
            message: { type: Type.STRING },
            suggestedPrice: { type: Type.NUMBER }
          },
          required: ["shouldRespond"]
        }
      }
    }));

    const text = response.text?.trim() || '{"shouldRespond": false}';
    return JSON.parse(text);
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for negotiation.");
    } else {
      console.error("AI Negotiation Error:", error);
    }
    return { shouldRespond: false };
  }
}

export async function optimizeSupplierProfile(companyName: string, currentBio: string, currentKeywords: string[], language: string): Promise<{ suggestedBio: string; suggestedKeywords: string[] }> {
  try {
    const langContext = language === 'ar' ? 'Arabic' : 'English';
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      You are an expert B2B profile optimizer. 
      Optimize the following supplier profile to make it more professional and searchable.
      
      Company Name: ${companyName}
      Current Bio: ${currentBio}
      Current Keywords: ${currentKeywords.join(', ')}
      
      Return a JSON object: { "suggestedBio": "string (optimized bio)", "suggestedKeywords": ["array of 10 strings"] }.
      The bio and keywords should be in ${langContext}.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedBio: { type: Type.STRING },
            suggestedKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["suggestedBio", "suggestedKeywords"]
        }
      }
    }));

    const text = response.text?.trim() || '{}';
    return JSON.parse(text);
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for profile optimization.");
    } else {
      console.error("AI Profile Optimization Error:", error);
    }
    return { suggestedBio: currentBio, suggestedKeywords: currentKeywords };
  }
}

export async function generateKeywords(companyName: string, bio: string, categories: string[], language: string): Promise<string[]> {
  try {
    const langContext = language === 'ar' ? 'Arabic' : 'English';
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      Based on the following supplier profile, generate 10 relevant keywords or tags that would help customers find this business in a B2B marketplace.
      The keywords should be in ${langContext}.
      Provide ONLY a JSON array of strings. No markdown formatting, no extra text.
      
      Company Name: ${companyName}
      Bio: ${bio}
      Categories: ${categories.join(', ')}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    }));

    const text = response.text?.trim() || "[]";
    return JSON.parse(text);
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for keyword generation.");
    } else {
      console.error("AI Keyword Generation Error:", error);
    }
    return [];
  }
}

export async function generateSmartReplies(chatHistory: string, userRole: 'supplier' | 'customer', language: string): Promise<string[]> {
  try {
    // 1. Check Cache
    const cacheKey = `replies_${chatHistory.trim().toLowerCase()}_${userRole}_${language}`;
    const cacheRef = collection(db, 'replies_cache');
    const q = query(cacheRef, where('key', '==', cacheKey), limit(1));
    const cacheSnap = await getDocs(q);
    if (!cacheSnap.empty) {
      console.log('Using cached smart replies');
      return cacheSnap.docs[0].data().replies;
    }

    const roleContext = userRole === 'supplier' 
      ? "You are a professional supplier responding to a customer's inquiry or message."
      : "You are a customer responding to a supplier's message.";
      
    const langContext = language === 'ar' ? 'Arabic' : 'English';

    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      ${roleContext}
      Based on the following chat history, suggest 3 short, professional, and context-aware replies.
      The replies must be in ${langContext}.
      Provide ONLY a JSON array of 3 strings. No markdown formatting, no extra text.
      
      Chat History:
      ${chatHistory}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    }));

    const text = response.text?.trim() || "[]";
    try {
      const replies = JSON.parse(text);
      if (Array.isArray(replies) && replies.length > 0) {
        const result = replies.slice(0, 3);
        // 2. Save to Cache
        await addDoc(cacheRef, {
          key: cacheKey,
          replies: result,
          createdAt: new Date().toISOString()
        });
        return result;
      }
    } catch (e) {
      console.error("Failed to parse smart replies JSON:", e);
    }
    return [];
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for smart replies.");
    } else {
      console.error("AI Smart Replies Error:", error);
    }
    return [];
  }
}

export async function summarizeChat(messages: string[], language: string): Promise<string> {
  if (!messages.length) return '';
  try {
    const langContext = language === 'ar' ? 'Arabic' : 'English';
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      Summarize the following chat conversation between a customer and a supplier in a marketplace.
      Provide a concise summary (1-2 sentences) highlighting the key points (e.g., what was requested, the outcome).
      The summary must be in ${langContext}.
      
      Chat Messages:
      ${messages.join('\n')}
      `,
    }));
    return response.text?.trim() || '';
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for chat summarization.");
    } else {
      console.error("AI Chat Summarization Error:", error);
    }
    return "";
  }
}

export async function suggestSupplierCategories(supplierInfo: { name: string, companyName?: string, bio?: string, keywords?: string[] }, categories: Category[], language: string): Promise<string[]> {
  if (!categories.length) return [];
  
  const categoryList = categories.map(c => {
    const parent = c.parentId ? categories.find(p => p.id === c.parentId) : null;
    const parentName = parent ? `${parent.nameEn} > ` : '';
    return `${c.id}: ${parentName}${c.nameEn} / ${c.nameAr}`;
  }).join('\n');

  const info = `
    Name: ${supplierInfo.name}
    Company: ${supplierInfo.companyName || 'N/A'}
    Bio: ${supplierInfo.bio || 'N/A'}
    Keywords: ${supplierInfo.keywords?.join(', ') || 'N/A'}
  `;

  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a categorization expert for a B2B marketplace.
      Based on the following supplier information, suggest the most relevant categories and subcategories they should be listed in.
      
      Supplier Info:
      ${info}
      
      Categories:
      ${categoryList}
      
      Rules:
      1. Return ONLY a JSON array of category IDs.
      2. Suggest between 1 to 5 most relevant categories.
      3. Prefer specific subcategories if they fit well.
      4. If the supplier is very broad, you can suggest parent categories too.`,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      },
    }));

    const suggestedIds = JSON.parse(response.text || '[]');
    // Filter to ensure only valid IDs are returned
    return suggestedIds.filter((id: string) => categories.some(c => c.id === id));
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for supplier categorization.");
    } else {
      console.error("AI Supplier Categorization Error:", error);
    }
    return [];
  }
}

export async function formatCategoryName(name: string, language: string): Promise<{ nameAr: string, nameEn: string }> {
  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a taxonomy expert. Professionally format and translate the following category name for a B2B marketplace.
      Ensure the name is concise, professional, and fits a high-end business platform.
      
      Input Name: ${name}
      
      Return ONLY a JSON object with 'nameAr' and 'nameEn'.`,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nameAr: { type: Type.STRING },
            nameEn: { type: Type.STRING }
          },
          required: ["nameAr", "nameEn"]
        }
      },
    }));

    return JSON.parse(response.text || '{"nameAr": "", "nameEn": ""}');
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for category formatting.");
    } else {
      console.error("AI Category Formatting Error:", error);
    }
    return { nameAr: name, nameEn: name };
  }
}

export async function extractKeywordsFromRequests(requests: { productName: string, description?: string }[], categoryName: string, language: string): Promise<string[]> {
  if (!requests.length) return [];
  try {
    const langContext = language === 'ar' ? 'Arabic' : 'English';
    const requestData = requests.map(r => `${r.productName}: ${r.description || ''}`).join('\n');
    
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      You are an SEO and search optimization expert for a B2B marketplace. 
      Analyze the following user requests for the category "${categoryName}".
      Extract 10-15 highly relevant keywords, search terms, or product variations that users are looking for.
      These keywords will be used to improve search relevance and SEO for this category.
      
      Return ONLY a JSON array of strings.
      The keywords should be in ${langContext}.
      
      User Requests:
      ${requestData}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    }));
    
    const text = response.text?.trim() || "[]";
    return JSON.parse(text);
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for keyword extraction.");
    } else {
      console.error("AI Keyword Extraction Error:", error);
    }
    return [];
  }
}

export async function analyzeMarketTrends(searches: string[], chatSummaries: string[], language: string): Promise<{ analysis: string; suggestions: string[] }> {
  try {
    const langContext = language === 'ar' ? 'Arabic' : 'English';
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      You are a market analyst for a B2B marketplace. 
      Analyze the following search queries and chat summaries (anonymized) to identify emerging trends and suggest 2-3 new categories or subcategories that the platform should add.
      Provide a brief explanation for each suggestion (e.g., "There is a 30% increase in demand for X").
      The response must be in JSON format with the following structure:
      {
        "analysis": "A detailed analysis of the trends found",
        "suggestions": ["Category 1", "Category 2"]
      }
      The text must be in ${langContext}.
      
      Search Queries:
      ${searches.slice(-50).join(', ')}
      
      Chat Summaries:
      ${chatSummaries.slice(-20).join('\n')}
      `,
      config: {
        responseMimeType: "application/json"
      }
    }));
    
    const text = response.text?.trim() || '{}';
    try {
      return JSON.parse(text);
    } catch (e) {
      return { analysis: text, suggestions: [] };
    }
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for market analysis.");
    } else {
      console.error("AI Market Analysis Error:", error);
    }
    return { analysis: "", suggestions: [] };
  }
}

export async function moderateContent(text: string): Promise<{ isSafe: boolean; reason?: string }> {
  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      Analyze the following message for a B2B marketplace. 
      Check for:
      1. Fraud or scams.
      2. Profanity or offensive language.
      3. Attempts to bypass platform policies (e.g., sharing direct contact info to avoid fees, if applicable).
      
      Return a JSON object: { "isSafe": boolean, "reason": "string (optional, only if unsafe)" }.
      
      Message: "${text}"
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSafe: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          },
          required: ["isSafe"]
        }
      }
    }));
    const result = JSON.parse(response.text || '{"isSafe": true}');
    return result;
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for content moderation.");
    } else {
      console.error("AI Moderation Error:", error);
    }
    return { isSafe: true };
  }
}

export async function getPriceIntelligence(productName: string, description: string, historicalOffers: any[], language: string): Promise<{ recommendedPrice: number; minPrice: number; maxPrice: number; analysis: string }> {
  try {
    // 1. Check Cache
    const cacheKey = `${productName.trim().toLowerCase()}_${language}`;
    const cacheRef = collection(db, 'price_intelligence_cache');
    const q = query(cacheRef, where('key', '==', cacheKey), limit(1));
    const cacheSnap = await getDocs(q);
    if (!cacheSnap.empty) {
      console.log('Using cached price intelligence for:', productName);
      return cacheSnap.docs[0].data().result;
    }

    const langContext = language === 'ar' ? 'Arabic' : 'English';
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      You are a pricing intelligence expert for a B2B marketplace. 
      Analyze the product details and historical pricing data to suggest an optimal price for a new offer.
      
      Product: ${productName}
      Description: ${description}
      Historical Data (Anonymized): ${JSON.stringify(historicalOffers.map(o => ({ price: o.price, status: o.status })))}
      
      Rules:
      1. Suggest a competitive 'recommendedPrice' based on the historical data.
      2. Provide a 'minPrice' and 'maxPrice' range.
      3. Provide a brief 'analysis' explaining the suggestion (e.g., "Market average is X, but your product has Y features").
      4. The response must be in JSON format.
      5. The analysis must be in ${langContext}.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedPrice: { type: Type.NUMBER },
            minPrice: { type: Type.NUMBER },
            maxPrice: { type: Type.NUMBER },
            analysis: { type: Type.STRING }
          },
          required: ["recommendedPrice", "minPrice", "maxPrice", "analysis"]
        }
      }
    }));
    
    const result = JSON.parse(response.text || '{}');

    // 2. Save to Cache
    if (result.recommendedPrice) {
      await addDoc(cacheRef, {
        key: cacheKey,
        result,
        createdAt: new Date().toISOString()
      });
    }
    
    return result;
  } catch (error: any) {
    const isQuota = error?.status === 'RESOURCE_EXHAUSTED' || error?.code === 429 || error?.message?.includes('quota');
    if (isQuota) {
      console.warn("AI Quota exceeded for price intelligence.");
    } else {
      console.error("AI Price Intelligence Error:", error);
    }
    return { recommendedPrice: 0, minPrice: 0, maxPrice: 0, analysis: "AI Pricing service unavailable" };
  }
}

export async function generateSupplierLogoImage(companyName: string, category: string, language: string): Promise<string> {
  try {
    const prompt = language === 'ar' 
      ? `صمم شعار نصي (Logotype/Wordmark) باللغة الإنجليزية لشركة باسم "${companyName}" تعمل في مجال "${category}". الشعار يجب أن يكون فخم، بسيط، واحترافي، ويعتمد على اسم الشركة باللغة الإنجليزية مع لمسة بصرية تعبر عن المجال. الخلفية بيضاء نقية.`
      : `Design a text-based logo (Logotype/Wordmark) in English for a company named "${companyName}" in the "${category}" industry. The logo must be luxurious, minimalist, and professional, featuring the company name in English with a visual touch representing the industry. Pure white background.`;

    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating logo image:", error);
    throw error;
  }
}

export async function generateProductCopy(productName: string, features: string[], targetAudience: string, language: string): Promise<{ title: string; description: string; highlights: string[] }> {
  try {
    const langContext = language === 'ar' ? 'Arabic' : 'English';
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      You are a professional marketing copywriter for a B2B marketplace.
      Generate a compelling product title, a detailed description, and 3-5 key highlights for the following product.
      
      Product Name: ${productName}
      Key Features: ${features.join(', ')}
      Target Audience: ${targetAudience}
      Language: ${langContext}
      
      Return ONLY a JSON object with 'title', 'description', and 'highlights' (array of strings).
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            highlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "description", "highlights"]
        }
      }
    }));

    const text = response.text?.trim() || '{}';
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Product Copy Error:", error);
    return { title: productName, description: "", highlights: [] };
  }
}

export async function enhanceProductImageDescription(base64Image: string, mimeType: string, language: string): Promise<{ suggestions: string[]; caption: string }> {
  try {
    const langContext = language === 'ar' ? 'Arabic' : 'English';
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          {
            text: `
            Analyze this product image for a B2B marketplace.
            1. Suggest 3-5 improvements to make the image more professional or appealing (e.g., lighting, background, angle).
            2. Generate a catchy social media caption for this product.
            
            The response must be in ${langContext}.
            Return ONLY a JSON object with 'suggestions' (array of strings) and 'caption' (string).
            `
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            caption: { type: Type.STRING }
          },
          required: ["suggestions", "caption"]
        }
      }
    }));

    const text = response.text?.trim() || '{}';
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Image Enhancement Error:", error);
    return { suggestions: [], caption: "" };
  }
}

export async function analyzeSentiment(text: string): Promise<{ score: number; sentiment: 'positive' | 'neutral' | 'negative'; summary: string }> {
  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      Analyze the sentiment of the following text (e.g., a customer review or feedback).
      Provide a sentiment score from -1 (very negative) to 1 (very positive).
      Categorize the sentiment as 'positive', 'neutral', or 'negative'.
      Provide a brief summary of why you gave this score.
      
      Text: "${text}"
      
      Return ONLY a JSON object with 'score' (number), 'sentiment' (string), and 'summary' (string).
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            sentiment: { 
              type: Type.STRING,
              enum: ['positive', 'neutral', 'negative']
            },
            summary: { type: Type.STRING }
          },
          required: ["score", "sentiment", "summary"]
        }
      }
    }));

    const result = JSON.parse(response.text || '{}');
    return result;
  } catch (error: any) {
    console.error("AI Sentiment Analysis Error:", error);
    return { score: 0, sentiment: 'neutral', summary: "Analysis unavailable" };
  }
}

export async function generateSupplierLogo(companyName: string, industry: string, language: string): Promise<{ logoText: string; bgColor: string; textColor: string; font: string }> {
  try {
    const langContext = language === 'ar' ? 'Arabic' : 'English';
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
      Design a text-based logo for a company named "${companyName}" in the "${industry}" industry.
      Suggest a background color, text color, and a font style (one of: 'Inter', 'Roboto', 'Poppins', 'Montserrat').
      The colors should be in HEX format.
      The logoText should be a short, stylized version of the company name (max 3 characters).
      
      The response must be in ${langContext}.
      Return ONLY a JSON object with 'logoText', 'bgColor', 'textColor', and 'font'.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            logoText: { type: Type.STRING },
            bgColor: { type: Type.STRING },
            textColor: { type: Type.STRING },
            font: { type: Type.STRING, enum: ['Inter', 'Roboto', 'Poppins', 'Montserrat'] }
          },
          required: ["logoText", "bgColor", "textColor", "font"]
        }
      }
    }));

    const text = response.text?.trim() || '{}';
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Logo Generation Error:", error);
    return { logoText: companyName.substring(0, 2).toUpperCase(), bgColor: "#1b97a7", textColor: "#FFFFFF", font: "Inter" };
  }
}

export async function generateBrandingSuggestions(name: string, description: string): Promise<{ primaryColor: string; secondaryColor: string; fontFamily: string; borderRadius: string; enableGlassmorphism: boolean }> {
  try {
    const response = await callAiWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest branding options (colors, fonts, effects) for a business named "${name}" with the following description: "${description}". 
      The primary and secondary colors should be in HEX format. 
      The font family must be one of: 'Inter', 'Roboto', 'Poppins', 'Montserrat'.
      The border radius must be one of: 'none', 'sm', 'md', 'lg', 'xl', '2xl', 'full'.
      Enable glassmorphism should be a boolean.
      
      Return ONLY a JSON object with 'primaryColor', 'secondaryColor', 'fontFamily', 'borderRadius', and 'enableGlassmorphism'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryColor: { type: Type.STRING },
            secondaryColor: { type: Type.STRING },
            fontFamily: { type: Type.STRING, enum: ['Inter', 'Roboto', 'Poppins', 'Montserrat'] },
            borderRadius: { type: Type.STRING, enum: ['none', 'sm', 'md', 'lg', 'xl', '2xl', 'full'] },
            enableGlassmorphism: { type: Type.BOOLEAN }
          },
          required: ["primaryColor", "secondaryColor", "fontFamily", "borderRadius", "enableGlassmorphism"]
        }
      }
    }));

    const text = response.text?.trim() || '{}';
    return JSON.parse(text);
  } catch (error: any) {
    console.error("AI Branding Suggestions Error:", error);
    return { primaryColor: '#1b97a7', secondaryColor: '#64748b', fontFamily: 'Inter', borderRadius: 'xl', enableGlassmorphism: true };
  }
}
