export type GuestListStatus = 'all' | 'attending' | 'declined' | 'pending';

export interface GuestListGuest {
    id: string;
    firstName: string;
    lastName: string;
    pax?: number | null;
    status?: string | null;
    message?: string | null;
    parentGuestId?: string | null;
    updatedAt?: string | Date | null;
}

export interface GuestDisplayRow<TGuest extends GuestListGuest = GuestListGuest> {
    kind: 'primary' | 'companion' | 'orphanCompanion';
    guest: TGuest;
    parent?: TGuest;
    parentName?: string;
    companionCount?: number;
}

interface GuestDisplayOptions {
    status: GuestListStatus;
    searchQuery: string;
}

export function guestFullName(guest: Pick<GuestListGuest, 'firstName' | 'lastName'>): string {
    return `${guest.firstName ?? ''} ${guest.lastName ?? ''}`.trim();
}

function passesStatus(guest: GuestListGuest, status: GuestListStatus): boolean {
    return status === 'all' || guest.status === status;
}

function passesSearch(guest: GuestListGuest, normalizedSearch: string): boolean {
    if (!normalizedSearch) return true;
    return guestFullName(guest).toLowerCase().includes(normalizedSearch);
}

export function buildGuestDisplayRows<TGuest extends GuestListGuest>(
    guests: TGuest[],
    { status, searchQuery }: GuestDisplayOptions
): GuestDisplayRow<TGuest>[] {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const primaryGuests: TGuest[] = [];
    const companionsByParentId = new Map<string, TGuest[]>();
    const guestsById = new Map<string, TGuest>();

    for (const guest of guests) {
        guestsById.set(guest.id, guest);

        if (guest.parentGuestId) {
            const companions = companionsByParentId.get(guest.parentGuestId) ?? [];
            companions.push(guest);
            companionsByParentId.set(guest.parentGuestId, companions);
        } else {
            primaryGuests.push(guest);
        }
    }

    const rows: GuestDisplayRow<TGuest>[] = [];

    for (const primaryGuest of primaryGuests) {
        const companions = companionsByParentId.get(primaryGuest.id) ?? [];
        const primaryMatches = passesStatus(primaryGuest, status) && passesSearch(primaryGuest, normalizedSearch);
        const matchingCompanions = companions.filter((companion) =>
            passesStatus(companion, status) && passesSearch(companion, normalizedSearch)
        );

        if (!primaryMatches && matchingCompanions.length === 0) continue;

        const visibleCompanions = primaryMatches && passesSearch(primaryGuest, normalizedSearch)
            ? companions.filter((companion) => passesStatus(companion, status))
            : matchingCompanions;

        rows.push({
            kind: 'primary',
            guest: primaryGuest,
            companionCount: companions.length
        });

        for (const companion of visibleCompanions) {
            rows.push({
                kind: 'companion',
                guest: companion,
                parent: primaryGuest,
                parentName: guestFullName(primaryGuest)
            });
        }
    }

    for (const guest of guests) {
        if (!guest.parentGuestId || guestsById.has(guest.parentGuestId)) continue;
        if (!passesStatus(guest, status) || !passesSearch(guest, normalizedSearch)) continue;

        rows.push({
            kind: 'orphanCompanion',
            guest,
            parentName: 'Unknown guest'
        });
    }

    return rows;
}
