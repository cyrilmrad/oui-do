import { NextResponse } from 'next/server';

/**
 * Best-effort, in-memory sliding-window rate limiter for public API routes.
 *
 * IMPORTANT: state lives in a per-instance Map and resets on cold start. This
 * throttles naive scripted abuse (RSVP spam, guest-name enumeration) hitting a
 * single warm serverless instance, but it is NOT a substitute for a shared
 * store in a horizontally-scaled deployment. When Upstash/Redis (or a similar
 * durable store) is available, swap the `buckets` implementation below — the
 * `enforceRateLimit()` call sites do not need to change.
 */

interface Bucket {
    count: number;
    resetAt: number;
}

// Keyed by `${bucket}:${ip}`.
const buckets = new Map<string, Bucket>();

// Opportunistically evict expired entries so the map can't grow unbounded.
function prune(now: number): void {
    if (buckets.size < 5000) return;
    for (const [key, b] of buckets) {
        if (now >= b.resetAt) buckets.delete(key);
    }
}

/** Extract the caller's IP from proxy headers (Vercel/most hosts set x-forwarded-for). */
export function getClientIp(request: Request): string {
    const xff = request.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0]!.trim();
    return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export interface RateLimitOptions {
    /** Logical bucket name so different endpoints don't share counters. */
    bucket: string;
    /** Max requests allowed within the window. */
    limit: number;
    /** Window length in milliseconds. */
    windowMs: number;
    /** Optional extra scope (e.g. slug) appended to the key. */
    scope?: string;
}

/**
 * Records a hit and returns a 429 NextResponse if the caller is over the limit,
 * or `null` if the request may proceed. Fail-open on unexpected errors so a
 * limiter bug can never take down a public endpoint.
 */
export function enforceRateLimit(request: Request, opts: RateLimitOptions): NextResponse | null {
    try {
        const now = Date.now();
        prune(now);

        const ip = getClientIp(request);
        const key = opts.scope ? `${opts.bucket}:${opts.scope}:${ip}` : `${opts.bucket}:${ip}`;

        const existing = buckets.get(key);
        if (!existing || now >= existing.resetAt) {
            buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
            return null;
        }

        if (existing.count >= opts.limit) {
            const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
            return NextResponse.json(
                { error: 'Too many requests. Please slow down and try again shortly.' },
                { status: 429, headers: { 'Retry-After': String(retryAfter) } }
            );
        }

        existing.count += 1;
        return null;
    } catch {
        return null;
    }
}
