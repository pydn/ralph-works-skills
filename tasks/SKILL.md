---
name: tasks
description: Creates a human-readable Markdown implementation task ledger from a hardened Ralph specification. Use after harden and before tdd-implement.
input:
  spec_file: Path to the hardened specification file, usually docs/specs/FEATURE.md.
  changelog_file: Path to the harden changelog, usually docs/specs/harden-changelog-FEATURE.md.
  output_file: Path for the task ledger, usually docs/specs/todo_FEATURE.md.
---

# Ralph Tasks Skill - Implementation Ledger Generation

## Goal

Create a comprehensive implementation task ledger from the hardened spec. Do not implement code. Your output is the durable backlog that Ralph gives to LLM selector and TDD prompts. Ralph does not deterministically parse or update this generated document.

## Inputs

Read:

- Hardened spec: `docs/specs/FEATURE.md`
- Harden changelog: `docs/specs/harden-changelog-FEATURE.md`, if present
- Red-team findings: `docs/security/redteam-findings-FEATURE.md`, if present

Write:

- Task ledger: `docs/specs/todo_FEATURE.md`

## Required Ledger Format

Markdown is the source of truth. Use a clear, consistent structure so an LLM can reliably read one task by ID:

```markdown
# Implementation Tasks - FEATURE

Spec: docs/specs/FEATURE.md
Status: active
Version: 1

## Tasks

### TASK-0001: Short imperative task title
- Status: pending
- Priority: P0
- Source: hardened_spec
- Depends On: none
- Review Finding Ref: none
- Files Hint: src/file.ts, __tests__/file.test.ts
- Created: 2026-05-23T00:00:00.000Z
- Updated: 2026-05-23T00:00:00.000Z
- Completed: none

#### Acceptance Criteria
- Concrete behavior that must be true after this task.
- Another concrete criterion when needed.

#### Test Plan
- Regression or unit test that must fail before implementation.
- Gate or integration command relevant to this task.

#### Notes
- Relevant implementation context or risk.
```

## Task Rules

- Every task must be independently implementable by `tdd-implement`.
- Every task must be small enough for one Red-Green-Refactor cycle group.
- Every task needs acceptance criteria and a test plan.
- Use stable sequential IDs: `TASK-0001`, `TASK-0002`, etc.
- Use `Status: pending` for every new task.
- Use `Source: hardened_spec` for tasks derived from the hardened spec.
- Use `Depends On: none` unless the task cannot be tested before another task is complete.
- Use `Files Hint: none` only when the likely files cannot be inferred.
- Do not create umbrella tasks such as "implement the feature"; split them.
- Do not include tasks for optional polish unless the hardened spec requires them.

## Priority Rules

| Priority | Use For |
|----------|---------|
| `P0` | Security fixes, state persistence, controller correctness, data loss prevention, required tests/gates |
| `P1` | Core user-visible behavior and common workflows |
| `P2` | Edge cases, diagnostics, docs required for operator success |
| `P3` | Nice-to-have cleanup explicitly present in the hardened spec |

## Coverage Checklist

Before completing the phase, verify the ledger covers:

- Hardened spec acceptance criteria
- Red-team CRITICAL mitigations
- Required state persistence for compaction/reload survivability
- Controller phase transitions and markers
- Tests needed for every behavior change
- Gate/config/documentation changes
- Review remediation hooks, if the spec mentions review loop behavior

## Final Response

Summarize:

- Task ledger path
- Number of tasks by priority
- Any dependencies or blocked assumptions

End with exactly:

```text
RALPH_PHASE_COMPLETE
```
