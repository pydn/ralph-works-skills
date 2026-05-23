import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import { DangerDialog } from "./dialog.js";
import { checkDangerous, DANGEROUS_PATTERNS } from "./patterns.js";

/** Log prefix for all dangergate messages. */
const PREFIX = "Dangergate";

/** Default non-interactive policy: allow-through with warning log. */
const DEFAULT_NON_INTERACTIVE_POLICY: NonInteractivePolicy = "allow-log";

export type NonInteractivePolicy = "allow-log" | "deny" | "allow-silent";

export default function (pi: ExtensionAPI) {
  console.info(`${PREFIX}: loaded, ${DANGEROUS_PATTERNS.length} patterns active`);

  pi.on("tool_call", async (event, ctx) => {
    // Only intercept bash tool calls
    if (!isToolCallEventType("bash", event)) return;

    const cmd = event.input.command || "";

    // CRITICAL FIX: Check ctx.hasUI BEFORE any pattern matching or UI rendering.
    // In non-interactive modes (print mode, JSON mode), skip all gating logic
    // to prevent deadlock in headless sessions.
    if (!ctx.hasUI) {
      const matchIdx = checkDangerous(cmd);
      if (matchIdx >= 0) {
        console.warn(
          `${PREFIX}: non-interactive mode — allowing through: "${cmd.slice(0, 120)}" ` +
          `(matched pattern #${matchIdx + 1})`
        );
      }
      return; // allow-through
    }

    // Check command against dangerous patterns
    const matchIdx = checkDangerous(cmd);
    if (matchIdx < 0) return; // No match — pass through silently

    // CRITICAL FIX: Wrap ctx.ui.custom() in try/catch.
    // On any exception from the UI layer (TUI not initialized, rendering crash),
    // log a warning and allow-through per non-interactive policy.
    try {
      const ok = await ctx.ui.custom<boolean>(
        (_tui, _theme, _keybindings, done) => {
          return new DangerDialog(cmd, (result) => done(result));
        },
        { overlay: true },
      );

      if (!ok) {
        return { block: true, reason: "Blocked by user — dangerous command denied" };
      }
    } catch (err: any) {
      console.warn(`${PREFIX}: UI error, allowing through:`, err.message);
      // Allow-through on UI crash per configured non-interactive policy
      if (DEFAULT_NON_INTERACTIVE_POLICY === "deny") {
        return { block: true, reason: "Blocked — UI error prevented confirmation" };
      }
    }

    // User confirmed or error allowed through — command proceeds normally
  });
}
