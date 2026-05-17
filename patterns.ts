/**
 * Dangerous command pattern definitions — pure logic, no external dependencies.
 * Each entry is a RegExp tested against bash command strings.
 * First match triggers the confirmation dialog.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Max height for the command preview area (in terminal lines).
export const MAX_PREVIEW_HEIGHT = 16;
/** Hard cap on total preview characters to prevent unbounded allocation. */
export const MAX_PREVIEW_CHARS = 4096;
/** Default dialog timeout in milliseconds before auto-deny. */
export const DEFAULT_TIMEOUT_MS = 60_000;

export const DANGEROUS_PATTERNS = [
  // P1: File deletion — rm with arguments (not -h/--help)
  /\brm\s+(?!(-h|--help)\b)/,

  // P2: Unlink command
  /\bunlink\b/,

  // P3: Secure deletion (word boundary added during hardening to avoid "unshred")
  /\bshred\b/,

  // P4: Disk formatting
  /\bmkfs\b/,

  // P5: Raw disk writes (word boundary added during hardening to avoid "badd if=")
  /\bdd\s+if=/,

  // P6: File viewing raw filesystem
  /\bfatcat\b/,

  // P7-P10: Database destructive operations
  /DROP\s+(TABLE|DATABASE|SCHEMA|INDEX)\b/i,      // P7
  /TRUNCATE\s+TABLE\b/i,                          // P8
  /ALTER\s+TABLE.*DROP\b/i,                       // P9
  /DELETE\s+FROM\b(?!\s+\w+\s+WHERE)/i,           // P10

  // P11: System-level (sudo)
  /\bsudo\s+/m,

  // ~~P12~~ :wq! REMOVED — non-destructive noise (hardened)

  // P13-P15: Disk/fs repair and partitioning
  /\bfsck\b/,                                     // P13
  /\bfdisk\b/,                                    // P14
  /\bparted\b/,                                   // P15

  // P16-P18: Git destructive operations
  /git\s+push\s+--force\b/i,                      // P16
  /git\s+clean\s+-fd\b/i,                         // P17
  /git\s+reset\s+--hard\b/,                       // P18

  // P19-P20: Package manager global deletes
  /\bnpm\s+(uninstall|remove)\s+(-g|--global)/,   // P19
  /\bpip\d*\s+uninstall\s+-y\b/,                 // P20 (pip, pip3 — note: pip3.11 requires custom pattern)

  // P21-P24: Code execution bypass patterns (added during hardening)
  /\|\s*bash\b/i,                                 // P21: pipe to bash
  /\|\s*sh\b/i,                                   // P22: pipe to sh
  /\beval\b/,                                     // P23: eval arbitrary code
  /\bpython\d*\s+-c\b/,                           // P24: python inline exec
];

/**
 * Check if a command matches any dangerous pattern.
 * Returns the index of the first matching pattern, or -1 if none match.
 */
export function checkDangerous(command: string, patterns: RegExp[] = DANGEROUS_PATTERNS): number {
  for (let i = 0; i < patterns.length; i++) {
    if (patterns[i].test(command)) {
      return i;
    }
  }
  return -1;
}

export default function (_pi: ExtensionAPI) {
  // Helper module only. It is symlinked into the extensions directory so
  // danger-gate can import it, and the extension loader requires a factory.
}
