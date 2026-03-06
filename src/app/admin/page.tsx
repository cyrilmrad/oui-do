"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import InvitationPreview, { InvitationData, Theme } from '@/components/InvitationPreview';
import { LogOut, Users, Plus, LayoutDashboard, Search, ChevronRight } from 'lucide-react';

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

    // Builder State
    const [liveData, setLiveData] = useState<InvitationData>(defaultData);
    const [themeSelection, setThemeSelection] = useState<string>("emerald");
    const [isSaving, setIsSaving] = useState(false);

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
            if (session.user.user_metadata?.role !== 'admin') {
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
            <main className="flex-1 flex flex-col lg:flex-row h-full relative">

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
                                    <input type="email" required value={newClientForm.email} onChange={e => setNewClientForm({ ...newClientForm, email: e.target.value })} className="w-full border border-stone-300 rounded p-2.5 text-sm" placeholder="client@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Temporary Password</label>
                                    <input type="password" required value={newClientForm.password} onChange={e => setNewClientForm({ ...newClientForm, password: e.target.value })} className="w-full border border-stone-300 rounded p-2.5 text-sm" placeholder="••••••••" minLength={6} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Assigned Wedding Slug</label>
                                    <input type="text" required value={newClientForm.slug} onChange={e => setNewClientForm({ ...newClientForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} className="w-full border border-stone-300 rounded p-2.5 text-sm" placeholder="e.g. maya-and-john" />
                                    <p className="text-xs text-stone-400 mt-1">URL will be: {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{newClientForm.slug || '...'}</p>
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
                        <div className="mb-10">
                            <h1 className="text-3xl font-serif text-stone-800 mb-2">Invitation Builder</h1>
                            <p className="text-stone-500 font-light">Editing {liveData.slug ? `/${liveData.slug}` : 'a new invitation'}</p>
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
                                <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-2">Event Details</h2>
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
                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Venue Name</label>
                                    <input type="text" name="venue" value={liveData.venue} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Location</label>
                                    <input type="text" name="location" value={liveData.location} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Google Maps Link</label>
                                    <input type="text" name="mapLink" value={liveData.mapLink || ''} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                </div>
                            </div>

                            {/* Section: Media & Content */}
                            <div className="space-y-6">
                                <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-2">Media & Content</h2>
                                <div className="p-4 bg-stone-50 rounded-lg border border-stone-100 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Video URL (MP4)</label>
                                        <input type="text" name="heroVideo" value={liveData.heroVideo || ''} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:emerald-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Fallback Image URL</label>
                                        <input type="text" name="heroImage" value={liveData.heroImage || ''} onChange={handleInputChange} className="w-full border border-stone-200 rounded-md p-3 text-stone-800 focus:outline-none focus:ring-2 focus:emerald-500 focus:border-transparent transition-all" />
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
                            {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{liveData.slug || 'slug'}
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

            </main>
        </div>
    );
}
