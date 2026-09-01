# Padelstar Logo Redesign — Implementation Plan

## 1. Establish the new asset roles

Use the supplied assets as follows:

- `Visual redesign/Logos/main_logo.png`
  - Primary Padelstar logo
  - Landing-page hero branding
  - Desktop top-bar brand mark where space allows
  - Resume/tournament entry branding if needed

- `Visual redesign/Logos/zigonia logo.png`
  - Zigonia IT attribution
  - Footer/developer branding
  - About/help or landing-page credit area

The existing app icons and compact logos should remain in place for favicon, PWA, manifest, and small navigation contexts unless separate icon assets are provided.

## 2. Validate and prepare the raster assets

Before integrating:

- Confirm transparent padding and visible-content bounds.
- Check whether the black regions are transparent or baked into the image.
- Create optimized web copies if necessary:
  - Hero version
  - Desktop header version
  - Compact/mobile version
  - Footer/developer version
- Preserve the original files as source assets.
- Export compressed PNG/WebP variants only if visual quality remains identical.
- Confirm that the logos remain legible against both the classic and cool-sports themes.

Recommended target behavior:

- `main_logo.png`: `object-fit: contain`, never cropped.
- `zigonia logo.png`: constrained by height rather than width because of its wide aspect ratio.
- Use `aria-label`/`alt` text consistently; do not rely on visible logo text for accessibility.

## 3. Update the landing page

Modify the landing experience in `index.html`:

- Replace the current hero logo asset with `main_logo.png`.
- Keep the existing `picture`/responsive structure only if it remains useful after testing.
- Remove or revise old preload declarations for the previous hero assets.
- Add appropriate intrinsic dimensions to prevent layout shift.
- Use the new logo as the visual anchor above:
  - Version label
  - “Bli med” action
  - “Opprett” action
- Keep the existing navigation, profile editor, resume panel, and functionality unchanged.
- Replace the landing-page developer logo with `zigonia logo.png`.
- Ensure the Zigonia mark sits naturally in the footer or lower attribution area without competing with the primary CTA.

## 4. Update the authenticated/workspace header

In the current top bar:

- Replace the existing `padelstar_button-540.png` reference with a compact presentation of `main_logo.png`.
- Set a fixed height and responsive max-width so the logo does not dominate workspace content.
- Use different sizing rules for:
  - Desktop workspace
  - Tablet
  - Mobile
- Retain the brand-home button behavior and accessible home label.
- Avoid using the full hero logo at very small widths if it causes unreadable text or excessive header height.
- Keep the existing module links, language picker, connection status, and theme toggle functional.

## 5. Create a consistent logo treatment in CSS

Refactor the scattered logo rules in `styles/styles.css` into reusable tokens and component rules.

Introduce variables for:

- Logo heights
- Maximum logo widths
- Header spacing
- Hero spacing
- Footer logo opacity
- Light/dark surface treatment
- Logo glow or shadow intensity

Consolidate the existing duplicate rules around:

- `.brand-logo`
- `.hero-logo`
- `.landing-nav-logo`
- `.landing-developer-logo`

The new CSS should support:

- Contained scaling
- No distortion
- Safe overflow behavior
- High-DPI displays
- Reduced-motion and reduced-transparency preferences
- Both theme variants

Avoid applying heavy filters to the logos. Their metallic blue/purple lighting should remain the primary visual effect.

## 6. Align the surrounding interface with the logo direction

Use the new logo as the basis for the broader redesign language:

- Deep navy/black application surfaces
- Electric blue as the primary accent
- Violet as a restrained secondary highlight
- Silver/white typography for high-priority content
- Soft luminous edges rather than numerous hard borders
- Rounded elevated cards inspired by the supplied `Visual redesign` references
- Stronger visual emphasis on live matches, current court, next match, and tournament status

The redesign should borrow visual principles from the reference folder, but not copy its branding, exact layouts, or content.

## 7. Preserve theme behavior

The current application has classic and cool-sports theme asset switching.

Decide explicitly whether the new logos are:

- Theme-neutral and used in both themes, or
- The new default for the classic theme with separate cool-sports variants later

Initial recommendation:

- Use the supplied logos as the default Padelstar/Zigonia assets in both themes.
- Keep the existing theme-asset mechanism intact.
- Add theme-specific overrides only if contrast or legibility testing shows a real need.

Do not remove `data-theme-asset`, `data-classic-src`, or `data-cool-src` until the switching behavior has been verified.

## 8. Update related metadata and loading behavior

Review:

- Logo preload declarations
- `apple-touch-icon`
- Favicon references
- PWA manifest icons
- Open Graph or share-preview assets, if present
- Image `loading`, `decoding`, and `fetchpriority` attributes

The large source logo should not be eagerly loaded in every view. Prioritize it on the landing page and load secondary branding lazily where appropriate.

Do not replace app icons with the full rectangular logo unless a dedicated icon crop is created and tested.

## 9. Responsive layout requirements

Validate intentionally at:

- 360 × 800 mobile
- 390 × 844 mobile
- 768 × 1024 tablet
- 1024 × 768 desktop/tablet
- 1280 × 800 desktop
- 1440 × 900 desktop

### Mobile requirements

- Hero logo remains prominent but does not push primary actions below the fold.
- Header logo does not collide with the menu button.
- Zigonia logo remains readable without creating excessive vertical space.
- No horizontal scrolling.
- Touch targets remain at least approximately 44px.
- Existing mobile navigation behavior remains intact.

### Desktop requirements

- Hero composition should use available width without creating oversized empty space.
- Workspace header should feel compact and application-like.
- Logo and navigation should have clear separation.
- Cards and live tournament information should receive more visual weight than branding.

## 10. Functional regression checks

Verify that logo changes do not affect:

- Navigation between all modules
- Landing-page menu toggle
- Theme switching
- Language switching
- Resume tournament behavior
- Admin and player flows
- Tournament view
- Dialogs and toast notifications
- PWA installation assets
- Offline loading
- Accessibility semantics

Run the existing checks:

```bash
npm run check:syntax
npm test
```

## 11. Visual QA

Use the existing browser smoke workflow and compare before/after screenshots.

Check specifically for:

- Logo clipping
- Blurry scaling
- Layout shift during image loading
- Poor contrast against backgrounds
- Excessive header height
- Footer attribution imbalance
- Theme-switch regressions
- Mobile overflow
- Focus-ring visibility around logo buttons
- Screen-reader labels and alt text

Relevant existing visual outputs include:

- `output/playwright/ui-landing.png`
- `output/playwright/ui-setup.png`

## 12. Suggested implementation order

1. Inspect and validate both new PNGs.
2. Add them to the application asset pipeline.
3. Replace landing-page hero and developer logo references.
4. Replace the workspace header logo.
5. Consolidate responsive logo CSS.
6. Verify theme switching.
7. Update preload and metadata references.
8. Run syntax checks and tests.
9. Capture desktop and mobile screenshots.
10. Tune spacing, sizing, contrast, and loading behavior.
11. Perform final accessibility and regression review.

## Definition of done

The implementation is complete when:

- The new Padelstar logo is used consistently for primary branding.
- The new Zigonia logo is used consistently for developer attribution.
- Existing navigation and functionality remain unchanged.
- Logos scale correctly across desktop, tablet, and mobile.
- Theme switching still works.
- No visual clipping, layout shift, or overflow remains.
- Automated tests and browser smoke checks pass.
