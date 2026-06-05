import React from 'react';

interface CeremonyDetailsSectionProps {
    date: string;
    time: string;
    venue: string;
    location: string;
    mapLink: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/** Section 05 of the admin invitation builder — date, time, venue, location, map link. */
export function CeremonyDetailsSection({ date, time, venue, location, mapLink, onChange }: CeremonyDetailsSectionProps) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Ceremony Date</label>
                    <input type="date" name="date" value={date} onChange={onChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Starting Time</label>
                    <input type="time" name="time" value={time} onChange={onChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Venue name</label>
                <p className="text-[0.7rem] text-secondary/80 font-body normal-case tracking-normal">
                    Use a new line for an alternate script or second line (e.g. Arabic under English).
                </p>
                <textarea
                    name="venue"
                    value={venue}
                    onChange={onChange}
                    rows={3}
                    dir="auto"
                    className="w-full min-h-[7rem] resize-y bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body leading-relaxed"
                />
            </div>
            <div className="space-y-1.5">
                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Geographical Details</label>
                <input type="text" name="location" value={location} onChange={onChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
            </div>
            <div className="space-y-1.5">
                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Google Maps Itinerary URL</label>
                <input type="text" name="mapLink" value={mapLink} onChange={onChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" />
            </div>
        </div>
    );
}
