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
    Copy
} from 'lucide-react';
import InvitationPreview, { InvitationData, Theme } from '@/components/InvitationPreview';

type RsvpStatus = 'all' | 'attending' | 'declined' | 'pending';
type DashboardTab = 'overview' | 'messages' | 'settings';

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
        theme: "classic" as unknown as Theme
    });

    const [isSaving, setIsSaving] = useState(false);
    const [userSlug, setUserSlug] = useState("");

    // Auth & Data Fetch Check
    useEffect(() => {
        const loadDashboardData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            if (session.user.user_metadata?.role !== 'client') {
                router.push('/login'); // Not authorized as client
                return;
            }

            const slug = session.user.user_metadata?.slug || '';
            setUserSlug(slug);

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
                                message: dbData.message || "",
                                mapLink: dbData.mapLink || "",
                                heroVideo: dbData.heroVideo || "",
                                heroImage: dbData.heroImage || "",
                                audioUrl: dbData.audioUrl || "",
                                giftMessage: dbData.giftMessage || "",
                                bankAccountName: dbData.bankAccountName || "",
                                bankAccountNumber: dbData.bankAccountNumber || "",
                                mobileTransferNumber: dbData.mobileTransferNumber || "",
                                theme: dbData.theme || undefined
                            });
                        }
                    }

                    const rsvpsRes = await fetch(`/api/rsvps?slug=${slug}`);
                    if (rsvpsRes.ok) {
                        const rsvpsData = await rsvpsRes.json();
                        setRsvps(rsvpsData);
                    }
                } catch (e) {
                    console.error("Failed to load settings or RSVPs", e);
                }
            }

            setLoadingAuth(false);
        };
        loadDashboardData();
    }, [router]);

    // Derived State for Summary Cards
    const summaryStats = useMemo(() => {
        const attendingRsvps = rsvps.filter(r => r.status === 'attending');
        const totalGuests = attendingRsvps.reduce((sum, rsvp) => sum + (rsvp.guests || 1), 0);
        const totalInvited = rsvps.reduce((sum, rsvp) => {
            return sum + (rsvp.status !== 'declined' ? Math.max(rsvp.guests || 1, 1) : 0);
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

    const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setWeddingDetails((prev: InvitationData) => ({ ...prev, [name]: value }));
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
            const response = await fetch('/api/admin/invitation', { // Reusing the same save endpoint
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
                <button
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                    <Copy className="w-4 h-4" />
                    Copy Invite Link
                </button>
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

            <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h3 className="text-lg font-serif text-stone-900">Guest List</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-stone-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search guests..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-stone-200 rounded-lg text-sm placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 bg-stone-50/50"
                            />
                        </div>
                        <div className="relative w-full sm:w-auto">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Filter className="h-4 w-4 text-stone-400" />
                            </div>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as RsvpStatus)}
                                className="block w-full pl-10 pr-10 py-2 border border-stone-200 rounded-lg text-sm text-stone-700 bg-white focus:outline-none focus:ring-1 focus:ring-stone-500 focus:border-stone-500 appearance-none cursor-pointer"
                            >
                                <option value="all">All Guests</option>
                                <option value="attending">Attending</option>
                                <option value="declined">Declined</option>
                                <option value="pending">Pending</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-stone-400">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
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
                                <th className="px-6 py-4 text-xs font-semibold text-stone-500 uppercase tracking-wider">Dietary Needs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {filteredRsvps.length > 0 ? (
                                filteredRsvps.map((rsvp) => (
                                    <tr key={rsvp.id} className="hover:bg-stone-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-stone-900">{rsvp.firstName} {rsvp.lastName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(rsvp.status)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="text-sm text-stone-600 font-serif">{rsvp.guests}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-stone-500">{rsvp.dietary || "-"}</div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-stone-500 text-sm">
                                        No guests found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/30 flex items-center justify-between">
                    <p className="text-xs text-stone-500">Showing {filteredRsvps.length} results</p>
                </div>
            </div>
        </>
    );

    const renderMessages = () => (
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

    const renderSettings = () => (
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
                            <MapPin className="w-4 h-4 mr-2" />
                            Welcome Message & Gifts
                        </h3>
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <input type="text" name="bankAccountName" value={weddingDetails.bankAccountName} onChange={handleSettingsChange} placeholder="Bank Account Name" className="w-full border border-stone-200 rounded-md p-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <input type="text" name="bankAccountNumber" value={weddingDetails.bankAccountNumber} onChange={handleSettingsChange} placeholder="Account / IBAN Number" className="w-full border border-stone-200 rounded-md p-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <input type="text" name="mobileTransferNumber" value={weddingDetails.mobileTransferNumber} onChange={handleSettingsChange} placeholder="Mobile Transfer Number" className="w-full border border-stone-200 rounded-md p-3 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
                                </div>
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
                    <button
                        onClick={() => setActiveTab('messages')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'messages' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Mail className={`w-5 h-5 mr-3 transition-colors ${activeTab === 'messages' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Messages
                        <span className="ml-auto bg-stone-200 text-stone-600 py-0.5 px-2 rounded-full text-xs font-semibold">{guestMessages.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors group ${activeTab === 'settings' ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                    >
                        <Settings className={`w-5 h-5 mr-3 transition-colors ${activeTab === 'settings' ? 'text-stone-500' : 'text-stone-400 group-hover:text-stone-600'}`} />
                        Settings
                    </button>
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
                    <button onClick={() => setActiveTab('messages')} className={`p-2 rounded-md ${activeTab === 'messages' ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}>
                        <Mail className="w-5 h-5" />
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-md ${activeTab === 'settings' ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}>
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-stone-50/50 pt-16 md:pt-0">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'messages' && renderMessages()}
                    {activeTab === 'settings' && renderSettings()}
                </div>
            </main>
        </div>
    );
}
