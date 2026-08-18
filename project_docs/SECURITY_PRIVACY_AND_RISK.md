# Security, Privacy and Risk

**Status:** Risk baseline active; PH-02 local private-account/profile boundary partially verified; legal applicability and production exposure unproven
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
- **Destructive account/data action:** authorisation plus appropriate review/undo/recovery.
- **Irreplaceable persisted data:** backup/recovery objective and restore evidence before release dependency.

## PH-02 local private-data evidence
Local browser integration verifies signup, sign-in, sign-out, access to the authenticated user's private profile, profile persistence and rejection of a stale concurrent profile write. The database foundation separately passed 21 pgTAP assertions covering RLS ownership/concurrency/immutability. These checks reduce `RISK-019` and `RISK-027` for the tested paths but do not prove all application-layer negative cross-user access, password recovery, account deletion, production transport/configuration, remote exposure or legal/privacy compliance.

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
