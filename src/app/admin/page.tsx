"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import InvitationPreview, { InvitationData, Theme } from '@/components/InvitationPreview';
import { LogOut, Users, Plus, LayoutDashboard, Search, ChevronRight, Copy } from 'lucide-react';
import BudgetTracker from '@/components/BudgetTracker';
import { getExpensesBySlug, SelectExpense } from '@/app/actions/budget';

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

    // Budget State
    const [activeTab, setActiveTab] = useState<'clients-list' | 'builder' | 'budget'>('clients-list');
    const [expenses, setExpenses] = useState<SelectExpense[]>([]);

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
            const response = await fetch('/api/admin/invitation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(liveData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to save');
            }
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
        <div className="flex h-screen w-full font-body overflow-hidden bg-surface text-on-surface">

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
                    <div className="h-14 border-b border-surface-container-highest flex items-center px-8 gap-8 shrink-0 bg-surface-container-low/50">
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
                                                    const exp = await getExpensesBySlug(client.slug);
                                                    setExpenses(exp);
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
                            <div className={`w-full lg:w-1/2 h-full overflow-y-auto bg-white p-8 md:p-12 lg:p-16 border-r border-stone-200 transition-opacity ${isCreatingClient ? 'opacity-20 pointer-events-none' : ''}`}>
                                <div className="max-w-xl mx-auto">
                                    <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h1 className="text-3xl font-serif text-stone-800 mb-2">Invitation Builder</h1>
                                            <p className="text-stone-500 font-light">Editing {liveData.slug ? `/${liveData.slug}` : 'a new invitation'}</p>
                                        </div>
                                        {liveData.slug && (
                                            <button
                                                onClick={() => {
                                                    const url = `${window.location.origin}/invite/${liveData.slug}`;
                                                    navigator.clipboard.writeText(url);
                                                    alert("General Invitation Link copied!");
                                                }}
                                                className="flex flex-shrink-0 items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-md transition-colors text-sm"
                                            >
                                                <Copy className="w-4 h-4" /> Copy General Link
                                            </button>
                                        )}
                                    </div>

                                    {/* Existing Builder Form UI */}
                                    <div className="space-y-8">
                                        {/* Section: Couple */}
                                        <div className="space-y-6">
                                            <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-2">The Couple</h2>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Bride Name *</label>
                                                    <input required type="text" name="bride" value={liveData.bride} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Groom Name *</label>
                                                    <input required type="text" name="groom" value={liveData.groom} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Formal Invitation */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                                                <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400">Formal Invitation Section</h2>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        name="showFormalInvitation"
                                                        className="sr-only peer"
                                                        checked={liveData.showFormalInvitation || false}
                                                        onChange={(e) => setLiveData(prev => ({ ...prev, showFormalInvitation: e.target.checked }))}
                                                    />
                                                    <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                                    <span className="ml-3 text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors">Enable</span>
                                                </label>
                                            </div>

                                            {liveData.showFormalInvitation && (
                                                <div className="p-4 bg-stone-50 rounded-lg border border-stone-100 space-y-6">
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Formal Invitation Image URL</label>
                                                        <input type="text" name="formalInvitationImage" value={liveData.formalInvitationImage || ''} onChange={handleInputChange} placeholder="https://.../formal-invitation.jpg" className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:emerald-500 focus:border-transparent transition-all text-sm bg-white" />
                                                        <p className="text-[10px] text-stone-400">Provide a high-quality image of the formal invitation. It will be displayed full-size.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Section: Event Details */}
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                                                <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400">Ceremony Details</h2>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Date</label>
                                                    <input type="date" name="date" value={liveData.date} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Time</label>
                                                    <input type="time" name="time" value={liveData.time} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Ceremony Venue Name</label>
                                                <input type="text" name="venue" value={liveData.venue} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Ceremony Location</label>
                                                <input type="text" name="location" value={liveData.location} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Google Maps Link</label>
                                                <input type="text" name="mapLink" value={liveData.mapLink || ''} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                            </div>

                                            <div className="flex items-center justify-between border-b border-stone-100 pb-2 pt-6">
                                                <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400">Reception Details <span className="text-[10px] lowercase text-stone-400/80 ml-2">(optional override)</span></h2>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Reception Time</label>
                                                <input type="time" name="receptionTime" value={liveData.receptionTime || ''} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Reception Venue Name</label>
                                                <input type="text" name="receptionVenue" value={liveData.receptionVenue || ''} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Reception Location</label>
                                                <input type="text" name="receptionLocation" value={liveData.receptionLocation || ''} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                            </div>

                                            <div className="flex items-center justify-between border-b border-stone-100 pb-2 pt-6">
                                                <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400">Styling Options</h2>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Event Details Background Image URL</label>
                                                <input type="text" name="detailsBackgroundUrl" value={liveData.detailsBackgroundUrl || ''} onChange={handleInputChange} placeholder="https://.../texture.jpg" className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                                <p className="text-[10px] text-stone-400">Applies an elegant textured background behind the Ceremony & Reception blocks.</p>
                                            </div>
                                        </div>

                                        {/* Section: Media & Content */}
                                        <div className="space-y-6">
                                            <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-2">Media & Content</h2>
                                            <div className="p-4 bg-stone-50 rounded-lg border border-stone-100 space-y-6">
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                                                        <label className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Hero Section (Top)</label>
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                name="showHeroLogo"
                                                                className="sr-only peer"
                                                                checked={liveData.showHeroLogo || false}
                                                                onChange={(e) => setLiveData(prev => ({ ...prev, showHeroLogo: e.target.checked }))}
                                                            />
                                                            <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                                            <span className="ml-3 text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors">Use Logo Graphic</span>
                                                        </label>
                                                    </div>

                                                    {liveData.showHeroLogo && (
                                                        <div className="space-y-2 pb-2">
                                                            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Hero Logo URL (PNG)</label>
                                                            <input type="text" name="heroLogoUrl" value={liveData.heroLogoUrl || ''} onChange={handleInputChange} placeholder="https://.../logo.png" className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:emerald-500 transition-all text-sm bg-white" />
                                                        </div>
                                                    )}

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Video URL (MP4)</label>
                                                        <input type="text" name="heroVideo" value={liveData.heroVideo || ''} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:emerald-500 focus:border-transparent transition-all text-sm bg-white" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Fallback Image URL</label>
                                                        <input type="text" name="heroImage" value={liveData.heroImage || ''} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:emerald-500 focus:border-transparent transition-all text-sm bg-white" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Background Audio URL</label>
                                                <input type="text" name="audioUrl" value={liveData.audioUrl || ''} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Welcome Message</label>
                                                <textarea name="message" value={liveData.message} onChange={handleInputChange} rows={3} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none" />
                                            </div>
                                            <div className="space-y-4 pt-4 border-t border-stone-100">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Registry & Monetary Gifts</label>
                                                <textarea name="giftMessage" value={liveData.giftMessage || ''} onChange={handleInputChange} rows={2} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none" />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <input type="text" name="bankAccountName" value={liveData.bankAccountName || ''} onChange={handleInputChange} placeholder="Bank Account Name" className="w-full border border-stone-200 rounded-md p-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <input type="text" name="bankAccountNumber" value={liveData.bankAccountNumber || ''} onChange={handleInputChange} placeholder="Account / IBAN Number" className="w-full border border-stone-200 rounded-md p-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <input type="text" name="mobileTransferNumber" value={liveData.mobileTransferNumber || ''} onChange={handleInputChange} placeholder="Mobile Transfer Number" className="w-full border border-stone-200 rounded-md p-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section: Custom Blocks Builder */}
                                        <div className="space-y-6 pt-6 border-t border-stone-100">
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400">Custom Sections</h2>
                                                <button
                                                    type="button"
                                                    onClick={handleAddSection}
                                                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                                                >
                                                    <Plus className="w-3 h-3" /> Add Section
                                                </button>
                                            </div>

                                            {liveData.customSections?.length === 0 && (
                                                <p className="text-sm text-stone-400 italic text-center py-4">No custom sections added yet.</p>
                                            )}

                                            <div className="space-y-6">
                                                {liveData.customSections?.map((section, idx) => (
                                                    <div key={section.id} className="p-5 border border-stone-200 rounded-xl bg-white shadow-sm space-y-4 relative group">
                                                        <button
                                                            onClick={() => handleRemoveSection(idx)}
                                                            className="absolute top-4 right-4 text-stone-300 hover:text-red-500 transition-colors"
                                                            title="Remove Section"
                                                        >
                                                            ✕
                                                        </button>

                                                        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                                                            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Block {idx + 1}</span>
                                                            <select
                                                                value={section.overlayType}
                                                                onChange={(e) => handleSectionChange(idx, 'overlayType', e.target.value)}
                                                                className="text-xs font-medium border border-stone-200 rounded px-2 py-1 text-stone-600 focus:outline-none focus:border-emerald-500"
                                                            >
                                                                <option value="text">Text Overlay Mode</option>
                                                                <option value="image">Image Overlay Mode</option>
                                                            </select>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Background Image URL *</label>
                                                            <input
                                                                type="text"
                                                                value={section.backgroundUrl}
                                                                onChange={(e) => handleSectionChange(idx, 'backgroundUrl', e.target.value)}
                                                                placeholder="https://.../bg.jpg"
                                                                className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:emerald-500 transition-all text-sm"
                                                            />
                                                        </div>

                                                        {section.overlayType === 'text' ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                <div className="md:col-span-2 space-y-2">
                                                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Text Content</label>
                                                                    <textarea
                                                                        value={section.textContent || ''}
                                                                        onChange={(e) => handleSectionChange(idx, 'textContent', e.target.value)}
                                                                        rows={2}
                                                                        className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:emerald-500 transition-all text-sm resize-none"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Typography</label>
                                                                    <select
                                                                        value={section.fontFamily || 'font-sans'}
                                                                        onChange={(e) => handleSectionChange(idx, 'fontFamily', e.target.value)}
                                                                        className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:emerald-500 transition-all text-sm"
                                                                    >
                                                                        <option value="font-sans">Modern Sans</option>
                                                                        <option value="font-serif">Elegant Serif</option>
                                                                        <option value="font-script">Signature Script</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Foreground Image URL (PNG Typography)</label>
                                                                <input
                                                                    type="text"
                                                                    value={section.overlayImageUrl || ''}
                                                                    onChange={(e) => handleSectionChange(idx, 'overlayImageUrl', e.target.value)}
                                                                    placeholder="https://.../text-graphic.png"
                                                                    className="w-full border border-stone-200 rounded-md p-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:emerald-500 transition-all text-sm"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Section: Styling & Save */}
                                        <div className="space-y-6 pt-6 border-t border-stone-100">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Color Theme</label>
                                                <select name="themeSelection" value={themeSelection} onChange={handleThemeChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                                                    <option value="emerald">Emerald & Stone (Default)</option>
                                                    <option value="slate">Slate & Monochrome</option>
                                                    <option value="rose">Rose & Blush</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={handleSaveInvitation}
                                                disabled={isSaving}
                                                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-4 px-6 rounded-md shadow flex justify-center items-center disabled:opacity-50 transition-all"
                                            >
                                                {isSaving ? "Saving..." : "Save Invitation"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Live Preview */}
                            <div className={`w-full lg:w-1/2 h-full bg-stone-100 relative overflow-hidden transition-opacity ${isCreatingClient ? 'opacity-20 pointer-events-none' : ''}`}>
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
                                            <InvitationPreview data={liveData} />
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-stone-400 italic">Select a client from the sidebar to preview</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'budget' && !isCreatingClient && (
                        <div className="w-full h-full overflow-y-auto p-8 bg-surface-container-low">
                            <BudgetTracker slug={liveData.slug} initialExpenses={expenses} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
