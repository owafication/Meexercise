# Project Index

**Status:** Canonical router v0.2.0  
**Mode of latest record:** PH-02 negative cross-user application-authorisation verification
**Repository state:** PH-00/PH-01 verified; PH-02 database, Auth/private-profile, readiness-assessment, data-lifecycle and password-recovery slices are merged to `main` at `0328cb86af067384dc02de95b2ac201820b215a2`; two-user negative cross-user application-authorisation is locally verified on `agent/ph02-authorization-boundary` without product-code changes. The remaining PH-02 gap is the correction/retention contract under `REQ-038`; production hosting/data region and production-specific obligations remain deferred to release readiness (`BR-20260818-01`–`BR-20260819-02`).

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
- `PH-02` - **In progress / implemented private-data surfaces plus negative cross-user authorisation locally verified**: pinned Supabase CLI, persistence/RLS/concurrency foundations, Auth signup/sign-in/sign-out/recovery, private-profile persistence/conflict handling, versioned readiness-assessment save/resume/completion, conservative safety flags, readable current-data export and re-authenticated permanent account deletion are implemented and locally verified. Two-user adversarial browser coverage verifies that currently implemented PH-02 private profile, assessment mutation and export surfaces do not expose or mutate another authenticated user's records. The remaining PH-02 gap is the correction/retention contract under `REQ-038`. Production hosting/data region is not a PH-02 prerequisite.
- `PH-03` through `PH-10` - **Proposed**.

## ID registry
- `REQ-001`–`REQ-052`: retained from prior MeExercise foundation; canonical in PRODUCT_FOUNDATION.
- `AC-001`–`AC-028`: retained; canonical in PRODUCT_FOUNDATION.
- `PH-00`–`PH-10`: retained; canonical in IMPLEMENTATION_PLAN.
- `DEC-001`–`DEC-012`: legacy-reserved; definitions unavailable in supplied pack. New decisions start `DEC-013`.
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
