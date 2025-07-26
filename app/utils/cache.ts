/**
 * Simple in-memory cache implementation for API responses
 * Helps reduce redundant GraphQL queries and improve performance
 */
class MemoryCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  /**
   * Set cache entry with TTL (Time To Live)
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (default: 5 minutes)
   */
  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get cache entry if not expired
   * @param key - Cache key
   * @returns Cached data or null if expired/not found
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Check if cache has valid entry
   * @param key - Cache key
   * @returns Boolean indicating if valid cache exists
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear specific cache entry
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns Object with cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache key generators
export const cacheKeys = {
  products: (limit: number = 50) => `products:${limit}`,
  product: (id: string) => `product:${id}`,
  productOptions: (productId: string) => `product-options:${productId}`,
  templates: () => 'templates:all',
  template: (id: string) => `template:${id}`,
  analytics: (date: string) => `analytics:${date}`,
} as const;

// Auto cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    cache.cleanup();
  }, 10 * 60 * 1000);
}