# Seat Finder Page Personalization

**Date:** 2026-06-23
**Branch:** feat/seat-finder-qr
**Scope:** Add image and welcome message personalization to the public seat finder page, editable from the existing Seat Finder QR tab in the admin builder.

---

## Context

The seat finder page (`/seat/[slug]`) is a public, QR-code-accessible page guests scan at the venue to find their table. It currently shows the couple's names and accent colors drawn from the invitation theme, but no custom image or personal message.

QR style persistence is intentionally out of scope — the QR is styled once and printed; this will be revisited if it becomes a pain point.

---

## Data Layer

### New column on `invitations`

```ts
seatFinderSettings: jsonb('seat_finder_settings').default(null)
```

### Shape

```ts
interface SeatFinderSettings {
  imageMode: 'none' | 'logo' | 'hero' | 'custom';
  customImageUrl?: string;  // Supabase storage URL; only used when imageMode === 'custom'
  welcomeMessage: string;   // empty string = fall back to static default
}
```

- `null` column value → treat as `{ imageMode: 'none', welcomeMessage: '' }` (no regression for existing clients).
- `customImageUrl` is only stored/read when `imageMode === 'custom'`.
- The `/api/invitation` route already does `db.select().from(invitations)` and returns all columns — no change needed there.

---

## New API endpoint

### `PUT /api/admin/seat-finder-settings`

**Auth:** admin or client (slug-scoped). Uses `supabaseAdmin` server client, verifies the caller's `app_metadata.slug` matches the target slug (or role is `admin`).

**Request body:**
```json
{
  "slug": "string",
  "seatFinderSettings": {
    "imageMode": "none | logo | hero | custom",
    "customImageUrl": "string (optional)",
    "welcomeMessage": "string"
  }
}
```

**Response:** `200 { ok: true }` or standard error shape.

---

## Builder UI — `SeatFinderQr.tsx`

### New prop

```ts
accessToken: string
```

Passed from `admin/page.tsx` where `SeatFinderQr` is already mounted with `slug` and `brideGroom`.

### On mount

Fetch `/api/invitation?slug=...` to read the existing `seatFinderSettings` and pre-populate the personalization fields. Also extract `heroLogoUrl` and `heroImage` from the same response so the builder can show small inline previews when `Logo` or `Hero photo` mode is selected (no extra fetch needed).

### New "Guest page" section

Added at the bottom of the left-hand controls column, visually consistent with the other `<section>` cards (rounded-2xl, border, p-5).

**Controls:**

1. **Image** — segmented radio: `None | Logo | Hero photo | Custom`
   - `Logo`: uses `heroLogoUrl` from the invitation (read-only reference, no upload here).
   - `Hero photo`: uses `heroImage` from the invitation (read-only reference).
   - `Custom`: reveals an image upload input. File is uploaded to Supabase `assets` bucket via `uploadInvitationAsset`, storing the resulting URL as `customImageUrl`.
   - Switching away from `Custom` clears `customImageUrl` from local state (but does not delete the Supabase asset).

2. **Welcome message** — `<textarea>` with a soft 120-char hint. Placeholder: `"e.g. We're so happy you're with us tonight."` Blank = static fallback on the guest page.

**Save button:** "Save personalization" — `PUT /api/admin/seat-finder-settings`. Shows a loading spinner while in flight; `toast.success` on success, `toast.error` on failure.

---

## Seat Page — `seat/[slug]/page.tsx`

### Updated `InvitationInfo` interface

```ts
interface InvitationInfo {
  bride: string;
  groom: string;
  accent?: string;
  background?: string;
  heroLogoUrl?: string;
  heroImage?: string;
  seatFinderSettings?: SeatFinderSettings;
}
```

### Image rendering

Displayed **above** the "Find your seat" badge, centered. Sizing:

| Mode | Rendering |
|---|---|
| `none` / unset | Nothing rendered |
| `logo` | `<img>` max-height `80px`, object-fit contain |
| `hero` | `<img>` full-width, max-height `160px`, object-fit cover, rounded-xl |
| `custom` | Same as `logo` (max-height `80px`, contain) |

Falls back silently if the asset URL is missing or the mode is `none`.

### Welcome message rendering

Replaces the static `"We're so glad you're here"` italic line:
- If `welcomeMessage` is non-empty → render it in place of the static string.
- If blank or `seatFinderSettings` is null → render the existing static fallback (zero regression).

---

## What is NOT changing

- Lookup API (`/api/seating/lookup`) — no change.
- Result cards — no change.
- QR style persistence — deferred.
- Any entitlement gating — seat finder personalization is available to all clients who have the seat finder feature.
