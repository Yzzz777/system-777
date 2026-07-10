class TTLCache {
  constructor(defaultTTL = 30000) {
    this._store = new Map();
    this._defaultTTL = defaultTTL;
  }

  set(key, value, ttl) {
    this._store.set(key, { value, expires: Date.now() + (ttl || this._defaultTTL) });
  }

  get(key) {
    const e = this._store.get(key);
    if (!e) return undefined;
    if (Date.now() > e.expires) { this._store.delete(key); return undefined; }
    return e.value;
  }

  has(key) { return this.get(key) !== undefined; }
  del(key) { this._store.delete(key); }
  clear() { this._store.clear(); }
  size() { return this._store.size; }

  prune() {
    const now = Date.now();
    for (const [k, e] of this._store) if (now > e.expires) this._store.delete(k);
  }
}

const dbFileCache = new TTLCache(30000);   // 30s — JSON file contents
const guildCache  = new TTLCache(60000);   // 1min — guild config
const memberCache = new TTLCache(120000);  // 2min — member lookups

setInterval(() => { dbFileCache.prune(); guildCache.prune(); memberCache.prune(); }, 60000);

module.exports = { TTLCache, dbFileCache, guildCache, memberCache };
