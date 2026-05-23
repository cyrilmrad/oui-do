import type { Dispatch, SetStateAction } from 'react';
import {
    createEmptyDynamicPage,
    EMPTY_EXPLORING_SPOT,
    EMPTY_LODGING_HOTEL,
    InvitationData,
    mergeNavigationPages,
    NavigationBlogBody,
    NavigationDynamicPage,
    NavigationExploringSpot,
    NavigationLodgingHotel,
    NavigationPagesContent
} from '@/components/InvitationPreview';

/**
 * Shared handlers for editing InvitationData.navigationPages (lodging, exploring, dynamic pages).
 * Used identically by both the admin builder and the client dashboard settings tab.
 *
 * Each handler calls mergeNavigationPages(prev.navigationPages) before mutating to ensure
 * any defaults are filled in on legacy/partial data — matches the prior inline behavior.
 */
export function useNavigationPages(setState: Dispatch<SetStateAction<InvitationData>>) {
    const updateNavigationPages = (patch: Partial<NavigationPagesContent>) => {
        setState((prev) => ({
            ...prev,
            navigationPages: { ...mergeNavigationPages(prev.navigationPages), ...patch }
        }));
    };

    const updateLodgingHotel = (index: number, field: keyof NavigationLodgingHotel, value: string) => {
        setState((prev) => {
            const base = mergeNavigationPages(prev.navigationPages);
            const lodgingHotels = base.lodgingHotels.map((h, i) => (i === index ? { ...h, [field]: value } : h));
            return { ...prev, navigationPages: { ...base, lodgingHotels } };
        });
    };

    const updateExploringSpot = (index: number, field: keyof NavigationExploringSpot, value: string) => {
        setState((prev) => {
            const base = mergeNavigationPages(prev.navigationPages);
            const exploringSpots = base.exploringSpots.map((s, i) => (i === index ? { ...s, [field]: value } : s));
            return { ...prev, navigationPages: { ...base, exploringSpots } };
        });
    };

    const addLodgingHotel = () => {
        setState((prev) => {
            const base = mergeNavigationPages(prev.navigationPages);
            return {
                ...prev,
                navigationPages: {
                    ...base,
                    lodgingHotels: [...base.lodgingHotels, { ...EMPTY_LODGING_HOTEL }]
                }
            };
        });
    };

    // Keeps at least one hotel — matches prior UI guard that disables the remove button at length 1.
    const removeLodgingHotel = (index: number) => {
        setState((prev) => {
            const base = mergeNavigationPages(prev.navigationPages);
            if (base.lodgingHotels.length <= 1) return prev;
            return {
                ...prev,
                navigationPages: {
                    ...base,
                    lodgingHotels: base.lodgingHotels.filter((_, i) => i !== index)
                }
            };
        });
    };

    const addExploringSpot = () => {
        setState((prev) => {
            const base = mergeNavigationPages(prev.navigationPages);
            return {
                ...prev,
                navigationPages: {
                    ...base,
                    exploringSpots: [...base.exploringSpots, { ...EMPTY_EXPLORING_SPOT }]
                }
            };
        });
    };

    const removeExploringSpot = (index: number) => {
        setState((prev) => {
            const base = mergeNavigationPages(prev.navigationPages);
            if (base.exploringSpots.length <= 1) return prev;
            return {
                ...prev,
                navigationPages: {
                    ...base,
                    exploringSpots: base.exploringSpots.filter((_, i) => i !== index)
                }
            };
        });
    };

    const updateDynamicPage = (id: string, patch: Partial<NavigationDynamicPage>) => {
        setState((prev) => {
            const base = mergeNavigationPages(prev.navigationPages);
            const dynamicNavPages = base.dynamicNavPages.map((p) => (p.id === id ? { ...p, ...patch } : p));
            return { ...prev, navigationPages: { ...base, dynamicNavPages } };
        });
    };

    const updateDynamicPageBody = (id: string, body: NavigationBlogBody) => {
        updateDynamicPage(id, { body });
    };

    const addDynamicPage = () => {
        setState((prev) => {
            const base = mergeNavigationPages(prev.navigationPages);
            return {
                ...prev,
                navigationPages: {
                    ...base,
                    dynamicNavPages: [...base.dynamicNavPages, createEmptyDynamicPage()]
                }
            };
        });
    };

    const removeDynamicPage = (id: string) => {
        setState((prev) => {
            const base = mergeNavigationPages(prev.navigationPages);
            return {
                ...prev,
                navigationPages: {
                    ...base,
                    dynamicNavPages: base.dynamicNavPages.filter((p) => p.id !== id)
                }
            };
        });
    };

    return {
        updateNavigationPages,
        updateLodgingHotel,
        updateExploringSpot,
        addLodgingHotel,
        removeLodgingHotel,
        addExploringSpot,
        removeExploringSpot,
        updateDynamicPage,
        updateDynamicPageBody,
        addDynamicPage,
        removeDynamicPage
    };
}
