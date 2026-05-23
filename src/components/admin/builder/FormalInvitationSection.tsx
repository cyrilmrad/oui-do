import React from 'react';

interface FormalInvitationSectionProps {
    showFormalInvitation: boolean;
    onToggleFormalInvitation: (checked: boolean) => void;

    formalImageUrl: string;
    formalImagePreview: string | null;
    formalImageFile: File | null;
    onFormalImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

    detailsBgUrl: string;
    detailsBgPreview: string | null;
    onDetailsBgChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

    audioUrl: string;
    audioPreview: string | null;
    audioFile: File | null;
    onAudioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Section 03 of the admin invitation builder — formal invitation override (full-screen media)
 * OR details-background image (when not overriding), plus background audio.
 */
export function FormalInvitationSection({
    showFormalInvitation,
    onToggleFormalInvitation,
    formalImageUrl,
    formalImagePreview,
    formalImageFile,
    onFormalImageChange,
    detailsBgUrl,
    detailsBgPreview,
    onDetailsBgChange,
    audioUrl,
    audioPreview,
    audioFile,
    onAudioChange
}: FormalInvitationSectionProps) {
    const formalPreview = formalImagePreview || formalImageUrl;
    const formalLooksLikeVideo =
        !!(formalImagePreview || formalImageUrl || '').match(/\.(mp4|webm|ogg|mov)$/i) ||
        !!formalImageFile?.type.startsWith('video/');

    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-headline text-primary">Formal Invitation</h2>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            name="showFormalInvitation"
                            className="sr-only peer"
                            checked={showFormalInvitation || false}
                            onChange={(e) => onToggleFormalInvitation(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 text-[0.75rem] font-label uppercase text-primary tracking-widest font-bold">Formal Image Override</span>
                    </label>
                </div>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 03</span>
            </div>
            <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
                {showFormalInvitation && (
                    <div className="space-y-1.5">
                        <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Formal Invitation Media</label>
                        {formalPreview ? (
                            <div className="mb-2 text-sm text-primary font-medium break-all border border-outline-variant/20 rounded-md overflow-hidden inline-block relative">
                                {formalLooksLikeVideo ? (
                                    <video src={formalPreview} className="h-48 w-auto object-cover" controls playsInline muted />
                                ) : (
                                    <img src={formalPreview} alt="Formal Invite" className="h-32 w-auto object-cover" />
                                )}
                            </div>
                        ) : null}
                        <input type="file" accept="image/*,video/mp4,video/quicktime,video/webm,video/*" onChange={onFormalImageChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                        <p className="text-[10px] text-secondary/70 mt-2 font-label tracking-widest uppercase">Provides a full-screen media fallback instead of native UI text blocks.</p>
                    </div>
                )}

                {!showFormalInvitation && (
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Event Specific Detail Texture Background Image</label>
                            {detailsBgPreview || detailsBgUrl ? (
                                <div className="mb-2 text-sm text-primary font-medium break-all border border-outline-variant/20 rounded-md overflow-hidden inline-block">
                                    <img src={detailsBgPreview || detailsBgUrl} alt="Details Bg" className="h-24 w-auto object-cover" />
                                </div>
                            ) : null}
                            <input type="file" accept="image/*" onChange={onDetailsBgChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                        </div>
                    </div>
                )}

                <div className="space-y-1.5 pt-4 border-t border-outline-variant/20">
                    <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Background Audio</label>
                    {audioPreview || audioUrl ? (
                        <div className="mb-2 text-sm text-primary font-medium break-all">
                            Current: {audioFile?.name || audioUrl}
                        </div>
                    ) : null}
                    <input type="file" accept="audio/*" onChange={onAudioChange} className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body file:bg-primary file:text-white file:border-0 file:px-4 file:py-2 file:rounded-full file:text-sm file:font-semibold file:cursor-pointer hover:file:opacity-90" />
                </div>
            </div>
        </section>
    );
}
