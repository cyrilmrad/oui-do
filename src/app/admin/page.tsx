"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import InvitationPreview, {
    InvitationData,
    Theme,
    mergeNavigationPages,
    NavigationPagesContent
} from '@/components/InvitationPreview';
import { InvitationBlogEditor } from '@/components/blog/InvitationBlogEditor';
import { wrapMarkdownBoldSegment } from '@/lib/rsvpClosedMessageBold';
import { LogOut, Users, Plus, LayoutDashboard, ChevronRight, ChevronDown, Copy, Link, QrCode, Download, Share, Lock, Trash2, Shield, Loader2 } from 'lucide-react';
import BudgetTracker from '@/components/BudgetTracker';
import TableSeating from '@/components/TableSeating';
import ClientEntitlementsPanel from '@/components/admin/ClientEntitlementsPanel';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { getExpensesBySlug, SelectExpense } from '@/app/actions/budget';
import { getSeatingData } from '@/app/actions/seating';
import type { SelectSeatingTable, SelectGuest } from '@/app/actions/seating';
import { useNavigationPages } from '@/hooks/useNavigationPages';
import { useGiftOptions } from '@/hooks/useGiftOptions';
import { useCustomSections } from '@/hooks/useCustomSections';
import { CustomSectionBlock, type CustomSectionFiles } from '@/components/admin/CustomSectionBlock';
import { ClientList } from '@/components/admin/ClientList';
import { NewClientForm } from '@/components/admin/NewClientForm';
import { CoupleSection } from '@/components/admin/builder/CoupleSection';
import { CeremonyDetailsSection } from '@/components/admin/builder/CeremonyDetailsSection';
import { FormalReceptionSection } from '@/components/admin/builder/FormalReceptionSection';
import { FootnoteSection } from '@/components/admin/builder/FootnoteSection';
import { HousesSection } from '@/components/admin/builder/HousesSection';
import { PreCeremonySection } from '@/components/admin/builder/PreCeremonySection';
import { FormalInvitationSection } from '@/components/admin/builder/FormalInvitationSection';
import { HeroSection } from '@/components/admin/builder/HeroSection';
import { GiftOptionsSection } from '@/components/admin/builder/GiftOptionsSection';
import { NavigationEditorSection } from '@/components/admin/builder/NavigationEditorSection';
import { DashboardOverview } from '@/components/admin/DashboardOverview';
import { ScheduleBuilder } from '@/components/admin/ScheduleBuilder';
import { ClientOverview } from '@/components/admin/ClientOverview';
import {
    getAdminDashboardData,
    updateSubscription,
    upsertSubscriptionForInvitation,
    type AdminDashboardData,
    type AdminLedgerRow,
    type SubscriptionPayload
} from '@/app/actions/admin';
import { toast } from 'sonner';

const THEME_PRESETS: Record<string, Theme> = {
    emerald: { primaryText: "text-stone-800", accent: "text-emerald-700", bgAccent: "bg-emerald-700/10", borderAccent: "border-emerald-700", background: "bg-stone-50" },
    slate: { primaryText: "text-slate-900", accent: "text-slate-600", bgAccent: "bg-slate-600/10", borderAccent: "border-slate-600", background: "bg-slate-50" },
    rose: { primaryText: "text-rose-950", accent: "text-rose-600", bgAccent: "bg-rose-600/10", borderAccent: "border-rose-600", background: "bg-rose-50" }
};

const getThemeSelectionFromTheme = (theme?: Theme | null): string => {
    if (!theme) return 'emerald';

    if (
        theme.name === 'custom' ||
        Boolean((theme as any).rawPrimary) ||
        Boolean((theme as any).rawAccent) ||
        Boolean((theme as any).rawBackground)
    ) {
        return 'custom';
    }

    return Object.entries(THEME_PRESETS).find(([, preset]) =>
        preset.primaryText === theme.primaryText &&
        preset.accent === theme.accent &&
        preset.bgAccent === theme.bgAccent &&
        preset.borderAccent === theme.borderAccent &&
        preset.background === theme.background
    )?.[0] || 'emerald';
};

const defaultData: InvitationData = {
    slug: "",
    bride: "",
    groom: "",
    date: "",
    time: "",
    venue: "",
    location: "",
    metadataImageUrl: "",
    message: "We can't wait to celebrate our special day with our favorite people.",
    showHeroLogo: false,
    showFormalInvitation: false,
    formalInvitationImage: "",
    showHouses: false,
    housesData: {},
    customSections: [],
    giftOptions: [],
    theme: THEME_PRESETS.emerald,
    navigationPages: mergeNavigationPages(),
    showRsvp: true,
    rsvpClosedMessage: ''
};

export default function AdminDashboard() {
    const router = useRouter();
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Admin Sidebar State
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [isLoadingClientDetails, setIsLoadingClientDetails] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [newClientForm, setNewClientForm] = useState({ email: '', password: '', slug: '' });
    const [onboardLoading, setOnboardLoading] = useState(false);
    const [onboardMessage, setOnboardMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showSlugDropdown, setShowSlugDropdown] = useState(false);

    // Builder State
    const [liveData, setLiveData] = useState<InvitationData>(defaultData);
    const [themeSelection, setThemeSelection] = useState<string>("emerald");
    const [isSaving, setIsSaving] = useState(false);
    const [navigationEditorOpen, setNavigationEditorOpen] = useState(false);

    // File Upload State
    const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
    const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
    const [metadataImageFile, setMetadataImageFile] = useState<File | null>(null);
    const [metadataImagePreview, setMetadataImagePreview] = useState<string | null>(null);
    const [heroVideoFile, setHeroVideoFile] = useState<File | null>(null);
    const [heroVideoPreview, setHeroVideoPreview] = useState<string | null>(null);
    const [heroLogoFile, setHeroLogoFile] = useState<File | null>(null);
    const [heroLogoPreview, setHeroLogoPreview] = useState<string | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioPreview, setAudioPreview] = useState<string | null>(null);

    const [formalImageFile, setFormalImageFile] = useState<File | null>(null);
    const [formalImagePreview, setFormalImagePreview] = useState<string | null>(null);
    
    const [preCeremonyMediaFile, setPreCeremonyMediaFile] = useState<File | null>(null);
    const [preCeremonyMediaPreview, setPreCeremonyMediaPreview] = useState<string | null>(null);

    const [detailsBgFile, setDetailsBgFile] = useState<File | null>(null);
    const [detailsBgPreview, setDetailsBgPreview] = useState<string | null>(null);
    const rsvpClosedMessageRef = useRef<HTMLTextAreaElement>(null);

    const [customFiles, setCustomFiles] = useState<Record<string, CustomSectionFiles>>({});
    const customFilesRef = useRef(customFiles);
    customFilesRef.current = customFiles;

    /**
     * Storage URLs marked for deletion by the X-buttons on media slots.
     * The actual `supabase.storage.remove(...)` is deferred until the user clicks "Publish Changes"
     * so that storage and DB stay in sync. If the user navigates away without saving, the file
     * remains intact (the previous URL is still in the DB).
     */
    const [pendingMediaDeletions, setPendingMediaDeletions] = useState<Set<string>>(new Set());

    // Cleanup hero / global preview object URLs when those inputs change.
    // Do NOT tie customFiles to this effect: its cleanup was revoking blob URLs still in use after each slideshow append.
    useEffect(() => {
        return () => {
            if (heroImagePreview) URL.revokeObjectURL(heroImagePreview);
            if (metadataImagePreview) URL.revokeObjectURL(metadataImagePreview);
            if (heroVideoPreview) URL.revokeObjectURL(heroVideoPreview);
            if (heroLogoPreview) URL.revokeObjectURL(heroLogoPreview);
            if (audioPreview) URL.revokeObjectURL(audioPreview);
            if (formalImagePreview) URL.revokeObjectURL(formalImagePreview);
            if (preCeremonyMediaPreview) URL.revokeObjectURL(preCeremonyMediaPreview);
            if (detailsBgPreview) URL.revokeObjectURL(detailsBgPreview);
        };
    }, [heroImagePreview, metadataImagePreview, heroVideoPreview, heroLogoPreview, audioPreview, formalImagePreview, preCeremonyMediaPreview, detailsBgPreview]);

    useEffect(() => {
        return () => {
            Object.values(customFilesRef.current).forEach((opts) => {
                if (opts.bgPreview) URL.revokeObjectURL(opts.bgPreview);
                if (opts.overlayPreview) URL.revokeObjectURL(opts.overlayPreview);
                opts.slideshowPreviews?.forEach((u) => URL.revokeObjectURL(u));
            });
        };
    }, []);

    // Reset pending media deletions whenever the loaded client changes. Prevents one client's
    // pending deletions from leaking into another client's save.
    useEffect(() => {
        setPendingMediaDeletions(new Set());
    }, [liveData.slug]);



    const handleCustomFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        sectionId: string,
        type: 'bg' | 'overlay'
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            const isVideo = type === 'bg' && file.type.startsWith('video/');
            setCustomFiles(prev => {
                const currentSection = prev[sectionId] || {};
                const prevPreview = type === 'bg' ? currentSection.bgPreview : currentSection.overlayPreview;
                if (prevPreview) URL.revokeObjectURL(prevPreview);

                return {
                    ...prev,
                    [sectionId]: {
                        ...currentSection,
                        [type === 'bg' ? 'bgFile' : 'overlayFile']: file,
                        [type === 'bg' ? 'bgPreview' : 'overlayPreview']: URL.createObjectURL(file)
                    }
                };
            });

            if (isVideo) {
                setLiveData(prev => {
                    const sections = (prev.customSections || []).map(s => 
                        s.id === sectionId ? { ...s, backgroundType: 'video' as const } : s
                    );
                    return { ...prev, customSections: sections };
                });
            } else if (type === 'bg') {
                setLiveData(prev => {
                    const sections = (prev.customSections || []).map(s => 
                        s.id === sectionId ? { ...s, backgroundType: 'image' as const } : s
                    );
                    return { ...prev, customSections: sections };
                });
            }
        }
    };

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        setFile: React.Dispatch<React.SetStateAction<File | null>>,
        setPreview: React.Dispatch<React.SetStateAction<string | null>>,
        prevPreview: string | null
    ) => {
        const file = e.target.files?.[0];
        if (file) {
            if (prevPreview) URL.revokeObjectURL(prevPreview);
            setFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    /**
     * Dismiss a media slot — deferred deletion model:
     *   1. Revokes the local blob preview URL (if any)
     *   2. Clears the File and preview state
     *   3. Clears the URL field on `liveData`
     *   4. Marks the previously-saved URL for deletion on next successful Save
     *
     * Storage is NOT touched here. The mark + delete-on-save flow keeps storage and DB in sync:
     * if the user navigates away without saving, the original file stays intact.
     */
    const removeMedia = (
        urlField: 'heroImage' | 'heroVideo' | 'metadataImageUrl' | 'heroLogoUrl' | 'audioUrl' | 'formalInvitationImage' | 'detailsBackgroundUrl' | 'preCeremonyMedia',
        currentUrl: string | null | undefined,
        setFile: React.Dispatch<React.SetStateAction<File | null>>,
        setPreview: React.Dispatch<React.SetStateAction<string | null>>,
        prevPreview: string | null
    ) => {
        if (prevPreview) URL.revokeObjectURL(prevPreview);
        setFile(null);
        setPreview(null);
        setLiveData(prev => ({ ...prev, [urlField]: '' }));

        if (currentUrl && currentUrl.includes('/assets/')) {
            setPendingMediaDeletions(prev => {
                const next = new Set(prev);
                next.add(currentUrl);
                return next;
            });
        }
    };

    /**
     * Remove a custom section's background or overlay media. Same deferred-deletion model
     * as `removeMedia`; updates the nested customSections[idx].{backgroundUrl,overlayImageUrl}.
     * Slideshow slides are NOT handled here — they have their own per-slide remove flow.
     */
    const removeCustomSectionMedia = (sectionIdx: number, type: 'bg' | 'overlay') => {
        const section = liveData.customSections?.[sectionIdx];
        if (!section) return;
        const sectionId = section.id;
        const urlField = type === 'bg' ? 'backgroundUrl' : 'overlayImageUrl';
        const currentUrl = type === 'bg' ? section.backgroundUrl : section.overlayImageUrl;

        setCustomFiles(prev => {
            const cur = prev[sectionId];
            if (!cur) return prev;
            const next: CustomSectionFiles = { ...cur };
            if (type === 'bg') {
                if (next.bgPreview) URL.revokeObjectURL(next.bgPreview);
                delete next.bgFile;
                delete next.bgPreview;
            } else {
                if (next.overlayPreview) URL.revokeObjectURL(next.overlayPreview);
                delete next.overlayFile;
                delete next.overlayPreview;
            }
            if (!next.bgFile && !next.bgPreview && !next.overlayFile && !next.overlayPreview && !next.slideshowFiles?.length && !next.slideshowPreviews?.length) {
                const { [sectionId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [sectionId]: next };
        });

        setLiveData(prev => {
            const sections = (prev.customSections || []).map((s, i) =>
                i === sectionIdx ? { ...s, [urlField]: '' } : s
            );
            return { ...prev, customSections: sections };
        });

        if (currentUrl && currentUrl.includes('/assets/')) {
            setPendingMediaDeletions(prev => {
                const next = new Set(prev);
                next.add(currentUrl);
                return next;
            });
        }
    };

    // Budget State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'clients-list' | 'builder' | 'budget' | 'seating' | 'entitlements' | 'schedule' | 'client-overview'>('dashboard');
    /** True when the selected client already has an invitation row in the DB. */
    const [hasInvitation, setHasInvitation] = useState(true);
    const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [expenses, setExpenses] = useState<SelectExpense[]>([]);

    // Seating State
    const [seatingTables, setSeatingTables] = useState<SelectSeatingTable[]>([]);
    const [seatingGuests, setSeatingGuests] = useState<SelectGuest[]>([]);

    // Static Mock Clients for Sidebar Visualization
    const mockClients = [
        { id: 1, slug: "nadine-and-tariq", bride: "Nadine", groom: "Tariq", email: "nadine@example.com", date: "September 24, 2024", heroImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuDbAOBko1Dk8GDsphjtoBUbSpSbGbSyk3Mwmg2T4hbZPqMFrOEstIqckxRqYWcb6dU0d0FoL6ijszAJPAcGoqhAEpxJTPBadj9kR3W09eSmyv7iDeLYnnp_qXsF-eLJYGCf4PyJp66ekx6IDu0s5lFx0BARQX_TUKmxv_Rrc37LVZbydUq6WC2K_UgUMZVBqjU-YbqFyuuazqam4T0P_3Me-SPt_JiZIAkXCLTjDQ7LWoS-tYfowUcc_Pb9nNEg6ESmxj62v4b5sr1k" },
        { id: 2, slug: "sarah-and-marc", bride: "Sarah", groom: "Marc", email: "sarah@example.com", date: "October 12, 2024", heroImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcZ8hcUUydrCODFQcRhZz-MxvASKxJBNJnoB15Ir8Irl72QGmwIlmvaXw20Pflc3BuODfXM9wgbhqC6ZuBLd17kQI148-_vyX4yA0iXF5dLwZwJ19IhrabzMlXJgTT4uETLXuOlE5olAryBFxm7Fmo4hQVpkZ5M5exFrnaK9jFZnvimbmeZ58sJ6sppdjeFzN3GxbdXvUc3dWtzhbQ_yL5SfFgaKqcYLwGxfpwp00ebopPQUNEwp8CTmot_PRyaa0gIGgcJAVDvVkd" },
    ];

    const [useMocks, setUseMocks] = useState(false);
    const [realClients, setRealClients] = useState<any[]>([]);

    const fetchClients = async () => {
        try {
            const res = await fetchWithAuth('/api/admin/clients');
            if (res.ok) {
                const data = await res.json();
                setRealClients(data);
            }
        } catch (e) {
            console.error("Failed fetching clients", e);
        }
    };

    const loadDashboardData = async () => {
        setDashboardLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const data = await getAdminDashboardData(token);
            setDashboardData(data);
        } catch (e) {
            console.error("Failed loading dashboard data", e);
            const msg = e instanceof Error ? e.message : 'Failed to load dashboard';
            toast.error("Could not load dashboard", { description: msg });
        } finally {
            setDashboardLoading(false);
        }
    };

    const handleSaveSubscription = async (row: AdminLedgerRow, payload: SubscriptionPayload) => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (row.subscriptionId) {
            await updateSubscription(row.subscriptionId, payload, token);
        } else {
            await upsertSubscriptionForInvitation(row.invitationId, payload, token);
        }
        await loadDashboardData();
    };

    useEffect(() => {
        const checkAdminAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            if (session.user.app_metadata?.role !== 'admin') {
                router.push('/login'); // Not authorized as admin
                return;
            }
            setAccessToken(session.access_token ?? null);
            fetchClients();
            void loadDashboardData();
            setLoadingAuth(false);
        };
        checkAdminAuth();
    }, [router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        setOnboardLoading(true);
        setOnboardMessage(null);

        try {
            const response = await fetchWithAuth('/api/admin/create-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newClientForm)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create client');
            }

            setOnboardMessage({ type: 'success', text: `Successfully created client ${newClientForm.slug}` });
            setNewClientForm({ email: '', password: '', slug: '' });
            fetchClients(); // Refresh client list
            setTimeout(() => {
                setIsCreatingClient(false);
                setOnboardMessage(null);
            }, 2000);
        } catch (err: any) {
            setOnboardMessage({ type: 'error', text: err.message });
        } finally {
            setOnboardLoading(false);
        }
    };

    const { handleAddSection, handleRemoveSection, handleSectionChange } = useCustomSections(setLiveData);

    const handleSlideshowToggle = (idx: number, sectionId: string, enabled: boolean) => {
        if (!enabled) {
            setCustomFiles((prev) => {
                const cur = prev[sectionId];
                if (!cur?.slideshowPreviews?.length && !cur?.slideshowFiles?.length) return prev;
                cur.slideshowPreviews?.forEach((u) => URL.revokeObjectURL(u));
                const next: CustomSectionFiles = { ...cur };
                delete next.slideshowFiles;
                delete next.slideshowPreviews;
                if (!next.bgFile && !next.bgPreview && !next.overlayFile && !next.overlayPreview) {
                    const { [sectionId]: _, ...rest } = prev;
                    return rest;
                }
                return { ...prev, [sectionId]: next };
            });
        }
        setLiveData((prev) => {
            const arr = [...(prev.customSections || [])];
            const s = arr[idx];
            if (!s) return prev;
            if (enabled) {
                const urls =
                    s.slideshowUrls && s.slideshowUrls.length > 0
                        ? [...s.slideshowUrls]
                        : s.backgroundUrl &&
                            s.backgroundType !== 'video' &&
                            !String(s.backgroundUrl).split('?')[0].match(/\.(mp4|webm|ogg|mov)$/i)
                          ? [s.backgroundUrl]
                          : [];
                arr[idx] = {
                    ...s,
                    backgroundType: 'slideshow',
                    slideshowUrls: urls,
                    slideshowIntervalSec: s.slideshowIntervalSec ?? 5,
                    slideshowAutoplay: s.slideshowAutoplay !== false
                };
            } else {
                const prevUrls = s.slideshowUrls || [];
                const first = prevUrls[0] || s.backgroundUrl || '';
                const looksVideo = !!String(first).split('?')[0].match(/\.(mp4|webm|ogg|mov)$/i);
                arr[idx] = {
                    ...s,
                    backgroundType: looksVideo ? 'video' : 'image',
                    backgroundUrl: first,
                    slideshowUrls: []
                };
            }
            return { ...prev, customSections: arr };
        });
    };

    const isLikelyImageFile = (file: File) => {
        if (file.type.startsWith('image/')) return true;
        if (file.type && file.type !== 'application/octet-stream') return false;
        return /\.(jpe?g|png|gif|webp|avif|bmp|svg|heic|heif)$/i.test(file.name);
    };

    const handleSlideshowFilesAdd = (sectionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const list = e.target.files;
        if (!list?.length) return;
        const picked = Array.from(list).filter(isLikelyImageFile);
        if (!picked.length) return;
        setCustomFiles((prev) => {
            const cur = prev[sectionId] || {};
            const files = [...(cur.slideshowFiles || [])];
            const previews = [...(cur.slideshowPreviews || [])];
            picked.forEach((file) => {
                files.push(file);
                previews.push(URL.createObjectURL(file));
            });
            return { ...prev, [sectionId]: { ...cur, slideshowFiles: files, slideshowPreviews: previews } };
        });
        e.target.value = '';
    };

    const handleSlideshowRemoveSlide = (sectionIndex: number, slideIndex: number) => {
        const section = liveData.customSections?.[sectionIndex];
        if (!section) return;
        const saved = section.slideshowUrls || [];
        if (slideIndex < saved.length) {
            handleSectionChange(
                sectionIndex,
                'slideshowUrls',
                saved.filter((_, i) => i !== slideIndex)
            );
            return;
        }
        const pIdx = slideIndex - saved.length;
        setCustomFiles((prev) => {
            const cur = prev[section.id];
            if (!cur?.slideshowFiles?.length) return prev;
            const files = [...(cur.slideshowFiles || [])];
            const previews = [...(cur.slideshowPreviews || [])];
            if (pIdx < 0 || pIdx >= files.length) return prev;
            const rev = previews[pIdx];
            if (rev) URL.revokeObjectURL(rev);
            files.splice(pIdx, 1);
            previews.splice(pIdx, 1);
            return {
                ...prev,
                [section.id]: { ...cur, slideshowFiles: files, slideshowPreviews: previews }
            };
        });
    };

    const {
        handleAddGiftOption,
        handleRemoveGiftOption,
        handleGiftOptionChange,
        handleAddCustomField,
        handleRemoveCustomField,
        handleCustomFieldChange
    } = useGiftOptions(setLiveData);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setLiveData(prev => ({ ...prev, [name]: value }));
    };

    const np = mergeNavigationPages(liveData.navigationPages);

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
    } = useNavigationPages(setLiveData);

    const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedTheme = e.target.value;
        setThemeSelection(selectedTheme);
        if (selectedTheme === 'custom') {
            setLiveData(prev => ({ 
                ...prev, 
                theme: { primaryText: 'text-[var(--theme-primary)]', accent: 'text-[var(--theme-accent)]', bgAccent: 'bg-[var(--theme-accent-light)]', borderAccent: 'border-[var(--theme-accent)]', background: 'bg-[var(--theme-bg)]', name: 'custom', rawPrimary: '#1a1a1a', rawAccent: '#9ca3af', rawBackground: '#ffffff' } 
            }));
        } else {
            setLiveData(prev => ({ ...prev, theme: THEME_PRESETS[selectedTheme] }));
        }
    };

    const handleCustomThemeColorChange = (key: 'rawPrimary' | 'rawAccent' | 'rawBackground', value: string) => {
        setLiveData(prev => ({
            ...prev,
            theme: {
                ...prev.theme,
                [key]: value,
                name: 'custom'
            }
        }));
    };

    const handleSaveInvitation = async () => {
        if (!liveData.slug) {
            toast.error("No client selected");
            return;
        }

        if (!liveData.bride.trim() || !liveData.groom.trim()) {
            toast.error("Bride and Groom names are mandatory fields.");
            return;
        }

        setIsSaving(true);
        try {
            let updatedHeroImage = liveData.heroImage;
            let updatedMetadataImageUrl = liveData.metadataImageUrl;
            let updatedHeroVideo = liveData.heroVideo;
            let updatedHeroLogoUrl = liveData.heroLogoUrl;
            let updatedAudioUrl = liveData.audioUrl;

            const uploadFile = async (
                file: File,
                oldUrl?: string | null,
                setFileState?: React.Dispatch<React.SetStateAction<File | null>>
            ) => {
                if (oldUrl && oldUrl.includes('/assets/')) {
                    const rawPath = oldUrl.split('/assets/')[1];
                    const cleanPath = rawPath?.split('?')[0]; // strip query parameters like ?token=
                    console.log("[Storage Cleanup] Attempting to delete oldURL:", oldUrl);
                    console.log("[Storage Cleanup] Extracted cleanPath:", cleanPath);
                    if (cleanPath) {
                        const { data, error: removeError } = await supabase.storage.from('assets').remove([cleanPath]);
                        console.log("[Storage Cleanup] Delete result:", data, removeError);
                    }
                }
                const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                const filepath = `${liveData.slug}/${filename}`;
                const { error } = await supabase.storage.from('assets').upload(filepath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(filepath);

                if (setFileState) setFileState(null);

                return publicUrl;
            };

            let updatedFormalImage = liveData.formalInvitationImage;
            let updatedPreCeremonyMedia = liveData.preCeremonyMedia;
            let updatedDetailsBg = liveData.detailsBackgroundUrl;

            if (heroImageFile) updatedHeroImage = await uploadFile(heroImageFile, liveData.heroImage, setHeroImageFile);
            if (metadataImageFile) updatedMetadataImageUrl = await uploadFile(metadataImageFile, liveData.metadataImageUrl, setMetadataImageFile);
            if (heroVideoFile) updatedHeroVideo = await uploadFile(heroVideoFile, liveData.heroVideo, setHeroVideoFile);
            if (heroLogoFile) updatedHeroLogoUrl = await uploadFile(heroLogoFile, liveData.heroLogoUrl, setHeroLogoFile);
            if (audioFile) updatedAudioUrl = await uploadFile(audioFile, liveData.audioUrl, setAudioFile);
            if (formalImageFile) updatedFormalImage = await uploadFile(formalImageFile, liveData.formalInvitationImage, setFormalImageFile);
            if (preCeremonyMediaFile) updatedPreCeremonyMedia = await uploadFile(preCeremonyMediaFile, liveData.preCeremonyMedia, setPreCeremonyMediaFile);
            if (detailsBgFile) updatedDetailsBg = await uploadFile(detailsBgFile, liveData.detailsBackgroundUrl, setDetailsBgFile);

            const updatedCustomSections = await Promise.all((liveData.customSections || []).map(async (section) => {
                const files = customFiles[section.id];
                let bgUrl = section.backgroundUrl;
                let overlayUrl = section.overlayImageUrl;

                if (section.backgroundType === 'slideshow') {
                    let urls = [...(section.slideshowUrls || [])];
                    const pending = files?.slideshowFiles || [];
                    for (const f of pending) {
                        urls.push(await uploadFile(f, undefined));
                    }
                    bgUrl = urls[0] || bgUrl;
                    if (files?.overlayFile) {
                        overlayUrl = await uploadFile(files.overlayFile, section.overlayImageUrl);
                    }
                    return {
                        ...section,
                        backgroundUrl: bgUrl,
                        slideshowUrls: urls,
                        overlayImageUrl: overlayUrl,
                        backgroundType: 'slideshow' as const
                    };
                }

                if (files?.bgFile) {
                    bgUrl = await uploadFile(files.bgFile, section.backgroundUrl);
                }
                if (files?.overlayFile) {
                    overlayUrl = await uploadFile(files.overlayFile, section.overlayImageUrl);
                }

                return {
                    ...section,
                    backgroundUrl: bgUrl,
                    overlayImageUrl: overlayUrl
                };
            }));

            Object.values(customFiles).forEach((opts) => {
                opts.slideshowPreviews?.forEach((u) => URL.revokeObjectURL(u));
            });

            // Clear custom files to prevent duplicate uploads
            setCustomFiles({});

            const payloadToSave = {
                ...liveData,
                heroImage: updatedHeroImage,
                metadataImageUrl: updatedMetadataImageUrl,
                heroVideo: updatedHeroVideo,
                heroLogoUrl: updatedHeroLogoUrl,
                audioUrl: updatedAudioUrl,
                formalInvitationImage: updatedFormalImage,
                preCeremonyMedia: updatedPreCeremonyMedia,
                detailsBackgroundUrl: updatedDetailsBg,
                customSections: updatedCustomSections
            };

            const response = await fetchWithAuth('/api/admin/invitation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadToSave)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save');
            }
            
            setLiveData(payloadToSave);

            // Flush deferred media deletions now that the DB save succeeded — keeps storage and DB in sync.
            // Failures are logged but don't roll back the save (file would be a harmless orphan in storage).
            if (pendingMediaDeletions.size > 0) {
                await Promise.all(Array.from(pendingMediaDeletions).map(async (url) => {
                    const cleanPath = url.split('/assets/')[1]?.split('?')[0];
                    if (!cleanPath) return;
                    try {
                        const { error } = await supabase.storage.from('assets').remove([cleanPath]);
                        if (error) console.error('[Storage Cleanup] Deferred remove failed:', error);
                    } catch (e) {
                        console.error('[Storage Cleanup] Deferred remove threw:', e);
                    }
                }));
                setPendingMediaDeletions(new Set());
            }

            toast.success("Invitation saved", { description: `Updated /${liveData.slug}` });
        } catch (error: any) {
            toast.error("Failed to save invitation", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingAuth) {
        return <div className="h-screen w-full flex items-center justify-center bg-stone-50"><p className="text-stone-500 animate-pulse">Loading Admin Workspace...</p></div>;
    }

    return (
        <div className="flex bg-surface text-on-surface font-body overflow-x-hidden relative h-screen w-full">
            {isLoadingClientDetails && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 backdrop-blur-sm"
                    role="alertdialog"
                    aria-busy="true"
                    aria-live="polite"
                    aria-labelledby="admin-client-loading-title"
                >
                    <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/15 px-10 py-9 max-w-sm mx-4 flex flex-col items-center gap-5 text-center">
                        <Loader2 className="w-11 h-11 text-primary animate-spin shrink-0" aria-hidden />
                        <div>
                            <p id="admin-client-loading-title" className="font-headline text-lg text-primary">
                                Preparing the details
                            </p>
                            <p className="font-body text-sm text-secondary mt-2 leading-relaxed">
                                Loading invitation, budget, and seating for this client.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {/* Sidebar - Admin Navigation */}
            <aside className="hidden md:flex flex-col h-full py-6 px-2 bg-surface-container-low text-primary w-52 shrink-0 whitespace-separation z-20 scrollbar-hide">
                <div className="mb-6 px-2">
                    <h1 className="text-base font-headline text-primary leading-tight">Oui-Do Admin</h1>
                    <p className="text-[0.65rem] font-label uppercase tracking-wider text-secondary mt-1">Editorial Workspace</p>
                </div>

                <div className="px-2 mb-3">
                    <button
                        onClick={() => {
                            setLiveData(defaultData);
                            setIsCreatingClient(true);
                            setHeroImageFile(null); setHeroImagePreview(null);
                            setMetadataImageFile(null); setMetadataImagePreview(null);
                            setHeroVideoFile(null); setHeroVideoPreview(null);
                            setHeroLogoFile(null); setHeroLogoPreview(null);
                            setAudioFile(null); setAudioPreview(null);
                            setFormalImageFile(null); setFormalImagePreview(null);
                            setDetailsBgFile(null); setDetailsBgPreview(null);
                            setCustomFiles({});
                        }}
                        className="w-full py-3 px-3 rounded-full text-[9px] font-label uppercase tracking-widest transition-all hover:opacity-90 font-bold text-on-primary shadow-xl shadow-primary/10 leading-tight"
                        style={{ background: 'linear-gradient(135deg, #00150F 0%, #062C22 100%)' }}
                    >
                        New Client Instance
                    </button>
                </div>

                <div className="flex-1 px-0 flex flex-col pt-4">
                    <nav className="flex-1 space-y-1">
                        <button
                            className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-r-full transition-all duration-200 ${activeTab === 'dashboard' ? 'text-primary font-bold bg-surface-container-lowest shadow-sm scale-[0.99]' : 'text-secondary hover:bg-surface-container-lowest hover:text-primary'}`}
                            onClick={() => {
                                setLiveData(defaultData);
                                setActiveTab('dashboard');
                                setHeroImageFile(null); setHeroImagePreview(null);
                                setMetadataImageFile(null); setMetadataImagePreview(null);
                                setHeroVideoFile(null); setHeroVideoPreview(null);
                                setHeroLogoFile(null); setHeroLogoPreview(null);
                                setAudioFile(null); setAudioPreview(null);
                                setFormalImageFile(null); setFormalImagePreview(null);
                                setDetailsBgFile(null); setDetailsBgPreview(null);
                                setCustomFiles({});
                                void loadDashboardData();
                            }}
                        >
                            <LayoutDashboard className="w-4 h-4 shrink-0" />
                            <span className={`font-label uppercase tracking-[0.05em] text-[0.65rem] text-left leading-snug ${activeTab === 'dashboard' ? 'font-bold' : 'font-medium'}`}>Dashboard</span>
                        </button>
                        <button
                            className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-r-full transition-all duration-200 ${activeTab === 'clients-list' ? 'text-primary font-bold bg-surface-container-lowest shadow-sm scale-[0.99]' : 'text-secondary hover:bg-surface-container-lowest hover:text-primary'}`}
                            onClick={() => {
                                setLiveData(defaultData); // Clear builder
                                setActiveTab('clients-list');
                                setHeroImageFile(null); setHeroImagePreview(null);
                                setMetadataImageFile(null); setMetadataImagePreview(null);
                                setHeroVideoFile(null); setHeroVideoPreview(null);
                                setHeroLogoFile(null); setHeroLogoPreview(null);
                                setAudioFile(null); setAudioPreview(null);
                                setFormalImageFile(null); setFormalImagePreview(null);
                                setDetailsBgFile(null); setDetailsBgPreview(null);
                                setCustomFiles({});
                            }}
                        >
                            <Users className="w-4 h-4 shrink-0" />
                            <span className="font-label uppercase tracking-[0.05em] text-[0.65rem] font-bold text-left leading-snug">Active Clients</span>
                        </button>
                        <button
                            className={`w-full flex items-center gap-2 py-2.5 px-3 rounded-r-full transition-all duration-200 ${activeTab === 'entitlements' ? 'text-primary font-bold bg-surface-container-lowest shadow-sm scale-[0.99]' : 'text-secondary hover:bg-surface-container-lowest hover:text-primary'}`}
                            onClick={() => {
                                setLiveData(defaultData);
                                setActiveTab('entitlements');
                                setHeroImageFile(null); setHeroImagePreview(null);
                                setMetadataImageFile(null); setMetadataImagePreview(null);
                                setHeroVideoFile(null); setHeroVideoPreview(null);
                                setHeroLogoFile(null); setHeroLogoPreview(null);
                                setAudioFile(null); setAudioPreview(null);
                                setFormalImageFile(null); setFormalImagePreview(null);
                                setDetailsBgFile(null); setDetailsBgPreview(null);
                                setCustomFiles({});
                            }}
                        >
                            <Shield className="w-4 h-4 shrink-0" />
                            <span className="font-label uppercase tracking-[0.05em] text-[0.65rem] font-bold text-left leading-snug">Entitlements</span>
                        </button>
                    </nav>

                    <div className="mt-auto px-2 mb-3">
                        <div className="flex items-center justify-between px-2 py-2 bg-surface-container-highest/20 rounded-xl gap-2">
                            <span className="text-[0.6rem] font-bold text-secondary uppercase tracking-widest truncate">Mock</span>
                            <button
                                onClick={() => setUseMocks(!useMocks)}
                                className={`w-8 h-4 rounded-full relative transition-colors ${useMocks ? 'bg-primary' : 'bg-surface-dim'}`}
                            >
                                <span className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white transition-transform ${useMocks ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-2 py-3 border-t border-outline-variant/10">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-2 py-2 text-xs text-secondary hover:text-primary transition-colors font-label uppercase tracking-widest font-bold"
                    >
                        <LogOut className="w-4 h-4 shrink-0" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 flex flex-col h-full relative bg-surface">

                {/* Top Nav Tabs */}
                {liveData.slug && activeTab !== 'clients-list' && activeTab !== 'entitlements' && activeTab !== 'dashboard' && (
                    <div className="h-14 border-b border-surface-container-highest flex items-center px-8 gap-0 shrink-0 bg-surface-container-low/50">
                        {/* Back Button + Client Name */}
                        <button
                            onClick={() => {
                                setLiveData(defaultData);
                                setActiveTab('clients-list');
                                setHeroImageFile(null); setHeroImagePreview(null);
                                setMetadataImageFile(null); setMetadataImagePreview(null);
                                setHeroVideoFile(null); setHeroVideoPreview(null);
                                setHeroLogoFile(null); setHeroLogoPreview(null);
                                setAudioFile(null); setAudioPreview(null);
                                setFormalImageFile(null); setFormalImagePreview(null);
                                setDetailsBgFile(null); setDetailsBgPreview(null);
                                setCustomFiles({});
                            }}
                            className="flex items-center gap-2 mr-6 pr-6 border-r border-outline-variant/20 h-full text-secondary hover:text-primary transition-colors"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" />
                            <span className="text-sm font-headline font-semibold text-primary">{liveData.bride} & {liveData.groom}</span>
                        </button>
                        <div className="flex items-center gap-8 h-full">
                            <button
                                onClick={() => setActiveTab('client-overview')}
                                className={`h-full flex items-center text-sm font-medium border-b-2 transition-colors ${activeTab === 'client-overview' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-primary'}`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => setActiveTab('builder')}
                                className={`h-full flex items-center text-sm font-medium border-b-2 transition-colors ${activeTab === 'builder' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-primary'}`}
                            >
                                Invitation Builder
                            </button>
                            <button
                                onClick={() => setActiveTab('budget')}
                                className={`h-full flex items-center text-sm font-medium border-b-2 transition-colors ${activeTab === 'budget' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-primary'}`}
                            >
                                Budget Tracker
                            </button>
                            <button
                                onClick={() => setActiveTab('seating')}
                                className={`h-full flex items-center text-sm font-medium border-b-2 transition-colors ${activeTab === 'seating' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-primary'}`}
                            >
                                Table Seating
                            </button>
                            <button
                                onClick={() => setActiveTab('schedule')}
                                className={`h-full flex items-center text-sm font-medium border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-primary'}`}
                            >
                                Day-of Schedule
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden relative">

                    {activeTab === 'dashboard' && !isCreatingClient && (
                        <DashboardOverview
                            data={dashboardData}
                            loading={dashboardLoading}
                            clients={realClients}
                            onSaveSubscription={handleSaveSubscription}
                        />
                    )}

                    {activeTab === 'entitlements' && !isCreatingClient && (
                        <div className="w-full h-full overflow-y-auto">
                            <ClientEntitlementsPanel />
                        </div>
                    )}

                    {activeTab === 'clients-list' && !isCreatingClient && (
                        <ClientList
                            clients={useMocks ? mockClients : realClients}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            onSelectClient={async (client) => {
                                setIsLoadingClientDetails(true);
                                try {
                                    const res = await fetch(`/api/invitation?slug=${client.slug}`);
                                    if (res.ok) {
                                        const dbData = await res.json();
                                        if (dbData) {
                                            setThemeSelection(getThemeSelectionFromTheme(dbData.theme as Theme | null));
                                            setLiveData({
                                                ...defaultData,
                                                ...dbData,
                                                theme: dbData.theme || THEME_PRESETS.emerald,
                                                navigationPages: mergeNavigationPages((dbData as InvitationData).navigationPages)
                                            });
                                            setHasInvitation(true);
                                        } else {
                                            setLiveData({ ...defaultData, slug: client.slug, bride: client.bride, groom: client.groom });
                                            setHasInvitation(false);
                                        }
                                        setHeroImageFile(null); setHeroImagePreview(null);
                                        setMetadataImageFile(null); setMetadataImagePreview(null);
                                        setHeroVideoFile(null); setHeroVideoPreview(null);
                                        setHeroLogoFile(null); setHeroLogoPreview(null);
                                        setAudioFile(null); setAudioPreview(null);
                                        // Reset feature data then fetch — wrapped individually so a
                                        // disabled feature doesn't abort the rest of the load.
                                        setExpenses([]); setSeatingTables([]); setSeatingGuests([]);
                                        const { data: { session: s } } = await supabase.auth.getSession();
                                        const token = s?.access_token;
                                        try {
                                            const exp = await getExpensesBySlug(client.slug, token);
                                            setExpenses(exp);
                                        } catch { /* budget feature may be disabled */ }
                                        try {
                                            const seatData = await getSeatingData(client.slug, token);
                                            setSeatingTables(seatData.tables);
                                            setSeatingGuests(seatData.guests);
                                        } catch { /* seating feature may be disabled */ }
                                        setActiveTab('client-overview');
                                    }
                                } catch (e) { console.error(e); }
                                finally {
                                    setIsLoadingClientDetails(false);
                                }
                            }}
                        />
                    )}

                    {(activeTab === 'builder' || isCreatingClient) && (
                        <>
                            {/* Onboard Client Form Native */}
                            {isCreatingClient && (
                                <NewClientForm
                                    form={newClientForm}
                                    setForm={setNewClientForm}
                                    loading={onboardLoading}
                                    message={onboardMessage}
                                    showSlugDropdown={showSlugDropdown}
                                    setShowSlugDropdown={setShowSlugDropdown}
                                    clients={useMocks ? mockClients : realClients}
                                    onSubmit={handleCreateClient}
                                    onCancel={() => setIsCreatingClient(false)}
                                />
                            )}

                            {/* Center Column - Builder Form */}
                            <div className="flex flex-1 overflow-hidden h-full w-full">
                                {/* Left Column: Editor & Controls */}
                                <div className={`w-full min-w-0 flex-1 h-full overflow-y-auto bg-surface p-8 md:p-12 lg:p-16 transition-opacity ${isCreatingClient ? 'opacity-20 pointer-events-none' : ''}`}>
                                    <div className="max-w-3xl mx-auto space-y-16 pb-24">
                                        {/* Page Header Actions */}
                                        <div className="flex flex-col xl:flex-row xl:justify-between xl:items-center gap-6 mb-16">
                                            <div className="space-y-2">
                                                <h1 className="text-5xl font-headline text-primary">Invitation Builder</h1>
                                                <p className="text-secondary font-body">Crafting the narrative for {liveData.slug ? `/${liveData.slug}` : 'a new invitation'}</p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 xl:gap-4 shrink-0 mt-4 xl:mt-0">
                                                {liveData.slug && (
                                                    <button
                                                        onClick={async () => {
                                                            const url = `${window.location.protocol}//${window.location.host}/invite/${liveData.slug}`;
                                                            try {
                                                                await navigator.clipboard.writeText(url);
                                                            } catch (err) {
                                                                const textArea = document.createElement("textarea");
                                                                textArea.value = url;
                                                                document.body.appendChild(textArea);
                                                                textArea.select();
                                                                document.execCommand("copy");
                                                                document.body.removeChild(textArea);
                                                            }
                                                            const btn = document.getElementById('copy-btn-text');
                                                            if (btn) {
                                                                const original = btn.innerText;
                                                                btn.innerText = "Copied!";
                                                                setTimeout(() => btn.innerText = original, 2000);
                                                            }
                                                        }}
                                                        className="bg-surface-container-high text-on-surface px-6 py-2.5 rounded-full flex items-center justify-center gap-2 font-medium hover:opacity-80 transition-opacity text-sm"
                                                    >
                                                        <Link className="w-3.5 h-3.5 opacity-70" />
                                                        <span id="copy-btn-text">Copy General Link</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={handleSaveInvitation}
                                                    disabled={isSaving}
                                                    className="bg-primary text-on-primary px-8 py-2.5 rounded-full font-medium shadow-md hover:bg-primary/90 disabled:opacity-50 transition-all text-sm"
                                                >
                                                    {isSaving ? "Saving..." : "Publish Changes"}
                                                </button>
                                            </div>
                                        </div>

                                        <CoupleSection bride={liveData.bride} groom={liveData.groom} onChange={handleInputChange} />

                                        <HeroSection
                                            heroImageUrl={liveData.heroImage || ''}
                                            heroImagePreview={heroImagePreview}
                                            onHeroImageChange={(e) => handleFileChange(e, setHeroImageFile, setHeroImagePreview, heroImagePreview)}
                                            onRemoveHeroImage={() => removeMedia('heroImage', liveData.heroImage, setHeroImageFile, setHeroImagePreview, heroImagePreview)}
                                            heroVideoUrl={liveData.heroVideo || ''}
                                            heroVideoPreview={heroVideoPreview}
                                            heroVideoFile={heroVideoFile}
                                            onHeroVideoChange={(e) => handleFileChange(e, setHeroVideoFile, setHeroVideoPreview, heroVideoPreview)}
                                            onRemoveHeroVideo={() => removeMedia('heroVideo', liveData.heroVideo, setHeroVideoFile, setHeroVideoPreview, heroVideoPreview)}
                                            metadataImageUrl={liveData.metadataImageUrl || ''}
                                            metadataImagePreview={metadataImagePreview}
                                            onMetadataImageChange={(e) => handleFileChange(e, setMetadataImageFile, setMetadataImagePreview, metadataImagePreview)}
                                            onRemoveMetadataImage={() => removeMedia('metadataImageUrl', liveData.metadataImageUrl, setMetadataImageFile, setMetadataImagePreview, metadataImagePreview)}
                                            showHeroLogo={liveData.showHeroLogo || false}
                                            onToggleHeroLogo={(checked) => setLiveData(prev => ({ ...prev, showHeroLogo: checked }))}
                                            heroLogoUrl={liveData.heroLogoUrl || ''}
                                            heroLogoPreview={heroLogoPreview}
                                            onHeroLogoChange={(e) => handleFileChange(e, setHeroLogoFile, setHeroLogoPreview, heroLogoPreview)}
                                            onRemoveHeroLogo={() => removeMedia('heroLogoUrl', liveData.heroLogoUrl, setHeroLogoFile, setHeroLogoPreview, heroLogoPreview)}
                                            showHeroDate={liveData.showHeroDate !== false}
                                            onToggleHeroDate={(checked) => setLiveData(prev => ({ ...prev, showHeroDate: checked }))}
                                            themeSelection={themeSelection}
                                            onThemeChange={handleThemeChange}
                                            rawPrimary={(liveData.theme as any)?.rawPrimary || '#1a1a1a'}
                                            rawAccent={(liveData.theme as any)?.rawAccent || '#9ca3af'}
                                            rawBackground={(liveData.theme as any)?.rawBackground || '#ffffff'}
                                            onCustomColorChange={handleCustomThemeColorChange}
                                        />

                                        <FormalInvitationSection
                                            showFormalInvitation={liveData.showFormalInvitation || false}
                                            onToggleFormalInvitation={(checked) => setLiveData(prev => ({ ...prev, showFormalInvitation: checked }))}
                                            formalImageUrl={liveData.formalInvitationImage || ''}
                                            formalImagePreview={formalImagePreview}
                                            formalImageFile={formalImageFile}
                                            onFormalImageChange={(e) => handleFileChange(e, setFormalImageFile, setFormalImagePreview, formalImagePreview)}
                                            onRemoveFormalImage={() => removeMedia('formalInvitationImage', liveData.formalInvitationImage, setFormalImageFile, setFormalImagePreview, formalImagePreview)}
                                            detailsBgUrl={liveData.detailsBackgroundUrl || ''}
                                            detailsBgPreview={detailsBgPreview}
                                            onDetailsBgChange={(e) => handleFileChange(e, setDetailsBgFile, setDetailsBgPreview, detailsBgPreview)}
                                            onRemoveDetailsBg={() => removeMedia('detailsBackgroundUrl', liveData.detailsBackgroundUrl, setDetailsBgFile, setDetailsBgPreview, detailsBgPreview)}
                                            audioUrl={liveData.audioUrl || ''}
                                            audioPreview={audioPreview}
                                            audioFile={audioFile}
                                            onAudioChange={(e) => handleFileChange(e, setAudioFile, setAudioPreview, audioPreview)}
                                            onRemoveAudio={() => removeMedia('audioUrl', liveData.audioUrl, setAudioFile, setAudioPreview, audioPreview)}
                                        />

                                        <PreCeremonySection
                                            mediaUrl={liveData.preCeremonyMedia || ''}
                                            mediaPreview={preCeremonyMediaPreview}
                                            file={preCeremonyMediaFile}
                                            onFileChange={(e) => handleFileChange(e, setPreCeremonyMediaFile, setPreCeremonyMediaPreview, preCeremonyMediaPreview)}
                                            onRemove={() => removeMedia('preCeremonyMedia', liveData.preCeremonyMedia, setPreCeremonyMediaFile, setPreCeremonyMediaPreview, preCeremonyMediaPreview)}
                                        />

                                        <HousesSection
                                            showHouses={liveData.showHouses || false}
                                            housesData={liveData.housesData}
                                            onToggle={(checked) => setLiveData(prev => ({ ...prev, showHouses: checked }))}
                                            onFieldChange={(field, value) => setLiveData(prev => ({ ...prev, housesData: { ...prev.housesData, [field]: value } }))}
                                        />

                                        <CeremonyDetailsSection
                                            date={liveData.date}
                                            time={liveData.time}
                                            venue={liveData.venue}
                                            location={liveData.location}
                                            mapLink={liveData.mapLink || ''}
                                            onChange={handleInputChange}
                                        />

                                        <FormalReceptionSection
                                            receptionTime={liveData.receptionTime || ''}
                                            receptionVenue={liveData.receptionVenue || ''}
                                            receptionAddress={liveData.receptionAddress || ''}
                                            receptionLocation={liveData.receptionLocation || ''}
                                            message={liveData.message}
                                            onChange={handleInputChange}
                                        />

                                        {/* Section 06: Custom Editor */}
                                        <section>
                                            <div className="flex justify-between items-center mb-8">
                                                <h2 className="text-2xl font-headline text-primary">Custom Blocks</h2>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddSection}
                                                        className="text-xs font-label uppercase font-bold text-primary hover:text-on-primary-container bg-surface-container-high px-4 py-2 rounded-full transition-colors flex items-center gap-1 tracking-widest"
                                                    >
                                                        <Plus className="w-3 h-3" /> Append Block
                                                    </button>
                                                    <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest ml-4">Section 07</span>
                                                </div>
                                            </div>

                                            {liveData.customSections?.length === 0 ? (
                                                <p className="text-[0.875rem] font-body text-secondary italic text-center py-8 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">No custom editorial narrative blocks appended yet.</p>
                                            ) : (
                                                <div className="space-y-8">
                                                    {liveData.customSections?.map((section, idx) => (
                                                        <CustomSectionBlock
                                                            key={section.id}
                                                            section={section}
                                                            idx={idx}
                                                            files={customFiles[section.id]}
                                                            onSectionChange={handleSectionChange}
                                                            onRemove={handleRemoveSection}
                                                            onSlideshowToggle={handleSlideshowToggle}
                                                            onSlideshowFilesAdd={handleSlideshowFilesAdd}
                                                            onSlideshowRemoveSlide={handleSlideshowRemoveSlide}
                                                            onCustomFileChange={handleCustomFileChange}
                                                            onRemoveCustomMedia={removeCustomSectionMedia}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </section>

                                        <GiftOptionsSection
                                            giftMessage={liveData.giftMessage || ''}
                                            giftOptions={liveData.giftOptions || []}
                                            onInputChange={handleInputChange}
                                            onAddGiftOption={handleAddGiftOption}
                                            onRemoveGiftOption={handleRemoveGiftOption}
                                            onGiftOptionChange={handleGiftOptionChange}
                                            onAddCustomField={handleAddCustomField}
                                            onRemoveCustomField={handleRemoveCustomField}
                                            onCustomFieldChange={handleCustomFieldChange}
                                            showRsvp={liveData.showRsvp !== false}
                                            onToggleRsvp={(checked) => setLiveData(prev => ({ ...prev, showRsvp: checked }))}
                                            rsvpClosedMessage={liveData.rsvpClosedMessage || ''}
                                            rsvpClosedMessageRef={rsvpClosedMessageRef}
                                            onBoldRsvpMessage={() => {
                                                const el = rsvpClosedMessageRef.current;
                                                if (!el) return;
                                                const cur = liveData.rsvpClosedMessage ?? '';
                                                const { value, caret } = wrapMarkdownBoldSegment(cur, el.selectionStart, el.selectionEnd);
                                                setLiveData((p) => ({ ...p, rsvpClosedMessage: value }));
                                                queueMicrotask(() => {
                                                    el.focus();
                                                    el.setSelectionRange(caret, caret);
                                                });
                                            }}
                                        />

                                        <NavigationEditorSection
                                            showNavigation={liveData.showNavigation || false}
                                            onToggleShowNavigation={(checked) => setLiveData(prev => ({ ...prev, showNavigation: checked }))}
                                            isOpen={navigationEditorOpen}
                                            onToggleOpen={() => setNavigationEditorOpen((open) => !open)}
                                            np={np}
                                            slug={liveData.slug || ''}
                                            updateNavigationPages={updateNavigationPages}
                                            addLodgingHotel={addLodgingHotel}
                                            removeLodgingHotel={removeLodgingHotel}
                                            updateLodgingHotel={updateLodgingHotel}
                                            onHotelImageUpload={async (idx, file) => {
                                                const slug = liveData.slug;
                                                if (!slug) return;
                                                const ext = file.name.split('.').pop() ?? 'jpg';
                                                const path = `${slug}/lodging/hotel-${idx}-${Date.now()}.${ext.replace(/[^a-zA-Z0-9]/g, '')}`;
                                                const { error } = await supabase.storage.from('assets').upload(path, file, { cacheControl: '3600', upsert: false });
                                                if (error) { toast.error('Failed to upload hotel image', { description: error.message }); return; }
                                                const { data: { publicUrl } } = supabase.storage.from('assets').getPublicUrl(path);
                                                updateLodgingHotel(idx, 'imageUrl', publicUrl);
                                            }}
                                            onHotelImageRemove={async (idx, currentUrl) => {
                                                if (currentUrl?.includes('/assets/')) {
                                                    const cleanPath = currentUrl.split('/assets/')[1]?.split('?')[0];
                                                    if (cleanPath) await supabase.storage.from('assets').remove([cleanPath]);
                                                }
                                                updateLodgingHotel(idx, 'imageUrl', '');
                                            }}
                                            addExploringSpot={addExploringSpot}
                                            removeExploringSpot={removeExploringSpot}
                                            updateExploringSpot={updateExploringSpot}
                                            addDynamicPage={addDynamicPage}
                                            removeDynamicPage={removeDynamicPage}
                                            updateDynamicPage={updateDynamicPage}
                                            updateDynamicPageBody={updateDynamicPageBody}
                                        />

                                        <FootnoteSection footnote={liveData.footnote || ''} onChange={handleInputChange} />
                                    </div>
                                </div>
                                {/* Right Column - Live Preview */}
                                {(() => {
                                    const previewData = {
                                        ...liveData,
                                        ...(heroImagePreview && { heroImage: heroImagePreview }),
                                        ...(metadataImagePreview && { metadataImageUrl: metadataImagePreview }),
                                        ...(heroVideoPreview && { heroVideo: heroVideoPreview }),
                                        ...(heroLogoPreview && { heroLogoUrl: heroLogoPreview }),
                                        ...(audioPreview && { audioUrl: audioPreview }),
                                        ...(formalImagePreview && { 
                                            formalInvitationImage: formalImagePreview,
                                            formalInvitationIsVideo: formalImageFile?.type.startsWith('video/')
                                        }),
                                        ...(preCeremonyMediaPreview && { 
                                            preCeremonyMedia: preCeremonyMediaPreview,
                                            preCeremonyMediaIsVideo: preCeremonyMediaFile?.type.startsWith('video/')
                                        }),
                                        ...(detailsBgPreview && { detailsBackgroundUrl: detailsBgPreview }),
                                        customSections: liveData.customSections?.map(section => {
                                            const files = customFiles[section.id];
                                            if (section.backgroundType === 'slideshow') {
                                                const saved = section.slideshowUrls || [];
                                                const pending = files?.slideshowPreviews || [];
                                                return {
                                                    ...section,
                                                    slideshowUrls: [...saved, ...pending],
                                                    backgroundUrl: saved[0] || pending[0] || section.backgroundUrl,
                                                    ...(files?.overlayPreview && { overlayImageUrl: files.overlayPreview })
                                                };
                                            }
                                            if (files) {
                                                return {
                                                    ...section,
                                                    ...(files.bgPreview && { backgroundUrl: files.bgPreview }),
                                                    ...(files.overlayPreview && { overlayImageUrl: files.overlayPreview }),
                                                };
                                            }
                                            return section;
                                        })
                                    };
                                    return (
                                        <div className={`hidden lg:block lg:flex-[0_0_26rem] xl:flex-[0_0_28rem] min-w-0 h-full bg-stone-100 relative overflow-hidden transition-opacity ${isCreatingClient ? 'opacity-20 pointer-events-none' : ''}`}>
                                            <div className="absolute top-0 inset-x-0 h-12 bg-white/80 backdrop-blur-sm border-b border-stone-200 z-50 flex items-center justify-between px-6 shadow-sm">
                                                <div className="flex gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                                                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                                                </div>
                                                <div className="text-xs font-mono text-stone-400 bg-stone-100 px-3 py-1 rounded-md">
                                                    localhost:3000/invite/{liveData.slug || 'slug'}
                                                </div>
                                                <div className="w-12"></div>
                                            </div>
                                            <div className="h-full w-full overflow-y-auto pt-12">
                                                <div className="pointer-events-auto flex justify-center items-start px-4 pb-10">
                                                    {liveData.slug ? (
                                                        <div className="w-full min-w-0 max-w-[390px] shrink-0 overflow-hidden rounded-[2rem] border border-stone-300/70 bg-stone-200/40 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.28)] ring-1 ring-black/5">
                                                            <InvitationPreview data={previewData} isPreview />
                                                        </div>
                                                    ) : (
                                                        <div className="min-h-[12rem] w-full max-w-[390px] flex items-center justify-center text-stone-400 italic text-center px-4">
                                                            Select a client from the sidebar to preview
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </>
                    )}

                    {activeTab === 'budget' && !isCreatingClient && (
                        <div className="w-full h-full overflow-y-auto p-8 bg-surface-container-low">
                            <BudgetTracker slug={liveData.slug} initialExpenses={expenses} isAdmin={true} accessToken={accessToken} />
                        </div>
                    )}

                    {activeTab === 'seating' && !isCreatingClient && (
                        <div className="w-full h-full overflow-y-auto p-8 bg-surface-container-low">
                            <TableSeating slug={liveData.slug} initialTables={seatingTables} initialGuests={seatingGuests} accessToken={accessToken} />
                        </div>
                    )}

                    {activeTab === 'schedule' && !isCreatingClient && liveData.slug && (
                        <ScheduleBuilder
                            slug={liveData.slug}
                            brideGroom={`${liveData.bride} & ${liveData.groom}`}
                            accessToken={accessToken}
                        />
                    )}

                    {activeTab === 'client-overview' && !isCreatingClient && liveData.slug && (
                        <ClientOverview
                            liveData={liveData}
                            guests={seatingGuests}
                            expenses={expenses}
                            accessToken={accessToken}
                            hasInvitation={hasInvitation}
                            onNavigate={(tab) => setActiveTab(tab)}
                            onInvitationSaved={(updates) => {
                                setLiveData(prev => ({ ...prev, ...updates }));
                                setHasInvitation(true);
                            }}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
