# Decisions and History

**Status:** Proposed canonical decision/history owner

## Legacy ID preservation
The prior MeExercise index declared `DEC-001`–`DEC-012`, but the original decision definitions were not among the supplied source files available for this revision. Those IDs are **legacy-reserved and must not be reused**. Product outcomes that are independently supported by the current user decisions are restated below under new IDs rather than guessing the old records.

## Current decisions
| ID | Status | Decision | Rationale / trigger |
|---|---|---|---|
| `DEC-013` | Accepted | MeExercise is delivered as a web application with responsive mobile/tablet/desktop/print support. | Explicit user direction; avoids maintaining separate native apps at baseline. |
| `DEC-014` | Accepted | The free product includes advanced routine generation, detailed progression, advanced reports, unlimited plans/templates, enhanced print packs, general meal planning, advanced scheduling and cross-device features when those phases ship. | Explicit user commercial decision. |
| `DEC-015` | Accepted | Initial professional capability is professionally authored general-wellness programs; direct professional-to-user management is later. | Explicit user acceptance; reduces premature access/privacy/clinical complexity. |
| `DEC-016` | Proposed default | Start as one modular monolith; split deployables only for proven independent scale/deployment/security/failure/ownership needs. | Minimum justified complexity. |
| `DEC-017` | Proposed default | Cross-device records are server-authoritative; do not implement full offline-first multi-master sync unless disconnected mutation is required. | Shared durable data is required; offline-first conflict machinery is not yet. |
| `DEC-018` | Proposed default | Advanced routine generation initially uses approved structured content plus deterministic constraints; runtime AI is optional later. | Meets current outcome while keeping safety rules testable and avoiding premature AI infrastructure. |
| `DEC-019` | Proposed default | Nutrition is a separate module/domain sharing identity, scheduling and other stable primitives, not exercise tables. | Prevents future schema/logic contradiction while avoiding a separate service. |
| `DEC-020` | Proposed default | Introduce executable entitlement logic only when premium capability activates; keep the boundary defined now but do not scatter placeholder checks. | Avoids speculative flags while protecting future data ownership. |
| `DEC-021` | Superseded by `DEC-024` | Use a relational server datastore as the leading persistence candidate, but select engine/provider only after the web stack/deployment constraints are inspected. | Superseded after PH-01 established the web stack and PH-02 requirements justified an actual provider selection. |
| `DEC-022` | Proposed | PWA installation/offline capabilities are conditional enhancements, not a release claim until implemented and validated. | A web app does not automatically require PWA/offline machinery. |
| `DEC-023` | Accepted | Use Next.js App Router with TypeScript and npm on Node.js 24 LTS for the application baseline. | PH-01 requires a responsive full-stack-capable web shell; this fits the accepted single-deployable modular-monolith direction without adding a separate client/server framework split or extra package-manager abstraction. |
| `DEC-024` | Accepted | Use Supabase Auth plus Supabase PostgreSQL for the PH-02 identity/persistence baseline. Develop local-first with version-controlled migrations; defer production web hosting and the production Supabase project/data region until release/deployment readiness. | One maintained provider covers auth and relational persistence while retaining PostgreSQL schema portability. Deferring the production region avoids premature infrastructure lock-in; real sensitive user data is prohibited from shared remote environments until that region/privacy decision is accepted. |
| `DEC-025` | Accepted | PH-02 correction preserves completed assessment history by creating a linked successor on the same template version rather than rewriting the completed record. Current profile/in-progress assessment data remains editable. Account email correction requires current-password re-authentication plus new-address confirmation. Permanent account deletion removes current PH-02 primary records; production backup/legal retention exceptions are deferred to PH-10. | Satisfies the current `REQ-038` correction/deletion contract while preserving historical meaning and avoiding an invented production retention period before distribution, jurisdiction and hosting decisions exist. |

## Decision required
- Meal-planning release timing: first public release vs later pre-v1 free phase. This does not change that meal planning is free when delivered.
- Production web-hosting provider and production Supabase project/data region are intentionally deferred until PH-10 release/deployment readiness; they must be selected before public release or real sensitive user data enters shared production infrastructure.
- Jurisdictions/distribution footprint and resulting privacy/legal requirements before public release; these inform the production hosting/data-region decision.

## Research basis for v0.2.0
The supplied research was used as engineering evidence, not copied as universal law:
- application taxonomy/architecture/dependency-aware order;
- smallest reliable repository foundations;
- build planning and coding-agent workflow;
- UI/UX, accessibility and client state;
- data/persistence/API/auth/backend design;
- proportional security/privacy safeguards;
- quality/testing/performance/resilience;
- dependencies/config/source control/CI/release/operations/licensing;
- AI architecture and AI mechanism/anti-bloat guidance.

The common conclusion adopted here is: mechanisms are justified by actual requirements/failure modes and should have explicit deferral triggers; controls required for current correctness, security, privacy, accessibility or data integrity are not removed merely for simplicity.

## Governance history
| Record | Date | Mode | Result |
|---|---|---|---|
| `BR-20260805-01` | 2026-08-05 | Historical file generation | Prior v0.1 governance foundation; repository integration remained unproven in supplied material. |
| `BR-20260817-01` | 2026-08-17 | File generation | v0.2 governance rewritten/consolidated against new project settings and ten supplied engineering research files. No application code or repository command executed. |
| `BR-20260817-02` | 2026-08-17 | Repository execution | PH-00 governance integration completed. Local `main` was clean and tracking `origin/main`; GitHub `main` was independently verified at `0f3db2b5abda7f4fea6315baa01218dade562caa`. Application implementation remains unproven. |
| `BR-20260817-03` | 2026-08-17 | Governance path canonicalization | Canonical governance paths corrected to the tracked repository root plus `project_docs/`; the detached `Meexercise-governance-v0.2.0` source-pack directory was designated non-canonical and eligible for removal only after verified merge/synchronization. |
| `BR-20260817-04` | 2026-08-17 | Application implementation | PH-01 shell implemented on `agent/ph01-shell`; selected toolchain and shell routes recorded; local lint/typecheck/unit/build/Chromium accessibility validation passed. Remote CI/publication remains separately observable through the PR. |
| `BR-20260817-05` | 2026-08-17 | PH-02 architecture decision | Accepted Supabase Auth/PostgreSQL for identity/persistence and changed the deployment gate so production hosting/data region is selected at release readiness rather than blocking application construction. No PH-02 runtime implementation or production infrastructure is claimed by this governance change. |
| `BR-20260819-03` | 2026-08-19 | PH-02 data-correction implementation | Locally verified linked immutable-history correction, export v2 correction linkage, current-password/new-address-confirmed account-email correction and primary-record cascade deletion. Final remote CI/merge and canonical phase closure remain separate evidence. |
| `BR-20260819-04` | 2026-08-19 | PH-02 phase closure | Exact-head GitHub Actions run #19 completed successfully after an infrastructure-only Chromium-install cancellation/retry; PR #12 merged as `3a6c24c97f98df374f4b9ecd6ff59e826acecb07`; PH-02 current identity/private-data foundation is Passed / Verified while production/legal/release gates remain deferred. |
| `BR-20260820-01` | 2026-08-20 | PH-03 exercise-content implementation | First exercise-content slice locally verified: stable/versioned structured content, publication-state visibility, finalised-content/relationship immutability and read-only exercise library/detail UI. Synthetic content is test-only; `REQ-012`, remote exact-head CI/merge and broader PH-03 editorial completion remain unproven. |
| `BR-20260820-02` | 2026-08-20 | PH-03 acceptance-semantics implementation | First slice independently published/merged; second slice locally verifies multi-version latest/exact reads, all relation types, side rules and withdrawal fallback. PH-03 implementation is locally complete; final exact-head CI/merge and canonical closure remain separate. Production catalogue population/review is retained as an activation/release content gate. |
| `BR-20260820-03` | 2026-08-20 | PH-03 phase closure | Exact-head GitHub Actions run #25 passed both required jobs for final feature head `a4ac5905dfc558707cdb3b36e3d4ca97ee2bd1fc`; PR #15 merged as `acf82f7cc0548aa064772f105b7c7037018ca543`; PH-03 exercise-content library scope is Passed / Verified while production catalogue review, `REQ-012` routine retention and release gates remain later work. |

## Governance change procedure
1. Identify the canonical owner and affected IDs.
2. Inspect current repository/evidence before changing implementation claims.
3. Record a decision only for consequential scope/contract/data/access/architecture/release choices.
4. Update each definition once; link elsewhere.
5. Update index/traceability/status only where truth changed.
6. Record verification and rollback/recovery evidence for repository work.
