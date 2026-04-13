export class AIResilienceManager {
  private static failureCount = 0;
  private static isCircuitOpen = false;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_RETRIES = 2;
  private static readonly RETRY_DELAY = 2000; // 2 seconds

  static async execute<T>(
    task: () => Promise<T>, 
    fallback: T, 
    context: string,
    isFailure?: (error: any) => boolean
  ): Promise<T> {
    if (this.isCircuitOpen) {
      console.warn(`AI Resilience: Circuit open for ${context}, returning fallback.`);
      return fallback;
    }

    let lastError: any;
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`AI Resilience: Retrying ${context} (attempt ${attempt}/${this.MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
        }
        
        const result = await task();
        this.failureCount = 0; // Success!
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Check if we should retry (only for 503/UNAVAILABLE or high demand)
        const errorMessage = error.message || JSON.stringify(error);
        const isRetryable = errorMessage.includes('503') || 
                          errorMessage.includes('UNAVAILABLE') || 
                          errorMessage.includes('high demand') ||
                          errorMessage.includes('temporary');

        if (!isRetryable || attempt === this.MAX_RETRIES) {
          break;
        }
      }
    }

    // If we reach here, it's a final failure
    const error = lastError;
    if (!isFailure || isFailure(error)) {
      this.failureCount++;
      console.error(`AI Resilience: Task ${context} failed (${this.failureCount}/${this.CIRCUIT_BREAKER_THRESHOLD}).`, error);
      
      if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
        this.isCircuitOpen = true;
        console.error(`AI Resilience: Circuit opened for ${context}.`);
        setTimeout(() => { 
          this.isCircuitOpen = false; 
          this.failureCount = 0; 
          console.log(`AI Resilience: Circuit closed for ${context}.`);
        }, this.CIRCUIT_BREAKER_TIMEOUT);
      }
    } else {
      console.warn(`AI Resilience: Task ${context} failed but not counting as failure for circuit breaker.`, error);
    }
    return fallback;
  }
}
