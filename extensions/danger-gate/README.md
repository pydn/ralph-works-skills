# Danger Gate

Danger Gate is a Pi extension that intercepts bash tool calls and asks for
confirmation before commands matching destructive-operation patterns run.

## Entry Point

The packaged extension entrypoint is:

```bash
pi -e ./extensions/danger-gate/index.ts
```

For compatibility with the old root-level file, this still works:

```bash
pi -e ./danger-gate.ts
```

## Auto-Discovery

To load it globally through Pi's extension auto-discovery:

```bash
ln -sf "$PWD/extensions/danger-gate/index.ts" ~/.pi/agent/extensions/danger-gate.ts
```

Only `index.ts` is an extension factory. `patterns.ts` and `dialog.ts` are
ordinary helper modules.
