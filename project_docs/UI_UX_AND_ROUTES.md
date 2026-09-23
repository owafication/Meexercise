# UI, UX and Routes

**Status:** PH-01 shell, PH-02 account/private-data and PH-03 exercise-library routes implemented; seven PH-04 slices through exact-version exercise planning metadata merged; profile-aware guided generation locally verified; later feature-route paths remain proposed
**Owner:** User flows, navigation, reachable states, accessibility and print interaction  
**Read when:** UI, route, form, navigation, print or accessibility work

## Experience principles
- Start from the user's job, not a dashboard template.
- Progressive detail: beginners can act without confronting every advanced field; advanced detail remains inspectable.
- Explain recommendations and allow user control.
- Preserve entered work through recoverable errors/interruption.
- Never communicate safety, state or success by colour alone.
- Use native semantic controls before custom widgets.
- Mobile-first responsive behaviour must not degrade tablet/desktop/print use.

## Primary information architecture
Core navigation is conceptually:
- **Today** — next/active routine, schedule and meaningful status;
- **Plans** — active/saved plans, routines and templates;
- **Create** — manual/guided routine creation and later meals;
- **Progress** — history, reports and trends;
- **Profile** — assessment, goals, equipment/facilities, preferences, account/privacy.

Do not render empty future navigation solely to reserve space. Add meal/professional destinations when their capability exists.

## Route registry
Prior `ROUTE-001`–`ROUTE-014` are legacy-reserved because their original canonical owner was not included in the supplied pack. Do not reuse them.

| ID | Conceptual destination | Purpose |
|---|---|---|
| `ROUTE-015` | Today | daily overview, next/active work |
| `ROUTE-016` | Onboarding / assessment | account setup, consent, profile, assessment, goals, constraints |
| `ROUTE-017` | Plans | list/filter active and saved plans/routines/templates |
| `ROUTE-018` | Plan detail | plan version, schedule, progression, explanation, edit |
| `ROUTE-019` | Create routine | manual/guided generation and substitutions |
| `ROUTE-020` | Routine detail | canonical instructions, dosage, modifications, print/run |
| `ROUTE-021` | Active session | step-by-step execution, timer/input, substitution, feedback |
| `ROUTE-022` | Progress | reports, trends and source records |
| `ROUTE-023` | Exercise library | search/filter and accessible exercise detail |
| `ROUTE-024` | Meals | later free meal plans, recipes and shopping lists |
| `ROUTE-025` | Profile/settings | profile, assessments, goals, devices, privacy/account |
| `ROUTE-026` | Print/PDF | canonical routine/plan snapshot projection |
| `ROUTE-027` | Professional programs | later authored general-wellness catalogue/program detail |

PH-01 establishes these shell URLs:
- `ROUTE-015` Today → `/`
- `ROUTE-017` Plans → `/plans`
- `ROUTE-019` Create routine shell → `/create`
- `ROUTE-022` Progress → `/progress`
- `ROUTE-025` Profile/settings → `/profile` (authenticated private-profile surface in the PH-02 slice)

PH-02 also establishes account-support URLs under the existing onboarding/account concepts:
- signup → `/auth/sign-up`;
- sign-in → `/auth/sign-in`;
- password-recovery request → `/auth/forgot-password`;
- password update → `/auth/update-password`;
- Supabase Auth callback → `/auth/callback`;
- readiness assessment → `/profile/assessment`;
- data/account controls → `/profile/account`;
- authenticated JSON data export → `/profile/export`.

PH-03 establishes `ROUTE-023` with:
- exercise library → `/exercises`;
- exercise detail by stable key → `/exercises/[exerciseKey]`.

The current library is read-only. It provides semantic search plus equipment/target-area filters and exposes only currently visible `general`/`reviewed` exercise versions. `/exercises/[exerciseKey]` without a version query resolves the latest visible version; version-owned relation links use `/exercises/[exerciseKey]?version=<positive integer>` so a relation preserves the exact reviewed target version even after newer content is published. Detail renders structured setup/steps/cues/dosage/common-errors/safety/plain-language content, the governed bilateral/side rule and visible related variation links. Draft/withdrawn/restricted and future professional-authoring surfaces are not exposed. `/create` links to the library but routine construction remains PH-04.
PH-04 first slice establishes the first real planning destinations under the existing route registry:
- `ROUTE-019` Create routine → `/create`: owner manual builder from currently approved exact exercise versions; signed-out/readiness-required/restricted/blocked/unavailable states fail closed before save.
- `ROUTE-017` Plans → `/plans`: owner-only saved-routine list with an actionable empty state.
- `ROUTE-020` Routine detail → `/routines/[routineId]`: owner-only read-only routine snapshot showing exact exercise-version numbers and interpretation data. Another authenticated user receives the same not-available state as a missing/non-owned routine.

This slice does not establish `ROUTE-018` plan detail, guided generation, editing/new routine versions, scheduling, progression, print/run or template-management URLs. Those remain owned by later PH-04+ capabilities.

PH-04 second slice extends current routine UX:
- `/create` uses explicit ordered exercise slots and rejects duplicate selections.
- `/routines/[routineId]` links owners to `/routines/[routineId]/edit`.
- `/routines/[routineId]/edit` starts from the latest owner snapshot and saves a new immutable version; stale edits show reload-before-save conflict feedback.
- another authenticated user receives the same non-disclosing unavailable state for detail/edit;
- approved historical exact versions may remain selected, while withdrawn/restricted historical versions require replacement;
- a linked restrictive assessment correction blocks manual save/edit until deterministic restriction matching exists.

Guided generation, deterministic substitution, scheduling, progression, print/run and template-management URLs remain later work.

PH-04 structured-constraint prerequisite extends the existing `/profile/assessment` flow without creating a new route:
- readiness template v2 can show optional native checkbox choices for supported movement categories;
- the user is explicitly told that MeExercise does not infer these categories from free-text notes;
- `Something else or I am not sure` records unresolved structured context and does not unlock restricted planning;
- corrections of completed readiness assessments continue on the source assessment's immutable template version, so a version-1 historical correction does not silently adopt version-2 fields;
- browser save/resume evidence verifies a version-2 structured movement choice persists through the existing assessment flow.

`/create` and `/routines/[routineId]/edit` deliberately keep their current restricted state in this prerequisite slice. No user is told that deterministic substitution is available until the later consumer flow actually validates/replaces routine selections.

PH-04 manual constraint consumption extends existing `ROUTE-019` and `ROUTE-020` edit behaviour without adding a new route:
- `/create` distinguishes supported structured restrictions from unresolved/blocked readiness. Supported restricted users see only currently approved exact exercise versions that pass the current structured constraints.
- `/create` can show compatible existing substitution relationships with version numbers and reviewed guidance. The suggestion is explanatory only; the user selects any replacement in the normal routine slots.
- `/routines/[routineId]/edit` re-evaluates the latest owner snapshot against current readiness. Incompatible current items are removed from editable choices and described with a compatible reviewed substitution when one exists.
- saving a constrained edit still creates an immutable version N+1; older routine versions remain readable and unchanged.
- unresolved legacy/missing/unclear structured restrictions continue to direct the user back to assessment rather than interpreting free-text notes.
- blocked or unavailable readiness still prevents manual persistence.

Authenticated browser evidence covers both unrestricted manual create/edit/history and supported structured restricted creation plus a later constrained edit that replaces incompatible content by explicit user choice. Guided proposal/review/explanation UI remains unimplemented.

PH-04 guided proposal/review extends `ROUTE-019` `/create` without a new route:
- deterministic guided builder coexists with the manual builder;
- the user selects balanced, upper-body or lower-body focus plus 1–6 exercises;
- the proposal explains purpose, balance/focus, constraints and substitution/review behaviour before persistence;
- every proposed item shows reviewed structured context and has its own replacement selector;
- replacement options preserve that item's primary target-area structure and remain limited to approved compatible exact versions;
- compatible reviewed substitution notes are informational only; no substitution is automatic;
- final reviewed selections save through the existing authoritative routine mutation;
- blocked, unresolved or unavailable readiness remains non-generatable.

Authenticated browser evidence covers an unrestricted balanced proposal where both proposed items are explicitly replaced before save, plus a supported structured restriction where only compatible content is proposed. Focused browser verification exposed a duplicate HTML `id` shared by the guided section heading and review-title input; the input received its own unique ID before the final passing run.

This slice does not yet implement the broader `REQ-003` goal/preference/equipment/time/frequency inputs or unlimited template management.

PH-04 structured planning-profile prerequisite extends existing `ROUTE-025` `/profile` without adding a new route:
- the private profile now captures primary and optional secondary general-wellness goals, with position representing priority;
- preferred methods, equipment and facilities use native checkbox groups backed by bounded stable tokens;
- available routine time and preferred weekly frequency use bounded native selects;
- all planning fields remain optional for an ordinary partial profile save;
- the profile surface states whether the structured planning context is complete, but it does not claim that the current guided generator already consumes it;
- concurrent profile saves still use the existing row-version conflict path rather than silently overwriting a newer edit;
- invalid server-stored planning values produce the existing unavailable/fail-closed profile state rather than being guessed or coerced.

Authenticated browser evidence verifies persistence of a complete planning profile across reload/sign-out/sign-in, preservation of structured values through a stale two-session write conflict, readable export-v4 coverage and continued account deletion behaviour.

The PH-04 routine-generation/profile foundation is now followed by merged reusable-template support and the locally verified versioned plan-composition foundation. PH-05 scheduling/progression remains intentionally separate.

PH-04 profile-aware guided generation further extends existing `ROUTE-019` `/create` without adding a route:
- the manual builder remains available after readiness is satisfied even when the planning profile is incomplete;
- the guided builder is shown only when the private planning profile is complete; otherwise the user is directed to `/profile`;
- guided generation applies primary/secondary goals, preferred methods, available equipment, facilities and total routine-time budget to approved exact-version candidates after readiness/movement compatibility;
- preferred weekly frequency is displayed as planning context and is not presented as an implemented schedule;
- proposal explanation now includes the planning-profile factors and estimated proposal time versus available time;
- each review replacement remains target-area-compatible and must keep the entire reviewed proposal inside the same current planning/time constraints;
- guided save rechecks the current planning profile before persistence, so changing preferences after proposal generation can invalidate the stale reviewed proposal;
- manual routine semantics remain user-directed and are not silently converted into preference-enforced generation semantics.

Authenticated browser evidence covers incomplete-profile guided blocking with the manual builder still available, complete-profile proposal/explanation, structured-restriction generation, explicit review/replacement, and stale-profile rejection before guided save.

Signup/sign-in/sign-out/profile/concurrent-edit, readiness-assessment start/save/reload-resume/completion/conservative outcome, readable JSON export, failed-password deletion protection, permanent re-authenticated account deletion, rejected post-deletion sign-in, captured-email password recovery/update, completed-assessment correction and account-email correction are locally browser-verified. A completed assessment exposes `Correct this assessment`; the correction starts from the prior answers and completes as a linked successor while the original remains historical. `/profile/account` exposes current-email correction using current-password re-authentication and confirmation at the new address; The current JSON export is v6: assessment correction linkage, private structured planning profile, full PH-04 routine history, reusable routine-template metadata and immutable plan/version composition history are included. Recovery stays on the configured canonical application origin, reaches the password-update form only with a verified recovery session, rejects the old password after update and accepts the replacement password. The assessment outcome remains a general-wellness planning restriction/recommendation, not diagnosis or medical clearance; account deletion is deliberately destructive and is preceded by export guidance, password re-authentication and exact typed confirmation. Production email delivery and production backup-retention behaviour remain unproven.

Unimplemented route URL syntax remains deferred until its owning capability exists. Route semantics and stable record IDs remain the contract.

## Core flows

### First use
Welcome/boundary → account/consent → assessment → goals/preferences → equipment/facilities → schedule → proposed starting plan → review/edit → Today.

Save/resume is required. Questions must explain why sensitive information is requested when not obvious. Irrelevant sensitive questions should not be mandatory.

### Plan/routine creation
Purpose/goals → duration/frequency → equipment/facilities/constraints → candidate exercises from approved content → deterministic validation → explanation → user replace/edit → save/schedule/print.

### Routine session
Summary/safety notes → exercise instruction → perform/record → rest/next → completion → effort/difficulty/discomfort/substitution notes → explicit progression consequence if any.

### Meal planning (PH-08)
Preferences/exclusions/allergens → plan period/servings → recipes/meals → conflict validation → schedule → shopping list → edit/save/print.

## Reachable state contract
Design a state only if the flow can reach it. Applicable states include:
- loading/progress for operations that are not immediate;
- empty with meaningful next action;
- validation error tied to fields and summary when useful;
- server/business error that preserves recoverable work;
- permission/account state where access differs;
- offline/interrupted state with explicit retry/reconciliation;
- success confirmation when completion is not self-evident;
- destructive review/undo where user data can be deleted or irreversibly changed.

## Accessibility baseline
Core flows must support keyboard operation, visible logical focus, semantic names/roles, programmatic labels/errors/status, sufficient contrast, zoom/reflow/responsive layout, reduced-motion preference and non-gesture alternatives for essential interaction.

Automated accessibility checks are useful but do not prove accessibility. Manual keyboard and assistive-technology checks are required at release boundaries mapped in validation.

## Print contract
Print/PDF consumes the same canonical plan/routine snapshot as interactive mode. It must remain understandable without colour/background graphics and include overview, schedule, instructions, dosage, modifications, checkboxes and notes space where applicable. Print must not silently recalculate a newer routine version.

## Implemented PH-04 reusable routine-template surface

`BR-20260919-01` extends existing `ROUTE-017` `/plans` without adding a new route. The owner-only page continues to list saved routines and now also lists reusable routine templates.

- each saved routine exposes an explicit template-name field and `Save as template` action;
- each template shows its saved source-routine context and exposes an explicit new-routine title plus `Create routine from template`;
- saving a template does not activate or schedule anything;
- creating from a template produces a normal routine through the existing current safety/approval mutation boundary;
- source-routine edits do not silently rewrite the saved template;
- empty routine/template states remain separate and use the page's section/card heading hierarchy;
- no subscription/count UI gate is introduced for routine templates.

The reusable-template slice itself did not establish `ROUTE-018`; `BR-20260919-02` now provides the PH-04 plan-composition surface described below. Schedule/progression behaviour remains PH-05.

## Implemented PH-04 versioned plan-composition surface

`BR-20260919-02` extends `ROUTE-017` `/plans` and establishes the PH-04 portion of `ROUTE-018`.

- `/plans` keeps the existing saved-routine and reusable-template sections and adds an owner-only saved-plan section plus a create-plan form.
- Plan creation selects current latest routine snapshots and saves an explicit title plus ordered exact routine-version composition.
- `/plans/[planId]` renders the current immutable plan version and its exact routine-version composition without silently resolving those references to newer routine versions.
- `/plans/[planId]/edit` creates version N+1 instead of rewriting the prior plan snapshot. Current latest routine versions are offered while the currently selected historical exact version remains representable for deliberate review.
- Stale plan edits surface the existing reload-before-saving conflict boundary rather than overwriting a newer version.
- Another authenticated user receives the non-disclosing unavailable/not-owned result for a foreign plan ID.
- No schedule, recurrence, timezone, activation or progression UI is claimed in this PH-04 slice; those portions of `ROUTE-018` remain PH-05.
- No subscription/count UI gate is introduced for saved plans or routine templates.

## Implemented PH-05 versioned weekly scheduling surface

`BR-20260923-01` completes the first scheduling portion of `ROUTE-018` and extends `ROUTE-015` Today without creating a separate top-level navigation destination.

- `/plans/[planId]` keeps exact plan composition and now shows the current recurring schedule summary, pinned plan-version context, local weekday/time windows, paused state and upcoming projected occurrences.
- `/plans/[planId]/schedule` is the owner-only schedule editor under `ROUTE-018`. First save creates schedule version 1; later saves append a new immutable schedule version.
- The editor captures a recognized named timezone, local schedule start date, paused state, and at most one routine window for each weekday. It offers only exact routine versions from the current plan version.
- If the plan version changed after the prior schedule version, the editor makes that mismatch explicit and requires deliberate resave against the current plan version rather than silently retargeting the old schedule.
- Stale plan/schedule saves surface reload-before-save conflict feedback rather than overwriting a newer cross-device schedule version.
- `ROUTE-015` `/` now renders the next projected recurring routine window for an authenticated user, including local date/window, timezone, exact plan version and exact routine version. A signed-out state, unavailable state and no-upcoming-window state remain explicit.
- Another authenticated user receives the non-disclosing schedule-not-available state for a foreign plan.
- Account JSON export is v7 and includes immutable schedule version/rule history.

Per-occurrence skip/reschedule controls, reminder delivery and progression UI are not claimed by this slice. `REQ-020` / `AC-012` remain partial and `ROUTE-018` progression semantics remain future PH-05 work.

## Implemented PH-05 per-occurrence schedule controls

`BR-20260923-02` extends the existing `ROUTE-018` `/plans/[planId]/schedule` surface and `ROUTE-015` Today without creating another route.

- The schedule page lists effective upcoming occurrences for the current exact schedule version and exposes explicit `Skip this occurrence` and `Reschedule this occurrence` controls.
- Reschedule requires a local target date plus start/end window in the schedule's existing named timezone. It retains the exact routine version from the original scheduled rule.
- Active skip/reschedule exceptions are shown separately with their original local occurrence identity and a `Restore original occurrence` action.
- Exception edits use expected exception versions; stale changes show reload-before-saving feedback instead of silently overwriting another session's occurrence decision.
- A new recurring schedule version does not inherit active exceptions. The editor warns when active exception history exists so the user can deliberately review the new recurrence snapshot.
- Plan detail and Today consume the same exception-aware occurrence projection. Rescheduled occurrences are explicitly labelled and retain their original local date for explanation.
- Account JSON export advances to v8 and includes full historical exception version sequences under the exact schedule version/rule they modified.
- Foreign-plan schedule access remains non-disclosing.

Reminder delivery is not presented as implemented. Progression UI is unchanged and remains later PH-05 work.

## Implemented PH-05 in-app reminder controls

`BR-20260923-03` extends the established `ROUTE-018` schedule editor and `ROUTE-015` Today. It adds no new top-level route.

- `/plans/[planId]/schedule` offers an optional reminder lead time: off, 15 or 30 minutes, 1 or 2 hours, 1 or 2 days, or 1 week before each effective occurrence. Changing/off appends a new immutable recurring schedule version rather than rewriting an old version.
- Schedule editor, plan detail and projected occurrences display the configured in-app reminder setting explicitly. Rescheduled occurrences retain their own original-date explanation and move reminder calculation to the effective start.
- Today displays `Reminder due` for the next projected occurrence after its configured due time and before its start. This indicator is evaluated when the server page loads; it does not proactively notify users when the application is closed.
- Account export is v9 and includes optional reminder lead time on every historical schedule version, including null for versions without reminders.

No push/email/SMS delivery, durable notification receipt/snooze/dismissal or progression interface is claimed by this slice. Background delivery would need separate product and deployment authority.
