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
| `DEC-021` | Proposed default | Use a relational server datastore as the leading persistence candidate, but select engine/provider only after the web stack/deployment constraints are inspected. | Versioned relational data/transactions are likely useful; provider choice is premature. |
| `DEC-022` | Proposed | PWA installation/offline capabilities are conditional enhancements, not a release claim until implemented and validated. | A web app does not automatically require PWA/offline machinery. |

## Decision required
- Meal-planning release timing: first public release vs later pre-v1 free phase. This does not change that meal planning is free when delivered.
- Actual framework, package manager, database, authentication, hosting and deployment providers after repository/tooling inspection.
- Jurisdictions/distribution footprint and resulting privacy/legal requirements before public release.

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

## Governance change procedure
1. Identify the canonical owner and affected IDs.
2. Inspect current repository/evidence before changing implementation claims.
3. Record a decision only for consequential scope/contract/data/access/architecture/release choices.
4. Update each definition once; link elsewhere.
5. Update index/traceability/status only where truth changed.
6. Record verification and rollback/recovery evidence for repository work.
