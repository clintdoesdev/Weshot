import { Redis } from 'ioredis';

let shared: Redis | null = null;

/** Shared connection for commands. BullMQ needs `maxRetriesPerRequest: null`. */
export function getRedis(): Redis {
  if (!shared) shared = createRedis();
  return shared;
}

export function createRedis(): Redis {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  return new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: true, lazyConnect: false });
}
