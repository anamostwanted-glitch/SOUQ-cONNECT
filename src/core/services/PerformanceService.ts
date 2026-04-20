import { collection, query, where, getDocs, doc, setDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, MarketplaceItem, ProductRequest, SupplierPerformance } from '../types';
import { callAiJson, handleAiError } from './geminiService';
import { Type } from "@google/genai";

/**
 * Performance & Optimization Service (Core Team - Solution Architect & Growth Hacker)
 * Analyzes supplier performance and market demand to provide actionable insights.
 */
export class PerformanceService {
  /**
   * Generates a performance report for a supplier.
   */
  static async generateSupplierReport(supplierId: string): Promise<SupplierPerformance | null> {
    try {
      // 1. Fetch supplier profile
      const supplierDoc = await getDocs(query(collection(db, 'users_public'), where('uid', '==', supplierId)));
      if (supplierDoc.empty) return null;
      const supplier = supplierDoc.docs[0].data() as UserProfile;

      // 2. Fetch recent activity for baseline
      // (Simplified: using existing performance stats or calculating new ones)
      const avgResponseTime = supplier.performance?.avgResponseTimeMinutes || 60;
      const responseRate = supplier.performance?.responseRate || 80;

      // 3. Analyze "Missed Match Opportunities" 
      // Query recent open requests in supplier's categories
      const categories = supplier.categories || [];
      let unmetDemandHits = 0;
      
      if (categories.length > 0) {
        const requestsQ = query(
          collection(db, 'requests'),
          where('categoryId', 'in', categories),
          where('status', '==', 'open'),
          limit(50)
        );
        const requestsSnap = await getDocs(requestsQ);
        unmetDemandHits = requestsSnap.size;
      }

      // 4. Get AI suggestions for improvement
      const aiResponse = await callAiJson(
        `Analyze supplier performance:
         Response Rate: ${responseRate}%
         Avg Response Time: ${avgResponseTime} mins
         Unmet Demand Hits (Potential matches missed): ${unmetDemandHits}
         Supplier Categories: ${JSON.stringify(categories)}
         
         Provide 3 actionable growth suggestions in Arabic and English to improve these metrics.
         Return ONLY a JSON object with 'suggestionsAr' and 'suggestionsEn' arrays.`,
        {
          type: Type.OBJECT,
          properties: {
            suggestionsAr: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestionsEn: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["suggestionsAr", "suggestionsEn"]
        }
      );

      const performance: SupplierPerformance = {
        supplierId,
        avgResponseTime,
        matchRate: responseRate,
        unmetDemandHits,
        suggestions: i18n_merge(aiResponse.suggestionsAr, aiResponse.suggestionsEn),
        calculatedAt: new Date().toISOString()
      };

      // 5. Store report
      await setDoc(doc(db, 'supplier_performance', supplierId), performance);

      return performance;
    } catch (error) {
      handleAiError(error, 'performance_report');
      return null;
    }
  }

  /**
   * Aggregates demand insights for the platform.
   */
  static async calculateDemandInsights() {
    // Implementation for admin/system level analysis
    // Scans all 'open' requests and aggregates keywords/categories
  }
}

function i18n_merge(ar: string[], en: string[]): string[] {
  // Store both for UI to decide
  return [...en, ...ar];
}
