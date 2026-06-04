import React from 'react';

interface FormalReceptionSectionProps {
    receptionTime: string;
    receptionVenue: string;
    receptionAddress: string;
    receptionLocation: string;
    message: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/** Section 06 of the admin invitation builder — reception time/venue/address/map + welcome note. */
export function FormalReceptionSection({
    receptionTime,
    receptionVenue,
    receptionAddress,
    receptionLocation,
    message,
    onChange
}: FormalReceptionSectionProps) {
    return (
        <div className="bg-surface-container-lowest border border-outline-variant/20 p-8 rounded-xl space-y-6">
            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Reception Time</label>
                    <input type="time" name="receptionTime" value={receptionTime} onChange={onChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Reception venue</label>
                    <textarea
                        name="receptionVenue"
                        value={receptionVenue}
                        onChange={onChange}
                        rows={3}
                        dir="auto"
                        className="w-full min-h-[7rem] resize-y bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body leading-relaxed"
                    />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Reception Physical Address</label>
                <input type="text" name="receptionAddress" value={receptionAddress} onChange={onChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
            </div>
            <div className="space-y-1.5">
                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Reception Google Maps Link</label>
                <input type="text" name="receptionLocation" value={receptionLocation} onChange={onChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
            </div>
            <div className="space-y-1.5">
                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Welcome Note</label>
                <textarea name="message" value={message} onChange={onChange} rows={3} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body resize-none" />
            </div>
        </div>
    );
}
