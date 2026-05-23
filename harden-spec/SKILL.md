---
name: harden-spec
description: Harden a feature specification by patching the markdown spec in-place with verified mitigations. Addresses every [CRITICAL] with specific mitigations, addresses every [WARNING] where practical, adds a "Security Considerations" section for residual risks, and writes or updates a structured changelog at docs/specs/harden-changelog-FEATURE.md. Every finding must have a disposition. Use after red team audit completes.
input:
  spec_file: (Required) Path to the specification markdown file (e.g., docs/specs/FEATURE.md)
  findings_file: (Required) Path to the red team audit findings file
---

# Harden Spec Skill — Markdown Patching Workflow

## Goal

**Patch the markdown spec in-place using the `harden-spec` skill.** Read both the spec and the audit findings, then apply targeted mitigations that close the original exploit or failure scenario. Every valid `[CRITICAL]` gets a specific mitigation — no exceptions. Every `[WARNING]` is addressed where practical or deferred with justification. A "Security Considerations" section captures residual risks. A structured changelog documents every disposition.

**Mindset**: You are a security-minded engineer reviewing peer feedback. Every finding gets a disposition — RESOLVED, DEFERRED, ACKNOWLEDGED, ACKNOWLEDGED_WITH_PATCH, REJECTED, or NOT_APPLICABLE. No finding disappears without explanation, and a mitigation is not resolved until the hardened spec makes the original bad scenario impossible, bounded, or explicitly accepted as residual risk.

---

## Phase 1: Ingest & Classify Findings

### 1. Read Inputs

Read both files in full:

```
spec_file     → docs/specs/FEATURE.md
findings_file → red team audit output (markdown or structured text)
```

### 2. Parse Findings by Severity

Extract all findings and classify into three buckets:

| Bucket | Tag | Action |
|--------|-----|--------|
| **Must Fix** | `[CRITICAL]` | Address with specific mitigation — no exceptions |
| **Should Fix** | `[WARNING]` | Address if practical; document deferral reason if skipped |
| **Note Only** | `[INFO]` | Acknowledge in changelog; no spec change required |

When available, preserve the audit's evidence, exploit preconditions, confidence, and original scenario in your internal notes. These fields are required for validating whether the hardening patch actually resolves the finding.

### 3. Build a Finding Registry

Create an internal mapping (structured notes, not a file):

```
Finding # | Severity | Target Section | Evidence | Original Scenario | Mitigation Strategy | Disposition
----------|----------|----------------|----------|-------------------|--------------------|------------
1         | CRITICAL | API Interface   | Missing ownership check | IDOR profile read | Add server ownership check | PENDING
2         | WARNING  | Implementation  | No rate limit | Burst DoS | Add rate limit and queue cap | PENDING
3         | INFO     | Testing         | Missing clarity | N/A | Acknowledge only | PENDING
```

---

## Phase 2: Apply Mitigations to Spec

### Patching Strategy

**Use the `harden-spec` skill to patch the markdown spec in-place.** Apply targeted edits grouped by target section or shared root cause — never rewrite from scratch. This preserves the original author's intent and makes diff review trivial.

### Priority Order

1. **`[CRITICAL]` findings first** — These block implementation. Fix them before touching anything else.
2. **`[WARNING]` findings second** — Apply practical fixes; defer only with explicit justification.
3. **`[INFO]` findings last** — Usually log acknowledgments without modifying the spec body; apply a small spec patch only when it improves implementation clarity without expanding scope.

### How to Patch Each Finding

For each valid `[CRITICAL]` and addressable `[WARNING]`:

#### a) Locate the Target Section

Find the relevant section in the spec using `##` / `###` headings. Patch inline at the affected section whenever possible.

If multiple findings target the same section or share a root cause, apply one coherent section patch and map all affected findings to that patch in the changelog. Do not create repetitive or conflicting edits merely to maintain "one edit per finding."

#### b) Apply the Mitigation

Choose one of these patterns based on the finding type:

Before marking a finding `RESOLVED`, perform a mitigation-effectiveness check:

```markdown
- **Before:** [How the original exploit/failure scenario worked]
- **After:** [Which new requirement blocks, bounds, detects, or explicitly accepts it]
- **Verification:** [Specific test, review check, metric, or operational signal that proves the mitigation]
```

If the "After" statement does not directly answer the original scenario, the finding is still unresolved.

**Pattern A — Add to "Security Considerations" Section**

For mitigations that don't map cleanly to an existing section, add or append them to the spec's **Security Considerations** section (see Phase 3). Each entry gets a structured card:

```markdown
### [FINDING_TITLE] — RESOLVED

- **Risk**: [One-line summary of the vulnerability]
- **Mitigation**: [Specific technical control being added]
- **Before**: [Original exploit/failure path]
- **After**: [Why the path is now blocked, bounded, or detected]
- **Verification**: [How to confirm the mitigation works]
```

**Pattern B — Augment Existing Section (inline update)**

When a finding relates to an existing section that needs strengthening, patch the section content:

```markdown
<!-- BEFORE -->
### API Authentication
All endpoints require valid JWT token.

<!-- AFTER -->
### API Authentication
All endpoints require valid JWT token with RS256 signing (not HS256).
Tokens are validated server-side on every request — client-side role claims are never trusted.
Expired tokens trigger a 401 with no user-specific error message (prevents user enumeration).
```

**Pattern C — Add to Risk Table (tabular update)**

When the spec has a risk/edge case table, add rows for findings that introduce new risks:

```markdown
| Risk | Likelihood | Impact | Mitigation | Status |
|------|-----------|--------|------------|--------|
| [NEW] IDOR on user profiles | Medium | High | Server-side ownership check on all resource lookups | MITIGATED |
```

#### c) Record Disposition

Every finding must have a disposition tracked in both the spec and the changelog:

| Disposition | Meaning |
|-------------|---------|
| **RESOLVED** | Mitigation applied in the spec and verified against the original exploit/failure scenario |
| **DEFERRED** | Out of scope — rationale documented with revisit trigger |
| **ACKNOWLEDGED** | Noted but no action required (INFO findings) |
| **ACKNOWLEDGED_WITH_PATCH** | Info-level finding acknowledged and patched for clarity without changing scope |
| **REJECTED** | Finding is invalid, duplicate, or contradicted by evidence; requires cited evidence |
| **NOT_APPLICABLE** | Finding does not apply to this feature after scope/codebase review; requires cited evidence |

```
Finding #1 → RESOLVED — Section: Security Considerations > [TITLE] — Verification: [test/review check]
```

Do not reject or mark a `[CRITICAL]` as not applicable without explicit evidence and user confirmation, unless it is a clear duplicate of another finding that is being resolved.

### Special Handling for `[WARNING]` Findings

For each warning:

- **If practical to fix**: Apply using the same patterns above. Mark as `RESOLVED`.
- **If impractical or out of scope**: Add a deferral note in the spec's risk table or Security Considerations section:

```markdown
### [WARNING_TITLE] — DEFERRED

- **Risk**: [summary of the concern]
- **Rationale**: [why deferral is acceptable now]
- **Revisit trigger**: [what condition causes this to be revisited]
- **Residual impact if exploited**: [consequence]
```

### Special Handling for `[INFO]` Findings

Default to changelog-only acknowledgment with disposition `ACKNOWLEDGED`. If an info finding reveals a cheap clarity or maintainability improvement that helps implementation without expanding scope, apply a small targeted spec patch and record the disposition as `RESOLVED` or `ACKNOWLEDGED_WITH_PATCH` in the changelog.

---

## Phase 3: Finalize the Hardened Spec

### 3a — Update Front Matter

Update the YAML front matter in `docs/specs/FEATURE.md` to reflect hardening without breaking the status vocabulary established by the spec generator. Do not overwrite `status: draft | review | approved` with a new unsupported status unless this repository already uses `status: hardened`.

```yaml
hardened: true
hardened_date: YYYY-MM-DD
hardened_findings_addressed: [N] CRITICAL resolved, [M] WARNING resolved, [D] WARNING deferred, [K] INFO acknowledged, [X] rejected/not applicable
```

### 3b — Add "Security Considerations" Section

If not already present, add a **Security Considerations** section to the spec (place it after Testing Strategy, before Rollout). This is the canonical location for residual risks and deferred findings:

```markdown
## Security Considerations

> This section documents findings from the red team audit. Every finding has a disposition: RESOLVED, DEFERRED, ACKNOWLEDGED, ACKNOWLEDGED_WITH_PATCH, REJECTED, or NOT_APPLICABLE.

### [FINDING_TITLE] — RESOLVED

- **Risk**: [summary]
- **Mitigation**: [specific control added]
- **Before**: [original exploit/failure path]
- **After**: [why the path is now blocked, bounded, or detected]
- **Verification**: [how to confirm]

### [DEFERRED_FINDING] — DEFERRED

- **Risk**: [summary]
- **Rationale**: [why deferred, what trigger revisits it]
- **Residual impact if exploited**: [consequence]
```

**Rules for this section:**

- Include every `[CRITICAL]` and `[WARNING]` finding with its disposition
- Affected spec sections are the source of implementation requirements; this section is the risk/disposition index and residual-risk ledger
- Resolved items can also live inline near the affected spec section — add a cross-reference here to the implementation requirement
- Deferred items **must** remain here with explicit rationale
- This section is the single source of truth for "what risks exist and what was done about them," not a replacement for precise requirements in the relevant spec sections

---

## Phase 4: Write the Harden Changelog

Create or update a structured markdown changelog documenting every change. This is the handoff artifact for implementation and review phases.

**File**: `docs/specs/harden-changelog-FEATURE.md`

If the changelog already exists, preserve prior history and add a new dated hardening run section. Do not overwrite previous hardening records unless the user explicitly asks for a clean rewrite.

**Template**:

```markdown
# Hardening Changelog — [FEATURE]

**Date**: YYYY-MM-DD
**Based on audit**: [findings file path]
**Hardened spec**: `docs/specs/FEATURE.md`

## Summary

| Severity | Total Findings | Resolved | Deferred | Acknowledged (no change) |
|----------|---------------|----------|----------|--------------------------|
| CRITICAL | [N] | [N] | 0 | 0 |
| WARNING  | [M] | [R] | [D] | 0 |
| INFO     | [K] | 0 | 0 | [K] |
| REJECTED / N/A | [X] | 0 | 0 | [X] |

## Changes by Finding

### 🔴 CRITICAL — All Resolved

#### Finding #1: [Title from audit] — **RESOLVED**
- **Disposition**: RESOLVED
- **Original spec section**: `[section heading or "N/A — new section"]`
- **Mitigation applied**: [Description of the specific change]
- **Effectiveness check**: Before [original scenario] → After [blocked/bounded/detected behavior]
- **Verification method**: [How to confirm this works during implementation]
- **Diff summary**: [What was added/changed in one line]

#### Finding #2: ...

### 🟡 WARNING — Resolved / Deferred

#### Finding #3: [Title from audit] — **DEFERRED**
- **Disposition**: DEFERRED
- **Rationale**: [Why deferral is acceptable now]
- **Revisit trigger**: [What condition causes this to be revisited]
- **Residual impact**: [Consequence if exploited before revisit]

### ℹ️ INFO — Acknowledged Only

#### Finding #5: [Title from audit] — **ACKNOWLEDGED**
- **Disposition**: ACKNOWLEDGED — no spec change required
- **Note**: [Why this doesn't warrant a mitigation, e.g., "Standard library handles this"]

## Cross-Reference Table

| # | Severity | Title | Disposition | Spec Section |
|---|----------|-------|-------------|--------------|
| 1 | CRITICAL | [TITLE] | **RESOLVED** | Security Considerations > [SUBSECTION] |
| 2 | WARNING  | [TITLE] | **DEFERRED**  | Security Considerations > [SUBSECTION] |
| 3 | INFO     | [TITLE] | **ACKNOWLEDGED** | — |
| 4 | WARNING  | [TITLE] | **REJECTED** | Evidence: [why invalid] |

> Every finding from the audit must appear in this table. No gaps.

## Residual Risks

[Deferred risks and their monitoring/detection strategy. Cross-reference to Security Considerations section in the spec.]

## Sign-off

- [ ] All `[CRITICAL]` findings have documented mitigations
- [ ] All `[WARNING]` findings are resolved or deferred with justification
- [ ] Rejected / not-applicable findings cite evidence and any rejected critical has user confirmation
- [ ] Each resolved finding has a Before / After / Verification check
- [ ] No valid `[CRITICAL]` remains unresolved, deferred, or unverified
- [ ] "Security Considerations" section present in spec
- [ ] Spec YAML front matter updated with hardening metadata without breaking existing status vocabulary
- [ ] Changelog cross-reference table complete (no finding skipped without explanation)
```

---

## Phase 5: Final Review & Handoff

### 1. Cross-Reference Check

Verify every finding from the audit has a corresponding entry in the changelog:

```
For each [CRITICAL] in findings_file → exists in changelog as RESOLVED, REJECTED, or NOT_APPLICABLE
For each [WARNING] in findings_file  → exists in changelog as RESOLVED, DEFERRED, REJECTED, or NOT_APPLICABLE
For each [INFO] in findings_file     → exists in changelog as ACKNOWLEDGED, RESOLVED, ACKNOWLEDGED_WITH_PATCH, REJECTED, or NOT_APPLICABLE
```

**Cross-reference: every finding must have a disposition.** No exceptions. Rejected and not-applicable findings must include evidence; rejected or not-applicable critical findings require user confirmation unless they are clear duplicates of another finding that was resolved.

### 2. Verify Mitigation Effectiveness

Re-evaluate each original finding against the hardened spec:

- Confirm the original attack/failure scenario is blocked, bounded, detected, or explicitly tracked as residual risk.
- Confirm every resolved finding has a concrete implementation requirement, not only a risk note.
- Confirm every verification method is testable by implementation or review.
- Confirm no new contradiction or implementation ambiguity was introduced by the patch.

Do not signal "Ready for Phase 4" if any valid `[CRITICAL]` remains unresolved, deferred, or unverified.

### 3. Read the Hardened Spec

Read back the patched spec file to confirm:
- All patches applied cleanly (no orphaned HTML comments, no broken markdown)
- The flow still makes sense after additions
- New sections blend with existing content style
- "Security Considerations" section is complete and accurate

### 4. Update Pipeline Checklist

If `.ralph/dev-cycle-FEATURE.md` exists, update it with hardening completion. If it does not exist, do not fail hardening solely because the checklist is absent; mention that it was not found in the final summary. Create it only when the surrounding workflow already expects Ralph pipeline files.

```markdown
## Phase 3: Harden Spec — ✅ COMPLETE

- Findings addressed: [N] CRITICAL, [M] WARNING resolved, [D] WARNING deferred — all tracked in changelog
- Security Considerations section added to `docs/specs/FEATURE.md`
- Changelog: `docs/specs/harden-changelog-FEATURE.md`
```

### 5. Signal Completion

Output the summary:

```markdown
## Harden Spec — Complete

**Feature**: [FEATURE]
**Hardening**: COMPLETE

| Metric | Value |
|--------|-------|
| Valid critical findings resolved | [N]/[N] ✅ |
| Warnings resolved/deferred | [M]/[M] ✅ |
| Info acknowledged | [K]/[K] |
| Rejected / not applicable | [X] with evidence |
| Mitigation effectiveness verified | Yes |
| Spec file updated | `docs/specs/FEATURE.md` |
| Changelog written | `docs/specs/harden-changelog-FEATURE.md` |
| Security Considerations section | Added/updated in spec |
| Pipeline checklist | Updated / Not found |

Ready for Phase 4 (TDD Implementation) only if the verification gate passed. The hardened spec is the source of truth.
```

---

## Quick-Start Checklist

1. Read `spec_file` (`docs/specs/FEATURE.md`) and `findings_file`.
2. Classify all findings into CRITICAL / WARNING / INFO buckets.
3. Preserve each finding's evidence, preconditions, confidence, and original scenario when available.
4. Patch the markdown spec in-place with targeted edits grouped by section/root cause — never rewrite.
5. Address every valid `[CRITICAL]` with specific mitigations — no exceptions.
6. Reject or mark findings not applicable only with evidence; ask before rejecting a critical unless it is a duplicate being resolved elsewhere.
7. Address every `[WARNING]` where practical; document deferral rationale if skipped.
8. Add/update "Security Considerations" section for residual risks and deferred items.
9. Update spec YAML front matter with hardening metadata without breaking existing status vocabulary.
10. Write or update structured changelog at `docs/specs/harden-changelog-FEATURE.md`.
11. Cross-reference: every finding must have a disposition in both the changelog and the spec.
12. Verify each resolved mitigation against the original attack/failure scenario.
13. Read back hardened spec to verify patch quality.
14. Update pipeline checklist if present and signal completion only if no valid critical remains unresolved.

**Golden rules**:
- Every valid `[CRITICAL]` gets a specific mitigation — no exceptions
- Every `[WARNING]` is addressed or deferred with explicit rationale
- Resolved means the mitigation closes the original scenario, not merely that text was added
- "Security Considerations" section captures residual risks and disposition history
- Every finding has a disposition tracked in both the spec and changelog
- Never rewrite the spec from scratch — always patch in-place
