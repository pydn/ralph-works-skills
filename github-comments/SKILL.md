---
name: github-comments
description: Create, reply to, and resolve GitHub PR review comments using the gh CLI. Covers listing comments, replying to specific comments, and resolving conversation threads.
---

# GitHub Comments Skill

Use this skill to interact with pull request review comments on GitHub via the `gh` CLI. All examples assume you're in a cloned repository with an authenticated `gh` session.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth status`)
- Repository must be accessible via REST API
- For GraphQL operations: account must have appropriate permissions (some free-tier accounts lack `resolveThread` access)

---

## 1. List PR Review Comments

### Get all comments on a PR

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments
```

### Quick summary view

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments \
  --jq '.[] | "\(.id) |\(.path) \(.line) |\(.resolved) | reply-to: \(.in_reply_to_id)"'
```

### Full details (Python one-liner for readability)

```bash
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments | python3 -c "
import json, sys
for c in json.load(sys.stdin):
    print(f'ID: {c[\"id\"]}')
    print(f'  File: {c[\"path\"]}:{c.get(\"line\", \"diff\")}')
    print(f'  Reply to: {c.get(\"in_reply_to_id\", \"root\")}')
    print(f'  Resolved: {c.get(\"resolved\", \"null\")}')
    print(f'  Commit: {c[\"commit_id\"][:7]}')
    print()
"
```

### Key fields returned by the API

| Field | Description |
|-------|-------------|
| `id` | Numeric comment ID (use for REST API calls) |
| `node_id` | GraphQL node ID (e.g. `PRRC_kwDO...`) |
| `path` | File path the comment references |
| `line` | Line number (`null` for diff-level comments) |
| `commit_id` | Full 40-char commit SHA the comment was made on |
| `in_reply_to_id` | Parent comment ID (or `null` if root of thread) |
| `resolved` | `true`, `false`, or `null` |
| `body` | Comment body (may contain markdown/HTML) |

---

## 2. Reply to a Review Comment

Replying creates a new threaded comment under the original. This is the most reliable way to signal that feedback has been addressed.

### Method: Temp file + `--input` flag

The REST API requires JSON via stdin or file. The `gh api --input` flag reads from a file:

```bash
# Build payload as JSON in a temp file
cat > /tmp/reply.json << 'EOF'
{
  "body": "Addressed — fixed the issue described here. ([abc1234](https://github.com/owner/repo/commit/abc1234))",
  "in_reply_to": 3215058222,
  "commit_id": "b3d11c97beaa8c8af1169a7725a0aab5cc820228"
}
EOF

# POST the reply
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments \
  --method POST \
  --input /tmp/reply.json \
  -H "Content-Type: application/json"
```

### Required fields

| Field | Required? | Notes |
|-------|-----------|-------|
| `body` | Yes | Markdown text |
| `in_reply_to` | Yes | Numeric ID of the parent comment |
| `commit_id` | Yes (for review comments) | Full 40-char SHA, not short hash |

### Optional fields

| Field | Notes |
|-------|-------|
| `line` | Line number — include if the original had one. Omit for diff-level comments. |

### Python script for batch replies

For replying to multiple comments (e.g. after implementing fixes):

```python
import json, subprocess, tempfile, os

replies = {
    "3215058222": "Addressed - description of fix. ([commit](url))",
    "3215096817": "Addressed - another fix. ([commit](url))",
}

# Get existing comments to extract commit_id and line
result = subprocess.run(
    ["gh", "api", f"repos/{owner}/{repo}/pulls/{pr_number}/comments"],
    capture_output=True, text=True
)
comment_map = {str(c["id"]): c for c in json.loads(result.stdout)}

for comment_id, body in replies.items():
    comment = comment_map.get(comment_id, {})
    payload = {
        "body": body,
        "in_reply_to": int(comment_id),
        "commit_id": comment.get("commit_id", ""),
    }
    if comment.get("line") is not None:
        payload["line"] = comment["line"]

    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(payload, f)
        tmpfile = f.name

    try:
        r = subprocess.run([
            "gh", "api", f"repos/{owner}/{repo}/pulls/{pr_number}/comments",
            "--method", "POST",
            "--input", tmpfile,
            "-H", "Content-Type: application/json",
        ], capture_output=True, text=True)

        if r.returncode == 0:
            resp = json.loads(r.stdout)
            print(f"OK {comment_id} -> reply #{resp.get('id', '?')}")
        else:
            print(f"FAIL {comment_id}: {r.stderr[:200]}")
    finally:
        os.unlink(tmpfile)
```

---

## 3. Resolve Conversation Threads

### Method A: GraphQL `resolveThread` (preferred)

Requires account permissions for the `resolveThread` mutation. May not be available on free-tier accounts or tokens with limited scope.

```bash
# Using node_id from comment (e.g. PRRC_kwDOKBhDQM6_oeUu)
gh api graphql -f query='
  mutation($input: ResolveThreadInput!) {
    resolveThread(input: $input) {
      thread {
        id
        isResolved
      }
    }
  }
' -F variables="{\"input\":{\"threadId\":\"PRRC_kwDOKBhDQM6_oeUu\"}}" \
  --jq '.data.resolveThread.thread.isResolved'
```

If you get `Field 'resolveThread' doesn't exist on type 'Mutation'`, the mutation is not available to your account — use Method B instead.

### Method B: Reply "Addressed" (fallback)

When GraphQL mutations are unavailable, reply with an "Addressed" message referencing the fixing commit. This serves as a resolution record and makes it easy for reviewers to click "Resolve conversation" on the web UI.

```bash
# See section 2 above for full reply instructions
```

### Method C: Web UI

Open the PR on GitHub, find each unresolved comment thread, and click **Resolve conversation**. This is manual but always works regardless of API permissions.

---

## 4. Create New Review Comments (Not Replies)

To add a fresh comment on a specific file/line of a PR diff:

```bash
cat > /tmp/comment.json << 'EOF'
{
  "body": "This function should also handle the edge case where...",
  "path": "src/module.py",
  "commit_id": "abc1234def5678...",
  "line": 42,
  "side": "RIGHT"
}
EOF

gh api repos/{owner}/{repo}/pulls/{pr_number}/comments \
  --method POST \
  --input /tmp/comment.json \
  -H "Content-Type: application/json"
```

| Field | Required? | Notes |
|-------|-----------|-------|
| `body` | Yes | Comment text (markdown) |
| `path` | Yes | File path in the PR diff |
| `commit_id` | Yes | Full SHA of the commit to comment on |
| `line` | Conditional | Line number for line-level comments. Omit for file-level comments. |
| `side` | When `line` is set | `"LEFT"` (base/parent) or `"RIGHT"` (head/new) |

---

## 5. Common Pitfalls

### "Invalid request — No subschema matched"

This means the JSON payload structure doesn't match any of the API's accepted shapes. Review comments require either:
- `in_reply_to` + `commit_id` (for replies)
- `path` + `commit_id` (+ optional `line`) (for new comments on file)

Make sure you're including `commit_id` as a full 40-char SHA, not a short hash.

### "Not Found" on individual comment GET

`GET /repos/{owner}/{repo}/pulls/{pr_number}/comments/{id}` often returns 404 because the API doesn't expose individual comment retrieval in all cases. Always fetch via the list endpoint and filter client-side.

### `gh api --field` vs `--input`

- `--field key=value` works for simple key-value pairs but fails with nested JSON or special characters
- `--input file.json` is more reliable for complex payloads — write JSON to a temp file first

### Emoji and Unicode in bodies

Use plain text or standard markdown. Some emoji (like ✅) may be converted to escape sequences by Python's json.dump — this is fine, GitHub renders them correctly.

---

## Quick Reference

```bash
# List all PR review comments
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments

# Reply to comment #3215058222
echo '{"body":"Addressed","in_reply_to":3215058222,"commit_id":"full_sha"}' > /tmp/r.json
gh api repos/{owner}/{repo}/pulls/{pr_number}/comments -X POST --input /tmp/r.json -H "Content-Type: application/json"

# Resolve thread (if GraphQL available)
gh api graphql -f query='mutation($i:ResolveThreadInput!){resolveThread(input:$i){thread{id isResolved}}}' -F variables='{"input":{"threadId":"PRRC_kw..."}}'
```
