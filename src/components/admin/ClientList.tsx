"use client";

import React from 'react';
import { Search, ChevronRight, Users } from 'lucide-react';

/**
 * Each client row in the admin sidebar/grid. Both the mock fixtures and the rows returned
 * by /api/admin/clients use the same loose shape, so the type stays `any` here to match the
 * existing `realClients: any[]` in admin/page.tsx — a proper Client interface is a follow-up.
 */
interface ClientListProps {
    clients: any[];
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onSelectClient: (client: any) => void;
}

/**
 * Active-clients dashboard: header with portfolio search, three insight cards (static for now),
 * the All/In Progress/Live tab strip, and the filterable client rows. Clicking a row delegates
 * to onSelectClient — the parent owns loading the selected client's invitation/budget/seating
 * data and switching activeTab to 'builder'.
 */
export function ClientList({ clients, searchQuery, onSearchChange, onSelectClient }: ClientListProps) {
    return (
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
                            onChange={(e) => onSearchChange(e.target.value)}
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
                    {clients.filter(c => c.slug.includes(searchQuery.toLowerCase())).map(client => (
                        <div key={client.id} className="group bg-surface-container-lowest hover:bg-surface-container-low transition-all duration-300 rounded-xl p-6 flex items-center justify-between border border-transparent hover:border-outline-variant/20 shadow-sm cursor-pointer" onClick={() => onSelectClient(client)}>
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
    );
}
