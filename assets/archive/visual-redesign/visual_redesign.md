# Padelstar — Complete UI/UX Redesign

Redesign the existing **Padelstar** application using a premium, modern visual language inspired by high-end sports, tournament, fitness and gaming applications.

The supplied reference images are **visual inspiration only**.

Do NOT copy their:
- branding
- logos
- colors
- exact layouts
- content

Instead, extract and apply their common design principles: layered interfaces, elevated cards, generous rounded geometry, strong hierarchy, floating controls, subtle translucency, depth, premium typography and polished interaction design.

## 1. Primary objective

Transform Padelstar from something that feels like a conventional web application into a polished **cross-platform tournament application**.

It should feel appropriate as both:

- a professional desktop/web application
- a premium mobile application

Desktop and mobile are **equally important**.

Do NOT design mobile-first and then simply stretch the layout for desktop.

Do NOT design desktop-first and collapse everything into one column for mobile.

Instead, create responsive layouts intentionally designed for each viewport while sharing the same components, design tokens, visual identity and functionality.

The result should feel like the same Padelstar application on every device, but intelligently composed for the available screen space.

---

# 2. Preserve the existing application

Before changing the UI:

1. Inspect the existing codebase.
2. Understand the current application structure.
3. Identify the existing views/modules.
4. Identify reusable components.
5. Identify state management and tournament logic.
6. Identify the existing CSS/design system.
7. Identify functionality that must not be broken.

Preserve all existing working functionality and business logic unless a structural UI change genuinely requires refactoring.

This is primarily a **UI/UX redesign**, not a rewrite of the tournament engine.

Do not remove functionality merely because it does not fit the new layout.

---

# 3. Padelstar design language

The interface should feel:

- premium
- modern
- sporty
- clean
- tactile
- slightly futuristic
- sophisticated
- energetic without becoming visually noisy

Avoid the appearance of:

- a generic Bootstrap website
- a traditional admin dashboard
- a collection of rectangular HTML panels
- excessive borders
- flat Material Design
- excessive glassmorphism
- excessive gradients
- oversized empty desktop layouts

Think:

**Premium sports app + tournament control center + modern native application + subtle gaming UI influence.**

Padelstar should have its own identity rather than looking like a clone of another sports application.

---

# 4. Visual depth and hierarchy

One of the most important characteristics of the redesign is **depth**.

Use approximately four visual elevation levels:

### Level 1 — Application background

The main canvas of the application.

It should be visually calm and allow elevated content to stand out.

### Level 2 — Section surfaces

Larger structural areas used to organize related content.

These should be subtle and should not resemble traditional bordered containers.

### Level 3 — Cards

Tournament cards, match cards, player cards, court cards, statistics, setup components and similar content.

Cards should visually sit above the section surface.

### Level 4 — Floating UI

Navigation, dialogs, important actions, menus, notifications and overlays.

These should clearly occupy the highest visual layer.

Use:

- subtle shadows
- controlled transparency
- surface brightness differences
- faint edge highlights
- selective backdrop blur
- restrained gradients

Do not simply add box-shadow to every element.

---

# 5. Geometry

Use generous rounded geometry throughout the application.

Suggested hierarchy:

- small controls: 10–14px
- secondary cards: 14–20px
- primary cards: 20–28px
- major panels/hero cards: 24–32px
- pills: fully rounded

These values should become reusable design tokens rather than arbitrary values scattered throughout CSS.

Avoid sharp rectangular UI unless it serves a deliberate structural purpose.

---

# 6. Cards

Cards are a major part of the Padelstar design language.

They should feel like tactile interface objects rather than simple bordered containers.

Use:

- rounded surfaces
- subtle gradients where appropriate
- soft elevation
- faint borders/highlights
- clear internal spacing
- strong content hierarchy
- optional imagery or visual accents
- status badges

Different card types should have recognizable hierarchy.

Examples:

### Tournament hero card

Used for the currently active tournament.

May contain:

- tournament name
- status
- number of players
- current stage
- progress
- primary tournament action

### Match card

Clearly show:

- teams/players
- court
- match status
- score if applicable
- whose turn it is
- upcoming/current/completed state

### Player/team card

Compact representation of:

- player/team identity
- partner
- status
- statistics
- next match

### Court card

Show:

- court number/name
- current match
- waiting/available state
- next scheduled match

Cards may use subtle overlapping or layered elements where appropriate.

---

# 7. Information hierarchy

Padelstar should immediately answer the most important questions during a tournament:

**What is happening now?**

**What happens next?**

**Where am I supposed to be?**

**Who am I playing with?**

**Who am I playing against?**

**What is the current tournament state?**

Prioritize these questions visually.

Important current-state information should receive more visual weight than configuration or historical information.

---

# 8. Live tournament experience

When a tournament is active, the interface should feel alive.

Use clear status indicators such as:

- LIVE
- PLAYING
- NEXT
- WAITING
- READY
- COMPLETED

Do not rely only on color to communicate status.

Combine color with:

- icons
- labels
- typography
- surface treatment

The user's next match should be one of the easiest elements to locate in the entire interface.

---

# 9. Desktop layout

Desktop must be treated as a first-class experience.

Take advantage of horizontal space intelligently.

Use combinations such as:

- multi-column dashboards
- main content + contextual sidebar
- card grids
- tournament overview panels
- persistent navigation where useful
- larger tournament visualization
- simultaneous display of current and upcoming matches

Do NOT simply scale mobile cards larger.

Avoid extremely wide content.

Use sensible maximum content widths and responsive grids.

A possible tournament dashboard structure could be:

| Main area | Secondary area |
|-----------|----------------|
| Current matches | Tournament status |
| Upcoming matches | Courts |
| Tournament progression | Players / quick actions |

This is only a conceptual example. Adapt the actual structure to the existing Padelstar functionality.

---

# 10. Mobile layout

Mobile should feel like a genuine native-quality application.

Prioritize:

1. current tournament state
2. user's next match
3. current court/match
4. important actions
5. tournament overview
6. secondary information

Use:

- stacked cards
- horizontal scrolling where appropriate
- compact information density
- touch-friendly controls
- floating or bottom navigation where appropriate

Do not simply hide important desktop information.

Recompose it.

---

# 11. Responsive component behavior

Components should have deliberate responsive variants.

For example:

### Match list

Desktop:
Multiple match cards may appear beside each other.

Mobile:
Cards become stacked or horizontally scrollable.

### Tournament overview

Desktop:
Can display statistics, progress and courts simultaneously.

Mobile:
Break the same information into prioritized cards.

### Navigation

Desktop:
May use a compact sidebar, top navigation or floating navigation depending on the existing architecture.

Mobile:
May transform into a floating bottom navigation bar.

The visual identity must remain consistent.

---

# 12. Navigation

Navigation should feel like part of an application rather than a website menu.

Avoid a conventional large website navbar unless there is a strong UX reason.

Desktop may use:

- compact sidebar
- floating navigation rail
- compact top application bar

Mobile may use:

- floating bottom navigation
- contextual top bar
- floating primary action

Navigation surfaces should use:

- rounded geometry
- subtle elevation
- clear active states
- simple recognizable icons
- concise labels

---

# 13. Typography

Use a clean modern typography system consistent with the existing Padelstar identity.

Create clear levels for:

- display/title
- page heading
- section heading
- card heading
- body
- metadata
- labels
- numerical values

Tournament scores, court numbers and important status information should use stronger visual weight.

Avoid excessive font sizes.

Hierarchy should come from a combination of:

- size
- weight
- spacing
- contrast

rather than simply making everything large.

---

# 14. Buttons and interactive controls

Controls should feel tactile.

Primary actions:
- visually prominent
- strong contrast
- generous touch target
- subtle elevation

Secondary actions:
- quieter
- often pill-shaped
- visually integrated into cards

Selected controls should feel active through:

- surface change
- subtle illumination
- elevation
- icon/text treatment

Do not communicate selection through text color alone.

---

# 15. Padelstar design tokens

Refactor styling around reusable tokens.

Create or consolidate tokens for at least:

--background
--surface
--surface-secondary
--surface-elevated
--surface-glass

--text-primary
--text-secondary
--text-muted

--accent
--accent-hover
--accent-subtle

--success
--warning
--danger
--live

--border-subtle

--shadow-sm
--shadow-md
--shadow-lg
--shadow-floating

--radius-sm
--radius-md
--radius-lg
--radius-xl
--radius-pill

--space-xs
--space-sm
--space-md
--space-lg
--space-xl

Do not hardcode arbitrary visual values repeatedly throughout individual components.

---

# 16. Color

Do NOT copy the colors from the supplied reference applications.

Retain or evolve the existing **Padelstar color identity**.

Color should support the interface hierarchy rather than dominate it.

Use the Padelstar accent color strategically for:

- primary actions
- active navigation
- selected states
- tournament progress
- important highlights

Reserve semantic colors for actual semantic meaning.

Avoid turning every card into a different color.

---

# 17. Glass and translucency

Use glassmorphism selectively.

Good candidates:

- floating navigation
- overlays
- dialogs
- floating action controls
- contextual menus
- hero card overlays

Avoid applying backdrop blur to every card.

Most content cards should remain solid or semi-solid surfaces so the hierarchy remains readable.

---

# 18. Motion and interaction

Add restrained micro-interactions.

Suggested timing:

150–250ms

Use:

- subtle card hover elevation
- button press feedback
- smooth navigation transitions
- animated active indicators
- smooth accordion expansion
- gentle modal transitions
- subtle status changes

Desktop hover interactions should have equivalent touch behavior on mobile.

Do not make the application animation-heavy.

---

# 19. Tournament-specific UX

The visual redesign should particularly improve the presentation of:

- tournament creation
- tournament joining
- active tournament
- admin controls
- player view
- current matches
- upcoming matches
- courts
- teams
- players
- scores
- tournament progression
- tournament completion/results

During an active tournament, the UI should visually shift from a setup-oriented application into a **live tournament control center**.

Admin should immediately understand:

- what matches are running
- which courts are occupied
- which matches are next
- whether something requires attention

Players should immediately understand:

- whether they are playing
- when they play next
- which court
- their teammate
- their opponents

---

# 20. Empty and inactive states

Do not neglect screens where no tournament is active.

The Padelstar landing experience should still feel premium.

Instead of presenting plain forms immediately, use clear visual entry points such as:

**Create Tournament**

and

**Join Tournament**

These should feel like major application actions.

Setup screens should progressively reveal complexity rather than overwhelming the user with a large traditional form.

---

# 21. Accessibility

Maintain sufficient contrast.

Interactive controls must have clear:

- hover states
- focus states
- active states
- disabled states

Touch targets must be appropriately sized.

Do not rely solely on color.

Animations should respect `prefers-reduced-motion`.

---

# 22. Implementation strategy

Do not perform this redesign as hundreds of isolated CSS overrides.

First establish:

1. design tokens
2. typography system
3. surface/elevation system
4. responsive breakpoints
5. reusable card components
6. button/control system
7. navigation system
8. status/badge system
9. layout primitives

Then migrate the existing Padelstar views to the new system.

Reuse components wherever possible.

Remove obsolete CSS after components have been migrated.

Avoid creating duplicate styling systems.

---

# 23. Responsive philosophy

Use breakpoints based on where the interface actually needs to recompose rather than targeting specific devices.

Think in terms of:

compact
medium
expanded

rather than:

phone
tablet
desktop

The same component may change its internal composition depending on available space.

Use modern CSS techniques where appropriate:

- CSS Grid
- Flexbox
- clamp()
- minmax()
- auto-fit / auto-fill
- container queries where useful
- aspect-ratio
- responsive spacing

---

# 24. Final visual target

The redesigned Padelstar should look credible if shown as:

- a native mobile application
- an installed PWA
- a professional desktop tournament application
- a product screenshot on the Padelstar website

It should NOT feel like:

"a website made responsive for phones."

It should feel like:

**one professional application with layouts intentionally designed for different screen sizes.**

The final aesthetic should combine:

**premium sports UI
+ tournament control center
+ layered cards
+ subtle glass surfaces
+ soft depth
+ modern rounded geometry
+ strong information hierarchy
+ restrained gaming influence
+ professional desktop UX
+ native-quality mobile UX**

Above all, prioritize clarity during actual tournament use.

Padelstar is not merely displaying tournament data.

It should make the current state of the tournament immediately understandable.