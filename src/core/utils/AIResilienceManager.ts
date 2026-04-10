export class AIResilienceManager {
  private static failureCount = 0;
  private static isCircuitOpen = false;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

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

    try {
      const result = await task();
      this.failureCount = 0; // Success!
      return result;
    } catch (error) {
      // Only count as failure if isFailure is not provided or returns true
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
}
