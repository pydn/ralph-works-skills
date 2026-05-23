import { matchesKey, Key } from "@earendil-works/pi-tui";
import {
  DEFAULT_TIMEOUT_MS,
  MAX_PREVIEW_CHARS,
  MAX_PREVIEW_HEIGHT,
} from "./patterns.js";

/**
 * Scrollable confirm dialog for dangerous command confirmation.
 * Implements configurable timeout with auto-deny on expiry.
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

    const truncated = command.length > MAX_PREVIEW_CHARS
      ? command.slice(0, MAX_PREVIEW_CHARS) + "\n[... command truncated, " + command.length + " chars total]"
      : command;
    this.commandLines = truncated.split("\n");
    this.startTimeout();
  }

  private startTimeout(): void {
    if (this.timeoutMs <= 0) return;
    this.timeoutHandle = setTimeout(() => {
      if (!this.resolved) {
        this.resolved = true;
        console.warn(`Dangergate: auto-denied after ${this.timeoutMs}ms timeout`);
        this.done(false);
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
    const reserved = 5;
    this.visibleHeight = Math.max(
      1,
      Math.min(MAX_PREVIEW_HEIGHT, width > 0 ? Number(width) - reserved : MAX_PREVIEW_HEIGHT),
    );

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
    lines.push("\u256d" + "\u2500".repeat(width - 2) + "\u256e");

    const title = "⚠ DANGEROUS COMMAND";
    const safeWidth = width - 4;
    lines.push(
      "  \x1b[31m" +
        title.slice(0, safeWidth).padEnd(safeWidth).slice(0, safeWidth) +
        "\x1b[0m",
    );

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

    const indent = "    ";
    const lineMaxLen = width - indent.length - 2;
    for (const line of visible) {
      const safeLine = line.slice(0, lineMaxLen);
      lines.push(
        indent +
          "\x1b[37m" +
          safeLine.padEnd(lineMaxLen).slice(0, lineMaxLen) +
          "\x1b[0m",
      );
    }

    const neededFill = this.visibleHeight - visible.length;
    for (let i = 0; i < neededFill; i++) {
      lines.push(" ".repeat(width));
    }

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

    lines.push("\u2570" + "\u2500".repeat(width - 2) + "\u256f");

    return lines;
  }

  invalidate(): void {
    // No cached state to clear.
  }
}
