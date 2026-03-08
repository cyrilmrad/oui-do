# Upgrade Admin Builder & Guest View to Modular Blocks

This plan outlines the steps to upgrade the e-invitation builder to support Hero Logos and Modular Custom Sections.

## Proposed Changes

### 1. Data Schema Updates
- **File**: `src/components/InvitationPreview.tsx`
  - Export a new interface `CustomSection` with properties:
    - `id` (string)
    - `backgroundUrl` (string)
    - `overlayType` ('text' | 'image')
    - `textContent` (string, optional)
    - `fontFamily` (string, optional)
    - `overlayImageUrl` (string, optional)
  - Update `InvitationData` interface to include:
    - `heroLogoUrl?: string`
    - `showHeroLogo?: boolean`
    - `customSections?: CustomSection[]`

- **File**: `src/app/admin/page.tsx` & `src/app/dashboard/page.tsx`
  - Update internal `defaultData` and state initialization (`weddingDetails`) to initialize `showHeroLogo: false` and `customSections: []`.

---

### 2. Admin Form Upgrades (`src/app/admin/page.tsx`)
- **Hero Settings**:
  - Add text input for "Hero Logo URL (PNG)".
  - Add a toggle switch to toggle `showHeroLogo` (Text Names vs. Logo).
- **Dynamic Section Builder**:
  - Create a new "Custom Sections" UI block below existing media details.
  - Implement an "Add New Section" button to push a new blank section to `customSections`.
  - Map through `customSections` to render inputs for each section:
    - `backgroundUrl` input.
    - Toggle for `overlayType` (Text vs. Image).
    - If 'text': `<textarea>` for `textContent` and `<select>` for `fontFamily` (options: `font-sans`, `font-serif`, `font-script`/custom tailwind class).
    - If 'image': input for `overlayImageUrl`.
  - Add a "Remove Section" button for each mapped block.
  - Create handler functions `handleAddSection`, `handleRemoveSection`, and `handleSectionChange`.

---

### 3. InvitationPreview Upgrades (`src/components/InvitationPreview.tsx`)
- **Hero Render**:
  - In the hero text block, evaluate `data.showHeroLogo` AND `data.heroLogoUrl`.
  - If true, display the image logic (`<img src={heroLogoUrl} />` styled responsively). 
  - Otherwise, fallback to the standard `data.bride & data.groom` text rendering.
- **Dynamic Sections Render**:
  - Map through `data.customSections` right below the main event details/gifts section.
  - Render a `min-h-[60vh]` div per section with `bg-[url(backgroundUrl)] bg-cover bg-center`.
  - Apply a typical dark overlay (`bg-black/40` or similar).
  - Wrap in `motion.div` for scroll-reveal.
  - If `overlayType === 'text'`, render the block centering `textContent` with the chosen `fontFamily`.
  - If `overlayType === 'image'`, render the block centering an `<img src={overlayImageUrl} />`.

## Verification Plan
1. **Manual Verification**: 
   - Load the admin panel. Create custom sections and verify that state updates successfully reflect in the real-time preview panel on the right.
   - Add both text-based and image-based sections to ensure conditional rendering operates as designed.
   - Upload a hero logo and toggle between logo and text.
2. **Build Verification**: Run `npm run build` to confirm no TypeScript typing overlaps are caused by the expanded `InvitationData` signature.
