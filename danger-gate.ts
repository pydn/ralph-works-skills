import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";

// Patterns that require confirmation. Add or remove as you like.
const DANGEROUS_PATTERNS = [
  // File deletion
  /\brm\s+(-[a-zA-Z]*r|r)\b/,        // rm -r, rm -rf, rm -Rf etc.
  /\brm\s+(-[a-zA-Z]*f|f)\b/,         // rm -f (force delete)
  /\brm\s+-[a-zA-Z]*-[a-zA-Z]*[rf]/,  // any combo containing r and/or f
  /shred\b/,                          // shred command
  /mkfs\b/,                           // format a disk
  /dd\s+if=/,                         // dd with input file (raw disk writes)
  /\bfatcat\b/,                        // fatcat

  // Database destructive ops
  /DROP\s+(TABLE|DATABASE|SCHEMA|INDEX)\b/i,
  /TRUNCATE\s+TABLE\b/i,
  /ALTER\s+TABLE.*DROP\b/i,
  /DELETE\s+FROM\b(?!\s+\w+\s+WHERE)/i, // DELETE without WHERE clause

  // System-level dangerous commands
  /\bsudo\s+/m,                        // anything with sudo
  /:wq!$/m,                           // force quit vim (not really dangerous but annoying)
  /fsck\b/,                            // file system check/repair
  /fdisk\b/,                           // disk partitioning
  /parted\b/,                          // partition editor

  // Recursive operations that could be destructive
  /git\s+push\s+--force\b/i,           // force push to remote
  /git\s+clean\s+-fd\b/i,             // clean with force + directories
  /git\s+reset\s+--hard\b/,            // hard reset

  // Package manager global deletes
  /\bnpm\s+(uninstall|remove)\s+(-g|--global)/,
  /\bpip\s+uninstall\s+-y\b/,

  // Wildcard deletions
  /\brm\s+.+\*/,                       // rm with wildcards
];

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (!isToolCallEventType("bash", event)) return;

    const cmd = event.input.command || "";

    // Check each pattern against the full command
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(cmd)) {
        const title = "Dangerous Command";
        const msg = `The agent wants to run:\n\n${cmd.split('\n').map(l => '  ' + l).join('\n')}\n\nAllow?`;
        const ok = await ctx.ui.confirm(title, msg);
        if (!ok) {
          return { block: true, reason: "Blocked by user — dangerous command denied" };
        }
        break; // Only need to confirm once even if multiple patterns match
      }
    }
  });
}
