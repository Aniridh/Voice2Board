/**
 * Sanitize and validate input strings
 */
export function sanitizeTranscript(transcript: string): string {
  // Trim whitespace
  let sanitized = transcript.trim();
  
  // Cap length at 500 characters
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500);
  }
  
  return sanitized;
}

/**
 * Check if a string contains only ASCII printable characters
 * Rejects binary data and non-ASCII characters
 */
export function isASCIIPrintable(str: string): boolean {
  // Check each character is in ASCII printable range (32-126) or common whitespace
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Allow: space (32), printable ASCII (33-126), newline (10), tab (9), carriage return (13)
    if (code < 9 || (code > 13 && code < 32) || code > 126) {
      return false;
    }
  }
  return true;
}

/**
 * Validate request body contains only ASCII printable strings
 */
export function validateASCIIPayload(body: any): { valid: boolean; error?: string } {
  if (typeof body !== 'object' || body === null) {
    return { valid: false, error: 'Invalid payload type' };
  }

  for (const [key, value] of Object.entries(body)) {
    // Skip apiKey field (it's validated separately)
    if (key === 'apiKey') {
      continue;
    }

    if (typeof value === 'string') {
      if (!isASCIIPrintable(value)) {
        return {
          valid: false,
          error: `Field "${key}" contains non-ASCII or binary data`,
        };
      }
    } else if (typeof value === 'object' && value !== null) {
      // Recursively check nested objects
      const nested = validateASCIIPayload(value);
      if (!nested.valid) {
        return nested;
      }
    }
  }

  return { valid: true };
}

