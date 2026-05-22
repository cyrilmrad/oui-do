import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("Missing DATABASE_URL entirely - Drizzle ORM cannot connect.");
}

// max:1 limits each serverless function instance to one connection,
// preventing connection exhaustion across concurrent Vercel invocations.
// prepare:false is required for Supabase Transaction mode pooler.
const client = postgres(connectionString, { prepare: false, max: 1 });
export const db = drizzle(client, { schema });
