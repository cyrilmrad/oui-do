import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("Missing DATABASE_URL entirely - Drizzle ORM cannot connect.");
}

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as typeof globalThis & {
    __ouiDoPostgresClient?: Sql;
    __ouiDoDrizzleDb?: DrizzleDb;
    __ouiDoDatabaseUrl?: string;
};

// Cache the postgres-js client on globalThis so Next dev hot reloads and repeated
// route module evaluations do not create enough session-pool clients to exhaust Supabase.
const shouldReuseClient =
    globalForDb.__ouiDoPostgresClient &&
    globalForDb.__ouiDoDrizzleDb &&
    globalForDb.__ouiDoDatabaseUrl === connectionString;

const client = shouldReuseClient
    ? globalForDb.__ouiDoPostgresClient!
    : postgres(connectionString, {
        prepare: false,
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10
    });

export const db = shouldReuseClient
    ? globalForDb.__ouiDoDrizzleDb!
    : drizzle(client, { schema });

if (!shouldReuseClient) {
    globalForDb.__ouiDoPostgresClient = client;
    globalForDb.__ouiDoDrizzleDb = db;
    globalForDb.__ouiDoDatabaseUrl = connectionString;
}
