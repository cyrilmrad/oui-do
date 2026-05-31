# Invitation Templates — Noir (v1) Design Spec

**Date:** 2026-05-27  
**Branch:** `feat/invitation-templates-noir`  
**Status:** Approved

---

## Problem & Goal

All oui-do invitations currently share a single visual presentation: the Classic template (continuous scroll, light stone/emerald). Clients have no way to choose a fundamentally different look and feel. The goal is to introduce a template system that lets admins select a different invitation experience per client — without touching existing live invitations.

**v1 scope:** Build the template infrastructure and the first new template (Noir: dark, full-screen scroll-snap sections). Template selection is mocked in the admin builder preview only — no DB changes, no changes to the public `/invite/[slug]` page yet.

---

## What "Template" Means

- **Theme** = same layout, different colors/fonts (already exists via the Theme system)
- **Template** = different interaction paradigm + visual style (new concept)

Templates are not themes. Switching template changes how the invitation is experienced structurally, not just visually.

---

## Architecture

### Template Registry

New file: `src/lib/templates.ts`

```ts
export type TemplateId = 'classic' | 'noir';

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  description: string;
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  classic: { id: 'classic', name: 'Classic', description: 'Continuous scroll, light & timeless' },
  noir:    { id: 'noir',    name: 'Noir',    description: 'Full-screen snap sections, dark & dramatic' },
};
```

### NoirTemplate Component

New file: `src/components/NoirTemplate.tsx`

Same props as `InvitationPreview` (`data: InvitationData`, `isPreview?: boolean`). Renders a dark, full-screen scroll-snap invitation.

**Scroll-snap structure:**
```
<div style="height:100%; overflow-y:scroll; scroll-snap-type:y mandatory">
  <section style="min-height:100%; scroll-snap-align:start"> {/* Hero */} </section>
  <section style="min-height:100%; scroll-snap-align:start"> {/* Formal (if enabled) */} </section>
  <section ...> {/* Ceremony */} </section>
  <section ...> {/* Reception (if receptionVenue) */} </section>
  <section ...> {/* Gifts (if giftOptions?.length) */} </section>
  <section ...> {/* RSVP */} </section>
</div>
```

When `isPreview=true`, sections fill 100% of the container. When false (future public use), sections fill `100svh`.

**Sections rendered (v1 core):**

| Section | Condition | Data used |
|---|---|---|
| Hero | always | `heroImage`, `heroVideo`, `bride`, `groom`, `showHeroDate`, `date`, `showHeroLogo`, `heroLogoUrl` |
| Formal Invitation | `showFormalInvitation && formalInvitationImage` | `formalInvitationImage`, `formalInvitationIsVideo` |
| Ceremony | always | `venue`, `time`, `date`, `location` |
| Reception | `receptionVenue` is set | `receptionVenue`, `receptionTime`, `receptionLocation`, `receptionAddress` |
| Gifts | `giftOptions?.length > 0` | `giftOptions`, `giftMessage` |
| RSVP | always | `showRsvp`, `rsvpClosedMessage` |

**Visual language:**
- Background: `#0d0d0d` / `#111`
- Section cards: `rgba(255,255,255,0.05)` with `backdrop-filter:blur(16px)` and `border: 1px solid rgba(255,255,255,0.09)`
- Text: `#fff` (headings), `#ccc` (body), `#555` (labels)
- Fonts: `font-headline` (Noto Serif) for names/titles, `font-body`/`font-label` (Manrope) for details — same as existing
- Dot progress indicator on the right edge (tracks current section)
- No audio player, no navigation tabs, no custom sections, no footnote in v1

**RSVP:** Inline form with attending/decline toggle + name/pax inputs. Calls `/api/rsvp` using `fetchWithAuth` — same API as Classic. `isPreview=true` disables form submission.

### TemplateSection Builder Component

New file: `src/components/admin/builder/TemplateSection.tsx`

Purely presentational (no useState, no hooks). Props:
```ts
interface Props {
  selectedTemplate: TemplateId;
  onTemplateChange: (id: TemplateId) => void;
}
```

Renders as "Section 00 — Design Template" at the top of the builder. Shows Classic and Noir as selectable cards with a mini visual description. Follows the same section header style as other builder sections (`bg-primary`, `text-on-primary`, etc.).

### Admin Page Changes (`src/app/admin/page.tsx`)

1. **New state:** `const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('classic')`
2. **Reset on client select:** add `setSelectedTemplate('classic')` alongside the other resets when a new client is loaded
3. **Mount TemplateSection** as the first section in the builder form (above CoupleSection)
4. **Preview switcher:** replace the single `<InvitationPreview>` call with:
   ```tsx
   {selectedTemplate === 'noir'
     ? <NoirTemplate data={previewData} isPreview />
     : <InvitationPreview data={previewData} isPreview />
   }
   ```

### Public Invite Page

**No changes.** `/invite/[slug]/page.tsx` continues to render `<InvitationPreview>` for all invitations. Noir is only visible in the admin builder preview.

### DB / API

**No changes.** `templateId` is not persisted. The template selection is ephemeral UI state in the admin session.

---

## Backward Compatibility

- All existing invitations: unaffected. Classic renders identically.
- No DB migration. No API changes.
- The new `TemplateSection` appears in the builder but defaults to `'classic'` — admins see no difference unless they actively switch to Noir.

---

## File Summary

| File | Action |
|---|---|
| `src/lib/templates.ts` | **Create** — TemplateId type + TEMPLATES registry |
| `src/components/NoirTemplate.tsx` | **Create** — scroll-snap dark renderer |
| `src/components/admin/builder/TemplateSection.tsx` | **Create** — Section 00 picker (presentational) |
| `src/app/admin/page.tsx` | **Modify** — selectedTemplate state, TemplateSection mount, preview switcher |

---

## Verification

1. Run `npm run dev` and open the admin page
2. Select any client → go to Invitation Builder
3. Section 00 "Design Template" appears at the top with Classic selected by default
4. Switch to Noir → preview panel changes to dark scroll-snap layout
5. Switch back to Classic → preview returns to normal
6. Check another client → template resets to Classic
7. Verify `/invite/[slug]` public page is unchanged (still Classic)
8. Run `node_modules/.bin/tsc --noEmit` — zero new type errors
