/**
 * Lightweight, dependency-free validators for API route boundaries.
 *
 * Intentionally minimal — the goal is to reject clearly-invalid or abusive input
 * (out-of-range numbers, wrong enums, oversized/garbage strings) with a 400 before
 * it reaches the database, not to be a full schema library. Routes throw these from
 * inside their existing try/catch and map `ValidationError` to a 400 via
 * `isValidationError()`.
 */

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export function isValidationError(err: unknown): err is ValidationError {
    return err instanceof ValidationError;
}

/** Required, trimmed, non-empty string bounded by `max` characters. */
export function reqString(value: unknown, field: string, max: number): string {
    if (typeof value !== 'string') throw new ValidationError(`${field} is required`);
    const v = value.trim();
    if (v.length === 0) throw new ValidationError(`${field} is required`);
    if (v.length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
    return v;
}

/** Optional string. undefined/null become '', anything present is bounded by `max`. */
export function optString(value: unknown, field: string, max: number): string {
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
    if (value.length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
    return value;
}

/** Integer coerced from number|numeric-string, constrained to [min, max]. */
export function intInRange(value: unknown, field: string, min: number, max: number): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
        throw new ValidationError(`${field} must be an integer`);
    }
    if (n < min || n > max) throw new ValidationError(`${field} must be between ${min} and ${max}`);
    return n;
}

/** One of an allowed set of string values. */
export function enumValue<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
        throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
    }
    return value as T;
}

/** Optional #rrggbb hex color. undefined/null/'' become null. */
export function optHexColor(value: unknown, field: string): string | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
        throw new ValidationError(`${field} must be a hex color like #aabbcc`);
    }
    return value;
}
