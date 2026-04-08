/**
 * Pure navigation/lodging/exploring defaults and merge logic.
 * Lives outside client components so Server Components (e.g. invite page) can import safely.
 */

export interface NavigationLodgingHotel {
    title: string;
    subtitle: string;
    description: string;
    linkText: string;
    linkUrl: string;
}

export interface NavigationExploringSpot {
    title: string;
    category: string;
    description: string;
    imageUrl: string;
}

export interface NavigationPagesContent {
    mainNavLabel: string;
    lodgingNavLabel: string;
    exploringNavLabel: string;
    lodgingTitle: string;
    lodgingIntro: string;
    lodgingHotels: NavigationLodgingHotel[];
    exploringTitle: string;
    exploringIntro: string;
    exploringSpots: NavigationExploringSpot[];
}

export const EMPTY_LODGING_HOTEL: NavigationLodgingHotel = {
    title: '',
    subtitle: '',
    description: '',
    linkText: '',
    linkUrl: '#'
};

export const EMPTY_EXPLORING_SPOT: NavigationExploringSpot = {
    title: '',
    category: '',
    description: '',
    imageUrl: ''
};

export const DEFAULT_NAVIGATION_PAGES: NavigationPagesContent = {
    mainNavLabel: 'The Wedding',
    lodgingNavLabel: 'Lodging',
    exploringNavLabel: 'Exploring',
    lodgingTitle: 'Where to Stay',
    lodgingIntro:
        "We've arranged room blocks at our favorite local spots. Please book early to secure the special rates!",
    lodgingHotels: [
        {
            title: 'The Grand Hotel',
            subtitle: '15 mins from venue',
            description:
                'Use code WEDDING24 for a 15% discount on your stay. Shuttles will be provided from this location.',
            linkText: 'Book Room',
            linkUrl: '#'
        },
        {
            title: 'Boutique Inn',
            subtitle: 'Downtown • 20 mins from venue',
            description:
                'A charming option in the heart of the city, surrounded by local cafes and shops.',
            linkText: 'View Website',
            linkUrl: '#'
        }
    ],
    exploringTitle: 'Things to Do',
    exploringIntro:
        'Make the most of your weekend! Here are a few places we love to eat, drink, and explore.',
    exploringSpots: [
        {
            title: 'Local Cafe',
            category: 'Coffee & Pastries',
            description: 'Best pour-over coffee and homemade sourdough pastries in town.',
            imageUrl:
                'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047&auto=format&fit=crop'
        },
        {
            title: 'City Botanical Garden',
            category: 'Nature & Relax',
            description: 'Great for a morning stroll or a relaxing afternoon picnic.',
            imageUrl:
                'https://images.unsplash.com/photo-1496664444929-8c75efb9546f?q=80&w=2070&auto=format&fit=crop'
        },
        {
            title: 'The Ocean Bistro',
            category: 'Dinner & Drinks',
            description: 'Our favorite spot for dinner with a stunning sunset view.',
            imageUrl:
                'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?q=80&w=2070&auto=format&fit=crop'
        }
    ]
};

export function mergeNavigationPages(partial?: Partial<NavigationPagesContent>): NavigationPagesContent {
    const d = DEFAULT_NAVIGATION_PAGES;
    const lodgingHotels =
        partial?.lodgingHotels && partial.lodgingHotels.length > 0
            ? partial.lodgingHotels.map((h, i) => ({
                  ...d.lodgingHotels[Math.min(i, d.lodgingHotels.length - 1)],
                  ...h
              }))
            : d.lodgingHotels.map((h) => ({ ...h }));
    const exploringSpots =
        partial?.exploringSpots && partial.exploringSpots.length > 0
            ? partial.exploringSpots.map((s, i) => ({
                  ...d.exploringSpots[Math.min(i, d.exploringSpots.length - 1)],
                  ...s
              }))
            : d.exploringSpots.map((s) => ({ ...s }));
    return {
        mainNavLabel: partial?.mainNavLabel ?? d.mainNavLabel,
        lodgingNavLabel: partial?.lodgingNavLabel ?? d.lodgingNavLabel,
        exploringNavLabel: partial?.exploringNavLabel ?? d.exploringNavLabel,
        lodgingTitle: partial?.lodgingTitle ?? d.lodgingTitle,
        lodgingIntro: partial?.lodgingIntro ?? d.lodgingIntro,
        lodgingHotels,
        exploringTitle: partial?.exploringTitle ?? d.exploringTitle,
        exploringIntro: partial?.exploringIntro ?? d.exploringIntro,
        exploringSpots
    };
}
