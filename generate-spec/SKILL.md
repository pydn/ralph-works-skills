---
name: generate-spec
description: Interviews the user first, then generates a structured MARKDOWN engineering specification (PRD/RFC) for a new feature or project. Outputs to `docs/specs/FEATURE.md` with clear section headings, Mermaid diagrams, and tables. Markdown enables easy patching with red team findings and targeted updates later. Use when the user wants to plan, design, or write a spec before coding.
---

# Spec Generation Skill — Markdown-First Output

## Goal
Interview the user before drafting, then create a **structured Markdown specification document** at `docs/specs/FEATURE.md` that uses clear section headings, Mermaid diagrams, and tables to make complex technical concepts immediately understandable. The output must be easy to patch later with red team findings or revisions using targeted `edit` calls.

## Process

### 1. Interview First
Do not create or finalize the spec until the interview is complete and the user has confirmed the summarized brief, unless the user explicitly says to proceed with stated assumptions.

Start with a focused interview based on the user's prompt and any immediately available project context. Do not ask stock discovery questions or present a generic questionnaire.

Ask only targeted questions that would materially change the technical spec. Derive them from gaps, ambiguities, and risks in the provided context, such as:

- Undefined behavior at system boundaries, state transitions, data ownership, or failure modes
- Missing acceptance criteria for the specific feature behavior the user described
- Unclear integration points with existing files, APIs, services, storage, or deployment paths
- Technical constraints that could change the design: compatibility, security, performance, migration, observability, rollout, or test environment limits
- Review-sensitive decisions where multiple plausible implementations would produce different specs

Prefer 3-6 high-signal questions per round. Each question should name the specific part of the feature or codebase it is clarifying. If an answer can be inferred safely from the prompt or repository, document it as an assumption instead of asking.

If answers are incomplete, ask a short follow-up round focused only on blockers to writing a technically useful spec.

### 2. Context Gathering
After the initial interview, scan the current directory and read relevant files to understand architecture. Prefer `rg --files` over recursive directory dumps when available.

Identify and reconcile:

- Existing implementation patterns and ownership boundaries
- Key constraints, dependencies, and integrations
- Existing specs or related documentation
- Environment constraints that must affect implementation or testing
- Mismatches between user expectations and codebase reality

Ask follow-up questions only when the answer changes the spec materially. Otherwise, document assumptions and open questions in the draft.

### 3. Confirmed Spec Brief
Before drafting the final spec, present a concise brief and ask the user to confirm it is accurate enough to write:

- Problem and desired outcome
- Users / stakeholders
- In-scope and out-of-scope work
- Proposed direction and major alternatives
- Acceptance criteria and validation strategy
- Constraints, risks, and unknowns
- Target spec filename

If the user confirms, draft the spec. If the user corrects the brief, update the brief first. If the user asks to proceed without confirmation, mark unverified items as assumptions or open questions.

### 4. Visual Strategy (in Markdown)
Before writing content, decide which visual elements will communicate best:

| Concept | Markdown Treatment |
|---------|-------------------|
| System architecture | Mermaid flowchart or sequence diagram |
| Data models | Mermaid ER diagram + schema tables |
| User flows / states | Mermaid state diagram or timeline |
| Implementation phases | Table with phase, milestone, complexity, dependencies |
| API endpoints | Table with method badges using emoji (🔵 GET, 🟢 POST, 🟡 PUT, 🔴 DELETE) |
| Edge cases & risks | Risk assessment table (likelihood × impact + mitigation) |
| Trade-offs / decisions | Side-by-side comparison table |

### 5. Drafting the Spec
Create a file at `docs/specs/FEATURE_NAME.md`. Use the template below and **fill every placeholder**.

Before drafting, identify and document environment constraints:
- Read-only filesystem paths (e.g., /opt/ComfyUI is read-only in workspace sandbox)
- Unavailable hardware (CPU-only execution, no CUDA)
- Missing system libraries or services
- Network restrictions
- Mock vs real runtime requirements

These MUST be surfaced in a dedicated "Environment Constraints" section of the spec so downstream phases know what they're working with.

#### Write in Structured Chunks — NOT One-Shot

**⚠️ Never write the entire spec in a single `write` call.** Large specs frequently get truncated mid-generation, producing corrupted incomplete files. Instead:

1. **Chunk 1:** YAML front matter, header, problem statement, environment constraints.
2. **Chunk 2 (append):** User stories, proposed solution with diagrams, trade-off analysis.
3. **Chunk 3 (append):** Data model, API interface, implementation plan tables.
4. **Chunk 4 (append):** Risk assessment, security, testing strategy, rollout, open questions.

If the `write` tool doesn't support append, use `bash` with shell redirection:
```bash
cat >> docs/specs/FEATURE_NAME.md << 'CHUNK'
...
CHUNK
```

**Rule of thumb:** No single write should exceed ~10KB. If the spec has many diagrams or tables, use 4-5 chunks.

#### Check for Existing Spec Before Writing

Before creating, check if a previous version already exists:
```bash
test -f docs/specs/FEATURE_NAME.md && echo EXISTS || echo MISSING
```

**If the file does NOT exist (first draft):** Create it in chunks as described above.

**If the file already exists (revision/update):** **Do NOT recreate the entire file.** Read the existing file, identify which sections changed, and apply targeted `edit` calls:

| Scenario | Action |
|----------|--------|
| **Status change** (draft → review → approved) | Use `edit` on the YAML front matter status field only |
| **Section content updated** | Use `edit` to replace that one section block; preserve all others verbatim |
| **New section needed** | Use `edit` to insert before a later heading (e.g. add Security before Testing) |
| **Diagram needs revision** | Use `edit` on just the ````mermaid ... ```` code block and its caption |
| **Minor text changes** | Use `edit` with minimal oldText — target only the changed sentence/paragraph |
| **Red team findings** | Patch the risk assessment table or security section with targeted edits |

**Rules for in-place edits:**
- **Preserve structure:** Never delete a section that still has valid content.
- **Bump version:** Increment `version` in YAML front matter when making substantive changes.
- **One edit per section:** Group all changes to a single section into one `edit` call.
- **Diagrams are self-contained:** Edit only the ````mermaid ... ```` code block, not surrounding content.

**Core principles:**
- Use `##` for top-level sections, `###` for subsections — this structure enables precise targeted edits
- Every section should have a visual anchor (diagram, table, or callout) — not just paragraphs
- Use emoji indicators: 🟢 approved/safe, 🟡 warnings/trade-offs, 🔴 risks/blockers, 🔵 info/neutral
- Label diagrams so they stand alone with a caption line below each Mermaid block
- Keep tables narrow and scannable

### 6. Review Loop
*   Ask: "Walk me through the spec — does the architecture diagram match your mental model?"
*   Iterate on both content and clarity until approved.
*   For each iteration, use targeted `edit` calls (see drafting guidance) — never rewrite the entire file.

### 7. Handoff
*   Set status to `approved` in the YAML front matter.
*   Create initial `.ralph/dev-cycle-[FEATURE].md` checklist at repo root with feature prompt and blank iteration log.
*   Ask if the user is ready to begin implementation based *strictly* on this spec.

---

## Markdown Template

Use this template as the starting point. Fill in all `[PLACEHOLDER]` content and remove unused sections.

```markdown
---
name: [FEATURE_NAME]
status: draft            # draft | review | approved
author: [AUTHOR]
created: [DATE]
version: 1.0.0
---

# [FEATURE_NAME] — Specification

> **Status:** 🟡 DRAFT · **Version:** 1.0.0 · **Author:** [AUTHOR] · **Created:** [DATE]

---

## Problem Statement

[Describe the problem, its impact, and why now. Use data/metrics if available.]

**Key metrics / evidence:**
- [METRIC_1]
- [METRIC_2]

---

## Environment Constraints

### Filesystem

| Path | Constraint | Impact |
|------|-----------|--------|
| [READ_ONLY_PATH] | Read-only — tests must use writable temp directories | [DETAIL] |

### Hardware & Runtime

| Resource | Available | Notes |
|----------|-----------|-------|
| GPU / CUDA | [yes/no] | Affects [CODE_PATHS] |
| [OTHER_RESOURCE] | [yes/no] | [NOTES] |

> 🟡 **Impact on Implementation:** [How these constraints affect the implementation strategy and testing approach]

---

## User Stories

| # | Story | Priority | Acceptance Criteria |
|---|-------|----------|---------------------|
| 1 | As a [role], I want [goal], so that [reason]. | 🔴 High | [CRITERIA] |
| 2 | As a [role], I want [goal], so that [reason]. | 🟡 Medium | [CRITERIA] |

---

## Proposed Solution

### Overview

[HIGH_LEVEL_SUMMARY]

### Architecture Diagram

````mermaid
graph TD
    A[Client] --> B[API Gateway]
    B --> C[Service A]
    B --> D[Service B]
    C --> E[(Database)]
    D --> F[(Cache)]
````

*Caption: High-level system architecture showing request flow.*

### Trade-off Analysis

| Aspect | Approach A | Approach B (Selected) |
|--------|------------|-----------------------|
| **Pros** | [PRO_A] | ✅ [PRO_B] |
| **Cons** | [CON_A] | [CON_B] |
| **Complexity** | [LEVEL] | [LEVEL] |

> 🟢 **Decision:** [CHOSEN_APPROACH] — [Rationale for the chosen approach]

---

## Data Model Changes

### Entity-Relationship Diagram

````mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    USERS {
        string id PK
        string email
        string name
    }
    ORDERS {
        string id PK
        string user_id FK
        float total
        string status
    }
````

*Caption: Entity-relationship diagram showing new and modified models.*

### Schema Details

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `field_name` | string | NOT NULL, UNIQUE | Description here |

---

## API Interface

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| 🔵 GET | `/api/resource` | [DESCRIPTION] | Yes/No |
| 🟢 POST | `/api/resource` | [DESCRIPTION] | Yes |
| 🟡 PUT | `/api/resource/:id` | [DESCRIPTION] | Yes |
| 🔴 DELETE | `/api/resource/:id` | [DESCRIPTION] | Admin |

### Request/Response Examples

<details>
<summary>Expand examples</summary>

```json
// Request
{ "key": "value" }

// Response (200)
{ "data": { ... }, "meta": { ... } }
```

</details>

---

## Implementation Plan

| Phase | Milestone | Complexity | Dependencies | Timeline |
|-------|-----------|------------|--------------|----------|
| **Phase 1 — Core** | [MILESTONE] | 🟡 Medium | [DEPS] | Week 1-2 |
| **Phase 2 — Polish** | [MILESTONE] | 🟢 Low | Phase 1 | Week 3 |
| **Phase 3 — Launch** | [MILESTONE] | 🟡 Medium | Phase 1-2 | Week 4 |

---

## Risk Assessment

| # | Risk | Likelihood | Impact | Severity | Mitigation |
|---|------|------------|--------|----------|------------|
| R1 | [RISK_DESCRIPTION] | Medium | High | 🔴 High | [MITIGATION_PLAN] |
| R2 | [RISK_DESCRIPTION] | Low | Medium | 🟡 Medium | [MITIGATION_PLAN] |

### Error Scenarios

<details>
<summary>Expand error scenarios</summary>

- **[ERROR_CASE]:** [HANDLING_STRATEGY]

</details>

---

## Security & Privacy

### Risks

🔴 [SECURITY_CONCERN_1]
🔴 [SECURITY_CONCERN_2]

### Safeguards

🟢 [PROTECTIVE_MEASURE_1]
🟢 [PROTECTIVE_MEASURE_2]

---

## Testing Strategy

> 🔴 **Mandatory: E2E Validation Against Real Environments** — Testing strategy MUST include E2E validation against real environments, NOT mocks. Mocks hide the bugs that Ralph review is supposed to find. For each critical path, specify the real environment target and what observable behavior change confirms success.

| Layer | Scope | Key Scenarios | Environment |
|-------|-------|---------------|-------------|
| Unit | [SCOPE] | [SCENARIOS] | Sandbox OK |
| Integration | [SCOPE] | [SCENARIOS] | Sandbox OK |
| E2E | [SCOPE] | [SCENARIOS with observable behavior change] | [REAL ENVIRONMENT — e.g., /opt/ComfyUI checkout] |
| Regression | Bugs discovered during implementation | Reproduction test for each found bug | Sandbox or real |

---

## Rollout & Rollback

### Rollout Sequence

````mermaid
sequenceDiagram
    participant D as Deploy Pipeline
    participant F as Feature Flag
    participant S as Staging
    participant P as Production
    D->>S: Deploy canary
    F-->>S: Toggle ON (5%)
    Note over S,P: Monitor metrics
    F-->>P: Gradual ramp 10% → 50% → 100%
````

*Caption: Gradual rollout strategy with feature flag gating.*

### Rollback Plan

> 🟡 [Steps to safely roll back if issues are detected]

---

## Open Questions

- [ ] [QUESTION_1]
- [ ] [QUESTION_2]

---

*Generated by generate-spec · [DATE]*
```

## Tips for Markdown Quality

- **One diagram per concept** — don't cram multiple ideas into one Mermaid chart
- **Prefer tables over paragraphs** for structured data (APIs, schemas, risks)
- **Use `<details>` blocks** for verbose sections (raw request/response examples, error lists) to keep the doc scannable
- **Emoji has meaning** — stick to the semantic palette: 🟢 safe/approved, 🟡 caution/trade-off, 🔴 risk/blocker, 🔵 info/neutral
- Always caption diagrams so they're understandable out of context
- **Use `---` horizontal rules** between major sections for visual separation
- **Keep YAML front matter accurate** — it's the source of truth for status/version tracking
