/**
 * Neural Cache Utility
 * Implements "Semantic Mirroring" to reduce AI token usage by caching 
 * results locally based on semantic fingerprints.
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresIn: number;
}

const CACHE_PREFIX = 'neural_pulse_cache_';
const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export const neuralCache = {
  /**
   * Generates a fingerprint for an image based on its base64 data
   */
  generateImageFingerprint: (base64: string): string => {
    // We take chunks from start, middle, and end to create a unique enough signature
    const length = base64.length;
    const part1 = base64.substring(0, 50);
    const part2 = base64.substring(Math.floor(length / 2), Math.floor(length / 2) + 50);
    const part3 = base64.substring(length - 50);
    return `img_${length}_${btoa(part1 + part2 + part3).substring(0, 32)}`;
  },

  /**
   * Generates a fingerprint for voice transcripts (normalized)
   */
  generateVoiceFingerprint: (transcript: string): string => {
    const normalized = transcript.toLowerCase().trim().replace(/\s+/g, ' ');
    return `voice_${btoa(unescape(encodeURIComponent(normalized))).substring(0, 32)}`;
  },

  /**
   * Generates a fingerprint for geo-location (bucketed to ~100m precision)
   */
  generateGeoFingerprint: (lat: number, lng: number, interests: string[]): string => {
    // Precision of 3 decimal places is roughly 110 meters
    const bucketLat = lat.toFixed(3);
    const bucketLng = lng.toFixed(3);
    const interestKey = interests.sort().join('|');
    return `geo_${bucketLat}_${bucketLng}_${btoa(interestKey).substring(0, 16)}`;
  },

  set: (key: string, data: any, expiresIn = DEFAULT_EXPIRY) => {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiresIn
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  },

  get: (key: string): any | null => {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;

    try {
      const entry: CacheEntry = JSON.parse(raw);
      const now = Date.now();
      if (now - entry.timestamp > entry.expiresIn) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return entry.data;
    } catch (e) {
      return null;
    }
  },

  clear: () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
};
