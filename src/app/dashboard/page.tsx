"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Filter,
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
    Edit2,
    Trash2,
    Lock
} from 'lucide-react';
import InvitationPreview, {
    EMPTY_EXPLORING_SPOT,
    EMPTY_LODGING_HOTEL,
    InvitationData,
    Theme,
    mergeNavigationPages,
    NavigationExploringSpot,
    NavigationLodgingHotel,
    NavigationPagesContent
} from '@/components/InvitationPreview';
import BudgetTracker from '@/components/BudgetTracker';
import TableSeating from '@/components/TableSeating';
import { getExpensesBySlug } from '@/app/actions/budget';
import { getSeatingData } from '@/app/actions/seating';
import type { SelectSeatingTable, SelectGuest } from '@/app/actions/seating';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { useEntitlements } from '@/components/entitlements/EntitlementsContext';
import type { FeatureKey } from '@/lib/features';
type RsvpStatus = 'all' | 'attending' | 'declined' | 'pending';
type DashboardTab = 'overview' | 'guests' | 'messages' | 'budget' | 'seating' | 'settings';

function FeatureLockedMessage({ label }: { label: string }) {
    return (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-12 text-center max-w-lg mx-auto">
            <Lock className="w-10 h-10 mx-auto text-stone-400 mb-4" />
            <p className="text-stone-800 font-medium">{label} is not enabled for your account.</p>
            <p className="text-sm text-stone-500 mt-2">Contact your administrator if you need access.</p>
        </div>
    );
}

export default function DashboardPage() {
    const router = useRouter();
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');



    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Overview State
    const [rsvps, setRsvps] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [seatingData, setSeatingData] = useState<{ tables: SelectSeatingTable[]; guests: SelectGuest[] }>({ tables: [], guests: [] });
    const [filterStatus, setFilterStatus] = useState<RsvpStatus>('all');
    const [searchQuery, setSearchQuery] = useState('');

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
        navigationPages: mergeNavigationPages()
    });

    const [isSaving, setIsSaving] = useState(false);
    const [userSlug, setUserSlug] = useState("");
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const { hasFeature, loading: entitlementsLoading, features } = useEntitlements();

    // Guests State & Handlers
    const [isAddingGuest, setIsAddingGuest] = useState(false);
    const [newGuestData, setNewGuestData] = useState({ firstName: '', lastName: '', pax: 1 });
    const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
    const [editGuestData, setEditGuestData] = useState<any>({});

    const handleEditGuest = (guest: any) => {
        setEditingGuestId(guest.id);
        setEditGuestData(guest);
    };

    const handleSaveEditGuest = async () => {
        try {
            const res = await fetchWithAuth('/api/guests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editGuestData)
            });
            if (res.ok) {
                const updatedRes = await fetchWithAuth(`/api/guests?slug=${userSlug}`);
                setRsvps(await updatedRes.json());
                setEditingGuestId(null);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to update guest.");
        }
    };

    const handleDeleteGuest = async (id: string) => {
        if (!confirm("Are you sure you want to delete this guest?")) return;
        try {
            const res = await fetchWithAuth(`/api/guests?id=${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const updatedRes = await fetchWithAuth(`/api/guests?slug=${userSlug}`);
                setRsvps(await updatedRes.json());
            }
        } catch (error) {
            console.error(error);
            alert("Failed to delete guest.");
        }
    };

    const handleAddGuest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetchWithAuth('/api/guests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: userSlug, guests: [newGuestData] })
            });
            if (res.ok) {
                const updatedRes = await fetchWithAuth(`/api/guests?slug=${userSlug}`);
                setRsvps(await updatedRes.json());
                setIsAddingGuest(false);
                setNewGuestData({ firstName: '', lastName: '', pax: 1 });
            }
        } catch (error) {
            console.error(error);
            alert("Failed to add guest.");
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            // Parse CSV format expected: firstName,lastName,pax
            const rows = text.split('\n').filter(row => row.trim() !== '');
            const guestsToImport = rows.slice(1).map(row => { // Assuming first row is header
                const cols = row.split(',');
                return {
                    firstName: cols[0]?.trim() || '',
                    lastName: cols[1]?.trim() || '',
                    pax: parseInt(cols[2]?.trim() || '1', 10)
                };
            }).filter(g => g.firstName && g.lastName);

            if (guestsToImport.length > 0) {
                try {
                    const res = await fetchWithAuth('/api/guests', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ slug: userSlug, guests: guestsToImport })
                    });
                    if (res.ok) {
                        const updatedRes = await fetchWithAuth(`/api/guests?slug=${userSlug}`);
                        setRsvps(await updatedRes.json());
                        alert('Guests imported successfully!');
                    }
                } catch (error) {
                    console.error(error);
                    alert("Failed to import CSV.");
                }
            } else {
                alert("No valid guests found in CSV. Please ensure format is: firstName,lastName,pax");
            }
        };
        reader.readAsText(file);
        // reset input
        e.target.value = '';
    };

    const copyGuestLink = (guestId: string) => {
        const origin = window.location.origin;
        navigator.clipboard.writeText(`${origin}/invite/${userSlug}?guest=${guestId}`);
        alert('Personalized link copied to clipboard!');
    };

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
                        const dbData = await res.json();
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
                                navigationPages: mergeNavigationPages((dbData as InvitationData).navigationPages)
                            });
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

    // Filtered Data for Table
    const filteredRsvps = useMemo(() => {
        return rsvps.filter(rsvp => {
            const matchesStatus = filterStatus === 'all' || rsvp.status === filterStatus;
            const matchesSearch = `${rsvp.firstName} ${rsvp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [filterStatus, searchQuery, rsvps]);

    // Messages with actual content (regardless of attendance)
    const guestMessages = useMemo(() => {
        return rsvps.filter(rsvp => rsvp.message && rsvp.message.trim() !== "" && rsvp.message !== "-");
    }, [rsvps]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'attending':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Attending</span>;
            case 'declined':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 border border-rose-200">Declined</span>;
            case 'pending':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800 border border-stone-200">Pending</span>;
            default:
                return null;
        }
    };

    const handleAddSection = () => {
        setWeddingDetails(prev => ({
            ...prev,
            customSections: [
                ...(prev.customSections || []),
                {
                    id: Math.random().toString(36).substring(7),
                    backgroundUrl: '',
                    backgroundType: 'image',
                    showOverlay: true,
                    isFullBleed: false,
                    overlayType: 'text',
                    textContent: '',
                    fontFamily: 'font-serif'
                }
            ]
        }));
    };

    const handleRemoveSection = (index: number) => {
        setWeddingDetails(prev => {
            const arr = [...(prev.customSections || [])];
            arr.splice(index, 1);
            return { ...prev, customSections: arr };
        });
    };

    const handleSectionChange = (index: number, field: string, value: any) => {
        setWeddingDetails(prev => {
            const arr = [...(prev.customSections || [])];
            arr[index] = { ...arr[index], [field]: value };
            return { ...prev, customSections: arr };
        });
    };

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setWeddingDetails((prev: InvitationData) => ({ ...prev, [name]: value }));
    };

    const handleAddGiftOption = (type: 'bank' | 'mobile') => {
        setWeddingDetails(prev => ({
            ...prev,
            giftOptions: [
                ...(prev.giftOptions || []),
                {
                    id: Math.random().toString(36).substring(7),
                    type,
                    bankName: '',
                    accountName: '',
                    accountNumber: '',
                    mobileNumber: '',
                    serviceName: ''
                }
            ]
        }));
    };

    const handleRemoveGiftOption = (index: number) => {
        setWeddingDetails(prev => {
            const arr = [...(prev.giftOptions || [])];
            arr.splice(index, 1);
            return { ...prev, giftOptions: arr };
        });
    };

    const handleGiftOptionChange = (index: number, field: string, value: string) => {
        setWeddingDetails(prev => {
            const arr = [...(prev.giftOptions || [])];
            arr[index] = { ...arr[index], [field]: value };
            return { ...prev, giftOptions: arr };
        });
    };

    const navDraft = mergeNavigationPages(weddingDetails.navigationPages);

    const updateNavigationPages = (patch: Partial<NavigationPagesContent>) => {
        setWeddingDetails((prev) => ({
            ...prev,
            navigationPages: { ...mergeNavigationPages(prev.navigationPages), ...patch }
        }));
    };

    const updateLodgingHotel = (index: number, field: keyof NavigationLodgingHotel, value: string) => {
        setWeddingDetails((prev) => {
            const base = mergeNavigationPages(prev.navigationPages);
            const lodgingHotels = base.lodgingHotels.map((h, i) => (i === index ? { ...h, [field]: value } : h));
            return { ...prev, navigationPages: { ...base, lodgingHotels } };
        });
    };

    const updateExploringSpot = (index: number, field: keyof NavigationExploringSpot, value: string) => {
        setWeddingDetails((prev) => {
            const base = mergeNavigationPages(prev.navigationPages);
            const exploringSpots = base.exploringSpots.map((s, i) => (i === index ? { ...s, [field]: value } : s));
            return { ...prev, navigationPages: { ...base, exploringSpots } };
        });
    };

    const addLodgingHotel = () => {
        setWeddingDetails((prev) => {
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

    const removeLodgingHotel = (index: number) => {
        setWeddingDetails((prev) => {
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
        setWeddingDetails((prev) => {
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
        setWeddingDetails((prev) => {
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

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userSlug) {
            alert("Error: Client slug missing.");
            return;
        }

        if (!weddingDetails.bride.trim() || !weddingDetails.groom.trim()) {
            alert("Bride and Groom names are mandatory fields.");
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
            alert("Settings updated successfully!");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingAuth) {
        return <div className="min-h-screen w-full flex items-center justify-center bg-stone-50"><p className="text-stone-500 animate-pulse">Loading Dashboard...</p></div>;
    }

    const handleCopyLink = () => {
        if (typeof window !== 'undefined' && userSlug) {
            const url = `${window.location.origin}/invite/${userSlug}`;
            navigator.clipboard.writeText(url).then(() => {
                alert('Invite link copied to clipboard!');
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
                            alert("General Invitation Link copied!");
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


        </>
    );

    const renderGuests = () => {
        if (!hasFeature('guests')) {
            return <FeatureLockedMessage label="Guests" />;
        }
        return (
        <>
            <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-serif text-stone-900">Guest Management</h2>
                    <p className="mt-2 text-sm text-stone-500">Add guests manually or import from a CSV to generate secure personalized RSVP links.</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="cursor-pointer bg-stone-100 text-stone-600 hover:bg-stone-200 uppercase tracking-widest text-xs font-semibold py-2.5 px-4 rounded-md transition-colors flex items-center">
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                        Import CSV
                    </label>
                    <button onClick={() => setIsAddingGuest(!isAddingGuest)} className="bg-stone-900 text-white hover:bg-stone-800 uppercase tracking-widest text-xs font-semibold py-2.5 px-4 rounded-md transition-colors flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Guest
                    </button>
                </div>
            </div>

            {isAddingGuest && (
                <div className="mb-6 bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
                    <div className="w-full sm:w-1/3 space-y-2">
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">First Name</label>
                        <input type="text" value={newGuestData.firstName} onChange={e => setNewGuestData({ ...newGuestData, firstName: e.target.value })} className="w-full border border-stone-200 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-stone-500 outline-none" placeholder="John" />
                    </div>
                    <div className="w-full sm:w-1/3 space-y-2">
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Last Name</label>
                        <input type="text" value={newGuestData.lastName} onChange={e => setNewGuestData({ ...newGuestData, lastName: e.target.value })} className="w-full border border-stone-200 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-stone-500 outline-none" placeholder="Doe" />
                    </div>
                    <div className="w-full sm:w-1/4 space-y-2">
                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Pax (Guests)</label>
                        <input type="number" min="1" value={newGuestData.pax} onChange={e => setNewGuestData({ ...newGuestData, pax: parseInt(e.target.value) || 1 })} className="w-full border border-stone-200 p-2.5 rounded-md text-sm focus:ring-2 focus:ring-stone-500 outline-none" />
                    </div>
                    <button onClick={handleAddGuest} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-md transition-colors text-sm">Save</button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="text-lg font-serif text-stone-900">Guest List</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-stone-400" />
                            </div>
                            <input type="text" placeholder="Search guests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-stone-200 rounded-lg text-sm placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 bg-stone-50/50" />
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-stone-400" />
                            </div>
                            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as RsvpStatus)} className="block w-full pl-10 pr-10 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 bg-white focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 appearance-none cursor-pointer">
                                <option value="all">All Guests</option>
                                <option value="attending">Attending</option>
                                <option value="declined">Declined</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-stone-50/50 border-b border-stone-100">
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Guest Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-center">Party Size</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Message</th>
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Link</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {filteredRsvps.length > 0 ? (
                                filteredRsvps.map((rsvp) => (
                                    editingGuestId === rsvp.id ? (
                                        <tr key={rsvp.id} className="bg-stone-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    <input type="text" value={editGuestData.firstName || ""} onChange={e => setEditGuestData({...editGuestData, firstName: e.target.value})} className="w-full border border-stone-200 p-1.5 rounded text-sm outline-none" placeholder="First" />
                                                    <input type="text" value={editGuestData.lastName || ""} onChange={e => setEditGuestData({...editGuestData, lastName: e.target.value})} className="w-full border border-stone-200 p-1.5 rounded text-sm outline-none" placeholder="Last" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select value={editGuestData.status} onChange={e => setEditGuestData({...editGuestData, status: e.target.value})} className="border border-stone-200 p-1.5 rounded text-sm outline-none">
                                                    <option value="pending">Pending</option>
                                                    <option value="attending">Attending</option>
                                                    <option value="declined">Declined</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <input type="number" min="1" value={editGuestData.pax || 1} onChange={e => setEditGuestData({...editGuestData, pax: parseInt(e.target.value) || 1})} className="w-16 border border-stone-200 p-1.5 rounded text-sm outline-none mx-auto block text-center" />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input type="text" value={editGuestData.message || ""} onChange={e => setEditGuestData({...editGuestData, message: e.target.value})} className="w-full border border-stone-200 p-1.5 rounded text-sm outline-none" placeholder="No message" />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center gap-3 justify-end">
                                                    <button onClick={handleSaveEditGuest} className="text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors">Save</button>
                                                    <button onClick={() => setEditingGuestId(null)} className="text-stone-500 hover:text-stone-700 font-medium text-sm transition-colors">Cancel</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr key={rsvp.id} className="hover:bg-stone-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-stone-900">{rsvp.firstName} {rsvp.lastName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(rsvp.status)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm text-stone-600 font-serif">{rsvp.pax}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-stone-500 truncate max-w-[150px]">{rsvp.message || "-"}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button onClick={() => copyGuestLink(rsvp.id)} className="text-stone-400 hover:text-stone-700 transition-colors" title="Copy Personalized Link">
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleEditGuest(rsvp)} className="text-stone-400 hover:text-stone-700 transition-colors" title="Edit Guest">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteGuest(rsvp.id)} className="text-stone-400 hover:text-rose-600 transition-colors" title="Delete Guest">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-stone-500 text-sm">
                                        No guests found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/30">
                    <p className="text-xs text-stone-500">Showing {filteredRsvps.length} results</p>
                </div>
            </div>
        </>
        );
    };

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
            <div className="w-full lg:w-1/2 overflow-y-auto">
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
                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Venue Name</label>
                                <input
                                    type="text" name="venue" value={weddingDetails.venue} onChange={handleSettingsChange}
                                    className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Reception Venue Name</label>
                                    <input
                                        type="text" name="receptionVenue" value={weddingDetails.receptionVenue || ''} onChange={handleSettingsChange}
                                        className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

                                {(weddingDetails.giftOptions || []).length === 0 && (
                                    <p className="text-sm text-stone-500 italic py-4 text-center">No transfer options added yet.</p>
                                )}

                                <div className="space-y-4">
                                    {(weddingDetails.giftOptions || []).map((option, idx) => (
                                        <div key={option.id} className="p-5 border border-stone-200 rounded-xl relative group bg-stone-50/50">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveGiftOption(idx)}
                                                className="absolute top-4 right-4 text-stone-400 hover:text-red-500 transition-colors"
                                            >
                                                ✕
                                            </button>
                                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">
                                                {option.type === 'bank' ? 'Bank Transfer' : 'Mobile Transfer'}
                                            </h4>
                                            {option.type === 'bank' ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.1em]">Bank Name</label>
                                                        <input type="text" value={option.bankName || ''} onChange={(e) => handleGiftOptionChange(idx, 'bankName', e.target.value)} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Chase Bank" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.1em]">Account Name</label>
                                                        <input type="text" value={option.accountName || ''} onChange={(e) => handleGiftOptionChange(idx, 'accountName', e.target.value)} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. John Doe" />
                                                    </div>
                                                    <div className="space-y-2 md:col-span-2">
                                                        <label className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.1em]">Account Number / IBAN *</label>
                                                        <input type="text" value={option.accountNumber || ''} onChange={(e) => handleGiftOptionChange(idx, 'accountNumber', e.target.value)} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.1em]">Service Name</label>
                                                        <input type="text" value={option.serviceName || ''} onChange={(e) => handleGiftOptionChange(idx, 'serviceName', e.target.value)} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Venmo, Zelle" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.1em]">Mobile Number / Handle *</label>
                                                        <input type="text" value={option.mobileNumber || ''} onChange={(e) => handleGiftOptionChange(idx, 'mobileNumber', e.target.value)} className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="@johndoe or Phone" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-stone-100 mt-8">
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
                                Enable Multi-Page Navigation (Lodging & Exploring)
                            </span>
                        </label>
                    </div>

                    <div className="mt-8 pt-8 border-t border-stone-100 space-y-8">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                            Multi-page copy (lodging & exploring)
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
                                        <input type="text" placeholder="Title" value={hotel.title} onChange={(e) => updateLodgingHotel(idx, 'title', e.target.value)} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <input type="text" placeholder="Subtitle" value={hotel.subtitle} onChange={(e) => updateLodgingHotel(idx, 'subtitle', e.target.value)} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <textarea placeholder="Description" value={hotel.description} onChange={(e) => updateLodgingHotel(idx, 'description', e.target.value)} rows={3} className="w-full border border-stone-200 rounded-md p-2 text-sm text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none resize-y" />
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
            {/* Right Column - Live Preview */}
            <div className="hidden lg:block w-1/2 bg-stone-100 relative overflow-hidden h-full rounded-r-xl border-l border-stone-200">
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
                    <InvitationPreview data={weddingDetails} />
                </div>
            </div>
        </div>
        );
    };

    return (
        <div className="min-h-screen bg-stone-50 flex font-sans text-stone-800 selection:bg-stone-200 selection:text-stone-900">

            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white border-r border-stone-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-stone-100">
                    <h1 className="text-2xl font-serif text-stone-900 tracking-wide">{weddingDetails.bride[0]} & {weddingDetails.groom[0]}</h1>
                    <p className="text-xs text-stone-400 uppercase tracking-widest mt-1">Guest Portal</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'overview' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <LayoutDashboard className={`w-5 h-5 mr-3 transition-colors ${activeTab === 'overview' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Overview
                    </button>
                    {hasFeature('guests') && (
                    <button
                        onClick={() => setActiveTab('guests')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'guests' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Users className={`w-5 h-5 mr-3 transition-colors ${activeTab === 'guests' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Guests
                    </button>
                    )}
                    {hasFeature('messages') && (
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'messages' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Mail className={`w-5 h-5 mr-3 transition-colors ${activeTab === 'messages' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Messages
                        <span className="ml-auto bg-stone-200 text-stone-600 py-0.5 px-2 rounded-full text-xs font-semibold">{guestMessages.length}</span>
                    </button>
                    )}
                    {hasFeature('budget') && (
                    <button
                        onClick={() => setActiveTab('budget')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'budget' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Calculator className={`w-5 h-5 mr-3 transition-colors ${activeTab === 'budget' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Budget
                    </button>
                    )}
                    {hasFeature('seating') && (
                    <button
                        onClick={() => setActiveTab('seating')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'seating' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Armchair className={`w-5 h-5 mr-3 transition-colors ${activeTab === 'seating' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Seating
                    </button>
                    )}
                    {hasFeature('settings') && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'settings' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Settings className={`w-5 h-5 mr-3 transition-colors ${activeTab === 'settings' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Settings
                    </button>
                    )}
                </nav>

                <div className="p-4 border-t border-stone-100">
                    <button onClick={handleSignOut} className="flex items-center w-full px-4 py-3 text-sm font-medium text-stone-500 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 group">
                        <LogOut className="w-5 h-5 mr-3 text-stone-400 group-hover:text-rose-500 transition-colors" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Nav Header */}
            <div className="md:hidden fixed top-0 inset-x-0 bg-white border-b border-stone-200 z-50 px-4 py-3 flex items-center justify-between">
                <h1 className="text-xl font-serif text-stone-900">{weddingDetails.bride[0]} & {weddingDetails.groom[0]}</h1>
                <div className="flex space-x-2">
                    <button onClick={() => setActiveTab('overview')} className={`p-2 rounded-md ${activeTab === 'overview' ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}>
                        <LayoutDashboard className="w-5 h-5" />
                    </button>
                    {hasFeature('guests') && (
                    <button onClick={() => setActiveTab('guests')} className={`p-2 rounded-md ${activeTab === 'guests' ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}>
                        <Users className="w-5 h-5" />
                    </button>
                    )}
                    {hasFeature('messages') && (
                    <button onClick={() => setActiveTab('messages')} className={`p-2 rounded-md ${activeTab === 'messages' ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}>
                        <Mail className="w-5 h-5" />
                    </button>
                    )}
                    {hasFeature('budget') && (
                    <button onClick={() => setActiveTab('budget')} className={`p-2 rounded-md ${activeTab === 'budget' ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}>
                        <Calculator className="w-5 h-5" />
                    </button>
                    )}
                    {hasFeature('seating') && (
                    <button onClick={() => setActiveTab('seating')} className={`p-2 rounded-md ${activeTab === 'seating' ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}>
                        <Armchair className="w-5 h-5" />
                    </button>
                    )}
                    {hasFeature('settings') && (
                    <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-md ${activeTab === 'settings' ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}>
                        <Settings className="w-5 h-5" />
                    </button>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-stone-50/50 pt-16 md:pt-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'guests' && renderGuests()}
                    {activeTab === 'messages' && renderMessages()}
                    {activeTab === 'budget' && renderBudget()}
                    {activeTab === 'seating' && renderSeating()}
                    {activeTab === 'settings' && renderSettings()}
                </div>
            </main>
        </div>
    );
}
