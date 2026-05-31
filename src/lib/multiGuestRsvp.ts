export interface RsvpCompanionNameInput {
    fullName: string;
}

export interface NormalizedRsvpCompanion {
    fullName: string;
    firstName: string;
    lastName: string;
    pax: 1;
}

export interface VisibleCompanionRow {
    index: number;
    label: string;
}

interface RsvpPartyInput {
    totalPax: number;
    primaryPax: number;
    companions: RsvpCompanionNameInput[];
}

interface CompanionRowInput {
    totalPax: number;
    primaryPax: number;
    companionNamesRevealed: boolean;
}

const ORDINAL_GUEST_LABELS = ['First Guest Name', 'Second Guest Name', 'Third Guest Name', 'Fourth Guest Name', 'Fifth Guest Name'];

export function clampPax(value: unknown, fallback = 1): number {
    const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.floor(parsed);
}

export function getGuestLabel(index: number): string {
    return ORDINAL_GUEST_LABELS[index] ?? `Guest ${index + 1} Name`;
}

export function splitFullNameOnFirstSpace(fullName: string) {
    const trimmed = fullName.trim().replace(/\s+/g, ' ');
    const firstSpaceIndex = trimmed.indexOf(' ');

    if (firstSpaceIndex === -1) {
        return { firstName: trimmed, lastName: '' };
    }

    return {
        firstName: trimmed.slice(0, firstSpaceIndex),
        lastName: trimmed.slice(firstSpaceIndex + 1)
    };
}

export function normalizeRsvpParty({ totalPax, primaryPax, companions }: RsvpPartyInput) {
    const safeTotalPax = Math.max(1, clampPax(totalPax));
    const selectedPax = Math.min(clampPax(primaryPax), safeTotalPax);
    const companionSlots = Math.max(0, selectedPax - 1);
    const normalizedCompanions: NormalizedRsvpCompanion[] = [];

    for (const companion of companions) {
        if (normalizedCompanions.length >= companionSlots) break;

        const fullName = companion.fullName.trim().replace(/\s+/g, ' ');
        if (!fullName) continue;
        const { firstName, lastName } = splitFullNameOnFirstSpace(fullName);
        normalizedCompanions.push({ fullName, firstName, lastName, pax: 1 });
    }

    return {
        selectedPax,
        primaryPax: Math.max(1, selectedPax - normalizedCompanions.length),
        companions: normalizedCompanions,
        totalAllocatedPax: selectedPax,
        remainingPax: companionSlots - normalizedCompanions.length
    };
}

export function getVisibleCompanionRows({ totalPax, primaryPax, companionNamesRevealed }: CompanionRowInput): VisibleCompanionRow[] {
    if (!companionNamesRevealed) return [];

    const safeTotalPax = Math.max(1, clampPax(totalPax));
    const selectedPax = Math.min(clampPax(primaryPax), safeTotalPax);
    const companionSlots = Math.max(0, selectedPax - 1);

    return Array.from({ length: companionSlots }, (_, index) => ({
            index,
            label: getGuestLabel(index)
    }));
}
