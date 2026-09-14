# BUGS.md

# Padelstar – Active Bugs

> Keep this file short. Only active defects belong here. Move completed release notes to `CHANGELOG.md`.

## Priority order

### 1. Version history / versioning

- [ ] Verify the single authoritative application version source.
- [ ] Resolve stale `0.5 Beta` references where still active.
- [ ] Preserve footer alignment/spacing while showing the correct current version.
- [ ] Do not bump version during unfinished work.
- [ ] Ask/obtain developer approval before release version changes.

### 2. Admin tournament controls

- [ ] Verify finish tournament.
- [ ] Verify abort tournament.
- [ ] Verify reset/nullify tournament.
- [ ] Verify correct final-state behavior in admin/player/TV views.
- [ ] Verify cleanup/retention is triggered by the correct lifecycle state.

### 3. Login/account/profile

- [ ] Profile login button works.
- [ ] Login errors are visible.
- [ ] Create-account and login flows are distinct.
- [ ] Auth email behavior is verified.
- [ ] Profile reflects actual auth state.
- [ ] Guest flows do not incorrectly require login.

### 4. Player result registration

- [ ] Player can score own active match.
- [ ] Admin-only controls are hidden from player.
- [ ] Multi-device scorer state is correct.
- [ ] Result submission enters confirmation flow.

### 5. PWA hero/install detection

- [ ] Installed standalone PWA does not show irrelevant install CTA.
- [ ] Install CTA appears only when installation is relevant/available.
- [ ] Desktop/mobile behavior verified.

### 6. Guide/privacy

- [ ] Back/navigation matches current UI.
- [ ] Privacy text reflects current Supabase/guest/account/retention flow.
- [ ] Guide reflects current functionality.

### 7. Footer/version presentation

- [ ] Version text uses intended size.
- [ ] Logo remains centered.
- [ ] Version/logo/text spacing remains correct.
- [ ] Do not reintroduce previous logo horizontal offset.

## Bug completion rule

A bug is complete only when:

- [ ] Root cause identified or behavior clearly reproduced.
- [ ] Fix implemented.
- [ ] Relevant test performed.
- [ ] Surrounding regression checked.
- [ ] Status updated.
