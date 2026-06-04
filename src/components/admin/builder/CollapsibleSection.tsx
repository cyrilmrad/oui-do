"use client";

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    sectionNumber: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export function CollapsibleSection({
    title,
    sectionNumber,
    children,
    defaultOpen = false,
}: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <section className="border-b border-outline-variant/20 last:border-0">
            <button
                type="button"
                onClick={() => setIsOpen(open => !open)}
                className="w-full flex items-center justify-between py-6 cursor-pointer hover:bg-surface-container-low transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                aria-expanded={isOpen}
            >
                <h2 className="text-2xl font-headline text-primary">{title}</h2>
                <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">
                        Section {sectionNumber}
                    </span>
                    <ChevronDown
                        className={`w-5 h-5 text-secondary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden
                    />
                </div>
            </button>
            <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
            >
                <div className="overflow-hidden min-h-0">
                    <div className="pb-8">
                        {children}
                    </div>
                </div>
            </div>
        </section>
    );
}
