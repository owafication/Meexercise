# Architecture and Data

**Status:** PH-01 shell implemented; PH-02 current identity/private-data foundation Passed / Verified; PH-03 implementation locally complete with final publication/closure pending; production hosting/data region deferred
**Owner:** Application structure, data ownership and integration boundaries  
**Read when:** Structure, persistence, API, auth, sync, billing, AI or integration work

## Architecture decision rule
Use the smallest mechanism that closes an applicable failure mode. A future possibility is not by itself a requirement.

## Implemented PH-01 application structure

`BR-20260817-04` establishes one Next.js App Router application written in TypeScript and managed with npm on Node.js 24 LTS. The root layout owns the shared shell and primary navigation; route content lives under `src/app`; shared shell components live under `src/components`.

This implements only the application-shell boundary. Domain modules, authentication, persistence, server-authoritative data, external integrations and provider-specific infrastructure are not scaffolded prematurely and remain governed by their later phase prerequisites.

## Implemented PH-02 Auth/private-profile slice
The local browser integration now exercises account signup, sign-in, sign-out, authenticated private-profile persistence and optimistic stale-write rejection against the local Supabase stack. A second browser session attempting to save an obsolete profile version receives a user-visible conflict rather than silently overwriting the newer value. This extends the server-authoritative private-data boundary beyond the database-only foundation while preserving the existing PostgreSQL/RLS/version contracts.

## Implemented PH-02 readiness-assessment slice
`/profile/assessment` now provides one bounded versioned general-wellness readiness assessment rather than a speculative generic form engine. Authenticated users can start a published template version, save incomplete answers, reload/resume them, and complete the session with optimistic `row_version` protection. Completed assessment sessions remain immutable historical records.

Completion derives immutable server-side safety flags from the stored response. Recorded movement limitations produce `restrict_generation`; an answer other than an explicit independent-exercise `yes` or professional-restriction `no` produces `block_generation`, so missing/uncertain readiness fails closed. These outcomes are conservative planning controls only: they do not diagnose, treat, certify medical safety or provide medical clearance. Actual consumption of these flags by later routine generation remains a PH-04 responsibility.

## Implemented PH-02 data-lifecycle slice
`/profile/account` now exposes authenticated data-export and permanent account-deletion controls. The current readable JSON export contains the authenticated account identifier/email, private profile, assessment responses, derived safety flags, and the referenced assessment-template/version definition needed to interpret historical assessment data. Export responses are private/no-store and are produced only through the authenticated user's server-side data boundary.

Permanent account deletion requires a verified session, current-password re-authentication and an exact typed destructive confirmation before a server-only Supabase administration client deletes the Auth user. Current MeExercise profile, assessment-session and assessment-safety-flag records cascade from that Auth-user deletion. The privileged `SUPABASE_SERVICE_ROLE_KEY` is server-only configuration and is never exposed through a `NEXT_PUBLIC_*` variable or browser client.

## Implemented PH-02 password-recovery slice
Password-reset requests remain privacy-preserving and do not disclose whether an email address has an account. The local Supabase Auth recovery email uses a version-controlled recovery template that carries the Supabase recovery `TokenHash` to `/auth/callback`. The callback verifies a `recovery` OTP on the trusted server boundary, writes session cookie mutations onto the outgoing response, and redirects through the configured canonical site URL so the recovery session stays on one browser origin before `/auth/update-password` renders.

The authenticated password-update action reuses the existing server-side identity boundary and updates the current user's password only after the recovery session is established. Local browser integration captures the real local Auth email in Mailpit, follows its recovery link, verifies the recovery session reaches the update form, changes the password, signs out, rejects the old password and accepts the replacement password.

## Verified PH-02 application authorisation boundary
Two independent authenticated browser contexts now exercise the currently implemented private surfaces adversarially. User B receives User A's real in-progress assessment session UUID and row version, tampers its own submitted hidden identifiers to target that record, and the server mutation returns the existing conflict/fail-closed result because the write also requires the authenticated User B ownership predicate. User A's assessment remains unchanged. Separate profile and export assertions verify each authenticated user sees/exports only their own current profile and assessment content.

This adds no new authorisation abstraction or product code: it verifies the existing trusted-user derivation, explicit application ownership predicates and database RLS defence-in-depth for the implemented PH-02 surfaces. Future modules require their own mapped ownership tests when introduced.

## Implemented PH-02 correction and primary-retention boundary
`REQ-038` is implemented for the user-owned record types that exist in PH-02 without weakening historical immutability. Current profile data and in-progress assessment answers remain ordinary editable records. A completed assessment is never rewritten: correction starts a new assessment session linked by `corrects_session_id` to the completed predecessor, copies the predecessor answers, preserves the exact template version, and allows the user to edit/complete the successor. The predecessor remains immutable historical context and export version 2 includes the correction relationship.

The current account email can be corrected through the authenticated account boundary. The user re-enters the current password, Supabase Auth accepts the requested new address, and the new address must confirm ownership before the account email changes. The local provider configuration uses new-address confirmation; a production deployment may adopt stricter confirmation settings if required by its accepted security/privacy contract.

Current PH-02 primary records have no speculative time-based retention rule. Permanent account deletion removes the Auth user and cascades through the profile, original/corrected assessment sessions and derived safety flags. This is the implemented primary-datastore deletion contract, not a claim about production backups or legal retention exceptions. Backup retention, statutory exceptions, jurisdiction applicability, remote Supabase and production deployment remain PH-10 release gates.

Future PH-03+ domains must extend export/correction/deletion coverage for their own user-owned records rather than treating this PH-02 evidence as automatic coverage.

## Implemented PH-03 exercise-content first slice
`BR-20260820-01` introduces the first real `exercise-content` module without adding a CMS, provider abstraction or separate service. `public.exercises` owns stable exercise identity; `public.exercise_versions` owns versioned structured instruction snapshots; and `public.exercise_version_relations` owns source-version-specific substitution, regression, progression and equipment-alternative relationships.

Exercise versions distinguish `draft`, `general`, `professionally_authored`, `reviewed`, `withdrawn` and `restricted` status. Normal anonymous/authenticated library readers can select only `general` and `reviewed` versions. Finalised instructional fields are immutable; permitted publication-state transitions can withdraw/restrict content without rewriting its historical instructional meaning. Relationship rows are editable only while their source version is draft, so a finalised source version retains the relationship semantics that were reviewed with it.

The server-side library reader exposes the latest visible version per stable exercise identity through read-only `/exercises` and `/exercises/[exerciseKey]` surfaces. It can also resolve one exact visible version when a version-owned relation targets historical content. Relationship links carry the exact target version so adding a newer visible version cannot silently redirect an existing relation to different instructional meaning. Structured steps, purpose, target areas, equipment, setup, cues, dosage guidance, common errors, safety notes, bilateral/side rule and plain-language accessible text are stored on the version. The expanded local seed proves multiple visible versions under one stable identity, all four relationship types and withdrawal fallback using six visible synthetic identities; it remains development/test data and is not evidence of a production editorial or professional review process.

`REQ-012` is not completed by this slice because no routine snapshot exists yet. PH-04 must persist/reference the exact exercise-version IDs used by routines so later content publication changes cannot alter historical routine meaning.
## Proposed topology
Start as one deployable **modular monolith**. This is a proposed default, not a claim about existing source.

Logical modules:
- `identity` — account/session/authentication and account lifecycle;
- `profile-assessment` — profile, assessment templates/sessions/responses, safety flags;
- `exercise-content` — versioned exercise catalogue and publication status;
- `planning` — plans, routines, generation constraints, substitutions;
- `schedule-progression` — recurrence, exceptions, progression proposals;
- `sessions` — active/completed routine execution and results;
- `reporting` — derived projections and source traceability;
- `documents` — print/PDF projection from canonical snapshots;
- `nutrition` — preferences, recipes, meal plans, shopping lists;
- `professional-content` — authorship/review/publication of general-wellness programs;
- `entitlements` — premium capability rules only when premium activates;
- `support-admin` — content/support operations only when actually required.

A module owns its invariants and mutations. Shared physical persistence does not weaken logical ownership. Do not split deployables unless independent scale/deployment/security/failure/ownership requirements justify the network boundary.

## Data authority

### Server-authoritative durable state
Cross-device accounts require a shared durable authority once implemented. `DEC-024` selects Supabase PostgreSQL for the PH-02 persistence baseline because MeExercise needs structured entities, versioned content, ownership, relationships, migrations and transactions. Development is local-first: schema and policy changes are version-controlled migrations and may be exercised against the local Supabase stack before any remote project exists. The production Supabase project and physical data region are selected later at release/deployment readiness, before real sensitive user data is placed in shared production infrastructure.

### Client state
- transient UI interaction: local component state;
- navigation/shareable selection: URL/router state where appropriate;
- server-owned records: client representation/cache, not a second authority;
- browser persistence: only for explicit draft recovery/offline requirement;
- full offline-first synchronisation: deferred unless disconnected mutation becomes a product requirement.

`REQ-040` requires explicit interrupted/offline behaviour, not an automatic offline-first architecture.

## Canonical durable concepts
Use stable IDs and versions where historical meaning matters:
- User / profile / consent record
- Assessment template/version, assessment session/response, safety flag
- Exercise identity/version, target area/equipment/variation/restriction/media metadata
- Plan/routine identity/version, section/item, schedule, progression proposal
- Routine session/exercise result/user note
- Recipe identity/version, ingredient, meal plan/version, shopping list
- Professional program/version, author/reviewer/verification/withdrawal metadata
- Subscription/entitlement only when premium is implemented

Do not create tables/modules for future concepts until their phase requires them. The list above is a contract map, not permission to scaffold empty persistence.

## Historical immutability
Completed sessions and historical plan snapshots retain the semantic content used at that time. Later exercise/recipe/program edits create new versions rather than rewriting history. Derived reports may be rebuilt from primary records; primary history may not be silently rewritten for convenience.

## Synchronisation and concurrency
Use explicit concurrency/version checks when multiple devices can edit the same record. Lost updates are unacceptable. Resolve automatically only when rules are deterministic and lossless; otherwise preserve both changes and request user review. Retries must not duplicate non-idempotent changes.

## Authentication and authorisation
An account boundary is required for cross-device private data. `DEC-024` selects Supabase Auth for the PH-02 authentication baseline, integrated with the same PostgreSQL project. Server-side MeExercise authorisation must enforce ownership/roles; Row Level Security is defence-in-depth rather than a substitute for application ownership checks, and client route guards are UX only. Identity proofing is not assumed. Professional authors initially have content-author permissions only, not user-record access.

## APIs and integrations
Do not create a public/network API merely to make the code look layered. Use the selected web framework's simplest server interface for the application. Introduce stable external API contracts only for real independent consumers/integrations. Validate every network/import boundary.

Wearables, health platforms, calendars, payments and professional services are separate integrations with explicit data/access/consent/failure contracts. No integration is baseline until its phase is accepted.

## Runtime AI boundary
Advanced routine generation can be deterministic: approved exercise versions + profile constraints + goal/schedule/equipment rules → structured proposal → deterministic validation → user review.

Runtime AI is conditional. If introduced later it must sit behind a narrow application boundary with:
- named use case and evaluation set;
- prompt/schema/model/provider version evidence;
- minimum data sent;
- structured output where machine consumption requires it;
- approved grounding/content source;
- deterministic safety/business validation;
- explicit failure/fallback state;
- no autonomous high-impact action;
- no long-term AI memory, RAG, tool calling or agents unless independently justified.

## Configuration and dependencies
Hard-code true invariants. Configure demonstrated deployment variability. Persist real user preferences. Add flags only for actual rollout/runtime variants. Keep secrets out of source. Supabase project URLs/keys are environment configuration; privileged/service credentials remain server-only and are never exposed to browser code.

Before adopting a dependency: identify capability gap, standard/platform alternative, transitive surface, maintenance/security status, licence compatibility, runtime/bundle cost, portability and exit cost. Do not add an abstraction around a dependency unless replacement/substitutability is a real requirement.
