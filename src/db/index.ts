import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

function getDbClient() {
  const connectionString = process.env.DATABASE_URL;

  const isPlaceholder =
    !connectionString ||
    connectionString.includes('[PASSWORD]') ||
    connectionString.includes('[SUPABASE_REF]') ||
    connectionString.includes('your-supabase');

  if (isPlaceholder) {
    const fallbackClient = postgres('postgresql://postgres:placeholder@127.0.0.1:5432/postgres', {
      prepare: false,
      connect_timeout: 1,
      max: 1,
    });
    return drizzle(fallbackClient, { schema });
  }

  // Reuse existing connection pool in Next.js development hot-reloads
  if (!globalForDb.conn) {
    globalForDb.conn = postgres(connectionString, {
      prepare: false,
      ssl: 'require',
      max: 3, // Conservative connection limit for serverless / Next.js
      idle_timeout: 10,
      connect_timeout: 10,
    });
  }

  return drizzle(globalForDb.conn, { schema });
}

export const db = getDbClient();
