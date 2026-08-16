# Debugging and Maintenance

**Status:** Proposed operational guidance  
**Owner:** Diagnostic order, maintenance triggers, simplification and support boundaries

## Debugging order
Start at the user-visible failure and follow authority inward rather than adding logging or abstractions first:
1. exact route/user/action and expected acceptance criterion;
2. browser/client state and visible error/recovery state;
3. request/server boundary and authenticated principal/ownership decision;
4. authoritative record/version/concurrency state;
5. owning domain invariant or generation rule;
6. integration/provider boundary if actually involved;
7. migration/config/version mismatch;
8. performance/resource issue only after correctness path is known.

Use existing logs/tests/traces before adding new instrumentation. Never enable raw health/wellness payload logging as a debugging shortcut.

## Failure classes
- **Generation:** constraint, content-version, substitution or safety-rule mismatch.
- **Data:** stale version, lost-update conflict, migration, missing history, bad derived projection.
- **Auth:** session/account recovery, ownership/role denial, professional-content permission.
- **UI:** navigation/state loss, validation/focus/accessibility, print mismatch.
- **Sync:** retry/idempotency/reconnect/conflict resolution.
- **Meal:** allergen/exclusion/unit/shopping-list projection.
- **Provider:** hosting/database/auth/payment/integration outage or contract drift.

## Maintenance triggers
Add/change a mechanism only when its trigger appears, for example:
- cache: measured read/compute cost violates target;
- retry: observed transient failure and operation is safe/idempotent;
- queue/worker: work cannot safely finish within interactive request/lifecycle budget;
- global client store: many distant writers/readers of genuinely client-owned state become hard to reason about;
- design system/package: repeated accessible component fixes must propagate across independent surfaces;
- external API: independent consumer/deployment compatibility becomes a real contract;
- microservice: independent deployment/scale/failure/ownership value exceeds distributed-system cost;
- RAG/memory/agent: evaluation shows the simpler AI/non-AI path cannot meet the use case.

## Simplification/deletion checklist
Before deleting/refactoring a mechanism:
1. search direct/indirect callers and framework/reflection/config consumers;
2. check API/integration/public compatibility;
3. check persisted schemas/data/history/migrations;
4. check tests/fixtures and release scripts;
5. check runtime/operational evidence if available;
6. preserve rollback when consequence is material.

Delete dead code/config/flags once evidence shows no consumer and removal preserves contracts. Do not use a feature flag solely to remove low-risk local dead code.

## Dependency maintenance
Keep the dependency set necessary and attributable. Follow ecosystem lock/integrity semantics. Prioritise supported/current versions when changing dependencies, but do not perform broad upgrade churn unrelated to the task unless vulnerability/support evidence requires it.

## Data/content maintenance
- Assessment/exercise/program/recipe schema changes use managed versioning/migration.
- Withdrawn professional content remains identifiable in historical plans.
- Content review dates/verification status must not be silently advanced.
- Reports derived from history may be regenerated; historical user-entered facts may not be rewritten to match a newer model.

## Support/observability
Begin with actionable application errors plus minimal redacted operational logs. Add metrics/tracing only where an operator can act on them or a recurring diagnosis problem exists. If runtime AI is later used, record model/schema/version/latency/token/outcome metadata as needed without default storage of sensitive prompt/response bodies.

## Recovery
For destructive data changes, deployments and migrations, recovery is part of the change. A backup that has not been restored does not prove recoverability. Release rollback must consider schema/data compatibility, not only source rollback.
