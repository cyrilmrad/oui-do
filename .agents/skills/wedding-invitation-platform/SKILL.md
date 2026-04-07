---
name: Wedding Invitation Platform Management
description: Instructions for maintaining and extending the OUI DO invitation builder, including dashboard synchronization, theme management, and cinematic media rendering.
---

# Wedding Invitation Platform Skill

This skill provides the architectural principles and implementation patterns for the OUI DO Wedding Invitation Platform, a Next.js-based system for building and managing cinematic wedding invitations.

## 1. Core Architecture

The platform follows a "Component-as-Source-of-Truth" pattern for rendering both public, admin, and client views.

- **Central Component**: `src/components/InvitationPreview.tsx`
  - All invitation data is passed into this component.
  - It handles responsive scaling, visibility logic, and media playback.
- **Data Flow**:
  - **Public Page**: `src/app/invite/[slug]/page.tsx` (SSR/Static with Drizzle fetch).
  - **Admin Dashboard**: `src/app/admin/page.tsx` (Direct state management + local preview).
  - **Client Dashboard**: `src/app/dashboard/page.tsx` (Client-side state + local preview).

> [!IMPORTANT]
> Always ensure feature parity between the **Admin** and **Client** dashboards. Any UI or logic update for section editing in `admin/page.tsx` MUST be replicated in `dashboard/page.tsx`.

## 2. Cinematic Media Management

The platform emphasizes a premium, cinematic experience for media.

### Video Playback Specs
- **No Loop**: All videos (Hero, Intro, Custom Blocks) should play exactly once upon entering the viewport.
- **Uncropped Rendering**: Use `w-full h-auto` for video elements to preserve their original aspect ratio.
- **Triggered Play**: Use `onViewportEnter` with a `ref` or `document.getElementById` to call `.play()` when the video is in view.

### Custom Blocks & Full-Bleed
- **Full Bleed**: When `isFullBleed` is enabled, remove horizontal and vertical padding for the background media.
- **Overlay Control**: Use the `showOverlay` flag to toggle the greyish foreground (`bg-stone-950/40`).
- **Clean Media Mode**: Use `overlayType: 'none'` to display media without any text or graphic overlays.

## 3. Theme System

The platform uses a dynamic theme system mapped to CSS variables for maximum flexibility.

### Token Mapping
- **Primary Text**: `--theme-primary-text`
- **Accent/Brand**: `--theme-accent`
- **Background**: `--theme-background`

### Theme Sanitization
- When rendering text overlays or components using theme colors, use a `sanitizeTheme` utility function (implemented in `InvitationPreview.tsx`) to strip unwanted Tailwind background or border classes that might interfere with the intended design.

## 4. Database Schema (Drizzle ORM)

The database schema is defined in `src/db/schema.ts` and uses Supabase for hosting.

- **Invitations Table**: Contains JSONB fields for `theme` and `custom_sections`.
- **Relationship Mapping**:
  - Guests belong to Invitations via `invitation_id`.
  - Expenses are linked to Invitations via `slug`.
  - Seating Tables are linked via `slug`.

> [!TIP]
> When adding new invitation features, update the `InvitationData` and `CustomSection` interfaces in `src/components/InvitationPreview.tsx` first, then update the DB schema if persistence is required.

## 5. Deployment & Build

- **Build Command**: `npm run build`
- **Database Push**: `npx drizzle-kit push` (Use for quick schema updates to Supabase).
- **Static Assets**: All media (images/videos) should be hosted on public accessible URLs (e.g., Supabase Storage).

## 6. Agent Behavior & Token Optimization

> [!IMPORTANT]
> You are operating in a strict, cost-optimized coding mode. You must pause and wait for explicit user instruction before taking any action outside of code generation.

### Strict Action Constraints
- **No Autonomous Git:** NEVER execute `git add`, `git commit`, `git push`, or any version control commands unless explicitly told to do so in the current prompt.
- **No Browser/Testing:** NEVER launch local servers, run browser tests, or execute testing suites automatically. 
- **Strictly Coding:** Your role is limited to generating, updating, and saving code to files. 

### Token Optimization (Minimal Output)
- **Zero Fluff:** Do not output conversational filler, pleasantries, or unsolicited explanations. Provide the code and stop.
- **Partial Code Blocks:** NEVER output an entire file if you are only changing a few lines. Use placeholders like `// ... existing code ...` to skip unchanged sections.
- **Diff Focus:** Only output the exact functions, components, or lines that are being created or modified.