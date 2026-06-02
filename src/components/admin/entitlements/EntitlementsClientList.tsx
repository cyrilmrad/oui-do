"use client";

import React from 'react';
import { Search } from 'lucide-react';
import type { MergedClient } from './types';

type Props = {
    clients: MergedClient[];
    selectedSlug: string | null;
    search: string;
    /** slug of the selected client when it has unsaved edits, else null */
    dirtySlug: string | null;
    onSearch: (v: string) => void;
    onSelect: (slug: string) => void;
};

function displayName(c: MergedClient) {
    const b = c.bride?.trim();
    const g = c.groom?.trim();
    if (b && g) return `${b} & ${g}`;
    return b || g || c.slug;
}

export default function EntitlementsClientList({ clients, selectedSlug, search, dirtySlug, onSearch, onSelect }: Props) {
    const q = search.trim().toLowerCase();
    const filtered = !q
        ? clients
        : clients.filter((c) => {
              const name = `${c.bride || ''} ${c.groom || ''}`.toLowerCase();
              return c.slug.toLowerCase().includes(q) || name.includes(q) || (c.email || '').toLowerCase().includes(q);
          });

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-outline-variant/15">
                <div className="flex items-center gap-2 bg-surface rounded-full px-3 py-2 border border-outline-variant/20">
                    <Search className="w-4 h-4 text-secondary" />
                    <input
                        value={search}
                        onChange={(e) => onSearch(e.target.value)}
                        placeholder="Search clients…"
                        className="bg-transparent border-none outline-none text-sm w-full placeholder:text-secondary/50"
                    />
                </div>
            </div>
            <ul className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[60vh]">
                {filtered.map((c) => {
                    const selected = c.slug === selectedSlug;
                    const isDirty = c.slug === dirtySlug;
                    return (
                        <li key={c.slug}>
                            <button
                                type="button"
                                onClick={() => onSelect(c.slug)}
                                className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-colors ${
                                    selected
                                        ? 'bg-surface border border-outline-variant/30 shadow-sm'
                                        : 'hover:bg-surface-container-high/30 border border-transparent'
                                }`}
                            >
                                <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${c.configured ? 'bg-emerald-500' : 'bg-outline-variant/50'}`}
                                    title={c.configured ? 'Configured' : 'Using defaults'}
                                />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold text-primary truncate">{displayName(c)}</span>
                                    <span className="block font-mono text-[0.7rem] text-secondary truncate">{c.slug}</span>
                                </span>
                                {isDirty ? (
                                    <span className="text-[0.6rem] font-label uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                        Unsaved
                                    </span>
                                ) : !c.configured ? (
                                    <span className="text-[0.6rem] font-label uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                                        Defaults
                                    </span>
                                ) : null}
                            </button>
                        </li>
                    );
                })}
                {filtered.length === 0 && <li className="p-6 text-center text-secondary text-sm">No matching clients.</li>}
            </ul>
        </div>
    );
}
