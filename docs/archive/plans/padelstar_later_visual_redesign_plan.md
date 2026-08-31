# Padelstar — Later Visual Redesign Plan

Status: deferred target document
Activation: use only after the current overarching implementation plan has been completed up to the point where the UI redesign can begin.
Scope: visual redesign and UI implementation; preserve the existing product behavior and technical foundation.

## 1. Purpose

This document is a later-stage goal and implementation plan for Padelstar. It is intentionally separate from the current UI improvement plan and must not replace, interrupt, or be mixed into that plan before its activation point.

When activated, use this document to guide a substantial visual redesign of Padelstar while preserving:

- existing tournament logic and user flows;
- existing realtime behavior, synchronization, and stability;
- current application architecture unless a narrowly scoped UI change requires otherwise;
- accessibility and keyboard/focus behavior;
- responsive performance and runtime performance;
- existing data contracts and backend behavior.

The outcome should feel like a premium sports and tournament application rather than a conventional responsive website.

## 2. Activation gate

Do not start this plan while the current overarching plan still has required work before the UI redesign stage.

Start only when:

1. the current overarching plan explicitly reaches the UI-redesign point;
2. the application is in a stable enough state to establish a visual baseline;
3. existing core flows, tournament behavior, and realtime behavior can be exercised;
4. the current `ui_improvement_plan.md` has been treated as historical/technical input, not as a second competing implementation sequence.

At activation, inspect the repository and current UI before editing. Confirm the relevant routes, shared components, styling conventions, test commands, and any existing design tokens. Preserve unrelated user changes.

## 3. Design direction

Use the supplied reference images as inspiration for shared design principles only. Do not copy their branding, colors, illustrations, exact layouts, or distinctive visual assets.

The redesign should combine:

- a premium sports/tournament application aesthetic;
- Padelstar's dark/gold identity as the starting point, refined into a coherent system;
- layered surfaces and clear depth between page, section, card, and overlay;
- elevated cards with restrained shadows and meaningful hierarchy;
- subtle glass/translucent treatments where they improve depth, not as decoration everywhere;
- large rounded geometry with consistent radii;
- floating controls and anchored actions where they improve reachability;
- strong typography hierarchy and concise information density;
- tactile buttons and clear pressed, hover, focus, disabled, and loading states;
- status-driven UI with live/current content visually prominent;
- polished but restrained motion and micro-interactions;
- a restrained gaming influence without turning the product into a game interface.

The visual language must remain usable, legible, calm, and credible for real tournament operation.

## 4. Desktop and mobile principles

Desktop and mobile have equal priority. Do not treat one as a reduced version of the other.

Implement adaptive responsive composition across three conceptual layout modes:

- **Compact:** narrow mobile widths; prioritize one-handed reachability, vertical flow, essential actions, and clear current/live status.
- **Medium:** tablet and small desktop widths; recombine content into efficient two-column or stacked arrangements as space permits.
- **Expanded:** large desktop widths; use horizontal space intelligently through grids, contextual side panels, simultaneous tournament context, and floating or sticky utility controls.

The same design system and component concepts should be shared across modes, but composition may change intentionally. Avoid merely shrinking desktop layouts or allowing mobile layouts to become long unstructured lists.

Every important action must remain discoverable and usable with touch, mouse, keyboard, and assistive technology as applicable.

## 5. Non-goals and invariants

This plan does not authorize:

- changing tournament rules, scoring, standings, scheduling, or permissions;
- redesigning realtime protocols or altering synchronization semantics;
- replacing the application architecture for visual reasons alone;
- removing functionality to make a screen simpler;
- introducing visual effects that reduce readability, performance, or accessibility;
- copying the reference products' identity or exact UI;
- hiding important status, errors, or actions behind decorative interactions;
- introducing a new dependency when an existing project convention is sufficient.

If a visual change appears to require a behavior or data change, isolate the dependency, document it, and preserve backward-compatible behavior unless a separate decision explicitly authorizes otherwise.

## 6. Implementation sequence

### Phase 0 — Re-establish the baseline

Before changing the UI:

- map the existing application shell, landing flow, setup flow, workspace, tournament modules, dialogs, navigation, and responsive breakpoints;
- identify shared primitives and duplicated styling;
- record current behavior for core tournament and realtime flows;
- capture representative desktop and mobile screenshots or visual regression baselines;
- identify accessibility, performance, and responsive constraints that must not regress;
- list any known gaps from the existing `ui_improvement_plan.md` that remain relevant.

Deliverable: a short implementation map and a verified baseline, with no speculative redesign work yet.

### Phase 1 — Establish the design system first

Create or consolidate the visual foundation before migrating individual screens.

Define reusable tokens and primitives for:

- color roles, including dark surfaces, gold accent roles, semantic success/warning/error/live states, and readable text tiers;
- surface elevation, borders, translucency, overlays, and shadows;
- typography scale, weights, line heights, and numeric/status presentation;
- radius scale, spacing scale, sizing, and responsive layout rules;
- focus rings, hover/pressed/disabled/loading states;
- motion durations, easing, reduced-motion behavior, and transition boundaries;
- icons, icon sizing, and icon-to-label alignment;
- compact, medium, and expanded layout behavior.

Build and verify the core primitives before broad screen work: page shell, surface/card, stack/grid, button, icon button, badge/status indicator, input/select, tabs/navigation, dialog, toast/feedback, skeleton/loading state, and live/current indicator.

Deliverable: a documented, reusable design system that can express the redesign without page-specific exceptions becoming the default.

### Phase 2 — Redesign the shared application shell

Apply the new system to the common chrome and navigation:

- landing-to-app visual continuity;
- page background and layered surface structure;
- responsive navigation and active-location treatment;
- account/context controls;
- global status, notifications, and realtime indicators;
- desktop side panels or contextual utility areas where useful;
- mobile bottom/ floating controls where they improve reachability;
- consistent loading, empty, error, and offline/reconnecting states.

Do not proceed to broad module migration until the shell works coherently in compact, medium, and expanded layouts.

### Phase 3 — Redesign the highest-value flows

Migrate the primary user journeys in this order unless repository evidence supports a safer sequence:

1. landing and entry experience;
2. tournament setup and configuration;
3. active tournament workspace;
4. current/live match or round view;
5. standings, participants, and tournament overview;
6. supporting modules and secondary settings.

For each flow:

- preserve existing actions, validation, data, and realtime updates;
- make current/live state visually dominant but never ambiguous;
- use clear hierarchy for primary action, next action, and destructive action;
- replace ad hoc alerts/confirms with the established dialog and feedback patterns where applicable;
- provide deliberate compact, medium, and expanded compositions;
- keep loading, empty, error, reconnecting, and success states in the same visual language.

### Phase 4 — Add motion and tactile feedback

Add motion only after layout and hierarchy are stable. Prioritize motion that communicates state or improves orientation:

- route/module transitions;
- progress and setup completion;
- score and standings updates;
- live/realtime status changes;
- card/action feedback;
- loading and optimistic feedback where behavior already supports it.

Keep motion short, restrained, interruptible, and safe for `prefers-reduced-motion`. Never make essential content or controls depend on animation.

### Phase 5 — Consolidate and remove visual drift

After migration:

- replace remaining one-off values with tokens where appropriate;
- remove obsolete styles only when confirmed unused;
- align inconsistent dialogs, buttons, badges, cards, spacing, and status treatments;
- check that landing, setup, workspace, and secondary modules feel like one product;
- preserve readable density for tournament operation instead of applying decorative spacing uniformly.

## 7. Quality gates

Treat the redesign as complete only when all of the following are demonstrated:

### Functional preservation

- core tournament creation and management flows still work;
- scoring, standings, progression, and validation are unchanged;
- realtime updates, reconnecting, and live status remain correct;
- dialogs, errors, loading, empty states, and permissions remain understandable;
- no existing user-visible capability was lost during migration.

### Responsive behavior

- representative screens are intentionally composed for compact, medium, and expanded layouts;
- no critical content or action is clipped, overlapped, or unreachable;
- touch targets, sticky/floating controls, side panels, and scrolling behave correctly;
- orientation and viewport changes do not corrupt state or hierarchy.

### Accessibility

- keyboard navigation and visible focus remain reliable;
- semantic structure and accessible names are preserved or improved;
- contrast remains sufficient for text, controls, status, and translucent surfaces;
- status changes are communicated appropriately without excessive announcements;
- reduced motion is honored;
- dialogs trap and restore focus correctly.

### Performance

- the redesign does not introduce avoidable layout shift or excessive visual effects;
- repeated surfaces, shadows, translucency, and animations remain performant on representative devices;
- realtime updates do not cause unnecessary remounts or animation storms;
- loading and interaction responsiveness remain acceptable on compact/mobile conditions.

### Visual verification

- visual regression checks cover representative compact, medium, and expanded states;
- screenshots are reviewed for hierarchy, alignment, overflow, contrast, and state clarity;
- live/current, loading, error, empty, and reconnecting states are included;
- browser/device checks use the project's documented verification workflow.

## 8. Required handoff record

When the redesign is complete, record:

- the design-system tokens and shared primitives introduced or consolidated;
- the routes/modules migrated;
- the responsive compositions and breakpoint decisions;
- the preserved functional and realtime behaviors verified;
- accessibility and performance checks performed;
- visual regression evidence and any known follow-up items.

The final result should be a coherent Padelstar product: premium, sports-focused, status-aware, and tactile, with a dark/gold identity and strong depth—while remaining fast, accessible, operationally clear, and behaviorally compatible with the existing application.
