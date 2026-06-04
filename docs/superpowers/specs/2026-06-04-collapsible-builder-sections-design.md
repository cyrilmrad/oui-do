# Collapsible Builder Sections — Design Spec

**Date:** 2026-06-04
**Branch:** feat/collapsible-builder-sections
**Scope:** UI only — no prop, data, or behavioral changes

---

## Problem

The invitation builder in `app/admin/page.tsx` renders 11 sections sequentially with no visual grouping or collapse mechanism. As the form grows, navigating between sections (e.g. jumping from Hero to Gift Options) requires excessive scrolling. All content is always visible.

## Goal

Make each builder section independently collapsible. All sections start collapsed so the admin sees a compact list of section headers on load and can expand only what they need.

---

## Architecture

### New component: `CollapsibleSection`

**Path:** `src/components/admin/builder/CollapsibleSection.tsx`

**Props:**
```tsx
interface CollapsibleSectionProps {
  title: string;
  sectionNumber: string; // zero-padded, e.g. "01"
  children: React.ReactNode;
  defaultOpen?: boolean; // defaults to false
}
```

**State:** `const [isOpen, setIsOpen] = useState(defaultOpen ?? false)` — fully self-contained, no state lifted to parent.

**Rendering:**

```
<section>
  <button>               ← full-width clickable header
    <h2>{title}</h2>     ← text-2xl font-headline text-primary
    <div>
      <span>Section {sectionNumber}</span>   ← text-secondary tracking-widest
      <ChevronDown />    ← rotates 180° when open (transition-transform duration-300)
    </div>
  </button>
  <div grid-rows-[0fr/1fr] transition>   ← CSS grid height animation
    <div overflow-hidden min-h-0>
      <div pb-8>
        {children}
      </div>
    </div>
  </div>
</section>
```

**Animation:** CSS `grid-template-rows` trick — `0fr` (collapsed) → `1fr` (expanded) with `transition-[grid-template-rows] duration-300 ease-in-out`. No JS height measurements; works for dynamic content.

**Design tokens used (admin palette):**
- Title: `text-2xl font-headline text-primary`
- Section badge: `text-[0.75rem] font-label uppercase text-secondary tracking-widest`
- Section divider: `border-b border-outline-variant/20`
- Header hover: `hover:bg-surface-container-low`
- Chevron: `text-secondary`
- Accessibility: `cursor-pointer`, `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30`

---

## Section File Changes

Each of the 10 builder section files in `src/components/admin/builder/` has its structural wrapper removed. The change is uniform across all files:

**Remove:**
1. Outer `<section>` open/close tags
2. `<div className="flex justify-between items-center mb-8">` block (h2 + Section NN span)

**Keep:** All form fields, labels, inputs, and callbacks — completely untouched.

Result: each section component returns its bare form content (a fragment or a single div), no structural wrapper.

**Files modified:**
- `CoupleSection.tsx`
- `HeroSection.tsx`
- `FormalInvitationSection.tsx`
- `PreCeremonySection.tsx`
- `HousesSection.tsx`
- `CeremonyDetailsSection.tsx`
- `FormalReceptionSection.tsx`
- `GiftOptionsSection.tsx`
- `NavigationEditorSection.tsx`
- `FootnoteSection.tsx`

`CustomSectionBlock.tsx` is NOT modified — it is a repeater component, not a builder section. It gets wrapped in `admin/page.tsx` like the others.

---

## `admin/page.tsx` Changes

**Add import:**
```tsx
import { CollapsibleSection } from '@/components/admin/builder/CollapsibleSection';
```

**Wrap each section call:**
```tsx
<CollapsibleSection title="The Couple" sectionNumber="01">
  <CoupleSection bride={...} groom={...} onChange={...} />
</CollapsibleSection>
```

**Section map:**

| sectionNumber | title | Component |
|---|---|---|
| 01 | The Couple | `CoupleSection` |
| 02 | Hero | `HeroSection` |
| 03 | Formal Invitation | `FormalInvitationSection` |
| 04 | Pre-Ceremony | `PreCeremonySection` |
| 05 | Houses | `HousesSection` |
| 06 | Ceremony Details | `CeremonyDetailsSection` |
| 07 | Reception | `FormalReceptionSection` |
| 08 | Custom Sections | `CustomSectionBlock` repeater |
| 09 | Gift Options | `GiftOptionsSection` |
| 10 | Navigation | `NavigationEditorSection` |
| 11 | Footnote | `FootnoteSection` |

---

## Out of Scope

- **Expand All / Collapse All** — deferred; can be added via parent-controlled `open` prop later
- **State persistence** (localStorage) — not needed for MVP
- **Keyboard shortcut** to open a specific section — not needed
- **Animation on mount** — sections open with no animation (they're collapsed, not animated in)
- Any changes to section props, data flow, or API calls

---

## Verification

Before declaring done:
1. `node_modules/.bin/tsc --noEmit` — zero new errors
2. Builder opens with all 11 sections collapsed
3. Clicking a header expands that section smoothly; clicking again collapses it
4. All form fields inside each section work identically to before
5. No other builder functionality regressed
