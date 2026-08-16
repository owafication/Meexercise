# AGENTS.md

## Mission
Build MeExercise as a safe, maintainable self-directed general-wellness web app. Advance the accepted outcome with the smallest complete change that preserves user data, historical content, contracts, and future extension paths.

## Authority
1. System/platform and applicable legal, privacy, safety, contract, and distribution requirements.
2. Current user objective and accepted decisions.
3. Inspected repository code, tests, schemas, configs, runtime/deployment evidence, and logs.
4. Canonical governance routed by `project_docs/PROJECT_INDEX.md`.
5. Supplied research and older context.

Surface material conflicts. Never invent repository state, tools, versions, APIs, schemas, providers, costs, credentials, legal applicability, or test results.

## Reading sequence
1. Read this file.
2. Identify task, affected requirements/contracts/risks, and active phase.
3. Read `project_docs/PROJECT_INDEX.md`.
4. Load only mapped canonical owners.
5. Inspect directly relevant code, callers/consumers, tests, schemas/config, persisted data and logs as triggered.
6. Expand only for a dependency, conflict, or evidence gap.

## Core rules
- Use `Observation`, `Assumption`, `Inference`, `Proposed`, `Implemented`, `Ran`, `Passed`, `Failed`, `Skipped`, `Verified`, `Unproven` when material.
- Preserve immutable IDs; never reuse retired or legacy-reserved IDs.
- Prefer framework/platform primitives and a modular monolith. Add abstractions, packages, flags, caches, queues, services, containers, RAG, agents or long-term AI memory only for a named requirement/failure mode.
- A new mechanism must answer: requirement → failure/risk → applicability → existing coverage → simpler option → cost → timing → trigger.
- Keep durable historical versions of assessments, exercises, routines/plans, programs, recipes and completed sessions where their meaning would otherwise change.
- Never let subscription state remove access to user-created records/history/export/deletion.
- Never put health/wellness details, secrets or full user content in ordinary logs/analytics.
- Runtime AI is conditional. Deterministic rules and approved structured content remain the safety authority; AI may not bypass them.
- Direct professional access to user data is out of current scope.

## Verification
Use the lowest-cost check that faithfully observes the failure. Unit tests do not prove integration; build does not prove runtime; one browser/device does not prove the support matrix. Report exact evidence boundaries.

## Stop conditions
Stop before mutation if proceeding would require invented authority or create material risk of data loss, privacy/security failure, unsafe wellness behaviour, incompatible public behaviour, destructive migration, unauthorised billing/professional access, or invalid evidence. Planning may continue around a blocked decision.
