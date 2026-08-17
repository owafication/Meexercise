# Repository and Release

**Status:** Repository baseline and PH-01 local toolchain verified; deployment/release target unresolved  
**Intended repository:** `owafication/Meexercise`

## Repository baseline
At PH-00 inspect and record the actual root, default branch, remotes, history, ignore rules and working tree before mutation. Do not infer those facts from this pack or from an old conversation.

## Verified repository baseline

`BR-20260817-02` records the PH-00 repository execution completed on 2026-08-17. Local PowerShell evidence showed `C:\Apps\Meexercise` clean on `main`, tracking `origin/main` at `0f3db2b5abda7f4fea6315baa01218dade562caa`. Independent GitHub inspection verified `refs/heads/main` at that same commit.

The initial commit contains the canonical v0.2.0 governance plus `.gitattributes` for deterministic LF handling. Governance manifest byte/SHA checks passed before publication. Application framework, dependencies, build, runtime and deployment remain `Unproven`.

## Canonical governance location

Canonical governance is stored in the tracked repository root and `project_docs/` according to `project_docs/PROJECT_INDEX.md`. Detached/versioned source-pack directories are non-canonical after repository integration and should not remain as competing working sources.

A temporary source-pack copy may be removed only after its replacement governance is committed, remotely merged, and local `main` is synchronized. Removing such a duplicate does not remove canonical governance or Git history.

## Working model
For solo/agent work, coherent direct commits can be technically valid, but the proposed default for non-trivial agent changes is a short `agent/<task>` branch plus draft pull request because it provides review and rollback without a heavy branch taxonomy. Do not create long-lived develop/release branches without a release-support requirement.

Review the diff and staged file list before commit. Never stage unrelated user work. Commit messages describe one coherent reversible change.

## Minimal repository files
Use only ecosystem-required build/manifest files plus source, lock/integrity record where the selected package manager expects one, `.gitignore` for real generated/local files, README, and this governance. Add formatter/linter/test/CI/deployment configs only when the selected tools require them or the project has an enforced rule.

## Dependency adoption
Before adding a dependency, record when material:
- capability not adequately covered by current platform/framework;
- direct/transitive packages and privileges;
- maintenance/security support;
- licence/distribution compatibility;
- bundle/runtime/network/cost impact;
- portability/exit cost;
- simpler alternative and removal trigger.

Do not reimplement specialist security/protocol/standards-heavy functionality merely to reduce package count.

## Configuration/secrets
Hard-code invariants. Use build/runtime config for demonstrated environment variation. Store user preferences as user state. Use feature flags only for a real rollout/kill-switch/experiment variant, with owner/removal trigger. Secrets never enter source control or public build artefacts.

## CI
Minimal CI becomes justified after a reproducible scaffold exists and remote validation reduces real risk. Start with clean dependency install/restore, build/type/static checks, and fast deterministic tests actually owned by the repository. Add browser/integration/security/release jobs only when their failure boundary exists. No CI infrastructure is required for this documentation-only pack.

## Versioning and releases
Do not invent an application version or semantic-versioning contract before application/release tooling is selected. Tag/release identifiers should point to a known revision once distribution begins. Generated artefacts belong in release/artifact storage unless the repository itself is their distribution mechanism.

## Hosting/deployment
Web hosting, database, auth, object storage, email, analytics, payments and AI providers are unresolved. Select providers from requirements, privacy/security, operational capability, recurring cost and exit implications. Containers, orchestration, multi-region deployment, autoscaling and permanent staging are premature until a concrete deployment requirement exists.

## Data operations before real users
Before irreplaceable shared data becomes production-dependent:
- establish backup/recovery objective appropriate to consequence;
- demonstrate restore for the supported persistence mechanism;
- define migration procedure and rollback/recovery;
- define data retention/deletion execution;
- protect production credentials and least-privilege access;
- define an incident/support contact/process proportional to exposure.

Replication is not a substitute for recovery from logically valid deletion/corruption.

## Release gate
A release is accepted only from cumulative evidence for its declared scope. Failed mandatory checks block only the claims they govern; unavailable checks leave those claims `Unproven`. Rollback/recovery must preserve user-owned data and historical semantic versions.
