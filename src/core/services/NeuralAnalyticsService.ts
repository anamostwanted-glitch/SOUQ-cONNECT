import { ProductRequest, Offer, UserProfile } from '../types';

export interface PriceInsight {
  suggestedMin: number;
  suggestedMax: number;
  confidenceScore: number;
  marketTrend: 'rising' | 'falling' | 'stable';
}

export class NeuralAnalyticsService {
  /**
   * Predictive Matchmaking Engine v2:
   * Uses a simulated collaborative filtering heuristic to match a request 
   * to the best suppliers based on historical performance.
   */
  static getTopSuppliersForRequest(
    request: ProductRequest, 
    allSuppliers: UserProfile[], 
    historicalOffers: Offer[]
  ): UserProfile[] {
    // Logic: Rank suppliers by category match, then by their acceptance rate
    const categorySuppliers = allSuppliers.filter(s => 
      s.role === 'supplier' && s.categories?.includes(request.categoryId)
    );

    const scoredSuppliers = categorySuppliers.map(supplier => {
      // Find historical offers made by this supplier
      const supplierOffers = historicalOffers.filter(o => o.supplierId === supplier.uid);
      const acceptedOffers = supplierOffers.filter(o => o.status === 'accepted');
      
      const acceptanceRate = supplierOffers.length > 0 
        ? acceptedOffers.length / supplierOffers.length 
        : 0;

      // Base score on profile completeness + acceptance rate
      let score = (supplier.onboardingCompleted ? 10 : 0);
      score += acceptanceRate * 50; 
      
      return { supplier, score };
    });

    // Sort descending by score
    scoredSuppliers.sort((a, b) => b.score - a.score);

    // Return top 5
    return scoredSuppliers.slice(0, 5).map(s => s.supplier);
  }

  /**
   * Dynamic Pricing & Intelligence:
   * Calculates the "Fair Price" based on recent offers for similar requests.
   */
  static calculateDynamicPrice(
    category: string, 
    recentOffers: Offer[]
  ): PriceInsight {
    // Filter offers in the same category (in a real app, you'd match the request category, here we just use all recent)
    // Assume all passed offers are relevant for the sake of this mock.
    if (!recentOffers || recentOffers.length === 0) {
      return {
        suggestedMin: 0,
        suggestedMax: 0,
        confidenceScore: 0,
        marketTrend: 'stable'
      };
    }

    const prices = recentOffers.map(o => o.price).sort((a, b) => a - b);
    
    // Trim outliers (top 10% and bottom 10%)
    const trimCount = Math.floor(prices.length * 0.1);
    const validPrices = prices.slice(trimCount, prices.length - trimCount);
    
    if (validPrices.length === 0) {
        return {
            suggestedMin: prices[0],
            suggestedMax: prices[prices.length - 1],
            confidenceScore: 0.3,
            marketTrend: 'stable'
        };
    }

    const sum = validPrices.reduce((a, b) => a + b, 0);
    const avg = sum / validPrices.length;

    // Standard deviation
    const squareDiffs = validPrices.map(p => Math.pow(p - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / validPrices.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    return {
      suggestedMin: Math.max(0, avg - stdDev),
      suggestedMax: avg + stdDev,
      confidenceScore: Math.min(0.95, validPrices.length / 50), // Confidence grows with data size
      marketTrend: this.calculateTrend(validPrices)
    };
  }

  private static calculateTrend(prices: number[]): 'rising' | 'falling' | 'stable' {
    if (prices.length < 3) return 'stable';
    // Compare first half to second half
    const half = Math.floor(prices.length / 2);
    const firstHalfAvg = prices.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalfAvg = prices.slice(half).reduce((a, b) => a + b, 0) / (prices.length - half);

    if (secondHalfAvg > firstHalfAvg * 1.05) return 'rising';
    if (secondHalfAvg < firstHalfAvg * 0.95) return 'falling';
    return 'stable';
  }

  /**
   * Neural Pulse Sentiment Analysis:
   * A localized sentiment analyzer that flags potential friction in negotiations.
   */
  static analyzeChatSentiment(messages: string[]): {
    score: number; // 0 to 1
    flagged: boolean;
    issues: string[];
  } {
    const negativeKeywords = ['delay', 'expensive', 'cancel', 'bad', 'wrong', 'late', 'تأخير', 'غالي', 'الغاء', 'سيء', 'خطأ', 'مشكلة'];
    
    let negativeHits = 0;
    const detectedIssues = new Set<string>();

    messages.forEach(msg => {
      const lower = msg.toLowerCase();
      negativeKeywords.forEach(keyword => {
        if (lower.includes(keyword)) {
          negativeHits++;
          detectedIssues.add(keyword);
        }
      });
    });

    const intensity = Math.min(1, negativeHits / Math.max(1, messages.length));
    
    return {
      score: 1 - intensity, // 1 = very positive, 0 = very negative
      flagged: intensity > 0.3,
      issues: Array.from(detectedIssues)
    };
  }
}
