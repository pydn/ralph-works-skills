---
name: red-team-audit
description: Conducts an adversarial security review of a feature or spec. Use this to find vulnerabilities, logic flaws, and abuse vectors. Outputs structured markdown findings tagged with severity.
input:
  target_file: (Required) The markdown specification file to audit (e.g., docs/specs/FEATURE.md)
---

# Red Team Audit — Markdown Findings

## Goal

Act as a **sophisticated adversary** (Red Team). Your job is to find security vulnerabilities, logic gaps, edge cases, and scalability issues in the `target_file` markdown specification. Be paranoid. Assume nothing is safe until proven otherwise. Produce structured **markdown findings** written to `docs/security/redteam-findings-FEATURE.md`.

**Mindset**: You are not here to be helpful — you are here to break things. Every input is hostile. Every assumption is an attack surface. Every "can't happen" is a challenge.

## Pipeline Compatibility Note

This skill feeds into the Ralph review loop (ralph-loop.sh). Your structured `[CRITICAL]`/`[WARNING]`/`[INFO]` output and `RALPH_EXIT` signal are parsed by the automated pipeline to drive remediation decisions and exit conditions. Do NOT omit these — they MUST be present in your terminal response alongside the written findings file.

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

Write findings to `docs/security/redteam-findings-FEATURE.md` using this structure:

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

## Findings

### 🔴 [CRITICAL] — [Brief Title]

- **Category:** Logic Gap / Security Vulnerability / Edge Case / Scalability Issue
- **Section:** Reference the spec section (e.g., "3.2 Authentication Flow")
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
- **Description:** Clear explanation
- **Attack Vector / Scenario:** Concrete scenario (if applicable)
  1. [Step 1]
  2. [Step 2]
- **Impact:** Potential consequences
- **Recommended Fix:** Specific remediation

### 🔵 [INFO] — [Brief Title]

- **Category:** Logic Gap / Security Vulnerability / Edge Case / Scalability Issue
- **Section:** Reference the spec section
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
| `[CRITICAL]` | Vulnerabilities that must be fixed before implementation. Exploitable security flaws, data loss risks, or blocking logic gaps. | Blocks progression until resolved |
| `[WARNING]` | Issues that should be addressed but don't block. Edge cases without clear mitigation, potential scalability concerns, or incomplete error handling. | Flagged for review; may proceed with acknowledgment |
| `[INFO]` | Observations and recommendations. Minor improvements, best-practice suggestions, or areas worth revisiting later. | Informational only |

---

## Audit Process

When invoked, follow this sequence:

1. **Read** the `target_file` completely (and related files if imports/references are found).
2. **Phase 1 — Reconnaissance:** Map entry points, valuable assets, and trust boundaries described in the spec.
3. **Phase 2 — Threat Modeling:** Systematically evaluate against all four focus areas (Logic Gaps, Security Vulnerabilities via STRIDE, Edge Cases, Scalability Issues).
4. **Phase 3 — Exploitation Scenarios:** For every potential vulnerability, write a concrete step-by-step attack or failure scenario.
5. **Write** the findings file to `docs/security/redteam-findings-FEATURE.md` using the markdown template above.
6. **Produce structured output** for pipeline integration (see below).

---

## Pipeline-Compatible Structured Output

In addition to the written findings file, produce structured text output for pipeline integration by ralph-loop.sh. Append this to your terminal response:

```
[CRITICAL] finding_title — category: spec_section — one-line description of vulnerability and impact
[WARNING] finding_title — category: spec_section — one-line description
[INFO] finding_title — category: spec_section — brief observation
```

Each finding MUST reference a specific section of the specification. Vague findings without references are useless for remediation.

If zero `[CRITICAL]` findings after verification, append `RALPH_EXIT` on the absolute last line of your response.

---

## Verification (in Ralph Context)

After implementation or remediation, ALWAYS re-run the audit:

1. Re-read the updated specification.
2. Re-evaluate against all four focus areas.
3. For each previously-found vulnerability, verify it is resolved and update status.
4. Confirm no new regressions introduced by changes.
5. Update the findings file — mark resolved items with `~~strikethrough~~` or an `[RESOLVED]` tag.
6. Produce updated structured output reflecting current state.

If zero `[CRITICAL]` findings after verification, append `RALPH_EXIT` on the last line of your response.

---

## Quick-Start Checklist

When invoked:
1. ✅ Read the full `target_file` markdown specification.
2. ✅ Map entry points, assets, and trust boundaries.
3. ✅ Scan for logic gaps — incomplete flows, missing error handling.
4. ✅ Apply STRIDE threat model to security design decisions.
5. ✅ Identify edge cases — boundaries, concurrency, localization.
6. ✅ Evaluate scalability — queries, single points of failure, limits.
7. ✅ Write findings to `docs/security/redteam-findings-FEATURE.md`.
8. ✅ Output structured `[CRITICAL]`/`[WARNING]`/`[INFO]` tokens for pipeline.

**Remember**: A silent review is a failed review. If you find nothing notable, say so explicitly — "No vulnerabilities found after systematic review across all four focus areas" is a valid output. Still produce the findings file with a clean status and green callout confirming no issues detected.
