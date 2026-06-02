/**
 * Lightweight retry wrapper for Neon serverless driver transient failures.
 *
 * Neon recommends retry logic for HTTP queries to handle brief connection drops
 * during maintenance, updates, or network interruptions.
 *
 * Uses exponential backoff with jitter. No external dependencies.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  retries?: number;
  /** Base delay in ms before first retry (default: 200) */
  baseDelay?: number;
  /** Maximum delay cap in ms (default: 5000) */
  maxDelay?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  retries: 3,
  baseDelay: 200,
  maxDelay: 5000,
};

/**
 * Determines if an error is a transient Neon/network failure worth retrying.
 */
function isTransient(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    // Network-level failures
    if (msg.includes("fetch failed") || msg.includes("network")) return true;
    // Neon compute waking from scale-to-zero
    if (msg.includes("endpoint is starting") || msg.includes("connection timeout")) return true;
    // HTTP 502/503/429 from Neon proxy
    if (msg.includes("502") || msg.includes("503") || msg.includes("429")) return true;
    // TCP-level resets
    if (msg.includes("econnreset") || msg.includes("socket hang up")) return true;
  }
  return false;
}

/**
 * Execute an async operation with retry on transient failures.
 *
 * @example
 * ```ts
 * import { withRetry } from "@/lib/neon-retry";
 * const rows = await withRetry(() => db.select().from(users));
 * ```
 */
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  const { retries, baseDelay, maxDelay } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries || !isTransient(err)) {
        throw err;
      }
      // Exponential backoff with jitter
      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      const jitter = delay * (0.5 + Math.random() * 0.5);
      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }
  throw lastError;
}
