// Simple in-memory TTL cache — no external dependencies.
// Upgrade path: swap the store for ioredis with the same API if a managed
// Redis instance is provisioned (e.g. Digital Ocean Redis add-on).

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class TTLCache {
    private readonly store = new Map<string, CacheEntry<unknown>>();
    private readonly cleanupTimer: NodeJS.Timeout;

    constructor(cleanupIntervalMs = 60_000) {
        // Periodic sweep so stale entries don't accumulate in memory.
        this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
        this.cleanupTimer.unref(); // Never block graceful shutdown.
    }

    set<T>(key: string, value: T, ttlMs: number): void {
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    }

    get<T>(key: string): T | undefined {
        const entry = this.store.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) { this.store.delete(key); return undefined; }
        return entry.value as T;
    }

    del(key: string): void { this.store.delete(key); }

    /** Remove all keys that start with a given prefix (e.g. 'perm:'). */
    invalidatePrefix(prefix: string): void {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) this.store.delete(key);
        }
    }

    get size(): number { return this.store.size; }

    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) this.store.delete(key);
        }
    }

    destroy(): void { clearInterval(this.cleanupTimer); this.store.clear(); }
}

// Singleton shared across the process.
export const cache = new TTLCache();

// TTL constants — centralised so tuning is easy.
export const TTL = {
    PERMISSIONS:  5 * 60 * 1000,   // 5 min — permission_matrix rarely changes
    DASHBOARD:    60 * 1000,         // 1 min — acceptable staleness for KPI stats
    PLANS:        60 * 60 * 1000,   // 1 h   — subscription plans are static reference data
} as const;
