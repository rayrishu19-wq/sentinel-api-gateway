const Redis = require('ioredis');

let redisClient;
let isRedisConnected = false;

// Mock Redis client for fallback if local Redis is not installed/running
const mockRedis = {
  store: {},
  async get(key) {
    return this.store[key] || null;
  },
  async set(key, value, mode, duration) {
    this.store[key] = value;
    if (mode === 'EX' && duration) {
      setTimeout(() => {
        delete this.store[key];
      }, duration * 1000);
    }
    return 'OK';
  },
  async eval(script, numKeys, key, ...args) {
    // Basic mock implementation of Token Bucket Redis Script
    const limit = parseInt(args[0]);
    const refillRate = parseInt(args[1]);
    const now = Math.floor(Date.now() / 1000);
    
    let bucket = this.store[key] ? JSON.parse(this.store[key]) : null;
    
    if (!bucket) {
      bucket = { tokens: limit, lastRefill: now };
    } else {
      const elapsed = now - bucket.lastRefill;
      const refilled = elapsed * refillRate;
      bucket.tokens = Math.min(limit, bucket.tokens + refilled);
      bucket.lastRefill = now;
    }
    
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.store[key] = JSON.stringify(bucket);
      return 1; // Success
    } else {
      this.store[key] = JSON.stringify(bucket);
      return 0; // Rate limited
    }
  },
  on(event, callback) {
    console.log(`[Mock Redis] Listener registered for event: ${event}`);
  }
};

try {
  // Connect to Redis with a short connection timeout to fail fast
  redisClient = new Redis({
    host: '127.0.0.1',
    port: 6379,
    connectTimeout: 2000,
    maxRetriesPerRequest: 1
  });

  redisClient.on('connect', () => {
    isRedisConnected = true;
    console.log('✅ Successfully connected to Redis Server on localhost:6379');
  });

  redisClient.on('error', (err) => {
    if (!isRedisConnected) {
      console.warn('⚠️  Redis connection failed. Falling back to in-memory store for rate limiting and caching.');
      // Swap out redisClient with the mock implementation
      redisClient = mockRedis;
      isRedisConnected = true; // Set to true to prevent repeating warnings
    }
  });
} catch (e) {
  console.warn('⚠️  Could not initialize Redis client. Falling back to in-memory store.');
  redisClient = mockRedis;
}

module.exports = {
  getRedisClient: () => redisClient,
  isUsingMock: () => redisClient === mockRedis
};
