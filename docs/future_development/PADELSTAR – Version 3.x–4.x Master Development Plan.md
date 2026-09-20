# PADELSTAR – VERSION 3.x–4.x MASTER DEVELOPMENT PLAN

## 1. Roadmap context

Padelstar development follows four major generations.

### Version 1.x – Core functionality
The foundation.

- Accounts
- Tournament creation
- Tournament setup
- Lobby
- Match handling
- Scoring
- Results
- Statistics
- Core tournament modes

### Version 2.x – Social Padelstar
The social layer.

- Friends
- Invitations
- Player profiles
- Head-to-head
- Result comparison
- Shared history
- Social interaction

### Version 3.x – Scheduled tournaments and payments
The event-management and financial layer.

- Scheduled tournaments
- Registration
- Waiting lists
- Attendance
- Expenses
- Settlement
- Vipps MobilePay
- Vipps Login
- Expanded social tournament functionality

### Version 4.x – Community, Clubs & Commercial Platform
The community and platform layer.

- Recurring events
- Venues
- QR check-in
- Player availability
- Groups/clubs
- Seasons
- Rankings
- Advanced statistics
- Live tournament experiences
- Smart balancing
- Premium functionality
- Subscriptions
- Entitlements
- Commercial scaling

---

# PART I – SHARED ARCHITECTURAL PRINCIPLES

## 2. Modular architecture

Padelstar should increasingly consist of reusable domain engines.

Target architecture:

```text
                         PADELSTAR
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
       PLAYERS             EVENTS             SOCIAL
          │                  │                  │
       Profiles          Scheduling          Friends
       Identity          Registration        Groups
       Rating            Attendance          Invites
       History           Venues              Availability
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                        TOURNAMENT
                             │
                      Tournament Engine
                             │
       ┌─────────────┬───────┼────────┬─────────────┐
       │             │       │        │             │
    SCORING      STATISTICS PAYMENT NOTIFICATION ENTITLEMENT
     ENGINE        ENGINE    ENGINE     ENGINE       ENGINE
```

Generic functionality should not contain unnecessary padel-specific business logic.

The long-term goal is reuse across other Zigonia applications.

---

# 3. Reusable engines

## Scoring Engine

Responsible for:

- Points
- Games
- Sets
- Tiebreak
- Time rules
- Scoring presets
- Match-state calculations

## Tournament Engine

Responsible for:

- Tournament structures
- Round Robin
- Cup
- League
- Match scheduling
- Tournament progression

## Registration Engine

Responsible for:

- Registration
- Capacity
- Waiting lists
- Deadlines
- Attendance
- Registration states
- QR check-in

## Payment Engine

Responsible for:

- Expenses
- Expense payers
- Participant obligations
- Settlement
- Transactions
- Payment providers
- Refunds
- Payment status

## Social Engine

Responsible for:

- Friends
- Invitations
- Groups
- Relationships
- Availability

## Statistics Engine

Responsible for:

- Historical results
- Head-to-head
- Partner statistics
- Rankings
- Ratings
- Trends
- Aggregations

## Notification Engine

Responsible for:

- Invitations
- Registration events
- Payment reminders
- Tournament reminders
- Group notifications
- Player requests

## Entitlement Engine

Introduced for commercial use from v4.

Responsible for:

- Feature access
- Subscription capabilities
- Full-access grants
- Organization licenses
- Promotional access
- System Owner overrides

All reusable engines should be designed so that future applications can consume them without importing Padelstar-specific tournament logic.

---

# PART II – VERSION 3.x

# 4. Purpose of v3

Version 3 transforms Padelstar from primarily a tournament-running application into a platform capable of planning and financially managing tournaments before they occur.

New lifecycle:

`PLAN`

→ `PUBLISH`

→ `REGISTER`

→ `SETTLE COSTS`

→ `PAY`

→ `LOBBY`

→ `PLAY`

→ `COMPLETE`

The existing tournament engine should remain largely independent.

---

# 5. Scheduled tournaments

Admin can choose:

- Immediate tournament
- Scheduled tournament

Scheduled tournaments support:

- Name
- Tournament mode
- Description
- Date
- Time
- Location
- Maximum participants
- Registration opening
- Binding deadline
- Court-booking deadline
- Visibility
- Invitations
- Expenses
- Payment configuration

Maximum participants may be changed until tournament start.

---

# 6. Tournament lifecycle

Suggested states:

`DRAFT`

`PUBLISHED`

`REGISTRATION_OPEN`

`REGISTRATION_LOCKED`

`PAYMENT_PENDING`

`READY`

`LOBBY_OPEN`

`IN_PROGRESS`

`FINISHED`

`CANCELLED`

State transitions must be validated server-side.

---

# 7. Registration

Registration is associated with the user's Padelstar account.

Possible states:

`REGISTERED`

`WAITLISTED`

`CANCELLED`

`LOCKED`

`PAYMENT_PENDING`

`PAID`

`EXEMPT`

`PRESENT`

`NO_SHOW`

Registration history should be retained rather than deleting records when state changes.

---

# 8. Binding deadline

Players can withdraw without financial consequences until:

**Three Norwegian business days before tournament start.**

Calculation must account for:

- Saturday
- Sunday
- Norwegian public holidays

After the deadline:

`REGISTRATION_LOCKED`

The rule must be enforced server-side.

---

# 9. Court-booking deadline

Default:

**14 days before tournament start**

This is separate from the binding registration deadline.

Admin should see:

- Current registrations
- Maximum participants
- Waiting list
- Booking deadline
- Court-booking status

The deadline is configurable.

---

# 10. Admin exceptions

After registration becomes binding, admin may:

- Remove player while retaining financial obligation
- Remove player and waive obligation
- Replace player
- Promote waiting-list player
- Correct registration
- Grant another justified exception

Actions should be audit logged.

---

# 11. Waiting list

Once participant capacity is reached, additional players can join a waiting list.

Players see their position.

Before the binding deadline, promotion may occur automatically.

After the deadline, promotion requires controlled handling to avoid unexpectedly creating financial obligations.

Changing maximum participant capacity may open new positions.

---

# 12. Expense model

Tournament expenses must use individual expense records.

Examples:

- Court rental
- Balls
- Racket rental
- Equipment
- Venue
- Other

Each expense should contain information equivalent to:

`amount`

`currency`

`category`

`description`

`paid_by`

`created_at`

`created_by`

`distribution_method`

---

# 13. Who paid the expense?

**The tournament admin must not automatically be assumed to have paid tournament expenses.**

When an expense is registered, admin selects who actually paid it.

Example:

### Court rental

Amount:

`NOK 3,600`

Paid by:

`Sigurd`

### Balls

Amount:

`NOK 300`

Paid by:

`Andreas`

### Racket rental

Amount:

`NOK 200`

Paid by:

`Thomas`

The payer may be:

- Tournament admin
- Participating player
- Another authorized user
- External payer where supported

This allows Padelstar to represent actual expenses rather than assuming the organizer paid everything.

---

# 14. Multiple expense payers

Different users may pay different expenses.

Example:

| Expense | Amount | Paid by |
|---|---:|---|
| Courts | 3,600 | Sigurd |
| Balls | 300 | Andreas |
| Equipment | 200 | Thomas |
| **Total** | **4,100** | |

Payment Engine calculates the settlement.

This should work regardless of who created the tournament.

---

# 15. Expense distribution

Expenses may use different distribution rules.

### Shared expense

Distributed between applicable participants.

Example:

`Court rental: NOK 3,600`

### Individual expense

Assigned only to a specific participant.

Example:

`Racket rental: NOK 50`

### Selected-participant expense

Future support may distribute an expense among selected participants only.

The financial engine should therefore not assume every expense is divided between everyone.

---

# 16. Net settlement

Payment Engine should calculate **net financial positions**.

Example:

Four players participate.

Each person's share of total expenses is:

`NOK 500`

Sigurd has already paid:

`NOK 2,000`

His position becomes:

`Personal obligation: NOK 500`

`Expenses paid: NOK 2,000`

`Net position: +NOK 1,500`

The other three players each owe:

`NOK 500`

Therefore:

```text
Player B → 500 NOK
Player C → 500 NOK
Player D → 500 NOK

Amount receivable by Sigurd → 1,500 NOK
```

The payer should never be charged their own share again merely because they paid the original invoice.

---

# 17. Multiple-payer settlement

Example:

Total expenses:

`NOK 4,000`

Four participants.

Equal share:

`NOK 1,000 each`

Payments already made:

`Sigurd paid NOK 3,000`

`Andreas paid NOK 1,000`

Result:

`Sigurd should receive NOK 2,000`

`Andreas settled`

`Player C owes NOK 1,000`

`Player D owes NOK 1,000`

Payment Engine should calculate this automatically.

---

# 18. Settlement versus payment provider

Two concepts must remain separate:

### Settlement

Who ultimately owes whom?

### Payment provider

How is the money transferred?

Example:

```text
Obligation:
Thomas owes Sigurd NOK 350

Provider:
Vipps MobilePay
```

Future:

```text
Obligation:
Thomas owes Sigurd EUR 30

Provider:
PayPal
```

Tournament logic should depend on the obligation being settled, not on the provider.

---

# 19. Transaction ledger

Never rely solely on:

`paid = true`

Use a transaction ledger.

Example:

```text
Expense                    +3600
Participant obligation      +300
Payment                     -300
Refund                      +300
```

Existing financial history must never be silently rewritten.

---

# 20. Additional expenses

Expenses may be added until the tournament is financially closed.

If players already paid and another expense is added:

`Existing obligation: NOK 300`

`Paid: NOK 300`

`Additional obligation: NOK 50`

Result:

`Total obligation: NOK 350`

`Paid: NOK 300`

`Outstanding: NOK 50`

---

# 21. Mandatory payment

For tournaments using Payment Engine, payment is normally required before tournament start.

Admin sees:

- Paid
- Pending
- Overdue
- Exempt
- Refunded
- Outstanding

Admin can explicitly grant exemptions.

---

# 22. Vipps MobilePay – v3.0 requirement

Vipps MobilePay integration is required for public v3.0.

Implementation should support the appropriate current functionality for:

- Payment creation
- Payment status
- Confirmation
- Webhooks/events
- Cancellation
- Refund
- Transaction references
- Error handling
- Test environment
- Merchant configuration

Current APIs, pricing, terms and regulations must be verified during implementation.

---

# 23. Vipps Login – v3.0 requirement

Users should be able to:

- Create account with Vipps
- Login with Vipps
- Connect Vipps to an existing Padelstar account

Suggested UI:

**Continue with Vipps**

Existing Padelstar authentication should remain available.

Account linking must prevent duplicate users.

---

# 24. Payment-provider-independent architecture

Although Vipps is required for v3.0, Payment Engine must be provider-independent.

Conceptually:

```text
Payment Engine
      │
      ├── VippsProvider
      ├── ManualProvider
      ├── PayPalProvider
      ├── StripeProvider
      └── FutureProvider
```

Core fields should use concepts such as:

`payment_provider`

`payment_method`

`payment_transaction`

`payment_obligation`

`external_reference`

Avoid:

`vipps_paid`

---

# 25. Payment methods per tournament

Admin selects which implemented payment methods are accepted.

v3.0:

☑ Vipps MobilePay

Later:

☑ Vipps MobilePay  
☑ PayPal  
☑ Card

Availability depends on:

- Organizer configuration
- Country
- Currency
- Provider support

---

# 26. Alternative payment-provider research

Research must be performed into:

- PayPal
- Stripe
- Card solutions
- Regional providers
- Other suitable providers

Compare:

- Countries
- Currencies
- Fees
- Merchant requirements
- APIs
- Webhooks
- Refunds
- Marketplace/platform support
- Organizer payouts
- KYC
- Privacy
- Test environments
- Implementation complexity

Vipps is required for v3.0.

Other providers may be introduced in v3.1, v3.2 or later depending on research and need.

---

# 27. Fundamental Payment Engine principle

**Padelstar manages financial obligations and settlement.**

**Payment providers move the money.**

This distinction must remain throughout the architecture.

---

# 28. Tournament attendance

On tournament day:

`NOT_CONFIRMED`

→ `PRESENT`

or:

`NO_SHOW`

Players may report their own attendance.

Admin can report attendance on their behalf.

Unresolved participants should trigger a warning before tournament start.

---

# 29. Tournament invitations and social integration

v3 expands v2 social functionality.

Admin can invite:

- Friends
- Multiple friends
- Previous participants

Invitation:

`Invite`

→ `View tournament`

→ `Accept terms`

→ `Register`

An invitation alone must never create a financial obligation.

---

# 30. Notifications

Relevant notifications include:

- Invitation
- Registration
- Waiting-list changes
- Binding deadline
- Payment request
- Payment reminder
- Payment confirmation
- Tournament changes
- Cancellation
- Lobby opened
- Attendance request

---

# 31. v3.0 completion criteria

v3.0 requires working end-to-end:

`Schedule tournament`

→ `Publish`

→ `Register`

→ `Waiting list`

→ `Booking milestone`

→ `Binding deadline`

→ `Register actual expenses and payers`

→ `Calculate settlement`

→ `Create participant obligations`

→ `Vipps payment`

→ `Verified payment status`

→ `Lobby`

→ `Attendance`

→ `Tournament Engine`

→ `Complete`

→ `Financial settlement`

→ `Archive`

---

# PART III – VERSION 4.x

# 32. Purpose of v4

Version 4 expands Padelstar into:

**Community, Clubs & Competition**

and begins commercialisation of advanced Padelstar functionality.

The guiding principle:

> Basic participation should remain accessible. Advanced value, automation and organizational capabilities may require payment.

---

# LEVEL 1 – LOW COMPLEXITY

# 33. QR check-in

Admin displays tournament QR.

Registered player scans:

`Scan`

→ `Authenticate`

→ `Verify registration`

→ `PRESENT`

Admin retains manual control.

Registration Engine should own this functionality.

---

# 34. Equipment management

Players may request equipment during registration.

Example:

☑ Need racket

Admin sees:

`Rackets required: 3`

Optional rental costs create individual Payment Engine expenses.

---

# 35. Partner statistics

Statistics Engine expands H2H.

Examples:

### Together

`37 matches`

`25 wins`

`67.6% win rate`

### Against

`32 matches`

`18–14`

---

# 36. Social tournament context

Where privacy permits:

> 14 registered  
> 5 of your friends are participating.

Potential additional context:

> You have previously played with 8 participants.

---

# LEVEL 2 – LOW/MODERATE COMPLEXITY

# 37. Recurring events

Examples:

`Every Saturday 18:00`

`Every second Wednesday 19:00`

Each occurrence becomes an independent tournament instance.

Editing supports:

- This occurrence
- This and future
- Entire series

---

# 38. Venue system

Reusable venue records.

Example:

## Asker Padel

- Court 1
- Court 2
- Court 3
- Court 4

Venue may contain:

- Name
- Location
- Courts
- Organizer notes
- Tournament history

Future booking integrations may use this model.

---

# 39. Player availability

Players may optionally declare:

`Available tonight`

`Available Saturday`

`Available this weekend`

Availability automatically expires.

Visibility follows privacy settings.

---

# 40. Find a player

Organizer may announce:

> 2 players needed.

Potential recipients:

- Friends
- Previous participants
- Available players
- Group members

Acceptance uses normal Registration Engine rules.

---

# LEVEL 3 – MODERATE COMPLEXITY

# 41. Groups and clubs

Persistent communities.

Examples:

`Asker Saturday Padel`

`Company Padel League`

Roles:

`OWNER`

`ADMIN`

`MEMBER`

Features:

- Members
- Invitations
- Events
- Seasons
- Ranking
- Statistics
- Shared history

---

# 42. Seasons

Multiple tournaments belong to a season.

Example:

## PADELSTAR WINTER SERIES

`Tournament 1`

`Tournament 2`

`Tournament 3`

`Tournament 4`

`Final`

Configuration may include:

- Dates
- Included tournaments
- Points rules
- Counting results
- Qualification
- Final

---

# 43. Season standings

Example:

| Player | Events | Wins | Points |
|---|---:|---:|---:|
| Andreas | 8 | 4 | 720 |
| Sigurd | 8 | 3 | 690 |
| Thomas | 7 | 2 | 610 |

Rules should initially remain understandable and manageable.

---

# 44. Achievements

Potential achievements:

- First Tournament
- 10 Wins
- 100 Matches
- Perfect Tournament
- Rivalry

Achievements should remain secondary to real sports statistics.

---

# LEVEL 4 – MODERATE/HIGH COMPLEXITY

# 45. Public tournament pages

Optional public read-only pages.

May display:

- Tournament
- Schedule
- Participants
- Live matches
- Scores
- Standings
- Bracket
- Final results

Never expose:

- Phone numbers
- Payment information
- Admin notes
- Private profile data

---

# 46. Live Tournament Hub

Expand TV mode into a complete live presentation.

Support:

- TV
- Projector
- Desktop
- Tablet
- Spectator screens

Display:

- Live courts
- Scores
- Upcoming matches
- Standings
- Tournament branding
- QR link

---

# 47. Advanced statistics

Potential metrics:

- Match win %
- Set win %
- Game win %
- Score differential
- Streaks
- Partner performance
- Opponent performance
- Venue performance
- Tournament performance
- Season performance
- Trends over time

---

# LEVEL 5 – HIGH COMPLEXITY

# 48. Player rating

Research:

- Elo
- Glicko
- Glicko-2
- Doubles-specific models

Do not implement a rating algorithm before research and simulation.

---

# 49. Ranking contexts

Potential:

- Friends
- Group
- Season
- Tournament
- Platform rating

Different ranking concepts should remain distinct where they measure different things.

---

# 50. Smart team balancing

Options:

`Random`

`Balanced`

`Manual`

Balanced generation may consider:

- Rating
- Historical performance
- Previous partnerships
- Repeated combinations

Admin can always edit generated teams.

---

# 51. Smart match generation

Potential optimization:

- Skill balance
- Opponent variety
- Partner variety
- Rest periods
- Court distribution

Requires extensive testing.

---

# LEVEL 6 – DATA-DRIVEN POLISH

# 52. Annual player summary

Example:

## YOUR PADELSTAR 2028

`147 matches`

`89 wins`

`12 tournaments`

`Most played partner: Andreas`

`Most frequent opponent: Martin`

`Longest winning streak: 8`

`Most played venue: Asker Padel`

---

# 53. Shareable annual cards

Generate privacy-safe visual summaries for sharing.

Potential content:

- Avatar
- Matches
- Wins
- Tournaments
- Achievements
- Selected statistic
- Padelstar branding

---

# PART IV – COMMERCIALISATION FROM VERSION 4

# 54. Commercial principle

Paid Padelstar functionality begins during the v4 generation.

The objective is to finance increasing costs such as:

- Database
- Realtime traffic
- Storage
- Authentication
- Notifications
- Public live traffic
- Infrastructure
- Payment infrastructure
- Future services

Basic participation should remain accessible where practical.

---

# 55. Two separate financial systems

Never confuse:

## PLATFORM PAYMENT

Money paid for Padelstar functionality.

with:

## TOURNAMENT PAYMENT

Money owed because of participation in an event.

Examples of tournament payment:

- Court rental
- Balls
- Equipment
- Racket rental

The two systems must remain completely independent.

---

# 56. System Owner

System Owner always has:

`ALL_PLATFORM_ENTITLEMENTS`

System Owner:

- Does not require subscription
- Automatically receives future premium capabilities
- Is not affected by normal feature restrictions

However:

`SYSTEM_OWNER ≠ TOURNAMENT_PAYMENT_EXEMPT`

If System Owner participates in a tournament and owes part of the court rental, the normal Payment Engine rules apply.

---

# 57. Full-access grants

System Owner may grant selected users premium functionality without payment.

Potential use:

- Beta testers
- Development
- Moderators
- Partners
- Friends/family
- Support
- Promotional users

Potential grants:

`FULL_ACCESS_GRANT`

`TEMPORARY_GRANT`

`SELECTED_FEATURE_GRANT`

Grants can be revoked.

Changes are audit logged.

---

# 58. Entitlement Engine

Avoid:

`if user.is_pro`

Instead:

```text
can_use(stats.advanced)
can_use(events.recurring)
can_use(groups.create)
can_use(seasons.create)
can_use(live.public)
```

Entitlements may originate from:

`FREE_TIER`

`SUBSCRIPTION`

`SYSTEM_OWNER`

`FULL_ACCESS_GRANT`

`TEMPORARY_GRANT`

`PROMOTION`

`CLUB_LICENSE`

`BETA_ACCESS`

The feature does not need to know why access was granted.

---

# 59. Identity, authorization and entitlement

These concepts must remain separate.

## Identity

Who is this?

## Authorization

What administrative actions may this person perform?

## Entitlement

Which commercial features may this person use?

Example:

```text
Identity:
User A

Authorization:
TOURNAMENT_ADMIN

Entitlements:
ORGANIZER_PREMIUM

Tournament:
PLAYER

Tournament financial position:
OWES 347 NOK
```

This separation is mandatory for security and commercial flexibility.

---

# 60. Potential commercial tiers

Exact plans and prices should not be finalized until real usage and infrastructure costs are understood.

Possible future structure:

### FREE

Basic participation and basic tournament functionality.

### PADELSTAR+

Advanced player functionality.

Potential:

- Advanced statistics
- Extended history
- Analysis
- Enhanced profile insights

### ORGANIZER

Advanced event-management functionality.

Potential:

- Recurring events
- Seasons
- Advanced registration
- Advanced Payment Engine features
- Live Tournament Hub
- Organizer analytics

### CLUB

Organizational functionality.

Potential:

- Club administration
- Multiple admins
- Member management
- Club seasons
- Club rankings
- Club analytics

Final tiers should be based on actual product usage.

---

# 61. Usage limits

Plans may eventually differ by reasonable usage limits.

Examples:

- Active scheduled tournaments
- Recurring series
- Groups
- Admins
- Historical data depth
- Analytics
- Public live usage

Limits should reflect infrastructure cost and delivered value rather than arbitrary restrictions.

---

# 62. Infrastructure economics

Before pricing is finalized, measure:

- MAU
- Database usage
- Storage
- Realtime events
- Authentication
- Notifications
- Tournament volume
- Public live traffic
- Payment volume

Estimate:

`cost per active player`

`cost per organizer`

`cost per tournament`

`cost per club`

This provides the basis for sustainable pricing.

---

# 63. Commercial rollout

Each premium-capable feature should be classified:

`CORE_FREE`

`PLAYER_PREMIUM`

`ORGANIZER_PREMIUM`

`CLUB_PREMIUM`

Features may initially launch under:

`BETA_ACCESS`

or:

`PROMOTIONAL_ACCESS`

before becoming paid.

---

# PART V – FUTURE PAYMENT PROVIDERS

# 64. v3.x payment expansion

Vipps is mandatory for v3.0.

Additional providers should be implemented according to research and demand.

Possible progression:

### v3.1.x

Potential PayPal integration.

### v3.2.x

Potential Stripe/card integration.

### Later v3.x

- Additional currencies
- Regional providers
- Improved international support
- Multiple simultaneous providers
- Organizer payment-account improvements

These assignments are not fixed commitments.

---

# PART VI – RECOMMENDED V4 IMPLEMENTATION ORDER

# 65. Phase A – Lowest complexity

- QR check-in
- Equipment requirements
- Individual expense integration
- Partner statistics
- Social tournament context
- Entitlement Engine foundation

---

# 66. Phase B – Event expansion

- Recurring events
- Venue system
- Player availability
- Find a player
- Initial premium feature access

---

# 67. Phase C – Community

- Groups/clubs
- Group administration
- Seasons
- Season standings
- Achievements
- Club entitlements

---

# 68. Phase D – Live and analytics

- Public tournament pages
- Shareable live links
- Live Tournament Hub
- Advanced statistics
- Organizer analytics

---

# 69. Phase E – Competitive intelligence

- Rating research
- Rating implementation
- Ranking contexts
- Balanced teams
- Smart match generation

---

# 70. Phase F – Data-driven polish

- Annual summaries
- Shareable annual cards
- Historical insights

---

# 71. Phase G – Ecosystem

Potential later additions:

- Venue integrations
- Expanded club functionality
- External booking systems
- Additional reusable Zigonia modules

---

# PART VII – VERSIONING

# 72. Versioning rule

Development phases are not automatic release numbers.

Do not assume:

`Phase A = v4.1`

Actual version numbers change only when a coherent milestone is:

- Implemented
- Tested
- Verified
- Ready for release

The same applies to payment providers.

A planned PayPal integration does not become v3.1 merely because the roadmap says it may be suitable for that release.

---

# PART VIII – CORE DESIGN RULES

# 73. Financial separation

Three concepts must remain distinct:

### Expense

Someone has spent money.

Example:

`Sigurd paid NOK 3,600 for courts.`

### Obligation

Someone owes part of tournament costs.

Example:

`Andreas owes NOK 300.`

### Transaction

Money actually moved.

Example:

`Andreas paid NOK 300 through Vipps.`

Never collapse these into one database state.

---

# 74. Commercial separation

Likewise distinguish:

### Tournament finance

`Participant owes NOK 350 for tournament expenses.`

from:

### Platform commerce

`User subscribes to Padelstar Organizer.`

A premium subscription does not remove tournament obligations.

A tournament exemption does not grant premium functionality.

---

# 75. Reusability rule

Generic engines must not contain unnecessary Padelstar-specific terminology or assumptions.

The intended long-term platform architecture is:

```text
                    ZIGONIA PLATFORM
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
   Registration         Payment          Notification
      Engine             Engine              Engine
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                     Social Engine
                           │
                     Entitlement Engine
                           │
            ┌──────────────┼──────────────┐
            │              │              │
        PADELSTAR       QUIZ CAOZ     FUTURE APPS
```

Application-specific engines may then sit on top.

For Padelstar:

`Tournament Engine + Scoring Engine`

For Quiz Caoz:

`Quiz Engine`

This allows infrastructure developed for one application to reduce development work in later applications.

---

# 76. Long-term objective

Padelstar should evolve without turning into one tightly coupled application.

The goal is:

**Build Padelstar as a product.**

**Build reusable engines as a platform.**

Version 3 establishes scheduled events, Registration Engine and Payment Engine.

Version 4 expands community functionality and introduces Entitlement Engine and commercial sustainability.

The resulting architecture should allow Padelstar to scale in users, functionality, markets and infrastructure without requiring fundamental rewrites of the core tournament system.