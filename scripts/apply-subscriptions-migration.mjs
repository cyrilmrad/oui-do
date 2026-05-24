// One-shot applier for supabase/migrations/0008_subscriptions.sql.
// Usage: node scripts/apply-subscriptions-migration.mjs
//
// Why this exists instead of `drizzle-kit push`:
//   Drizzle's journal only tracks 0000–0001; later migrations were applied manually
//   to the DB. `drizzle-kit push` therefore hangs / proposes destructive renames.
//   This script applies only the targeted SQL, idempotently.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '..', '.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('✗ Missing DATABASE_URL in .env.local');
    process.exit(1);
}

const sqlPath = resolve(__dirname, '..', 'supabase', 'migrations', '0008_subscriptions.sql');
const sqlText = readFileSync(sqlPath, 'utf8');

console.log(`→ Applying ${sqlPath}`);
console.log('---');
console.log(sqlText);
console.log('---');

const client = postgres(connectionString, { prepare: false, max: 1 });

try {
    await client.begin(async (tx) => {
        // Drive the file as a single multi-statement script. postgres.js's `.unsafe`
        // returns an array of result sets — one per statement.
        const results = await tx.unsafe(sqlText);
        const arr = Array.isArray(results) ? results : [results];
        console.log(`✓ Executed ${arr.length} statement(s)`);
    });

    // Sanity check: table exists, policy exists.
    const tableCheck = await client`
        SELECT to_regclass('public.subscriptions') AS table_oid
    `;
    const policyCheck = await client`
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'subscriptions'
    `;

    console.log('Verification:');
    console.log(`  · table public.subscriptions → ${tableCheck[0]?.table_oid ?? 'MISSING'}`);
    console.log(`  · policies                  → ${policyCheck.map((p) => p.policyname).join(', ') || 'none'}`);

    if (!tableCheck[0]?.table_oid) {
        throw new Error('subscriptions table did not get created');
    }

    console.log('✓ Migration applied successfully.');
} catch (err) {
    console.error('✗ Migration failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
} finally {
    await client.end({ timeout: 5 });
}
