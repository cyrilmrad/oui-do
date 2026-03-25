"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import InvitationPreview, { InvitationData, Theme } from '@/components/InvitationPreview';
import { LogOut, Users, Plus, LayoutDashboard, Search, ChevronRight, Copy, Link, QrCode, Download, Share, Lock } from 'lucide-react';
import BudgetTracker from '@/components/BudgetTracker';
import TableSeating from '@/components/TableSeating';
import { getExpensesBySlug, SelectExpense } from '@/app/actions/budget';
import { getSeatingData } from '@/app/actions/seating';
import type { SelectSeatingTable, SelectGuest } from '@/app/actions/seating';

const THEME_PRESETS: Record<string, Theme> = {
    emerald: { primaryText: "text-stone-800", accent: "text-emerald-700", background: "bg-stone-50" },
    slate: { primaryText: "text-slate-900", accent: "text-slate-600", background: "bg-slate-50" },
    rose: { primaryText: "text-rose-950", accent: "text-rose-600", background: "bg-rose-50" }
};

const defaultData: InvitationData = {
    slug: "",
    bride: "",
    groom: "",
    date: "",
    time: "",
    venue: "",
    location: "",
    message: "We can't wait to celebrate our special day with our favorite people.",
    showHeroLogo: false,
    showFormalInvitation: false,
    formalInvitationImage: "",
    customSections: [],
    theme: THEME_PRESETS.emerald
};

export default function AdminDashboard() {
    const router = useRouter();
    const [loadingAuth, setLoadingAuth] = useState(true);

    // Admin Sidebar State
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [newClientForm, setNewClientForm] = useState({ email: '', password: '', slug: '' });
    const [onboardLoading, setOnboardLoading] = useState(false);
    const [onboardMessage, setOnboardMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [showSlugDropdown, setShowSlugDropdown] = useState(false);

    // Builder State
    const [liveData, setLiveData] = useState<InvitationData>(defaultData);
    const [themeSelection, setThemeSelection] = useState<string>("emerald");
    const [isSaving, setIsSaving] = useState(false);

    // File Upload State
    const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
    const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
    const [heroVideoFile, setHeroVideoFile] = useState<File | null>(null);
    const [heroVideoPreview, setHeroVideoPreview] = useState<string | null>(null);
    const [heroLogoFile, setHeroLogoFile] = useState<File | null>(null);
    const [heroLogoPreview, setHeroLogoPreview] = useState<string | null>(null);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioPreview, setAudioPreview] = useState<string | null>(null);

    const [formalImageFile, setFormalImageFile] = useState<File | null>(null);
    const [formalImagePreview, setFormalImagePreview] = useState<string | null>(null);
    const [detailsBgFile, setDetailsBgFile] = useState<File | null>(null);
    const [detailsBgPreview, setDetailsBgPreview] = useState<string | null>(null);

    const [customFiles, setCustomFiles] = useState<Record<string, { bgFile?: File, bgPreview?: string, overlayFile?: File, overlayPreview?: string }>>({});

    // Cleanup object URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            if (heroImagePreview) URL.revokeObjectURL(heroImagePreview);
            if (heroVideoPreview) URL.revokeObjectURL(heroVideoPreview);
            if (heroLogoPreview) URL.revokeObjectURL(heroLogoPreview);
            if (audioPreview) URL.revokeObjectURL(audioPreview);
            if (formalImagePreview) URL.revokeObjectURL(formalImagePreview);
            if (detailsBgPreview) URL.revokeObjectURL(detailsBgPreview);
            Object.values(customFiles).forEach(opts => {
                if (opts.bgPreview) URL.revokeObjectURL(opts.bgPreview);
                if (opts.overlayPreview) URL.revokeObjectURL(opts.overlayPreview);
            });
        };
    }, [heroImagePreview, heroVideoPreview, heroLogoPreview, audioPreview, formalImagePreview, detailsBgPreview, customFiles]);



    const handleCustomFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        sectionId: string,
        type: 'bg' | 'overlay'
    ) => {
        const file = e.target.files?.[0];
        if (file) {
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

    // Budget State
    const [activeTab, setActiveTab] = useState<'clients-list' | 'builder' | 'budget' | 'seating'>('clients-list');
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
            const res = await fetch('/api/admin/clients');
            if (res.ok) {
                const data = await res.json();
                setRealClients(data);
            }
        } catch (e) {
            console.error("Failed fetching clients", e);
        }
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
            fetchClients();
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
            const response = await fetch('/api/admin/create-client', {
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

    const handleAddSection = () => {
        setLiveData(prev => ({
            ...prev,
            customSections: [
                ...(prev.customSections || []),
                {
                    id: Math.random().toString(36).substring(7),
                    backgroundUrl: '',
                    overlayType: 'text',
                    textContent: '',
                    fontFamily: 'font-serif'
                }
            ]
        }));
    };

    const handleRemoveSection = (index: number) => {
        setLiveData(prev => {
            const arr = [...(prev.customSections || [])];
            arr.splice(index, 1);
            return { ...prev, customSections: arr };
        });
    };

    const handleSectionChange = (index: number, field: string, value: string) => {
        setLiveData(prev => {
            const arr = [...(prev.customSections || [])];
            arr[index] = { ...arr[index], [field]: value };
            return { ...prev, customSections: arr };
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setLiveData(prev => ({ ...prev, [name]: value }));
    };

    const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedTheme = e.target.value;
        setThemeSelection(selectedTheme);
        setLiveData(prev => ({ ...prev, theme: THEME_PRESETS[selectedTheme] }));
    };

    const handleSaveInvitation = async () => {
        if (!liveData.slug) {
            alert("No client selected");
            return;
        }

        if (!liveData.bride.trim() || !liveData.groom.trim()) {
            alert("Bride and Groom names are mandatory fields.");
            return;
        }

        setIsSaving(true);
        try {
            let updatedHeroImage = liveData.heroImage;
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
            let updatedDetailsBg = liveData.detailsBackgroundUrl;

            if (heroImageFile) updatedHeroImage = await uploadFile(heroImageFile, liveData.heroImage, setHeroImageFile);
            if (heroVideoFile) updatedHeroVideo = await uploadFile(heroVideoFile, liveData.heroVideo, setHeroVideoFile);
            if (heroLogoFile) updatedHeroLogoUrl = await uploadFile(heroLogoFile, liveData.heroLogoUrl, setHeroLogoFile);
            if (audioFile) updatedAudioUrl = await uploadFile(audioFile, liveData.audioUrl, setAudioFile);
            if (formalImageFile) updatedFormalImage = await uploadFile(formalImageFile, liveData.formalInvitationImage, setFormalImageFile);
            if (detailsBgFile) updatedDetailsBg = await uploadFile(detailsBgFile, liveData.detailsBackgroundUrl, setDetailsBgFile);

            const updatedCustomSections = await Promise.all((liveData.customSections || []).map(async (section) => {
                const files = customFiles[section.id];
                let bgUrl = section.backgroundUrl;
                let overlayUrl = section.overlayImageUrl;

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

            // Clear custom files to prevent duplicate uploads
            setCustomFiles({});

            const payloadToSave = {
                ...liveData,
                heroImage: updatedHeroImage,
                heroVideo: updatedHeroVideo,
                heroLogoUrl: updatedHeroLogoUrl,
                audioUrl: updatedAudioUrl,
                formalInvitationImage: updatedFormalImage,
                detailsBackgroundUrl: updatedDetailsBg,
                customSections: updatedCustomSections
            };

            const response = await fetch('/api/admin/invitation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadToSave)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save');
            }
            
            setLiveData(payloadToSave);
            alert("Invitation Saved Successfully!");
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingAuth) {
        return <div className="h-screen w-full flex items-center justify-center bg-stone-50"><p className="text-stone-500 animate-pulse">Loading Admin Workspace...</p></div>;
    }

    return (
        <div className="flex bg-surface text-on-surface font-body overflow-x-hidden relative h-screen w-full">
            {/* Sidebar - Admin Navigation */}
            <aside className="hidden md:flex flex-col h-full py-8 px-4 bg-surface-container-low text-primary w-64 shrink-0 whitespace-separation z-20 scrollbar-hide">
                <div className="mb-8 px-4">
                    <h1 className="text-lg font-headline text-primary">Oui-Do Admin</h1>
                    <p className="text-[0.75rem] font-label uppercase tracking-wider text-secondary mt-1">Editorial Workspace</p>
                </div>

                <div className="px-4 mb-4">
                    <button
                        onClick={() => {
                            setLiveData(defaultData);
                            setIsCreatingClient(true);
                            setHeroImageFile(null); setHeroImagePreview(null);
                            setHeroVideoFile(null); setHeroVideoPreview(null);
                            setHeroLogoFile(null); setHeroLogoPreview(null);
                            setAudioFile(null); setAudioPreview(null);
                            setFormalImageFile(null); setFormalImagePreview(null);
                            setDetailsBgFile(null); setDetailsBgPreview(null);
                            setCustomFiles({});
                        }}
                        className="w-full py-4 px-6 rounded-full text-[10px] font-label uppercase tracking-widest transition-all hover:opacity-90 font-bold text-on-primary shadow-xl shadow-primary/10"
                        style={{ background: 'linear-gradient(135deg, #00150F 0%, #062C22 100%)' }}
                    >
                        New Client Instance
                    </button>
                </div>

                <div className="flex-1 px-0 flex flex-col pt-8">
                    <nav className="flex-1 space-y-2">
                        <button
                            className="w-full flex items-center gap-3 text-secondary py-3 px-8 hover:bg-surface-container-lowest hover:text-primary rounded-r-full transition-all duration-200"
                        >
                            <LayoutDashboard className="w-5 h-5" />
                            <span className="font-label uppercase tracking-[0.05em] text-[0.75rem] font-medium">Dashboard</span>
                        </button>
                        <button
                            className={`w-full flex items-center gap-3 py-3 px-8 rounded-r-full transition-all duration-200 ${activeTab === 'clients-list' ? 'text-primary font-bold bg-surface-container-lowest shadow-sm scale-[0.99]' : 'text-secondary hover:bg-surface-container-lowest hover:text-primary'}`}
                            onClick={() => {
                                setLiveData(defaultData); // Clear builder
                                setActiveTab('clients-list');
                                setHeroImageFile(null); setHeroImagePreview(null);
                                setHeroVideoFile(null); setHeroVideoPreview(null);
                                setHeroLogoFile(null); setHeroLogoPreview(null);
                                setAudioFile(null); setAudioPreview(null);
                                setFormalImageFile(null); setFormalImagePreview(null);
                                setDetailsBgFile(null); setDetailsBgPreview(null);
                                setCustomFiles({});
                            }}
                        >
                            <Users className="w-5 h-5" />
                            <span className="font-label uppercase tracking-[0.05em] text-[0.75rem] font-bold">Active Clients</span>
                        </button>
                    </nav>

                    <div className="mt-auto px-6 mb-4">
                        <div className="flex items-center justify-between px-3 py-3 bg-surface-container-highest/20 rounded-xl">
                            <span className="text-[0.65rem] font-bold text-secondary uppercase tracking-widest">Mock Mode</span>
                            <button
                                onClick={() => setUseMocks(!useMocks)}
                                className={`w-8 h-4 rounded-full relative transition-colors ${useMocks ? 'bg-primary' : 'bg-surface-dim'}`}
                            >
                                <span className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white transition-transform ${useMocks ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-4 py-4 pt-4 border-t border-outline-variant/10">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-secondary hover:text-primary transition-colors font-label uppercase tracking-widest font-bold"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full relative bg-surface">

                {/* Top Nav Tabs */}
                {liveData.slug && activeTab !== 'clients-list' && (
                    <div className="h-14 border-b border-surface-container-highest flex items-center px-8 gap-0 shrink-0 bg-surface-container-low/50">
                        {/* Back Button + Client Name */}
                        <button
                            onClick={() => {
                                setLiveData(defaultData);
                                setActiveTab('clients-list');
                                setHeroImageFile(null); setHeroImagePreview(null);
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
                        </div>
                    </div>
                )}

                <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden relative">

                    {activeTab === 'clients-list' && !isCreatingClient && (
                        <div className="w-full h-full overflow-y-auto w-full max-w-[1600px] mx-auto p-8 md:p-12 lg:p-16">
                            {/* Header Section */}
                            <header className="mb-16">
                                <div className="flex justify-between items-end mb-8">
                                    <div>
                                        <span className="font-label uppercase tracking-[0.2em] text-[0.7rem] font-semibold text-secondary mb-3 block">Portfolio Management</span>
                                        <h2 className="font-headline text-[3.5rem] leading-tight text-primary">Active Clients</h2>
                                    </div>
                                    <div className="hidden md:flex items-center gap-4 bg-surface-container-low p-2 rounded-full px-6 py-3 border border-outline-variant/10">
                                        <Search className="w-5 h-5 text-primary" />
                                        <input
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 text-sm font-body w-64 placeholder:text-secondary/50 outline-none"
                                            placeholder="Search clients or dates..."
                                            type="text"
                                        />
                                        <span className="w-px h-6 bg-outline-variant/30"></span>
                                        <button className="flex items-center gap-2 text-secondary hover:text-primary transition-colors">
                                            <span className="text-[0.75rem] font-bold uppercase tracking-wider">Filter</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Insight Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <p className="font-label uppercase tracking-widest text-[0.7rem] font-bold text-secondary mb-4">Total Active Weddings</p>
                                            <h3 className="font-headline text-5xl text-primary">24</h3>
                                            <p className="mt-4 text-[0.8rem] text-secondary flex items-center gap-1 italic">
                                                <span className="text-green-600 text-sm font-bold mr-1">↑</span> +3 from last month
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 hidden md:block">
                                        <p className="font-label uppercase tracking-widest text-[0.7rem] font-bold text-secondary mb-4">Upcoming This Week</p>
                                        <h3 className="font-headline text-5xl text-primary">02</h3>
                                        <p className="mt-4 text-[0.8rem] text-secondary">Awaiting final confirmations</p>
                                    </div>
                                    <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 hidden md:block">
                                        <p className="font-label uppercase tracking-widest text-[0.7rem] font-bold text-secondary mb-4">Client Satisfaction</p>
                                        <h3 className="font-headline text-5xl text-primary">98%</h3>
                                        <p className="mt-4 text-[0.8rem] text-secondary italic">Editorial Benchmark: High</p>
                                    </div>
                                </div>
                            </header>

                            {/* Editorial Grid / Table */}
                            <section>
                                <div className="mb-6 flex items-center justify-between px-4">
                                    <div className="flex gap-8">
                                        <button className="text-[0.75rem] font-bold uppercase tracking-wider text-primary border-b-2 border-primary pb-2">All Clients</button>
                                        <button className="text-[0.75rem] font-bold uppercase tracking-wider text-secondary hover:text-primary transition-colors pb-2">In Progress</button>
                                        <button className="text-[0.75rem] font-bold uppercase tracking-wider text-secondary hover:text-primary transition-colors pb-2">Live</button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {(useMocks ? mockClients : realClients).filter(c => c.slug.includes(searchQuery.toLowerCase())).map(client => (
                                        <div key={client.id} className="group bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-300 rounded-xl p-6 flex items-center justify-between border border-transparent hover:border-outline-variant/20 shadow-sm cursor-pointer" onClick={async () => {
                                            try {
                                                const res = await fetch(`/api/invitation?slug=${client.slug}`);
                                                if (res.ok) {
                                                    const dbData = await res.json();
                                                    if (dbData) {
                                                        setThemeSelection(dbData.theme ? Object.keys(THEME_PRESETS).find(k => THEME_PRESETS[k].accent === (dbData.theme as Theme).accent) || 'emerald' : 'emerald');
                                                        setLiveData({ ...defaultData, ...dbData, theme: dbData.theme || THEME_PRESETS.emerald });
                                                    } else {
                                                        setLiveData({ ...defaultData, slug: client.slug, bride: client.bride, groom: client.groom });
                                                    }
                                                    setHeroImageFile(null); setHeroImagePreview(null);
                                                    setHeroVideoFile(null); setHeroVideoPreview(null);
                                                    setHeroLogoFile(null); setHeroLogoPreview(null);
                                                    setAudioFile(null); setAudioPreview(null);
                                                    const exp = await getExpensesBySlug(client.slug);
                                                    setExpenses(exp);
                                                    const seatData = await getSeatingData(client.slug);
                                                    setSeatingTables(seatData.tables);
                                                    setSeatingGuests(seatData.guests);
                                                    setActiveTab('builder'); // Transition to Builder
                                                }
                                            } catch (e) { console.error(e); }
                                        }}>
                                            <div className="flex items-center gap-6 w-[60%] md:w-1/3">
                                                <div className="w-16 h-16 rounded-full bg-surface-container-high overflow-hidden flex-shrink-0 border border-outline-variant/10">
                                                    {client.heroImage ? (
                                                        <img src={client.heroImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="Hero" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-outline-variant"><Users className="w-6 h-6 opacity-40" /></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-headline text-xl text-primary">{client.bride} & {client.groom}</h4>
                                                    <p className="font-body text-xs text-secondary mt-1 tracking-widest lowercase">slug: /{client.slug}</p>
                                                </div>
                                            </div>
                                            <div className="hidden md:block w-1/4">
                                                <span className="font-label uppercase tracking-widest text-[0.65rem] font-bold text-secondary block mb-1">Wedding Date</span>
                                                <p className="font-body text-sm font-semibold text-primary">{client.date || 'TBD'}</p>
                                            </div>
                                            <div className="hidden md:block w-1/6">
                                                <span className="font-label uppercase tracking-widest text-[0.65rem] font-bold text-secondary block mb-1">Status</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                                                    <span className="font-body text-xs font-bold text-primary">In Progress</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <button className="p-3 rounded-full text-secondary hover:bg-surface-container-highest hover:text-primary transition-all">
                                                    <ChevronRight className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {(activeTab === 'builder' || isCreatingClient) && (
                        <>
                            {/* Onboard Client Form Native */}
                            {isCreatingClient && (
                                <div className="absolute inset-0 z-50 flex flex-col overflow-y-auto bg-surface backdrop-blur-sm px-6 py-12 md:py-24 animate-in fade-in duration-300">
                                    <div className="max-w-4xl mx-auto w-full space-y-16">

                                        <div className="flex justify-between items-start">
                                            <div className="space-y-4">
                                                <h2 className="text-5xl font-headline text-primary tracking-tight">New Client Instance</h2>
                                                <p className="text-lg text-secondary max-w-xl leading-relaxed">This securely generates a new user account with client permissions and binds it to a unique URL slug.</p>
                                            </div>
                                            <button onClick={() => setIsCreatingClient(false)} className="text-secondary hover:text-primary font-bold uppercase tracking-widest text-sm p-4">✕ Close</button>
                                        </div>

                                        {onboardMessage && (
                                            <div className={`p-4 text-sm rounded-xl border ${onboardMessage.type === 'error' ? 'bg-error-container/20 text-error border-error/30' : 'bg-primary-fixed/30 text-primary border-primary/20'}`}>
                                                {onboardMessage.text}
                                            </div>
                                        )}

                                        <form onSubmit={handleCreateClient} className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="space-y-3">
                                                <label className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary ml-1">Client Email</label>
                                                <input type="email" required value={newClientForm.email} onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-6 py-5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-lg font-body" placeholder="client@example.com" />
                                            </div>
                                            <div className="space-y-3 relative">
                                                <label className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary ml-1">Assigned Wedding Slug</label>
                                                <div className="relative">
                                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-outline-variant text-lg font-body">oui-do.com/</span>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newClientForm.slug}
                                                        onChange={e => {
                                                            setNewClientForm({ ...newClientForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') });
                                                            setShowSlugDropdown(true);
                                                        }}
                                                        onFocus={() => setShowSlugDropdown(true)}
                                                        onBlur={() => setTimeout(() => setShowSlugDropdown(false), 200)}
                                                        className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg pl-[8.5rem] pr-6 py-5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-lg font-body"
                                                        placeholder="maya-and-john"
                                                    />
                                                </div>

                                                {/* Suggestions Dropdown */}
                                                {showSlugDropdown && (
                                                    <div className="absolute top-[100%] left-0 mt-2 w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-[60] font-body">
                                                        {(useMocks ? mockClients : realClients)
                                                            .filter(c => c.slug.includes(newClientForm.slug.toLowerCase()))
                                                            .map(c => (
                                                                <button
                                                                    key={c.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setNewClientForm({ ...newClientForm, slug: c.slug });
                                                                        setShowSlugDropdown(false);
                                                                    }}
                                                                    className="w-full text-left px-6 py-3 text-sm hover:bg-surface-container-low flex justify-between items-center border-b border-surface-variant/50 last:border-0 transition-colors"
                                                                >
                                                                    <span className="font-medium text-primary text-base">{c.slug}</span>
                                                                    <span className="text-secondary">{c.bride} & {c.groom}</span>
                                                                </button>
                                                            ))}
                                                        {newClientForm.slug && !(useMocks ? mockClients : realClients).some(c => c.slug === newClientForm.slug) && (
                                                            <div className="px-6 py-4 text-sm text-secondary italic border-t border-surface-variant/50">
                                                                Create new slug: "{newClientForm.slug}"
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3 md:col-span-2">
                                                <label className="text-[0.75rem] font-label font-bold uppercase tracking-[0.1em] text-secondary ml-1">Temporary Password</label>
                                                <input type="password" required value={newClientForm.password} onChange={e => setNewClientForm({ ...newClientForm, password: e.target.value })} className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-6 py-5 text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-lg font-body" placeholder="••••••••••••" minLength={6} />
                                                <p className="text-xs text-secondary/70 mt-3 px-1">We recommend a secure, auto-generated string for the first login.</p>
                                            </div>

                                            <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-8 pt-10 border-t border-surface-container-high">
                                                <button type="submit" disabled={onboardLoading} style={{ background: 'linear-gradient(135deg, #00150F 0%, #062C22 100%)' }} className="w-full md:w-auto px-12 py-5 text-on-primary rounded-full text-sm font-label font-bold uppercase tracking-widest shadow-xl shadow-primary/10 hover:opacity-90 transition-opacity disabled:opacity-50">
                                                    {onboardLoading ? 'Provisioning...' : 'Create Account'}
                                                </button>
                                                <button type="button" onClick={() => setIsCreatingClient(false)} className="text-sm font-label font-bold uppercase tracking-widest text-secondary hover:text-primary transition-colors">
                                                    Cancel & Return
                                                </button>
                                            </div>
                                        </form>

                                        <div className="mt-32 opacity-20 flex justify-center pb-24">
                                            <img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2669&auto=format&fit=crop" className="w-64 h-64 object-cover rounded-full filter grayscale sepia mix-blend-multiply" alt="Elegant flair" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Center Column - Builder Form */}
                            <div className="flex flex-1 overflow-hidden h-full w-full">
                                {/* Left Column: Editor & Controls */}
                                <div className={`w-full lg:w-3/5 h-full overflow-y-auto bg-surface p-8 md:p-12 lg:p-16 transition-opacity ${isCreatingClient ? 'opacity-20 pointer-events-none' : ''}`}>
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

                                        {/* Section 01: The Couple */}
                                        <section>
                                            <div className="flex justify-between items-center mb-8">
                                                <h2 className="text-2xl font-headline text-primary">The Couple</h2>
                                                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 01</span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-1.5">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Partner One Name</label>
                                                    <input required type="text" name="bride" value={liveData.bride} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Partner Two Name</label>
                                                    <input required type="text" name="groom" value={liveData.groom} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                </div>
                                            </div>
                                        </section>

                                        {/* Section 02: HERO Section */}
                                        <section>
                                            <div className="flex justify-between items-center mb-8">
                                                <h2 className="text-2xl font-headline text-primary">HERO Section</h2>
                                                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 02</span>
                                            </div>
                                            <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
                                                <div className="space-y-1.5">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Event Hero Image</label>
                                                    {heroImagePreview || liveData.heroImage ? (
                                                        <div className="mb-2">
                                                            <img src={heroImagePreview || liveData.heroImage} alt="Hero Preview" className="h-24 w-auto rounded-md object-cover border border-outline-variant/20" />
                                                        </div>
                                                    ) : null}
                                                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setHeroImageFile, setHeroImagePreview, heroImagePreview)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Hero Video Render</label>
                                                    {heroVideoPreview || liveData.heroVideo ? (
                                                        <div className="mb-2 text-sm text-primary font-medium break-all">
                                                            Current: {heroVideoFile?.name || liveData.heroVideo}
                                                        </div>
                                                    ) : null}
                                                    <input type="file" accept="video/mp4,video/*" onChange={(e) => handleFileChange(e, setHeroVideoFile, setHeroVideoPreview, heroVideoPreview)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                                                </div>

                                                <div className="flex items-center justify-between mt-6">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Hero Graphics Rendering</label>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            name="showHeroLogo"
                                                            className="sr-only peer"
                                                            checked={liveData.showHeroLogo || false}
                                                            onChange={(e) => setLiveData(prev => ({ ...prev, showHeroLogo: e.target.checked }))}
                                                        />
                                                        <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                        <span className="ms-3 text-[0.75rem] font-label uppercase text-primary font-bold">Graphic Toggle</span>
                                                    </label>
                                                </div>

                                                {liveData.showHeroLogo && (
                                                    <div className="space-y-1.5">
                                                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Hero Logo (PNG Formatted)</label>
                                                        {heroLogoPreview || liveData.heroLogoUrl ? (
                                                            <div className="mb-2 bg-surface-container-highest p-2 rounded-md inline-block">
                                                                <img src={heroLogoPreview || liveData.heroLogoUrl} alt="Logo Preview" className="h-16 w-auto object-contain" />
                                                            </div>
                                                        ) : null}
                                                        <input type="file" accept="image/png" onChange={(e) => handleFileChange(e, setHeroLogoFile, setHeroLogoPreview, heroLogoPreview)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                                                    </div>
                                                )}

                                                <div className="space-y-1.5 pt-4 border-t border-outline-variant/20">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Styling Theme Token</label>
                                                    <select name="themeSelection" value={themeSelection} onChange={handleThemeChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body font-semibold">
                                                        <option value="emerald">Emerald & Stone (Default Pattern)</option>
                                                        <option value="slate">Slate & Monochrome</option>
                                                        <option value="rose">Rose & Blush</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Section 03: Formal Invitation */}
                                        <section>
                                            <div className="flex justify-between items-center mb-8">
                                                <div className="flex items-center gap-4">
                                                    <h2 className="text-2xl font-headline text-primary">Formal Invitation</h2>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            name="showFormalInvitation"
                                                            className="sr-only peer"
                                                            checked={liveData.showFormalInvitation || false}
                                                            onChange={(e) => setLiveData(prev => ({ ...prev, showFormalInvitation: e.target.checked }))}
                                                        />
                                                        <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                                        <span className="ms-3 text-[0.75rem] font-label uppercase text-primary tracking-widest font-bold">Formal Image Override</span>
                                                    </label>
                                                </div>
                                                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 03</span>
                                            </div>
                                            <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
                                                {liveData.showFormalInvitation && (
                                                    <div className="space-y-1.5">
                                                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Formal Invitation Image</label>
                                                        {formalImagePreview || liveData.formalInvitationImage ? (
                                                            <div className="mb-2 text-sm text-primary font-medium break-all border border-outline-variant/20 rounded-md overflow-hidden inline-block">
                                                                <img src={formalImagePreview || liveData.formalInvitationImage} alt="Formal Invite" className="h-32 w-auto object-cover" />
                                                            </div>
                                                        ) : null}
                                                        <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setFormalImageFile, setFormalImagePreview, formalImagePreview)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                                                        <p className="text-[10px] text-secondary/70 mt-2 font-label tracking-widest uppercase">Provides a full-screen image fallback instead of native UI text blocks.</p>
                                                    </div>
                                                )}

                                                {!liveData.showFormalInvitation && (
                                                    <div className="space-y-6">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Event Specific Detail Texture Background Image</label>
                                                            {detailsBgPreview || liveData.detailsBackgroundUrl ? (
                                                                <div className="mb-2 text-sm text-primary font-medium break-all border border-outline-variant/20 rounded-md overflow-hidden inline-block">
                                                                    <img src={detailsBgPreview || liveData.detailsBackgroundUrl} alt="Details Bg" className="h-24 w-auto object-cover" />
                                                                </div>
                                                            ) : null}
                                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, setDetailsBgFile, setDetailsBgPreview, detailsBgPreview)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-1.5 pt-4 border-t border-outline-variant/20">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Background Audio</label>
                                                    {audioPreview || liveData.audioUrl ? (
                                                        <div className="mb-2 text-sm text-primary font-medium break-all">
                                                            Current: {audioFile?.name || liveData.audioUrl}
                                                        </div>
                                                    ) : null}
                                                    <input type="file" accept="audio/*" onChange={(e) => handleFileChange(e, setAudioFile, setAudioPreview, audioPreview)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                                                </div>
                                            </div>
                                        </section>

                                        {/* Section 04: Ceremony Details */}
                                        <section>
                                            <div className="flex justify-between items-center mb-8">
                                                <h2 className="text-2xl font-headline text-primary">Ceremony Details</h2>
                                                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 04</span>
                                            </div>
                                            <div className="space-y-8">
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Ceremony Date</label>
                                                        <input type="date" name="date" value={liveData.date} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Starting Time</label>
                                                        <input type="time" name="time" value={liveData.time} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Venue Name</label>
                                                    <input type="text" name="venue" value={liveData.venue} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Geographical Details</label>
                                                    <input type="text" name="location" value={liveData.location} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Google Maps Itinerary URL</label>
                                                    <input type="text" name="mapLink" value={liveData.mapLink || ''} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                </div>
                                            </div>
                                        </section>

                                        {/* Section 05: Reception Block */}
                                        <section>
                                            <div className="flex justify-between items-center mb-8">
                                                <h2 className="text-2xl font-headline text-primary">Formal Reception</h2>
                                                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 05</span>
                                            </div>
                                            <div className="bg-surface-container-lowest border border-outline-variant/20 p-8 rounded-xl space-y-6">
                                                <div className="grid grid-cols-2 gap-8">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Reception Time</label>
                                                        <input type="time" name="receptionTime" value={liveData.receptionTime || ''} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Reception Venue</label>
                                                        <input type="text" name="receptionVenue" value={liveData.receptionVenue || ''} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Reception Address</label>
                                                    <input type="text" name="receptionLocation" value={liveData.receptionLocation || ''} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Welcome Note</label>
                                                    <textarea name="message" value={liveData.message} onChange={handleInputChange} rows={3} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body resize-none" />
                                                </div>
                                            </div>
                                        </section>

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
                                                    <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest ml-4">Section 06</span>
                                                </div>
                                            </div>

                                            {liveData.customSections?.length === 0 ? (
                                                <p className="text-[0.875rem] font-body text-secondary italic text-center py-8 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">No custom editorial narrative blocks appended yet.</p>
                                            ) : (
                                                <div className="space-y-8">
                                                    {liveData.customSections?.map((section, idx) => (
                                                        <div key={section.id} className="p-8 border border-outline-variant/20 rounded-2xl bg-surface-container-lowest shadow-sm space-y-6 relative group overflow-hidden">
                                                            <div className="absolute top-0 left-0 w-2 h-full bg-primary/10"></div>
                                                            <button
                                                                onClick={() => handleRemoveSection(idx)}
                                                                className="absolute top-6 right-6 text-secondary hover:text-error transition-colors"
                                                                title="Remove Script"
                                                            >
                                                                <span className="text-xs font-label uppercase tracking-widest font-bold">Remove</span>
                                                            </button>

                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-surface-container-high pb-4 gap-4 pr-20">
                                                                <span className="text-[0.75rem] font-label font-bold text-primary uppercase tracking-[0.1em]">Editorial Block 0{idx + 1}</span>
                                                                <select
                                                                    value={section.overlayType}
                                                                    onChange={(e) => handleSectionChange(idx, 'overlayType', e.target.value)}
                                                                    className="text-[0.75rem] font-label uppercase tracking-widest font-medium border border-outline-variant/30 rounded-md px-3 py-1.5 text-on-surface focus:outline-none focus:border-primary bg-surface"
                                                                >
                                                                    <option value="text">Textual Mode</option>
                                                                    <option value="image">Graphic Mode</option>
                                                                </select>
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Cinematic Background Image</label>
                                                                {customFiles[section.id]?.bgPreview || section.backgroundUrl ? (
                                                                    <div className="mb-2 text-sm text-primary font-medium break-all border border-outline-variant/20 rounded-md overflow-hidden inline-block bg-black">
                                                                        <img src={customFiles[section.id]?.bgPreview || section.backgroundUrl} alt={`Custom bg ${idx}`} className="h-24 w-auto object-cover opacity-80" />
                                                                    </div>
                                                                ) : null}
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => handleCustomFileChange(e, section.id, 'bg')}
                                                                    className="w-full bg-surface border-outline-variant/30 border rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90"
                                                                />
                                                            </div>

                                                            {section.overlayType === 'text' ? (
                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                    <div className="md:col-span-2 space-y-1.5">
                                                                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Editorial Script content</label>
                                                                        <textarea
                                                                            value={section.textContent || ''}
                                                                            onChange={(e) => handleSectionChange(idx, 'textContent', e.target.value)}
                                                                            rows={2}
                                                                            className="w-full bg-surface border-outline-variant/30 border rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body resize-none"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Typography Style</label>
                                                                        <select
                                                                            value={section.fontFamily || 'font-sans'}
                                                                            onChange={(e) => handleSectionChange(idx, 'fontFamily', e.target.value)}
                                                                            className="w-full bg-surface border-outline-variant/30 border rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body"
                                                                        >
                                                                            <option value="font-sans">Modern Sans</option>
                                                                            <option value="font-serif">Elegant Serif</option>
                                                                            <option value="font-script">Signature Script</option>
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Foreground Transparency Graphic (PNG)</label>
                                                                    {customFiles[section.id]?.overlayPreview || section.overlayImageUrl ? (
                                                                        <div className="mb-2 bg-surface-container-highest p-2 rounded-md inline-block">
                                                                            <img src={customFiles[section.id]?.overlayPreview || section.overlayImageUrl} alt={`Overlay ${idx}`} className="h-16 w-auto object-contain" />
                                                                        </div>
                                                                    ) : null}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/png"
                                                                        onChange={(e) => handleCustomFileChange(e, section.id, 'overlay')}
                                                                        className="w-full bg-surface border-outline-variant/30 border rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </section>

                                        {/* Section 07: Registry Blocks */}
                                        <section>
                                            <div className="flex justify-between items-center mb-8">
                                                <h2 className="text-2xl font-headline text-primary">Registry Details</h2>
                                                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 07</span>
                                            </div>
                                            <div className="bg-surface-container-latest p-8 space-y-6">
                                                <div className="space-y-1.5">
                                                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Message & Gratitude Tone</label>
                                                    <textarea name="giftMessage" value={liveData.giftMessage || ''} onChange={handleInputChange} rows={2} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body resize-none" />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Bank Account Beneficiary</label>
                                                        <input type="text" name="bankAccountName" value={liveData.bankAccountName || ''} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Electronic Code / IBAN</label>
                                                        <input type="text" name="bankAccountNumber" value={liveData.bankAccountNumber || ''} onChange={handleInputChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                </div>
                                {/* Right Column - Live Preview */}
                                {(() => {
                                    const previewData = {
                                        ...liveData,
                                        ...(heroImagePreview && { heroImage: heroImagePreview }),
                                        ...(heroVideoPreview && { heroVideo: heroVideoPreview }),
                                        ...(heroLogoPreview && { heroLogoUrl: heroLogoPreview }),
                                        ...(audioPreview && { audioUrl: audioPreview }),
                                        ...(formalImagePreview && { formalInvitationImage: formalImagePreview }),
                                        ...(detailsBgPreview && { detailsBackgroundUrl: detailsBgPreview }),
                                        customSections: liveData.customSections?.map(section => {
                                            const files = customFiles[section.id];
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
                                        <div className={`hidden lg:block lg:w-2/5 h-full bg-stone-100 relative overflow-hidden transition-opacity ${isCreatingClient ? 'opacity-20 pointer-events-none' : ''}`}>
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
                                                <div className="pointer-events-auto">
                                                    {liveData.slug ? (
                                                        <InvitationPreview data={previewData} />
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center text-stone-400 italic">Select a client from the sidebar to preview</div>
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
                            <BudgetTracker slug={liveData.slug} initialExpenses={expenses} isAdmin={true} />
                        </div>
                    )}

                    {activeTab === 'seating' && !isCreatingClient && (
                        <div className="w-full h-full overflow-y-auto p-8 bg-surface-container-low">
                            <TableSeating slug={liveData.slug} initialTables={seatingTables} initialGuests={seatingGuests} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
