import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/errorHandling';

export interface SecurityEvent {
  userId: string;
  eventType: 'login' | 'failed_login' | 'data_export' | 'pii_access' | 'suspicious_activity';
  metadata?: any;
}

export class SecurityService {
  /**
   * Enforces soft-delete by updating the status instead of physical deletion.
   */
  static getSoftDeletePayload() {
    return {
      status: 'deleted',
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    };
  }

  /**
   * Basic Rate Limiting based on localStorage (Client-side protection layer)
   */
  static checkRateLimit(actionName: string, maxRequestsPerMinute: number): boolean {
    const key = `ratelimit_${actionName}`;
    const now = Date.now();
    const historyStr = localStorage.getItem(key);
    let history: number[] = historyStr ? JSON.parse(historyStr) : [];
    
    // Filter out requests older than 1 minute (60000 ms)
    history = history.filter(time => now - time < 60000);
    
    if (history.length >= maxRequestsPerMinute) {
      return false; // Rate limit exceeded
    }
    
    history.push(now);
    localStorage.setItem(key, JSON.stringify(history));
    return true; // Allowed
  }

  /**
   * Log high-risk actions to audit_logs
   */
  static async logSecurityEvent(event: SecurityEvent) {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        ...event,
        timestamp: new Date().toISOString(),
        _serverTimestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to log security event', error);
    }
  }

  /**
   * PII Redaction: Removes emails and phone numbers from raw text.
   */
  static redactPII(text: string): string {
    if (!text) return text;
    // Basic email and phone regex
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const phoneRegex = /(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;
    
    return text
      .replace(emailRegex, '[REDACTED EMAIL]')
      .replace(phoneRegex, '[REDACTED PHONE]');
  }
}
