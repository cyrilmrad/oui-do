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
    const [activeTab, setActiveTab] = useState<'builder' | 'budget'>('builder');
    const [expenses, setExpenses] = useState<SelectExpense[]>([]);

    // Static Mock Clients for Sidebar Visualization
    const mockClients = [
        { id: 1, slug: "nadine-and-tariq", bride: "Nadine", groom: "Tariq", email: "nadine@example.com" },
        { id: 2, slug: "sarah-and-marc", bride: "Sarah", groom: "Marc", email: "sarah@example.com" },
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
        <div className="h-screen w-full flex bg-stone-50 overflow-hidden font-sans">

            {/* Sidebar - Admin Navigation */}
            <aside className="w-80 bg-stone-950 text-stone-300 flex flex-col h-full flex-shrink-0 z-20">
                <div className="p-6 border-b border-stone-800">
                    <div className="flex items-center gap-3 text-white mb-2">
                        <LayoutDashboard className="w-6 h-6" />
                        <h2 className="text-xl font-serif">Admin Panel</h2>
                    </div>
                    <p className="text-xs font-mono text-stone-500">Workspace Management</p>
                </div>

                <div className="p-4 border-b border-stone-800">
                    <button
                        onClick={() => setIsCreatingClient(true)}
                        className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-2.5 px-4 rounded flex items-center justify-center gap-2 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" /> New Client Instance
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Use Mock Data</span>
                        <button
                            onClick={() => setUseMocks(!useMocks)}
                            className={`w-10 h-5 rounded-full relative transition-colors ${useMocks ? 'bg-emerald-600' : 'bg-stone-700'}`}
                        >
                            <span className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white transition-transform ${useMocks ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                        </button>
                    </div>

                    <div className="relative mb-6">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                        <input
                            type="text"
                            placeholder="Search clients..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-900 border border-stone-800 rounded-md py-2 pl-9 pr-4 text-sm text-stone-300 focus:outline-none focus:border-stone-600 transition-colors"
                        />
                    </div>

                    <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
                        <p className="text-xs uppercase tracking-wider text-stone-600 font-semibold mb-3 px-2">Active Clients</p>
                        {(useMocks ? mockClients : realClients).filter(c => c.slug.includes(searchQuery.toLowerCase())).map(client => (
                            <button
                                key={client.id}
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`/api/invitation?slug=${client.slug}`);
                                        if (res.ok) {
                                            const dbData = await res.json();
                                            if (dbData) {
                                                // Map DB fields back to state
                                                setThemeSelection(dbData.theme ? Object.keys(THEME_PRESETS).find(k => THEME_PRESETS[k].accent === (dbData.theme as Theme).accent) || 'emerald' : 'emerald');
                                                setLiveData({
                                                    ...defaultData,
                                                    ...dbData,
                                                    theme: dbData.theme || THEME_PRESETS.emerald
                                                });
                                            } else {
                                                // DB empty for this client
                                                setLiveData({ ...defaultData, slug: client.slug, bride: client.bride, groom: client.groom });
                                            }

                                            // Fetch expenses
                                            const exp = await getExpensesBySlug(client.slug);
                                            setExpenses(exp);
                                        }
                                    } catch (e) {
                                        console.error(e);
                                    }
                                }}
                                className={`w-full text-left px-3 py-3 rounded-md flex items-center justify-between group transition-colors ${liveData.slug === client.slug ? 'bg-stone-800 text-white' : 'hover:bg-stone-900'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center flex-shrink-0">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-sm font-medium truncate">{client.bride} & {client.groom}</p>
                                        <p className="text-xs text-stone-500 truncate">/{client.slug}</p>
                                    </div>
                                </div>
                                <ChevronRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${liveData.slug === client.slug ? 'opacity-100 text-emerald-500' : ''}`} />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-stone-800">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-stone-400 hover:text-white hover:bg-stone-900 rounded-md transition-colors"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full relative bg-white">

                {/* Top Nav Tabs */}
                {liveData.slug && (
                    <div className="h-14 border-b border-stone-200 flex items-center px-8 gap-8 shrink-0 bg-stone-50/50">
                        <button
                            onClick={() => setActiveTab('builder')}
                            className={`h-full flex items-center text-sm font-medium border-b-2 transition-colors ${activeTab === 'builder' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                        >
                            Invitation Builder
                        </button>
                        <button
                            onClick={() => setActiveTab('budget')}
                            className={`h-full flex items-center text-sm font-medium border-b-2 transition-colors ${activeTab === 'budget' ? 'border-stone-900 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
                        >
                            Budget Tracker
                        </button>
                    </div>
                )}

                <div className="flex-1 flex flex-col lg:flex-row w-full overflow-hidden relative">

                    {activeTab === 'builder' || !liveData.slug ? (
                        <>
                            {/* Overlay Form: Create New Client */}
                            {isCreatingClient && (
                                <div className="absolute inset-0 z-50 flex bg-white/50 backdrop-blur-sm">
                                    <div className="w-full max-w-md bg-white shadow-2xl border-r border-stone-200 p-8 flex flex-col h-full animate-in slide-in-from-left">
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="text-2xl font-serif text-stone-900">Onboard Client</h3>
                                            <button onClick={() => setIsCreatingClient(false)} className="text-stone-400 hover:text-stone-900">✕</button>
                                        </div>

                                        <p className="text-sm text-stone-500 mb-8">This securely generates a new user account with 'client' permissions and binds it to a unique URL slug.</p>

                                        {onboardMessage && (
                                            <div className={`mb-6 p-4 text-sm rounded-lg border ${onboardMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                {onboardMessage.text}
                                            </div>
                                        )}

                                        <form onSubmit={handleCreateClient} className="space-y-5 flex-1">
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Client Email</label>
                                                <input type="email" required value={newClientForm.email} onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })} className="w-full border border-stone-300 rounded p-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="client@example.com" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Temporary Password</label>
                                                <input type="password" required value={newClientForm.password} onChange={e => setNewClientForm({ ...newClientForm, password: e.target.value })} className="w-full border border-stone-300 rounded p-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="••••••••" minLength={6} />
                                            </div>
                                            <div className="space-y-2 relative">
                                                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Assigned Wedding Slug</label>
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
                                                    className="w-full border border-stone-300 rounded p-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                    placeholder="Type to search existing or create new... e.g. maya-and-john"
                                                />
                                                <p className="text-xs text-stone-400 mt-1">URL will be: /invite/{newClientForm.slug || '...'}</p>

                                                {/* Suggestions Dropdown */}
                                                {showSlugDropdown && (
                                                    <div className="absolute top-[70px] left-0 w-full bg-white border border-stone-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
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
                                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-stone-100 flex justify-between items-center"
                                                                >
                                                                    <span className="font-medium text-stone-700">{c.slug}</span>
                                                                    <span className="text-xs text-stone-400">{c.bride} & {c.groom}</span>
                                                                </button>
                                                            ))}
                                                        {newClientForm.slug && !(useMocks ? mockClients : realClients).some(c => c.slug === newClientForm.slug) && (
                                                            <div className="px-4 py-2 text-sm text-stone-500 italic border-t border-stone-100">
                                                                Create new slug: "{newClientForm.slug}"
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <button type="submit" disabled={onboardLoading} className="w-full bg-stone-900 text-white rounded p-3 text-sm font-medium mt-8 disabled:opacity-50">
                                                {onboardLoading ? 'Provisioning...' : 'Create Account'}
                                            </button>
                                        </form>
                                    </div>
                                    <div className="flex-1" onClick={() => setIsCreatingClient(false)}></div>
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
                                                        <label className="flex items-center cursor-pointer gap-2">
                                                            <span className="text-xs text-stone-500 font-medium">Use Logo Graphic</span>
                                                            <div className="relative inline-block w-10 h-5 align-middle select-none transition duration-200 ease-in">
                                                                <input
                                                                    type="checkbox"
                                                                    name="showHeroLogo"
                                                                    checked={liveData.showHeroLogo || false}
                                                                    onChange={(e) => setLiveData(prev => ({ ...prev, showHeroLogo: e.target.checked }))}
                                                                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-stone-300 appearance-none cursor-pointer"
                                                                />
                                                                <label className="toggle-label block overflow-hidden h-5 rounded-full bg-stone-300 cursor-pointer"></label>
                                                            </div>
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
                    ) : (
                        <div className="w-full h-full overflow-y-auto p-8 bg-stone-50/50">
                            <BudgetTracker slug={liveData.slug} initialExpenses={expenses} />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
