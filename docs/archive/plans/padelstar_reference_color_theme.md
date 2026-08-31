# Padelstar — Reference-Inspired Cool Sports Theme

## Purpose

Create an alternative Padelstar visual theme inspired by contemporary sports and esports interfaces: dark, focused, energetic and premium, with a cool foundation and controlled warm highlights.

This theme must feel distinctly sports-oriented rather than like a generic purple dark mode. It combines navy and blue-black foundations with indigo/slate surfaces, violet interaction states, sports red/coral energy, and electric blue as a bridge accent.

The theme is an alternative visual system. Do not remove, overwrite or destructively alter the existing Padelstar theme.

## Design direction

- Use a dark navy / blue-black base as the dominant environment.
- Use indigo and slate for cards, panels, navigation containers and elevated surfaces.
- Use violet / blue-violet for interaction, selection, focus and progression.
- Treat sports red / coral as a significant identity color, especially for live and high-energy states.
- Use electric blue / indigo as a bridge between the cool and warm accent families.
- Use soft white and cool gray typography for clear hierarchy and reduced glare.
- Keep the overall impression premium, athletic, decisive and high-contrast.

## Color proportions

Use the following approximate visual balance across each screen:

- **70–80% dark neutrals:** backgrounds, large containers, navigation, inactive areas and structural chrome.
- **15–20% controlled accent:** selected states, cards with emphasis, buttons, tabs, progress indicators and branded details.
- **5–10% high-energy highlights:** live indicators, match momentum, urgent activity, score changes and small focal moments.

These are visual proportions, not hard token quotas. Avoid making every component colorful.

## Core palette

### Dark neutrals

| Token | Suggested value | Use |
|---|---|---|
| `ps-night` | `#080D18` | App shell, deepest background and full-bleed areas |
| `ps-blue-black` | `#0D1424` | Primary page background |
| `ps-navy` | `#111C32` | Navigation, headers and large structural surfaces |
| `ps-indigo-slate` | `#18243D` | Cards, panels and elevated containers |
| `ps-slate` | `#25324C` | Dividers, borders, inactive controls and subtle contrast |
| `ps-slate-muted` | `#34415B` | Disabled surfaces and low-priority UI |

### Typography and icon contrast

| Token | Suggested value | Use |
|---|---|---|
| `ps-text-primary` | `#F4F7FB` | Headings, scores, primary labels and important data |
| `ps-text-secondary` | `#B8C2D3` | Supporting text and metadata |
| `ps-text-muted` | `#7F8CA4` | Placeholders, timestamps and low-emphasis labels |
| `ps-text-on-accent` | `#FFFFFF` | Text on saturated violet, red or blue controls |

### Violet / blue-violet interaction family

| Token | Suggested value | Use |
|---|---|---|
| `ps-violet` | `#8B5CF6` | Primary interactive accent and selected controls |
| `ps-violet-bright` | `#A78BFA` | Hover, focus and luminous secondary states |
| `ps-violet-deep` | `#5B3BB5` | Pressed states, dark emphasis and progression tracks |
| `ps-violet-wash` | `rgba(139, 92, 246, 0.16)` | Selected backgrounds and subtle glow |

Use violet / blue-violet for:

- selected navigation and tabs
- filters and active controls
- focus rings and keyboard focus
- tournament progression
- selected players, teams or brackets
- secondary highlights and subtle illumination

### Sports red / coral identity family

| Token | Suggested value | Use |
|---|---|---|
| `ps-sports-red` | `#E5484D` | Core sports identity, live activity and strong emphasis |
| `ps-coral` | `#FF6B6B` | Brighter live states, badges and energetic highlights |
| `ps-red-deep` | `#A92E3A` | Pressed states, dark red surfaces and depth |
| `ps-coral-wash` | `rgba(229, 72, 77, 0.16)` | Live backgrounds, soft emphasis and match activity |

Sports red / coral is allowed to occupy a meaningful part of the brand language. It must not be restricted to error or warning messaging.

Use it selectively for:

- live matches and live match badges
- current tournament activity
- match momentum and active score emphasis
- high-energy calls to action
- prominent sports highlights
- status accents that communicate intensity or immediacy

### Electric blue / indigo bridge family

| Token | Suggested value | Use |
|---|---|---|
| `ps-electric-blue` | `#38BDF8` | Bridge accent, data emphasis and cool energy |
| `ps-blue` | `#3B82F6` | Links, secondary actions and informational states |
| `ps-indigo` | `#6366F1` | Supporting accent between violet and blue |
| `ps-blue-wash` | `rgba(56, 189, 248, 0.14)` | Informational emphasis and cool glow |

Use electric blue / indigo to connect the violet and sports-red families. It is especially useful for:

- statistics and performance data
- links and secondary actions
- match metrics that are active but not live-critical
- gradients between cool surfaces and warm highlights
- technical or tactical visualizations

## Semantic color separation

Sports red and danger red are different concepts and must have separate tokens, names and usage rules.

### Sports red

Sports red communicates identity, intensity, live action and competitive energy. It can appear in branded UI, live badges, active matches and score emphasis without implying a problem.

### Danger red

Danger red communicates destructive, invalid or unsafe situations only.

| Token | Suggested value | Use |
|---|---|---|
| `ps-danger` | `#DC2626` | Errors, destructive actions and validation failures |
| `ps-danger-wash` | `rgba(220, 38, 38, 0.14)` | Error backgrounds and destructive confirmation states |

Do not use `ps-danger` for live matches merely because both colors are red. Do not use `ps-sports-red` for delete, irreversible, invalid or security-related messaging.

## Gradients and effects

Gradients should support hierarchy and energy, not decorate every surface.

Preferred combinations:

- `ps-blue-black` → `ps-navy` for page backgrounds
- `ps-navy` → `ps-indigo-slate` for elevated surfaces
- `ps-violet-deep` → `ps-electric-blue` for progression and cool interaction moments
- `ps-violet` → `ps-sports-red` for high-energy branded moments
- `ps-sports-red` → `ps-coral` for live or match-intensity highlights

Use glows sparingly. A subtle violet, electric-blue or coral glow may reinforce a selected or live state, but large persistent glows reduce readability and make the interface feel noisy.

## Component guidance

### Navigation

- Keep the navigation mostly navy / blue-black.
- Use violet or blue-violet for the selected destination.
- Use a small coral or sports-red marker for live activity, not as the entire navigation background.

### Cards and panels

- Use indigo/slate surfaces with restrained borders.
- Reserve brighter accents for the card's important state or action.
- A live match card may use a coral edge, badge or glow, but should retain a dark neutral body.

### Buttons

- Primary action: violet or blue-violet when the action is general navigation or progression.
- High-energy sports action: sports red / coral when the action relates to live play, match intensity or immediate competition.
- Secondary action: slate or electric blue.
- Destructive action: danger red only.

### Scores and match status

- Use soft white for the primary score.
- Use violet / blue-violet for selected or progressing states.
- Use sports red / coral for live or high-intensity emphasis.
- Use electric blue for supporting statistics and performance data.

### Forms and feedback

- Focus: violet or electric blue.
- Informational: electric blue.
- Success: use a separate success token appropriate to the existing product system; do not force success into sports red.
- Error or destructive action: danger red.

## Accessibility and contrast

- Preserve readable contrast between text and dark surfaces.
- Do not rely on red versus green, or color alone, to communicate status.
- Pair live and danger states with labels, icons, patterns or supporting text.
- Ensure focused controls have a visible ring independent of the surrounding surface.
- Verify text, icons and controls against their actual rendered backgrounds, especially when using washes or gradients.

## Logo and asset handling

Asset handling must be non-destructive.

- Never overwrite original PNG, JPG, JPEG, WebP or SVG files.
- Never replace an original logo in place with a themed version.
- Create themed variants in a separate directory, for example:

  ```text
  assets/
    original/
    themed/
      reference-cool-sports/
        logo-violet.svg
        logo-red-coral.svg
        logo-cool-metallic.svg
  ```

- Preserve original dimensions, aspect ratio and source files.
- Keep source SVGs editable where possible.
- Give every generated variant an explicit, descriptive filename.
- Maintain at least these logo colorways:
  - `logo-violet`
  - `logo-red-coral`
  - `logo-cool-metallic`
- If a logo needs a light and dark version, add separate files rather than replacing one file.
- Use CSS filters only for temporary previews; export and store intentional variants as separate assets when they are part of the product theme.
- Do not modify, rename or delete unrelated assets while applying this theme.

## Implementation rules for Codex

1. Treat this document as a self-contained visual specification for an alternative Padelstar theme.
2. Inspect the existing token and asset structure before making changes.
3. Add theme tokens with clear names rather than scattering raw color values through components.
4. Keep the existing theme functional and available.
5. Apply the 70–80 / 15–20 / 5–10 visual balance at screen level.
6. Use sports red as an intentional identity and live-energy color, not merely as an error color.
7. Keep sports red and danger red semantically separate in both token names and components.
8. Create logo and image variants only in a dedicated themed-assets directory.
9. Do not overwrite original PNG/JPG/JPEG/WebP/SVG files under any circumstances.
10. Verify representative screens for contrast, visual hierarchy, selected states, live states and destructive states after implementation.

## Acceptance criteria

- The resulting theme reads as a cool, premium sports interface with visible red/coral identity energy.
- Dark neutrals remain dominant across the product.
- Violet / blue-violet is clearly associated with interaction and progression.
- Sports red / coral is clearly associated with live and high-energy sports states.
- Electric blue / indigo bridges the cool and warm accent families.
- Danger red remains reserved for errors and destructive actions.
- Typography remains soft white / cool gray and legible.
- Existing original assets are untouched.
- The themed asset directory contains separate violet, red/coral and cool-metallic logo variants.
- The theme can be enabled or reviewed without destroying the existing Padelstar visual system.
