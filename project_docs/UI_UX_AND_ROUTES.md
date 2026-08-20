# UI, UX and Routes

**Status:** PH-01 shell routes, PH-02 account/private-data routes and PH-03 exercise-library first-slice routes implemented locally; later feature-route paths remain proposed
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
Signup/sign-in/sign-out/profile/concurrent-edit, readiness-assessment start/save/reload-resume/completion/conservative outcome, readable JSON export, failed-password deletion protection, permanent re-authenticated account deletion, rejected post-deletion sign-in, captured-email password recovery/update, completed-assessment correction and account-email correction are locally browser-verified. A completed assessment exposes `Correct this assessment`; the correction starts from the prior answers and completes as a linked successor while the original remains historical. `/profile/account` exposes current-email correction using current-password re-authentication and confirmation at the new address; JSON export v2 includes assessment correction linkage. Recovery stays on the configured canonical application origin, reaches the password-update form only with a verified recovery session, rejects the old password after update and accepts the replacement password. The assessment outcome remains a general-wellness planning restriction/recommendation, not diagnosis or medical clearance; account deletion is deliberately destructive and is preceded by export guidance, password re-authentication and exact typed confirmation. Production email delivery and production backup-retention behaviour remain unproven.

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
