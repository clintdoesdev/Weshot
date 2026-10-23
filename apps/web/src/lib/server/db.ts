import { PrismaClient } from '@prisma/client';

const g = globalThis as unknown as { __weshotPrisma?: PrismaClient };

/** One client per server instance (dev hot reload keeps it on globalThis). */
export const db = g.__weshotPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.__weshotPrisma = db;
