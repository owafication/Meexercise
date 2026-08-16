# Product Foundation

**Status:** Proposed canonical foundation v0.2.0  
**Owner:** Product scope, requirements and acceptance  
**Read when:** Product, feature, routine, meal, professional, pricing, claims or acceptance work

## Product identity

MeExercise is a self-directed general-wellness web application that helps an adult describe current activity, fitness/mobility context, limitations and preferences; define goals; create or receive structured exercise and mobility plans; perform or print detailed routines; track completion and feedback; review progression/trends; and, in a later free phase, plan general meals and recipes.

### Product promise

> Understand where you are, decide what you want to improve, and build practical routines that fit your body, preferences, equipment, facilities, schedule and feedback.

### Primary users
Adults capable of exercising independently who want general-wellness structure, including beginners, people returning after inactivity, home exercisers, gym users and people with mild previously understood limitations.

## Scope

### Free product capability
When the relevant implementation phases are delivered, free users receive:
- profile, goals, preferences, equipment/facilities and readiness/mobility assessment;
- exercise/mobility library, manual routine editing and advanced routine generation;
- detailed progression planning, substitutions/regressions/progressions and advanced scheduling;
- interactive sessions, unlimited saved plans/routines/templates, advanced reports/trends and enhanced printable packs;
- general meal planning, recipes/reusable meals and shopping lists;
- cross-device account data, history, export, correction and deletion.

Free does not imply unlimited third-party compute/storage where a real recurring cost later exists; any limit must be transparent, non-destructive and may not block owned data/history/export/deletion.

### Premium boundary
Premium may add specialised professionally authored/reviewed content, optional professional services after separate approval, wearable/health/calendar integrations, premium media/classes/specialist nutrition collections, organisation/team features, or genuinely resource-intensive optional services. Premium must not gate ordinary general routine generation, general progression, reports, scheduling, printing, meal planning, cross-device use or user-owned data.

### Professional content boundary
Initial professional capability is professionally authored general-wellness content. Users independently discover/select it. Authors do not initially access individual profiles, assessments, health information or progress. Direct assignment, monitoring, messaging, clinical collaboration or practitioner dashboards require a later separately approved access/consent/audit design.

### General-wellness boundary
Included: general strength, fitness, conditioning, mobility, balance, flexibility, activity/recovery habits, scheduling and non-clinical meal planning; conservative modifications based on user-stated limits; stop/seek-professional guidance where defined safety triggers occur.

Excluded without separately approved authority: diagnosis, treatment, rehabilitation, prognosis, medical monitoring, clinical decision support, medical safety determinations, condition-specific medical exercise/nutrition prescription or emergency management beyond directing the user to appropriate help.

## Release boundary
The first public exercise release is not usable until a user can complete assessment → goals/preferences → plan → review/edit → perform or print → record results → review progress → schedule future work → retain/synchronise data safely.

[Decision required: whether functional free meal planning ships in the first public release or a later pre-v1 milestone; affects: PH-08 and release scope.]

## Requirements

- `REQ-001` Users can create, sign in to, recover and delete an account.
- `REQ-002` Users can maintain a wellness profile without exposing private fields publicly.
- `REQ-003` Users can record goals, priorities, preferred methods, equipment, facilities, available time and routine frequency.
- `REQ-004` Users can complete and resume versioned fitness, mobility and readiness assessments.
- `REQ-005` Users can record self-reported limitations, affected areas, avoided movements and relevant complications.
- `REQ-006` Assessment history remains interpretable after templates change.
- `REQ-007` Defined safety responses produce conservative restrictions or a professional-review recommendation.
- `REQ-008` Exercises use immutable identity and versioned content.
- `REQ-009` Each exercise supports structured steps, purpose, target areas, equipment, setup, cues, dosage, common errors, safety notes and accessible text.
- `REQ-010` Exercises support substitutions, regressions, progressions, bilateral/side rules and equipment alternatives.
- `REQ-011` Content status distinguishes draft, general, professionally authored, reviewed, withdrawn and restricted content.
- `REQ-012` Historic routines retain the exact exercise versions used.
- `REQ-013` Users can create and edit routines manually.
- `REQ-014` Users can generate advanced routines from approved structured content and profile constraints.
- `REQ-015` Generated routines explain purpose, balance, constraints and substitutions.
- `REQ-016` Users can reject or replace every generated exercise before activation.
- `REQ-017` Plans support goals, phases, routines, schedules, progression rules, checkpoints and recovery periods.
- `REQ-018` Users can save unlimited plans, routines and templates in the free tier.
- `REQ-019` Updates create new plan/routine versions rather than mutating completed history.
- `REQ-020` Users can define recurring schedules, preferred days, duration windows, reminders, pauses and rescheduling rules.
- `REQ-021` Progression supports exercise-, routine- and plan-level changes.
- `REQ-022` Progression changes are explainable, reviewable, reversible and conservatively bounded.
- `REQ-023` Excessive difficulty, pain/discomfort reports, missed sessions or user requests can pause or reduce progression.
- `REQ-024` The free tier includes advanced scheduling and detailed progression planning.
- `REQ-025` Users can perform routines through an accessible step-by-step mode.
- `REQ-026` Users can record completion, sets/repetitions/duration, effort, difficulty, discomfort, substitutions and notes.
- `REQ-027` Printable packs use the same canonical routine version as interactive mode.
- `REQ-028` Free enhanced print packs include overview, schedule, instructions, dosage, modifications, checkboxes and notes space.
- `REQ-029` Reports show consistency, planned-versus-completed activity, duration, category balance, goal progress, effort, difficulty and discomfort trends.
- `REQ-030` Reports distinguish user-reported observations from measured or imported data.
- `REQ-031` Users can maintain dietary preferences, exclusions, allergies, serving counts and preparation constraints.
- `REQ-032` Users can create, generate, edit, save, schedule and reuse meal plans in the free tier.
- `REQ-033` Recipes use versioned ingredients, quantities, units, steps, servings, preparation time, substitutions and allergen metadata.
- `REQ-034` Meal plans can produce editable shopping lists.
- `REQ-035` General meal planning must not present medical nutrition therapy or disease-treatment claims.
- `REQ-036` Supported devices synchronise account data through a defined server-authoritative model.
- `REQ-037` Sync conflicts preserve data and provide deterministic resolution or user review.
- `REQ-038` Users can export, correct and delete their data subject to documented retention obligations.
- `REQ-039` Health and wellness data is excluded from ordinary logs, analytics payloads and advertising profiles.
- `REQ-040` Offline or interrupted work has explicit availability and reconciliation behaviour.
- `REQ-041` The free tier includes all capabilities explicitly listed as free in this foundation.
- `REQ-042` Entitlements are evaluated through one central application boundary once premium capability exists.
- `REQ-043` Subscription expiry never blocks access to user-created content, history, export, correction or deletion.
- `REQ-044` Premium content used historically remains identifiable and readable after entitlement expiry.
- `REQ-045` Initial professional capability supports authored general-wellness programs without access to individual user data.
- `REQ-046` Professional claims preserve author, credential claim, verification status, reviewer, sources, version, review date and withdrawal state.
- `REQ-047` Direct professional-to-user management cannot activate without a separately approved consent, permission, audit, revocation, safeguarding and data-access specification.
- `REQ-048` The application is responsive and usable on supported mobile, tablet, desktop and print layouts.
- `REQ-049` Core flows meet defined keyboard, screen-reader semantics, focus, contrast, reduced-motion and error-identification criteria.
- `REQ-050` Domain modules expose stable contracts and do not directly manipulate another module's internal records.
- `REQ-051` Migrations preserve compatibility, rollback/recovery evidence and historical versions.
- `REQ-052` User-visible errors are actionable and do not expose sensitive implementation details.

## Acceptance criteria

- `AC-001` A new user can complete onboarding, assessment, goals, preferences, equipment and schedule without mandatory irrelevant health questions.
- `AC-002` Interrupted onboarding can resume without duplicate or lost answers.
- `AC-003` A safety-trigger response cannot produce an unrestricted plan.
- `AC-004` Exercise instructions are understandable without video and media has an accessible text equivalent.
- `AC-005` Replacing an exercise preserves routine structure or clearly identifies unmet constraints.
- `AC-006` Generated routines contain only approved exercise versions and pass deterministic constraints.
- `AC-007` Users can review explanations and change every proposed routine item before saving.
- `AC-008` A completed routine does not change when source exercise content is later edited.
- `AC-009` A progression proposal shows old value, new value, reason and reversal control.
- `AC-010` A discomfort response triggers the configured conservative outcome and records no diagnosis.
- `AC-011` Unlimited free saved plans/templates are not blocked by a subscription check.
- `AC-012` Advanced scheduling supports recurrence, pause, skip, reschedule and timezone-safe display.
- `AC-013` Interactive and printable views show the same routine version and dosage.
- `AC-014` A print pack remains legible without background graphics or colour dependence.
- `AC-015` Reports correctly label self-reported, calculated and imported values.
- `AC-016` Users can trace a report value to its source sessions/records.
- `AC-017` A meal-plan change updates its shopping list predictably without altering a completed historical plan.
- `AC-018` Allergens/exclusions prevent incompatible recipes unless the user explicitly resolves a clearly shown conflict.
- `AC-019` Two-device edits do not silently discard either change.
- `AC-020` Subscription expiry leaves user data readable, exportable and deletable.
- `AC-021` A professional program shows authorship/verification status without implying unverified credentials are verified.
- `AC-022` A professional author cannot access individual user records in the initial professional model.
- `AC-023` Direct professional management routes/permissions are absent or disabled until REQ-047 is separately accepted and implemented.
- `AC-024` The free product supports functional meal-plan creation, editing, scheduling and shopping lists at the agreed release boundary.
- `AC-025` Core flows are operable by keyboard and expose meaningful names, errors and focus order.
- `AC-026` Sensitive health values do not appear in ordinary application logs or analytics captures.
- `AC-027` A failed migration can be rolled back or restored using documented evidence before release.
- `AC-028` Data export contains documented user-owned records in a readable format.

## Non-goals
- Social feed, public comparison, competitive leaderboards or compulsive engagement design.
- Health-data advertising profiles or sale of user health information.
- Unrestricted AI-generated exercise/nutrition instructions.
- Clinical/medical claims without a separately approved regulated scope.
- Direct professional management during the current professional-content phase.
