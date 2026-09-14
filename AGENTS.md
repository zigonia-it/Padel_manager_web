# AGENTS.md

## Purpose

These instructions define how Codex/AI agents should work in the Padelstar repository.

The primary goal is **useful implementation per token**: inspect only what is relevant, make real changes once the requirement is understood, test them, and report concisely.

## 1. Core workflow

For every task:

1. Read the task and identify the smallest relevant scope.
2. Inspect only the files needed to understand that scope.
3. Check the relevant active documentation only when needed.
4. Determine what already works.
5. Identify the first real gap.
6. Implement it.
7. Test the changed behavior and relevant regressions.
8. Update the applicable checklist/documentation.
9. Continue within the requested phase until complete or genuinely blocked.

**Do not stop after analysis or planning when enough information exists to implement the change.**

## 2. Scope control

Work on the smallest relevant part of the repository.

Do not, by default:

- scan the entire repository;
- read all documentation;
- inspect unrelated modules;
- re-read files already understood in the current task;
- perform speculative architecture analysis;
- produce a repository-wide gap analysis before starting a local task;
- inspect `docs/archive/`.

Expand scope only when a concrete dependency, failing test, or verified conflict requires it.

A checklist is a **work queue**, not an instruction to inspect every checkbox before beginning work.

## 3. Source hierarchy

When sources conflict, use this order:

1. Current explicit developer instruction.
2. `docs/PROJECT.md`.
3. `docs/BUGS.md`.
4. `docs/ROADMAP.md`.
5. Relevant files in `docs/technical/`.
6. Current code for implementation details.
7. `docs/archive/` only when historical information is explicitly needed.

Approved product decisions incorporated into `PROJECT.md` are authoritative product requirements.

If code conflicts with an authoritative product requirement, report the conflict and make the smallest safe correction. Do not silently redefine the product.

## 4. UI authority

The **current actually implemented UI** is the design source of truth.

When adding UI:

- reuse existing components and patterns;
- match current typography, spacing, colors, cards, buttons, modals, toasts and navigation;
- preserve responsive behavior;
- do not redesign working UI to match old mockups or archived design documents.

## 5. Archive rule

`docs/archive/` is historical reference only.

**Do not read it unless the current task explicitly requires historical information.**

Archived files are never active implementation instructions.

## 6. v1.0.0 scope

v1.0.0 focuses on:

- tournament core;
- Round Robin;
- Cup;
- Liga;
- scoring and match rules;
- admin tournament controls;
- shared live state/Supabase;
- guest participation;
- player live scoring;
- result confirmation and correction;
- player replacement/withdrawal;
- timed matches and clock foundation;
- accounts/auth;
- permanent history and personal statistics;
- retention/cleanup;
- player claiming/invitations without friend list;
- notifications;
- TV Mode;
- PWA/installability;
- language/i18n;
- help/privacy/information;
- secure initial system-owner foundation.

Detailed work is in `docs/ROADMAP.md`.

## 7. Tournament-mode gating

Only **Round Robin, Cup and Liga** are exposed to normal users in v1.0.0.

Other tournament modes already present in the repository:

- must not be deleted merely because they are outside v1.0;
- should be cleanly release-gated/hidden;
- may remain testable during development;
- must not be considered production-ready without verification;
- can be activated naturally in later 1.x releases.

Release scope controls availability, not whether existing code is allowed to remain.

## 8. Important product constraints

- Account is not required to create or join a temporary tournament.
- Shared guest tournaments may use the database.
- Accounts provide permanent ownership/history.
- Players may score their own active match.
- Only one active scorer controls live scoring at a time.
- Final results use the approved confirmation flow.
- Finalized-result corrections preserve history and evaluate consequences before commit.
- Guest data follows the retention rules in `docs/technical/privacy-retention.md`.
- TV Mode is read-only and does not grant player/admin rights.
- Notifications support in-app and push/PWA; first version uses system sounds.
- Device language is default, with persistent manual override.
- Security-sensitive permissions must be enforced backend/database-side.

## 9. System owner

A protected `Systemeier` must be introduced early.

- Exactly one active system owner.
- Owner is separate from ordinary users.
- Owner access cannot be removed by normal superusers.
- Authorization must be enforced server/database-side.
- Advanced superuser/permission functionality can be delivered incrementally according to the roadmap.

## 10. Safe changes

Do not introduce:

- name-only guest-session takeover;
- client-only owner/admin authorization;
- silent overwriting of finalized results;
- destructive migrations without verification;
- deletion of later-version features merely to simplify v1.0;
- unrelated refactors during focused bug/feature work.

Prefer deferring an unsafe feature over implementing an insecure shortcut.

## 11. Status classification

Use:

- `✅` Implemented and verified.
- `🟡` Implemented but needs adjustment.
- `🧪` Implemented but still needs verification.
- `❌` Missing.
- `🔒` Implemented but release-gated.
- `⏭️` Later version.

Code presence alone is not verification.

## 12. Testing

Test proportionally to the change.

Start with the narrowest relevant test. Expand only when dependencies justify it.

Use, as relevant:

- logic/unit tests;
- integration tests;
- multi-device/realtime tests;
- auth/RLS tests;
- manual UI verification;
- regression tests.

Do not run broad unrelated test suites repeatedly without a reason.

## 13. Reporting

Keep progress reports short.

After work, report only:

- what changed;
- tests run;
- result;
- remaining blocker, if any.

Do not produce long explanations of unchanged code.

**Prefer implementation over commentary.**

## 14. Documentation

Update existing authoritative documents instead of creating new overlapping plans.

Use:

- `docs/PROJECT.md` — product behavior and approved rules.
- `docs/ROADMAP.md` — release scope, phases and checklists.
- `docs/BUGS.md` — active defects.
- `docs/CHANGELOG.md` — completed release-relevant changes.
- `docs/technical/` — technical implementation contracts.
- `docs/archive/` — obsolete/historical material only.

## 15. Versioning

Do not change the application version during unfinished work unless explicitly instructed.

A version bump occurs only after the relevant batch is implemented and verified and the developer approves the change.

## 16. Final rule

**Inspect narrowly → understand → implement → test → update status → continue.**

No unnecessary repository-wide analysis. No repeated planning loops. No silent reinterpretation. No destructive cleanup of working or later-version functionality.
