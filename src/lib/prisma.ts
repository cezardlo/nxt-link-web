import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

function resolveDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL;

  // Vercel filesystem is read-only except /tmp. Bootstrap a writable copy there.
  if (process.env.VERCEL) {
    // Keep externally managed database URLs (e.g. postgres) untouched.
    if (explicit && explicit.trim().length > 0 && !explicit.trim().startsWith('file:')) {
      return explicit;
    }

    const runtimeDir = path.join('/tmp', 'nxt-link');
    const runtimeDb = path.join(runtimeDir, 'dev.db');
    const explicitFilePath =
      explicit && explicit.trim().startsWith('file:')
        ? explicit.trim().slice('file:'.length)
        : '';
    const candidateSeeds = [
      explicitFilePath,
      explicitFilePath ? path.resolve(process.cwd(), explicitFilePath) : '',
      path.join(process.cwd(), 'prisma', 'dev.db'),
      path.join(process.cwd(), '.next', 'server', 'prisma', 'dev.db'),
    ].filter(Boolean);
    const seedDb = candidateSeeds.find((candidate) => existsSync(candidate));

    if (!existsSync(runtimeDir)) {
      mkdirSync(runtimeDir, { recursive: true });
    }
    if (!existsSync(runtimeDb) && seedDb) {
      copyFileSync(seedDb, runtimeDb);
    }
    return `file:${runtimeDb}`;
  }

  if (explicit && explicit.trim().length > 0) {
    return explicit;
  }

  return 'file:./prisma/dev.db';
}

const adapter = new PrismaBetterSqlite3({
  url: resolveDatabaseUrl(),
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
