---
name: harden-spec
description: Harden a feature specification by patching the markdown spec in-place. Addresses every [CRITICAL] with specific mitigations, addresses every [WARNING] where practical, adds a "Security Considerations" section for residual risks, and writes a structured changelog at docs/specs/harden-changelog-FEATURE.md. Every finding must have a disposition (RESOLVED/DEFERRED/ACKNOWLEDGED). Use after red team audit completes.
input:
  spec_file: (Required) Path to the specification markdown file (e.g., docs/specs/FEATURE.md)
  findings_file: (Required) Path to the red team audit findings file
---

# Harden Spec Skill — Markdown Patching Workflow

## Goal

**Patch the markdown spec in-place using the `harden-spec` skill.** Read both the spec and the audit findings, then apply targeted mitigations. Every `[CRITICAL]` gets a specific mitigation — no exceptions. Every `[WARNING]` is addressed where practical or deferred with justification. A "Security Considerations" section captures residual risks. A structured changelog documents every disposition.

**Mindset**: You are a security-minded engineer reviewing peer feedback. Every finding gets a disposition — RESOLVED, DEFERRED, or ACKNOWLEDGED. No finding disappears without explanation.

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

### 3. Build a Finding Registry

Create an internal mapping (structured notes, not a file):

```
Finding # | Severity | Category | Target Section | Mitigation Strategy | Disposition
----------|----------|----------|----------------|--------------------|------------
1         | CRITICAL | IDOR     | API Interface   | Add ownership check | PENDING
2         | WARNING  | DoS      | Implementation  | Rate limiting       | PENDING
3         | INFO     | Logging  | Testing         | Acknowledge only    | SKIPPED
```

---

## Phase 2: Apply Mitigations to Spec

### Patching Strategy

**Use the `harden-spec` skill to patch the markdown spec in-place.** Apply targeted `edit` calls (find-and-replace) for each finding — never rewrite from scratch. This preserves the original author's intent and makes diff review trivial.

### Priority Order

1. **`[CRITICAL]` findings first** — These block implementation. Fix them before touching anything else.
2. **`[WARNING]` findings second** — Apply practical fixes; defer only with explicit justification.
3. **`[INFO]` findings last** — Log acknowledgments without modifying the spec body.

### How to Patch Each Finding

For each `[CRITICAL]` and addressable `[WARNING]`:

#### a) Locate the Target Section

Find the relevant section in the spec using `##` / `###` headings. Patch inline at the affected section whenever possible.

#### b) Apply the Mitigation

Choose one of these patterns based on the finding type:

**Pattern A — Add to "Security Considerations" Section**

For mitigations that don't map cleanly to an existing section, add or append them to the spec's **Security Considerations** section (see Phase 3). Each entry gets a structured card:

```markdown
### [FINDING_TITLE] — RESOLVED

- **Risk**: [One-line summary of the vulnerability]
- **Mitigation**: [Specific technical control being added]
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
| **RESOLVED** | Mitigation applied in the spec |
| **DEFERRED** | Out of scope — rationale documented with revisit trigger |
| **ACKNOWLEDGED** | Noted but no action required (INFO findings) |

```
Finding #1 → RESOLVED — Section: Security Considerations > [TITLE]
```

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

Do not modify the spec body. Record acknowledgments only in the changelog with disposition `ACKNOWLEDGED`.

---

## Phase 3: Finalize the Hardened Spec

### 3a — Update Front Matter

Update the YAML front matter in `docs/specs/FEATURE.md` to reflect its hardened status:

```yaml
status: hardened
hardened_date: YYYY-MM-DD
hardened_findings_addressed: [N] CRITICAL, [M] WARNING resolved, [D] WARNING deferred, [K] INFO acknowledged
```

### 3b — Add "Security Considerations" Section

If not already present, add a **Security Considerations** section to the spec (place it after Testing Strategy, before Rollout). This is the canonical location for residual risks and deferred findings:

```markdown
## Security Considerations

> This section documents findings from the red team audit. Every finding has a disposition: RESOLVED, DEFERRED, or ACKNOWLEDGED.

### [FINDING_TITLE] — RESOLVED

- **Risk**: [summary]
- **Mitigation**: [specific control added]
- **Verification**: [how to confirm]

### [DEFERRED_FINDING] — DEFERRED

- **Risk**: [summary]
- **Rationale**: [why deferred, what trigger revisits it]
- **Residual impact if exploited**: [consequence]
```

**Rules for this section:**

- Include every `[CRITICAL]` and `[WARNING]` finding with its disposition
- Resolved items can also live inline near the affected spec section — add a cross-reference here (see "Security Considerations > [TITLE]")
- Deferred items **must** remain here with explicit rationale
- This section is the single source of truth for "what risks exist and what was done about them"

---

## Phase 4: Write the Harden Changelog

Create a structured markdown changelog documenting every change. This is the handoff artifact for implementation and review phases.

**File**: `docs/specs/harden-changelog-FEATURE.md`

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

## Changes by Finding

### 🔴 CRITICAL — All Resolved

#### Finding #1: [Title from audit] — **RESOLVED**
- **Disposition**: RESOLVED
- **Original spec section**: `[section heading or "N/A — new section"]`
- **Mitigation applied**: [Description of the specific change]
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

> Every finding from the audit must appear in this table. No gaps.

## Residual Risks

[Deferred risks and their monitoring/detection strategy. Cross-reference to Security Considerations section in the spec.]

## Sign-off

- [ ] All `[CRITICAL]` findings have documented mitigations
- [ ] All `[WARNING]` findings are resolved or deferred with justification
- [ ] "Security Considerations" section present in spec
- [ ] Spec YAML front matter updated to `hardened` status
- [ ] Changelog cross-reference table complete (no finding skipped without explanation)
```

---

## Phase 5: Final Review & Handoff

### 1. Cross-Reference Check

Verify every finding from the audit has a corresponding entry in the changelog:

```
For each [CRITICAL] in findings_file → exists in changelog with RESOLVED disposition
For each [WARNING] in findings_file  → exists in changelog as RESOLVED or DEFERRED
For each [INFO] in findings_file     → exists in changelog as ACKNOWLEDGED
```

**Cross-reference: every finding must have a disposition (RESOLVED/DEFERRED/ACKNOWLEDGED).** No exceptions.

### 2. Read the Hardened Spec

Read back the patched spec file to confirm:
- All patches applied cleanly (no orphaned HTML comments, no broken markdown)
- The flow still makes sense after additions
- New sections blend with existing content style
- "Security Considerations" section is complete and accurate

### 3. Update Pipeline Checklist

Update `.ralph/dev-cycle-FEATURE.md` with hardening completion:

```markdown
## Phase 3: Harden Spec — ✅ COMPLETE

- Findings addressed: [N] CRITICAL, [M] WARNING resolved, [D] WARNING deferred — all tracked in changelog
- Security Considerations section added to `docs/specs/FEATURE.md`
- Changelog: `docs/specs/harden-changelog-FEATURE.md`
```

### 4. Signal Completion

Output the summary:

```markdown
## Harden Spec — Complete

**Feature**: [FEATURE]
**Status**: HARDENED

| Metric | Value |
|--------|-------|
| Critical findings resolved | [N]/[N] ✅ |
| Warnings resolved/deferred | [M]/[M] ✅ |
| Info acknowledged | [K]/[K] |
| Spec file updated | `docs/specs/FEATURE.md` |
| Changelog written | `docs/specs/harden-changelog-FEATURE.md` |
| Security Considerations section | Added to spec |

Ready for Phase 4 (TDD Implementation). The hardened spec is the source of truth.
```

---

## Quick-Start Checklist

1. Read `spec_file` (`docs/specs/FEATURE.md`) and `findings_file`.
2. Classify all findings into CRITICAL / WARNING / INFO buckets.
3. Patch the markdown spec in-place with targeted `edit` calls — one per finding, never rewrite.
4. Address every `[CRITICAL]` with specific mitigations — no exceptions.
5. Address every `[WARNING]` where practical; document deferral rationale if skipped.
6. Add/update "Security Considerations" section for residual risks and deferred items.
7. Update spec YAML front matter to `hardened` status.
8. Write structured changelog at `docs/specs/harden-changelog-FEATURE.md`.
9. Cross-reference: every finding must have disposition (RESOLVED/DEFERRED/ACKNOWLEDGED) in both the changelog and the spec.
10. Read back hardened spec to verify patch quality.
11. Update pipeline checklist and signal completion.

**Golden rules**:
- Every `[CRITICAL]` gets a specific mitigation — no exceptions
- Every `[WARNING]` is addressed or deferred with explicit rationale
- "Security Considerations" section captures residual risks
- Every finding has a disposition (RESOLVED/DEFERRED/ACKNOWLEDGED) tracked in both the spec and changelog
- Never rewrite the spec from scratch — always patch in-place
