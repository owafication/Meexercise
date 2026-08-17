# Implementation Plan

**Status:** Proposed phase plan  
**Owner:** Delivery sequencing  
**Rule:** Hard prerequisites precede consumers; speculative foundations do not.

Each phase is implemented in small verifiable slices. A walking skeleton is used only where end-to-end feasibility is materially uncertain. A phase is not `Passed` because source exists; acceptance claims require mapped validation evidence.

## `PH-00 Repository and Governance Baseline`
**Objective:** Inspect the real repository and establish only the canonical governance required for safe work.  
**Tasks:** confirm root/Git/default branch/remotes/ignore/cleanliness; reconcile this generated pack with existing files; preserve existing contracts; register actual toolchain/framework/deployment facts when known; review staged files; commit/push only when authorised.  
**Validation:** `VAL-021`, `VAL-022`.  
**Rollback:** revert/remove governance integration without app-data change.  
**Stop:** ambiguous root/authority, conflicting canonical owner, or destructive overwrite of existing governance.

## `PH-01 Application Shell and Design System`
**Objective:** Produce the least-complex accessible responsive web shell and prove the selected toolchain. “Design system” means only shared primitives/tokens already justified by reuse; do not build a standalone component platform.  
**Prerequisites:** PH-00; framework/package/deployment-development choices sufficient to run locally.  
**Tasks:** scaffold; navigation shell; semantic layout; error/not-found/loading primitives as needed; basic test harness; minimal CI only after local commands are stable and remote CI has value.  
**Validation:** `VAL-023`, `VAL-034`.  
**Rollback:** scaffold commit.  
**Stop:** unsupported runtime/toolchain or architecture choice made without requirement.

## `PH-02 Identity, Profiles, Assessments and Sync Foundation`
**Objective:** Account/private-data boundary, versioned assessment flow, save/resume and first server-authoritative persistence slice.  
**Prerequisites:** PH-01; `DEC-024` Supabase Auth/PostgreSQL selection; data classification. Production web-hosting provider and production Supabase region are intentionally not PH-02 prerequisites.
**Tasks:** account lifecycle; profile; consent/collection notices as applicable; assessment versions/sessions; safety flags; draft recovery; ownership/authorisation; concurrency token; export/deletion foundation.  
**Validation:** `VAL-024`, `VAL-025`, `VAL-032`, `VAL-033`.  
**Rollback:** reversible schema migration/feature rollback preserving records.  
**Stop:** missing ownership/deletion/safety rule authority.

## `PH-03 Exercise Content Library`
**Objective:** Structured, versioned, accessible exercise content with publication status and substitutions.  
**Prerequisites:** PH-02 persistence/versioning primitives.  
**Validation:** `VAL-026`, `VAL-034`.  
**Rollback:** content version rollback without rewriting historical routines.  
**Stop:** inaccessible instruction design or unreviewed safety taxonomy used as authoritative.

## `PH-04 Routine and Plan Builder`
**Objective:** Manual and advanced generation from approved structured content.  
**Tasks:** plan/routine snapshots; sections/items; manual builder; deterministic generation constraints; substitution; explanation; user review; unlimited templates. Runtime AI is not required.  
**Validation:** `VAL-027`, `VAL-026`.  
**Rollback:** disable guided generator while retaining manual plans/data.  
**Stop:** any generator path bypasses deterministic constraints or version authority.

## `PH-05 Scheduling and Progression`
**Objective:** Advanced scheduling and explainable conservative progression.  
**Tasks:** recurrence/exceptions; pause/skip/reschedule; timezone handling; progression proposal/reversal; missed-session/difficulty/discomfort responses.  
**Validation:** `VAL-028`.  
**Rollback:** disable automatic proposals, retain schedules/manual control.  
**Stop:** duplicate schedule effects, timezone ambiguity or unsafe/unexplainable progression.

## `PH-06 Routine Performance and Print Packs`
**Objective:** Reliable active-session flow and canonical enhanced print/PDF projection.  
**Validation:** `VAL-029`, `VAL-034`.  
**Rollback:** preserve session data and provide read-only/print fallback.  
**Stop:** active-session data loss or print/interactive semantic mismatch.

## `PH-07 Reports, Trends and Cross-Device Completion`
**Objective:** Traceable advanced reports and robust multi-device conflict behaviour.  
**Tasks:** derived projections with source links; device/session management; conflict/reconciliation UI; export completeness.  
**Validation:** `VAL-030`, `VAL-032`.  
**Rollback:** rebuild derived reports; never discard primary records.  
**Stop:** untraceable metrics or silent lost update.

## `PH-08 General Meal Planning`
**Objective:** Free non-clinical meal planning, recipes, scheduling and shopping lists as an independent domain.  
**Prerequisites:** identity/persistence, scheduling and units/versioning foundations.  
**Validation:** `VAL-031`, `VAL-034`.  
**Rollback:** disable guided meal generation while preserving manual/user-created data.  
**Stop:** allergen/exclusion integrity or clinical-nutrition boundary unresolved.

## `PH-09 Premium and Professional Content Foundation`
**Objective:** Add premium entitlement boundary and professionally authored general-wellness programs without direct access to individual user data.  
**Tasks:** capability catalogue only as needed; entitlement checks; expiry behaviour; author/reviewer/verification/publication/withdrawal metadata; program discovery. Billing provider only if subscription activation is in scope.  
**Validation:** `VAL-038`, `VAL-024`, `VAL-033`.  
**Rollback:** disable sales/new premium access while retaining history/provenance/owned data.  
**Stop:** subscription blocks owned data or professional role gains user-record access.

## `PH-10 Production Readiness and Release`
**Objective:** Verify declared release scope across security/privacy, accessibility, migrations/recovery, supported browsers/devices, performance, operations and release rollback.  
**Tasks:** select and verify production web hosting and production Supabase project/data region against the intended distribution/privacy requirements; applicable threat/privacy review; restore drill; retention/deletion; dependency/licence review; release smoke; support/incident paths appropriate to exposure; performance only against actual targets; accessibility evaluation; release notes/limitations.
**Validation:** `VAL-023`–`VAL-039` as applicable.  
**Rollback:** last verified release plus tested data recovery path.  
**Stop:** material failed/unproven release requirement, critical privacy/security/safety/accessibility/data-loss issue, or unsupported claim.

## Future gates, unnumbered
- Direct professional-to-user management: only after a separate consent/access/audit/revocation specification for `REQ-047`.
- Runtime AI: only after a defined use case, evaluation set, data/grounding contract, deterministic validators and failure behaviour show value over the non-AI path.
- Public/external APIs, queues/workers, containers, microservices, RAG, long-term memory, wearables/health-platform integrations: only after their independent trigger exists.
