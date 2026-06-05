import React from 'react';

interface FootnoteSectionProps {
    footnote: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

/** Section 09 of the admin invitation builder — footer message + nav-link cheatsheet. */
export function FootnoteSection({ footnote, onChange }: FootnoteSectionProps) {
    return (
        <div className="bg-surface-container-latest p-8 space-y-4">
            <div className="space-y-1.5">
                <label className="text-[0.75rem] font-label uppercase text-secondary tracking-[0.05em]">Footer Message</label>
                <textarea
                    name="footnote"
                    value={footnote}
                    onChange={onChange}
                    rows={4}
                    placeholder={"e.g. Don't forget to check the section\n\n[THE HOUSES](nav:page:YOUR_PAGE_ID)"}
                    className="w-full bg-surface-container-lowest border-outline-variant/30 rounded-md p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-on-surface font-body resize-none"
                />
                <p className="text-xs text-secondary mt-1">
                    Shown centered below the RSVP card. Intro line plus optional button:{' '}
                    <code className="bg-surface-container-high px-1 py-0.5 rounded text-[0.65rem]">[label](nav:lodging)</code>,{' '}
                    <code className="bg-surface-container-high px-1 py-0.5 rounded text-[0.65rem]">nav:exploring</code>,{' '}
                    <code className="bg-surface-container-high px-1 py-0.5 rounded text-[0.65rem]">nav:main</code>, or{' '}
                    <code className="bg-surface-container-high px-1 py-0.5 rounded text-[0.65rem]">nav:page:…</code>
                    for in-app pages; use a normal URL for an external link button.
                </p>
            </div>
        </div>
    );
}
