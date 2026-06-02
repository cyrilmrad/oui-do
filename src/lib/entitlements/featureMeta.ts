import type { FeatureKey } from '@/lib/features';
import { Users, MessageSquare, Wallet, Armchair, Settings, type LucideIcon } from 'lucide-react';

export type FeatureMeta = {
    label: string;
    description: string;
    icon: LucideIcon;
};

/** UI-only metadata for each entitlement flag. Adding a future flag = append to
 * FEATURE_KEYS (src/lib/features.ts) and add one entry here; the panel picks it up. */
export const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
    guests: { label: 'Guests', description: 'Guest list, RSVP tracking & CSV import', icon: Users },
    messages: { label: 'Messages', description: 'Read RSVP notes & well-wishes from guests', icon: MessageSquare },
    budget: { label: 'Budget', description: 'Budget tracker with categories & payments', icon: Wallet },
    seating: { label: 'Seating', description: 'Drag-and-drop table seating planner', icon: Armchair },
    settings: { label: 'Settings', description: 'Let the couple edit their own invitation', icon: Settings }
};
