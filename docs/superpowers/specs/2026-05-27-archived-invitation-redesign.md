# Archived Invitation Redesign

**Date:** 2026-05-27  
**Status:** Approved  
**Component:** `src/components/ArchivedInvitationView.tsx`

---

## What & Why

The current `ArchivedInvitationView` is a placeholder-quality layout: static `70vh` hero, cold grayscale filter, no visual hierarchy, no emotional landing. This page is **public-facing** — it's what guests see after the wedding. It needs to feel as considered as the live invitation.

---

## Approved Design

### Visual direction: Cinematic A × Warm Palette B

**Hero (full viewport)**
- Height: `100dvh` (dynamic viewport height — same as `InvitationPreview`)
- Background: couple's hero image with `sepia(0.45) brightness(0.72) saturate(0.85)` filter (warm sepia, not cold grayscale)
- Overlay: warm amber/brown gradient (`rgba(55,35,10,0.04)` → `rgba(26,16,3,0.78)`) — vignette darkens toward the bottom only
- Subtle top fade: `rgba(250,247,242,0.1)` → transparent, blends hero into page background
- **No hero if `heroImage` is absent** — falls back to a plain warm dark background

**Hero text (bottom-anchored, centered)**
- Eyebrow: `"A wedding remembered"` — `system-ui`, `0.6rem`, `letter-spacing: 0.48em`, uppercase, gold `#d4b77e`
- Headline: `"Thank You."` — `font-serif`, `5.4rem`, `font-weight: 400`, cream `#faf7f2`, warm text-shadow
- **Optional personal message** (new field): italic serif, `0.95rem`, `rgba(250,238,210,0.72)`, renders only if `data.archiveMessage` is non-empty. Max-width ~400px, line-height 1.75. Falls back gracefully — hidden when blank.
- Thin gold rule (`32px × 1px`, `rgba(212,183,130,0.55)`)
- Date: italic, `0.8rem`, muted cream, renders only if `data.date` is set
- Couple signature: `— Bride & Groom`, italic, `1.05rem`, warm cream

**Scroll cue** (absolute, bottom of hero)
- Label: `"Gifts"`, tiny uppercase, `letter-spacing: 0.25em`, gold-tinted, `opacity: 0.45`
- 1px vertical line fading out — only renders if gifts section will be visible

**Gifts section** (below the fold, cream `#faf7f2` / `bg-stone-50` equivalent)
- Top ornament: `· · ·` flanked by fade-in gold rules
- Label: `"Gifts & Registry"`, uppercase tiny, muted gold
- Tagline: `"Your generosity is still warmly welcomed — and deeply appreciated."` italic serif
- Gift options: pill cards (white bg, `border: 1px solid #d4c5a9`, `border-radius: 6px`), icon + type label + name. Hover: gold border + soft shadow
- Uses existing `InvitationGifts` component OR replaces it — see Implementation Notes

**Footnote** — unchanged, small uppercase muted, if `data.footnote` is set

---

## Data Shape Changes

One new optional field on `InvitationData`:

```ts
archiveMessage?: string; // short personal thank-you note, shown between headline and signature
```

This requires:
- Adding `archiveMessage` to the `InvitationData` type in `InvitationPreview.tsx`
- Adding an optional text input in `LifecyclePanel` (or a new `ArchiveSettingsBuilder` section) for admins to fill it in
- Persisting it in the `invitations` DB table (new column `archive_message text`)
- Exposing it via the existing `/api/admin/clients/[slug]/lifecycle` or the invitation upsert endpoint

**DB migration:** `ALTER TABLE invitations ADD COLUMN archive_message text;` — nullable, no default needed.

---

## Implementation Notes

- Keep `resolveTheme()` — still used for `cleanTheme.accent` / `cleanTheme.background` but the archived page overrides most colors explicitly with the warm palette. The theme accent can tint the ornament dots and gift pill hover.
- The `InvitationGifts` component can be reused as-is for the gift pills section — just pass `headerLabel="Gifts & Registry"` and `tagline="Your generosity is still warmly welcomed…"` as today, but the surrounding section chrome (ornament, label, tagline) is new markup in `ArchivedInvitationView`.
- Do **not** touch `InvitationPreview.tsx` for this change. The `archiveMessage` type addition is the only cross-file type change.
- The admin UI field for `archiveMessage` is **in scope** but minimal: a single `<textarea>` in `LifecyclePanel`, under the archive toggle. It saves via the existing lifecycle PATCH endpoint (extend the body + handler).

---

## Out of Scope

- Lifecycle panel redesign (separate session)
- Any change to the live invitation view
- Animations / page transitions (future)
- Gallery/multi-photo strip (Option C feature — not selected)
