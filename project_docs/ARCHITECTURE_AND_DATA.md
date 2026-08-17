# Architecture and Data

**Status:** PH-01 shell implemented; Supabase Auth/Postgres selected for PH-02; production hosting/data region deferred
**Owner:** Application structure, data ownership and integration boundaries  
**Read when:** Structure, persistence, API, auth, sync, billing, AI or integration work

## Architecture decision rule
Use the smallest mechanism that closes an applicable failure mode. A future possibility is not by itself a requirement.

## Implemented PH-01 application structure

`BR-20260817-04` establishes one Next.js App Router application written in TypeScript and managed with npm on Node.js 24 LTS. The root layout owns the shared shell and primary navigation; route content lives under `src/app`; shared shell components live under `src/components`.

This implements only the application-shell boundary. Domain modules, authentication, persistence, server-authoritative data, external integrations and provider-specific infrastructure are not scaffolded prematurely and remain governed by their later phase prerequisites.
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
