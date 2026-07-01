"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    LayoutDashboard,
    Settings,
    LogOut,
    Mail,
    HeartHandshake,
    CalendarDays,
    MapPin,
    Copy,
    Plus,
    Calculator,
    Armchair,
    Trash2,
    ChevronDown,
    X,
    Menu,
    ImagePlus
} from 'lucide-react';
import InvitationPreview, {
    InvitationData,
    Theme,
    mergeNavigationPages,
    NavigationPagesContent
} from '@/components/InvitationPreview';
import { GiftOptionsList } from '@/components/GiftOptionsForm';
import { InvitationBlogEditor } from '@/components/blog/InvitationBlogEditor';
import { wrapMarkdownBoldSegment, wrapMarkdownSegment } from '@/lib/rsvpClosedMessageBold';
import BudgetTracker from '@/components/BudgetTracker';
import TableSeating from '@/components/TableSeating';
import { getExpensesBySlug } from '@/app/actions/budget';
import { getSeatingData } from '@/app/actions/seating';
import type { SelectSeatingTable, SelectGuest } from '@/app/actions/seating';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useEntitlements } from '@/components/entitlements/EntitlementsContext';
import type { FeatureKey } from '@/lib/features';
import { useNavigationPages } from '@/hooks/useNavigationPages';
import { useGiftOptions } from '@/hooks/useGiftOptions';
import { FeatureLockedMessage } from '@/components/dashboard/FeatureLockedMessage';
import { getStatusBadge } from '@/components/dashboard/GuestStatusBadge';
import { GuestsTab } from '@/components/dashboard/GuestsTab';
import DashboardLockedScreen from '@/components/dashboard/DashboardLockedScreen';
import RsvpAnalytics from '@/components/dashboard/RsvpAnalytics';
import { toast } from 'sonner';
type DashboardTab = 'overview' | 'guests' | 'messages' | 'budget' | 'seating' | 'settings';

export default function DashboardPage() {
    const router = useRouter();
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);



    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    /** Switch tab and close the mobile drawer (used by the mobile nav). */
    const goToTab = (tab: DashboardTab) => {
        setActiveTab(tab);
        setMobileNavOpen(false);
    };

    // Overview State
    const [rsvps, setRsvps] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [seatingData, setSeatingData] = useState<{ tables: SelectSeatingTable[]; guests: SelectGuest[] }>({ tables: [], guests: [] });

    // Settings State
    const [weddingDetails, setWeddingDetails] = useState<InvitationData>({
        slug: "",
        bride: "",
        groom: "",
        date: "",
        time: "",
        venue: "",
        location: "",
        message: "",
        mapLink: "",
        heroVideo: "",
        heroImage: "",
        metadataImageUrl: "",
        audioUrl: "",
        giftMessage: "",
        bankAccountName: "",
        bankAccountNumber: "",
        mobileTransferNumber: "",
        giftOptions: [],
        theme: "classic" as unknown as Theme,
        showFormalInvitation: false,
        formalInvitationImage: "",
        preCeremonyMedia: "",
        showHeroDate: true,
        showHouses: false,
        housesData: {},
        showNavigation: false,
        navigationPages: mergeNavigationPages(),
        showRsvp: true,
        rsvpClosedMessage: '',
        multiGuestNameCollectionEnabled: false
    });

    const [isSaving, setIsSaving] = useState(false);
    const [navigationEditorOpen, setNavigationEditorOpen] = useState(false);
    const rsvpClosedMessageRef = useRef<HTMLTextAreaElement>(null);
    const [userSlug, setUserSlug] = useState("");
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const { hasFeature, loading: entitlementsLoading, features } = useEntitlements();

    // Auth & Data Fetch Check
    useEffect(() => {
        const loadDashboardData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            if (session.user.app_metadata?.role !== 'client') {
                router.push('/login'); // Not authorized as client
                return;
            }

            const slug = session.user.app_metadata?.slug || '';
            setUserSlug(slug);
            setAccessToken(session.access_token ?? null);

            if (slug) {
                try {
                    const res = await fetch(`/api/invitation?slug=${slug}`);
                    if (res.ok) {
                        const dbData = (await res.json()) as InvitationData | null;
                        if (dbData) {
                            setWeddingDetails({
                                ...weddingDetails,
                                slug: dbData.slug || slug,
                                bride: dbData.bride || "",
                                groom: dbData.groom || "",
                                date: dbData.date || "",
                                time: dbData.time || "",
                                venue: dbData.venue || "",
                                location: dbData.location || "",
                                receptionTime: dbData.receptionTime || "",
                                receptionVenue: dbData.receptionVenue || "",
                                receptionLocation: dbData.receptionLocation || "",
                                detailsBackgroundUrl: dbData.detailsBackgroundUrl || "",
                                message: dbData.message || "",
                                mapLink: dbData.mapLink || "",
                                heroVideo: dbData.heroVideo || "",
                                heroImage: dbData.heroImage || "",
                                metadataImageUrl: dbData.metadataImageUrl || "",
                                audioUrl: dbData.audioUrl || "",
                                heroLogoUrl: dbData.heroLogoUrl || "",
                                showHeroLogo: dbData.showHeroLogo || false,
                                customSections: dbData.customSections || [],
                                giftMessage: dbData.giftMessage || "",
                                bankAccountName: dbData.bankAccountName || "",
                                bankAccountNumber: dbData.bankAccountNumber || "",
                                mobileTransferNumber: dbData.mobileTransferNumber || "",
                                giftOptions: dbData.giftOptions || [],
                                theme: dbData.theme || undefined,
                                showFormalInvitation: dbData.showFormalInvitation || false,
                                formalInvitationImage: dbData.formalInvitationImage || "",
                                preCeremonyMedia: dbData.preCeremonyMedia || "",
                                showHeroDate: dbData.showHeroDate !== false,
                                showHouses: dbData.showHouses || false,
                                housesData: dbData.housesData || {},
                                showNavigation: dbData.showNavigation || false,
                                navigationPages: mergeNavigationPages(dbData.navigationPages),
                                footnote: dbData.footnote || "",
                                showRsvp: dbData.showRsvp !== false,
                                rsvpClosedMessage: dbData.rsvpClosedMessage ?? "",
                                multiGuestNameCollectionEnabled: dbData.multiGuestNameCollectionEnabled === true,
                                clientLocked: (dbData as any).clientLocked ?? false
                            } as any);
                        }
                    }

                    const rsvpsRes = await fetchWithAuth(`/api/guests?slug=${slug}`);
                    if (rsvpsRes.ok) {
                        const rsvpsData = await rsvpsRes.json();
                        setRsvps(rsvpsData);
                    } else {
                        console.warn('Guest list fetch failed', rsvpsRes.status, await rsvpsRes.text().catch(() => ''));
                    }
                } catch (e) {
                    console.error("Failed to load settings or RSVPs or expenses", e);
                }
            }

            setLoadingAuth(false);
        };
        loadDashboardData();
    }, [router]);

    /** Re-fetch RSVPs after entitlements resolve — avoids an early fetch before auth/session is stable. */
    useEffect(() => {
        if (entitlementsLoading || !userSlug || !features.guests) return;
        let cancelled = false;
        (async () => {
            const rsvpsRes = await fetchWithAuth(`/api/guests?slug=${userSlug}`);
            if (cancelled || !rsvpsRes.ok) return;
            const rsvpsData = await rsvpsRes.json();
            if (!cancelled) setRsvps(rsvpsData);
        })();
        return () => {
            cancelled = true;
        };
    }, [entitlementsLoading, userSlug, features.guests]);

    /** Load budget / seating only after entitlements are known — avoids server actions when features are off. */
    useEffect(() => {
        if (entitlementsLoading || !userSlug) return;
        let cancelled = false;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!features.budget) {
                if (!cancelled) setExpenses([]);
            } else {
                try {
                    const expData = await getExpensesBySlug(userSlug, token);
                    if (!cancelled) setExpenses(expData);
                } catch (e) {
                    console.warn('Budget data not loaded', e);
                    if (!cancelled) setExpenses([]);
                }
            }
            if (!features.seating) {
                if (!cancelled) setSeatingData({ tables: [], guests: [] });
            } else {
                try {
                    const seatData = await getSeatingData(userSlug, token);
                    if (!cancelled) setSeatingData(seatData);
                } catch (e) {
                    console.warn('Seating data not loaded', e);
                    if (!cancelled) setSeatingData({ tables: [], guests: [] });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [entitlementsLoading, userSlug, features.budget, features.seating]);

    useEffect(() => {
        if (entitlementsLoading) return;
        const tabFeature: Partial<Record<DashboardTab, FeatureKey>> = {
            guests: 'guests',
            messages: 'messages',
            budget: 'budget',
            seating: 'seating',
            settings: 'settings'
        };
        const f = tabFeature[activeTab];
        if (f && !hasFeature(f)) {
            setActiveTab('overview');
        }
    }, [entitlementsLoading, activeTab, hasFeature]);

    // Derived State for Summary Cards
    const summaryStats = useMemo(() => {
        const attendingRsvps = rsvps.filter(r => r.status === 'attending');
        const totalGuests = attendingRsvps.reduce((sum, rsvp) => sum + (rsvp.pax || 1), 0);
        const totalInvited = rsvps.reduce((sum, rsvp) => {
            return sum + (rsvp.status !== 'declined' ? Math.max(rsvp.pax || 1, 1) : 0);
        }, 0);

        return {
            totalInvited: totalInvited,
            attending: totalGuests,
            declined: rsvps.filter(r => r.status === 'declined').length,
            pending: rsvps.filter(r => r.status === 'pending').length
        };
    }, [rsvps]);

    // Messages with actual content (regardless of attendance)
    const guestMessages = useMemo(() => {
        return rsvps.filter(rsvp => rsvp.message && rsvp.message.trim() !== "" && rsvp.message !== "-");
    }, [rsvps]);

    // Note: useCustomSections is not consumed here — the dashboard settings tab does not render
    // custom-section editing UI (that lives only in the admin builder). The original dashboard
    // had unused inline handlers for the same reason; removing the destructure keeps lint clean.

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setWeddingDetails((prev: InvitationData) => ({ ...prev, [name]: value }));
    };

    const {
        handleAddGiftOption,
        handleRemoveGiftOption,
        handleGiftOptionChange,
        handleAddCustomField,
        handleRemoveCustomField,
        handleCustomFieldChange
    } = useGiftOptions(setWeddingDetails);

    const navDraft = mergeNavigationPages(weddingDetails.navigationPages);

    const {
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
    } = useNavigationPages(setWeddingDetails);

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userSlug) {
            toast.error("Client slug missing", { description: "Please refresh the page and try again." });
            return;
        }

        if (!weddingDetails.bride.trim() || !weddingDetails.groom.trim()) {
            toast.error("Bride and Groom names are mandatory fields.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetchWithAuth('/api/admin/invitation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...weddingDetails, slug: userSlug })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to update settings');
            }
            toast.success("Settings updated", { description: "Your invitation will refresh shortly." });
        } catch (error: any) {
            toast.error("Failed to save settings", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingAuth) {
        return <div className="min-h-screen w-full flex items-center justify-center bg-stone-50"><p className="text-stone-500 animate-pulse">Loading Dashboard...</p></div>;
    }

    // ── Hotel image upload helpers ────────────────────────────────────────────
    const handleHotelImageUpload = async (idx: number, file: File) => {
        if (!userSlug) return;
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${userSlug}/lodging/hotel-${idx}-${Date.now()}.${ext.replace(/[^a-zA-Z0-9]/g, '')}`;
        const { error } = await supabase.storage.from('assets').upload(path, file, { cacheControl: '3600', upsert: false });
        if (error) { toast.error('Failed to upload hotel image', { description: error.message }); return; }
        const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path);
        updateLodgingHotel(idx, 'imageUrl', publicUrl);
    };

    const handleHotelImageRemove = async (idx: number, currentUrl: string) => {
        if (currentUrl?.includes('/assets/')) {
            const cleanPath = currentUrl.split('/assets/')[1]?.split('?')[0];
            if (cleanPath) await supabase.storage.from('assets').remove([cleanPath]);
        }
        updateLodgingHotel(idx, 'imageUrl', '');
    };

    const handleCopyLink = () => {
        if (typeof window !== 'undefined' && userSlug) {
            const url = `${window.location.origin}/invite/${userSlug}`;
            navigator.clipboard.writeText(url).then(() => {
                toast.success("Invite link copied", { description: url });
            }).catch(err => {
                console.error('Could not copy text: ', err);
            });
        }
    };

    const renderOverview = () => (
        <>
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-serif text-stone-900">Welcome back, {weddingDetails.bride} & {weddingDetails.groom}</h2>
                    <p className="mt-2 text-sm text-stone-500">Here's the latest update on your guest list.</p>
                </div>
                {userSlug && (
                    <button
                        onClick={() => {
                            const url = `${window.location.origin}/invite/${userSlug}`;
                            navigator.clipboard.writeText(url);
                            toast.success("General invitation link copied", { description: url });
                        }}
                        className="flex flex-shrink-0 items-center justify-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-md transition-colors text-sm"
                    >
                        <Copy className="w-4 h-4" /> Copy General Link
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {/* Cards logic is identical to before */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100 flex items-center">
                    <div className="p-3 rounded-full bg-stone-50 mr-4">
                        <Users className="w-6 h-6 text-stone-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-stone-500">Total Invited</p>
                        <p className="text-2xl font-serif text-stone-900 mt-1">{summaryStats.totalInvited}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100 flex items-center">
                    <div className="p-3 rounded-full bg-emerald-50 mr-4">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-stone-500">Attending</p>
                        <p className="text-2xl font-serif text-stone-900 mt-1">{summaryStats.attending}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100 flex items-center">
                    <div className="p-3 rounded-full bg-rose-50 mr-4">
                        <XCircle className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-stone-500">Declined</p>
                        <p className="text-2xl font-serif text-stone-900 mt-1">{summaryStats.declined}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-stone-100 flex items-center">
                    <div className="p-3 rounded-full bg-amber-50 mr-4">
                        <Clock className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-stone-500">Awaiting Reply</p>
                        <p className="text-2xl font-serif text-stone-900 mt-1">{summaryStats.pending}</p>
                    </div>
                </div>
            </div>

            {rsvps.length > 0 && <RsvpAnalytics rsvps={rsvps} />}
        </>
    );

    const renderMessages = () => {
        if (!hasFeature('messages')) {
            return <FeatureLockedMessage label="Messages" />;
        }
        return (
        <>
            <div className="mb-10">
                <h2 className="text-3xl font-serif text-stone-900">Guest Messages</h2>
                <p className="mt-2 text-sm text-stone-500">Read the notes left by your loved ones.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {guestMessages.map((msg) => (
                    <div key={msg.id} className="bg-white rounded-xl shadow-sm border border-stone-100 p-6 flex flex-col justify-between">
                        <p className="text-stone-700 italic leading-relaxed mb-6 font-serif text-lg">"{msg.message}"</p>
                        <div className="flex items-center justify-between pt-4 border-t border-stone-50 mt-auto">
                            <span className="text-sm font-medium text-stone-900">{msg.firstName} {msg.lastName}</span>
                            {getStatusBadge(msg.status)}
                        </div>
                    </div>
                ))}
            </div>
        </>
        );
    };

    const renderBudget = () => {
        if (!hasFeature('budget')) {
            return <FeatureLockedMessage label="Budget" />;
        }
        return <BudgetTracker slug={userSlug} initialExpenses={expenses} accessToken={accessToken} />;
    };

    const renderSeating = () => {
        if (!hasFeature('seating')) {
            return <FeatureLockedMessage label="Seating" />;
        }
        return (
            <TableSeating
                slug={userSlug}
                initialTables={seatingData.tables}
                initialGuests={seatingData.guests}
                accessToken={accessToken}
            />
        );
    };

    const renderSettings = () => {
        if (!hasFeature('settings')) {
            return <FeatureLockedMessage label="Settings" />;
        }
        return (
        <div className="flex h-[calc(100vh-2rem)] rounded-xl overflow-hidden bg-white shadow-sm border border-stone-200">
            <div className="w-full min-w-0 flex-1 overflow-y-auto">
                <form onSubmit={handleSaveSettings} className="p-8 md:p-10 space-y-10">
                    <div className="mb-8">
                        <h2 className="text-3xl font-serif text-stone-900">Live Editor</h2>
                        <p className="mt-2 text-sm text-stone-500">Update your wedding details. Your invitation will refresh instantly.</p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-2 mb-6 flex items-center">
                            <HeartHandshake className="w-4 h-4 mr-2" />
                            The Couple
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Bride Name *</label>
                                <input
                                    required
                                    type="text" name="bride" value={weddingDetails.bride} onChange={handleSettingsChange}
                                    className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Groom Name *</label>
                                <input
                                    required
                                    type="text" name="groom" value={weddingDetails.groom} onChange={handleSettingsChange}
                                    className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-2 mb-6 flex items-center justify-between">
                                The Houses
                                <label className="relative inline-flex items-center cursor-pointer scale-90 origin-right">
                                    <input
                                        type="checkbox"
                                        checked={weddingDetails.showHouses || false}
                                        onChange={(e) => setWeddingDetails(prev => ({ ...prev, showHouses: e.target.checked }))}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                    <span className="ml-3 text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors">Enable</span>
                                </label>
                            </h3>
                            
                            {weddingDetails.showHouses && (
                                <div className="space-y-10">
                                    {/* Bride's House */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-2 border-b border-stone-100 pb-2">The Bride's House</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Top Label (Optional)</label>
                                                <input type="text" value={weddingDetails.housesData?.brideLabel || ''} onChange={(e) => setWeddingDetails(prev => ({ ...prev, housesData: { ...prev.housesData, brideLabel: e.target.value } }))} className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-emerald-500" placeholder="e.g. THE ESTATE OF..." />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Heading Override</label>
                                                <input type="text" value={weddingDetails.housesData?.brideName || ''} onChange={(e) => setWeddingDetails(prev => ({ ...prev, housesData: { ...prev.housesData, brideName: e.target.value } }))} className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-emerald-500" placeholder="Defaults to The Bride's House" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Address</label>
                                            <textarea value={weddingDetails.housesData?.brideAddress || ''} onChange={(e) => setWeddingDetails(prev => ({ ...prev, housesData: { ...prev.housesData, brideAddress: e.target.value } }))} className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 min-h-[60px]" placeholder="128 Willow Creek Road..." />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Arrival Time</label>
                                                <input type="text" value={weddingDetails.housesData?.brideTime || ''} onChange={(e) => setWeddingDetails(prev => ({ ...prev, housesData: { ...prev.housesData, brideTime: e.target.value } }))} className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-emerald-500" placeholder="e.g. 2:30 PM" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Map Link</label>
                                                <input type="text" value={weddingDetails.housesData?.brideMapLink || ''} onChange={(e) => setWeddingDetails(prev => ({ ...prev, housesData: { ...prev.housesData, brideMapLink: e.target.value } }))} className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-emerald-500" placeholder="Google Maps URL" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Groom's House */}
                                    <div className="space-y-4 pt-4 border-t border-stone-100">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-2 border-b border-stone-100 pb-2">The Groom's House</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Top Label (Optional)</label>
                                                <input type="text" value={weddingDetails.housesData?.groomLabel || ''} onChange={(e) => setWeddingDetails(prev => ({ ...prev, housesData: { ...prev.housesData, groomLabel: e.target.value } }))} className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-emerald-500" placeholder="e.g. THE ESTATE OF..." />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Heading Override</label>
                                                <input type="text" value={weddingDetails.housesData?.groomName || ''} onChange={(e) => setWeddingDetails(prev => ({ ...prev, housesData: { ...prev.housesData, groomName: e.target.value } }))} className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-emerald-500" placeholder="Defaults to The Groom's House" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Address</label>
                                            <textarea value={weddingDetails.housesData?.groomAddress || ''} onChange={(e) => setWeddingDetails(prev => ({ ...prev, housesData: { ...prev.housesData, groomAddress: e.target.value } }))} className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 min-h-[60px]" placeholder="42 Pine Crest Ridge..." />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Arrival Time</label>
                                                <input type="text" value={weddingDetails.housesData?.groomTime || ''} onChange={(e) => setWeddingDetails(prev => ({ ...prev, housesData: { ...prev.housesData, groomTime: e.target.value } }))} className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-emerald-500" placeholder="e.g. 6:00 PM" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Map Link</label>
                                                <input type="text" value={weddingDetails.housesData?.groomMapLink || ''} onChange={(e) => setWeddingDetails(prev => ({ ...prev, housesData: { ...prev.housesData, groomMapLink: e.target.value } }))} className="w-full border border-stone-200 rounded-md p-2.5 text-sm focus:ring-2 focus:ring-emerald-500" placeholder="Google Maps URL" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-2 mb-6 flex items-center">
                            <CalendarDays className="w-4 h-4 mr-2" />
                            When & Where
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Date</label>
                                <input
                                    type="date" name="date" value={weddingDetails.date} onChange={handleSettingsChange}
                                    className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Time</label>
                                <input
                                    type="time" name="time" value={weddingDetails.time} onChange={handleSettingsChange}
                                    className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Venue name</label>
                                <p className="text-[11px] text-stone-400 normal-case tracking-normal">
                                    New line for a second line or alternate script (e.g. Arabic under English).
                                </p>
                                <textarea
                                    name="venue"
                                    value={weddingDetails.venue}
                                    onChange={handleSettingsChange}
                                    rows={3}
                                    dir="auto"
                                    className="w-full min-h-[6.5rem] resize-y border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Location Format (City, Country)</label>
                                <input
                                    type="text" name="location" value={weddingDetails.location} onChange={handleSettingsChange}
                                    className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Google Maps Link</label>
                            <input
                                type="text" name="mapLink" value={weddingDetails.mapLink} onChange={handleSettingsChange}
                                className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-2 mb-6 flex items-center">
                            Reception Specifics
                        </h3>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Reception Time</label>
                                    <input
                                        type="time" name="receptionTime" value={weddingDetails.receptionTime || ''} onChange={handleSettingsChange}
                                        className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Reception venue name</label>
                                    <textarea
                                        name="receptionVenue"
                                        value={weddingDetails.receptionVenue || ''}
                                        onChange={handleSettingsChange}
                                        rows={3}
                                        dir="auto"
                                        className="w-full min-h-[6.5rem] resize-y border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Reception Physical Address</label>
                                <input
                                    type="text" name="receptionAddress" value={weddingDetails.receptionAddress || ''} onChange={handleSettingsChange}
                                    className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Reception Google Maps Link</label>
                                <input
                                    type="text" name="receptionLocation" value={weddingDetails.receptionLocation || ''} onChange={handleSettingsChange}
                                    className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-2">
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-stone-400 flex items-center">
                                <MapPin className="w-4 h-4 mr-2" />
                                Welcome Message & Gifts
                            </h3>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => handleAddGiftOption('bank')} className="text-xs uppercase bg-stone-100 text-stone-600 hover:bg-stone-200 px-3 py-1.5 rounded transition-colors tracking-widest">
                                    + Bank
                                </button>
                                <button type="button" onClick={() => handleAddGiftOption('mobile')} className="text-xs uppercase bg-stone-100 text-stone-600 hover:bg-stone-200 px-3 py-1.5 rounded transition-colors tracking-widest">
                                    + Mobile
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Greeting to Guests</label>
                                <textarea
                                    name="message" value={weddingDetails.message} onChange={handleSettingsChange} rows={3}
                                    className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                />
                            </div>

                            <div className="space-y-4 pt-4 border-t border-stone-100">
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Registry & Monetary Gifts Message</label>
                                <textarea name="giftMessage" value={weddingDetails.giftMessage} onChange={handleSettingsChange} rows={2} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none" />

                                <GiftOptionsList
                                    variant="dashboard"
                                    giftOptions={weddingDetails.giftOptions || []}
                                    onRemoveGiftOption={handleRemoveGiftOption}
                                    onGiftOptionChange={handleGiftOptionChange}
                                    onAddCustomField={handleAddCustomField}
                                    onRemoveCustomField={handleRemoveCustomField}
                                    onCustomFieldChange={handleCustomFieldChange}
                                />
                            </div>

                            <div className="space-y-2 pt-6 border-t border-stone-100">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={weddingDetails.showRsvp !== false}
                                        onChange={(e) => setWeddingDetails((prev) => ({ ...prev, showRsvp: e.target.checked }))}
                                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900">Show RSVP form on invitation</span>
                                </label>
                                <p className="text-xs text-stone-500 pl-7">
                                    Turn off if you are not collecting replies on this page (e.g. RSVP by phone or another site).
                                </p>
                                <label className="flex items-center gap-3 cursor-pointer group pt-3">
                                    <input
                                        type="checkbox"
                                        checked={weddingDetails.multiGuestNameCollectionEnabled === true}
                                        onChange={(e) => setWeddingDetails((prev) => ({ ...prev, multiGuestNameCollectionEnabled: e.target.checked }))}
                                        disabled={weddingDetails.showRsvp === false}
                                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                                    />
                                    <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900">Collect individual companion names and pax</span>
                                </label>
                                <p className="text-xs text-stone-500 pl-7">
                                    Disabled by default. Personalized RSVP links can split a party into named guest records without exceeding the original pax.
                                </p>
                                {weddingDetails.showRsvp === false && (
                                    <div className="pl-7 pt-4 space-y-2 max-w-2xl">
                                        <label htmlFor="dashboard-rsvp-closed-message" className="text-xs font-medium text-stone-500 uppercase tracking-wider block">
                                            RSVP message on the invite (no form)
                                        </label>
                                        <textarea
                                            id="dashboard-rsvp-closed-message"
                                            ref={rsvpClosedMessageRef}
                                            name="rsvpClosedMessage"
                                            rows={5}
                                            value={weddingDetails.rsvpClosedMessage || ''}
                                            onChange={handleSettingsChange}
                                            className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y min-h-[7rem]"
                                            placeholder={'e.g. Please RSVP by phone…\nUse **important** for bold.'}
                                        />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const el = rsvpClosedMessageRef.current;
                                                    if (!el) return;
                                                    const cur = weddingDetails.rsvpClosedMessage ?? '';
                                                    const { value, caret } = wrapMarkdownBoldSegment(cur, el.selectionStart, el.selectionEnd);
                                                    setWeddingDetails((p) => ({ ...p, rsvpClosedMessage: value }));
                                                    queueMicrotask(() => {
                                                        el.focus();
                                                        el.setSelectionRange(caret, caret);
                                                    });
                                                }}
                                                className="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors"
                                            >
                                                Bold selection (**)
                                            </button>
                                            <span className="text-[11px] text-stone-500">
                                                Wrap selected text in **double asterisks** for bold on the live invite.
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setNavigationEditorOpen((open) => !open)}
                            className="w-full flex items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-stone-50/90 transition-colors border-b border-stone-100"
                            aria-expanded={navigationEditorOpen}
                        >
                            <div className="min-w-0">
                                <span className="text-sm font-semibold text-stone-800">Multi-page navigation</span>
                                <p className="text-xs text-stone-500 mt-0.5">
                                    Hamburger menu, lodging, exploring, and custom pages
                                </p>
                            </div>
                            <ChevronDown
                                className={`w-5 h-5 text-stone-400 shrink-0 transition-transform duration-200 ${navigationEditorOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                            />
                        </button>
                        {navigationEditorOpen && (
                            <div className="px-4 py-5 space-y-6 bg-stone-50/40">
                                <div className="space-y-4">
                        <label className="flex items-center space-x-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={weddingDetails.showNavigation}
                                    onChange={(e) => setWeddingDetails((prev) => ({ ...prev, showNavigation: e.target.checked }))}
                                    className="sr-only"
                                />
                                <div
                                    className={`flex h-6 w-10 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${weddingDetails.showNavigation ? 'bg-emerald-500 justify-end' : 'bg-stone-200 justify-start'}`}
                                    aria-hidden
                                >
                                    <div className="h-4 w-4 rounded-full bg-white shadow-sm" />
                                </div>
                            </div>
                            <span className="text-sm font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
                                Enable multi-page navigation (hamburger menu)
                            </span>
                        </label>
                        <p className="text-xs text-stone-500 pl-14 max-w-xl">
                            The menu appears only when at least one page below is enabled. Existing live invitations keep Lodging and Exploring on until you change these toggles.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-14 max-w-xl">
                            {(
                                [
                                    ['lodgingEnabled', 'Lodging page', navDraft.lodgingEnabled],
                                    ['exploringEnabled', 'Exploring page', navDraft.exploringEnabled]
                                ] as const
                            ).map(([key, label, checked]) => (
                                <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-stone-700">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) =>
                                            updateNavigationPages({ [key]: e.target.checked } as Partial<NavigationPagesContent>)
                                        }
                                        className="rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-stone-500 pl-14 max-w-xl">
                            Add custom pages (e.g. Cars, Stays, Food) below — each gets its own menu item when navigation is on.
                        </p>
                                </div>

                                <div className="pt-6 border-t border-stone-200 space-y-8">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                            Multi-page content
                        </p>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Menu labels</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Main</label>
                                    <input type="text" value={navDraft.mainNavLabel} onChange={(e) => updateNavigationPages({ mainNavLabel: e.target.value })} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Lodging</label>
                                    <input type="text" value={navDraft.lodgingNavLabel} onChange={(e) => updateNavigationPages({ lodgingNavLabel: e.target.value })} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Exploring</label>
                                    <input type="text" value={navDraft.exploringNavLabel} onChange={(e) => updateNavigationPages({ exploringNavLabel: e.target.value })} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Lodging page</h3>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Heading</label>
                                <input type="text" value={navDraft.lodgingTitle} onChange={(e) => updateNavigationPages({ lodgingTitle: e.target.value })} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Introduction</label>
                                <textarea value={navDraft.lodgingIntro} onChange={(e) => updateNavigationPages({ lodgingIntro: e.target.value })} rows={3} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-y min-h-[4.5rem]" />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Hotels</span>
                                <button
                                    type="button"
                                    onClick={addLodgingHotel}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-stone-700 hover:bg-stone-50"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add hotel
                                </button>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                {navDraft.lodgingHotels.map((hotel, idx) => (
                                    <div key={idx} className="rounded-lg border border-stone-200 p-4 space-y-2 bg-white/60">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Hotel {idx + 1}</p>
                                            <button
                                                type="button"
                                                onClick={() => removeLodgingHotel(idx)}
                                                disabled={navDraft.lodgingHotels.length <= 1}
                                                className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30"
                                                title={navDraft.lodgingHotels.length <= 1 ? 'At least one hotel required' : 'Remove hotel'}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {/* Hotel cover photo */}
                                        {hotel.imageUrl ? (
                                            <div className="relative rounded-md overflow-hidden">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={hotel.imageUrl} alt="Hotel cover" className="w-full h-28 object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => void handleHotelImageRemove(idx, hotel.imageUrl!)}
                                                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 hover:bg-rose-600/90 text-white flex items-center justify-center transition-colors"
                                                    title="Remove photo"
                                                >
                                                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-stone-200 rounded-md text-xs font-semibold uppercase tracking-widest text-stone-400 hover:border-emerald-400 hover:text-emerald-500 transition-colors">
                                                <ImagePlus className="w-4 h-4" />
                                                Add photo
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={e => {
                                                        const f = e.target.files?.[0];
                                                        if (f) void handleHotelImageUpload(idx, f);
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                        )}
                                        <input type="text" placeholder="Title" value={hotel.title} onChange={(e) => updateLodgingHotel(idx, 'title', e.target.value)} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <input type="text" placeholder="Subtitle" value={hotel.subtitle} onChange={(e) => updateLodgingHotel(idx, 'subtitle', e.target.value)} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <div className="space-y-1.5">
                                            <textarea id={`dash-lodging-hotel-desc-${idx}`} placeholder="Description" value={hotel.description} onChange={(e) => updateLodgingHotel(idx, 'description', e.target.value)} rows={3} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none resize-y" />
                                            <div className="flex items-center gap-2">
                                                {([['**', 'B', 'font-bold', 'Bold selection'], ['~~', 'I', 'italic', 'Italic selection'], ['__', 'U', 'underline', 'Underline selection']] as const).map(([marker, glyph, glyphClass, title]) => (
                                                    <button
                                                        key={marker}
                                                        type="button"
                                                        title={title}
                                                        onClick={() => {
                                                            const el = document.getElementById(`dash-lodging-hotel-desc-${idx}`) as HTMLTextAreaElement | null;
                                                            if (!el) return;
                                                            const { value, caret } = wrapMarkdownSegment(el.value, el.selectionStart, el.selectionEnd, marker);
                                                            updateLodgingHotel(idx, 'description', value);
                                                            queueMicrotask(() => {
                                                                el.focus();
                                                                el.setSelectionRange(caret, caret);
                                                            });
                                                        }}
                                                        className={`text-xs ${glyphClass} px-2.5 py-1 rounded-md border border-stone-200 text-stone-600 hover:bg-stone-100 transition-colors`}
                                                    >
                                                        {glyph}
                                                    </button>
                                                ))}
                                                <span className="text-[10px] text-stone-400">Select text, then Bold / Italic / Underline.</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input type="text" placeholder="Link label" value={hotel.linkText} onChange={(e) => updateLodgingHotel(idx, 'linkText', e.target.value)} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                            <input type="text" placeholder="URL" value={hotel.linkUrl} onChange={(e) => updateLodgingHotel(idx, 'linkUrl', e.target.value)} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Exploring page</h3>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Heading</label>
                                <input type="text" value={navDraft.exploringTitle} onChange={(e) => updateNavigationPages({ exploringTitle: e.target.value })} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase text-stone-400 tracking-widest">Introduction</label>
                                <textarea value={navDraft.exploringIntro} onChange={(e) => updateNavigationPages({ exploringIntro: e.target.value })} rows={3} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-y min-h-[4.5rem]" />
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Spots</span>
                                <button
                                    type="button"
                                    onClick={addExploringSpot}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-stone-700 hover:bg-stone-50"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add spot
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {navDraft.exploringSpots.map((spot, idx) => (
                                    <div key={idx} className="rounded-lg border border-stone-200 p-4 space-y-2 bg-white/60">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Spot {idx + 1}</p>
                                            <button
                                                type="button"
                                                onClick={() => removeExploringSpot(idx)}
                                                disabled={navDraft.exploringSpots.length <= 1}
                                                className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30"
                                                title={navDraft.exploringSpots.length <= 1 ? 'At least one spot required' : 'Remove spot'}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <input type="text" placeholder="Title" value={spot.title} onChange={(e) => updateExploringSpot(idx, 'title', e.target.value)} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <input type="text" placeholder="Category" value={spot.category} onChange={(e) => updateExploringSpot(idx, 'category', e.target.value)} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <textarea placeholder="Description" value={spot.description} onChange={(e) => updateExploringSpot(idx, 'description', e.target.value)} rows={2} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none resize-y" />
                                        <input type="text" placeholder="Image URL" value={spot.imageUrl} onChange={(e) => updateExploringSpot(idx, 'imageUrl', e.target.value)} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 pt-2 border-t border-stone-100">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                                    Custom pages (menu + full page each)
                                </h3>
                                <button
                                    type="button"
                                    onClick={addDynamicPage}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-stone-700 hover:bg-stone-50"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add page
                                </button>
                            </div>
                            <div className="space-y-6">
                                {navDraft.dynamicNavPages.map((page) => (
                                    <div key={page.id} className="rounded-lg border border-stone-200 p-4 space-y-3 bg-white/60">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Custom page</p>
                                            <button
                                                type="button"
                                                onClick={() => removeDynamicPage(page.id)}
                                                className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                                                title="Remove page"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Menu label (e.g. Cars, Stays)"
                                            value={page.navLabel}
                                            onChange={(e) => updateDynamicPage(page.id, { navLabel: e.target.value })}
                                            className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Page title (heading)"
                                            value={page.title}
                                            onChange={(e) => updateDynamicPage(page.id, { title: e.target.value })}
                                            className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                        <textarea
                                            placeholder="Introduction"
                                            value={page.introduction}
                                            onChange={(e) => updateDynamicPage(page.id, { introduction: e.target.value })}
                                            rows={3}
                                            className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Date (optional)"
                                            value={page.date}
                                            onChange={(e) => updateDynamicPage(page.id, { date: e.target.value })}
                                            className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                        {userSlug ? (
                                            <InvitationBlogEditor
                                                slug={userSlug}
                                                instanceKey={page.id}
                                                content={page.body}
                                                onChange={(body) => updateDynamicPageBody(page.id, body)}
                                            />
                                        ) : (
                                            <p className="text-xs text-stone-500">Save your profile first to upload images.</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-2 mb-6 flex items-center">
                            Footnote
                        </h3>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Footer Message</label>
                            <textarea
                                name="footnote"
                                value={weddingDetails.footnote || ''}
                                onChange={handleSettingsChange}
                                rows={3}
                                placeholder={'e.g. Don\'t forget to check the section\n\n[THE HOUSES](nav:page:YOUR_PAGE_ID)'}
                                className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                            />
                            <p className="text-xs text-stone-400">
                                Shown centered below the RSVP card. Intro line (small caps) plus optional button: use{' '}
                                <code className="bg-stone-100 px-1 py-0.5 rounded text-[0.65rem]">[label](nav:lodging)</code>,{' '}
                                <code className="bg-stone-100 px-1 py-0.5 rounded text-[0.65rem]">nav:exploring</code>,{' '}
                                <code className="bg-stone-100 px-1 py-0.5 rounded text-[0.65rem]">nav:main</code>, or{' '}
                                <code className="bg-stone-100 px-1 py-0.5 rounded text-[0.65rem]">nav:page:…</code>
                                for in-app pages; use a normal URL for an external link button.
                            </p>
                        </div>
                    </div>

                    <div className="pt-8 flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-stone-900 hover:bg-stone-800 text-white font-medium py-4 px-10 rounded-md shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-stone-900 focus:ring-offset-2 flex items-center text-sm uppercase tracking-widest disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
            {/* Right column: fixed ~phone+chrome width so the editor gets the rest */}
            <div className="hidden lg:block lg:flex-[0_0_26rem] xl:flex-[0_0_28rem] min-w-0 bg-stone-100 relative overflow-hidden h-full rounded-r-xl border-l border-stone-200">
                <div className="absolute top-0 inset-x-0 h-10 bg-white/80 backdrop-blur-sm shadow-sm z-50 flex items-center justify-between px-4 border-b border-stone-200">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                    </div>
                    <div className="text-[10px] font-mono text-stone-400 bg-stone-100 px-3 py-1 rounded">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{userSlug || 'slug'}
                    </div>
                </div>
                <div className="h-full w-full overflow-y-auto pt-10 pointer-events-auto">
                    <div className="flex justify-center items-start px-4 pb-10">
                        <div className="w-full min-w-0 max-w-[390px] shrink-0 overflow-hidden rounded-[2rem] border border-stone-300/70 bg-stone-200/40 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.28)] ring-1 ring-black/5">
                            <InvitationPreview data={weddingDetails} isPreview />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        );
    };

    return (
        <div className="h-screen overflow-hidden bg-stone-50 flex font-sans text-stone-800 selection:bg-stone-200 selection:text-stone-900">

            {/* Sidebar Navigation */}
            <aside className="w-52 h-screen shrink-0 bg-white border-r border-stone-200 hidden md:flex flex-col">
                <div className="p-4 border-b border-stone-100">
                    <h1 className="text-lg font-serif text-stone-900 tracking-wide leading-snug break-words">{weddingDetails.bride[0]} & {weddingDetails.groom[0]}</h1>
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">Guest Portal</p>
                </div>

                {!Boolean((weddingDetails as any).clientLocked) && (
                <nav className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'overview' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <LayoutDashboard className={`w-5 h-5 mr-2 shrink-0 transition-colors ${activeTab === 'overview' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Overview
                    </button>
                    {hasFeature('guests') && (
                    <button
                        onClick={() => setActiveTab('guests')}
                        className={`w-full flex items-center px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'guests' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Users className={`w-5 h-5 mr-2 shrink-0 transition-colors ${activeTab === 'guests' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Guests
                    </button>
                    )}
                    {hasFeature('messages') && (
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`w-full flex items-center gap-1 px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'messages' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Mail className={`w-5 h-5 mr-1 shrink-0 transition-colors ${activeTab === 'messages' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        <span className="truncate min-w-0">Messages</span>
                        <span className="ml-auto shrink-0 bg-stone-200 text-stone-600 py-0.5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums">{guestMessages.length}</span>
                    </button>
                    )}
                    {hasFeature('budget') && (
                    <button
                        onClick={() => setActiveTab('budget')}
                        className={`w-full flex items-center px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'budget' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Calculator className={`w-5 h-5 mr-2 shrink-0 transition-colors ${activeTab === 'budget' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Budget
                    </button>
                    )}
                    {hasFeature('seating') && (
                    <button
                        onClick={() => setActiveTab('seating')}
                        className={`w-full flex items-center px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'seating' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Armchair className={`w-5 h-5 mr-2 shrink-0 transition-colors ${activeTab === 'seating' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Seating
                    </button>
                    )}
                    {hasFeature('settings') && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'settings' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Settings className={`w-5 h-5 mr-2 shrink-0 transition-colors ${activeTab === 'settings' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Settings
                    </button>
                    )}
                </nav>
                )}

                <div className="shrink-0 p-2.5 border-t border-stone-100">
                    <button onClick={handleSignOut} className="flex items-center w-full px-2.5 py-2.5 text-sm font-medium text-stone-500 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 group">
                        <LogOut className="w-5 h-5 mr-2 shrink-0 text-stone-400 group-hover:text-rose-500 transition-colors" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Nav Header */}
            <div className="md:hidden fixed top-0 inset-x-0 bg-white border-b border-stone-200 z-50 px-4 py-3 flex items-center justify-between">
                <button onClick={() => setMobileNavOpen(true)} className="p-1 -ml-1 text-stone-700" aria-label="Open navigation">
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-serif text-stone-900">{weddingDetails.bride[0]} & {weddingDetails.groom[0]}</h1>
                <span className="w-8" />
            </div>

            {/* Mobile Nav Drawer */}
            {mobileNavOpen && (
                <div className="md:hidden fixed inset-0 z-[60] flex">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
                    <aside className="relative flex flex-col h-full bg-white w-64 max-w-[80%] shadow-2xl z-10">
                        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                            <div>
                                <h1 className="text-lg font-serif text-stone-900 tracking-wide leading-snug break-words">{weddingDetails.bride[0]} & {weddingDetails.groom[0]}</h1>
                                <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">Guest Portal</p>
                            </div>
                            <button onClick={() => setMobileNavOpen(false)} className="text-stone-400 hover:text-stone-700 transition-colors shrink-0" aria-label="Close navigation">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {!Boolean((weddingDetails as any).clientLocked) && (
                        <nav className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1">
                            <button
                                onClick={() => goToTab('overview')}
                                className={`w-full flex items-center px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'overview' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                            >
                                <LayoutDashboard className={`w-5 h-5 mr-2 shrink-0 transition-colors ${activeTab === 'overview' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                                Overview
                            </button>
                            {hasFeature('guests') && (
                            <button
                                onClick={() => goToTab('guests')}
                                className={`w-full flex items-center px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'guests' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                            >
                                <Users className={`w-5 h-5 mr-2 shrink-0 transition-colors ${activeTab === 'guests' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                                Guests
                            </button>
                            )}
                            {hasFeature('messages') && (
                            <button
                                onClick={() => goToTab('messages')}
                                className={`w-full flex items-center gap-1 px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'messages' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                            >
                                <Mail className={`w-5 h-5 mr-1 shrink-0 transition-colors ${activeTab === 'messages' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                                <span className="truncate min-w-0">Messages</span>
                                <span className="ml-auto shrink-0 bg-stone-200 text-stone-600 py-0.5 px-1.5 rounded-full text-[10px] font-semibold tabular-nums">{guestMessages.length}</span>
                            </button>
                            )}
                            {hasFeature('budget') && (
                            <button
                                onClick={() => goToTab('budget')}
                                className={`w-full flex items-center px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'budget' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                            >
                                <Calculator className={`w-5 h-5 mr-2 shrink-0 transition-colors ${activeTab === 'budget' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                                Budget
                            </button>
                            )}
                            {hasFeature('seating') && (
                            <button
                                onClick={() => goToTab('seating')}
                                className={`w-full flex items-center px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'seating' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                            >
                                <Armchair className={`w-5 h-5 mr-2 shrink-0 transition-colors ${activeTab === 'seating' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                                Seating
                            </button>
                            )}
                            {hasFeature('settings') && (
                            <button
                                onClick={() => goToTab('settings')}
                                className={`w-full flex items-center px-2.5 py-2.5 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'settings' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                            >
                                <Settings className={`w-5 h-5 mr-2 shrink-0 transition-colors ${activeTab === 'settings' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                                Settings
                            </button>
                            )}
                        </nav>
                        )}

                        <div className="shrink-0 p-2.5 border-t border-stone-100 mt-auto">
                            <button onClick={handleSignOut} className="flex items-center w-full px-2.5 py-2.5 text-sm font-medium text-stone-500 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 group">
                                <LogOut className="w-5 h-5 mr-2 shrink-0 text-stone-400 group-hover:text-rose-500 transition-colors" />
                                Sign Out
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* Main Content Area */}
            <main className="h-full flex-1 min-w-0 overflow-x-hidden overflow-y-auto bg-stone-50/50 pt-16 md:pt-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    {Boolean((weddingDetails as any).clientLocked) ? (
                        <DashboardLockedScreen bride={weddingDetails.bride} groom={weddingDetails.groom} />
                    ) : (
                        <>
                            {activeTab === 'overview' && renderOverview()}
                            {activeTab === 'guests' && <GuestsTab userSlug={userSlug} rsvps={rsvps} setRsvps={setRsvps} />}
                            {activeTab === 'messages' && renderMessages()}
                            {activeTab === 'budget' && renderBudget()}
                            {activeTab === 'seating' && renderSeating()}
                            {activeTab === 'settings' && renderSettings()}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
