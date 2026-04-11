import { Message, ProductRequest } from '../types';
import { callAiJson, callAiText } from './geminiService';
import { AIResilienceManager } from '../utils/AIResilienceManager';
import { Type } from "@google/genai";

export interface NegotiationInsight {
  priceRecommendation: number;
  negotiationStrategy: string;
  riskLevel: 'low' | 'medium' | 'high';
  keyPoints: string[];
}

export const analyzeNegotiation = async (messages: Message[], product: ProductRequest): Promise<NegotiationInsight> => {
  const fallback: NegotiationInsight = {
    priceRecommendation: 0,
    negotiationStrategy: 'Maintain professional tone, focus on value.',
    riskLevel: 'medium',
    keyPoints: ['Ensure clear communication', 'Focus on product quality']
  };

  return AIResilienceManager.execute(async () => {
    const prompt = `Analyze the following negotiation between a customer and a supplier for the product: "${product.productName}".
      
      Messages: ${JSON.stringify(messages.map(m => ({ sender: m.senderId, text: m.text })))}
      
      Provide a negotiation insight.
      
      Return JSON: { priceRecommendation: number, negotiationStrategy: string, riskLevel: 'low' | 'medium' | 'high', keyPoints: string[] }`;

    const result = await callAiJson(
      prompt,
      {
        type: Type.OBJECT,
        properties: {
          priceRecommendation: { type: Type.NUMBER },
          negotiationStrategy: { type: Type.STRING },
          riskLevel: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["priceRecommendation", "negotiationStrategy", "riskLevel", "keyPoints"]
      }
    );
    
    if (!result) throw new Error('AI returned null');
    return result;
  }, fallback, 'Negotiation Analysis');
};

export const generateSmartReplies = async (messages: Message[]): Promise<string[]> => {
  const fallback: string[] = ['Could you provide more details?', 'Thank you for the offer.', 'Let me check with my team.'];

  return AIResilienceManager.execute(async () => {
    const prompt = `Generate 3 smart, professional replies for the following negotiation messages:
      ${JSON.stringify(messages.slice(-5).map(m => ({ sender: m.senderId, text: m.text })))}
      
      Return a JSON array of 3 strings.`;

    const result = await callAiJson(
      prompt,
      {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    );
    
    if (!result) throw new Error('AI returned null');
    return result.slice(0, 3);
  }, fallback, 'Smart Replies Generation');
};
