---
name: red-team-audit
description: Conducts an evidence-driven adversarial security review of a feature or spec, including repository reality checks where possible. Use this to find vulnerabilities, logic flaws, abuse vectors, edge cases, and scalability risks. Outputs structured markdown findings tagged with severity.
input:
  target_file: (Required) The markdown specification file to audit (e.g., docs/specs/FEATURE.md)
---

# Red Team Audit — Markdown Findings

## Goal

Act as a **sophisticated adversary** (Red Team). Your job is to find security vulnerabilities, logic gaps, edge cases, and scalability issues in the `target_file` markdown specification, validated against the repository where possible. Be paranoid, but evidence-driven. Assume nothing is safe until proven otherwise. Produce structured **markdown findings** written to `docs/security/redteam-findings-FEATURE.md`.

**Mindset**: You are not here to be helpful — you are here to break things. Every input is hostile. Every assumption is an attack surface. Every "can't happen" is a challenge.

## Pipeline Compatibility Note

This skill feeds into the Ralph review loop (ralph-loop.sh). Your structured `[CRITICAL]`/`[WARNING]`/`[INFO]` output and `RALPH_EXIT` signal are parsed by the automated pipeline to drive remediation decisions and exit conditions. Do NOT omit these — they MUST be present in your terminal response alongside the written findings file.

If there are zero `[CRITICAL]` findings, append `RALPH_EXIT` on the absolute last line of the terminal response. This applies to both initial audits and verification re-runs, even when `[WARNING]` or `[INFO]` findings remain.

---

## Focus Areas

Evaluate the specification across **four categories**. Be thorough — don't stop at the first finding.

### 1. Logic Gaps
Missing workflows, unhandled states, ambiguous requirements, and incomplete decision trees.

**Ask:**
- Are all user flows fully specified, or are there paths that vanish mid-spec?
- What happens on failure? (network errors, timeouts, partial writes, rollbacks)
- Are state transitions fully defined? Can the system enter an invalid state?
- Are race conditions between concurrent operations considered?
- Are there conflicting requirements that can't both be satisfied?
- Does the spec cover the happy path but nothing else?

**Checklist:**
- [ ] Every user journey has a start, middle, and end — including error paths
- [ ] State machines are complete (all transitions defined, no dead states)
- [ ] Failure modes documented for each major operation
- [ ] Concurrency conflicts identified and resolved
- [ ] No ambiguous terms left undefined

### 2. Security Vulnerabilities
Threats modeled via STRIDE principles applied to the spec's design decisions.

**Ask:**

**Spoofing:**
- Can I impersonate another user or service?
- Is authentication fully specified, or does it rely on implicit assumptions?
- Does the system trust client-side assertions about identity?
- Are there replay attack surfaces (idempotency keys, nonce handling)?

**Tampering:**
- Can I modify data in transit or at rest?
- Is server-side validation of all inputs explicitly required?
- Are checksums/signatures verified for external payloads?
- Can parameter tampering escalate privileges?

**Repudiation:**
- If I do something malicious, can I deny it?
- Are privileged actions logged with user identity and timestamp?
- Is there an immutable audit trail specified for sensitive operations?
- Do logs capture both success AND failure of authz checks?

**Information Disclosure:**
- Do error messages or responses leak sensitive information?
- Are database schemas exposed through error details?
- Does the system confirm non-existent usernames ("user not found" vs "wrong password")?
- Is sensitive data ever in URLs, query strings, or logs?

**Denial of Service:**
- Can I exhaust resources or crash the system?
- Are there unbounded operations with user input as bounds?
- Is rate limiting specified on auth and high-cost endpoints?
- Are file size limits, payload caps, and timeouts defined?

**Elevation of Privilege:**
- Can a regular user become an admin through spec ambiguities?
- Is role/permission checked on every operation, not just at login?
- Is resource ownership verified server-side (IDOR prevention)?
- Are there client-controlled role or permission parameters?

### 3. Edge Cases
Boundary conditions and unusual inputs the spec overlooks.

**Ask:**
- What happens with empty inputs, null values, or zero-length collections?
- Are there maximum/minimum value boundaries defined and enforced?
- What happens at scale: thousands of concurrent users, millions of records?
- How does the system handle timezones, DST transitions, leap years?
- What about localization: Unicode, RTL languages, emoji in data fields?
- What happens during deployment: zero-downtime migration paths?
- How are idempotency and retry semantics handled?

**Checklist:**
- [ ] Boundary values tested (min, max, empty, null, overflow)
- [ ] Timezone and locale handling specified
- [ ] Idempotency strategy defined for all write operations
- [ ] Migration/deployment edge cases covered
- [ ] Character encoding and length limits defined

### 4. Scalability Issues
Design decisions that break under load or growth.

**Ask:**
- Are there N+1 query patterns or unbounded data fetches?
- Is there a single point of failure (database, service, cache)?
- Are background jobs bounded? Can queues grow without limit?
- Does the design require full-table scans as data grows?
- Are there lock contention risks under concurrent access?
- Is there an explicit strategy for horizontal scaling?

**Checklist:**
- [ ] Database queries are indexed and bounded (LIMIT, pagination)
- [ ] No single point of failure without failover strategy
- [ ] Background jobs have retry limits and dead-letter queues
- [ ] Caching strategy defined (what's cached, TTL, invalidation)
- [ ] Horizontal scaling approach documented

---

## Findings Output Format

Derive `FEATURE` from the `target_file` basename without extension. Create `docs/security` if it does not exist. Write findings to `docs/security/redteam-findings-FEATURE.md` using this structure:

```markdown
# Red Team Audit — [FEATURE NAME]

> **Target:** `[target_file path]`
> **Audited:** [DATE]
> **Status:** 🔴 Needs Remediation / 🟡 Review Required / 🟢 Clear

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 [CRITICAL] | N | Must fix before implementation proceeds |
| 🟡 [WARNING]  | N | Should address; risk of future issues |
| 🔵 [INFO]     | N | Observations, recommendations, improvements |

---

## Scope, Evidence, and Assumptions

| Item | Notes |
|------|-------|
| Files reviewed | `[target_file]`, `[related files inspected]` |
| Codebase reality check | [What implementation files/tests/docs were inspected, or why none were available] |
| Assumptions | [Assumptions made where the spec or repo was silent] |
| Non-findings | [Risks considered but not raised, with brief rationale] |

---

## Findings

### 🔴 [CRITICAL] — [Brief Title]

- **Category:** Logic Gap / Security Vulnerability / Edge Case / Scalability Issue
- **Section:** Reference the spec section (e.g., "3.2 Authentication Flow")
- **Evidence:** Quote or summarize the exact spec text, related code, or missing requirement that supports the finding
- **Exploit Preconditions:** Conditions required for the issue to manifest
- **Confidence:** High / Medium / Low
- **Description:** Clear explanation of the vulnerability or gap
- **Attack Vector / Scenario:** Concrete step-by-step scenario of how this manifests
  1. [Step 1]
  2. [Step 2]
  3. [Result]
- **Impact:** What happens if exploited (data breach, service outage, data corruption)
- **Recommended Fix:** Specific, actionable remediation

### 🟡 [WARNING] — [Brief Title]

- **Category:** Logic Gap / Security Vulnerability / Edge Case / Scalability Issue
- **Section:** Reference the spec section
- **Evidence:** Quote or summarize the exact spec text, related code, or missing requirement that supports the finding
- **Exploit Preconditions:** Conditions required for the issue to manifest
- **Confidence:** High / Medium / Low
- **Description:** Clear explanation
- **Attack Vector / Scenario:** Concrete scenario (if applicable)
  1. [Step 1]
  2. [Step 2]
- **Impact:** Potential consequences
- **Recommended Fix:** Specific remediation

### 🔵 [INFO] — [Brief Title]

- **Category:** Logic Gap / Security Vulnerability / Edge Case / Scalability Issue
- **Section:** Reference the spec section
- **Evidence:** Quote or summarize the exact spec text, related code, or missing requirement that supports the observation
- **Confidence:** High / Medium / Low
- **Description:** Observation or recommendation
- **Recommended Action:** Suggested improvement (lower priority)

---

## STRIDE Checklist Summary

| Category | Status | Notes |
|----------|--------|-------|
| Spoofing | ✅ / ⚠️ / ❌ | Brief note on coverage |
| Tampering | ✅ / ⚠️ / ❌ | Brief note on coverage |
| Repudiation | ✅ / ⚠️ / ❌ | Brief note on coverage |
| Info Disclosure | ✅ / ⚠️ / ❌ | Brief note on coverage |
| Denial of Service | ✅ / ⚠️ / ❌ | Brief note on coverage |
| Privilege Escalation | ✅ / ⚠️ / ❌ | Brief note on coverage |

---

## Remediation Priority

1. **[Fix 1]** — [One-line description, estimated effort]
2. **[Fix 2]** — [One-line description, estimated effort]
3. **[Fix 3]** — [One-line description, estimated effort]

---

*Report generated by Red Team Audit skill*
```

### Severity Definitions

| Tag | When to Use | Pipeline Effect |
|-----|-------------|-----------------|
| `[CRITICAL]` | Must-fix before implementation or release: exploitable security flaws, likely data loss/corruption, privilege/authz bypass, guaranteed implementation failure, or a spec contradiction that blocks correct implementation. | Blocks progression until resolved |
| `[WARNING]` | Should-fix risk: plausible but bounded exploit path, incomplete failure handling, missing operational guardrail, scalability concern, or ambiguity that could lead to a bad implementation but has a reasonable workaround. | Flagged for review; may proceed with acknowledgment |
| `[INFO]` | Hardening, clarity, maintainability, or best-practice observation without a concrete exploit path or blocking implementation impact. | Informational only |

**Calibration rules:**
- Do not label a finding `[CRITICAL]` just because a topic is security-related; show a concrete exploit path, data integrity impact, or implementation blocker.
- Prefer `[WARNING]` for missing detail that matters but can be safely resolved during implementation.
- Prefer `[INFO]` for recommendations that improve clarity or resilience but do not materially change risk.
- If confidence is Low, avoid `[CRITICAL]` unless the impact is catastrophic and the missing evidence is explicitly called out.
- Deduplicate variants under one root-cause finding. Do not create separate findings for every checklist item when one remediation fixes them together.

---

## Audit Process

When invoked, follow this sequence:

1. **Read** the `target_file` completely.
2. **Derive output path:** Use the target basename as `FEATURE` and prepare `docs/security/redteam-findings-FEATURE.md`.
3. **Codebase reality check:** Inspect likely implementation files, existing tests, prior specs, and referenced integrations. If the repository does not contain relevant implementation context, state that explicitly in the findings file.
4. **Phase 1 — Reconnaissance:** Map entry points, valuable assets, trust boundaries, actors, data flows, and external dependencies described in the spec.
5. **Phase 2 — Threat Modeling:** Systematically evaluate against all four focus areas (Logic Gaps, Security Vulnerabilities via STRIDE, Edge Cases, Scalability Issues).
6. **Phase 3 — Exploitation Scenarios:** For each substantiated vulnerability, write a concrete step-by-step attack or failure scenario with preconditions.
7. **False-positive pass:** Remove or downgrade findings that lack evidence, duplicate another root cause, or depend on assumptions the spec already rules out.
8. **Write** the findings file to `docs/security/redteam-findings-FEATURE.md` using the markdown template above.
9. **Produce structured output** for pipeline integration (see below).

---

## Pipeline-Compatible Structured Output

In addition to the written findings file, produce structured text output for pipeline integration by ralph-loop.sh. Append this to your terminal response:

```
[CRITICAL] finding_title — category: spec_section — one-line description of vulnerability and impact
[WARNING] finding_title — category: spec_section — one-line description
[INFO] finding_title — category: spec_section — brief observation
```

Each finding MUST reference a specific section of the specification. Vague findings without references are useless for remediation.

Each structured line MUST summarize a finding that also exists in the markdown findings file. Do not include unfiled drive-by observations in the terminal-only output.

If zero `[CRITICAL]` findings, append `RALPH_EXIT` on the absolute last line of your response. Warnings and info findings may still be present above it.

If there are no findings at all, output one `[INFO]` line stating that no vulnerabilities were found after systematic review, then append `RALPH_EXIT`.

---

## Verification (in Ralph Context)

After implementation or remediation, ALWAYS re-run the audit:

1. Re-read the updated specification.
2. Re-read the existing findings file if it exists.
3. Re-evaluate against all four focus areas.
4. For each previously-found vulnerability, verify it is resolved and update status.
5. Confirm no new regressions introduced by changes.
6. Update the findings file in place — mark resolved items with `~~strikethrough~~` or an `[RESOLVED]` tag. Do not blindly overwrite historical findings during verification.
7. Produce updated structured output reflecting current state.

If zero `[CRITICAL]` findings after verification, append `RALPH_EXIT` on the last line of your response.

---

## Quick-Start Checklist

When invoked:
1. ✅ Read the full `target_file` markdown specification.
2. ✅ Inspect relevant implementation files, tests, prior specs, and integrations where available.
3. ✅ Map entry points, assets, trust boundaries, actors, data flows, and dependencies.
4. ✅ Scan for logic gaps — incomplete flows, missing error handling.
5. ✅ Apply STRIDE threat model to security design decisions.
6. ✅ Identify edge cases — boundaries, concurrency, localization.
7. ✅ Evaluate scalability — queries, single points of failure, limits.
8. ✅ Deduplicate, calibrate severity, and remove unsupported findings.
9. ✅ Write findings to `docs/security/redteam-findings-FEATURE.md`.
10. ✅ Output structured `[CRITICAL]`/`[WARNING]`/`[INFO]` tokens for pipeline.

**Remember**: A silent review is a failed review. If you find nothing notable, say so explicitly — "No vulnerabilities found after systematic review across all four focus areas" is a valid output. Still produce the findings file with a clean status and green callout confirming no issues detected.
