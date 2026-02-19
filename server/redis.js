const Redis = require('ioredis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Create Redis client with configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true, // Don't connect until needed
});

// Create separate client for pub/sub
const redisSub = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

// Event handlers
redis.on('connect', () => {
  console.log('Redis client connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redisSub.on('connect', () => {
  console.log('Redis subscriber connected');
});

redisSub.on('error', (err) => {
  console.error('Redis subscriber error:', err);
});

// Connect both clients
async function connectRedis() {
  try {
    await redis.connect();
    await redisSub.connect();
    console.log('Redis clients ready');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    throw err;
  }
}

module.exports = {
  redis,
  redisSub,
  connectRedis
};
