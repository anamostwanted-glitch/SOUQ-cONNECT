export class AIResilienceManager {
  private static failureCount = 0;
  private static isCircuitOpen = false;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_RETRIES = 2;
  private static readonly RETRY_DELAY = 2000; // 2 seconds

  /**
   * Returns whether AI services are currently operational.
   * This can be used by UI components to show/hide AI features.
   */
  static isOperational(): boolean {
    return !this.isCircuitOpen;
  }

  /**
   * Executes an AI task with a circuit breaker and retry logic.
   * If the circuit is open or task fails repeatedly, it returns the fallback.
   */
  static async execute<T>(
    task: () => Promise<T>, 
    fallback: T, 
    context: string,
    onStatusChange?: (isHealthy: boolean) => void
  ): Promise<T> {
    if (this.isCircuitOpen) {
      console.warn(`[AI-RESILIENCE:DEGRADED] Circuit open for ${context}, using static fallback.`);
      onStatusChange?.(false);
      return fallback;
    }

    let lastError: any;
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[AI-RESILIENCE:RETRY] ${context} (attempt ${attempt}/${this.MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
        }
        
        const result = await task();
        this.failureCount = 0; // Reset on success
        onStatusChange?.(true);
        return result;
      } catch (error: any) {
        lastError = error;
        
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

    // Handle Persistent Failure
    this.failureCount++;
    console.error(`[AI-RESILIENCE:FAILURE] Task ${context} failed (${this.failureCount}/${this.CIRCUIT_BREAKER_THRESHOLD}).`, lastError);
    
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.isCircuitOpen = true;
      onStatusChange?.(false);
      console.error(`[AI-RESILIENCE:LOCKDOWN] AI services disabled for ${this.CIRCUIT_BREAKER_TIMEOUT / 1000}s due to instability.`);
      
      setTimeout(() => { 
        this.isCircuitOpen = false; 
        this.failureCount = 0; 
        console.log(`[AI-RESILIENCE:RECOVERY] Attempting to reconnect to AI services.`);
      }, this.CIRCUIT_BREAKER_TIMEOUT);
    }

    return fallback;
  }
}
