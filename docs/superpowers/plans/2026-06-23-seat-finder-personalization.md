# Seat Finder Personalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins configure a hero image and welcome message for the public `/seat/[slug]` page from the existing Seat Finder QR tab.

**Architecture:** New `seat_finder_settings` jsonb column on `invitations` holds the config. A new `PUT /api/admin/seat-finder-settings` route persists it. `SeatFinderQr.tsx` gains a "Guest page" editor section. The seat finder page reads and renders the settings alongside the invitation data it already fetches.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM on postgres.js, Supabase storage (`assets` bucket), Tailwind v4, Sonner toasts, TypeScript.

## Global Constraints

- Never use `alert()` — use `toast.success` / `toast.error` from `sonner`
- No raw `&`, `'`, `"` in JSX text nodes — use `&amp;`, `&apos;`, `&quot;`
- `postgres.js` is pinned to 1 connection per serverless instance — do not raise the limit
- Run `node_modules/.bin/tsc --noEmit` after every task before committing
- Keep each commit scoped to its task

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/seatFinder.ts` | **Create** | `SeatFinderSettings` interface + default constant |
| `src/db/schema.ts` | **Modify** | Add `seatFinderSettings` jsonb column |
| `src/app/api/admin/seat-finder-settings/route.ts` | **Create** | `PUT` endpoint — saves settings by slug |
| `src/components/admin/SeatFinderQr.tsx` | **Modify** | Add `accessToken` prop, on-mount fetch, "Guest page" section |
| `src/app/admin/page.tsx` | **Modify** | Pass `accessToken` to `SeatFinderQr` |
| `src/app/seat/[slug]/page.tsx` | **Modify** | Read and render image + welcome message |

---

## Task 1: Shared type + DB column

**Files:**
- Create: `src/lib/seatFinder.ts`
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces: `SeatFinderSettings` interface and `DEFAULT_SEAT_FINDER_SETTINGS` constant — imported by Tasks 2, 3, and 4.

- [ ] **Step 1: Create the shared type file**

Create `src/lib/seatFinder.ts` with this exact content:

```ts
export interface SeatFinderSettings {
    imageMode: 'none' | 'logo' | 'hero' | 'custom';
    customImageUrl?: string;
    welcomeMessage: string;
}

export const DEFAULT_SEAT_FINDER_SETTINGS: SeatFinderSettings = {
    imageMode: 'none',
    welcomeMessage: '',
};
```

- [ ] **Step 2: Add the column to the Drizzle schema**

In `src/db/schema.ts`, add one line inside the `invitations` table definition, after the `customSections` line (line ~40):

```ts
// before:
customSections: jsonb('custom_sections').default([]),
footnote: text('footnote'),

// after:
customSections: jsonb('custom_sections').default([]),
seatFinderSettings: jsonb('seat_finder_settings').default(null),
footnote: text('footnote'),
```

- [ ] **Step 3: Push the schema to the database**

```bash
npm run db:push
```

Expected: Drizzle detects one new column (`seat_finder_settings`) and applies it. No data loss.

- [ ] **Step 4: Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seatFinder.ts src/db/schema.ts
git commit -m "feat(seating): add seatFinderSettings type and DB column"
```

---

## Task 2: PUT /api/admin/seat-finder-settings

**Files:**
- Create: `src/app/api/admin/seat-finder-settings/route.ts`

**Interfaces:**
- Consumes: `SeatFinderSettings` from `@/lib/seatFinder`, `requireFeatureForSlug` from `@/lib/entitlements/guard`, `db` + `invitations` from `@/db`
- Produces: `PUT /api/admin/seat-finder-settings` — accepts `{ slug: string, seatFinderSettings: SeatFinderSettings }`, returns `{ ok: true }` or `{ error: string }`

- [ ] **Step 1: Create the route directory and file**

Create `src/app/api/admin/seat-finder-settings/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { invitations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireFeatureForSlug } from '@/lib/entitlements/guard';
import type { SeatFinderSettings } from '@/lib/seatFinder';

export async function PUT(request: Request) {
    try {
        const body = await request.json() as { slug?: string; seatFinderSettings?: SeatFinderSettings };
        const { slug, seatFinderSettings } = body;

        if (!slug) {
            return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
        }
        if (!seatFinderSettings) {
            return NextResponse.json({ error: 'Missing seatFinderSettings' }, { status: 400 });
        }

        const guard = await requireFeatureForSlug(request, slug, 'seating');
        if (!guard.ok) {
            return NextResponse.json({ error: guard.message }, { status: guard.status });
        }

        await db
            .update(invitations)
            .set({ seatFinderSettings, updatedAt: new Date() })
            .where(eq(invitations.slug, slug));

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Failed saving seat finder settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
```

- [ ] **Step 2: Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/seat-finder-settings/route.ts
git commit -m "feat(seating): add PUT /api/admin/seat-finder-settings endpoint"
```

---

## Task 3: SeatFinderQr builder section

**Files:**
- Modify: `src/components/admin/SeatFinderQr.tsx`
- Modify: `src/app/admin/page.tsx` (line ~1566)

**Interfaces:**
- Consumes: `SeatFinderSettings`, `DEFAULT_SEAT_FINDER_SETTINGS` from `@/lib/seatFinder`; `uploadInvitationAsset` from `@/lib/uploadInvitationAsset`
- Produces: Updated `SeatFinderQrProps` with `accessToken: string | null`; "Guest page" section that saves to `PUT /api/admin/seat-finder-settings`

- [ ] **Step 1: Update imports in SeatFinderQr.tsx**

At the top of `src/components/admin/SeatFinderQr.tsx`, add two imports after the existing ones:

```ts
// existing:
import { Download, Link as LinkIcon, ExternalLink, Upload, X, QrCode, Check } from 'lucide-react';
import { toast } from 'sonner';

// add after:
import type { SeatFinderSettings } from '@/lib/seatFinder';
import { DEFAULT_SEAT_FINDER_SETTINGS } from '@/lib/seatFinder';
import { uploadInvitationAsset } from '@/lib/uploadInvitationAsset';
```

Also add `Loader2` to the lucide-react import (it's needed for the save button spinner):

```ts
import { Download, Link as LinkIcon, ExternalLink, Upload, X, QrCode, Check, Loader2 } from 'lucide-react';
```

- [ ] **Step 2: Update the props interface**

Replace the existing `SeatFinderQrProps` interface:

```ts
// before:
interface SeatFinderQrProps {
    slug: string;
    brideGroom: string;
}

// after:
interface SeatFinderQrProps {
    slug: string;
    brideGroom: string;
    accessToken: string | null;
}
```

- [ ] **Step 3: Update the component signature and add new state**

Replace the component signature and add the new state variables after the existing `const [copied, setCopied] = useState(false);` line:

```ts
// before:
export default function SeatFinderQr({ slug, brideGroom }: SeatFinderQrProps) {
    const [origin, setOrigin] = useState('');
    const [style, setStyle] = useState<QrStyleState>(DEFAULT_STYLE);
    const [fileExt, setFileExt] = useState<FileExtension>('png');
    const [copied, setCopied] = useState(false);

// after:
export default function SeatFinderQr({ slug, brideGroom, accessToken }: SeatFinderQrProps) {
    const [origin, setOrigin] = useState('');
    const [style, setStyle] = useState<QrStyleState>(DEFAULT_STYLE);
    const [fileExt, setFileExt] = useState<FileExtension>('png');
    const [copied, setCopied] = useState(false);
    const [sfSettings, setSfSettings] = useState<SeatFinderSettings>(DEFAULT_SEAT_FINDER_SETTINGS);
    const [sfHeroLogoUrl, setSfHeroLogoUrl] = useState('');
    const [sfHeroImage, setSfHeroImage] = useState('');
    const [sfSaving, setSfSaving] = useState(false);
```

- [ ] **Step 4: Add the on-mount fetch for existing settings**

Add this `useEffect` block right after the existing `useEffect(() => { setOrigin(window.location.origin); }, []);` block:

```ts
useEffect(() => {
    if (!slug) return;
    fetch(`/api/invitation?slug=${slug}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
            if (!data) return;
            if (data.seatFinderSettings) setSfSettings(data.seatFinderSettings as SeatFinderSettings);
            if (data.heroLogoUrl) setSfHeroLogoUrl(data.heroLogoUrl as string);
            if (data.heroImage) setSfHeroImage(data.heroImage as string);
        })
        .catch(() => {});
}, [slug]);
```

- [ ] **Step 5: Add seat-finder state helpers**

Add these three functions after the existing `const set = ...` helper and `handleImageUpload`:

```ts
const setSf = <K extends keyof SeatFinderSettings>(key: K, value: SeatFinderSettings[K]) => {
    setSfSettings((prev) => ({ ...prev, [key]: value }));
};

const handleCustomImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
        const url = await uploadInvitationAsset(slug, file, 'seat-finder');
        setSf('customImageUrl', url);
    } catch {
        toast.error('Image upload failed');
    }
};

const handleSavePersonalization = async () => {
    if (!accessToken) return;
    setSfSaving(true);
    try {
        const res = await fetch('/api/admin/seat-finder-settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ slug, seatFinderSettings: sfSettings }),
        });
        if (!res.ok) {
            const data = await res.json() as { error?: string };
            throw new Error(data.error || 'Failed to save');
        }
        toast.success('Personalization saved');
    } catch (err) {
        toast.error('Save failed', { description: err instanceof Error ? err.message : undefined });
    } finally {
        setSfSaving(false);
    }
};
```

- [ ] **Step 6: Add the "Guest page" section to the JSX**

In the controls column (`<div className="space-y-8">`), add this new section after the existing "Logo" section (after its closing `</section>` tag, before the closing `</div>` of the controls column):

```tsx
{/* Guest page personalization */}
<section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5 space-y-4">
    <h3 className="text-sm font-headline text-primary">Guest page</h3>

    <Field label="Image">
        <div className="flex flex-wrap gap-2 mb-2">
            {(['none', 'logo', 'hero', 'custom'] as const).map((mode) => (
                <button
                    key={mode}
                    type="button"
                    onClick={() => setSf('imageMode', mode)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${sfSettings.imageMode === mode ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface hover:opacity-80'}`}
                >
                    {mode === 'none' ? 'None' : mode === 'logo' ? 'Logo' : mode === 'hero' ? 'Hero photo' : 'Custom'}
                </button>
            ))}
        </div>
        {sfSettings.imageMode === 'logo' && sfHeroLogoUrl && (
            <img src={sfHeroLogoUrl} alt="Logo preview" className="h-10 object-contain rounded" />
        )}
        {sfSettings.imageMode === 'hero' && sfHeroImage && (
            <img src={sfHeroImage} alt="Hero preview" className="h-16 w-full object-cover rounded-xl" />
        )}
        {sfSettings.imageMode === 'custom' && (
            <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity">
                    <Upload className="w-3.5 h-3.5" /> Upload image
                    <input type="file" accept="image/*" onChange={handleCustomImageUpload} className="hidden" />
                </label>
                {sfSettings.customImageUrl && (
                    <>
                        <img src={sfSettings.customImageUrl} alt="Custom preview" className="h-10 object-contain rounded" />
                        <button
                            type="button"
                            onClick={() => setSf('customImageUrl', undefined)}
                            className="text-xs text-rose-600 hover:underline"
                        >
                            Remove
                        </button>
                    </>
                )}
            </div>
        )}
    </Field>

    <Field label="Welcome message">
        <textarea
            value={sfSettings.welcomeMessage}
            onChange={(e) => setSf('welcomeMessage', e.target.value)}
            placeholder="e.g. We&apos;re so happy you&apos;re with us tonight."
            rows={2}
            maxLength={160}
            className="w-full bg-surface-container-high text-on-surface text-sm rounded-lg px-3 py-2 outline-none border border-outline-variant/20 focus:ring-2 focus:ring-primary/30 resize-none"
        />
        <span className="text-[0.65rem] text-secondary">{sfSettings.welcomeMessage.length}/160</span>
    </Field>

    <button
        type="button"
        onClick={handleSavePersonalization}
        disabled={sfSaving || !accessToken}
        className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-medium shadow-md hover:bg-primary/90 transition-all text-sm disabled:opacity-50"
    >
        {sfSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save personalization'}
    </button>
</section>
```

- [ ] **Step 7: Pass accessToken from admin/page.tsx**

In `src/app/admin/page.tsx`, find the `SeatFinderQr` usage (around line 1565–1566) and add the `accessToken` prop:

```tsx
// before:
<SeatFinderQr slug={liveData.slug} brideGroom={`${liveData.bride} & ${liveData.groom}`} />

// after:
<SeatFinderQr slug={liveData.slug} brideGroom={`${liveData.bride} & ${liveData.groom}`} accessToken={accessToken} />
```

- [ ] **Step 8: Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 9: Manual smoke test**

1. `npm run dev`
2. Log in as admin, open a client, navigate to the **Seat Finder QR** tab
3. Scroll to the bottom of the left controls — the **Guest page** section should appear
4. Select **Custom**, upload a small image — a preview should appear
5. Type a welcome message
6. Click **Save personalization** — expect `toast.success('Personalization saved')`
7. Reload the page, navigate back to the tab — settings should be pre-populated

- [ ] **Step 10: Commit**

```bash
git add src/components/admin/SeatFinderQr.tsx src/app/admin/page.tsx
git commit -m "feat(seating): add Guest page personalization section to SeatFinderQr"
```

---

## Task 4: Seat page rendering

**Files:**
- Modify: `src/app/seat/[slug]/page.tsx`

**Interfaces:**
- Consumes: `SeatFinderSettings` from `@/lib/seatFinder`; `seatFinderSettings`, `heroLogoUrl`, `heroImage` from the `/api/invitation` response (already fetched on mount)

- [ ] **Step 1: Add the import**

At the top of `src/app/seat/[slug]/page.tsx`, add after the existing imports:

```ts
import type { SeatFinderSettings } from '@/lib/seatFinder';
```

- [ ] **Step 2: Expand InvitationInfo**

Replace the existing `InvitationInfo` interface:

```ts
// before:
interface InvitationInfo {
    bride: string;
    groom: string;
    accent?: string;
    background?: string;
}

// after:
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

- [ ] **Step 3: Read the new fields from the fetch**

In the `useEffect` that fetches from `/api/invitation`, update the `setInfo` call:

```ts
// before:
setInfo({
    bride: data.bride,
    groom: data.groom,
    accent: theme.rawAccent,
    background: theme.rawBackground,
});

// after:
setInfo({
    bride: data.bride,
    groom: data.groom,
    accent: theme.rawAccent,
    background: theme.rawBackground,
    heroLogoUrl: data.heroLogoUrl || undefined,
    heroImage: data.heroImage || undefined,
    seatFinderSettings: data.seatFinderSettings
        ? (data.seatFinderSettings as SeatFinderSettings)
        : undefined,
});
```

- [ ] **Step 4: Render the seat finder image**

In the JSX, inside `<header>`, add the image block **before** the `<span>` "Find your seat" badge. After the opening `<header className="text-center mb-8">` tag:

```tsx
{(() => {
    const sf = info?.seatFinderSettings;
    if (!sf) return null;
    const src =
        sf.imageMode === 'logo' ? info?.heroLogoUrl :
        sf.imageMode === 'hero' ? info?.heroImage :
        sf.imageMode === 'custom' ? sf.customImageUrl :
        undefined;
    if (!src) return null;
    if (sf.imageMode === 'hero') {
        return <img src={src} alt="" className="w-full max-h-40 object-cover rounded-2xl mb-6" />;
    }
    return <img src={src} alt="" className="mx-auto mb-6 max-h-20 object-contain" />;
})()}
```

- [ ] **Step 5: Replace the static welcome line**

Find the static welcome message paragraph (currently around line 131–133):

```tsx
// before:
<p style={{ fontFamily: SERIF, color: accent }} className="text-base italic font-light opacity-60 mb-5">
    We&apos;re so glad you&apos;re here
</p>

// after:
<p style={{ fontFamily: SERIF, color: accent }} className="text-base italic font-light opacity-60 mb-5">
    {info?.seatFinderSettings?.welcomeMessage || "We’re so glad you’re here"}
</p>
```

- [ ] **Step 6: Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 7: Manual smoke test**

1. In the admin builder, set **Image = Custom**, upload an image, set a welcome message, and save.
2. Open `/seat/<slug>` in an incognito tab.
3. Verify the custom image appears above the "Find your seat" badge.
4. Verify the welcome message appears in place of the static text.
5. In the admin, set **Image = None**, clear the welcome message, and save.
6. Reload `/seat/<slug>` — image should be gone, static "We're so glad you're here" should be back.

- [ ] **Step 8: Commit**

```bash
git add src/app/seat/[slug]/page.tsx
git commit -m "feat(seating): render seatFinderSettings image and welcome message on seat page"
```
