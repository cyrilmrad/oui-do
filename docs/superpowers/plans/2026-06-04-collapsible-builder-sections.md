# Collapsible Builder Sections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap each of the 11 invitation builder sections in a collapsible accordion — all start collapsed, admin clicks a header to expand.

**Architecture:** One new `CollapsibleSection` component owns the toggle header (title, section number, chevron, CSS `grid-template-rows` animation). Each existing section file loses its own `<section>` wrapper + header div and returns bare form content. Four section files also have toggles or buttons inside their current headers that must relocate into the content area. `admin/page.tsx` wraps all 11 sections (10 components + 1 inline block) in `<CollapsibleSection>`.

**Tech Stack:** React 19, Next.js 16 App Router, Tailwind v4, lucide-react (`ChevronDown`), CSS `grid-template-rows` for height animation

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| **Create** | `src/components/admin/builder/CollapsibleSection.tsx` | New accordion wrapper |
| Modify | `src/components/admin/builder/CoupleSection.tsx` | Strip `<section>` + header div |
| Modify | `src/components/admin/builder/HeroSection.tsx` | Strip `<section>` + header div |
| Modify | `src/components/admin/builder/PreCeremonySection.tsx` | Strip `<section>` + header div |
| Modify | `src/components/admin/builder/CeremonyDetailsSection.tsx` | Strip `<section>` + header div |
| Modify | `src/components/admin/builder/FormalReceptionSection.tsx` | Strip `<section>` + header div |
| Modify | `src/components/admin/builder/FootnoteSection.tsx` | Strip `<section>` + header div |
| Modify | `src/components/admin/builder/FormalInvitationSection.tsx` | Strip header; move enable toggle into content |
| Modify | `src/components/admin/builder/HousesSection.tsx` | Strip header; move enable toggle into content |
| Modify | `src/components/admin/builder/GiftOptionsSection.tsx` | Strip header; move "+ Bank" / "+ Mobile" buttons into content |
| Modify | `src/components/admin/builder/NavigationEditorSection.tsx` | Strip header; move enable toggle into content |
| Modify | `src/app/admin/page.tsx` | Import `CollapsibleSection`; wrap all 11 section calls |

---

## Task 1: Create `CollapsibleSection.tsx`

**Files:**
- Create: `src/components/admin/builder/CollapsibleSection.tsx`

- [ ] **Step 1: Write the file**

```tsx
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
```

- [ ] **Step 2: Type-check**

```
node_modules/.bin/tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/builder/CollapsibleSection.tsx
git commit -m "feat(builder): add CollapsibleSection accordion wrapper"
```

---

## Task 2: Strip headers from the six simple section files

These six files all follow the identical pattern — outer `<section>` + a header div containing only a title + section badge. The content immediately after is a single `<div>` that becomes the new return value.

**Files:**
- Modify: `src/components/admin/builder/CoupleSection.tsx`
- Modify: `src/components/admin/builder/HeroSection.tsx`
- Modify: `src/components/admin/builder/PreCeremonySection.tsx`
- Modify: `src/components/admin/builder/CeremonyDetailsSection.tsx`
- Modify: `src/components/admin/builder/FormalReceptionSection.tsx`
- Modify: `src/components/admin/builder/FootnoteSection.tsx`

### CoupleSection.tsx

- [ ] **Step 1: Replace header + section wrapper**

Old (lines 11–17):
```tsx
/** Section 01 of the admin invitation builder — bride/groom names. */
export function CoupleSection({ bride, groom, onChange }: CoupleSectionProps) {
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline text-primary">The Couple</h2>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 01</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
```

New:
```tsx
/** Section 01 of the admin invitation builder — bride/groom names. */
export function CoupleSection({ bride, groom, onChange }: CoupleSectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
```

Then remove the closing `</section>` at end of the return — replace `</div>\n        </section>` with `</div>`.

### HeroSection.tsx

- [ ] **Step 2: Replace header + section wrapper**

Old:
```tsx
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline text-primary">HERO Section</h2>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 02</span>
            </div>
            <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
```

New:
```tsx
    return (
        <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
```

Remove closing `</section>` — replace `</div>\n        </section>` with `</div>`.

### PreCeremonySection.tsx

- [ ] **Step 3: Replace header + section wrapper**

Old:
```tsx
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline text-primary">Pre-Ceremony Feature</h2>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 04</span>
            </div>
            <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
```

New:
```tsx
    return (
        <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
```

Remove closing `</section>`.

### CeremonyDetailsSection.tsx

- [ ] **Step 4: Replace header + section wrapper**

Old:
```tsx
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline text-primary">Ceremony Details</h2>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 05</span>
            </div>
            <div className="space-y-8">
```

New:
```tsx
    return (
        <div className="space-y-8">
```

Remove closing `</section>`.

### FormalReceptionSection.tsx

- [ ] **Step 5: Replace header + section wrapper**

Old:
```tsx
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline text-primary">Formal Reception</h2>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 06</span>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/20 p-8 rounded-xl space-y-6">
```

New:
```tsx
    return (
        <div className="bg-surface-container-lowest border border-outline-variant/20 p-8 rounded-xl space-y-6">
```

Remove closing `</section>`.

### FootnoteSection.tsx

- [ ] **Step 6: Replace header + section wrapper**

Old:
```tsx
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline text-primary">Footnote</h2>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 09</span>
            </div>
            <div className="bg-surface-container-latest p-8 space-y-4">
```

New:
```tsx
    return (
        <div className="bg-surface-container-latest p-8 space-y-4">
```

Remove closing `</section>`.

- [ ] **Step 7: Type-check**

```
node_modules/.bin/tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/builder/CoupleSection.tsx \
        src/components/admin/builder/HeroSection.tsx \
        src/components/admin/builder/PreCeremonySection.tsx \
        src/components/admin/builder/CeremonyDetailsSection.tsx \
        src/components/admin/builder/FormalReceptionSection.tsx \
        src/components/admin/builder/FootnoteSection.tsx
git commit -m "refactor(builder): strip section wrappers from simple sections"
```

---

## Task 3: Update `FormalInvitationSection.tsx` — relocate enable toggle

The "Formal Image Override" toggle lives in the current header's left side. It moves to a row at the top of the content.

**Files:**
- Modify: `src/components/admin/builder/FormalInvitationSection.tsx`

- [ ] **Step 1: Replace the return block opening**

Old (lines 53–71):
```tsx
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
```

New:
```tsx
    return (
        <div className="space-y-4">
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
            <div className="bg-surface-container-low p-8 rounded-xl space-y-6">
```

- [ ] **Step 2: Close the outer wrapper**

At the very end of the return, change:
```tsx
            </div>
        </section>
```
to:
```tsx
            </div>
        </div>
```

- [ ] **Step 3: Type-check**

```
node_modules/.bin/tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/builder/FormalInvitationSection.tsx
git commit -m "refactor(builder): strip header from FormalInvitationSection, relocate toggle"
```

---

## Task 4: Update `HousesSection.tsx` — relocate enable toggle

The "Enable Section" toggle lives in the header. It moves to the top of the content. Note: HousesSection had no section number badge in its header.

**Files:**
- Modify: `src/components/admin/builder/HousesSection.tsx`

- [ ] **Step 1: Replace the return block opening**

Old (lines 13–29):
```tsx
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-headline text-primary">The Houses</h2>
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
                </div>
            </div>

            {showHouses && (
```

New:
```tsx
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
```

- [ ] **Step 2: Close the outer wrapper**

At the very end of the return, change:
```tsx
            )}
        </section>
```
to:
```tsx
            )}
        </div>
```

- [ ] **Step 3: Type-check**

```
node_modules/.bin/tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/builder/HousesSection.tsx
git commit -m "refactor(builder): strip header from HousesSection, relocate toggle"
```

---

## Task 5: Update `GiftOptionsSection.tsx` — relocate action buttons

The "+ Bank" and "+ Mobile" buttons live in the header's right side. They move to a row above the content div.

**Files:**
- Modify: `src/components/admin/builder/GiftOptionsSection.tsx`

- [ ] **Step 1: Replace the return block opening**

Old (lines 49–61):
```tsx
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-headline text-primary">Registry Details</h2>
                <div className="flex gap-2">
                    <button type="button" onClick={() => onAddGiftOption('bank')} className="text-[0.75rem] bg-surface-container font-label uppercase text-primary hover:bg-surface-container-high px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Bank
                    </button>
                    <button type="button" onClick={() => onAddGiftOption('mobile')} className="text-[0.75rem] bg-surface-container font-label uppercase text-primary hover:bg-surface-container-high px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Mobile
                    </button>
                </div>
            </div>
            <div className="bg-surface-container-latest p-8 space-y-6">
```

New:
```tsx
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button type="button" onClick={() => onAddGiftOption('bank')} className="text-[0.75rem] bg-surface-container font-label uppercase text-primary hover:bg-surface-container-high px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Bank
                </button>
                <button type="button" onClick={() => onAddGiftOption('mobile')} className="text-[0.75rem] bg-surface-container font-label uppercase text-primary hover:bg-surface-container-high px-3 py-1.5 rounded transition-colors flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Mobile
                </button>
            </div>
            <div className="bg-surface-container-latest p-8 space-y-6">
```

- [ ] **Step 2: Close the outer wrapper**

At the very end of the return, change:
```tsx
            </div>
        </section>
```
to:
```tsx
            </div>
        </div>
```

- [ ] **Step 3: Type-check**

```
node_modules/.bin/tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/builder/GiftOptionsSection.tsx
git commit -m "refactor(builder): strip header from GiftOptionsSection, relocate add buttons"
```

---

## Task 6: Update `NavigationEditorSection.tsx` — relocate enable toggle

The "Enable Navigation" toggle lives in the header's left side. It moves to the top of the content. The section's existing internal accordion (the `isOpen`/`onToggleOpen` button for "Navigation content & pages") is **untouched** — it remains inside the section content.

**Files:**
- Modify: `src/components/admin/builder/NavigationEditorSection.tsx`

- [ ] **Step 1: Replace the return block opening**

Old (lines 58–75):
```tsx
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-headline text-primary">Multi-Page Navigation (Beta)</h2>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showNavigation || false}
                            onChange={(e) => onToggleShowNavigation(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 text-[0.75rem] font-label uppercase text-primary tracking-widest font-bold">Enable Navigation</span>
                    </label>
                </div>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 08</span>
            </div>
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-latest overflow-hidden">
```

New:
```tsx
    return (
        <div className="space-y-4">
            <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={showNavigation || false}
                    onChange={(e) => onToggleShowNavigation(e.target.checked)}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ms-3 text-[0.75rem] font-label uppercase text-primary tracking-widest font-bold">Enable Navigation</span>
            </label>
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-latest overflow-hidden">
```

- [ ] **Step 2: Close the outer wrapper**

At the very end of the return, change:
```tsx
            </div>
        </section>
```
to:
```tsx
            </div>
        </div>
```

- [ ] **Step 3: Type-check**

```
node_modules/.bin/tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/builder/NavigationEditorSection.tsx
git commit -m "refactor(builder): strip header from NavigationEditorSection, relocate toggle"
```

---

## Task 7: Update `admin/page.tsx` — wire up CollapsibleSection

**Files:**
- Modify: `src/app/admin/page.tsx`

**Note on steps 3–12 prop lists:** Each step shows `...` to represent the existing props for that section, which are **not changed at all**. The exact props for each section are visible in `src/app/admin/page.tsx` at the lines referenced in each step. The only change in every step is adding `<CollapsibleSection ...>` open and close tags around the existing JSX.

- [ ] **Step 1: Add import**

Find the block of builder-section imports (around line 30–45, looks like):
```tsx
import { CoupleSection } from '@/components/admin/builder/CoupleSection';
```

Add immediately after the last builder import:
```tsx
import { CollapsibleSection } from '@/components/admin/builder/CollapsibleSection';
```

- [ ] **Step 2: Wrap `CoupleSection`**

Old (line ~1254):
```tsx
                                        <CoupleSection bride={liveData.bride} groom={liveData.groom} onChange={handleInputChange} />
```

New:
```tsx
                                        <CollapsibleSection title="The Couple" sectionNumber="01">
                                            <CoupleSection bride={liveData.bride} groom={liveData.groom} onChange={handleInputChange} />
                                        </CollapsibleSection>
```

- [ ] **Step 3: Wrap `HeroSection`** (admin/page.tsx lines 1256–1284)

Surround the existing `<HeroSection ... />` JSX with:
```tsx
<CollapsibleSection title="Hero" sectionNumber="02">
    {/* existing <HeroSection ... /> unchanged */}
</CollapsibleSection>
```

- [ ] **Step 4: Wrap `FormalInvitationSection`** (admin/page.tsx lines 1286–1303)

Surround the existing `<FormalInvitationSection ... />` JSX with:
```tsx
<CollapsibleSection title="Formal Invitation" sectionNumber="03">
    {/* existing <FormalInvitationSection ... /> unchanged */}
</CollapsibleSection>
```

- [ ] **Step 5: Wrap `PreCeremonySection`** (admin/page.tsx lines 1305–1311)

Surround with:
```tsx
<CollapsibleSection title="Pre-Ceremony" sectionNumber="04">
    {/* existing <PreCeremonySection ... /> unchanged */}
</CollapsibleSection>
```

- [ ] **Step 6: Wrap `HousesSection`** (admin/page.tsx lines 1313–1318)

Surround with:
```tsx
<CollapsibleSection title="The Houses" sectionNumber="05">
    {/* existing <HousesSection ... /> unchanged */}
</CollapsibleSection>
```

- [ ] **Step 7: Wrap `CeremonyDetailsSection`** (admin/page.tsx lines 1320–1327)

Surround with:
```tsx
<CollapsibleSection title="Ceremony Details" sectionNumber="06">
    {/* existing <CeremonyDetailsSection ... /> unchanged */}
</CollapsibleSection>
```

- [ ] **Step 8: Wrap `FormalReceptionSection`** (admin/page.tsx lines 1329–1336)

Surround with:
```tsx
<CollapsibleSection title="Reception" sectionNumber="07">
    {/* existing <FormalReceptionSection ... /> unchanged */}
</CollapsibleSection>
```

- [ ] **Step 9: Replace the inline Custom Blocks `<section>` block**

Old (lines ~1338–1375):
```tsx
                                        {/* Section 06: Custom Editor */}
                                        <section>
                                            <div className="flex justify-between items-center mb-8">
                                                <h2 className="text-2xl font-headline text-primary">Custom Blocks</h2>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddSection}
                                                        className="text-xs font-label uppercase font-bold text-primary hover:text-on-primary-container bg-surface-container-high px-4 py-2 rounded-full transition-colors flex items-center gap-1 tracking-widest"
                                                    >
                                                        <Plus className="w-3 h-3" /> Append Block
                                                    </button>
                                                    <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest ml-4">Section 07</span>
                                                </div>
                                            </div>

                                            {liveData.customSections?.length === 0 ? (
                                                <p className="text-[0.875rem] font-body text-secondary italic text-center py-8 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">No custom editorial narrative blocks appended yet.</p>
                                            ) : (
                                                <div className="space-y-8">
                                                    {liveData.customSections?.map((section, idx) => (
                                                        <CustomSectionBlock
                                                            key={section.id}
                                                            section={section}
                                                            idx={idx}
                                                            files={customFiles[section.id]}
                                                            onSectionChange={handleSectionChange}
                                                            onRemove={handleRemoveSection}
                                                            onSlideshowToggle={handleSlideshowToggle}
                                                            onSlideshowFilesAdd={handleSlideshowFilesAdd}
                                                            onSlideshowRemoveSlide={handleSlideshowRemoveSlide}
                                                            onCustomFileChange={handleCustomFileChange}
                                                            onRemoveCustomMedia={removeCustomSectionMedia}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </section>
```

New:
```tsx
                                        <CollapsibleSection title="Custom Blocks" sectionNumber="08">
                                            <div className="space-y-6">
                                                <button
                                                    type="button"
                                                    onClick={handleAddSection}
                                                    className="text-xs font-label uppercase font-bold text-primary hover:text-on-primary-container bg-surface-container-high px-4 py-2 rounded-full transition-colors flex items-center gap-1 tracking-widest"
                                                >
                                                    <Plus className="w-3 h-3" /> Append Block
                                                </button>
                                                {liveData.customSections?.length === 0 ? (
                                                    <p className="text-[0.875rem] font-body text-secondary italic text-center py-8 bg-surface-container-lowest border border-outline-variant/20 rounded-xl">No custom editorial narrative blocks appended yet.</p>
                                                ) : (
                                                    <div className="space-y-8">
                                                        {liveData.customSections?.map((section, idx) => (
                                                            <CustomSectionBlock
                                                                key={section.id}
                                                                section={section}
                                                                idx={idx}
                                                                files={customFiles[section.id]}
                                                                onSectionChange={handleSectionChange}
                                                                onRemove={handleRemoveSection}
                                                                onSlideshowToggle={handleSlideshowToggle}
                                                                onSlideshowFilesAdd={handleSlideshowFilesAdd}
                                                                onSlideshowRemoveSlide={handleSlideshowRemoveSlide}
                                                                onCustomFileChange={handleCustomFileChange}
                                                                onRemoveCustomMedia={removeCustomSectionMedia}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </CollapsibleSection>
```

- [ ] **Step 10: Wrap `GiftOptionsSection`** (admin/page.tsx lines 1377–1404)

Surround the existing `<GiftOptionsSection ... />` JSX with:
```tsx
<CollapsibleSection title="Registry Details" sectionNumber="09">
    {/* existing <GiftOptionsSection ... /> unchanged */}
</CollapsibleSection>
```

- [ ] **Step 11: Wrap `NavigationEditorSection`** (admin/page.tsx lines 1406–1451)

Surround the existing `<NavigationEditorSection ... />` JSX with:
```tsx
<CollapsibleSection title="Multi-Page Navigation" sectionNumber="10">
    {/* existing <NavigationEditorSection ... /> unchanged */}
</CollapsibleSection>
```

- [ ] **Step 12: Wrap `FootnoteSection`**

Old (line ~1453):
```tsx
                                        <FootnoteSection footnote={liveData.footnote || ''} onChange={handleInputChange} />
```

New:
```tsx
                                        <CollapsibleSection title="Footnote" sectionNumber="11">
                                            <FootnoteSection footnote={liveData.footnote || ''} onChange={handleInputChange} />
                                        </CollapsibleSection>
```

- [ ] **Step 13: Type-check**

```
node_modules/.bin/tsc --noEmit
```

Expected: zero new errors.

- [ ] **Step 14: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat(builder): wire CollapsibleSection around all 11 builder sections"
```

---

## Task 8: Verify in browser

- [ ] **Step 1: Start dev server**

```
npm run dev
```

- [ ] **Step 2: Open builder**

Log in as admin, open a client invitation in the builder. Confirm:
- All 11 sections render as collapsed headers (title + "Section NN" badge + chevron pointing right)
- Clicking a header expands it with a smooth height animation
- Clicking again collapses it
- The chevron rotates 180° when open

- [ ] **Step 3: Verify form fields still work**

Expand each section and confirm:
- All inputs, toggles, file pickers, and dropdowns function identically to before
- HousesSection: "Enable Section" toggle appears at the top of expanded content
- FormalInvitationSection: "Formal Image Override" toggle appears at the top
- NavigationEditorSection: "Enable Navigation" toggle appears at the top; inner "Navigation content & pages" accordion still works
- GiftOptionsSection: "+ Bank" / "+ Mobile" buttons appear at the top
- Custom Blocks: "Append Block" button appears at the top; blocks render below it

- [ ] **Step 4: Push**

```bash
git push origin feat/collapsible-builder-sections
```
