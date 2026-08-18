# MeExercise — Future-Instance Development Cheat Sheet

**Purpose:** Durable operational reference for future ChatGPT instances continuing MeExercise through chat.  
**Status:** Reference/hand-off document, not a canonical replacement for repository governance.  
**Compiled:** 2026-08-18 from the visible/recovered MeExercise chat history, returned PowerShell/build/test evidence, current GitHub evidence, and supplied governance files.  
**Rule:** If this sheet conflicts with current local evidence, current GitHub, or canonical governance, this sheet loses.

---

## 1. Read this first

This project is developed **entirely through ChatGPT chat**.

ChatGPT is expected to:
- inspect evidence;
- design the change;
- write code, tests, migrations, config, docs, and governance;
- generate complete files, patches, ZIPs, or PowerShell scripts;
- diagnose failures from returned evidence;
- provide corrected complete artefacts rather than delegating debugging/manual editing.

The user is expected to:
- run supplied Windows PowerShell/Git/build/test commands on the laptop when local evidence is needed;
- return the output.

Do **not** hand coding/debugging back to the user when ChatGPT can generate the fix.

### Canonical project locations

- Repository: `C:\Apps\Meexercise\`
- Canonical governance root: `C:\Apps\Meexercise\`
- Canonical governance docs: `C:\Apps\Meexercise\project_docs\`
- GitHub: `owafication/Meexercise`
- Default branch: `main`

### Important stale-source warning

Older detached/uploaded source-pack copies may contain stale paths or architecture statements.

Example encountered:
- an older uploaded `PROJECT_SETTINGS.md` still named `C:\Apps\Meexercise\Meexercise-governance-v0.2.0\`;
- current GitHub `PROJECT_SETTINGS.md` names the repository root and `project_docs\` as canonical.

**Future rule:** current local PowerShell evidence > current GitHub > current canonical governance > accepted decisions > detached uploads/old chat.

Never treat `/mnt/data` source-pack copies as canonical merely because they are available.

---

## 2. Authority and evidence language

Use this authority order:

1. system/platform requirements;
2. applicable safety/privacy/legal/contract/distribution requirements;
3. current user objective and accepted decisions;
4. current GitHub, supplied-file, PowerShell, build, test, and runtime evidence;
5. canonical governance;
6. accepted plans/decisions;
7. older chat/context.

Local PowerShell evidence outranks stale GitHub for unpushed work.  
Current GitHub inspection outranks remembered remote state.

Use these labels when material:

- `Observation` — directly seen fact.
- `Assumption` — temporary assumption, explicitly identified.
- `Inference` — derived from evidence but not directly observed.
- `Proposed` — suggested change only.
- `Implemented` — source/config exists in the inspected working state.
- `Ran` — command was actually executed and output was returned/inspected.
- `Passed` — that specific check passed.
- `Failed` — that specific check failed.
- `Skipped` — deliberately not run.
- `Verified` — evidence was inspected against the declared contract.
- `Unproven` — not established by available evidence.

### Never collapse evidence boundaries

Do not equate:
- generated code with locally applied code;
- inspection with successful build;
- build with runtime;
- unit tests with integration;
- mocks with a real boundary;
- local success with GitHub state;
- PR checks with deployment;
- pushed code with merged code;
- merged code with deployed behavior.

A supplied command is **not `Ran`** until the user returns execution evidence.

---

## 3. Mandatory reading/routing sequence

Before non-trivial work:

1. read `/AGENTS.md`;
2. read `project_docs/PROJECT_INDEX.md`;
3. identify affected `PH`, `REQ`, `AC`, contracts, and risks;
4. load only mapped canonical governance;
5. inspect affected code, consumers, tests, manifests, schemas, config, and persisted contracts;
6. expand only for dependencies, conflicts, or evidence gaps.

Trace substantial changes:

`REQ → scope → architecture/contract → PH/slice → files/surfaces → AC → VAL → evidence`

Do not bulk-read governance by habit. Route through the index.

---

## 4. Product invariants that must survive implementation

- MeExercise is self-directed **general wellness**, not diagnosis, treatment, rehabilitation, prognosis, clinical decision support, or medical monitoring.
- Ordinary general-wellness functionality remains free.
- Premium may add specialist expertise/services/integrations, not ownership of user data.
- Professionally authored general-wellness programs precede direct professional-to-user management.
- Direct professional access to user records requires a separate approved consent/permission/audit design.
- Historical assessments, exercises, routines/plans, recipes, and completed sessions preserve required versions.
- Cross-device authoritative data must not silently lose conflicting edits.
- Meal planning remains bounded and non-clinical.
- Runtime AI is optional.
- Deterministic validated rules over approved structured content remain the baseline for routine generation.
- Wellness/health-related data is sensitive.
- Do not put sensitive wellness values, secrets, or private user content in normal logs/analytics/source control.

---

## 5. Default implementation philosophy

Use the minimum justified complexity:

`requirement → failure/risk → applicability → existing coverage → simpler option → cost → timing → trigger`

Prefer:
- one modular monolith;
- framework/platform primitives;
- direct Next.js/Supabase mechanisms;
- small dependency-aware slices;
- explicit ownership/concurrency/versioning where correctness requires it.

Do not add without a demonstrated trigger:
- microservices;
- Kubernetes/containers as application architecture;
- queues/workers/event buses;
- DI containers/registries;
- unnecessary repositories/services/DTO layers;
- global client state;
- caching;
- retries;
- feature flags;
- excessive telemetry;
- provider abstractions;
- RAG/vector DBs;
- long-term AI memory;
- multi-agent systems.

Local Supabase using Docker is a **development dependency**, not evidence that the app should be containerized.

---

## 6. User-specific delivery rules

These rules came from repeated friction and explicit user preference.

### Always provide complete corrected scripts

If a PowerShell script needs correction:
- provide the **entire corrected script**;
- do not tell the user to find/replace lines manually;
- do not provide a partial control-flow fragment that depends on prior shell state.

Prefer downloadable `.ps1` files.

### Always state execution method

Use one of these explicit labels:

- **RIGHT-CLICK ONCE TO RUN THE WHOLE BLOCK IMMEDIATELY**
- **COPY/PASTE THE BLOCK, THEN PRESS ENTER**
- **SAVE AS `.ps1` AND RUN IT**

For long or stateful workflows, prefer **SAVE AS `.ps1` AND RUN IT**.

### Script location

Helper/temporary `.ps1` files should normally live **outside the repository**, e.g.:

`$env:LOCALAPPDATA\Temp\...`

unless the script is intentionally repository-owned.

### PowerShell baseline

Use **Windows PowerShell 5.1**, not Bash and not PS7-only syntax, unless repository evidence explicitly changes this.

Every local command/script begins conceptually from:

```powershell
Set-Location 'C:\Apps\Meexercise'
```

Use explicit paths.

---

## 7. Windows PowerShell 5.1 rules learned the hard way

### 7.1 Multiline paste/control-flow

Raw pasted `if / elseif / else` can break because right-click paste may submit statements before the full chain is present.

Failure seen:
- `elseif` or `else` became a new command;
- PowerShell reported it was not recognized.

Fix:
- use a saved `.ps1`;
- or wrap the entire block in `& { ... }`;
- never split control-flow across separate submissions.

### 7.2 Do not use newline method chaining

PowerShell 5.1 does not safely accept patterns like:

```powershell
$Value
    .Replace(...)
```

Use sequential assignments:

```powershell
$Value = $Value.Replace(...)
$Value = $Value.Replace(...)
```

### 7.3 Interpolation before a colon

Prefer:

```powershell
"${Label}: value"
```

not ambiguous `$Label:` interpolation.

### 7.4 Native command stderr + `$ErrorActionPreference = 'Stop'`

Expected native stderr can become a terminating `NativeCommandError` in Windows PowerShell.

For native commands where stderr is expected:
- temporarily use `$ErrorActionPreference = 'Continue'`;
- inspect `$LASTEXITCODE`;
- restore the prior preference.

Do not infer failure only from stderr text.

### 7.5 Branch existence

Use:

```powershell
git show-ref --verify --quiet "refs/heads/<branch>"
$LASTEXITCODE
```

Do not rely on text parsing when an exit code is authoritative.

### 7.6 Scalar/array unrolling

PowerShell can collapse a one-item result to a scalar.

When indexing helper output, capture explicitly as an array:

```powershell
$Items = @(Get-Something)
```

### 7.7 JSON empty-array/null edge case

`@(... | ConvertFrom-Json)` around JSON `[]` can produce surprising/null elements depending on the surrounding expression.

Filter `$null` explicitly before counting/iterating.

### 7.8 Generic collections

PowerShell/.NET generic collection use caused `Argument types do not match` in earlier scripts.

Prefer native PowerShell:
- arrays;
- hashtables;
- `[pscustomobject]`.

Use generic collections only when evidence shows they are needed.

### 7.9 UTF-8

For downloadable PowerShell 5.1 scripts containing non-ASCII text, write UTF-8 **with BOM**.

Avoid exact non-ASCII string matching when semantic/ASCII matching is sufficient.

### 7.10 No mid-script `Read-Host`

Avoid scripts that pause for interactive input midway through an automated verification path.

Resolve known choices before generation or create deterministic defaults.

### 7.11 Do not casually call `wsl --status`

Earlier use risked triggering WSL installation/setup behavior.

First establish whether WSL exists and is intentionally part of the task.

---

## 8. Git/GitHub rules

### Branch model

For non-trivial work:

`agent/<task>`

Prefer a draft PR against `main`.

### Before mutation

Inspect:
- current branch;
- `HEAD`;
- `origin/main`;
- working tree;
- untracked files;
- relevant remote state.

### Before commit

Run:
- `git status`;
- intended diff;
- exact staged file list;
- `git diff --check`;
- applicable verification.

Do not stage unrelated work.

### Git pager

Long diffs previously entered pager `(END)`.

Use:

```powershell
git --no-pager diff
```

or:

```powershell
$env:GIT_PAGER = 'cat'
```

If already in pager, press `q` (no Enter).

### `gh` CLI specifics learned

Known local version during this work:
- `gh 2.97.0`
- authenticated as `owafication`
- token scopes observed: `gist`, `read:org`, `repo`, `workflow`

Do not assume current version later; re-check.

Pitfalls:
- `gh pr view --repo ...` still needs a PR number, URL, or branch.
- `gh pr diff --stat` is not supported.
- Use `gh pr checks <number> --repo ...` for gate evidence.
- Use `gh pr ready <number> --repo ...` for draft→ready.
- Guard merge with the exact expected head SHA when possible.
- After merge, verify GitHub merge SHA, `origin/main`, and local `main`.

### GitHub connector permission lesson

The connected GitHub app could:
- inspect PRs;
- inspect files/diffs;
- inspect Actions.

It returned `403 Resource not accessible by integration` for some writes:
- PR body update;
- mark ready;
- merge.

This was a **connector permission limitation**, not proof the repository/user lacked permission.

Fallback used successfully:
- the user's authenticated local `gh` CLI.

Do not repeatedly retry connector writes after a clear 403.

---

## 9. Line-ending and manifest rules

### `.gitattributes`

At the relevant repository state, LF was explicitly enforced only for:

- `/AGENTS.md`
- `/PROJECT_SETTINGS.md`
- `/README.md`
- `/REVISION_AUDIT.md`
- `/PACK_MANIFEST.json`
- `/project_docs/*.md`

It did **not** force LF for `.github/workflows/*.yml`.

Therefore this warning was non-fatal:

`LF will be replaced by CRLF the next time Git touches it`

Do not broaden `.gitattributes` just to silence a warning unless there is a real requirement.

### Markdown trailing spaces

Canonical Markdown may intentionally use two trailing spaces for line breaks.

Do not blanket-trim/normalize Markdown.

### Manifest integrity

A prior governance pass left stale byte/SHA entries in `PACK_MANIFEST.json`.

Fix that worked:
1. finalize canonical content;
2. recompute exact bytes/SHA-256;
3. update manifest;
4. verify manifest against files;
5. review staged scope.

Do not edit manifest-governed files after computing their hashes without regenerating the manifest.

---

## 10. Governance hygiene incidents

### Stale manifest entries

`PROJECT_SETTINGS.md` / `REVISION_AUDIT.md` manifest entries had to be repaired before PH-00 integrity verification passed.

**Rule:** manifest verification is an explicit gate, not a ceremonial file.

### Duplicate build-record ID

During PH-02 pre-commit finalization, `BR-20260817-03` appeared twice in validation/history content.

Fix:
- exact record-count checks;
- remove duplicate;
- re-run hygiene.

### Accidental formatting regression

A finalization pass removed desired backticks around BR IDs in `PROJECT_INDEX.md`.

Fix:
- targeted semantic checks before commit;
- restore canonical formatting;
- do not blanket-normalize Markdown.

### PR-body formatting glitch

A PowerShell-generated PR description rendered intended ``npm run verify`` text incorrectly (`\npm run verify`-style defect).

This was cosmetic and did not justify another code commit.

The connector could not edit the body due 403.

**Rule:** separate PR metadata defects from repository-source defects. Do not churn source history for harmless PR-body formatting.

---

## 11. Front-end/toolchain lessons

### PH-01 stack snapshot

At the verified shell stage:

- Node `24.18.0`
- npm `11.16.0`
- Next.js `16.3.1`
- React / React DOM `19.2.8`
- TypeScript `5.9.3`
- Vitest `4.1.10`
- Playwright `1.62.1`

These are historical snapshot values. Re-inspect before future dependency changes.

### Vitest accidentally collected Playwright tests

Failure:
- default Vitest discovery picked up `e2e/shell.spec.ts`.

Fix:
- restrict Vitest test inclusion to source unit/component test patterns;
- keep E2E files owned exclusively by Playwright.

**Rule:** test runners must have non-overlapping ownership.

### Existing shell GUI

Verified shell routes:
- `/` — Today
- `/plans`
- `/create`
- `/progress`
- `/profile`

The GUI is a Next.js web app.

Development server:

```powershell
Set-Location 'C:\Apps\Meexercise'
npm run dev
```

then browse:

`http://127.0.0.1:3000`

Auth/profile screens being added in PH-02 require a running local Supabase stack plus ignored local env configuration.

---

## 12. Supabase architecture decisions

### Accepted baseline

PH-02 selected:
- Supabase Auth;
- Supabase PostgreSQL;
- SQL/version-controlled migrations;
- Supabase client/server primitives;
- no ORM initially.

Architecture rules:
- server-side MeExercise ownership/auth checks are mandatory;
- RLS is defense-in-depth, not the only authorization layer;
- no service-role key in browser code;
- production web host and production Supabase project/data region deferred to release readiness/PH-10;
- before that, no real sensitive user data in shared remote infrastructure;
- local or synthetic/non-sensitive development only.

### Database foundation merged

PR #5:
- branch: `agent/ph02-identity-foundation`
- feature commit: `2198ece680358f910f9cb0afd7abaedc1e887793`
- merge commit: `720bb5380847aa29d0573a99779c5250d806554d`
- merged 2026-08-18
- PR checks: `CI/Verify` passed, `CI/Database` passed.

Database foundation includes:
- `profiles`;
- assessment templates;
- immutable assessment template versions;
- resumable assessment sessions;
- RLS;
- optimistic `row_version`;
- immutable completed sessions;
- synthetic seed;
- 21 pgTAP assertions.

---

## 13. Supabase/Docker local-development rules

### 13.1 Docker CLI path

Docker Desktop could be running while `docker` was absent from inherited PATH.

Known explicit CLI path:

`C:\Program Files\Docker\Docker\resources\bin\docker.exe`

Future scripts may add that directory to PATH or invoke it directly.

### 13.2 Custom Docker host-binding experiment failed

A custom Docker network (`meexercise-local`) with `host_binding_ipv4=127.0.0.1` did **not** make Supabase publish only on loopback.

Supabase still published ports on `0.0.0.0` / `::`.

**Rule:** do not infer safe host exposure from the custom Docker network.

The machine-specific network ID was removed from project npm scripts.

### 13.3 Firewall/backend experiments did not establish a clean solution

Generic host/firewall attempts failed to satisfy Docker internal gateway behavior and were rolled back.

`host.docker.internal` is special Docker routing and is not equivalent to ordinary LAN exposure.

**Rule:** do not resurrect old firewall/network experiments unless the actual requirement returns and the design is re-evaluated.

### 13.4 Offline isolation pattern that worked

For sensitive local verification, the successful pattern was:

1. while online, ensure Docker is healthy and all required images are already cached;
2. disable adapters carrying active IPv4/IPv6 default routes;
3. verify no active default-route adapter remains;
4. start Supabase locally;
5. verify `127.0.0.1:54321` API and `127.0.0.1:54322` DB are reachable;
6. run migrations/tests;
7. stop Supabase **before** restoring adapters;
8. restore previously active adapters in `finally`.

Cleanup must happen even after failure.

### 13.5 Cached-image assumption failed once

Offline verification initially attempted to use `supabase/pg_prove:3.36` when it was not cached.

With networking disabled, Docker could not resolve/pull from Docker Hub.

Fix:
- preflight the **exact image/tag/digest** before isolation.

Later successful image evidence:
- `public.ecr.aws/supabase/pg_prove:3.36`
- digest observed:
  `sha256:eda7c5e68719e9c8287e78c017118407b48df904a51c935f5ab6098b8c0bc6bc`

Do not assume that image remains cached on a future machine/state.

### 13.6 Do not depend on DB container environment internals

An attempt to read `POSTGRES_PASSWORD` from the DB container found no usable entry.

Fix that worked:
- use supported `supabase status -o env` output to obtain local connection/client details;
- do not inspect implementation-specific container env unless necessary.

### 13.7 Empty env-line PowerShell bug

A wrapper required `[string[]]` values but Supabase/Docker env output contained an empty string.

That caused failure before pgTAP.

Fix:
- avoid mandatory typed string-array assumptions for raw env lines;
- use structured JSON where available;
- explicitly tolerate/filter empty lines.

### 13.8 Full stack vs DB-only stack

Database-only CI for PR #5 successfully used the Supabase database-oriented workflow.

For **Auth integration**, the full Supabase stack is required because GoTrue/Auth must exist.

Do not replace full `supabase start` with DB-only startup for auth tests.

---

## 14. PH-02 database verification chronology

This chronology matters because each failure narrowed the real cause.

### Offline verification attempt: missing pg_prove cache

- external network disabled;
- required image was not cached;
- Docker could not pull/resolve;
- verification blocked;
- cleanup restored network.

Lesson: cache preflight before isolation.

### V4-style database wrapper attempt

- cached image available;
- stack/migration work proceeded;
- wrapper failed before pgTAP because mandatory string-array handling rejected empty env value.

Lesson: raw env output requires tolerant parsing.

### V5

- stack/isolation okay;
- wrapper assumed `POSTGRES_PASSWORD`;
- no such useful container env entry;
- pgTAP did not start;
- cleanup succeeded.

Lesson: use supported CLI status output.

### V6

- external networking disabled;
- local Supabase started;
- API/DB reachable;
- `supabase status -o env` used privately for connection;
- pgTAP:
  - Files=1
  - Tests=21
  - Result=PASS
- stack stopped before networking restored;
- `npm run verify` passed afterward.

This is the proven database-foundation local-isolation pattern.

---

## 15. `supabase/.branches/_current_branch` merge-cleanup incident

After PR #5 merged, the first merge/sync script switched to local `main` and then refused to fast-forward because it saw:

`?? supabase/.branches/_current_branch`

This file was generated local Supabase state.

The incoming merged `supabase/.gitignore` contained:

`.branches`

The script was too strict because it checked cleanliness **before** local `main` received the ignore rule.

Correct fix:
- verify it is exactly the expected generated local state file;
- preserve it;
- fast-forward `main`;
- verify the merged `.gitignore` now ignores it;
- do not delete it merely to satisfy the script;
- then continue branch cleanup.

**Rule:** distinguish user work from known generated state. “Clean” means no relevant user change, not “delete everything untracked.”

---

## 16. Supabase CLI / Node process-launch incident chain

This is the most recent debugging sequence and should be preserved exactly.

### Context

Current work branch at the latest returned evidence:

`agent/ph02-auth-profile`

Base/HEAD before commit:

`720bb5380847aa29d0573a99779c5250d806554d`

The branch has uncommitted Auth/private-profile work.

### First auth/profile apply attempt

Static source generation/checks completed.

Failure at Supabase startup:

log showed:

- `Cannot find module 'C:\Apps\Meexercise\node_modules\npm\bin\npm-prefix.js'`
- `Cannot find module 'C:\Apps\Meexercise\node_modules\npm\bin\npx-cli.js'`

Cause:
- wrapper invoked `npx.cmd` through `cmd.exe`;
- resolution selected a broken repository-local npm/npx shim;
- Docker/Supabase itself had not started.

Fix:
- stop using ambiguous `npx` resolution in this path;
- target project-local `node_modules\.bin\supabase.cmd`.

### Runtime continuation V2

Results:
- branch/file-scope checks passed;
- lint/typecheck/unit tests passed;
- external network isolation passed;
- local Supabase **started successfully**;
- `127.0.0.1:54321` API reachable;
- `127.0.0.1:54322` DB reachable.

Then Node helper failed:

`spawnSync ...\node_modules\.bin\supabase.cmd EINVAL`

Cause:
- Node `execFileSync()` attempted to execute a Windows `.cmd` file directly.

Cleanup:
- Supabase stopped while isolated;
- Wi-Fi restored successfully.

Lesson:
- on Windows, `.cmd` must run through a shell/cmd path; do not use direct `execFileSync()`.

### Runtime continuation V3

Supabase again started correctly under isolation and both ports were reachable.

The helper attempted manual:

`cmd.exe /d /s /c ... supabase.cmd status -o env`

but exited with status 1 and no useful stdout.

Cause:
- remaining Windows shell/quoting behavior in the hand-built command path.

Cleanup again passed.

### Runtime continuation V4

A V4 script was generated to:
- replace the helper;
- use Node shell execution for Windows `.cmd`;
- add `--probe`;
- verify project-local Supabase CLI `2.114.0` **before network isolation**;
- only then start Supabase and call `status -o env`.

**At the time this sheet was compiled, V4 had been generated but no returned execution result was yet available.**

Therefore:
- V4 is `Proposed/generated`;
- its Windows helper fix is **Unproven**;
- do not claim Auth/profile integration passed yet.

### General process lesson

When a wrapper mechanism can be tested cheaply, test it **before** changing machine/network state.

For example:
- probe CLI process launch before disabling Wi-Fi;
- syntax-check helpers before runtime;
- verify expected image/cache before isolation.

---

## 17. Current Auth/private-profile slice — intended scope

The current uncommitted PH-02 slice targets:

- `REQ-001`
- `REQ-002`
- relevant `REQ-036` / `REQ-037`
- `RISK-027`
- partial `VAL-024`, `VAL-032`, `VAL-034`

Intended implementation includes:
- email/password sign-up;
- sign-in;
- local-session sign-out;
- forgot-password request;
- auth callback;
- update-password path;
- cookie-backed Supabase SSR sessions;
- server-side trusted identity via claims;
- private profile display name;
- explicit application-side `user_id` ownership filtering in addition to RLS;
- optimistic row-version conflict handling;
- browser integration test for stale concurrent profile edit;
- CI full Supabase/Auth integration.

New uncommitted dependency snapshot:
- `@supabase/supabase-js@2.111.0`
- `@supabase/ssr@0.12.4`

These versions were selected from then-current package/docs evidence. Re-check before future upgrades.

### Current evidence boundary

As of the latest returned V3 evidence:

`Passed`:
- branch/base/file scope preflight;
- lint;
- typecheck;
- six unit/component tests;
- external network isolation;
- local Supabase startup;
- local API reachability;
- local DB reachability;
- safe Supabase stop before network restoration;
- network restoration.

`Failed`:
- local env helper command invocation on Windows.

`Unproven`:
- `.env.local` generation using the latest V4 helper;
- migration replay in this auth run;
- pgTAP in this auth run;
- sign-up/sign-in/sign-out browser integration;
- profile save/concurrency integration;
- full `npm run verify` after auth integration;
- GitHub CI for auth/profile;
- commit/push/PR for auth/profile.

Do not skip directly to commit/push.

---

## 18. Supabase SSR/Auth guidance used in this chat

When the Auth slice was designed, current official guidance was checked and used for these conclusions:

- use `@supabase/supabase-js` + `@supabase/ssr`;
- use cookie-based server clients for Next.js SSR;
- refresh/propagate auth cookies through the Next.js request proxy/middleware mechanism appropriate to the current Next.js version;
- use trusted server-side claims/session verification for protected server data rather than trusting client route state;
- password recovery flow uses reset-email + callback/session + password update;
- privileged/service credentials remain server-only and are never browser-exposed.

Next.js 16 uses the `proxy.ts` convention rather than older middleware naming.

**Future rule:** Supabase and Next APIs change. Re-check official docs before implementing or revising auth code.

---

## 19. Official/external resources accessed during development

This is a resource index, not a frozen specification. Search current official versions before relying on them.

### Supabase official documentation

Consulted for:
- automated database testing in CI;
- local development workflow;
- CLI `start`, `db start`, `db reset`, `test db`;
- `status -o env`;
- Next.js SSR/Auth;
- password reset/update flow.

Noted documentation nuance:
- the official automated-testing CI example used `supabase db start` + `supabase test db`;
- local workflow guidance used `supabase start` + `supabase db reset`;
- CLI wording elsewhere suggested the stack should be started with `supabase start`.

Resolution:
- use the command appropriate to the tested boundary;
- database-only PR #5 CI empirically passed with the DB-oriented startup;
- Auth integration requires full stack;
- real successful CI/runtime evidence outranks ambiguous wording.

### Node.js official documentation

Consulted for Windows `child_process` behavior.

Key lesson:
- `.bat` / `.cmd` files are not normal direct executables for `execFile` on Windows;
- use a shell/`cmd.exe`/appropriate spawn/exec path.

### npm registry/package metadata

Consulted to confirm then-current versions of:
- `@supabase/supabase-js`
- `@supabase/ssr`

### GitHub / GitHub Actions

Used:
- GitHub connector for remote PR/file/diff/Actions inspection;
- GitHub REST/GraphQL-backed connector functions;
- local `gh` CLI for authenticated operations unavailable to the connector.

### Docker local runtime evidence

Used Docker Desktop/Engine CLI directly for:
- engine readiness;
- container inspection;
- image-cache/digest checks;
- Supabase local container state.

**Source rule for technical work:** prefer standards/official platform docs/primary docs. For current APIs/libraries, browse again rather than trusting this historical snapshot.

---

## 20. GitHub/CI history worth preserving

### PH-00

Governance baseline:
- initial commit:
  `0f3db2b5abda7f4fea6315baa01218dade562caa`
- later cleanup/canonicalization PRs merged and synchronized.

### PH-01

Application shell merged through PR #3.

Verified:
- lint;
- typecheck;
- Vitest;
- Next production build;
- 12 Playwright tests;
- GitHub CI.

PH-01 remained limited to shell scope; no auth/database claims.

### PH-02 provider governance

Supabase Auth/PostgreSQL accepted.  
Production host/data region deferred.

### PH-02 database foundation — PR #5

Feature commit:
`2198ece680358f910f9cb0afd7abaedc1e887793`

Merge commit:
`720bb5380847aa29d0573a99779c5250d806554d`

Remote PR checks:
- `CI/Verify`: success;
- `CI/Database`: success.

The GitHub connector could inspect but not perform final PR writes, so local `gh` was used for ready/merge.

After merge, the user reported the corrected local sync/branch-cleanup script succeeded.

---

## 21. CI design lessons

### Keep test ownership explicit

- static/unit job should not accidentally invoke unrelated E2E suites;
- DB job should test DB boundary;
- Auth integration job/full-stack step should exist only when Auth boundary exists.

### Do not rely on secrets for local synthetic CI

PR #5 DB CI used local Supabase with synthetic data and no remote Supabase project.

Auth branch similarly should use local synthetic accounts.

### Never leak local generated credentials to logs

`supabase status -o env` can include browser-safe and privileged values.

When generating `.env.local`:
- parse output privately;
- write only required browser-safe URL/key + site URL;
- never echo service-role/DB secrets;
- `.env.local` is ignored.

### Always stop local stack in cleanup

CI/local scripts should stop Supabase with an `always()`/`finally` path when they started it.

---

## 22. Security/privacy implementation rules for PH-02

For private account/profile/assessment data:

- client route guards are UX only;
- server-side ownership is required;
- RLS remains defense-in-depth;
- no cross-user record access;
- negative cross-user tests are mandatory;
- do not log raw profile/assessment answers;
- validate inputs at trusted boundaries;
- use explicit concurrency checks;
- stale edits must not silently overwrite newer data;
- destructive account/data operations require separate lifecycle/recovery work;
- real sensitive user data must not be placed in shared remote environments before production hosting/region/legal decisions are accepted.

---

## 23. Failure-handling template for future scripts

For any script that alters network/Docker/database/Git state:

### Before

- verify expected branch/HEAD;
- verify expected `origin/main`;
- inspect exact working-tree scope;
- verify prerequisite executable/version;
- probe cheap helper behavior;
- verify cached images/resources before network isolation;
- identify exactly what state may change.

### During

Use explicit milestone headings, e.g.:

- `=== PRE-FLIGHT ===`
- `=== START ... ===`
- `=== TEST ... ===`
- `=== STOP ... ===`

Do not print secrets.

### On failure

- report the exact failed milestone;
- preserve logs when they are useful;
- sanitize before asking user to paste;
- do **not** tell the user to rerun blindly;
- determine whether partial state exists;
- generate a continuation/recovery script from the actual state.

### `finally`

Restore:
- disabled adapters;
- temporary service runtime;
- any environment state the script itself changed.

Never reset or discard repository work merely because verification failed.

---

## 24. "Do not make these mistakes again" checklist

Before sending a non-trivial MeExercise script, check:

- [ ] Did I read current `AGENTS.md` and `PROJECT_INDEX.md`?
- [ ] Am I using current GitHub/local state, not a stale upload?
- [ ] Is this Windows PowerShell 5.1 compatible?
- [ ] Did I provide the entire script?
- [ ] Did I state exactly how to execute it?
- [ ] Does it start with the correct repo path?
- [ ] Does it inspect status/diff before mutation?
- [ ] Does it protect unrelated work?
- [ ] Am I avoiding raw pasted `if/elseif/else` chains?
- [ ] Am I avoiding PS7-only syntax?
- [ ] Am I handling native stderr via exit codes?
- [ ] Am I using arrays safely?
- [ ] Did I avoid assuming Docker PATH?
- [ ] Did I preflight offline-required images?
- [ ] Am I using supported Supabase output rather than container internals?
- [ ] Am I avoiding ambiguous `npx` resolution in Windows scripts?
- [ ] If Node launches a `.cmd`, am I using a Windows shell path?
- [ ] Can I probe the wrapper before taking the machine offline?
- [ ] If networking is disabled, is cleanup guaranteed?
- [ ] Is Supabase stopped before networking is restored?
- [ ] Are credentials redacted/withheld?
- [ ] Did I distinguish generated Supabase local state from user work?
- [ ] Did I avoid unnecessary `.gitattributes` changes?
- [ ] Did I use `git --no-pager` for large diffs?
- [ ] Did I verify manifest hashes after final content changes?
- [ ] Are test-runner discovery patterns non-overlapping?
- [ ] Did I state exactly what remains `Unproven`?
- [ ] Am I avoiding commit/push/merge until relevant checks pass?
- [ ] If connector write permission fails, did I stop retrying and use the authenticated `gh` path?
- [ ] After merge, did I verify exact merge SHA remotely and locally?

---

## 25. Fast resumption protocol for a new ChatGPT instance

A future instance should **not** continue from this sheet alone.

Do this:

1. Inspect current GitHub `main`.
2. Ask for local evidence only if current unpushed state matters.
3. Read current `/AGENTS.md`.
4. Read current `project_docs/PROJECT_INDEX.md`.
5. Route to affected governance.
6. Verify current branch/HEAD/status.
7. Compare with the handoff snapshot below.
8. Resume from evidence, not from assumption.

### Handoff snapshot at cheat-sheet creation

Time context: 2026-08-18.

Remote merged baseline:
- PR #5 merged;
- `main` merge SHA:
  `720bb5380847aa29d0573a99779c5250d806554d`.

Current local work according to the latest returned evidence:
- branch: `agent/ph02-auth-profile`;
- HEAD/base: `720bb5380847aa29d0573a99779c5250d806554d`;
- auth/profile changes are uncommitted;
- static checks have repeatedly passed;
- full local Supabase startup under external network isolation has repeatedly passed;
- local API and DB ports have been reachable;
- current blocker is Windows Node process launching of the helper that runs `supabase status -o env`;
- V4 helper/probe continuation script was generated but had **not yet produced returned execution evidence** when this sheet was created.

Before doing anything:
- run/read `git status`;
- inspect the current helper file;
- do not blindly rerun V1/V2/V3 scripts;
- do not recreate the feature branch;
- do not reset the working tree;
- do not commit until runtime integration is proven.

---

## 26. Useful command patterns

### Repository inspection

```powershell
Set-Location 'C:\Apps\Meexercise'

git branch --show-current
git rev-parse HEAD
git status --short --branch
git --no-pager diff --stat
git diff --check
```

### Verify remote main

```powershell
git fetch origin main
git rev-parse origin/main
```

### Safe branch existence

```powershell
git show-ref --verify --quiet "refs/heads/agent/example"
$LASTEXITCODE
```

### Current GUI

```powershell
Set-Location 'C:\Apps\Meexercise'
npm run dev
```

Browse:
`http://127.0.0.1:3000`

### Existing app verification contract

Historically:

```powershell
npm run verify
```

covered:
- lint;
- typecheck;
- unit/component tests;
- Next production build;
- Playwright shell E2E.

Do not assume the script remains unchanged; inspect `package.json`.

### Supabase

Use project scripts when they are current:

```powershell
npm run supabase:start
npm run supabase:status
npm run db:reset
npm run test:db
npm run supabase:stop
```

For Windows wrapper code, beware `.cmd` process-launch behavior.

---

## 27. What belongs in governance vs this sheet

This cheat sheet is an operational memory aid.

Canonical governance should be updated only when implementation changes documented truth:
- phase/status;
- architecture/contracts;
- routes/flows;
- data ownership/versioning;
- security/privacy boundaries;
- consequential decisions;
- validation evidence;
- build/release commands;
- debugging/maintenance procedure that is genuinely durable.

One-off failed-script details do not all need to become canonical governance, but their **generalized durable rule** may belong in `DEBUGGING_AND_MAINTENANCE.md` or `REPOSITORY_AND_RELEASE.md`.

If this sheet is committed later:
- classify it clearly as non-canonical operational reference or route it explicitly through `PROJECT_INDEX.md`;
- do not silently create a competing governance owner.

---

## 28. Summary for the next instance

The most important lessons from this chat are:

1. **Evidence over memory.** Re-inspect state before acting.
2. **Current GitHub/local state over detached source packs.**
3. **Full `.ps1` files over fragile pasted PowerShell fragments.**
4. **Protect partial state; continue from failures instead of resetting.**
5. **Probe cheap wrapper assumptions before expensive/environment-changing steps.**
6. **Windows `.cmd` process launching is a real compatibility boundary.**
7. **Do not blame Supabase/Docker until logs show the provider boundary actually failed.**
8. **Use supported Supabase CLI output; avoid container-internal assumptions.**
9. **Pre-cache exact Docker images before offline isolation.**
10. **Always stop Supabase before restoring external networking in isolation tests.**
11. **RLS does not replace server-side application ownership checks.**
12. **Concurrency conflicts must preserve data, not silently overwrite.**
13. **GitHub connector read access does not imply write access; `gh` may be the correct write path.**
14. **Generated local state is not automatically user work and should not be deleted blindly.**
15. **A green check proves only its scope. State remaining `Unproven` explicitly.**

