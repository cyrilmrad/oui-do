"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, MapPin, Music, VolumeX, ExternalLink, Heart, MailOpen, CheckCircle2, Menu, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { NavigationPagesContent } from '@/lib/navigationPages';
import { mergeNavigationPages } from '@/lib/navigationPages';
import { clampPax, getVisibleCompanionRows, normalizeRsvpParty, splitFullNameOnFirstSpace, type RsvpCompanionNameInput } from '@/lib/multiGuestRsvp';
import { InvitationBlogReadonly } from '@/components/blog/InvitationBlogReadonly';
import InvitationGifts from '@/components/InvitationGifts';
import ConfettiBurst from '@/components/ConfettiBurst';
// Add-to-calendar (custom ICS + Google); re-enable when ready to show on the live invite.
// import { InvitationAddToCalendar } from '@/components/InvitationAddToCalendar';

export type {
    NavigationBlogBody,
    NavigationBlogPost,
    NavigationDynamicPage,
    NavigationExploringSpot,
    NavigationLodgingHotel,
    NavigationPagesContent
} from '@/lib/navigationPages';
export {
    createEmptyDynamicPage,
    DEFAULT_NAVIGATION_PAGES,
    EMPTY_BLOG_BODY,
    EMPTY_BLOG_POST,
    EMPTY_DYNAMIC_PAGE_TEMPLATE,
    EMPTY_EXPLORING_SPOT,
    EMPTY_LODGING_HOTEL,
    mergeNavigationPages,
    newDynamicPageId
} from '@/lib/navigationPages';

export interface Theme {
    primaryText: string;
    accent: string;
    bgAccent: string;
    borderAccent: string;
    background: string;
    name?: string;
    rawPrimary?: string;
    rawAccent?: string;
    rawBackground?: string;
}

export interface CustomSection {
    id: string;
    backgroundUrl: string;
    backgroundType?: 'image' | 'video' | 'slideshow';
    /** When backgroundType is slideshow, ordered image URLs */
    slideshowUrls?: string[];
    slideshowIntervalSec?: number;
    slideshowAutoplay?: boolean;
    showOverlay?: boolean;
    isFullBleed?: boolean;
    overlayType: 'text' | 'image' | 'none';
    textContent?: string;
    fontFamily?: string;
    overlayImageUrl?: string;
    /** Where to render this block in the invitation.
     *  'default' (or absent) = current position before Gifts.
     *  'pre-rsvp' = immediately before the RSVP section. */
    position?: 'default' | 'pre-rsvp';
}

export interface BankCustomField {
    id: string;
    label: string;
    value: string;
}

export interface GiftOption {
    id: string;
    type: 'bank' | 'mobile';
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    /** SWIFT / BIC for international bank transfers */
    swiftCode?: string;
    /** If empty, label defaults to "IBAN / Account number" on the invite (override for e.g. US account number). */
    accountNumberLabel?: string;
    /** If empty, label defaults to "SWIFT / BIC code" (override for e.g. routing number). */
    swiftCodeLabel?: string;
    /** Additional ad-hoc label/value rows shown on bank cards. Optional for backward compatibility. */
    customFields?: BankCustomField[];
    mobileNumber?: string;
    /** Optional display name for the payer (mobile transfer only) */
    mobileAccountName?: string;
    /** If empty, label defaults to "Mobile / handle" (mobile transfer only). */
    mobileNumberLabel?: string;
    serviceName?: string; // e.g. Venmo, Zelle, PayNow
}

export const GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL = 'IBAN / Account number';
export const GIFT_DEFAULT_SWIFT_LABEL = 'SWIFT / BIC code';
export const GIFT_DEFAULT_MOBILE_NUMBER_LABEL = 'Mobile / handle';

export function giftResolvedAccountNumberLabel(o: Pick<GiftOption, 'accountNumberLabel'>): string {
    const t = o.accountNumberLabel?.trim();
    return t || GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL;
}

export function giftResolvedSwiftLabel(o: Pick<GiftOption, 'swiftCodeLabel'>): string {
    const t = o.swiftCodeLabel?.trim();
    return t || GIFT_DEFAULT_SWIFT_LABEL;
}

export function giftResolvedMobileNumberLabel(o: Pick<GiftOption, 'mobileNumberLabel'>): string {
    const t = o.mobileNumberLabel?.trim();
    return t || GIFT_DEFAULT_MOBILE_NUMBER_LABEL;
}

/**
 * Inline formatting markers for hotel descriptions. All markers are distinct 2-char pairs
 * (no overlap), so they nest unambiguously, e.g. `**~~__x__~~**` → bold+italic+underline.
 *   `**bold**`  `~~italic~~`  `__underline__`
 */
const HOTEL_DESC_MARKERS: { marker: string; Tag: 'strong' | 'em' | 'u' }[] = [
    { marker: '**', Tag: 'strong' },
    { marker: '__', Tag: 'u' },
    { marker: '~~', Tag: 'em' }
];

function hotelDescMarkerAt(text: string, i: number): string | null {
    for (const { marker } of HOTEL_DESC_MARKERS) {
        if (text.startsWith(marker, i)) return marker;
    }
    return null;
}

/** Index of `marker`'s matching close starting at `from`, skipping nested marker regions. -1 if none. */
function hotelDescFindClose(text: string, from: number, marker: string): number {
    let j = from;
    while (j < text.length) {
        const m = hotelDescMarkerAt(text, j);
        if (m === marker) return j;
        if (m) {
            const inner = hotelDescFindClose(text, j + m.length, m);
            j = inner === -1 ? j + m.length : inner + m.length;
            continue;
        }
        j++;
    }
    return -1;
}

/**
 * Renders `**bold**` / `~~italic~~` / `__underline__` (nestable) for hotel descriptions.
 * Plain text (no markers, or unbalanced markers) renders unchanged; parent uses
 * `whitespace-pre-line` for line breaks.
 */
function renderHotelDescription(text: string, keyPrefix = ''): React.ReactNode {
    const nodes: React.ReactNode[] = [];
    let i = 0;
    let plainStart = 0;
    let k = 0;
    while (i < text.length) {
        const m = hotelDescMarkerAt(text, i);
        if (m) {
            const close = hotelDescFindClose(text, i + m.length, m);
            if (close !== -1) {
                if (i > plainStart) nodes.push(text.slice(plainStart, i));
                const inner = text.slice(i + m.length, close);
                const Tag = HOTEL_DESC_MARKERS.find((r) => r.marker === m)!.Tag;
                nodes.push(
                    <Tag key={`${keyPrefix}${k}`} className={Tag === 'strong' ? 'font-semibold' : undefined}>
                        {renderHotelDescription(inner, `${keyPrefix}${k}-`)}
                    </Tag>
                );
                k += 1;
                i = close + m.length;
                plainStart = i;
                continue;
            }
        }
        i += 1;
    }
    if (plainStart < text.length) nodes.push(text.slice(plainStart));
    return nodes;
}

/** Renders `**bold**` segments as `<strong>`; parent should use `whitespace-pre-line` for line breaks. */
function renderRsvpClosedMessageBody(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[\s\S]*?\*\*)/g);
    return parts.map((part, i) => {
        if (part === '') return null;
        const m = part.match(/^\*\*([\s\S]*)\*\*$/);
        if (m) {
            return (
                <strong key={i} className="font-semibold text-stone-500">
                    {m[1]}
                </strong>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

export interface HousesData {
    brideLabel?: string;
    brideName?: string;
    brideAddress?: string;
    brideTime?: string;
    brideMapLink?: string;
    groomLabel?: string;
    groomName?: string;
    groomAddress?: string;
    groomTime?: string;
    groomMapLink?: string;
}

export interface InvitationData {
    slug: string;
    bride: string;
    groom: string;
    date: string;
    time: string;
    venue: string;
    location: string;
    receptionTime?: string;
    receptionVenue?: string;
    receptionLocation?: string;
    receptionAddress?: string;
    mapLink?: string;
    heroImage?: string;
    metadataImageUrl?: string;
    heroVideo?: string;
    audioUrl?: string;
    heroLogoUrl?: string;
    showHeroLogo?: boolean;
    detailsBackgroundUrl?: string;
    customSections?: CustomSection[];
    message: string;
    giftMessage?: string;
    bankAccountName?: string;
    bankAccountNumber?: string;
    mobileTransferNumber?: string;
    giftOptions?: GiftOption[];
    theme: Theme;
    showHeroDate?: boolean;
    showFormalInvitation?: boolean;
    formalInvitationImage?: string;
    formalInvitationIsVideo?: boolean;
    preCeremonyMedia?: string;
    preCeremonyMediaIsVideo?: boolean;
    showHouses?: boolean;
    housesData?: HousesData;
    showNavigation?: boolean;
    navigationPages?: Partial<NavigationPagesContent>;
    footnote?: string;
    /** When false, the RSVP form is hidden on the live invitation. Defaults to true. */
    showRsvp?: boolean;
    /** When the form is off, non-empty text is shown under the RSVP title (use `**bold**`). */
    rsvpClosedMessage?: string;
    /** Collect companion names under a personalized RSVP while preserving old behavior by default. */
    multiGuestNameCollectionEnabled?: boolean;
    /** Optional personal thank-you note shown on the archived memorial page. */
    archiveMessage?: string;
}

interface InvitationPreviewProps {
    data: InvitationData;
    guestData?: {
        id: string;
        invitationId: number;
        firstName: string;
        lastName: string;
        pax: number;
        status: string;
        message: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    } | null;
    isPreview?: boolean;
}

function CustomSectionSlideshow({
    urls,
    intervalSec,
    autoplay
}: {
    urls: string[];
    intervalSec: number;
    autoplay: boolean;
}) {
    const safe = urls.filter(Boolean);
    const n = safe.length;
    const [index, setIndex] = useState(0);

    useEffect(() => {
        setIndex((i) => (n <= 0 ? 0 : Math.min(i, n - 1)));
    }, [n]);

    useEffect(() => {
        if (n <= 1 || !autoplay) return;
        const ms = Math.min(60, Math.max(2, intervalSec)) * 1000;
        const t = window.setInterval(() => {
            setIndex((i) => (i + 1) % n);
        }, ms);
        return () => window.clearInterval(t);
    }, [n, autoplay, intervalSec]);

    if (n === 0) {
        return <div className="absolute inset-0 bg-stone-900" aria-hidden />;
    }

    return (
        <>
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${index}-${safe[index]}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="absolute inset-0 bg-cover bg-center bg-stone-900"
                    style={{ backgroundImage: `url(${safe[index]})` }}
                />
            </AnimatePresence>
            {n > 1 && (
                <>
                    <button
                        type="button"
                        aria-label="Previous slide"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setIndex((i) => (i - 1 + n) % n);
                        }}
                        className="absolute left-2 @md:left-4 top-1/2 -translate-y-1/2 z-[15] rounded-full bg-white/85 p-2 text-stone-800 shadow-md hover:bg-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 @md:w-6 @md:h-6" />
                    </button>
                    <button
                        type="button"
                        aria-label="Next slide"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setIndex((i) => (i + 1) % n);
                        }}
                        className="absolute right-2 @md:right-4 top-1/2 -translate-y-1/2 z-[15] rounded-full bg-white/85 p-2 text-stone-800 shadow-md hover:bg-white transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 @md:w-6 @md:h-6" />
                    </button>
                </>
            )}
        </>
    );
}

export function customSectionSlideUrls(section: CustomSection): string[] {
    if (section.backgroundType === 'slideshow') {
        const fromArr = (section.slideshowUrls || []).filter(Boolean);
        if (fromArr.length > 0) return fromArr;
        if (section.backgroundUrl) return [section.backgroundUrl];
        return [];
    }
    return section.backgroundUrl ? [section.backgroundUrl] : [];
}

const FOOTNOTE_LINK_SPLIT_RE = /(\[[^\]]+\]\([^)]+\))/g;

type FootnoteSegment =
    | { type: 'plain'; text: string }
    | { type: 'link'; label: string; href: string };

function parseFootnoteSegments(footnote: string): FootnoteSegment[] {
    const parts = footnote.split(FOOTNOTE_LINK_SPLIT_RE);
    const segments: FootnoteSegment[] = [];
    for (const part of parts) {
        if (!part) continue;
        const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (m) segments.push({ type: 'link', label: m[1], href: m[2] });
        else segments.push({ type: 'plain', text: part });
    }
    return segments;
}

/** In-app nav from footnote markdown, e.g. `[Label](nav:lodging)` or `[Label](nav:page:abc123)`. */
function parseFootnoteNavHref(href: string): string | null {
    const h = href.trim();
    if (!h.toLowerCase().startsWith('nav:')) return null;
    const rest = h.slice(4);
    const restLower = rest.toLowerCase();
    if (restLower === 'main' || restLower === 'lodging' || restLower === 'exploring') return restLower;
    if (restLower.startsWith('page:')) return `page:${rest.slice(5)}`;
    return null;
}

function canFootnoteNavigate(href: string, showNavigation: boolean | undefined, nav: NavigationPagesContent): boolean {
    const tab = parseFootnoteNavHref(href);
    if (!tab || !showNavigation) return false;
    if (tab === 'main') return true;
    if (tab === 'lodging') return nav.lodgingEnabled;
    if (tab === 'exploring') return nav.exploringEnabled;
    if (tab.startsWith('page:')) {
        const id = tab.slice(5);
        return nav.dynamicNavPages.some((p) => p.id === id);
    }
    return false;
}

export default function InvitationPreview({ data, guestData, isPreview = false }: InvitationPreviewProps) {
    const screenClass = isPreview ? "min-h-[750px]" : "min-h-screen";
    const dvhClass = isPreview ? "min-h-[750px]" : "min-h-[100dvh]";
    const h80Class = isPreview ? "h-[600px]" : "h-[80vh] @md:h-[90vh]";
    const h60Class = isPreview ? "min-h-[450px]" : "min-h-[60vh]";
    const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        firstName: guestData?.firstName || '',
        lastName: guestData?.lastName || '',
        fullName: guestData ? `${guestData.firstName} ${guestData.lastName}`.trim() : '',
        attending: guestData?.status && guestData.status !== 'pending' ? (guestData.status === 'attending' ? 'yes' : 'no') : 'yes',
        guests: guestData?.pax ? guestData.pax.toString() : '1',
        message: guestData?.message || ''
    });
    const [companions, setCompanions] = useState<RsvpCompanionNameInput[]>([]);
    const [companionNamesRevealed, setCompanionNamesRevealed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const originalPartyPax = Math.max(1, clampPax(guestData?.pax ?? 1));
    const multiGuestNameCollectionActive =
        data.multiGuestNameCollectionEnabled === true &&
        Boolean(guestData) &&
        originalPartyPax > 1;
    const visibleCompanionRows = useMemo(
        () => getVisibleCompanionRows({
            totalPax: originalPartyPax,
            primaryPax: clampPax(formData.guests),
            companionNamesRevealed
        }),
        [companionNamesRevealed, formData.guests, originalPartyPax]
    );
    const availableCompanionSlots = Math.max(0, Math.min(clampPax(formData.guests), originalPartyPax) - 1);

    const [hasOpened, setHasOpened] = useState(false);
    /** `main` | `lodging` | `exploring` | `page:${id}` */
    const [activeTab, setActiveTab] = useState<string>('main');
    const [isNavOpen, setIsNavOpen] = useState(false);

    const handleOpenInvitation = async () => {
        setHasOpened(true);
        if (data.audioUrl && audioRef.current) {
            try {
                await audioRef.current.play();
                setIsPlaying(true);
            } catch (e) {
                console.error("Audio playback blocked by browser policies:", e);
            }
        }
    };

    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const formalVideoRef = useRef<HTMLVideoElement | null>(null);
    const preCeremonyVideoRef = useRef<HTMLVideoElement | null>(null);

    const [timeLeft, setTimeLeft] = useState<{ years: number; months: number; days: number } | null>(null);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "Date";
        try {
            // Append time to ensure it parses correctly in the local timezone for display
            const d = new Date(dateStr + "T00:00:00");
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const formatTime = (timeStr?: string) => {
        if (!timeStr) return "Time";
        try {
            const d = new Date("2000-01-01T" + timeStr);
            if (isNaN(d.getTime())) return timeStr;
            return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } catch {
            return timeStr;
        }
    };

    useEffect(() => {
        if (!data.date) return;

        const targetDate = new Date(data.date);
        if (isNaN(targetDate.getTime())) return;

        const calculateTimeLeft = () => {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());

            if (target.getTime() <= today.getTime()) {
                setTimeLeft(null);
                return;
            }

            let years = target.getFullYear() - today.getFullYear();
            let months = target.getMonth() - today.getMonth();
            let days = target.getDate() - today.getDate();

            if (days < 0) {
                months--;
                const prevMonth = new Date(target.getFullYear(), target.getMonth(), 0);
                days += prevMonth.getDate();
            }
            if (months < 0) {
                years--;
                months += 12;
            }

            // Accumulate years into months for visual display restriction
            if (years > 0) {
                months += (years * 12);
                years = 0;
            }

            setTimeLeft({
                years: 0,
                months: months > 0 ? months : 0,
                days: days > 0 ? days : 0
            });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000 * 60 * 60 * 24); // Update daily
        return () => clearInterval(timer);
    }, [data.date]);

    const toggleMusic = async () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                try {
                    await audioRef.current.play();
                    setIsPlaying(true);
                } catch (e) {
                    console.error("Audio play failed:", e);
                    setIsPlaying(false);
                }
            }
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            if (name === 'fullName') {
                const { firstName, lastName } = splitFullNameOnFirstSpace(value);
                return { ...prev, fullName: value, firstName, lastName };
            }

            return { ...prev, [name]: value };
        });
        if (name === 'guests' && multiGuestNameCollectionActive) {
            const nextPrimaryPax = clampPax(value);
            setCompanions((prev) => prev.slice(0, Math.max(0, Math.min(nextPrimaryPax, originalPartyPax) - 1)));
        }
    };

    const handleCompanionChange = (index: number, value: string) => {
        setCompanions((prev) => {
            const next = [...prev];
            next[index] = { fullName: value };
            return next.slice(0, availableCompanionSlots);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError('');

        try {
            const rawCompanions = multiGuestNameCollectionActive
                ? companions.slice(0, visibleCompanionRows.length)
                : [];
            const normalizedParty = multiGuestNameCollectionActive
                ? normalizeRsvpParty({
                    totalPax: originalPartyPax,
                    primaryPax: clampPax(formData.guests),
                    companions: rawCompanions
                })
                : null;
            const res = await fetch('/api/rsvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    slug: data.slug,
                    guestId: guestData?.id,
                    ...formData,
                    ...(normalizedParty ? {
                        guests: normalizedParty.selectedPax.toString(),
                        companions: normalizedParty.companions
                    } : {})
                })
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || 'Failed to submit RSVP');
            }

            setRsvpSubmitted(true);
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Failed to submit RSVP');
        } finally {
            setIsSubmitting(false);
        }
    };

    const sectionVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                type: 'spring' as const,
                stiffness: 40,
                damping: 20,
                mass: 1
            }
        }
    };

    const staggeredContainerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.3
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, scale: 0.8, y: 30 },
        visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                type: 'spring' as const,
                stiffness: 40,
                damping: 20,
                mass: 1
            }
        }
    };

    const isVideo = !!data.heroVideo;
    const defaultImage = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=2070&auto=format&fit=crop";
    const hasGiftsSection = !!(data.giftMessage || data.bankAccountNumber || data.mobileTransferNumber);

    const sanitizeTheme = (theme: Theme | undefined) => {
        if (!theme) return { 
            primaryText: 'text-stone-800', 
            accent: 'text-emerald-700', 
            bgAccent: 'bg-emerald-700', 
            borderAccent: 'border-emerald-700',
            background: 'bg-stone-50' 
        };
        // Ensure we only use text-related classes for typography to avoid "box" issues
        const cleanText = (s: string) => s.split(' ').filter(c => c.startsWith('text-') || c.startsWith('font-')).join(' ');
        
        const accentStr = theme.name === 'custom' ? cleanText(theme.accent) : theme.accent;
        
        return {
            ...theme,
            primaryText: theme.name === 'custom' ? cleanText(theme.primaryText) : theme.primaryText,
            accent: accentStr,
            bgAccent: accentStr.replace('text-', 'bg-'),
            borderAccent: accentStr.replace('text-', 'border-'),
            background: theme.background // Background is fine to have bg-
        };
    };

    const cleanTheme = sanitizeTheme(data.theme);
    const nav = useMemo(() => mergeNavigationPages(data.navigationPages), [data.navigationPages]);

    const showNavButton =
        !!data.showNavigation &&
        (nav.lodgingEnabled || nav.exploringEnabled || nav.dynamicNavPages.length > 0);

    const navMenuItems: { key: string; label: string }[] = useMemo(
        () => [
            { key: 'main', label: nav.mainNavLabel },
            ...(nav.lodgingEnabled ? [{ key: 'lodging', label: nav.lodgingNavLabel }] : []),
            ...(nav.exploringEnabled ? [{ key: 'exploring', label: nav.exploringNavLabel }] : []),
            ...nav.dynamicNavPages.map((p) => ({
                key: `page:${p.id}`,
                label: p.navLabel.trim() || p.title.trim() || 'Page'
            }))
        ],
        [nav]
    );

    const effectiveTab = useMemo((): string => {
        if (activeTab === 'lodging' && !nav.lodgingEnabled) return 'main';
        if (activeTab === 'exploring' && !nav.exploringEnabled) return 'main';
        if (activeTab.startsWith('page:')) {
            const id = activeTab.slice(5);
            if (!nav.dynamicNavPages.some((p) => p.id === id)) return 'main';
        }
        const anySection =
            nav.lodgingEnabled || nav.exploringEnabled || nav.dynamicNavPages.length > 0;
        if (activeTab !== 'main' && (!data.showNavigation || !anySection)) return 'main';
        return activeTab;
    }, [activeTab, nav.lodgingEnabled, nav.exploringEnabled, nav.dynamicNavPages, data.showNavigation]);

    const activeDynamicPage = useMemo(() => {
        if (!effectiveTab.startsWith('page:')) return null;
        const id = effectiveTab.slice(5);
        return nav.dynamicNavPages.find((p) => p.id === id) ?? null;
    }, [effectiveTab, nav.dynamicNavPages]);

    useEffect(() => {
        if (effectiveTab !== activeTab) setActiveTab(effectiveTab);
    }, [effectiveTab, activeTab]);

    const footnoteSegments = useMemo(
        () => (data.footnote?.trim() ? parseFootnoteSegments(data.footnote) : []),
        [data.footnote]
    );
    const footnoteIntro = useMemo(
        () =>
            footnoteSegments
                .filter((s): s is { type: 'plain'; text: string } => s.type === 'plain')
                .map((s) => s.text)
                .join('')
                .trim(),
        [footnoteSegments]
    );
    const footnoteLinks = useMemo(
        () => footnoteSegments.filter((s): s is { type: 'link'; label: string; href: string } => s.type === 'link'),
        [footnoteSegments]
    );

    const goToFootnoteNavTarget = useCallback(
        (href: string) => {
            if (!canFootnoteNavigate(href, data.showNavigation, nav)) return;
            const tab = parseFootnoteNavHref(href);
            if (!tab) return;
            setActiveTab(tab);
            setIsNavOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        [data.showNavigation, nav]
    );

    const footnoteBtnClass =
        'w-full max-w-sm border border-stone-900 bg-transparent px-8 py-4 font-serif text-sm uppercase tracking-[0.2em] text-stone-900 transition-colors duration-300 hover:bg-stone-900 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2';

    return (
        <div 
            className={`@container ${screenClass} ${cleanTheme.background || 'bg-stone-50'} ${cleanTheme.primaryText || 'text-stone-800'} font-sans selection:bg-emerald-100/30 selection:text-emerald-900 w-full min-w-0 max-w-full overflow-x-hidden flex flex-col transition-colors duration-700`}
            style={{
                '--theme-primary': data.theme?.rawPrimary || '#1a1a1a',
                '--theme-accent': data.theme?.rawAccent || (data.theme?.name === 'emerald' ? '#047857' : data.theme?.name === 'rose' ? '#fb7185' : '#9ca3af'),
                '--theme-bg': data.theme?.rawBackground || '#ffffff',
                backgroundColor: data.theme?.name === 'custom' ? 'var(--theme-bg)' : undefined
            } as React.CSSProperties}
        >
            {data.audioUrl && (
                <audio ref={audioRef} src={data.audioUrl} preload="auto" loop />
            )}

            <AnimatePresence mode="wait">
                {!hasOpened ? (
                    <motion.div
                        key="intro-overlay"
                        exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)", transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }}
                        className={`flex-1 flex flex-col items-center justify-center p-6 bg-stone-950 relative overflow-hidden ${dvhClass}`}
                    >
                        {/* Background hint */}
                        <div className="absolute inset-0 z-0 overflow-hidden opacity-30 mix-blend-overlay">
                            {isVideo ? (
                                <video src={data.heroVideo} autoPlay muted playsInline className="w-full h-full object-cover blur-sm scale-110 pointer-events-none" />
                            ) : (
                                <img src={data.heroImage || defaultImage} className="w-full h-full object-cover blur-sm scale-110 pointer-events-none" />
                            )}
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                            className="relative z-10 max-w-sm w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-10 flex flex-col items-center text-center"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-8 border border-white/10 shadow-inner">
                                <Heart className="w-7 h-7 text-white/80" />
                            </div>

                            {data.showHeroLogo && data.heroLogoUrl ? (
                                <img src={data.heroLogoUrl} alt="Hero Logo" className="w-48 @md:w-64 max-h-32 object-contain mx-auto mb-6" />
                            ) : (
                                <h1 className="text-3xl font-serif mb-3 text-white tracking-wide">
                                    {data.bride || "Bride"} & {data.groom || "Groom"}
                                </h1>
                            )}

                            <p className="text-white/60 font-light mb-12 text-xs tracking-widest uppercase">
                                You are warmly invited
                            </p>

                            <button
                                onClick={handleOpenInvitation}
                                className="w-full bg-white text-stone-900 font-medium py-4 px-6 rounded-full hover:bg-stone-100 transition-all flex items-center justify-center gap-3 hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                            >
                                <MailOpen className="w-5 h-5" />
                                Tap to Open
                            </button>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="main-app"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.2 }}
                        className="w-full flex flex-col relative"
                    >
                        {/* Floating Nav Button — only when at least one secondary section is on */}
                        {showNavButton && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 1, duration: 0.5 }}
                                onClick={() => setIsNavOpen(true)}
                                className="fixed top-6 right-6 z-[60] w-12 h-12 bg-white/90 backdrop-blur-md rounded-full shadow-[0_4px_20px_rgb(0,0,0,0.1)] flex items-center justify-center text-stone-800 hover:scale-105 transition-all"
                                aria-label="Open menu"
                            >
                                <Menu className="w-5 h-5" />
                            </motion.button>
                        )}

                        {/* Navigation Overlay */}
                        <AnimatePresence>
                            {isNavOpen && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className={`fixed inset-0 z-[70] ${cleanTheme.bgAccent} backdrop-blur-xl flex flex-col items-center justify-center`}
                                    style={data.theme?.name === 'custom' ? { backgroundColor: 'var(--theme-accent)' } : undefined}
                                >
                                    <button
                                        onClick={() => setIsNavOpen(false)}
                                        className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white transition-colors hover:scale-105"
                                        aria-label="Close menu"
                                    >
                                        <X className="w-8 h-8" />
                                    </button>
                                    
                                    <nav className="flex flex-col items-center space-y-10">
                                        {navMenuItems.map((item) => (
                                            <button
                                                key={item.key}
                                                type="button"
                                                onClick={() => {
                                                    setActiveTab(item.key);
                                                    setIsNavOpen(false);
                                                }}
                                                className={`text-4xl @md:text-5xl font-serif transition-all ${effectiveTab === item.key ? 'text-white scale-110 drop-shadow-md' : 'text-white/60 hover:text-white/90 hover:scale-105'}`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </nav>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {effectiveTab === 'main' ? (
                            <motion.div
                                key="main-content"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                                className="w-full flex flex-col relative"
                            >
                                {/* Hero Section */}
                                <section className={`relative flex items-center justify-center overflow-hidden ${isVideo ? 'w-full' : screenClass}`}>
                            <div className={`${isVideo ? 'relative w-full' : 'absolute inset-0'} z-0 overflow-hidden bg-stone-900`}>
                                <div className="absolute inset-0 bg-stone-950/40 z-10" />
                                {isVideo ? (
                                    <motion.video
                                        src={data.heroVideo}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-auto block"
                                        initial={{ scale: 1.15 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 12, ease: "easeOut" }}
                                        key={`vid-${data.heroVideo}`} // Force re-render on change
                                    />
                                ) : (
                                    <motion.img
                                        src={data.heroImage || defaultImage}
                                        alt={`${data.bride} and ${data.groom}`}
                                        className="w-full h-full object-cover"
                                        initial={{ scale: 1.15 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 12, ease: "easeOut" }}
                                        key={`img-${data.heroImage}`} // Force re-render on change
                                    />
                                )}
                            </div>

                            <div className="relative z-20 text-center text-white px-4 w-full">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                                >
                                    {data.showHeroLogo && data.heroLogoUrl ? (
                                        <img src={data.heroLogoUrl} alt="Hero Logo" className="max-w-[min(100%,80cqw)] @md:max-w-xl mx-auto mb-6 object-contain" />
                                    ) : (
                                        <h1 className="text-5xl @md:text-8xl @lg:text-9xl font-serif mb-6 tracking-wide drop-shadow-sm font-light">
                                            {data.bride || "Bride"} & {data.groom || "Groom"}
                                        </h1>
                                    )}
                                    {data.showHeroDate !== false && (
                                        <p className="text-lg @md:text-xl @lg:text-2xl font-light tracking-[0.3em] uppercase drop-shadow-sm mt-8 opacity-90">
                                            {formatDate(data.date)}
                                        </p>
                                    )}
                                </motion.div>
                            </div>

                            {/* Scroll Indicator */}
                            <motion.div
                                className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 text-white/50"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.5, duration: 1 }}
                            >
                                <div className="w-[1px] h-16 bg-gradient-to-b from-white/0 via-white/50 to-white/0 mx-auto" />
                            </motion.div>
                        </section>

                        {/* Formal Invitation Section */}
                        {data.showFormalInvitation && data.formalInvitationImage && (
                            <motion.section
                                className={`relative w-full overflow-hidden bg-stone-900 ${data.formalInvitationIsVideo || (data.formalInvitationImage || '').split('?')[0].match(/\.(mp4|webm|ogg|mov)$/i) ? '' : screenClass}`}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={sectionVariants}
                                onViewportEnter={() => formalVideoRef.current?.play().catch(() => {})}
                                onViewportLeave={() => formalVideoRef.current?.pause()}
                            >
                                <div className={`${data.formalInvitationIsVideo || (data.formalInvitationImage || '').split('?')[0].match(/\.(mp4|webm|ogg|mov)$/i) ? 'relative w-full' : 'absolute inset-0'} overflow-hidden bg-stone-900`}>
                                    {data.formalInvitationIsVideo || (data.formalInvitationImage || '').split('?')[0].match(/\.(mp4|webm|ogg|mov)$/i) ? (
                                        <video
                                            ref={formalVideoRef}
                                            src={data.formalInvitationImage} 
                                            className="w-full h-auto block" 
                                            playsInline 
                                            muted
                                        />
                                    ) : (
                                        <img 
                                            src={data.formalInvitationImage} 
                                            alt="Formal Invitation" 
                                            className="w-full h-full object-cover" 
                                        />
                                    )}
                                </div>
                            </motion.section>
                        )}

                        {/* Welcome Section & Countdown */}
                        <motion.section
                            className="py-32 @md:py-48 px-6 @md:px-12 max-w-4xl mx-auto text-center"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={sectionVariants}
                        >
                            <h2 className="text-3xl @md:text-4xl @lg:text-5xl font-serif mb-8 leading-relaxed text-stone-800 font-light whitespace-pre-line">
                                {data.message || "Message goes here"}
                            </h2>

                            {timeLeft && (timeLeft.years > 0 || timeLeft.months > 0 || timeLeft.days > 0) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: 0.3, duration: 0.8 }}
                                    className="mt-20"
                                >
                                    <h3 className="text-sm @md:text-base font-sans mb-10 tracking-[0.2em] uppercase text-stone-400">
                                        Countdown for the most special day
                                    </h3>
                                    <div className="flex justify-center items-center gap-6 @md:gap-12">
                                        {(timeLeft.years > 0 || timeLeft.months > 0) && (
                                            <>
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-6xl @md:text-8xl @lg:text-9xl font-serif ${cleanTheme.accent} font-extralight tracking-tighter drop-shadow-sm`}>{timeLeft.months}</span>
                                                    <span className="text-[10px] @md:text-xs uppercase tracking-[0.3em] text-stone-400 mt-6 font-medium">Months</span>
                                                </div>
                                                <div className="w-px h-16 @md:h-24 bg-stone-200 mt-[-20px]" />
                                            </>
                                        )}
                                        <div className="flex flex-col items-center">
                                            <span className={`text-6xl @md:text-8xl @lg:text-9xl font-serif ${cleanTheme.accent} font-extralight tracking-tighter drop-shadow-sm`}>{timeLeft.days}</span>
                                            <span className="text-[10px] @md:text-xs uppercase tracking-[0.3em] text-stone-400 mt-6 font-medium">Days</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                            {/* {<InvitationAddToCalendar data={data} />} */}
                            <div className="w-12 h-[1px] bg-stone-300 mx-auto mt-20" />
                        </motion.section>

                        {/* Pre-Ceremony Visual Extension */}
                        {data.preCeremonyMedia && (
                            <motion.section
                                className={`relative w-full overflow-hidden bg-stone-900 ${screenClass}`}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={sectionVariants}
                                onViewportEnter={() => preCeremonyVideoRef.current?.play().catch(() => {})}
                                onViewportLeave={() => preCeremonyVideoRef.current?.pause()}
                            >
                                <div className="absolute inset-0 w-full h-full">
                                    {data.preCeremonyMediaIsVideo || (data.preCeremonyMedia || '').split('?')[0].match(/\.(mp4|webm|ogg|mov)$/i) ? (
                                        <video
                                            ref={preCeremonyVideoRef}
                                            src={data.preCeremonyMedia} 
                                            className="w-full h-full object-cover" 
                                            playsInline 
                                            muted
                                            loop
                                        />
                                    ) : (
                                        <img 
                                            src={data.preCeremonyMedia} 
                                            alt="Pre-Ceremony Feature" 
                                            className="w-full h-full object-cover" 
                                        />
                                    )}
                                </div>
                            </motion.section>
                        )}

                        {/* Event Details Section - Refactored to Stacked Elegant Layout */}
                        <motion.section
                            className={`relative py-32 @md:py-48 px-6 @md:px-12 flex items-center justify-center overflow-hidden ${screenClass}`}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={sectionVariants}
                        >
                            {/* Background Image Layer */}
                            {data.detailsBackgroundUrl ? (
                                <div
                                    className="absolute inset-0 z-0 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${data.detailsBackgroundUrl})` }}
                                >
                                    {/* Subtle overlay to ensure text contrast over textures */}
                                    <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] mix-blend-overlay z-10" />
                                </div>
                            ) : (
                                <div className="absolute inset-0 z-0 bg-stone-50" />
                            )}

                            {/* Inner Stationery Frame */}
                            <div className="relative z-20 w-full max-w-2xl bg-white/40 backdrop-blur-md border border-stone-200 shadow-2xl p-16 @md:p-24 rounded-sm flex flex-col items-center text-center">

                                {/* The Houses Block */}
                                {data.showHouses && (
                                    <motion.div variants={itemVariants} className="flex flex-col items-center w-full mb-16">
                                        <div className="w-full flex flex-col gap-16 @md:px-8 text-center">
                                            {/* Bride's House */}
                                            <div className="flex flex-col items-center gap-4">
                                                {data.housesData?.brideLabel && (
                                                    <p className="text-[10px] @md:text-xs font-sans text-stone-400 uppercase tracking-[0.25em] mb-[-12px]">
                                                        {data.housesData.brideLabel}
                                                    </p>
                                                )}
                                                <h5 className={`text-3xl @md:text-5xl font-serif ${cleanTheme.primaryText} uppercase tracking-[0.2em] mb-4 font-light drop-shadow-sm`}>
                                                    {data.housesData?.brideName || "The Bride's House"}
                                                </h5>
                                                
                                                {data.housesData?.brideAddress && (
                                                    <div className="flex flex-col items-center gap-2 text-stone-700">
                                                        <p className="font-sans font-light leading-relaxed whitespace-pre-line text-sm @md:text-base">
                                                            {data.housesData.brideAddress}
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                {data.housesData?.brideTime && (
                                                    <div className="flex flex-col items-center gap-2 text-stone-700">
                                                        <p className="font-sans font-light text-sm @md:text-base">
                                                            Starting <span className="font-medium">{data.housesData.brideTime}</span>
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                {data.housesData?.brideMapLink && (
                                                    <a
                                                        href={data.housesData.brideMapLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center mt-6 text-[10px] uppercase tracking-widest ${cleanTheme.accent} hover:opacity-70 transition-opacity pb-1 shadow-sm`}
                                                    >
                                                        View Map <ExternalLink className="w-3 h-3 ml-2" />
                                                    </a>
                                                )}
                                            </div>

                                            {/* Divider */}
                                            <div className="w-16 h-[1px] bg-stone-200 mx-auto" />

                                            {/* Groom's House */}
                                            <div className="flex flex-col items-center gap-4">
                                                {data.housesData?.groomLabel && (
                                                    <p className="text-[10px] @md:text-xs font-sans text-stone-400 uppercase tracking-[0.25em] mb-[-12px]">
                                                        {data.housesData.groomLabel}
                                                    </p>
                                                )}
                                                <h5 className={`text-3xl @md:text-5xl font-serif ${cleanTheme.primaryText} uppercase tracking-[0.2em] mb-4 font-light drop-shadow-sm`}>
                                                    {data.housesData?.groomName || "The Groom's House"}
                                                </h5>
                                                
                                                {data.housesData?.groomAddress && (
                                                    <div className="flex flex-col items-center gap-2 text-stone-700">
                                                        <p className="font-sans font-light leading-relaxed whitespace-pre-line text-sm @md:text-base">
                                                            {data.housesData.groomAddress}
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                {data.housesData?.groomTime && (
                                                    <div className="flex flex-col items-center gap-2 text-stone-700">
                                                        <p className="font-sans font-light text-sm @md:text-base">
                                                            Starting <span className="font-medium">{data.housesData.groomTime}</span>
                                                        </p>
                                                    </div>
                                                )}
                                                
                                                {data.housesData?.groomMapLink && (
                                                    <a
                                                        href={data.housesData.groomMapLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`inline-flex items-center mt-6 text-[10px] uppercase tracking-widest ${cleanTheme.accent} hover:opacity-70 transition-opacity pb-1 shadow-sm`}
                                                    >
                                                        View Map <ExternalLink className="w-3 h-3 ml-2" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Divider (if houses and ceremony exist) */}
                                {data.showHouses && (data.venue || data.time) && (
                                    <motion.div variants={itemVariants} className="flex justify-center w-full mb-16 mt-8 opacity-40">
                                        <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-stone-800 to-transparent" />
                                    </motion.div>
                                )}

                                {/* Ceremony Block */}
                                {(data.venue || data.time) && (
                                    <motion.div variants={itemVariants} className="flex flex-col items-center w-full">
                                        <h4 className="text-3xl @md:text-5xl font-serif text-stone-800 tracking-[0.2em] uppercase mb-10 font-light drop-shadow-sm">
                                            Ceremony
                                        </h4>
                                        <div className="space-y-4 mb-4">
                                            {data.venue && (
                                                <p
                                                    dir="auto"
                                                    className="text-lg @md:text-xl font-serif text-stone-700 uppercase tracking-widest drop-shadow-sm leading-relaxed whitespace-pre-line text-center"
                                                >
                                                    {data.venue}
                                                </p>
                                            )}
                                            {data.location && (
                                                <p className="text-xs @md:text-sm font-sans text-stone-600 uppercase tracking-[0.25em]">
                                                    {data.location}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-8 space-y-2">
                                            <p className="text-lg font-serif text-stone-700 tracking-widest">{formatDate(data.date)}</p>
                                            {data.time && <p className="text-lg font-serif text-stone-700 tracking-[0.2em]">{formatTime(data.time)}</p>}
                                        </div>

                                        {data.mapLink && (
                                            <a
                                                href={data.mapLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`inline-flex items-center mt-10 text-[10px] uppercase tracking-widest ${cleanTheme.accent} hover:opacity-70 transition-opacity pb-1 shadow-sm`}
                                            >
                                                View Map <ExternalLink className="w-3 h-3 ml-2" />
                                            </a>
                                        )}
                                    </motion.div>
                                )}

                                {/* Divider (if both parts exist) */}
                                {(data.venue || data.time) && (data.receptionVenue || data.receptionTime) && (
                                    <motion.div variants={itemVariants} className="flex justify-center w-full my-16 opacity-40">
                                        <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-stone-800 to-transparent" />
                                    </motion.div>
                                )}

                                {/* Reception Block */}
                                {(data.receptionVenue || data.receptionTime) && (
                                    <motion.div variants={itemVariants} className="flex flex-col items-center w-full">
                                        <h4 className="text-3xl @md:text-5xl font-serif text-stone-800 tracking-[0.2em] uppercase mb-10 font-light drop-shadow-sm">
                                            Reception
                                        </h4>
                                        <div className="space-y-4 mb-4">
                                            {data.receptionVenue && (
                                                <p
                                                    dir="auto"
                                                    className="text-lg @md:text-xl font-serif text-stone-700 uppercase tracking-widest drop-shadow-sm leading-relaxed whitespace-pre-line text-center"
                                                >
                                                    {data.receptionVenue}
                                                </p>
                                            )}
                                            {data.receptionAddress && (
                                                <p className="text-xs @md:text-sm font-sans text-stone-600 uppercase tracking-[0.25em]">
                                                    {data.receptionAddress}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-8 space-y-2">
                                            {data.receptionTime && <p className="text-lg font-serif text-stone-700 tracking-[0.2em]">{formatTime(data.receptionTime)}</p>}
                                        </div>

                                        {data.receptionLocation && (
                                            <a
                                                href={data.receptionLocation}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`inline-flex items-center mt-10 text-[10px] uppercase tracking-widest ${cleanTheme.accent} hover:opacity-70 transition-opacity pb-1 shadow-sm`}
                                            >
                                                View Map <ExternalLink className="w-3 h-3 ml-2" />
                                            </a>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        </motion.section>

                        {/* Custom Modular Sections — default position (before Gifts) */}
                        {data.customSections?.filter(s => s.position !== 'pre-rsvp').map((section, index) => {
                            const sectionIsSlideshow = section.backgroundType === 'slideshow';
                            const sectionIsVideo =
                                !sectionIsSlideshow &&
                                (section.backgroundType === 'video' ||
                                    !!(section.backgroundUrl || '').split('?')[0].match(/\.(mp4|webm|ogg|mov)$/i));
                            const showOverlay = section.showOverlay !== false;
                            const isFullBleed = section.isFullBleed === true;
                            const slideUrls = customSectionSlideUrls(section);

                            return (
                                <motion.section
                                    key={section.id || index}
                                    className={`relative flex items-center justify-center overflow-hidden ${sectionIsVideo ? 'w-full' : (isFullBleed ? screenClass : `py-24 ${h60Class}`)}`}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-100px" }}
                                    variants={sectionVariants}
                                    onViewportEnter={() => {
                                        if (sectionIsVideo) {
                                            const vid = document.getElementById(`vid-custom-${section.id}`) as HTMLVideoElement;
                                            vid?.play().catch(() => {});
                                        }
                                    }}
                                >
                                    {/* Background Media */}
                                    <div className={`${sectionIsVideo ? 'relative w-full' : 'absolute inset-0'} z-0 overflow-hidden bg-stone-900`}>
                                        {sectionIsVideo ? (
                                            <video
                                                id={`vid-custom-${section.id}`}
                                                src={section.backgroundUrl}
                                                className="w-full h-auto block"
                                                playsInline
                                                muted
                                                loop
                                            />
                                        ) : sectionIsSlideshow ? (
                                            <CustomSectionSlideshow
                                                urls={slideUrls}
                                                intervalSec={section.slideshowIntervalSec ?? 5}
                                                autoplay={section.slideshowAutoplay !== false}
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full bg-cover bg-center"
                                                style={{ backgroundImage: `url(${section.backgroundUrl})` }}
                                            />
                                        )}
                                        {showOverlay && (
                                            <div className="absolute inset-0 bg-stone-950/40 z-10" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    {section.overlayType !== 'none' && (
                                        <div className={`absolute inset-0 z-20 text-center px-6 w-full flex flex-col items-center justify-center ${sectionIsVideo ? '' : (isFullBleed ? '' : 'max-w-4xl mx-auto')}`}>
                                            {section.overlayType === 'text' && section.textContent && (
                                                <h2 className={`text-4xl @md:text-5xl @lg:text-6xl text-white drop-shadow-md leading-relaxed ${section.fontFamily || 'font-sans'}`}>
                                                    {section.textContent}
                                                </h2>
                                            )}

                                            {section.overlayType === 'image' && section.overlayImageUrl && (
                                                <img
                                                    src={section.overlayImageUrl}
                                                    alt="Custom Section Overlay"
                                                    className="w-full max-w-xs @md:max-w-md @lg:max-w-lg object-contain drop-shadow-xl"
                                                />
                                            )}
                                        </div>
                                    )}
                                </motion.section>
                            );
                        })}

                        {/* Gifts Section */}
                        {hasGiftsSection && (
                            <InvitationGifts
                                giftMessage={data.giftMessage}
                                giftOptions={data.giftOptions || []}
                                accentClass={cleanTheme.accent}
                            />
                        )}

                        {/* Custom Modular Sections — pre-RSVP position */}
                        {data.customSections?.filter(s => s.position === 'pre-rsvp').map((section, index) => {
                            const sectionIsSlideshow = section.backgroundType === 'slideshow';
                            const sectionIsVideo =
                                !sectionIsSlideshow &&
                                (section.backgroundType === 'video' ||
                                    !!(section.backgroundUrl || '').split('?')[0].match(/\.(mp4|webm|ogg|mov)$/i));
                            const showOverlay = section.showOverlay !== false;
                            const isFullBleed = section.isFullBleed === true;
                            const slideUrls = customSectionSlideUrls(section);

                            return (
                                <motion.section
                                    key={section.id || index}
                                    className={`relative flex items-center justify-center overflow-hidden ${sectionIsVideo ? 'w-full' : (isFullBleed ? screenClass : `py-24 ${h60Class}`)}`}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-100px" }}
                                    variants={sectionVariants}
                                    onViewportEnter={() => {
                                        if (sectionIsVideo) {
                                            const vid = document.getElementById(`vid-pre-rsvp-${section.id}`) as HTMLVideoElement;
                                            vid?.play().catch(() => {});
                                        }
                                    }}
                                >
                                    <div className={`${sectionIsVideo ? 'relative w-full' : 'absolute inset-0'} z-0 overflow-hidden bg-stone-900`}>
                                        {sectionIsVideo ? (
                                            <video
                                                id={`vid-pre-rsvp-${section.id}`}
                                                src={section.backgroundUrl}
                                                className="w-full h-auto block"
                                                playsInline
                                                muted
                                                loop
                                            />
                                        ) : sectionIsSlideshow ? (
                                            <CustomSectionSlideshow
                                                urls={slideUrls}
                                                intervalSec={section.slideshowIntervalSec ?? 5}
                                                autoplay={section.slideshowAutoplay !== false}
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full bg-cover bg-center"
                                                style={{ backgroundImage: `url(${section.backgroundUrl})` }}
                                            />
                                        )}
                                        {showOverlay && (
                                            <div className="absolute inset-0 bg-stone-950/40 z-10" />
                                        )}
                                    </div>
                                    {section.overlayType !== 'none' && (
                                        <div className={`absolute inset-0 z-20 text-center px-6 w-full flex flex-col items-center justify-center ${sectionIsVideo ? '' : (isFullBleed ? '' : 'max-w-4xl mx-auto')}`}>
                                            {section.overlayType === 'text' && section.textContent && (
                                                <h2 className={`text-4xl @md:text-5xl @lg:text-6xl text-white drop-shadow-md leading-relaxed ${section.fontFamily || 'font-sans'}`}>
                                                    {section.textContent}
                                                </h2>
                                            )}
                                            {section.overlayType === 'image' && section.overlayImageUrl && (
                                                <img
                                                    src={section.overlayImageUrl}
                                                    alt="Custom Section Overlay"
                                                    className="w-full max-w-xs @md:max-w-md @lg:max-w-lg object-contain drop-shadow-xl"
                                                />
                                            )}
                                        </div>
                                    )}
                                </motion.section>
                            );
                        })}

                        {/* RSVP: full form when enabled; otherwise optional static message (footnote style) */}
                        {((data.showRsvp !== false) || (data.showRsvp === false && data.rsvpClosedMessage?.trim())) && (
                        <motion.section
                            className="w-full flex justify-center py-32 @md:py-48 px-4 @sm:px-6 @md:px-12 box-border"
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={sectionVariants}
                        >
                            <div className="w-full max-w-3xl min-w-0 shrink-0">
                            <div className="bg-white p-8 @sm:p-12 @md:p-20 rounded-none @md:rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] @sm:border @sm:border-stone-100 w-full mx-auto">
                                <h3 className="text-4xl @md:text-5xl font-serif text-center mb-16 text-stone-800 font-light">
                                    RSVP
                                </h3>

                                {data.showRsvp !== false ? (
                                <>
                                {rsvpSubmitted ? (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                        className="relative text-center py-12 @md:py-16"
                                    >
                                        {formData.attending === 'yes' && <ConfettiBurst />}
                                        <div className={`relative w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 overflow-hidden ${cleanTheme.accent}`}>
                                            <div className="absolute inset-0 bg-current opacity-10" 
                                                 style={data.theme?.name === 'custom' ? { backgroundColor: 'var(--theme-accent)' } : {}} />
                                            <CheckCircle2 className="relative z-10 w-8 h-8" />
                                        </div>
                                        <h4 className="text-3xl font-serif mb-4 text-stone-800 font-light">Thank You for your RSVP!</h4>
                                        <p className="text-stone-500 font-light text-lg">We look forward to celebrating with you.</p>
                                    </motion.div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-12">
                                        {guestData && guestData.status !== 'pending' && (
                                            <div className={`relative p-6 rounded-2xl mb-4 shadow-sm border overflow-hidden ${cleanTheme.accent}`}>
                                                <div className="absolute inset-0 bg-current opacity-5" 
                                                     style={data.theme?.name === 'custom' ? { backgroundColor: 'var(--theme-accent)' } : {}} />
                                                <div className="relative z-10 flex flex-col @sm:flex-row items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-current/10 flex items-center justify-center flex-shrink-0">
                                                        <CheckCircle2 className="w-5 h-5 shadow-sm" />
                                                    </div>
                                                    <div className="text-center @sm:text-left text-stone-800">
                                                        <p className="font-medium text-base mb-1 tracking-wide">RSVP Already Submitted</p>
                                                        <p className="opacity-80 font-light text-sm">You have responded as <strong>{guestData.status === 'attending' ? 'Attending' : 'Declined'}</strong>.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {guestData ? (
                                            <div className="space-y-3">
                                                <label htmlFor="fullName" className="block text-xs uppercase tracking-[0.1em] text-stone-400">Name</label>
                                                <input
                                                    type="text"
                                                    id="fullName"
                                                    name="fullName"
                                                    required
                                                    value={formData.fullName}
                                                    onChange={handleInputChange}
                                                    readOnly
                                                    className="w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors placeholder:text-stone-300 font-light text-stone-500 cursor-not-allowed border-dashed"
                                                    placeholder="Jane Doe"
                                                />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 @md:grid-cols-2 gap-10 @md:gap-8">
                                                <div className="space-y-3">
                                                    <label htmlFor="firstName" className="block text-xs uppercase tracking-[0.1em] text-stone-400">First Name</label>
                                                    <input
                                                        type="text"
                                                        id="firstName"
                                                        name="firstName"
                                                        required
                                                        value={formData.firstName}
                                                        onChange={handleInputChange}
                                                        className="w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors placeholder:text-stone-300 font-light"
                                                        placeholder="Jane"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <label htmlFor="lastName" className="block text-xs uppercase tracking-[0.1em] text-stone-400">Last Name</label>
                                                    <input
                                                        type="text"
                                                        id="lastName"
                                                        name="lastName"
                                                        required
                                                        value={formData.lastName}
                                                        onChange={handleInputChange}
                                                        className="w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors placeholder:text-stone-300 font-light"
                                                        placeholder="Doe"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-6 pt-4">
                                            <label className="block text-xs uppercase tracking-[0.1em] text-stone-400 text-center @md:text-left">Will you be attending?</label>
                                            <div className="flex flex-col @sm:flex-row gap-6 @sm:gap-12">
                                                <label className="flex items-center gap-4 cursor-pointer group p-4 @sm:p-0 rounded-lg @sm:rounded-none bg-stone-50 @sm:bg-transparent hover:bg-stone-100 @sm:hover:bg-transparent transition-colors">
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="radio"
                                                            name="attending"
                                                            value="yes"
                                                            checked={formData.attending === 'yes'}
                                                            onChange={handleInputChange}
                                                            disabled={!!guestData && guestData.status !== 'pending'}
                                                            className={`peer sr-only ${guestData && guestData.status !== 'pending' ? 'cursor-not-allowed' : ''}`}
                                                        />
                                                        <div className={`w-6 h-6 rounded-full border transition-colors ${cleanTheme.borderAccent && formData.attending === 'yes' ? cleanTheme.borderAccent : 'border-stone-300'}`}
                                                             style={data.theme?.name === 'custom' && formData.attending === 'yes' ? { borderColor: 'var(--theme-accent)' } : {}}></div>
                                                        <div className={`w-3 h-3 rounded-full absolute opacity-0 peer-checked:opacity-100 transition-opacity transform scale-50 peer-checked:scale-100 ${cleanTheme.bgAccent}`}
                                                             style={data.theme?.name === 'custom' ? { backgroundColor: 'var(--theme-accent)' } : {}}></div>
                                                    </div>
                                                    <span className="text-stone-600 group-hover:text-stone-900 transition-colors font-serif text-lg">Joyfully Accept</span>
                                                </label>
                                                <label className="flex items-center gap-4 cursor-pointer group p-4 @sm:p-0 rounded-lg @sm:rounded-none bg-stone-50 @sm:bg-transparent hover:bg-stone-100 @sm:hover:bg-transparent transition-colors">
                                                    <div className="relative flex items-center justify-center">
                                                        <input
                                                            type="radio"
                                                            name="attending"
                                                            value="no"
                                                            checked={formData.attending === 'no'}
                                                            onChange={handleInputChange}
                                                            disabled={!!guestData && guestData.status !== 'pending'}
                                                            className={`peer sr-only ${guestData && guestData.status !== 'pending' ? 'cursor-not-allowed' : ''}`}
                                                        />
                                                        <div className={`w-6 h-6 rounded-full border transition-colors ${cleanTheme.borderAccent && formData.attending === 'no' ? cleanTheme.borderAccent : 'border-stone-300'}`}
                                                             style={data.theme?.name === 'custom' && formData.attending === 'no' ? { borderColor: 'var(--theme-accent)' } : {}}></div>
                                                        <div className={`w-3 h-3 rounded-full absolute opacity-0 peer-checked:opacity-100 transition-opacity transform scale-50 peer-checked:scale-100 ${cleanTheme.bgAccent}`}
                                                             style={data.theme?.name === 'custom' ? { backgroundColor: 'var(--theme-accent)' } : {}}></div>
                                                    </div>
                                                    <span className="text-stone-600 group-hover:text-stone-900 transition-colors font-serif text-lg">Regretfully Decline</span>
                                                </label>
                                            </div>
                                        </div>

                                        {formData.attending === 'yes' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                className="space-y-8 overflow-hidden pt-4"
                                            >
                                                <div className="space-y-3">
                                                    <label htmlFor="guests" className="block text-xs uppercase tracking-[0.1em] text-stone-400">
                                                        {multiGuestNameCollectionActive ? 'Total Pax' : 'Number of Guests'}
                                                    </label>
                                                    <div className="relative">
                                                        <select
                                                            id="guests"
                                                            name="guests"
                                                            value={formData.guests}
                                                            onChange={handleInputChange}
                                                            disabled={!!guestData && guestData.status !== 'pending'}
                                                            className={`w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors appearance-none font-light ${guestData && guestData.status !== 'pending' ? 'text-stone-500 cursor-not-allowed border-dashed' : 'cursor-pointer'}`}
                                                        >
                                                            {Array.from({ length: guestData ? guestData.pax : 4 }, (_, i) => i + 1).map(num => (
                                                                <option key={num} value={num}>{num} {num === 1 ? 'Person' : 'People'}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    {multiGuestNameCollectionActive && (
                                                        <p className="text-xs text-stone-400 leading-relaxed">
                                                            Your invitation allows up to {originalPartyPax} {originalPartyPax === 1 ? 'person' : 'people'} total. Add names for the extra guests in the pax you selected.
                                                        </p>
                                                    )}
                                                </div>
                                                {multiGuestNameCollectionActive && !companionNamesRevealed && (
                                                    <div className="pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setCompanionNamesRevealed(true)}
                                                            className="text-xs uppercase tracking-[0.16em] text-stone-500 underline underline-offset-4 hover:text-stone-800 transition-colors"
                                                        >
                                                            Add guest names (optional)
                                                        </button>
                                                        {availableCompanionSlots === 0 && (
                                                            <p className="text-xs text-stone-400 mt-3">
                                                                Select at least 2 pax to add guest names.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                {multiGuestNameCollectionActive && companionNamesRevealed && visibleCompanionRows.length > 0 && (
                                                    <div className="space-y-6">
                                                        <AnimatePresence initial={false}>
                                                            {visibleCompanionRows.map((row) => {
                                                                const companion = companions[row.index] ?? { fullName: '' };

                                                                return (
                                                                    <motion.div
                                                                        key={row.index}
                                                                        initial={{ opacity: 0, y: -8 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: -8 }}
                                                                        className="rounded-2xl border border-stone-100 bg-stone-50/60 p-5 @md:p-6 space-y-5"
                                                                    >
                                                                        <div className="flex items-center justify-between gap-4">
                                                                            <p className="text-xs uppercase tracking-[0.16em] text-stone-400">{row.label}</p>
                                                                            <p className="text-[11px] text-stone-400">Optional</p>
                                                                        </div>
                                                                        <input
                                                                            type="text"
                                                                            id={`companion-${row.index}-fullName`}
                                                                            value={companion.fullName}
                                                                            onChange={(event) => handleCompanionChange(row.index, event.target.value)}
                                                                            className="w-full bg-transparent border-b border-stone-200 py-2.5 text-base focus:outline-none focus:border-stone-800 transition-colors placeholder:text-stone-300 font-light"
                                                                            placeholder="Guest full name"
                                                                        />
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </AnimatePresence>
                                                    </div>
                                                )}
                                                {multiGuestNameCollectionActive && companionNamesRevealed && visibleCompanionRows.length === 0 && (
                                                    <p className="text-xs text-stone-400">
                                                        Select at least 2 pax to add guest names.
                                                    </p>
                                                )}
                                            </motion.div>
                                        )}

                                        <div className="space-y-3 pt-4">
                                            <label htmlFor="message" className="block text-xs uppercase tracking-[0.1em] text-stone-400">
                                                {formData.attending === 'no'
                                                    ? 'A note for the couple (optional)'
                                                    : 'Message to the Newlyweds (Optional)'}
                                            </label>
                                            <textarea
                                                id="message"
                                                name="message"
                                                value={formData.message}
                                                onChange={handleInputChange}
                                                readOnly={!!guestData && guestData.status !== 'pending'}
                                                rows={3}
                                                className={`w-full bg-transparent border-b border-stone-200 py-3 text-lg focus:outline-none focus:border-stone-800 transition-colors resize-none placeholder:text-stone-300 font-light leading-relaxed ${guestData && guestData.status !== 'pending' ? 'text-stone-500 cursor-not-allowed border-dashed' : ''}`}
                                                placeholder={
                                                    formData.attending === 'no'
                                                        ? 'Share a kind word or short message…'
                                                        : 'Leave us a note, a wish, or just some love...'
                                                }
                                            />
                                        </div>

                                        <div className="pt-8">
                                            {submitError && (
                                                <div className="text-red-600 text-sm text-center mb-4">
                                                    {submitError}
                                                </div>
                                            )}
                                            {(!guestData || guestData.status === 'pending') && (
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="w-full py-5 px-8 bg-stone-900 text-white uppercase tracking-[0.2em] text-sm hover:bg-stone-800 transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isSubmitting ? "Sending..." : "Send RSVP"}
                                                </button>
                                            )}
                                        </div>
                                    </form>
                                )}
                                </>
                                ) : (
                                    <div className="max-w-lg mx-auto text-center px-2">
                                        <p className="text-[10px] @sm:text-[11px] font-sans uppercase tracking-[0.22em] text-stone-400 leading-relaxed whitespace-pre-line">
                                            {renderRsvpClosedMessageBody((data.rsvpClosedMessage ?? '').trim())}
                                        </p>
                                    </div>
                                )}
                            </div>
                            </div>
                        </motion.section>
                        )}

                        {(footnoteIntro || footnoteLinks.length > 0) && (
                            <motion.section
                                className="py-16 @md:py-24 px-4 @sm:px-6 @md:px-12 max-w-3xl mx-auto"
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-100px" }}
                                variants={sectionVariants}
                            >
                                <div className="pb-6 @md:pb-10 px-6 max-w-lg mx-auto flex flex-col items-center text-center gap-10">
                                    {footnoteIntro ? (
                                        <p className="text-[10px] @sm:text-[11px] font-sans uppercase tracking-[0.22em] text-stone-400 leading-relaxed whitespace-pre-line max-w-md">
                                            {footnoteIntro}
                                        </p>
                                    ) : null}
                                    {footnoteLinks.length > 0 ? (
                                        <div className="w-full flex flex-col items-stretch gap-5">
                                            {footnoteLinks.map((item, i) => {
                                                const navTab = parseFootnoteNavHref(item.href);
                                                const canNav = !!(navTab && canFootnoteNavigate(item.href, data.showNavigation, nav));
                                                if (navTab) {
                                                    return (
                                                        <button
                                                            key={`${item.label}-${i}`}
                                                            type="button"
                                                            disabled={!canNav}
                                                            onClick={() => goToFootnoteNavTarget(item.href)}
                                                            className={`${footnoteBtnClass} ${!canNav ? 'opacity-35 cursor-not-allowed hover:bg-transparent hover:text-stone-900' : ''}`}
                                                        >
                                                            {item.label}
                                                        </button>
                                                    );
                                                }
                                                return (
                                                    <a
                                                        key={`${item.label}-${i}`}
                                                        href={item.href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`${footnoteBtnClass} inline-flex justify-center items-center`}
                                                    >
                                                        {item.label}
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                            </motion.section>
                        )}
                    </motion.div>
                ) : effectiveTab === 'lodging' && nav.lodgingEnabled ? (
                    <motion.div
                        key="lodging-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className={`w-full flex flex-col relative ${cleanTheme.background} min-h-screen pt-24`}
                    >
                        <section className="py-20 px-6 @md:px-12 text-center flex flex-col items-center justify-center">
                            <h2 className={`text-5xl @md:text-6xl font-serif mb-6 ${cleanTheme.primaryText}`}>{nav.lodgingTitle}</h2>
                            <p className={`max-w-2xl text-lg font-light ${cleanTheme.primaryText} opacity-80 leading-relaxed mb-16 whitespace-pre-line`}>
                                {nav.lodgingIntro}
                            </p>
                            <div className="grid grid-cols-1 @md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
                                {nav.lodgingHotels.map((hotel, idx) => (
                                    <div key={idx} className="bg-white border border-stone-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-left hover:-translate-y-1 transition-transform overflow-hidden">
                                        {hotel.imageUrl ? (
                                            <img
                                                src={hotel.imageUrl}
                                                alt={hotel.title}
                                                className="w-full h-44 object-cover"
                                            />
                                        ) : null}
                                        <div className="p-10">
                                        {!hotel.imageUrl && (
                                            <div className={`w-12 h-12 rounded-full ${cleanTheme.bgAccent} text-white flex items-center justify-center mb-6`}>
                                                {idx % 2 === 0 ? <Heart className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                                            </div>
                                        )}
                                        <h3 className="text-2xl font-serif text-stone-800 mb-2">{hotel.title}</h3>
                                        <p className="text-stone-500 text-sm uppercase tracking-widest font-semibold mb-6">{hotel.subtitle}</p>
                                        <p className="text-stone-600 font-light mb-8 leading-relaxed whitespace-pre-line">{renderHotelDescription(hotel.description)}</p>
                                        <a
                                            href={hotel.linkUrl || '#'}
                                            target={hotel.linkUrl && hotel.linkUrl !== '#' ? '_blank' : undefined}
                                            rel={hotel.linkUrl && hotel.linkUrl !== '#' ? 'noopener noreferrer' : undefined}
                                            className={`text-sm uppercase tracking-widest font-bold ${cleanTheme.accent} hover:opacity-70 transition-opacity`}
                                        >
                                            {hotel.linkText} <ExternalLink className="w-4 h-4 inline ml-1 mb-1" />
                                        </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </motion.div>
                ) : effectiveTab === 'exploring' && nav.exploringEnabled ? (
                    <motion.div
                        key="exploring-content"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className={`w-full flex flex-col relative ${cleanTheme.background} min-h-screen pt-24 pb-20`}
                    >
                        <section className="py-20 px-6 @md:px-12 text-center flex flex-col items-center justify-center">
                            <h2 className={`text-5xl @md:text-6xl font-serif mb-6 ${cleanTheme.primaryText}`}>{nav.exploringTitle}</h2>
                            <p className={`max-w-2xl text-lg font-light ${cleanTheme.primaryText} opacity-80 leading-relaxed mb-16 whitespace-pre-line`}>
                                {nav.exploringIntro}
                            </p>
                            <div className="grid grid-cols-1 @md:grid-cols-3 gap-8 max-w-6xl mx-auto w-full text-left">
                                {nav.exploringSpots.map((spot, idx) => (
                                    <div key={idx} className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] group hover:-translate-y-2 transition-all duration-300 border border-stone-50">
                                        <div className="h-48 overflow-hidden bg-stone-100">
                                            <img src={spot.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        </div>
                                        <div className="p-8">
                                            <h3 className="text-xl font-serif text-stone-800 mb-2">{spot.title}</h3>
                                            <p className="text-stone-500 text-xs tracking-widest uppercase font-semibold mb-4">{spot.category}</p>
                                            <p className="text-stone-600 font-light text-sm whitespace-pre-line">{spot.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </motion.div>
                ) : activeDynamicPage ? (
                    <motion.div
                        key={`dynamic-page-${activeDynamicPage.id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className={`w-full flex flex-col relative ${cleanTheme.background} min-h-screen pt-24 pb-20`}
                    >
                        <section className="py-20 px-6 @md:px-12 flex flex-col items-center">
                            <div className="w-full max-w-3xl mx-auto bg-white p-8 @md:p-12 border border-stone-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                                {activeDynamicPage.title ? (
                                    <h2
                                        className={`text-4xl @md:text-5xl font-serif mb-4 text-center ${cleanTheme.primaryText} font-light`}
                                    >
                                        {activeDynamicPage.title}
                                    </h2>
                                ) : null}
                                {activeDynamicPage.date ? (
                                    <p className="text-stone-500 text-xs tracking-widest uppercase font-semibold mb-6 text-center">
                                        {activeDynamicPage.date}
                                    </p>
                                ) : null}
                                {activeDynamicPage.introduction ? (
                                    <p
                                        className={`max-w-2xl mx-auto text-lg font-light ${cleanTheme.primaryText} opacity-80 leading-relaxed mb-10 whitespace-pre-line text-center`}
                                    >
                                        {activeDynamicPage.introduction}
                                    </p>
                                ) : null}
                                <InvitationBlogReadonly
                                    body={activeDynamicPage.body}
                                    contentKey={activeDynamicPage.id}
                                    primaryTextClass={`${cleanTheme.primaryText} text-stone-700`}
                                />
                            </div>
                        </section>
                    </motion.div>
                ) : null}

                        {/* Shared Footer System (Outside the Switch) */}
                        <footer className="py-20 text-center border-t border-stone-200/60 bg-white">
                            <p className="text-stone-400 font-serif italic text-xl tracking-wide">
                                {data.bride || "Bride"} & {data.groom || "Groom"}
                            </p>
                        </footer>

                        {/* Music Player */}
                        {
                            data.audioUrl && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 2, duration: 1 }}
                                    onClick={toggleMusic}
                                    className={`fixed bottom-8 right-8 z-50 p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-all duration-500 hover:scale-110 focus:outline-none ${isPlaying ? `${cleanTheme.bgAccent} text-white` : 'bg-white/90 text-stone-600 border border-stone-200'}`}
                                     style={isPlaying && data.theme?.name === 'custom' ? { backgroundColor: 'var(--theme-accent)' } : {}}
                                    aria-label="Toggle background music"
                                >
                                    {isPlaying ? <Music className="w-6 h-6 animate-pulse" /> : <VolumeX className="w-6 h-6" />}
                                </motion.button>
                            )
                        }
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
