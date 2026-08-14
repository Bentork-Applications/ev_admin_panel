/**
 * Centralized High-Performance In-Memory & Storage Page Cache
 * Enables Stale-While-Revalidate fast initial renders for instant page load & refresh.
 */

const memoryCache = new Map();

export const pageCache = {
  get: (key) => {
    if (!key) return null;
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
    }
    try {
      const stored = sessionStorage.getItem(`page_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        memoryCache.set(key, parsed);
        return parsed;
      }
    } catch (err) {
      console.warn("pageCache read error:", err);
    }
    return null;
  },

  set: (key, data) => {
    if (!key || data === undefined || data === null) return;
    memoryCache.set(key, data);
    try {
      sessionStorage.setItem(`page_cache_${key}`, JSON.stringify(data));
    } catch (err) {
      console.warn("pageCache write error:", err);
    }
  },

  invalidate: (keyPattern) => {
    if (!keyPattern) {
      memoryCache.clear();
      try {
        Object.keys(sessionStorage).forEach((k) => {
          if (k.startsWith("page_cache_")) sessionStorage.removeItem(k);
        });
      } catch {}
      return;
    }
    for (const k of memoryCache.keys()) {
      if (k.includes(keyPattern)) {
        memoryCache.delete(k);
      }
    }
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith("page_cache_") && k.includes(keyPattern)) {
          sessionStorage.removeItem(k);
        }
      });
    } catch {}
  }
};
