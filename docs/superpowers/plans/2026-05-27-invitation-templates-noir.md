# Invitation Templates — Noir (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Noir template (dark, full-screen scroll-snap sections) selectable in the admin invitation builder preview — no DB changes, public invite page untouched.

**Architecture:** A `TemplateId` type + `TEMPLATES` registry defines available templates. A new `NoirTemplate` component renders the same `InvitationData` as a dark scroll-snap experience. The admin builder gains a Section 00 picker that switches the live preview between `InvitationPreview` (Classic) and `NoirTemplate` (Noir) via local React state.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, TypeScript — no new dependencies.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/templates.ts` | **Create** | `TemplateId` type + `TEMPLATES` metadata registry |
| `src/components/NoirTemplate.tsx` | **Create** | Dark scroll-snap invitation renderer — same props as `InvitationPreview` |
| `src/components/admin/builder/TemplateSection.tsx` | **Create** | Section 00 UI — template picker card (purely presentational) |
| `src/app/admin/page.tsx` | **Modify** | `selectedTemplate` state, mount `TemplateSection`, conditional preview render |

---

## Task 0: Feature branch

**Files:** none

- [ ] **Create and switch to feature branch**

```bash
git checkout main
git pull
git checkout -b feat/invitation-templates-noir
```

Expected: `Switched to a new branch 'feat/invitation-templates-noir'`

---

## Task 1: Template registry

**Files:**
- Create: `src/lib/templates.ts`

- [ ] **Create `src/lib/templates.ts`**

```ts
// src/lib/templates.ts

export type TemplateId = 'classic' | 'noir';

export interface TemplateDefinition {
    id: TemplateId;
    name: string;
    description: string;
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
    classic: {
        id: 'classic',
        name: 'Classic',
        description: 'Continuous scroll · Light & timeless',
    },
    noir: {
        id: 'noir',
        name: 'Noir',
        description: 'Full-screen snap sections · Dark & dramatic',
    },
};

export const DEFAULT_TEMPLATE_ID: TemplateId = 'classic';
```

- [ ] **Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: no errors from this file.

- [ ] **Commit**

```bash
git add src/lib/templates.ts
git commit -m "feat(templates): add TemplateId type and TEMPLATES registry"
```

---

## Task 2: NoirTemplate component

**Files:**
- Create: `src/components/NoirTemplate.tsx`

This component takes the same props as `InvitationPreview` (`data: InvitationData`, `isPreview?: boolean`) and renders a dark, full-screen scroll-snap invitation.

**Sections rendered (in order, conditional as noted):**
1. Hero — always. Uses `heroImage`/`heroVideo` as background. Shows `heroLogoUrl` if `showHeroLogo`. Shows date ribbon if `showHeroDate`.
2. Formal Invitation — only if `showFormalInvitation && formalInvitationImage`.
3. Ceremony — always.
4. Reception — only if `receptionVenue` is non-empty.
5. Gifts — only if `giftOptions?.length > 0`.
6. RSVP — always. Shows form if `showRsvp`; shows `rsvpClosedMessage` otherwise. In `isPreview` mode the submit button is disabled.

A dot-strip on the right edge tracks the active section via a scroll-event listener.

- [ ] **Create `src/components/NoirTemplate.tsx`**

```tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    InvitationData,
    GiftOption,
    GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL,
    GIFT_DEFAULT_SWIFT_LABEL,
    GIFT_DEFAULT_MOBILE_NUMBER_LABEL,
} from '@/components/InvitationPreview';

interface NoirTemplateProps {
    data: InvitationData;
    isPreview?: boolean;
}

// ─── Shared section wrapper ───────────────────────────────────────────────────

interface SectionProps {
    children: React.ReactNode;
    background?: string;
    sectionHeight: string;
}

function SnapSection({ children, background = '#0d0d0d', sectionHeight }: SectionProps) {
    return (
        <section
            style={{
                minHeight: sectionHeight,
                height: sectionHeight,
                scrollSnapAlign: 'start',
                position: 'relative',
                overflow: 'hidden',
                background,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {children}
        </section>
    );
}

// ─── Frosted card ─────────────────────────────────────────────────────────────

function FrostedCard({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 12,
                padding: '24px',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
        >
            {children}
        </div>
    );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p
            style={{
                fontFamily: 'var(--font-body, Manrope, sans-serif)',
                fontSize: 9,
                letterSpacing: '0.35em',
                textTransform: 'uppercase' as const,
                color: '#555',
                marginBottom: 20,
            }}
        >
            {children}
        </p>
    );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
    return (
        <div
            style={{
                width: 40,
                height: 1,
                background: 'rgba(255,255,255,0.12)',
                margin: '16px auto',
            }}
        />
    );
}

// ─── Dot progress indicator ───────────────────────────────────────────────────

function DotIndicator({ total, active }: { total: number; active: number }) {
    return (
        <div
            style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                zIndex: 10,
            }}
        >
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        width: 4,
                        height: i === active ? 12 : 4,
                        borderRadius: i === active ? 2 : '50%',
                        background: i === active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                        transition: 'all 0.25s ease',
                    }}
                />
            ))}
        </div>
    );
}

// ─── Gift card ────────────────────────────────────────────────────────────────

function GiftCard({ option }: { option: GiftOption }) {
    if (option.type === 'bank') {
        return (
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 20px', marginBottom: 10 }}>
                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#555', marginBottom: 4 }}>
                    {option.bankName || 'Bank Transfer'}
                </p>
                {option.accountName && <p style={{ fontSize: 14, color: '#ccc', marginBottom: 2 }}>{option.accountName}</p>}
                {option.accountNumber && (
                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666', marginBottom: 2 }}>
                        {option.accountNumberLabel || GIFT_DEFAULT_ACCOUNT_NUMBER_LABEL}: {option.accountNumber}
                    </p>
                )}
                {option.swiftCode && (
                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666' }}>
                        {option.swiftCodeLabel || GIFT_DEFAULT_SWIFT_LABEL}: {option.swiftCode}
                    </p>
                )}
                {option.customFields?.map(f => (
                    <p key={f.id} style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#666', marginTop: 2 }}>{f.label}: {f.value}</p>
                ))}
            </div>
        );
    }
    // mobile
    return (
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 20px', marginBottom: 10 }}>
            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#555', marginBottom: 4 }}>
                {option.serviceName || 'Mobile Transfer'}
            </p>
            {option.mobileAccountName && <p style={{ fontSize: 14, color: '#ccc', marginBottom: 2 }}>{option.mobileAccountName}</p>}
            {option.mobileNumber && (
                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#888' }}>
                    {option.mobileNumberLabel || GIFT_DEFAULT_MOBILE_NUMBER_LABEL}: {option.mobileNumber}
                </p>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NoirTemplate({ data, isPreview = false }: NoirTemplateProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeSection, setActiveSection] = useState(0);
    const [attending, setAttending] = useState<boolean | null>(null);
    const [guestName, setGuestName] = useState('');
    const [pax, setPax] = useState('');

    // Build ordered list of section keys — used for dot count and index lookup
    const sectionKeys: string[] = ['hero'];
    if (data.showFormalInvitation && data.formalInvitationImage) sectionKeys.push('formal');
    sectionKeys.push('ceremony');
    if (data.receptionVenue) sectionKeys.push('reception');
    if ((data.giftOptions?.length ?? 0) > 0) sectionKeys.push('gifts');
    sectionKeys.push('rsvp');

    const totalSections = sectionKeys.length;
    const sectionIdx = (key: string) => sectionKeys.indexOf(key);
    const sectionHeight = isPreview ? '100%' : '100svh';

    const onScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const idx = Math.round(el.scrollTop / el.clientHeight);
        setActiveSection(Math.min(idx, totalSections - 1));
    }, [totalSections]);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [onScroll]);

    return (
        <div
            ref={containerRef}
            style={{
                height: isPreview ? '100%' : '100svh',
                overflowY: 'scroll',
                scrollSnapType: 'y mandatory',
                background: '#0d0d0d',
                // Hide native scrollbar — dots provide navigation feedback
                scrollbarWidth: 'none',
            }}
            className="[&::-webkit-scrollbar]:hidden"
        >
            {/* ── Hero ── */}
            {(() => {
                const hasMedia = !!(data.heroVideo || data.heroImage);
                const bgStyle: React.CSSProperties = hasMedia
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.5) 100%), url('${data.heroVideo ? '' : data.heroImage}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }
                    : { background: '#111' };

                return (
                    <SnapSection sectionHeight={sectionHeight} background="transparent">
                        {/* Video background */}
                        {data.heroVideo && (
                            <video
                                autoPlay muted loop playsInline
                                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                                src={data.heroVideo}
                            />
                        )}
                        {/* Image / gradient overlay */}
                        <div style={{ position: 'absolute', inset: 0, zIndex: 1, ...bgStyle }} />

                        {/* Content */}
                        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 24px', width: '100%' }}>
                            {/* Hero logo */}
                            {data.showHeroLogo && data.heroLogoUrl && (
                                <img src={data.heroLogoUrl} alt="logo" style={{ maxHeight: 64, maxWidth: 160, objectFit: 'contain', marginBottom: 8, opacity: 0.9 }} />
                            )}
                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
                                Together forever
                            </p>
                            <div style={{ textAlign: 'center', fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 34, fontWeight: 400, letterSpacing: '0.04em', color: '#fff', lineHeight: 1.15, textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                                {data.bride}
                                <span style={{ display: 'block', fontSize: 22, color: 'rgba(255,255,255,0.45)', margin: '4px 0' }}>&amp;</span>
                                {data.groom}
                            </div>
                            {/* Date ribbon */}
                            {data.showHeroDate && data.date && (
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginTop: 4 }}>
                                    {data.date}
                                </p>
                            )}
                        </div>

                        {/* Scroll hint */}
                        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.3)', zIndex: 2 }}>
                            <div style={{ width: 1, height: 24, background: 'linear-gradient(180deg, rgba(255,255,255,0.3), transparent)' }} />
                            <span style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase' }}>scroll</span>
                        </div>

                        <DotIndicator total={totalSections} active={sectionIdx('hero')} />
                    </SnapSection>
                );
            })()}

            {/* ── Formal Invitation ── */}
            {data.showFormalInvitation && data.formalInvitationImage && (
                <SnapSection sectionHeight={sectionHeight} background="#0a0a0a">
                    {data.formalInvitationIsVideo ? (
                        <video autoPlay muted loop playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} src={data.formalInvitationImage} />
                    ) : (
                        <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `url('${data.formalInvitationImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1 }} />
                    <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px' }}>
                        <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 22, color: '#fff', letterSpacing: '0.04em' }}>
                            {data.bride} &amp; {data.groom}
                        </p>
                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em', marginTop: 8, textTransform: 'uppercase' }}>
                            Formal Invitation
                        </p>
                    </div>
                    <DotIndicator total={totalSections} active={sectionIdx('formal')} />
                </SnapSection>
            )}

            {/* ── Ceremony ── */}
            <SnapSection sectionHeight={sectionHeight}>
                <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <SectionLabel>Ceremony</SectionLabel>
                    <FrostedCard>
                        <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 20, color: '#eee', textAlign: 'center', marginBottom: 6 }}>{data.venue}</p>
                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#777', textAlign: 'center', lineHeight: 1.7 }}>
                            {data.date}{data.time ? ` · ${data.time}` : ''}
                        </p>
                        <Divider />
                        <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#555', textAlign: 'center', letterSpacing: '0.05em' }}>
                            {data.location}
                        </p>
                        {data.mapLink && (
                            <p style={{ textAlign: 'center', marginTop: 14 }}>
                                <a href={data.mapLink} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 10, color: '#888', letterSpacing: '0.15em', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 2 }}>
                                    View on Map ↗
                                </a>
                            </p>
                        )}
                    </FrostedCard>
                </div>
                <DotIndicator total={totalSections} active={sectionIdx('ceremony')} />
            </SnapSection>

            {/* ── Reception ── */}
            {data.receptionVenue && (
                <SnapSection sectionHeight={sectionHeight} background="#0f0f0f">
                    <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <SectionLabel>Reception</SectionLabel>
                        <FrostedCard>
                            <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 20, color: '#eee', textAlign: 'center', marginBottom: 6 }}>{data.receptionVenue}</p>
                            {(data.receptionTime || data.date) && (
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#777', textAlign: 'center', lineHeight: 1.7 }}>
                                    {data.date}{data.receptionTime ? ` · ${data.receptionTime}` : ''}
                                </p>
                            )}
                            {(data.receptionLocation || data.receptionAddress) && (
                                <>
                                    <Divider />
                                    <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 11, color: '#555', textAlign: 'center', letterSpacing: '0.05em', lineHeight: 1.6 }}>
                                        {data.receptionLocation}
                                        {data.receptionAddress && <><br />{data.receptionAddress}</>}
                                    </p>
                                </>
                            )}
                        </FrostedCard>
                    </div>
                    <DotIndicator total={totalSections} active={sectionIdx('reception')} />
                </SnapSection>
            )}

            {/* ── Gifts ── */}
            {(data.giftOptions?.length ?? 0) > 0 && (
                <SnapSection sectionHeight={sectionHeight} background="#0a0a0a">
                    <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', maxHeight: sectionHeight }}>
                        <SectionLabel>Gift Registry</SectionLabel>
                        {data.giftMessage && (
                            <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 }}>
                                {data.giftMessage}
                            </p>
                        )}
                        {data.giftOptions!.map(option => (
                            <GiftCard key={option.id} option={option} />
                        ))}
                    </div>
                    <DotIndicator total={totalSections} active={sectionIdx('gifts')} />
                </SnapSection>
            )}

            {/* ── RSVP — always rendered ── */}
            <SnapSection sectionHeight={sectionHeight}>
                    <div style={{ width: '100%', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {data.showRsvp ? (
                            <>
                                <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 24, color: '#ddd', textAlign: 'center', marginBottom: 6 }}>
                                    Will you join us?
                                </p>
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, color: '#555', textAlign: 'center', marginBottom: 24 }}>
                                    {data.rsvpClosedMessage || 'Please let us know if you can make it'}
                                </p>
                                <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 16 }}>
                                    <button
                                        disabled={isPreview}
                                        onClick={() => !isPreview && setAttending(true)}
                                        style={{ flex: 1, padding: '12px', borderRadius: 8, fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', cursor: isPreview ? 'default' : 'pointer', background: attending === true ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)', border: attending === true ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.12)', color: attending === true ? '#fff' : '#888', transition: '0.2s' }}
                                    >
                                        ✓ Attending
                                    </button>
                                    <button
                                        disabled={isPreview}
                                        onClick={() => !isPreview && setAttending(false)}
                                        style={{ flex: 1, padding: '12px', borderRadius: 8, fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', cursor: isPreview ? 'default' : 'pointer', background: attending === false ? 'rgba(255,255,255,0.08)' : 'transparent', border: attending === false ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.08)', color: attending === false ? '#aaa' : '#555', transition: '0.2s' }}
                                    >
                                        ✕ Decline
                                    </button>
                                </div>
                                <input
                                    disabled={isPreview}
                                    value={guestName}
                                    onChange={e => setGuestName(e.target.value)}
                                    placeholder="Your full name"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 13, color: '#ccc', marginBottom: 10, outline: 'none' }}
                                />
                                <input
                                    disabled={isPreview}
                                    value={pax}
                                    onChange={e => setPax(e.target.value)}
                                    placeholder="Number of guests"
                                    type="number"
                                    min="1"
                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '12px 14px', fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 13, color: '#ccc', marginBottom: 16, outline: 'none' }}
                                />
                                <button
                                    disabled={isPreview}
                                    style={{ width: '100%', padding: '14px', background: isPreview ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, color: isPreview ? '#555' : '#fff', fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: isPreview ? 'default' : 'pointer' }}
                                >
                                    {isPreview ? 'Preview only' : 'Send RSVP'}
                                </button>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '0 8px' }}>
                                <p style={{ fontFamily: 'var(--font-headline, Georgia, serif)', fontSize: 20, color: '#888', marginBottom: 12 }}>RSVP Closed</p>
                                <p style={{ fontFamily: 'var(--font-body, Manrope, sans-serif)', fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                                    {data.rsvpClosedMessage || 'Thank you for your response.'}
                                </p>
                            </div>
                        )}
                    </div>
                    <DotIndicator total={totalSections} active={sectionIdx('rsvp')} />
            </SnapSection>
        </div>
    );
}
```

- [ ] **Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: zero errors.

- [ ] **Commit**

```bash
git add src/components/NoirTemplate.tsx
git commit -m "feat(templates): add NoirTemplate scroll-snap component"
```

---

## Task 3: TemplateSection builder component

**Files:**
- Create: `src/components/admin/builder/TemplateSection.tsx`

Purely presentational — no hooks, no `useState`. Follows the same pattern as `CoupleSection`, `HeroSection`, etc.

- [ ] **Create `src/components/admin/builder/TemplateSection.tsx`**

```tsx
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
                Choose the visual experience for this invitation. Switching template only affects the preview — it will be saved when you publish.
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
```

- [ ] **Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: zero errors.

- [ ] **Commit**

```bash
git add src/components/admin/builder/TemplateSection.tsx
git commit -m "feat(templates): add TemplateSection builder component (Section 00)"
```

---

## Task 4: Wire into admin/page.tsx

**Files:**
- Modify: `src/app/admin/page.tsx`

Four changes:
1. Import `TemplateSection`, `NoirTemplate`, `TemplateId`, `DEFAULT_TEMPLATE_ID`
2. Add `selectedTemplate` state
3. Reset `selectedTemplate` when a client is loaded
4. Mount `TemplateSection` above `CoupleSection` in the builder form
5. Conditional preview render (NoirTemplate vs InvitationPreview)
6. Give the preview frame a fixed height when Noir is active (scroll-snap requires bounded container)

- [ ] **Add imports** — find the existing imports block at the top of `src/app/admin/page.tsx` and add:

```ts
// Add alongside other builder section imports:
import TemplateSection from '@/components/admin/builder/TemplateSection';
import NoirTemplate from '@/components/NoirTemplate';
import { TemplateId, DEFAULT_TEMPLATE_ID } from '@/lib/templates';
```

- [ ] **Add `selectedTemplate` state** — add immediately after the `themeSelection` state line (~line 116):

Find:
```ts
const [themeSelection, setThemeSelection] = useState<string>("emerald");
```

Replace with:
```ts
const [themeSelection, setThemeSelection] = useState<string>("emerald");
const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(DEFAULT_TEMPLATE_ID);
```

- [ ] **Reset on client load** — find where `setThemeSelection` is called when a client is selected (~line 994):

Find:
```ts
setThemeSelection(getThemeSelectionFromTheme(dbData.theme as Theme | null));
```

Replace with:
```ts
setThemeSelection(getThemeSelectionFromTheme(dbData.theme as Theme | null));
setSelectedTemplate(DEFAULT_TEMPLATE_ID);
```

- [ ] **Mount TemplateSection above CoupleSection** — find (~line 1108):

Find:
```tsx
<CoupleSection bride={liveData.bride} groom={liveData.groom} onChange={handleInputChange} />
```

Replace with:
```tsx
<TemplateSection
    selectedTemplate={selectedTemplate}
    onTemplateChange={setSelectedTemplate}
/>

<CoupleSection bride={liveData.bride} groom={liveData.groom} onChange={handleInputChange} />
```

- [ ] **Conditional preview render** — find the preview frame (~line 1354):

Find:
```tsx
<div className="w-full min-w-0 max-w-[390px] shrink-0 overflow-hidden rounded-[2rem] border border-stone-300/70 bg-stone-200/40 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.28)] ring-1 ring-black/5">
    <InvitationPreview data={previewData} isPreview />
</div>
```

Replace with:
```tsx
<div className={`w-full min-w-0 max-w-[390px] shrink-0 overflow-hidden rounded-[2rem] border border-stone-300/70 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.28)] ring-1 ring-black/5 ${selectedTemplate === 'noir' ? 'bg-stone-950 h-[640px]' : 'bg-stone-200/40'}`}>
    {selectedTemplate === 'noir'
        ? <NoirTemplate data={previewData} isPreview />
        : <InvitationPreview data={previewData} isPreview />
    }
</div>
```

- [ ] **Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: zero new errors.

- [ ] **Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(templates): wire TemplateSection + Noir preview into admin builder"
```

---

## Task 5: Verify end-to-end

- [ ] **Start dev server**

```bash
npm run dev
```

- [ ] **Open admin and test template switching**

1. Navigate to `http://localhost:3000/admin`
2. Log in as admin
3. Select any client → click **Invitation Builder** tab
4. Verify **Section 00 — Design Template** appears at the top with **Classic** selected by default
5. Click **Noir** → preview panel switches to dark scroll-snap layout
6. Scroll inside the preview — sections snap: Hero → Ceremony → Reception (if set) → Gifts (if set) → RSVP
7. Dot indicator on the right tracks the active section
8. Switch back to **Classic** → preview returns to Classic scroll layout
9. Select a different client → template selection resets to Classic

- [ ] **Verify public invite is untouched**

Open `http://localhost:3000/invite/<any-slug>` — must render Classic exactly as before.

- [ ] **Final type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: zero errors.

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat(templates): Noir template v1 — builder preview, scroll-snap, core sections"
```
