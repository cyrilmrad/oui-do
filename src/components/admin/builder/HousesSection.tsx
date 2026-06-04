import React from 'react';
import type { HousesData } from '@/components/InvitationPreview';

interface HousesSectionProps {
    showHouses: boolean;
    housesData: HousesData | undefined;
    onToggle: (checked: boolean) => void;
    onFieldChange: (field: keyof HousesData, value: string) => void;
}

/** Section 04.5 of the admin invitation builder — bride and groom house cards with enable toggle. */
export function HousesSection({ showHouses, housesData, onToggle, onFieldChange }: HousesSectionProps) {
    return (
        <div className="space-y-4">
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={showHouses || false}
                    onChange={(e) => onToggle(e.target.checked)}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ms-3 text-[0.75rem] font-label uppercase text-primary tracking-widest font-bold">Enable Section</span>
            </label>

            {showHouses && (
                <div className="space-y-12">
                    {/* Bride's House */}
                    <div className="space-y-6">
                        <h3 className="font-headline text-lg text-primary mb-4 pb-2 border-b border-outline-variant/20">The Bride&apos;s House</h3>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1.5">
                                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Top Label (Optional)</label>
                                <input type="text" value={housesData?.brideLabel || ''} onChange={(e) => onFieldChange('brideLabel', e.target.value)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" placeholder="e.g. THE ESTATE OF..." />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Heading Override</label>
                                <input type="text" value={housesData?.brideName || ''} onChange={(e) => onFieldChange('brideName', e.target.value)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" placeholder="Defaults to The Bride's House" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Address / Location</label>
                            <textarea value={housesData?.brideAddress || ''} onChange={(e) => onFieldChange('brideAddress', e.target.value)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 min-h-[100px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" placeholder="128 Willow Creek Road..." />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1.5">
                                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Arrival Time</label>
                                <input type="text" value={housesData?.brideTime || ''} onChange={(e) => onFieldChange('brideTime', e.target.value)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" placeholder="e.g. 2:30 PM" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Map URL</label>
                                <input type="url" value={housesData?.brideMapLink || ''} onChange={(e) => onFieldChange('brideMapLink', e.target.value)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" placeholder="https://maps.google.com/..." />
                            </div>
                        </div>
                    </div>

                    {/* Groom's House */}
                    <div className="space-y-6 pt-6 border-t border-outline-variant/20">
                        <h3 className="font-headline text-lg text-primary mb-4 pb-2 border-b border-outline-variant/20">The Groom&apos;s House</h3>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1.5">
                                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Top Label (Optional)</label>
                                <input type="text" value={housesData?.groomLabel || ''} onChange={(e) => onFieldChange('groomLabel', e.target.value)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" placeholder="e.g. THE ESTATE OF..." />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Heading Override</label>
                                <input type="text" value={housesData?.groomName || ''} onChange={(e) => onFieldChange('groomName', e.target.value)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" placeholder="Defaults to The Groom's House" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Address / Location</label>
                            <textarea value={housesData?.groomAddress || ''} onChange={(e) => onFieldChange('groomAddress', e.target.value)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 min-h-[100px] focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" placeholder="42 Pine Crest Ridge..." />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1.5">
                                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Arrival Time</label>
                                <input type="text" value={housesData?.groomTime || ''} onChange={(e) => onFieldChange('groomTime', e.target.value)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" placeholder="e.g. 6:00 PM" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Map URL</label>
                                <input type="url" value={housesData?.groomMapLink || ''} onChange={(e) => onFieldChange('groomMapLink', e.target.value)} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body" placeholder="https://maps.google.com/..." />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
