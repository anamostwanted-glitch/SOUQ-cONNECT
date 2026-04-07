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

const getResponseText = (response: any): string => {
  try {
    return typeof response.text === 'function' ? response.text() : (response.text || '');
  } catch (e) {
    console.warn("Error getting response text:", e);
    return '';
  }
};

export async function analyzeProductImage(base64Image: string, mimeType: string): Promise<AIProductSuggestion | null> {
  try {
    const response = await fetch('/api/analyze-product', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType: mimeType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 429) throw new Error('QUOTA_EXHAUSTED');
      if (errorData.error === 'AI service configuration missing') throw new Error('MISSING_API_KEY');
      throw new Error(errorData.error || 'Server error');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error in analyzeProductImage proxy:', error);
    if (error.message === 'QUOTA_EXHAUSTED' || error.message === 'MISSING_API_KEY') throw error;
    return null;
  }
}

export async function generateAlternativeProductImage(base64Image: string, mimeType: string, title: string, category: string): Promise<string | null> {
  try {
    const response = await fetch('/api/generate-product-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType: mimeType,
        title,
        category
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 429) throw new Error('QUOTA_EXHAUSTED');
      if (errorData.error === 'AI service configuration missing') throw new Error('MISSING_API_KEY');
      throw new Error(errorData.error || 'Server error');
    }

    const data = await response.json();
    return data.image || null;
  } catch (error: any) {
    console.error('Error in generateAlternativeProductImage proxy:', error);
    if (error.message === 'QUOTA_EXHAUSTED' || error.message === 'MISSING_API_KEY') throw error;
    return null;
  }
}
