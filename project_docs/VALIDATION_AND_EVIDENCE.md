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

### `BR-20260818-01`
- **Mode/scope:** PH-02 database-foundation implementation and local verification; `REQ-002`–`REQ-006`, `REQ-036`–`REQ-040`, `REQ-051`; partial `VAL-024`, `VAL-025`, `VAL-032`, `VAL-033`, `VAL-035`, `VAL-036`.
- **Implemented:** project-pinned `supabase@2.114.0`; version-controlled `supabase/config.toml`, migration, synthetic seed and pgTAP suite; profile/assessment-version/session schema; RLS ownership policies; row-version concurrency; immutable published assessment versions and completed assessment sessions.
- **Migration evidence:** local `supabase db reset` completed successfully from a clean local database and replayed the migration plus synthetic `seed.sql`.
- **Database-test evidence:** cached Supabase `pg_prove:3.36` image `sha256:eda7c5e68719e9c8287e78c017118407b48df904a51c935f5ab6098b8c0bc6bc` executed the repository test file; `Files=1, Tests=21`, `Result: PASS`.
- **Isolation evidence:** during migration/database verification the Windows adapter carrying the active IPv4/IPv6 default route was disabled; localhost API/DB remained reachable; Supabase was stopped before that adapter was restored. Persistent safe host exposure of the local development stack remains `Unproven` and is not relied upon.
- **Application regression evidence:** `npm run verify` passed after database verification: lint, TypeScript check, 2 Vitest tests, Next.js 16.3.1 production build and 12 Playwright tests.
- **CI follow-up in this slice:** CI adds an independent database job using the project-pinned CLI, local database startup, migration/seed replay and `supabase test db`; remote CI remains `Unproven` until the branch is pushed and GitHub Actions completes.
- **Not proven by this record:** account signup/sign-in/recovery/deletion, profile/assessment UI, save/resume safety behaviour, application server-side ownership checks, export/deletion lifecycle, remote Supabase, production region, persistent local-stack network isolation, production/runtime release behaviour.

### `BR-20260818-02`
- **Mode/scope:** PH-02 Auth/private-profile implementation and local runtime verification; partial `REQ-001`, `REQ-002`, `REQ-036`, `REQ-037`, `REQ-048`, `REQ-049`, `REQ-052`; partial `VAL-024`, `VAL-032`, `VAL-034`, `VAL-036`.
- **Implemented:** local Supabase Auth/account UI/actions, Auth callback/session integration, authenticated private-profile form/actions, validation modules/tests, optimistic profile conflict handling, dedicated Auth/profile Playwright integration, local environment helper and related CI/config changes.
- **Database continuity:** V4 reset/replayed the existing PH-02 migration and synthetic seed and reran the database suite successfully: `Files=1, Tests=21`, `Result: PASS`. Local Supabase ran with the active default-route adapter disabled and was stopped before network restoration.
- **Auth/profile runtime:** V5 reset the local database and `npm run test:e2e:auth` passed its Chromium flow (`1 passed`), exercising signup/sign-in/sign-out, private-profile persistence and a two-session stale-write conflict. The stale save produced the intended user-visible reload-before-saving message rather than overwriting the newer profile.
- **Test-harness correction:** V4's Auth/profile failure was a Playwright strict-mode locator ambiguity between the application `role="alert"` and Next.js' route announcer, not an application concurrency failure. V5 narrowed the assertion to the conflict alert text and the flow passed.
- **Generated-state correction:** V5's later full verification exposed ESLint scanning Supabase-generated `supabase/.temp/...` runtime code. V6 excluded `supabase/.temp/` and `supabase/.branches/` from Git and ESLint rather than modifying generated code.
- **Regression evidence:** V6 `npm run lint` passed and `npm run verify` passed, covering lint, TypeScript, Vitest, production build and the ordinary Chromium Playwright suite (`12 passed`). The Auth/profile test was not rerun in V6 because V6 changed only Git/lint discovery; its V5 pass remains the runtime evidence for that flow.
- **Still unproven:** password-recovery delivery/end-to-end update, account deletion, assessment save/resume/safety UI, export/correction/deletion lifecycle, complete negative cross-user application-authorisation coverage, remote Supabase, production region/hosting, remote GitHub Actions for this branch and release/runtime behaviour.

### `BR-20260818-03`
- **Mode/scope:** governance maintenance after PH-02 Auth/private-profile publication; no new application behaviour.
- **Remote PH-02 evidence:** GitHub Actions CI run #7 (`32109163956`) completed successfully for tested head `a14ba185795b8880973d800b3b43e15ca7b3099e`; both `Verify` and `Database and auth integration` completed successfully, including clean install, lint, typecheck, unit/component tests, production build, Chromium installation, local Supabase startup, environment generation, migration/seed replay, pgTAP and Auth/profile browser integration.
- **Merge evidence:** PR #6 was merged by exact-head match from `agent/ph02-auth-profile` into `main`; resulting merge commit `c5970dcb992ef385d57376e5fc5f5e30c118fb1f` was fetched and local `main` was fast-forwarded to the same SHA.
- **Operational-reference integration:** supplied `MEEXERCISE_FUTURE_INSTANCE_CHEATSHEET.md` was copied byte-for-byte to `project_docs/DEVELOPMENT_CHEATSHEET.md` (SHA-256 `2ecaf5f24527f7407e2918ebde2dece9f7f9a8674dd5053f0168e9f33c5419ad`) and routed from `AGENTS.md`, `PROJECT_INDEX.md` and `REPOSITORY_AND_RELEASE.md` as non-canonical history.
- **Integrity boundary:** the reference is intentionally excluded from `PACK_MANIFEST.json` and intentionally preserves the supplied source bytes, including inherited Markdown whitespace. Canonical changed governance/manifest files must pass diff-hygiene checks; reference integrity is verified by exact source/destination SHA-256 equality. `PROJECT_SETTINGS.md` is unchanged and remains below 8000 characters.
- **Evidence boundary:** this record proves PR #6 remote CI/merge publication and documentation integration only. PH-02 remains in progress; password recovery end-to-end, account deletion, assessment save/resume/safety, export/correction/deletion lifecycle, complete negative cross-user application-authorisation coverage, remote Supabase production configuration and release behaviour remain unproven.

### `BR-20260818-04`
- **Mode/scope:** PH-02 readiness-assessment save/resume/safety implementation and isolated local runtime verification; partial `REQ-004`, `REQ-005`, `REQ-006`, `REQ-007`; partial `AC-001`, `AC-002`, `AC-003`; `VAL-025` with supporting `VAL-032`, `VAL-034`, `VAL-036`.
- **Implemented:** versioned `/profile/assessment` flow; start/save/reload-resume/complete server actions; bounded readiness-response validation; optimistic session `row_version` conflict protection; updated published synthetic readiness template definition; immutable `assessment_safety_flags`; database-derived `restrict_generation` and `block_generation` outcomes; profile entry point; accessible native form controls; unit, pgTAP and authenticated Playwright coverage.
- **Safety boundary:** movement limitations derive a later-generation restriction; anything other than explicit independent-exercise `yes` plus professional-restriction `no` derives a block-generation/professional-input recommendation. Missing/uncertain readiness therefore fails closed. Flags do not diagnose, treat, certify medical safety or provide medical clearance. PH-04 generator consumption of these flags is not yet implemented, so `AC-003` remains only partially proven.
- **Static/regression evidence:** implementation continuation V3 completed with the exact 14-file source scope and `npm run verify` passed. This establishes the configured lint, TypeScript, Vitest, production-build and ordinary Playwright regression boundary only.
- **Runtime/database evidence:** assessment runtime verification V1 used project-local Supabase CLI `2.114.0`; external IPv4/IPv6 default-route isolation was verified during database/browser checks; local database reset replayed migrations plus synthetic seed; the repository pgTAP suite passed; authenticated Auth/profile/assessment browser integration passed; source integrity passed after cleanup; local Supabase was stopped and local environment/network state restored by the verification harness.
- **Persistence/history evidence:** users can save incomplete assessment state and reload/resume it; completion binds the session to its immutable template version and completed history cannot be rewritten by the application/database path. Derived safety flags are immutable and readable only through the owning authenticated user boundary.
- **Evidence boundary:** this record does not prove full onboarding (`AC-001`), interruption across every onboarding step (`AC-002`), later routine-generation enforcement of the safety flags (`AC-003`), password-recovery delivery/update, account deletion, export/correction/deletion lifecycle, complete negative cross-user application-authorisation coverage, remote Supabase, production region/hosting or production release behaviour. PH-02 remains in progress.
### `BR-20260818-05`
- **Mode/scope:** PH-02 readable user-data export and permanent account-deletion implementation with isolated local runtime verification; partial `REQ-001`, partial `REQ-038`, partial `AC-028`; `VAL-033` with supporting `VAL-024`, `VAL-034`, `VAL-036`.
- **Implemented:** authenticated `/profile/account` data/privacy controls; authenticated no-store `/profile/export` JSON response; export of account identifier/email, current private profile, assessment responses, derived safety flags and referenced assessment template/version definition; current-password re-authentication; exact `DELETE MY ACCOUNT` confirmation; server-only Supabase admin client; permanent Auth-user deletion; visible post-delete sign-in state; unit, pgTAP and authenticated Playwright coverage.
- **Privileged-secret boundary:** local Supabase CLI `SERVICE_ROLE_KEY` is written only to ignored `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`. Runtime verification confirmed no `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` boundary and did not print the secret value. The admin client is server-only.
- **Static/regression evidence:** the exact 16-file source slice passed `npm run verify`, covering configured lint, TypeScript, Vitest, production build and ordinary Playwright regression checks.
- **Runtime/database evidence:** data-lifecycle runtime verification V1 used project-local Supabase CLI `2.114.0`; external IPv4/IPv6 default routes were disabled during database/browser checks; local database reset passed; the complete repository pgTAP suite passed including Auth-user cascade deletion of profile/session/safety-flag records; all authenticated Auth/profile/assessment/export/delete browser tests passed; source integrity passed after cleanup and local environment/network state was restored.
- **Export evidence:** the browser test downloaded `meexercise-data-export.json` and asserted account email, private display name, one readiness assessment, its version key, self-reported limitation response and derived movement-restriction safety flag. This proves readable export for the user-owned record types implemented as of this slice, not future PH-03+ data that does not yet exist.
- **Deletion evidence:** the browser test rejected an incorrect current password, accepted the correct password plus exact destructive phrase, returned the user to a deletion-confirmed sign-in surface and rejected sign-in using the deleted credentials. Database tests prove current MeExercise profile, assessment-session and assessment-safety-flag rows cascade when the Auth user is deleted.
- **Evidence boundary:** this record does not establish jurisdiction-specific retention exceptions/obligations, production privileged-secret handling, generic correction beyond currently editable profile fields, future-domain export coverage, password-recovery delivery/update, complete negative cross-user application-authorisation coverage, remote Supabase, production hosting/region or release behavior. `REQ-038` and PH-02 therefore remain partial/in progress.
### `BR-20260819-01`
- **Mode/scope:** PH-02 password-recovery implementation and isolated local runtime verification; partial `REQ-001`; `VAL-024` with supporting `VAL-033` and `VAL-036`.
- **Implemented:** version-controlled Supabase recovery-email template; server-side `/auth/callback` handling for recovery `token_hash`/`type=recovery`; response-bound Auth cookie mutation; canonical-site-URL redirect handling; existing authenticated password-update action; focused Mailpit-backed password-recovery Playwright coverage.
- **Static/regression evidence:** on `agent/ph02-password-recovery` at base `8cb0719c030508a82d2eabd6c342c3966268a0c4`, V9 verified the exact four-file source/config scope and `npm run verify` passed, covering configured ESLint, TypeScript, Vitest, Next.js production build and the ordinary Chromium Playwright suite. ESLint reported two existing unused-parameter warnings in `src/app/profile/assessment/actions.ts` and no errors.
- **Runtime/database evidence:** the local Supabase stack ran with active external IPv4/IPv6 default routes disabled; the local API/database/Mailpit endpoints remained reachable; `supabase db reset` replayed repository migrations/seed; the complete pgTAP repository suite passed (`Files=3`, `Tests=40`, `Result: PASS`); the dedicated authenticated Chromium suite passed all four flows after the final test-harness correction; local Supabase was stopped and the pre-existing `.env.local` plus network adapters were restored.
- **Recovery evidence:** the browser requested a reset without account-enumerating success text, captured the real local Auth recovery email through Mailpit, followed its token-hash recovery callback, remained on the configured `127.0.0.1:3000` application origin, reached the password-update form only with the recovery session, updated the password, reached `/profile`, signed out, observed rejection of the original password and then successfully signed in with the replacement password.
- **Failure-to-pass evidence:** early verification exposed an ES-target-incompatible test regex, a default recovery-link/SSR session handoff gap, request-origin drift from `127.0.0.1` to `localhost`, and a final Playwright retry bug caused by React Action reset of uncontrolled form fields. The final verified slice uses an ES-compatible parser, version-controlled token-hash template, server recovery verification with response-bound cookies, configured canonical-site redirects, and refills required sign-in fields after the deliberate old-password failure.
- **Evidence boundary:** this record proves local captured-email password recovery/update against the pinned local Supabase stack. It does not prove production SMTP/provider/domain deliverability, production hosting/region, broader negative application-layer authorisation, generic correction/retention obligations, remote Supabase or production release behaviour. PH-02 remains in progress.
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
