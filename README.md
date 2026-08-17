# MeExercise

**Governance status:** Canonical foundation v0.2.0  
**Mode of latest record:** PH-01 application implementation  
**Application implementation:** PH-01 shell implemented and locally verified; PH-02+ unproven

MeExercise is a self-directed general-wellness web application for assessing current exercise and mobility context, defining goals and constraints, creating and tracking exercise/mobility plans, producing detailed printable instructions, reviewing progression and trends, and later supporting general meal planning and professionally authored general-wellness programs.

## Product boundary

MeExercise supports general wellness. It does not diagnose, treat, rehabilitate, prognose, medically monitor, or determine whether a disease, injury, pregnancy, postoperative state, medication interaction, or pain condition is medically safe.

The free product is intended to be complete for ordinary general-wellness use. Advanced routine generation, detailed progression planning, advanced reports, unlimited plans/templates, enhanced printable packs, general meal planning, advanced scheduling, and cross-device use are free capabilities when their phases are delivered. Premium is reserved for specialised content, professional services, optional integrations, or genuinely higher-cost capabilities.

Initial professional capability is professionally authored general-wellness content. Direct professional-to-user management is a later, separately governed capability.

## Governance reading order

1. `AGENTS.md`
2. `project_docs/PROJECT_INDEX.md`
3. Only the canonical owners routed by the index for the task

The governance is deliberately compact. Definitions belong in one canonical owner and are linked rather than copied.

## Current delivery state

PH-01 establishes the responsive application shell with the canonical Today, Plans, Create, Progress and Profile destinations using the selected Next.js App Router toolchain. Local Windows validation covers lint, type checking, unit/component tests, production build and automated Chromium accessibility/keyboard/reflow checks. Authentication, persistence, deployment, the broader browser/device support matrix, manual assistive-technology evaluation and all PH-02+ product behaviour remain unproven.
