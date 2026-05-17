import { matchesKey, Key } from "@earendil-works/pi-tui";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  DANGEROUS_PATTERNS,
  checkDangerous,
  MAX_PREVIEW_HEIGHT,
  MAX_PREVIEW_CHARS,
  DEFAULT_TIMEOUT_MS,
} from "./patterns.js";

// Re-export everything from patterns.ts so the main extension can import from here.
export {
  DANGEROUS_PATTERNS,
  checkDangerous,
  MAX_PREVIEW_HEIGHT,
  MAX_PREVIEW_CHARS,
  DEFAULT_TIMEOUT_MS,
} from "./patterns.js";

/**
 * Scrollable confirm dialog for dangerous command confirmation.
 * Implements configurable timeout with auto-deny on expiry (HARDENED — spec R1 mitigation).
 */
export class DangerDialog {
  private done: (result: boolean) => void;
  private commandLines: string[];
  public scrollOffset = 0;
  public visibleHeight = MAX_PREVIEW_HEIGHT;
  private readonly timeoutMs: number;
  private readonly startTime: number;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private resolved = false;

  constructor(command: string, done: (result: boolean) => void, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.done = done;
    this.timeoutMs = timeoutMs;
    this.startTime = Date.now();
    // Cap total characters to prevent unbounded allocation (HARDENED)
    const truncated = command.length > MAX_PREVIEW_CHARS
      ? command.slice(0, MAX_PREVIEW_CHARS) + "\n[... command truncated, " + command.length + " chars total]"
      : command;
    this.commandLines = truncated.split("\n");
    // Start auto-deny timer (HARDENED — R1 mitigation)
    this.startTimeout();
  }

  private startTimeout(): void {
    if (this.timeoutMs <= 0) return; // 0 or negative = no timeout
    this.timeoutHandle = setTimeout(() => {
      if (!this.resolved) {
        this.resolved = true;
        console.warn(`Dangergate: auto-denied after ${this.timeoutMs}ms timeout`);
        this.done(false); // auto-deny on timeout
      }
    }, this.timeoutMs);
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  handleInput(data: string): void {
    // Prevent double-resolution (HARDENED — timeout + manual input race)
    if (this.resolved) return;
    const total = this.commandLines.length;
    if (matchesKey(data, Key.up) || data === "k") {
      if (this.scrollOffset > 0) {
        this.scrollOffset--;
      }
    } else if (matchesKey(data, Key.down) || data === "j") {
      if (this.scrollOffset < Math.max(0, total - this.visibleHeight)) {
        this.scrollOffset++;
      }
    } else if (matchesKey(data, Key.pageUp)) {
      this.scrollOffset = Math.max(0, this.scrollOffset - this.visibleHeight);
    } else if (matchesKey(data, Key.pageDown)) {
      this.scrollOffset = Math.min(
        Math.max(0, total - this.visibleHeight),
        this.scrollOffset + this.visibleHeight,
      );
    } else if (matchesKey(data, Key.home)) {
      this.scrollOffset = 0;
    } else if (matchesKey(data, Key.end)) {
      this.scrollOffset = Math.max(0, total - this.visibleHeight);
    } else if (
      matchesKey(data, Key.enter) ||
      data === "y" ||
      data === "Y"
    ) {
      this.resolved = true;
      this.clearTimeout();
      this.done(true);
    } else if (
      matchesKey(data, Key.escape) ||
      data === "n" ||
      data === "N"
    ) {
      this.resolved = true;
      this.clearTimeout();
      this.done(false);
    }
  }

  render(width: number): string[] {
    const total = this.commandLines.length;
    // Reserve space: border(1) + title(1) + scroll-indicator(0/1) + preview(N) + hint(1) + border(1)
    const reserved = 5;
    this.visibleHeight = Math.max(
      1,
      Math.min(MAX_PREVIEW_HEIGHT, width > 0 ? Number(width) - reserved : MAX_PREVIEW_HEIGHT),
    );
    // Clamp scroll offset
    if (this.scrollOffset >= total) {
      this.scrollOffset = Math.max(0, total - this.visibleHeight);
    }
    if (this.scrollOffset < 0) {
      this.scrollOffset = 0;
    }

    const visible = this.commandLines.slice(
      this.scrollOffset,
      this.scrollOffset + this.visibleHeight,
    );

    const lines: string[] = [];
    // Top border
    lines.push("\u256d" + "\u2500".repeat(width - 2) + "\u256e");

    // Title line (red)
    const title = "⚠ DANGEROUS COMMAND";
    // HARDENED: truncate BEFORE padEnd to avoid intermediate allocation spike
    const safeWidth = width - 4;
    lines.push(
      "  \x1b[31m" +
        title.slice(0, safeWidth).padEnd(safeWidth).slice(0, safeWidth) +
        "\x1b[0m",
    );

    // Scroll indicator when scrollable
    if (total > this.visibleHeight) {
      const maxScroll = Math.max(0, total - this.visibleHeight);
      const pos =
        this.scrollOffset === 0
          ? "↑ top"
          : this.scrollOffset >= maxScroll
            ? `↓ bottom (${this.scrollOffset + this.visibleHeight}/${total})`
            : `${this.scrollOffset + 1}–${Math.min(this.scrollOffset + this.visibleHeight, total)}/${total}`;
      lines.push(
        "  \x1b[2m" +
          pos.slice(0, safeWidth).padEnd(safeWidth).slice(0, safeWidth) +
          "\x1b[0m",
      );
    }

    // Command preview (scrollable)
    const indent = "    ";
    const lineMaxLen = width - indent.length - 2;
    for (const line of visible) {
      // HARDENED: truncate BEFORE padEnd to avoid unbounded intermediate allocation
      const safeLine = line.slice(0, lineMaxLen);
      lines.push(
        indent +
          "\x1b[37m" +
          safeLine.padEnd(lineMaxLen).slice(0, lineMaxLen) +
          "\x1b[0m",
      );
    }

    // Fill remaining space if command is short
    const usedPreviewLines = visible.length;
    const neededFill = this.visibleHeight - usedPreviewLines;
    for (let i = 0; i < neededFill; i++) {
      lines.push(" ".repeat(width));
    }

    // Hint line — show countdown when < 15s remaining (HARDENED — R1 mitigation)
    let hint = "[Y]es / [N]o   ↑↓ scroll";
    if (this.timeoutMs > 0) {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, Math.ceil((this.timeoutMs - elapsed) / 1000));
      if (remaining < 15) {
        hint = `[Y]es / [N]o   ↑↓ scroll   ⏱ ${remaining}s`;
      }
    }
    lines.push(
      "  \x1b[2m" +
        hint.slice(0, safeWidth).padEnd(safeWidth).slice(0, safeWidth) +
        "\x1b[0m",
    );

    // Bottom border
    lines.push("\u2570" + "\u2500".repeat(width - 2) + "\u256f");

    return lines;
  }

  invalidate(): void {
    // No cached state to clear
  }
}

export default function (_pi: ExtensionAPI) {
  // Helper module only. It is symlinked into the extensions directory so
  // danger-gate can import it, and the extension loader requires a factory.
}
