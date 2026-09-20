# v1.0.0 readiness (Phase 30 Definition of Done)

Status at 0.9.1, 2026-09-20 (first written at 0.9.0 on 2026-09-19). `1.0.0` is **not** released: the checklist below still has open items and the developer has to approve the version change.
Legend: verified = tested and confirmed with evidence; built = implemented and tested by automated tests/browser, but a person or an external service has to confirm it.

| Definition of Done item | Status | Evidence / what is missing |
|---|---|---|
| Priority 0 critical path | verified | Guest and account-owned paths, 0.6.0; guest path again on production 2026-09-19 (see smoke test below) |
| Round Robin / Cup | verified | ROADMAP Phases 2–3 |
| Required player/result flows | built | Scorer lease, approval, withdrawal decision, replacement, corrections: database tests + browser. Needs two real devices (USER_ACTIONS §2) |
| Auth/account | built | Sign-up/login/claim/invitations tested with PGlite + browser without real mailboxes. Needs a real two-account run (USER_ACTIONS §2) |
| Server persistence | verified | Production smoke test: 42 matches, revision 50 read back from Supabase, reload restores it |
| History/retention | built | 24 h guest retention and finished-row cleanup verified live; 30-day inactivity/7-day recovery covered by 48 database tests, cron jobs active (`padelstar-retention-cleanup` hourly). Open: "expired — resume" banner, account-deletion lifecycle re-check |
| Notifications/TV/PWA/i18n/help/privacy | partly | In-app notifications, sounds, vibration, TV, install (macOS/iOS confirmed), nb/en, guide and privacy done. Open: push categories (Phase 18), real-phone notification test, device-default language retest |
| Minimum Systemeier | built | Migrations and admin page (tabs: overview, tournaments, users, maintenance) tested, applied and checked live; needs sign-in as `sigurd.grodem@live.no` (USER_ACTIONS §2). Block/delete users and logs not built |
| Theme system (Phase 27) | built | Generated light layer, WCAG contrast audit, layout audit, tests. Needs eyes on real devices (USER_ACTIONS §2); contrast/token-architecture boxes stay open |
| Claude Design UI completion (Phase 28) | built | Podium, wizard, invite-code cells, accent picker, Kamper/Styring pass shipped; see ROADMAP |
| No known critical data-integrity / auth defect | none known | Supabase advisors: only intended findings (RLS without policy, token-checked SECURITY DEFINER RPCs; leaked-password protection needs the Pro plan) |
| Production build | verified | Vercel serves 0.9.0 (`/api/health`), assets 200 |
| Production smoke test | verified | 2026-09-19 on padelstar.app, see ROADMAP Phase 30 |
| Docs match shipped behaviour | built | Docs updated with each phase; re-read before release |
| Release-gated later features remain gated | verified | Format picker limited to Round Robin/Cup, language list, no hidden features exposed |
| Developer approves `1.0.0` | open | Developer decision |

## Production smoke test, 2026-09-19 (0.9.0)

Guest path against the real Supabase project: create wizard → "Fortsett uten konto" → lobby → start → 42 matches in 7 rounds scored and advanced → reload restores → database row read back (same revision) → finish → podium → "Ny turnering" opens the create form. The finished row stays as `Avsluttet` for 24 h and is then removed by the hourly cleanup. The browser pane was hidden during the test, so `visibilityState` and `requestAnimationFrame` were shimmed in the page; no app code was changed. Test tournament name: "Smoke test (delete me)".

## Unresolved

- Feedback form: `RESEND_API_KEY` and `FEEDBACK_TO_EMAIL` missing in Vercel (USER_ACTIONS §1).
- Unbuilt: generic point/margin engine and Cup time overrides (Phase 14), "expired — resume" banner (Phase 16), push categories (Phase 18), Court Queue reuse and public embeddable results page (Phase 19).
- `assets/padelstar-webapp-ui-design/` (16 MB) was committed once by mistake and is still in git history (removed from the tree in PR #8).
