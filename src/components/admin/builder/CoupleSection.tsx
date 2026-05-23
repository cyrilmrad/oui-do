import React from 'react';

interface CoupleSectionProps {
    bride: string;
    groom: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/** Section 01 of the admin invitation builder — bride/groom names. */
export function CoupleSection({ bride, groom, onChange }: CoupleSectionProps) {
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline text-primary">The Couple</h2>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 01</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Partner One Name</label>
                    <input required type="text" name="bride" value={bride} onChange={onChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Partner Two Name</label>
                    <input required type="text" name="groom" value={groom} onChange={onChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                </div>
            </div>
        </section>
    );
}
