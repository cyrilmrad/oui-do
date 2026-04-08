import type { FeatureKey } from '@/lib/features';

/** Applied when no `client_entitlements` row exists for the slug. */
export function getDefaultFeatureFlags(): Record<FeatureKey, boolean> {
    return {
        guests: true,
        messages: true,
        budget: false,
        seating: false,
        settings: false
    };
}
