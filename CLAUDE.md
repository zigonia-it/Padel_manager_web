# AGENTS.md

## Padelstar – Codex working rules

The primary goal is useful implementation per token.

## Immediate priority

Until the Monday 21 September 2026 usable-build milestone is verified, prioritize only the shortest critical path:

**owner → create account → log in → create tournament → Round Robin → start tournament → register results → server/Supabase persistence → finish tournament → create another tournament**

Anything not required for that flow is secondary unless explicitly requested.

## Workflow

For each task:

1. Inspect only the files needed for the current blocker.
2. Reproduce or verify the current behavior.
3. Make the smallest safe change.
4. Test immediately.
5. Update the relevant checkbox/status.
6. Continue to the next blocker.

Do not stop after analysis if enough information exists to implement.

## Scope control

Do not by default:

- scan the entire repository;
- read all documentation;
- inspect unrelated modules;
- re-read files already understood;
- do speculative architecture analysis;
- refactor unrelated code;
- read `docs/archive/`;
- work on post-Monday features while a critical-path blocker remains.

Expand scope only when a concrete dependency requires it.

## Source hierarchy

1. Current explicit developer instruction.
2. `docs/PROJECT.md`.
3. `docs/BUGS.md`.
4. `docs/ROADMAP.md`.
5. Relevant `docs/technical/*`.
6. Current code for implementation details.
7. `docs/archive/` only if historical information is explicitly needed.

## UI

The current implemented UI is the design authority. Match existing typography, spacing, colors, cards, buttons, modals, navigation and responsive behavior.

## Release scope

For the immediate usable build and v1 path, Round Robin is the first required tournament mode. Cup and Liga remain intended v1.0 functionality but must not delay the Monday usable-build milestone.

Other existing modes must not be deleted merely because they are not currently exposed.

## Data and security

- Account is not required for general guest tournament use, but the Monday critical path must verify the owner can create and use an account.
- Shared tournament state uses the backend/Supabase.
- Security-sensitive permissions must be enforced backend/database-side.
- Stable IDs, not display names, are identity keys.
- Do not introduce unsafe shortcuts to meet the deadline.

## Testing

Test proportionally. Start narrow and expand only when required.

For the Monday critical path, verify the full flow end-to-end, including refresh/reopen/server persistence.

## Reporting

Keep reports short:

- changed;
- tests run;
- result;
- blocker, if any.

Prefer implementation over commentary.

## Versioning

The actual current development baseline is **`0.12.0`** (bumped 2026-09-20: the lobby merged into the workspace; `0.11.1` was the fixes after the colour system; `0.11.0` was the colour system; `0.10.0` was the decisions batch: email invitations, system log and user blocking, corrections after finish, privacy services, TV on phones; `0.9.2` was the bug-fix batch before it; `0.9.1` was bumped the same day for the first bug-fix batch; `0.9.0` was bumped 2026-09-19 under the developer's standing authorization to bump fully verified milestones; `0.7.0` was bumped by explicit instruction for the beta feature milestone; see `docs/CHANGELOG.md`). `0.6.0` was bumped by explicit developer decision once the complete Monday critical path (owner account → login → create Round Robin → start → register results → Supabase/server persistence → natural completion → finish tournament → create/start another tournament) was verified end-to-end, guest and account-owned paths both.

Version numbers represent **completed and verified milestones**, not planned work.

Use this model:

- `0.12.0` — current actual baseline.
- `0.11.2`, `0.11.3`, etc. — coherent verified bug-fix batches that do not complete a new feature milestone.
- later `0.x` minor versions — coherent new feature milestones on the path to v1.0 (see `docs/ROADMAP.md` Priority 1 phases).
- `1.0.0` — only when the complete defined v1.0 scope and Definition of Done are implemented and verified.

**Codex must never change the application version automatically.**

When a coherent release milestone has been fully implemented and verified, Codex should recommend an appropriate next version and give a brief reason. The developer decides whether to apply the version change.

Example:

`Version recommendation: 0.5.1 — critical authentication fixes completed and verified; the full 0.6.0 milestone is not yet complete.`

or:

`Version recommendation: 0.6.0 — the complete minimum usable tournament flow is now verified end-to-end.`

Do not recommend a version bump merely because code changed, a date was reached, or a version string already appears in the UI.

A stable pre-1.0 build is preferable to an unverified `1.0.0`.

## Final rule

**Fix the next real blocker first.**
