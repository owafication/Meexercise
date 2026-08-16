# Validation and Evidence

**Status:** Proposed validation catalogue  
**Owner:** Evidence definitions, acceptance mapping and completion claims

## Evidence rules
- `Implemented` means relevant source/config exists; it does not prove build/runtime.
- `Ran` names exact command/environment.
- `Passed` applies only to that check.
- `Verified` means evidence was inspected against its declared contract.
- `Skipped` and `Unproven` are not `Failed`, but cannot support the missing claim.
- Build, unit, integration, browser, accessibility, security, migration, restore and production evidence are distinct.
- Put each important assertion at the lowest-cost level that still contains its failure mechanism.
- Do not duplicate the same combinatorial assertions at every layer.

Prior `VAL-001`–`VAL-020` are legacy-reserved because their original definitions were not supplied. This revision uses new IDs.

## Validation catalogue
| ID | Check | Evidence boundary |
|---|---|---|
| `VAL-021` | Governance structure audit | canonical paths, links, duplicate owners, ID uniqueness, size limits |
| `VAL-022` | Repository baseline inspection | real root, branch/remotes/working tree/ignore/history facts only |
| `VAL-023` | Clean application build/static checks | selected toolchain install/build/type/static/lint as configured; not runtime |
| `VAL-024` | Authentication/authorisation | account lifecycle, sessions, ownership, negative cross-user/pro-role access |
| `VAL-025` | Assessment/version/safety | save/resume, template history, safety flags, conservative stop/restriction |
| `VAL-026` | Exercise/content versioning | schema/invariants, publication states, historical exact-version retention |
| `VAL-027` | Routine generation constraints | property/fixture tests for equipment, goals, restrictions, structure, substitutions and fail-closed cases |
| `VAL-028` | Scheduling/progression | recurrence/timezone/exceptions/idempotency, explanation/reversal, conservative reduction |
| `VAL-029` | Session/print parity | active-session persistence and identical snapshot/dosage in interactive/print/PDF |
| `VAL-030` | Reporting/provenance | derived metric calculation, labels and source-record traceability |
| `VAL-031` | Meal/allergen integrity | recipe/meal versions, exclusions/allergens, shopping-list consistency |
| `VAL-032` | Cross-device concurrency | lost-update conflicts, reconnect/retry/idempotency, data-preserving resolution |
| `VAL-033` | Privacy/logging/data lifecycle | collection surface, log/analytics redaction, export/correction/deletion/retention behaviour |
| `VAL-034` | Accessibility/UX state | automated scan plus keyboard/focus/errors/zoom/reflow/assistive-tech checks for mapped flows |
| `VAL-035` | Migration/recovery | forward migration, failure rollback/restore, historical semantics, backup restore where applicable |
| `VAL-036` | Security boundary review | untrusted inputs, authz, secrets, TLS/config, destructive actions, dependencies as applicable |
| `VAL-037` | Performance/support matrix | only declared latency/load/browser/device/resource targets; representative runtime evidence |
| `VAL-038` | Entitlement/professional isolation | free capability gates, expiry, content provenance, no initial user-record access by professional roles |
| `VAL-039` | Release smoke/rollback | production-like deploy/start/core flow/rollback or recovery for declared release target |

## Recorded repository evidence

### `BR-20260817-02`
- **Mode/scope:** Repository execution; `PH-00`, `VAL-021`, `VAL-022`.
- **Governance evidence:** all manifest-governed files passed byte and SHA-256 verification after the stale `PROJECT_SETTINGS.md`/`REVISION_AUDIT.md` manifest entries were repaired; the staged initial-commit scope was explicitly reviewed.
- **Local evidence:** commit `0f3db2b5abda7f4fea6315baa01218dade562caa` exists on clean local `main`, with `main` tracking `origin/main` at the same commit.
- **Remote evidence:** independent GitHub inspection verified `refs/heads/main` at `0f3db2b5abda7f4fea6315baa01218dade562caa` with commit message `docs: establish MeExercise governance v0.2.0`.
- **Passed / Verified:** governance structure/integrity, repository baseline, commit and remote publication for PH-00.
- **Unproven:** application framework/toolchain, dependencies, build, tests, runtime, deployment and all PH-01+ behaviour.

### `BR-20260817-03`
- **Mode/scope:** Governance path canonicalization; PH-00 maintenance; `VAL-021`, `VAL-022`.
- **Starting evidence:** clean local `main` and `origin/main` at `4bf02cf47ebc31bde796938950b76a265c7603a8` before mutation.
- **Change:** `PROJECT_SETTINGS.md` names the tracked repository root and `project_docs/` as canonical governance locations; repository policy designates detached/versioned source-pack copies as non-canonical after integration.
- **Validation contract:** exact changed-file scope, manifest byte/SHA-256 verification, project-settings size limit, staged-content check, PR base/head/file-scope verification, verified remote merge and local-main synchronization.
- **Deletion boundary:** the detached local source-pack directory may be deleted only after merge and synchronization are verified; its deletion is local cleanup rather than application implementation evidence.
- **Unproven:** application framework/toolchain, dependencies, build, runtime, deployment and all PH-01+ behaviour.

## Requirement mapping
| Requirement group | Primary validations |
|---|---|
| `REQ-001`–`REQ-007` | `VAL-024`, `VAL-025`, `VAL-033`, `VAL-034` |
| `REQ-008`–`REQ-012` | `VAL-026`, `VAL-034` |
| `REQ-013`–`REQ-019` | `VAL-027`, `VAL-026` |
| `REQ-020`–`REQ-024` | `VAL-028` |
| `REQ-025`–`REQ-030` | `VAL-029`, `VAL-030`, `VAL-034` |
| `REQ-031`–`REQ-035` | `VAL-031`, `VAL-033`, `VAL-034` |
| `REQ-036`–`REQ-040` | `VAL-032`, `VAL-033`, `VAL-035` |
| `REQ-041`–`REQ-047` | `VAL-038`, `VAL-024`, `VAL-033` |
| `REQ-048`–`REQ-052` | `VAL-023`, `VAL-034`–`VAL-039` as applicable |

## Minimum release evidence
A release claim must name the supported browser/device/deployment matrix and have evidence for the requirements actually included in that release. A green test suite does not prove unspecified browsers, scale, legal applicability, accessibility, backup restore, billing or professional workflows.

## Work report format
Use `BR-YYYYMMDD-##` for material repository-execution reports:
- mode/scope and affected IDs;
- inspected evidence;
- changed files/contracts/data;
- exact commands/environment;
- passed/failed/skipped/unproven;
- migration/data/rollback evidence where applicable;
- remaining risks/decisions.
