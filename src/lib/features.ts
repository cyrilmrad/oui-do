export const FEATURE_KEYS = ['guests', 'messages', 'budget', 'seating', 'settings'] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export function isFeatureKey(s: string): s is FeatureKey {
    return (FEATURE_KEYS as readonly string[]).includes(s);
}
