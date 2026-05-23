---
name: tdd-implement
description: Implements one selected Ralph implementation task from a hardened specification using a strict Red-Green-Refactor loop. Use this to convert a persisted task into working, tested code without broadening scope.
input:
  spec_file: (Optional) Path to the hardened specification file (e.g., docs/specs/feature.md). If omitted, use conversation context only for the selected task.
  selected_task: (Optional) The single implementation task Ralph selected and persisted in state for this invocation.
  task_file: (Optional) Path to the Ralph implementation task ledger, if the controller provides one.
---

# TDD Implementation Skill — Scoped Red-Green-Refactor

## Goal
Convert exactly one selected Ralph implementation task into working, tested code using a **strict Red-Green-Refactor discipline**. You must NOT write implementation code until a task-scoped test exists and is failing. Every line of production code is justified by a failing test for the selected task.

**Mindset**: Tests drive design. Implementation follows failure. Scope is sacred. If a behavior is not required by the selected task, do not implement it during this invocation.

## Ralph Task-Loop Contract

This skill runs inside the future Ralph iterative implementation loop:

1. A hardened spec exists.
2. Ralph compacts context.
3. Ralph selects the highest-priority remaining implementation task.
4. Ralph persists that selected task in controller state.
5. Ralph launches this skill for that task only.
6. This skill completes the task with Red-Green-Refactor evidence.
7. Ralph records the task complete, compacts again, and selects the next task.
8. When no tasks remain, Ralph advances to review.

The selector and controller own task ordering, persistence, compaction, and phase transitions. This skill owns only the current task's implementation cycle.

### Scope Rules

- Treat `selected_task` as the binding scope for this invocation.
- If `selected_task` is present, do not derive or execute a full-spec implementation plan.
- If the hardened spec contains adjacent requirements, read them only for context and compatibility.
- If the selected task is ambiguous, ask for clarification or record a blocker instead of implementing a guessed broader feature.
- If you discover prerequisite work, record it as a new pending implementation task rather than silently folding it into the current task.
- If you discover unrelated bugs, record them as follow-up tasks unless they block the selected task's tests.
- Do not mark the whole implementation phase complete. Report only whether the selected task is complete, blocked, or needs follow-up tasks.

### Review Remediation Tasks

CRITICAL Ralph review findings may create new implementation tasks or reopen completed tasks. When the selected task comes from a review finding:

- Treat the review finding as the task source of truth.
- Start with a regression test that reproduces the reviewed failure or proves the missing safety property.
- Keep the fix limited to that finding and any directly required supporting change.
- Link the completion report back to the review iteration and finding title or ID when available.
- If the finding exposes a broader missing requirement, complete the immediate fix and record the broader work as a new pending task.

---

## Phase 1: Analysis & Test Planning

### 1. Confirm Task Scope

Before branch or code work, identify the selected task:

1. Read `selected_task` from the prompt, Ralph state summary, or `task_file`.
2. Capture its stable fields if provided:
   - Task ID
   - Title
   - Priority
   - Source (`hardened_spec`, `review_critical`, `reopened_task`, or `manual`)
   - Acceptance criteria
   - Required tests or verification
   - Files or components likely affected
3. Restate the scope in one or two sentences.
4. Explicitly list anything you will not do because it is outside the selected task.

If no selected task is provided:

- Do not start broad implementation.
- Read the hardened spec only far enough to propose the next highest-priority task.
- Ask Ralph/the user to persist one selected task before implementation starts.

### 2. Create Feature Branch
Before writing any code, ensure you are working on a dedicated feature branch.

1.  **Use Ralph's worktree/branch if provided**. If Ralph already launched this task inside an isolated worktree, stay there.
2.  **Confirm the branch is not already checked out**:
    ```bash
    git branch --show-current
    ```
3.  **Derive a branch name** from the selected task ID/title (e.g., `feature/task-auth-ownership-check`).
4.  **Create and checkout the branch if needed**:
    ```bash
    git checkout -b feature/<name>
    ```
5.  **Verify you are on the correct branch**:
    ```bash
    git branch --show-current  # should output: feature/<name>
    ```
6.  If a branch with that name already exists, inform the user and ask whether to reuse it or pick a different name.

> **Rule**: Never implement on `main`, `master`, or `develop` directly. All TDD work must happen on a `feature/` branch.

### 3. Read Context
*   **Read the selected task first**: Use `selected_task` or `task_file` as the implementation scope.
*   **Read the hardened spec second**: Load `spec_file` for definitions, constraints, and acceptance criteria related to the selected task only.
*   **Read review context when applicable**: If the task source is `review_critical` or `reopened_task`, read the referenced review report/finding before planning tests.
*   **Identify the testing framework**: Scan existing test files to determine the runner, assertion library, and conventions.
    ```
    Common signals:
      - package.json + node_modules/jest → Jest
      - pyproject.toml + tests/ + pytest.ini → Pytest
      - Cargo.toml + #[cfg(test)] → Rust unit tests
      - Rakefile + test/test_helper.rb → Minitest/RSpec
    ```
*   **Locate the test root**: Where do tests live? (`tests/`, `__tests__/`, `spec/`, inline?)
*   **Find the implementation target**: Which module/package should the selected task change?

### 4. Derive Task-Scoped Test Cases
Extract atomic, verifiable test cases directly from the selected task's acceptance criteria. Each test case must:
- Cover **one** behavior or edge case (not multiple).
- Be **independently testable** (no dependency on other tests passing first).
- Map to a **concrete assertion** (not "verify it works").
- Be necessary for the selected task. Do not add test cases for unrelated spec requirements.

**Prioritization heuristic:**
| Order | Category | Why |
|-------|----------|-----|
| 1️⃣   | Core happy path | Establishes the baseline interface and contract |
| 2️⃣   | Common edge cases | Variants the user will actually hit (empty input, boundary values) |
| 3️⃣   | Error handling | Invalid input, missing dependencies, failure modes |
| 4️⃣   | Integration / cross-cutting | Multi-component flows, serialization, I/O |

### 5. Read Environment Constraints
If the spec includes an "Environment Constraints" section, note these constraints now. Your tests and implementation must account for them (e.g., read-only filesystem paths, CPU-only execution, unavailable system libraries).

### 6. Update Task Tracker
Use the Ralph implementation task ledger if one exists. Otherwise create a local markdown todo file for the selected task.

1. **Derive the filename** from the spec path:
   - Spec: `docs/specs/feature-auth.md` → Todo: `docs/specs/todo_feature-auth.md`
   - Spec: `specs/add-user-model.md` → Todo: `specs/todo_add-user-model.md`
   - Rule: Same directory as the spec, same basename, prefixed with `todo_`.
2. **Write or update only the selected task section** with a checklist of task-scoped test cases and environment-specific validation steps.
   ```markdown
   # Todo — [Spec Title or Task Ledger]

   > Auto-generated by TDD Implementation Skill  
   > Spec: `[relative path to spec]`

   ## Task [ID] — [Selected Task Title]
   Source: `[hardened_spec | review_critical | reopened_task | manual]`

   - [ ] 1. Given valid input X, function returns Y
   - [ ] 2. Given invalid input Z, function raises ValueError
   ```
3. Each checklist item corresponds to one row in the Test List.
4. Keep this file in sync — check off each item immediately after its RGR cycle completes.
5. If you identify new work, add it as a separate pending task instead of expanding the current task.

### Deliverable: Task-Scoped Test List
Present or persist a numbered task-scoped test list before proceeding. In automated Ralph task-loop mode, do not pause for human confirmation unless Ralph explicitly requests a checkpoint. In interactive mode, ask for confirmation before editing production code.

```markdown
## Proposed Task Test Plan

**Task:** `[task ID/title]`
**Source:** `[hardened_spec | review_critical | reopened_task | manual]`
**Spec:** `[spec_file path]`
**Framework:** `[detected framework]`
**Test root:** `[tests/...]`
**Target module:** `[src/...]`

| # | Priority | Test Case | Expected Assertion | Target File |
|---|----------|-----------|-------------------|-------------|
| 1 | 1️⃣ Core | Given valid input X, function returns Y | `assert result == Y` | `test_feature.py` |
| 2 | 2️⃣ Edge  | Given empty input, function returns default | `assert result == DEFAULT` | `test_feature.py` |
| 3 | 3️⃣ Error | Given invalid input Z, function raises ValueError | `with pytest.raises(ValueError)` | `test_feature.py` |

**Total:** [N] test cases

Ready to begin the Red-Green loop for this task only.
```

---

## Phase 2: The Task TDD Loop (Repeat for EACH Task Test Case)

For every item in the confirmed task-scoped Test List, execute this cycle **in full** before moving to the next item.

### 🔴 Step A — RED (Write a Failing Test)

1.  **Create or update the test file** in the correct location with proper imports/fixtures.
2.  **Write ONE test case** — only the current item from the selected task's list. Nothing more.
3.  **Run the test** using the project's test command:
    ```bash
    # Examples (use whatever the project uses):
    pytest tests/test_feature.py -v
    npm test -- --testPathPattern=feature
    cargo test feature
    uv run pytest tests/test_feature.py::test_name -v
    ```
4.  **STOP & VERIFY** — Confirm the output shows a **meaningful failure**:
    - ✅ Good failures: `NameError: name 'my_function' is not defined`, `AssertionError: expected 200 == 404`, `ModuleNotFoundError`
    - ❌ Bad: Test passes without implementation (flaky, skipped, or trivially true assertion)
    - ❌ Bad: Test fails for infrastructure reasons (wrong import path, missing dependency install) — fix the setup first

> **Rule**: If the test passes at this stage, something is wrong. Investigate before proceeding. A passing test in RED means you're not testing what you think you're testing.

### 🟢 Step B — GREEN (Minimum Implementation)

1.  **Write the minimum code** to make ONLY that one test pass:
    - Hardcode the return value if that's what passes the test.
    - Stub the function signature if that's all the test needs.
    - Do NOT over-engineer for future tests or future tasks. The refactor phase handles cleanup, and Ralph will launch later tasks separately.
2.  **Run the test again** (same command as RED).
3.  **STOP**:
    - ✅ Passes → move to Refactor.
    - ❌ Still fails → debug the implementation. Fix only what's needed. Re-run.

> **Rule**: The goal of GREEN is speed, not elegance. Make it work, then clean it up in Refactor. Resist the urge to implement ahead of tests.

### 🔵 Step C — REFACTOR (Clean Without Changing Behavior)

1.  With the test green, improve code quality:
    - Extract duplicated logic into helpers.
    - Replace magic numbers/strings with named constants.
    - Improve naming for clarity.
    - Simplify control flow.
2.  **Run ALL related tests** (the full file or module) to confirm no regressions:
    ```bash
    pytest tests/test_feature.py -v      # full test file
    npm test -- --testPathPattern=feature  # all matching tests
    ```

3.  If refactoring breaks anything, revert the refactor and try a smaller change. **Never break green.**

### ⚙️ Lint Gate (After Each RGR Cycle)

After refactoring but before advancing to the next test case:
1. Run the repository's configured lint/typecheck command from AGENTS.md, package scripts, or gate config.
2. Run the repository's formatter or format-check command if configured.
3. Run the related test file/module for the selected task.
4. If the repository is Python and uses the existing Ralph defaults, typical commands are:
   ```bash
   uv run ruff check . --select E,F,W,I
   uv run ruff format .
   uv run python -m unittest discover tests
   ```

DO NOT advance to the next test case until gates pass. This prevents accumulating technical debt that wastes Ralph review iterations later.

### Loop Progress Tracking

After each complete RGR cycle:
1. **Check off the completed item** in the todo file by replacing `- [ ]` with `- [x]` for that item's number.
2. Report progress:

```markdown
## TDD Progress — Task [ID], Item [X] of [N]: ✅ COMPLETE

**Test:** `test_case_name`
**RED:** Failed with `[failure message]`
**GREEN:** Passed after `[brief description of minimum change]`
**REFACTOR:** `[what was cleaned, or "no refactor needed"]`

```

---

## Phase 3: Final Verification (Extended)

### 1. Related and Full Suite Runs
Run the related test file/module first, then the full project test suite when practical. Confirm all tests pass or document any unrelated pre-existing failures with evidence.

### 2. Coverage Check (if applicable)
Measure coverage of new code. Flag any uncovered critical paths.

### 3. Lint Gate
Run the repository's configured lint/typecheck and format-check gates. For Python/unittest repositories using the Ralph defaults:

```bash
uv run ruff check . --select E,F,W,I
uv run ruff format --check .
uv run python -m unittest discover tests
```

### 4. E2E Validation (Mandatory if Task Requires It)
If the selected task or specification includes E2E validation requirements:
1. Run against the real environment specified in the spec's Environment Constraints section
2. Verify observable behavior change — not just "test passes" but actual runtime effect (e.g., "--cpu flag now reaches ComfyUI internals")
3. Document what was verified, how it was verified, and what the expected vs actual outcome was

If real environment is unavailable: mark status as PARTIALLY_VERIFIED and document the limitation for Ralph review to assess.

### 5. Regression Test Audit
For each edge case or bug discovered during the selected task that was NOT in the original task:
1. Confirm a regression test exists that reproduces the issue
2. If no test exists, write one now (RED phase — test fails without the fix)
3. Verify the fix makes the test pass (GREEN phase)

Rule of thumb: if you found it once, you'll find it again without a test.

### 6. Convention Compliance
Read AGENTS.md in the repo root. Verify all project conventions are followed:
- All Python commands use `uv run`
- Tests use unittest (not pytest)
- Files formatted with ruff
- Any other project-specific rules

### 7. Task Completion Handoff
Output a final task summary with task ID/title, test count, files modified, related/full suite status, coverage, lint gate status, and E2E validation result.

Use this status vocabulary:

- `TASK_COMPLETE` — selected task is implemented, tested, and ready for Ralph to mark complete.
- `TASK_PARTIALLY_VERIFIED` — implementation is done, but required E2E or external validation could not run.
- `TASK_BLOCKED` — task cannot be completed without missing information, unavailable dependencies, or prerequisite work.
- `TASK_NEEDS_FOLLOWUP` — current task is complete, and separate pending tasks were discovered and recorded.

Update `.ralph/dev-cycle-<feature>.md` or the Ralph task ledger with:

- Selected task ID/title and source
- RED failure evidence
- GREEN/REFACTOR summary
- Gates run and results
- Follow-up tasks created, if any
- Review finding linkage, if this was review remediation

### 8. Verify Task Tracker
Verify all checklist items for the selected task are checked off. Do not check off unrelated tasks.

### 9. Final Line
Use the completion protocol advertised by the Ralph controller.

In task-loop mode, end with exactly one task status line:

```text
RALPH_TASK_COMPLETE
```

If blocked or partially verified, replace it with:

```text
RALPH_TASK_BLOCKED
```

or:

```text
RALPH_TASK_PARTIALLY_VERIFIED
```

or:

```text
RALPH_TASK_NEEDS_FOLLOWUP
```

In legacy phase mode, end with the current controller's phase completion marker only after the scoped task work is complete:

```text
RALPH_PHASE_COMPLETE
```

Do not output both task and phase completion markers in the same response.

---

## Quick-Start Checklist
1. Read selected Ralph task from state/prompt/task ledger.
2. Read only the relevant hardened spec and review context.
3. Create `feature/<task-name>` branch.
4. Detect testing framework and conventions (read AGENTS.md).
5. Build a task-scoped Test List — wait for confirmation only when interactive confirmation is expected.
6. Execute full RED → GREEN → REFACTOR → LINT GATE for each task test case.
7. Run related tests and the full suite when practical, report coverage, run lint gate.
8. E2E validation against real environment if required by the selected task.
9. Regression test audit for any discovered task-relevant bugs.
10. Update only the selected task's tracker entry and record follow-up tasks separately.
11. Output completion summary with task status and gate results.

**Golden rules:** Never implement on main/develop, never write code before failing test, never implement outside the selected task, never implement ahead of tests or future tasks, always verify at task boundaries, maintain the task tracker, run lint gates between cycles.
