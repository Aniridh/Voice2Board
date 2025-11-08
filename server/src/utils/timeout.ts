/**
 * Wraps a promise with a timeout
 * @param p Promise to wrap
 * @param ms Timeout in milliseconds (default: 20000)
 * @returns Promise that rejects with timeout error if not resolved in time
 */
export const withTimeout = <T>(
  p: Promise<T>,
  ms = 20_000
): Promise<T> => {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    ),
  ]);
};

/**
 * Calls a function with retry logic and timeout
 * @param fn Function that returns a promise
 * @param attempts Number of retry attempts (default: 3)
 * @param timeoutMs Timeout per attempt in milliseconds (default: 20000)
 * @returns Promise result
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  timeoutMs = 20_000
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (err: any) {
      if (i === attempts - 1) {
        throw err;
      }
      // Exponential backoff: 300ms, 600ms, 900ms...
      await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
    }
  }
  throw new Error('Retry exhausted');
}

