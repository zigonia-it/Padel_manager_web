# BUGS.md

# Padelstar – Active Bugs

Until the Monday 21 September 2026 milestone is achieved, bugs are prioritized by whether they block this chain:

**create account → log in → create Round Robin → start → register results → persist to Supabase → complete → create new tournament**

## P0 – Critical-path blockers

Add only reproducible blockers here.

### Account creation / login
- [ ] No known blocker.
- [ ] Account creation verified.
- [ ] Login verified.
- [ ] Auth state verified after refresh/navigation.

### Tournament creation
- [ ] No known blocker.
- [ ] New tournament creation verified.
- [ ] Round Robin selection/setup verified.

### Tournament start
- [ ] No known blocker.
- [ ] Round Robin generation verified.
- [ ] Tournament start verified.

### Result registration
- [ ] No known blocker.
- [ ] Result entry verified.
- [ ] Progression verified.

### Server persistence
- [ ] No known blocker.
- [ ] Supabase save verified.
- [ ] Refresh/reopen restore verified.
- [ ] Failed write behavior verified.

### Tournament completion
- [ ] No known blocker.
- [ ] Finish flow verified.
- [ ] Final standings verified.

### Start next tournament
- [ ] No known blocker.
- [ ] Second independent tournament verified.

## P1 – Important but not Monday-blocking unless they break the critical path

- [ ] PWA install/standalone detection.
- [ ] Guide/privacy navigation.
- [ ] Footer/version presentation.
- [ ] Other v1 feature bugs.

## Bug completion rule

A bug is complete only when:

- [ ] Reproduced or clearly verified.
- [ ] Smallest safe fix implemented.
- [ ] Relevant behavior tested.
- [ ] Critical-path regression checked.
- [ ] Status updated.

Do not spend time producing long bug-analysis documents.
