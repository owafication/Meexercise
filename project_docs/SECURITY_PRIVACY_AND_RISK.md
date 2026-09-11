# Security, Privacy and Risk

**Status:** Risk baseline active; PH-02 private-data and PH-03 exercise-content boundaries Passed / Verified; PH-04 manual create/edit/versioning, structured constraints, manual consumer and guided proposal/review merged; structured planning-profile prerequisite locally verified; legal applicability and production exposure unproven
**Owner:** Safety boundary, data protection, access control and material risk

## Proportional safeguard rule
Security follows actual reachability, principal boundaries, sensitive data, untrusted inputs, capability and consequence—not project prestige. Minimum justified complexity does not mean minimum protection.

## Data classes
- account/contact identifiers;
- self-reported wellness, exercise, mobility, pain/discomfort/limitation and related sensitive context;
- plans, routines, session/history/progression records;
- nutrition preferences, exclusions and allergen data;
- professional-content authorship/credential claims;
- billing data if premium activates;
- operational metadata needed to run/support the service.

Collect only data justified by the feature. Do not collect speculative clinical detail “for later”. Explain collection purpose where not obvious. Define correction, export, deletion and retention before relying on real user data.

If a jurisdictional privacy regime applies (for example Australian Privacy Principles, GDPR or another regime), its binding collection, security, retention, cross-border and rights requirements override this generic baseline. Applicability must be established rather than assumed.

Production hosting and physical data region are intentionally deferred until release/deployment readiness so they can be selected against the actual distribution footprint and legal/privacy requirements. Until that decision is accepted, development uses local infrastructure or non-production remote infrastructure with synthetic/non-sensitive test data; real sensitive wellness/user data must not be placed in a shared remote environment.

## Baseline controls by trigger
- **Secrets exist:** keep them outside committed source; restrict access; use platform/managed secret handling when lifecycle needs justify it.
- **Private accounts exist:** secure authentication/session handling and server-side authorisation/ownership checks.
- **Sensitive data crosses network:** TLS through supported hosting/platform controls.
- **Untrusted input exists:** validate structure/type/range/size at the trusted boundary; use safe framework/query APIs.
- **User content renders into executable contexts:** rely on framework escaping/safe rendering; avoid raw injection escapes.
- **Destructive account/data action:** authorisation plus appropriate review/undo/recovery. Current account deletion requires current-password re-authentication and exact typed confirmation; users are directed to export first because Auth-user deletion and current cascading records are intentionally permanent.
- **Irreplaceable persisted data:** backup/recovery objective and restore evidence before release dependency.

## PH-02 local private-data evidence
Local browser integration verifies signup/sign-in/sign-out, private-profile persistence and stale-write rejection, readiness-assessment save/resume/completion, readable authenticated JSON export, rejected deletion with an incorrect current password, permanent account deletion after re-authentication plus exact typed confirmation, rejected sign-in after deletion, and captured-email password recovery through a server-verified recovery session. The recovery flow preserves one canonical browser origin, updates only the authenticated recovery user password, rejects the prior password after update and accepts the replacement password. A separate two-user adversarial browser test now verifies the currently implemented application boundary for `RISK-027`: one authenticated user cannot read another user's private profile through the profile surface, cannot mutate another user's real assessment session by forging its UUID/row version, and cannot receive the other user's private profile or assessment content in export; the owner record remains unchanged. Database tests cover ownership/RLS, versioning/immutability, assessment start-state/safety derivation and Auth-user cascade deletion of current private records. The account-deletion administrator uses a server-only service-role secret; the browser receives no privileged key. Future modules still require their own mapped ownership tests when introduced. The final PH-02 correction slice additionally verifies that current profile/in-progress assessment data remains editable; completed assessment correction creates a linked successor on the same template version while preserving the original immutable record; export v2 includes correction linkage; account email change requires current-password re-authentication plus confirmation at the new address; and account deletion removes both source and correction primary records plus their safety flags. The PH-02 primary-datastore retention contract therefore retains no deleted user record after permanent account deletion. This does not prove future routine-generator consumption of safety flags, future-domain export/correction/deletion coverage, production backups/retention exceptions, production SMTP/deliverability, production secret handling/transport, remote exposure or legal/privacy compliance.

## PH-04 local private-routine evidence
The first PH-04 slice extends the existing private-data boundary to user-owned routines. Server-side creation derives the authenticated user rather than trusting a submitted owner identifier; database RLS limits routine identities, versions, sections and items to their owner; and authenticated browser evidence verifies a second user cannot read another user's routine detail or list entry. New private routine records are included in export v3 and cascade on Auth-user deletion, so the current `REQ-038` lifecycle does not silently omit the new domain.

`RISK-016` is only partially closed in this slice. Routine creation accepts only currently visible approved exercise versions and fails closed unless the latest readiness assessment is completed without restriction/block flags. Free-text movement restrictions are deliberately not guessed into exercise compatibility: restricted generation remains blocked until deterministic matching/substitution rules are implemented later in PH-04.

`RISK-018` is directly exercised by the first routine consumer. Routine items retain exact exercise-version IDs and immutable routine snapshot rows. Withdrawing a referenced exercise version does not rewrite the saved routine; the owner retains narrowly scoped historical read access to that exact version, while anonymous and unrelated authenticated readers remain excluded. The original PH-03 public visibility policy remains intact.

## PH-04 routine-editing local risk evidence
The second slice extends owner authorisation to the edit route and append-only mutation. Stable-routine ownership is rechecked server-side/database-side and browser evidence denies another authenticated user detail/edit access. Expected-version rejection prevents stale concurrent edits from silently overwriting newer routine state (`RISK-019`).

Routine version N remains immutable when N+1 is saved, preserving `RISK-018` protection and export-v3 history. Withdrawn historical exercise versions remain owner-readable but cannot be copied into a new version.

`RISK-016` remains partial. A restrictive correction is resolved through the correction-chain leaf and blocks create/edit; competing current leaves fail closed. Free-text restrictions are still not inferred into exercise compatibility, so deterministic restriction matching/substitution remains later PH-04 work.

## PH-04 structured-constraint prerequisite risk evidence
The third PH-04 slice advances `RISK-016` without weakening the existing stop boundary. Structured movement constraints originate only from explicit user choices in the versioned readiness response. Free-text affected areas and avoided-movement notes remain sensitive user context and are not converted into planning tags by keyword, model or heuristic.

Exact exercise-version planning tags are version-owned reviewed metadata and are immutable after finalisation. Deterministic compatibility requires currently approved content; an unclassified exercise version cannot be treated as compatible when constraints are present. Compatible substitution lookup uses only existing source-version-owned `substitution` relations and their exact target versions.

Restricted planning is still fail-closed in this prerequisite slice. Legacy version-1 restrictions, missing structured choices, `other_or_unclear`, block-generation outcomes and ambiguous current readiness history do not produce a permissive constraint set. Manual routine create/edit therefore remains blocked until the later consumer slice validates the entire selected/proposed routine through these primitives.

Synthetic tags and the two-category deterministic vocabulary prove mechanism only. Production taxonomy breadth, editorial classification of a real catalogue and any claim that a category is medically sufficient remain Unproven and cannot be inferred from these fixtures.

## PH-04 manual constraint-consumer risk evidence
The fourth PH-04 slice further closes the manual portion of `RISK-016`. A supported structured restriction no longer requires blanket blocking: the application filters the available approved exact exercise versions and the database independently validates the entire submitted selection against the same current structured constraint set before persistence.

The mutation boundary remains authoritative even if browser inputs are forged. Non-approved, unclassified-with-active-constraints, or constraint-conflicting exact versions are rejected before routine/version/item insertion. Restricted create/edit therefore cannot be converted into unrestricted persistence by submitting a hidden or stale exercise-version identifier.

Substitution is deliberately non-autonomous. Only an existing source-version-owned `substitution` relation whose exact target is currently approved and constraint-compatible may be surfaced; the user must explicitly choose it. No heuristic/free-text matching, silent replacement, runtime AI or inferred medical compatibility is introduced.

Historical snapshots retain their original exact exercise versions when a later readiness correction makes those exercises incompatible. Only a newly saved version is constrained by the current readiness state, preserving `RISK-018`. Existing owner isolation and stale-write controls continue to cover `RISK-019`/`RISK-027`.

`RISK-016` is still partial at the phase level because guided generation, whole-proposal explanation/review and production catalogue/taxonomy evidence remain Unproven. Synthetic movement categories demonstrate deterministic mechanics, not medical sufficiency or production editorial completeness.

## PH-04 deterministic guided-proposal risk evidence
The guided slice advances generated-routine `RISK-016` without a weaker authority. Candidate versions are drawn only after current readiness and exact-version structured constraints are resolved through existing planning boundaries. The generator receives only approved compatible candidates and cannot override blocked/unresolved readiness or infer compatibility from free text.

The proposal is ephemeral and non-authoritative. Every proposed item is reviewable; replacement choices remain within the item's target-area structure and current approved compatible set. Existing substitution guidance is informational only and never silently applied.

Final persistence remains defence-in-depth: the reviewed exact-version array is saved through the already-verified routine mutation, which rechecks current readiness, approval and structured compatibility. Runtime AI is not used and wellness free text is not interpreted heuristically.

`RISK-016` remains partial at phase level because the generator does not yet consume full accepted profile-goal/equipment/time/frequency planning context, and production catalogue/taxonomy review remains a later activation/release gate. Unlimited templates also remain unimplemented.

## PH-04 structured planning-profile risk evidence
The planning-profile prerequisite adds sensitive user-owned wellness/preferences context to the existing private `profiles` authority rather than creating another principal or datastore boundary. Authenticated owner RLS, server-derived user identity and optimistic `row_version` conflict handling therefore continue to protect the new fields.

Planning vocabularies are explicitly bounded at both application and database boundaries. Unsupported goal/method/equipment/facility tokens, duplicate bounded selections, contradictory `none`-plus-equipment state, invalid goal priority, out-of-range routine minutes and out-of-range weekly frequency are rejected rather than normalised into an invented planning meaning. Server reconstruction of malformed stored values fails closed.

The new values are current editable planning preferences, not diagnoses, treatment targets or medical prescriptions. Goal options remain within the accepted general-wellness scope. Partial profile saves are allowed so collection is proportional and users are not forced to provide planning data merely to maintain unrelated profile/account state.

Data lifecycle coverage advances with export v4, which includes the structured planning fields in the authenticated readable export. Permanent account deletion still removes the owning profile row by the existing Auth-user cascade. No new logs, analytics payloads, third-party services or runtime AI receive these values.

`RISK-016` remains partial: this slice deliberately does not claim that generation respects goals/preferences/equipment/time/frequency yet. The later deterministic generator consumer must use explicit exercise planning metadata and fail closed when required profile context or compatible content is unavailable.

No WAF, SIEM, dedicated vault, penetration-test programme, multi-region system or complex RBAC is assumed before its threat/contract/exposure requires it.

## Health/wellness safeguards
- The assessment is not a diagnosis.
- Safety flags can restrict/stop routine generation and recommend professional assessment; they do not certify medical safety.
- Pain/discomfort feedback changes activity conservatively and never creates a diagnosis.
- Routine generation consumes approved exercise content and deterministic constraints.
- Professional credential claims show verification status; unverified claims may not be presented as verified.
- Direct professional access to user records is prohibited in the initial professional model.

## Privacy/logging rules
- No health/wellness values in ordinary application logs, analytics events, advertising profiles or crash metadata unless a narrowly justified, consented and protected diagnostic path is separately designed.
- Prefer event/category/technical identifiers over raw user text.
- Do not use health answers for ad targeting.
- Do not sell user health information.
- Support bundles, if introduced, must be user-initiated, reviewable and redacted.

## Runtime AI safeguards
No runtime AI is baseline. If later activated: minimise prompt data; separate instructions from untrusted content; validate model outputs against schema/business/safety rules; restrict tools/permissions; log metadata rather than sensitive prompt bodies by default; evaluate prompt injection/misuse; require human/user confirmation before any high-impact action. AI output never overrides deterministic safety rules.

## Risk register
Prior `RISK-001`–`RISK-014` are legacy-reserved because their original canonical definitions were not supplied. Do not reuse them.

| ID | Risk | Material response |
|---|---|---|
| `RISK-015` | Product drifts from general wellness into diagnosis/treatment/rehabilitation claims | claim review; feature stop gate; separate regulated-scope decision |
| `RISK-016` | Generated routine violates user restriction or approved-content boundary | deterministic constraint engine; fail closed; user review; fixtures |
| `RISK-017` | Sensitive wellness data leaks through logs/analytics/support | data classification; redaction tests; logging allowlist |
| `RISK-018` | Content/version updates rewrite historical meaning | immutable identities/versions and session/plan snapshots |
| `RISK-019` | Cross-device edits silently overwrite data | concurrency control; conflict preservation/review |
| `RISK-020` | Allergen/exclusion conflict yields unsafe meal suggestion | structured allergen metadata; hard conflict validation; user-visible resolution |
| `RISK-021` | Subscription expiry blocks or deletes user-owned data | entitlement/data-ownership separation; expiry tests |
| `RISK-022` | Professional content implies verified credentials/direct care that does not exist | explicit verification status; content-only permissions; claim review |
| `RISK-023` | UI/navigation hard-codes present modules and makes later meal/professional integration contradictory | route/feature ownership; no empty placeholder surfaces; shared primitives only when reused |
| `RISK-024` | AI/architecture overengineering adds unneeded cost and failure modes | minimum-complexity gate; independent triggers for AI/RAG/agents/services/queues |
| `RISK-025` | Accessibility failure blocks core planning or session use | semantic controls; keyboard/focus/error tests; release evaluation |
| `RISK-026` | Migration/release loses or corrupts user history | reversible migrations, backups/restore, production-like migration validation |
| `RISK-027` | Authenticated user accesses another user's private records | server ownership/authorisation checks and negative tests |
| `RISK-028` | Recurring hosting/AI/storage costs grow without product value | explicit cost trigger/budget before new external service |
| `RISK-029` | Derived reports overstate measured health outcomes | provenance labels and links to source records; no diagnostic inference |
| `RISK-030` | Later AI generates confident but unsupported wellness guidance | grounding/evals/validators/fallback; no safety authority |
