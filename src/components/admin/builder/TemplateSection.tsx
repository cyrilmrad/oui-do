import React from 'react';
import { TemplateId, TEMPLATES } from '@/lib/templates';

interface TemplateSectionProps {
    selectedTemplate: TemplateId;
    onTemplateChange: (id: TemplateId) => void;
}

/**
 * Section 00 of the admin invitation builder — template selector.
 * Purely presentational: no state, no hooks.
 */
export default function TemplateSection({ selectedTemplate, onTemplateChange }: TemplateSectionProps) {
    return (
        <div>
            {/* Section header — same visual style as other builder sections */}
            <div className="flex items-center gap-3 mb-6">
                <span className="text-xs font-label tracking-widest text-secondary uppercase">00</span>
                <h2 className="text-2xl font-headline text-primary">Design Template</h2>
            </div>

            <p className="text-secondary font-body text-sm mb-6">
                Choose the visual experience for this invitation. The preview updates instantly — DB persistence coming soon.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.values(TEMPLATES).map(template => {
                    const isSelected = template.id === selectedTemplate;
                    return (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => onTemplateChange(template.id)}
                            className={`text-left rounded-xl border-2 p-5 transition-all ${
                                isSelected
                                    ? 'border-primary bg-surface-container-low shadow-sm'
                                    : 'border-outline-variant bg-surface hover:border-primary/40'
                            }`}
                        >
                            {/* Mini swatch */}
                            <div
                                className="w-full rounded-lg mb-4 overflow-hidden"
                                style={{ height: 72 }}
                            >
                                {template.id === 'classic' ? (
                                    <div className="w-full h-full bg-gradient-to-b from-stone-300 to-stone-100 flex items-end justify-center pb-2">
                                        <span className="text-stone-500 text-xs font-label tracking-widest">CLASSIC</span>
                                    </div>
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-b from-stone-900 to-stone-950 flex items-end justify-center pb-2">
                                        <span className="text-stone-500 text-xs font-label tracking-widest">NOIR</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-headline text-lg text-primary">{template.name}</p>
                                    <p className="font-body text-xs text-secondary mt-0.5">{template.description}</p>
                                </div>
                                {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 ml-3">
                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
