/**
 * Pure navigation/lodging/exploring + optional dynamic content pages.
 * Each dynamic page is one hamburger item (e.g. Cars, Stays, Food) with its own title, intro, date, and rich body.
 */

export interface NavigationLodgingHotel {
    title: string;
    subtitle: string;
    description: string;
    linkText: string;
    linkUrl: string;
    /** Optional cover photo uploaded to Supabase assets storage. */
    imageUrl?: string;
}

export interface NavigationExploringSpot {
    title: string;
    category: string;
    description: string;
    imageUrl: string;
}

/** Tiptap / ProseMirror JSON document */
export type NavigationBlogBody = Record<string, unknown>;

/** One extra page in the hamburger (not nested under a parent “blog”). */
export interface NavigationDynamicPage {
    id: string;
    /** Label in the hamburger menu */
    navLabel: string;
    /** Large heading on the page */
    title: string;
    introduction: string;
    date: string;
    body: NavigationBlogBody | null;
}

/** @deprecated Use NavigationDynamicPage; kept for merge migration only */
export interface NavigationBlogPost {
    title: string;
    date: string;
    body: NavigationBlogBody | null;
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
    lodgingEnabled: boolean;
    exploringEnabled: boolean;
    dynamicNavPages: NavigationDynamicPage[];
}

export const EMPTY_LODGING_HOTEL: NavigationLodgingHotel = {
    title: '',
    subtitle: '',
    description: '',
    linkText: '',
    linkUrl: '#',
    imageUrl: ''
};

export const EMPTY_EXPLORING_SPOT: NavigationExploringSpot = {
    title: '',
    category: '',
    description: '',
    imageUrl: ''
};

export const EMPTY_BLOG_BODY: NavigationBlogBody = {
    type: 'doc',
    content: [{ type: 'paragraph' }]
};

/** Template without `id` — always set `id` when adding (e.g. crypto.randomUUID()). */
export const EMPTY_DYNAMIC_PAGE_TEMPLATE: Omit<NavigationDynamicPage, 'id'> = {
    navLabel: '',
    title: '',
    introduction: '',
    date: '',
    body: EMPTY_BLOG_BODY
};

/** @deprecated Use EMPTY_DYNAMIC_PAGE_TEMPLATE + id */
export const EMPTY_BLOG_POST: NavigationBlogPost = {
    title: '',
    date: '',
    body: EMPTY_BLOG_BODY
};

export function newDynamicPageId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `page-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyDynamicPage(): NavigationDynamicPage {
    return { id: newDynamicPageId(), ...EMPTY_DYNAMIC_PAGE_TEMPLATE };
}

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
    ],
    lodgingEnabled: false,
    exploringEnabled: false,
    dynamicNavPages: []
};

function isLegacyNavigationPartial(partial: Partial<NavigationPagesContent> | undefined): boolean {
    if (partial === undefined || partial === null) return false;
    if (typeof partial !== 'object') return false;
    const keys = Object.keys(partial as object);
    if (keys.length === 0) return false;
    const hasLodging = Object.prototype.hasOwnProperty.call(partial, 'lodgingEnabled');
    const hasExploring = Object.prototype.hasOwnProperty.call(partial, 'exploringEnabled');
    return !hasLodging && !hasExploring;
}

function normalizeBlogBody(body: unknown): NavigationBlogBody {
    if (body && typeof body === 'object' && (body as { type?: string }).type === 'doc') {
        return body as NavigationBlogBody;
    }
    return { ...EMPTY_BLOG_BODY };
}

/** Old persisted shape before dynamic pages */
interface LegacyBlogPartial {
    blogEnabled?: boolean;
    blogNavLabel?: string;
    blogTitle?: string;
    blogIntro?: string;
    blogPosts?: NavigationBlogPost[];
}

function migrateLegacyBlogToDynamicPages(partial: Partial<NavigationPagesContent> & LegacyBlogPartial): NavigationDynamicPage[] {
    const posts = partial.blogPosts;
    if (posts && posts.length > 0) {
        return posts.map((p, i) => ({
            id: `migrated-${i}`,
            navLabel: p.title?.trim() || partial.blogNavLabel?.trim() || `Page ${i + 1}`,
            title: p.title?.trim() || partial.blogTitle?.trim() || '',
            introduction: i === 0 ? (partial.blogIntro ?? '') : '',
            date: p.date ?? '',
            body: normalizeBlogBody(p.body)
        }));
    }
    if (partial.blogEnabled && (partial.blogTitle?.trim() || partial.blogIntro?.trim())) {
        return [
            {
                id: 'migrated-0',
                navLabel: partial.blogNavLabel?.trim() || partial.blogTitle?.trim() || 'Updates',
                title: partial.blogTitle?.trim() || '',
                introduction: partial.blogIntro ?? '',
                date: '',
                body: { ...EMPTY_BLOG_BODY }
            }
        ];
    }
    return [];
}

export function mergeNavigationPages(partial?: Partial<NavigationPagesContent>): NavigationPagesContent {
    const d = DEFAULT_NAVIGATION_PAGES;
    const isLegacy = isLegacyNavigationPartial(partial);

    const lodgingEnabled = isLegacy ? true : (partial?.lodgingEnabled ?? false);
    const exploringEnabled = isLegacy ? true : (partial?.exploringEnabled ?? false);

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

    const legacy = partial as Partial<NavigationPagesContent> & LegacyBlogPartial | undefined;
    let dynamicNavPages: NavigationDynamicPage[];
    if (partial?.dynamicNavPages !== undefined) {
        dynamicNavPages = partial.dynamicNavPages.map((page, i) => ({
            id: page.id?.trim() || `page-${i}`,
            navLabel: page.navLabel ?? '',
            title: page.title ?? '',
            introduction: page.introduction ?? '',
            date: page.date ?? '',
            body: normalizeBlogBody(page.body)
        }));
    } else if (legacy && ('blogPosts' in legacy || 'blogEnabled' in legacy || 'blogTitle' in legacy)) {
        dynamicNavPages = migrateLegacyBlogToDynamicPages(legacy);
    } else {
        dynamicNavPages = [];
    }

    return {
        mainNavLabel: partial?.mainNavLabel ?? d.mainNavLabel,
        lodgingNavLabel: partial?.lodgingNavLabel ?? d.lodgingNavLabel,
        exploringNavLabel: partial?.exploringNavLabel ?? d.exploringNavLabel,
        lodgingTitle: partial?.lodgingTitle ?? d.lodgingTitle,
        lodgingIntro: partial?.lodgingIntro ?? d.lodgingIntro,
        lodgingHotels,
        exploringTitle: partial?.exploringTitle ?? d.exploringTitle,
        exploringIntro: partial?.exploringIntro ?? d.exploringIntro,
        exploringSpots,
        lodgingEnabled,
        exploringEnabled,
        dynamicNavPages
    };
}
