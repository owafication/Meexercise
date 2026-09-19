# Architecture and Data

**Status:** PH-01 shell, PH-02 identity/private-data and PH-03 exercise-content library Passed / Verified; nine PH-04 slices through reusable routine templates merged; versioned plan-composition foundation locally verified; production hosting/data region deferred
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
## Implemented PH-04 manual routine foundation first slice
`BR-20260821-01` introduces the first real `planning` persistence/route slice without adding a separate service, generic repository layer, runtime AI or speculative plan/schedule machinery. `public.routines` owns the authenticated user's stable routine identity; immutable `public.routine_versions` own versioned titles; `public.routine_sections` and `public.routine_items` preserve ordered structure and exact `exercise_version_id` references.

Manual creation uses one database function so identity/version/section/item creation is atomic. The trusted boundary requires an authenticated user, a completed latest readiness assessment, no `restrict_generation`/`block_generation` flag, one to twelve unique exercise versions, and currently visible `general`/`reviewed` exercise content. The application rechecks the same planning/content state before invoking the database boundary. Recorded movement restrictions therefore remain fail-closed until PH-04 implements deterministic restriction matching instead of guessing from free text.

Routine tables use owner RLS and server-side ownership predicates. The original PH-03 anonymous/authenticated `general`/`reviewed` exercise visibility policy remains unchanged. A separate authenticated-only historical policy calls a narrowly scoped private `SECURITY DEFINER` ownership predicate so a routine owner can still read an exact referenced exercise version after later withdrawal, while anonymous and unrelated authenticated users cannot gain that historical access. This closes the PH-04 consumer portion of `REQ-012` without copying exercise instructions into a second content authority.

`/create` now provides the first manual builder and exposes signed-out, assessment-required, restricted, blocked, unavailable and ready states. `/plans` lists only the current user's saved routines; `/routines/[routineId]` renders the latest saved routine version with exact referenced exercise-version interpretation and returns a non-disclosing unavailable/not-owned state for another user. The first slice is read-only after save: routine editing/new versions, substitutions, guided generation/explanations/user review and templates remain later PH-04 work.

The authenticated JSON lifecycle export is now version 3 and includes routine identities plus all stored routine versions/sections/items and the exact exercise-version interpretation data required to read history. Auth-user deletion cascades through routine identities, versions, sections and items. This extends the current `REQ-038` primary-record lifecycle to the PH-04 routine records introduced by this slice; production backup/legal-retention obligations remain PH-10 gates.

## Implemented PH-04 ordered routine editing second slice
`BR-20260823-01` extends the existing planning slice without a new service or speculative plan schema. Manual creation now uses explicit ordered exercise slots so stored item positions represent user-selected routine order.

Edits never rewrite prior routine snapshots. The version-append mutation locks the stable routine, verifies ownership, compares the caller's expected current version with the stored latest version, rechecks readiness/content rules and atomically appends version N+1. Stale expected versions fail before insertion. This implements the current manual-edit scope of `REQ-013` and the routine-update portion of `REQ-019` while preserving `REQ-012`.

Readiness selection no longer relies on completion timestamps. PH-02 corrections form immutable chains through `corrects_session_id`; same-transaction records can share timestamps. Application and database planning gates therefore resolve the highest published template version and require exactly one completed correction-chain leaf. Competing leaves fail closed. Safety flags are read only from that current leaf.

The edit UI can retain currently approved exact historical versions already present in the snapshot even when a newer library version exists. Withdrawn/restricted historical versions remain readable as history but cannot be copied into a newly saved routine version. Export v3 already contains every routine version, so this slice needs no export-schema increment.

## Implemented PH-04 structured-constraint prerequisite
`BR-20260824-01` adds only the deterministic planning primitives required before restricted routine generation can be consumed. It does not unlock restricted routine save/edit and does not parse free-text wellness notes.

The readiness baseline has a published version 2 that can record optional user-selected movement-avoidance categories. The first bounded synthetic vocabulary is `surface_hand_loading`, `knee_bending` and `other_or_unclear`; only the first two are deterministic planning tags. Version 1 remains preserved for historical assessment interpretation and linked corrections on older completed records. A restricted current assessment without a supported structured choice, a legacy version-1 restriction, or `other_or_unclear` remains unresolved and fails closed rather than being inferred from `affectedAreas` or `avoidedMovements`.

`exercise_versions` now owns exact-version `constraint_tags` plus an explicit classification-complete marker. Finalised exercise constraint metadata is immutable with the rest of the version's reviewed content. Draft content cannot finalise until the classification-complete marker is true; an explicitly classified empty tag set is distinct from an unclassified version. The current synthetic fixtures demonstrate mechanics only and do not establish a production taxonomy/editorial review.

Private deterministic database primitives can resolve the current readiness correction-chain leaf, extract its supported structured constraint set, test whether one approved exact exercise version conflicts with that set, and select the first compatible target from the existing exact-version `substitution` relations. These primitives extend the existing exercise-content/planning contracts rather than adding a second relationship authority or runtime AI.

The application exercise-content reader exposes this exact-version planning metadata to server consumers. The next PH-04 consumer slice must apply these primitives to routine create/edit or guided proposals before any restricted save is permitted. `private.require_current_planning_readiness` therefore remains conservative for current manual persistence.

## Implemented PH-04 manual structured-constraint consumer
`BR-20260825-01` consumes the previously merged structured-constraint primitives in the existing manual routine create/edit flow without introducing a parallel safety engine or runtime AI.

Application planning state now distinguishes unrestricted readiness, supported structured restriction, unresolved restriction, assessment-required, blocked and unavailable states. For a supported structured restriction, the builder filters the currently approved exact exercise-version choices through version-owned immutable constraint tags. Existing compatible `substitution` relations can be presented with their reviewed guidance, but the application never silently swaps an exercise; the user must explicitly select the replacement.

The trusted mutation boundary independently validates the complete submitted exact-version array. `private.require_routine_exercise_constraints` resolves the current correction-chain readiness leaf through the existing structured-constraint authority, rejects non-visible/non-approved selections, and rejects any exact exercise version that conflicts with the current structured constraint set before routine identity/version/items are inserted. Create and append-only edit therefore share the same database safety invariant.

Historical routine versions remain unchanged when later readiness restrictions change. A new routine version may omit/replace now-incompatible content while older snapshots continue to reference their exact historical exercise versions. Stale edit detection, owner authorisation and export-v3 history remain unchanged.

Legacy version-1 restrictions, missing structured choices, `other_or_unclear`, block-generation outcomes and ambiguous/unavailable readiness still fail closed. Free-text `affectedAreas`/`avoidedMovements` are not parsed into constraint tags. This slice proves manual constraint consumption only; deterministic guided proposal construction, explanation and per-item review/replacement remain later PH-04 work.

## Implemented PH-04 deterministic guided proposal/review slice
`BR-20260910-01` adds a bounded guided routine proposal on top of the existing planning and exercise-content authorities. It adds no proposal persistence, second generator service, runtime AI or parallel routine-save path.

The generator is a pure deterministic planning function. Current explicit inputs are routine focus (`balanced`, `upper_body`, `lower_body`) and requested item count (1–6). Candidate input comes only from current visible `general`/`reviewed` exact exercise versions that already pass the current structured readiness constraints. Balanced selection rotates across available target-area groups; focused selection is stable by title/version/identity ordering. Unsatisfiable requested structure fails closed.

Generated proposals are transient application state. Each item retains exact exercise identity/version plus reviewed structured purpose, summary, target-area and equipment metadata. Proposal explanations cover purpose, balance/focus, active structured constraints and substitution/review behaviour. Existing exact-version substitution relationships are shown only when the target is also currently compatible.

Every proposed item is explicitly reviewable before persistence. Replacement choices are constrained to the same primary target-area slot and are never automatic. The reviewed exact-version array then uses the existing `create_manual_routine` boundary, so current readiness, approval and compatibility are revalidated at save time.

This slice advances but does not complete `REQ-014`: broader profile goals, preferences, equipment/facilities, available time and routine-frequency inputs remain unconsumed. Unlimited routine templates also remain later PH-04 work. Runtime AI remains unnecessary for this deterministic baseline.

## Implemented PH-04 structured planning-profile prerequisite
`BR-20260910-02` adds the private structured planning inputs required by `REQ-003` before the deterministic generator can truthfully consume them. The implementation extends the existing owner-only `public.profiles` row instead of creating a second preferences service/table or introducing runtime AI.

Current structured fields are primary and optional secondary general-wellness goal, preferred method tokens, equipment tokens, facility tokens, available minutes per routine and preferred routine days per week. Primary/secondary positions encode priority. The vocabulary is bounded in application validation and database `CHECK` constraints; malformed/unsupported persisted values fail closed when the server profile snapshot is reconstructed. Partial profiles remain valid current state, so a user may save a display name or some planning choices without being forced to complete unrelated inputs. A pure application completeness predicate identifies when all required planning categories exist for the later generator consumer.

The existing profile data authority is preserved. RLS continues to restrict the row to its authenticated owner, and the existing `row_version` trigger/expected-version update path protects concurrent edits. The first migration draft used a private helper function inside array-uniqueness `CHECK` constraints while revoking execute permission from the authenticated writer; local pgTAP verification exposed that inappropriate dependency. The final migration removes the helper and enforces uniqueness directly inside the finite-vocabulary constraints, so the row check requires no extra callable authority.

Readable account export advances from v3 to v4 and includes the structured planning fields. The profile row remains a current editable record rather than immutable history, and permanent Auth-user deletion continues to cascade through it. This slice does not alter existing assessment or routine historical snapshots.

The guided generator is intentionally unchanged in this prerequisite. The next PH-04 consumer must add only the immutable version-owned exercise planning metadata actually needed to honour these fields and then consume a complete planning profile deterministically. Until that consumer exists, collection is not presented as generator enforcement.

## Implemented PH-04 exact-version exercise planning-metadata prerequisite
`BR-20260917-01` adds only the exercise-side structured metadata required before the merged private planning profile can be consumed deterministically. The existing `exercise_versions` authority remains the owner: no parallel taxonomy service, inference layer, runtime AI or proposal persistence is introduced.

Each exact exercise version can now own bounded planning goal tags, method tags, equipment tokens, facility tokens, a deterministic estimated-minutes value and an explicit `planning_metadata_complete` marker. The accepted vocabularies match the structured profile contract rather than display strings. Database constraints reject unsupported/duplicate tags and out-of-range time estimates.

Planning metadata follows the existing content-version lifecycle. Draft versions may be explicitly classified. A draft cannot finalise unless both the existing movement-constraint classification and the new planning metadata classification are complete. After finalisation, goal/method/equipment/facility/time metadata and the completeness marker are immutable with the rest of the exact version.

The synthetic seed explicitly classifies the current visible fixture versions before finalisation. These rows prove deterministic mechanics only and are not evidence of a complete production exercise taxonomy, professional review or medical suitability. No planning value is inferred from title, instructions, target area or free text.

The server exercise library now exposes exact-version planning metadata to server consumers. Guided selection behaviour is deliberately unchanged in this prerequisite. The next PH-04 slice must require a complete structured planning profile and consume these fields deterministically, while preserving current readiness/constraint/approval gates and fail-closed behaviour when compatible content is insufficient.

## Implemented PH-04 profile-aware deterministic guided-generation consumer
`BR-20260918-01` consumes the merged private planning profile and merged exact-version exercise planning metadata in the existing guided-generation path. It adds no schema, service, proposal persistence, scheduling engine or runtime AI.

Guided generation now requires a complete structured planning profile. The primary general-wellness goal is a hard exact-version eligibility condition; the optional secondary goal is a stable deterministic tie-break. At least one preferred method and one available facility must intersect the version-owned metadata. Every required equipment token must be present in the user's available equipment set, except the explicit `none` token. Unclassified planning metadata fails closed.

Available routine time is enforced over the summed exact-version `estimated_minutes` of the selected proposal, not merely per exercise. Replacement options are filtered so substituting one review choice cannot push the reviewed proposal outside the same current profile/time budget. Preferred weekly frequency is included in the proposal explanation as planning context only; this slice does not create a schedule or infer per-exercise frequency semantics.

Current readiness and movement-constraint gates remain upstream authorities. Candidate versions must still be current approved exact versions that pass structured movement compatibility before profile filtering occurs. Generated proposals remain ephemeral and every item remains explicitly reviewable.

The review save no longer delegates directly to the manual action without profile validation. A guided-specific server wrapper reconstructs the current profile and current exercise library, verifies the complete reviewed exact-version array still satisfies the current planning profile and total-time budget, then calls the existing authoritative manual routine mutation. This closes the stale-profile/forged-replacement gap without creating a second persistence path. Manual routine creation remains intentionally user-directed and is not forced to match planning preferences.

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

## Implemented PH-04 reusable routine templates

`BR-20260919-01` adds reusable owner-private routine templates without duplicating the existing routine section/item snapshot hierarchy. Each template is a stable record that points to one immutable source `routine_version`; saving a template therefore captures the exact routine snapshot current at that time, and later routine edits append new routine versions without changing the saved template.

Template creation is available only through the authenticated mutation boundary and captures the owner's latest source routine version. The source snapshot must contain currently approved exact exercise versions when the template is created. Authenticated table access is read-only to the owner; direct authenticated updates are denied, while the existing immutable-snapshot trigger also rejects privileged direct rewrites as defence in depth.

Creating a routine from a template reads the saved source routine version's ordered exact exercise-version IDs and delegates to the existing authoritative manual-routine mutation. Current readiness, exercise approval and structured movement constraints are therefore rechecked at instantiation instead of being frozen as permission in the template. A later-withdrawn exact exercise version remains readable through historical ownership but cannot silently propagate into a new routine.

The implementation adds no subscription/entitlement service and no saved-template count gate. Focused database evidence created 26 templates for one owner while preserving cross-user isolation. Readable account export advances to v5 with template metadata, and Auth-user deletion cascades through template records. Runtime AI remains absent.

Closure audit result: the routine-template slice was subsequently published through PR #25 and merge `d4bebba1a535dfe321b43c17b4f1638b87021a6f`. The remaining PH-04 completion dependency was the durable versioned plan-composition authority implemented by `BR-20260919-02`. PH-05 continues to own scheduling and progression mechanics.

## Implemented PH-04 versioned plan-composition foundation

`BR-20260919-02` adds stable owner-private `plans`, immutable append-only `plan_versions`, and ordered `plan_version_routines` links to exact immutable `routine_versions`. A plan version therefore preserves its own title/version plus the exact routine snapshots composed at save time. Later routine edits append new routine versions and cannot rewrite an existing plan version.

Plan creation and append-only plan editing are authenticated database mutations. The stable plan row is locked during version append; the caller supplies the expected current version and a stale expectation fails before a new version is inserted. Composition is bounded to one through twelve unique routine versions, and one plan version cannot contain two versions of the same stable routine.

A newly saved plan composition is current planning authority rather than historical permission. Before insertion, the database resolves the exact exercise-version IDs contained by the selected routine snapshots and delegates to the existing `private.require_routine_exercise_constraints` authority. Current readiness, current exercise approval/visibility and current structured movement constraints are therefore revalidated. Previously saved plan versions remain immutable/readable history even if a referenced exercise is later withdrawn; that historical snapshot cannot be copied into a newly saved plan version unless it still satisfies the current boundary.

Plan tables expose owner-only reads through RLS and revoke direct authenticated writes; immutable-update protection remains defence in depth for privileged paths. Account deletion cascades through plan identities, versions and composition links. Readable account export advances from v5 to v6 and includes every plan version with its exact ordered routine-version composition.

No scheduling recurrence, timezone, progression proposal, activation state, entitlement service or plan-count gate is introduced. Focused database evidence creates 26 plans for one owner without a subscription/count boundary and verifies cross-user isolation. This satisfies the PH-04 plan-composition foundation and the saved-plan portion of `REQ-018` / `AC-011`; PH-05 still owns schedule/progression mechanics and therefore the remainder of full `REQ-017`.
