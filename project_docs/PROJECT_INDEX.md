# Project Index

**Status:** Canonical router v0.2.0  
**Mode of latest record:** PH-05 schedule occurrence exceptions local verification
**Repository state:** PH-00 through PH-04 are verified on merged `main`. The final PH-04 plan-snapshot head `e5958060482b4c1d3ea8a86b63deb32267ac41d8` passed exact-head GitHub Actions CI run #47 (`35420487769`), including `Verify` and `Database and auth integration`, and PR #26 merged that exact head into `main` as `4ee47affe049683de09b478fc13eedfb11397e94` on 2026-09-19. PH-04 therefore closes with manual and deterministic guided routine creation/review, immutable routine versions, structured constraints/planning inputs, reusable routine templates, stable plans with immutable exact routine-version composition, export v6 and owner-private lifecycle coverage. Full `REQ-017` remains intentionally split because PH-05 owns recurrence, timezone-aware scheduling and progression behaviour. Runtime AI remains unused.

**Current PH-05 evidence:** `BR-20260923-01` first established immutable weekly schedule recurrence locally. That exact head `a4ab750756bf58c310e66055d527668a392ea9d5` later passed GitHub Actions CI run #51 (`35808748743`), including both `Verify` and `Database and auth integration`, and PR #28 merged it into `main` as `10e4818f4a27bd78dc1d93b213f2eeac31f6adff`. `BR-20260923-02` now records the second slice on `agent/ph05-schedule-exceptions`: append-only per-occurrence skip/reschedule/restore history pinned to an exact schedule rule and original local date, exception-aware occurrence projection, stale exception-write rejection, export v8 and owner/lifecycle coverage. Clean migration/seed replay, database lint, focused 39-test exception pgTAP, complete pgTAP and complete authenticated E2E passed locally. Remote exact-head CI/merge for this second slice remains Unproven. `REQ-020` / `AC-012` remain partial only for reminder capability; progression `REQ-021`-`REQ-023` remains later PH-05 work.

## Frozen terminology
- **MeExercise:** product/repository name.
- **General wellness:** self-directed exercise, mobility, activity, scheduling, progress and non-clinical meal planning without diagnosis/treatment.
- **Plan:** coordinated routines, schedule and progression intent.
- **Routine:** ordered versioned exercise/mobility instructions.
- **Program:** reusable authored collection of plans/routines.
- **Professional program:** professionally authored general-wellness content; no direct care relationship implied.
- **Direct professional management:** later access/assignment/monitoring/communication involving individual user data.
- **Free:** complete general-wellness capability defined in `PRODUCT_FOUNDATION.md`.
- **Premium:** specialised content/services/integrations or genuinely higher-cost optional capability.

## Canonical manifest
| Path | Owns | Read when |
|---|---|---|
| `/AGENTS.md` | runtime routing, evidence/stop rules | every task |
| `/PROJECT_SETTINGS.md` | project operating policy and complexity gate | project setup or ambiguous architecture/process work |
| `/README.md` | concise public/developer orientation | repository orientation |
| `project_docs/PROJECT_INDEX.md` | routing, ID registry, phase/status and supersession | every task after AGENTS |
| `project_docs/PRODUCT_FOUNDATION.md` | identity, scope, requirements, acceptance | product/feature/claims/acceptance |
| `project_docs/ARCHITECTURE_AND_DATA.md` | modules, data authority, interfaces, auth, sync, AI boundary | architecture/data/integration |
| `project_docs/UI_UX_AND_ROUTES.md` | IA, flows, routes, states, accessibility, print | frontend/UX |
| `project_docs/IMPLEMENTATION_PLAN.md` | PH-00–PH-10 sequencing/gates/rollback | planning/delivery |
| `project_docs/SECURITY_PRIVACY_AND_RISK.md` | wellness safety, privacy/security, RISK register | sensitive data/access/security |
| `project_docs/VALIDATION_AND_EVIDENCE.md` | validation catalogue, traceability/evidence | testing/status/release claims |
| `project_docs/REPOSITORY_AND_RELEASE.md` | Git/dependencies/config/CI/providers/release/recovery | repository/release/ops |
| `project_docs/DECISIONS_AND_HISTORY.md` | DEC records, open decisions, governance history | consequential decisions/change history |
| `project_docs/DEBUGGING_AND_MAINTENANCE.md` | diagnostics, triggers, deletion/maintenance | debugging/refactor/operations |

## Routing
| Task | Required owners | Add when affected |
|---|---|---|
| Scope/feature/pricing | PRODUCT_FOUNDATION, DECISIONS_AND_HISTORY | SECURITY_PRIVACY_AND_RISK |
| UI/navigation/print | UI_UX_AND_ROUTES, PRODUCT_FOUNDATION | ARCHITECTURE_AND_DATA, VALIDATION_AND_EVIDENCE |
| Data/auth/sync/migration | ARCHITECTURE_AND_DATA, PRODUCT_FOUNDATION | SECURITY_PRIVACY_AND_RISK, VALIDATION_AND_EVIDENCE |
| Routine generation/progression | PRODUCT_FOUNDATION, ARCHITECTURE_AND_DATA | SECURITY_PRIVACY_AND_RISK, VALIDATION_AND_EVIDENCE |
| Meal planning | PRODUCT_FOUNDATION, ARCHITECTURE_AND_DATA, UI_UX_AND_ROUTES | SECURITY_PRIVACY_AND_RISK |
| Professional/premium | PRODUCT_FOUNDATION, DECISIONS_AND_HISTORY | SECURITY_PRIVACY_AND_RISK, ARCHITECTURE_AND_DATA, VALIDATION_AND_EVIDENCE |
| Repository/dependency/release | REPOSITORY_AND_RELEASE, IMPLEMENTATION_PLAN | VALIDATION_AND_EVIDENCE, DECISIONS_AND_HISTORY |
| Debug/refactor | DEBUGGING_AND_MAINTENANCE | owning domain + validation |

## Current phase/status
- `PH-00` — **Passed / Verified**: repository baseline established at `C:\Apps\Meexercise`; canonical v0.2.0 governance integrated and manifest-verified; initial commit `0f3db2b5abda7f4fea6315baa01218dade562caa` published; local `main` and GitHub `main` independently verified at the same commit (`BR-20260817-02`; `VAL-021`, `VAL-022`).
- `PH-01` — **Passed / Verified (shell scope)**: Next.js App Router application shell implemented with Today, Plans, Create, Progress and Profile navigation; lint, typecheck, unit/component tests, production build and automated Chromium accessibility/keyboard/reflow/reduced-motion checks passed locally (`BR-20260817-04`; `VAL-023`, `VAL-034`). Release support-matrix and manual assistive-technology claims remain unproven.
- `PH-02` - **Passed / Verified (current identity/private-data foundation scope)**: identity/private-profile, server-authoritative persistence/RLS/concurrency, versioned readiness assessment, conservative safety flags, password recovery, negative cross-user authorisation, readable export, correction and permanent primary-record deletion are implemented and verified through local isolated runtime evidence plus exact-head GitHub CI/merge evidence. Current profile/in-progress assessment data can be corrected in place; completed assessments are corrected through linked successors on the same immutable template version; account email correction requires current-password re-authentication and confirmation at the new address; export v2 preserves correction linkage; account deletion cascades through source/correction records. This phase result does not prove production legal applicability, backup retention/exceptions, hosted production Supabase, production hosting/data region, release smoke/rollback, or future PH-03+ data-lifecycle coverage; those remain owned by their later phases/gates.
- `PH-03` — **Passed / Verified (exercise-content library scope)**: stable exercise identities, immutable versioned structured instructions, publication-state visibility, multi-version latest selection, exact-version relationship navigation, substitution/regression/progression/equipment-alternative semantics, bilateral/side rules, withdrawal fallback and read-only `/exercises` browse/detail surfaces are implemented and verified through isolated local runtime evidence plus exact-head GitHub CI/merge evidence. Synthetic seed records prove mechanics only and are not production-approved content. Production catalogue population/review remains a later activation/release content gate. `REQ-012` historic routine exact-version retention remains a PH-04 consumer contract. Manual assistive-technology/support-matrix and production release/legal/privacy/recovery evidence remain later gates.
- `PH-04` — **Passed / Verified (routine and plan builder scope)**: merged `main` contains manual create/edit, append-only immutable routine versions, structured movement constraints, manual constraint consumption, deterministic guided proposal/explanation/review, structured planning-profile capture, exact-version exercise planning metadata, profile-aware guided generation, reusable routine templates, and stable plans with immutable append-only plan versions plus exact ordered routine-version composition. The final plan-snapshot head `e5958060482b4c1d3ea8a86b63deb32267ac41d8` passed exact-head CI run #47 and PR #26 merged it as `4ee47affe049683de09b478fc13eedfb11397e94`. Export v6, account-deletion cascade, cross-user isolation, stale-write rejection and no plan/template count or subscription gate are verified for this scope. `REQ-014`, `REQ-015`, `REQ-016`, `REQ-018`, `AC-006`, `AC-007`, `AC-011` and the PH-04 plan-composition portion of `REQ-017` are verified. Full `REQ-017` remains partial by design because PH-05 owns recurrence, timezone-aware scheduling and progression. Production catalogue review/provenance and later release/legal/recovery gates remain outside PH-04 closure. Runtime AI remains absent.
- `PH-05` - **Active / In progress**: merged `main` contains the remotely verified immutable weekly recurrence/timezone/pause foundation from `BR-20260923-01`/PR #28. The second locally runtime-verified slice (`BR-20260923-02`) adds immutable append-only per-occurrence skip/reschedule/restore history, exception-aware Today/plan projections, stale exception-write rejection, export v8, owner isolation and account-deletion cascade. This further advances the scheduling portion of `REQ-017` and partially verifies `REQ-020`, `AC-012` and `VAL-028`; reminders remain the only unimplemented `REQ-020` scheduling capability, while progression `REQ-021`-`REQ-023` remains unimplemented. Exact-head CI/merge for the second slice is still Unproven.
- `PH-06` through `PH-10` - **Proposed**.

## ID registry
- `REQ-001`–`REQ-052`: retained from prior MeExercise foundation; canonical in PRODUCT_FOUNDATION.
- `AC-001`–`AC-028`: retained; canonical in PRODUCT_FOUNDATION.
- `PH-00`–`PH-10`: retained; canonical in IMPLEMENTATION_PLAN.
- `DEC-001`–`DEC-012`: legacy-reserved; definitions unavailable in supplied pack. Current decisions continue through `DEC-025`.
- `RISK-001`–`RISK-014`: legacy-reserved; definitions unavailable in supplied pack. New risks start `RISK-015`.
- `ROUTE-001`–`ROUTE-014`: legacy-reserved; definitions unavailable in supplied pack. New routes start `ROUTE-015`.
- `VAL-001`–`VAL-020`: legacy-reserved; definitions unavailable in supplied pack. New validations start `VAL-021`.
- `BR-20260805-01`: historical prior foundation record.
- `BR-20260817-01`: this governance revision/file-generation record.
- `BR-20260817-02`: PH-00 repository baseline and governance-integration evidence record.
- `BR-20260817-03`: canonical governance-path and duplicate-source-pack retirement record.
- `BR-20260817-04`: PH-01 application-shell implementation and local validation record.
- `BR-20260817-05`: PH-02 Supabase identity/persistence selection and production hosting/data-region deferral decision.
- `BR-20260818-01`: PH-02 database-foundation implementation, isolated local migration/pgTAP verification and database-CI record.
- `BR-20260818-02`: PH-02 Auth/private-profile implementation, runtime-concurrency verification and Supabase-internal lint/Git-boundary record.
- `BR-20260818-03`: PR #6 remote-CI/merge evidence plus non-canonical development-cheatsheet integration and governance-routing record.
- `BR-20260818-04`: PH-02 readiness-assessment save/resume/safety implementation and isolated local runtime-verification record.
- `BR-20260818-05`: PH-02 readable data-export/account-deletion implementation and isolated local runtime-verification record.
- `BR-20260819-01`: PH-02 captured-email password-recovery/update implementation and isolated local runtime-verification record.
- `BR-20260819-02`: PH-02 two-user negative cross-user application-authorisation verification record; test-only, no product authorisation change.
- `BR-20260819-03`: PH-02 data-correction, export-v2 and primary-retention/deletion local runtime-verification record.
- `BR-20260819-04`: PH-02 exact-head remote-CI/merge verification and canonical phase-closure record.
- `BR-20260820-01`: PH-03 exercise-content first-slice implementation and isolated local runtime-verification record.
- `BR-20260820-02`: PH-03 acceptance-semantics implementation and local-completion verification record; exact-head publication/closure remains separate.
- `BR-20260820-03`: PH-03 exact-head remote-CI/merge verification and canonical phase-closure record.
- `BR-20260821-01`: PH-04 manual routine foundation first-slice implementation and isolated local verification record.
- `BR-20260823-01`: PH-04 ordered routine editing, append-only versioning and deterministic correction-chain readiness local-verification record.
- `BR-20260824-01`: PH-04 structured movement-constraint and exact-version compatibility/substitution prerequisite local-verification record.
- BR-20260825-01: PH-04 manual structured-constraint create/edit consumption and user-selected substitution local-verification record.
- BR-20260910-01: PH-04 bounded deterministic guided proposal/explanation/per-item review local-verification record after development-machine transfer.
- BR-20260910-02: PH-04 structured planning-profile prerequisite and export-v4 isolated local-verification record.
- BR-20260917-01: PH-04 exact-version exercise planning-metadata prerequisite isolated local-verification record.
- BR-20260918-01: PH-04 profile-aware deterministic guided-generation consumption isolated local-verification record.
- BR-20260919-01: PH-04 reusable routine templates isolated local-verification and closure-audit record.
- BR-20260919-02: PH-04 versioned plan-composition foundation isolated local-verification and local implementation-closure record.
- BR-20260919-03: PH-04 exact-head remote-CI/merge verification and canonical phase-closure record.
- BR-20260923-01: PH-05 versioned weekly schedule foundation implementation and local runtime-verification record; later remotely verified through CI #51 / PR #28.
- BR-20260923-02: PH-05 per-occurrence skip/reschedule/restore implementation and local runtime-verification record; PH-05 remains Active / In progress.

## Traceability rule
For non-trivial implementation: `REQ → scope → architecture/contract → PH/slice → files/surfaces → AC → VAL → status`.

## Supersession from v0.1
This revision consolidates the prior proposed owners:
- `PRODUCT_SCOPE.md` + `REQUIREMENTS.md` → `PRODUCT_FOUNDATION.md`;
- `ARCHITECTURE.md` + `DATA_AND_STATE.md` → `ARCHITECTURE_AND_DATA.md`;
- `UI_UX.md` → `UI_UX_AND_ROUTES.md`;
- `SAFETY_PRIVACY.md` → `SECURITY_PRIVACY_AND_RISK.md`;
- `VALIDATION.md` + `BUILD_STATUS.md` → `VALIDATION_AND_EVIDENCE.md` plus this index status;
- `DECISIONS.md` + `CHANGELOG.md` → `DECISIONS_AND_HISTORY.md`.

Do not keep both old and new canonical owners after repository integration unless the old files are retained only as clearly marked historical redirects.

## Operational reference (non-canonical)
- `project_docs/DEVELOPMENT_CHEATSHEET.md` preserves historical ChatGPT/PowerShell/Git/Supabase troubleshooting, failure chronology and resumption notes. It is not a canonical owner of requirements, contracts, phases, status or decisions and is intentionally excluded from `PACK_MANIFEST.json`. Read it only after `AGENTS.md` and this index; current local evidence, current GitHub state and canonical governance override stale handoff snapshots.
