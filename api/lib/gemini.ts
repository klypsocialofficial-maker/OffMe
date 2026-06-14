import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

/**
 * Retries an AI operation with exponential backoff on transient errors (500, 503, 429).
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 5,
  initialDelayMs: number = 1500
): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const status = error?.status || 0;
      const message = error?.message || "";
      
      // Retry on transient status codes or specific messages
      const isTransient = [429, 500, 503, 504].includes(status) || 
                          message.includes("503") || 
                          message.includes("Service Unavailable") ||
                          message.includes("deadline exceeded");

      if (!isTransient || attempt === maxAttempts) {
        throw error;
      }

      // Exponential backoff with jitter
      const exponentialDelay = initialDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
      const delay = exponentialDelay + jitter;
      
      console.warn(`[Gemini Retry] Attempt ${attempt} failed with status ${status}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
