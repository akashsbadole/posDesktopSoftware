// lib/rateLimiter.ts
// Rate limiting utility to prevent brute force attacks

interface RateLimitEntry {
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private attempts = new Map<string, RateLimitEntry>();
  private maxAttempts = 5; // Max attempts per window
  private windowMs = 15 * 60 * 1000; // 15 minutes
  private blockDurationMs = 30 * 60 * 1000; // 30 minutes block

  isBlocked(key: string): boolean {
    const entry = this.attempts.get(key);
    if (!entry) return false;

    const now = Date.now();

    // Check if currently blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return true;
    }

    // Reset if window has passed
    if (now - entry.lastAttempt > this.windowMs) {
      this.attempts.delete(key);
      return false;
    }

    return false;
  }

  recordAttempt(key: string, success: boolean = false): { allowed: boolean; remainingAttempts: number; blockedUntil?: number } {
    const now = Date.now();
    let entry = this.attempts.get(key);

    if (!entry) {
      entry = { attempts: 0, lastAttempt: now };
      this.attempts.set(key, entry);
    }

    // Reset if window has passed
    if (now - entry.lastAttempt > this.windowMs) {
      entry.attempts = 0;
      entry.blockedUntil = undefined;
    }

    entry.lastAttempt = now;

    if (success) {
      // Successful login resets the counter
      entry.attempts = 0;
      entry.blockedUntil = undefined;
      return { allowed: true, remainingAttempts: this.maxAttempts };
    }

    entry.attempts++;

    if (entry.attempts >= this.maxAttempts) {
      entry.blockedUntil = now + this.blockDurationMs;
      return {
        allowed: false,
        remainingAttempts: 0,
        blockedUntil: entry.blockedUntil
      };
    }

    return {
      allowed: true,
      remainingAttempts: this.maxAttempts - entry.attempts
    };
  }

  getRemainingTime(key: string): number {
    const entry = this.attempts.get(key);
    if (!entry?.blockedUntil) return 0;

    const remaining = entry.blockedUntil - Date.now();
    return Math.max(0, remaining);
  }

  clear(key: string) {
    this.attempts.delete(key);
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.attempts.entries()) {
      if (now - entry.lastAttempt > this.windowMs * 2) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.attempts.delete(key));
  }
}

// Create singleton instances for different contexts
export const authRateLimiter = new RateLimiter();

// Clean up old entries every hour
setInterval(() => {
  authRateLimiter.cleanup();
}, 60 * 60 * 1000);