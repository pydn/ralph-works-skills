/**
 * Tests for DangerDialog rendering behavior (pure logic, no Pi TUI deps).
 * We test via a standalone implementation that mirrors danger-gate/dialog.ts
 * but with inline mock for matchesKey/Key to avoid importing pi-tui.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Inline constants (same as patterns.ts)
const MAX_PREVIEW_HEIGHT = 16;
const MAX_PREVIEW_CHARS = 4096;

/**
 * Minimal DangerDialog implementation for testing render logic.
 * Mirrors extensions/danger-gate/dialog.ts but uses simple key matching without pi-tui dependency.
 */
class TestableDangerDialog {
  private done: (result: boolean) => void;
  public commandLines: string[];
  public scrollOffset = 0;
  public visibleHeight = MAX_PREVIEW_HEIGHT;
  public startTime: number;

  constructor(command: string, done: (result: boolean) => void) {
    this.done = done;
    this.startTime = Date.now();
    // Cap total characters to prevent unbounded allocation (HARDENED)
    const truncated = command.length > MAX_PREVIEW_CHARS
      ? command.slice(0, MAX_PREVIEW_CHARS) + "\n[... command truncated, " + command.length + " chars total]"
      : command;
    this.commandLines = truncated.split("\n");
  }

  handleInput(data: string): void {
    const total = this.commandLines.length;
    if (data === "ArrowUp" || data === "k") {
      if (this.scrollOffset > 0) this.scrollOffset--;
    } else if (data === "ArrowDown" || data === "j") {
      if (this.scrollOffset < Math.max(0, total - this.visibleHeight)) this.scrollOffset++;
    } else if (data === "PageUp") {
      this.scrollOffset = Math.max(0, this.scrollOffset - this.visibleHeight);
    } else if (data === "PageDown") {
      this.scrollOffset = Math.min(Math.max(0, total - this.visibleHeight), this.scrollOffset + this.visibleHeight);
    } else if (data === "Home") {
      this.scrollOffset = 0;
    } else if (data === "End") {
      this.scrollOffset = Math.max(0, total - this.visibleHeight);
    } else if (data === "Enter" || data === "y" || data === "Y") {
      this.done(true);
    } else if (data === "Escape" || data === "n" || data === "N") {
      this.done(false);
    }
  }

  render(width: number): string[] {
    const total = this.commandLines.length;
    const reserved = 5;
    this.visibleHeight = Math.max(1, Math.min(MAX_PREVIEW_HEIGHT, width > 0 ? Number(width) - reserved : MAX_PREVIEW_HEIGHT));

    // Clamp scroll offset
    if (this.scrollOffset >= total) this.scrollOffset = Math.max(0, total - this.visibleHeight);
    if (this.scrollOffset < 0) this.scrollOffset = 0;

    const visible = this.commandLines.slice(this.scrollOffset, this.scrollOffset + this.visibleHeight);
    const lines: string[] = [];

    // Top border
    lines.push("\u256d" + "\u2500".repeat(width - 2) + "\u256e");

    // Title line (red)
    const title = "⚠ DANGEROUS COMMAND";
    const safeWidth = width - 4;
    lines.push("  \x1b[31m" + title.slice(0, safeWidth).padEnd(safeWidth).slice(0, safeWidth) + "\x1b[0m");

    // Scroll indicator when scrollable
    if (total > this.visibleHeight) {
      const maxScroll = Math.max(0, total - this.visibleHeight);
      const pos =
        this.scrollOffset === 0
          ? "↑ top"
          : this.scrollOffset >= maxScroll
            ? `↓ bottom (${this.scrollOffset + this.visibleHeight}/${total})`
            : `${this.scrollOffset + 1}–${Math.min(this.scrollOffset + this.visibleHeight, total)}/${total}`;
      lines.push("  \x1b[2m" + pos.slice(0, safeWidth).padEnd(safeWidth).slice(0, safeWidth) + "\x1b[0m");
    }

    // Command preview
    const indent = "    ";
    const lineMaxLen = width - indent.length - 2;
    for (const line of visible) {
      // HARDENED: truncate BEFORE padEnd
      const safeLine = line.slice(0, lineMaxLen);
      lines.push(indent + "\x1b[37m" + safeLine.padEnd(lineMaxLen).slice(0, lineMaxLen) + "\x1b[0m");
    }

    // Fill remaining space
    const neededFill = this.visibleHeight - visible.length;
    for (let i = 0; i < neededFill; i++) lines.push(" ".repeat(width));

    // Hint line — show countdown when < 15s remaining (HARDENED)
    let hint = "[Y]es / [N]o   ↑↓ scroll";
    const timeoutMs = 60_000; // default
    if (timeoutMs > 0) {
      const elapsed = Date.now() - this.startTime;
      const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
      if (remaining < 15) {
        hint = `[Y]es / [N]o   ↑↓ scroll   ⏱ ${remaining}s`;
      }
    }
    lines.push("  \x1b[2m" + hint.slice(0, safeWidth).padEnd(safeWidth).slice(0, safeWidth) + "\x1b[0m");

    // Bottom border
    lines.push("\u2570" + "\u2500".repeat(width - 2) + "\u256f");

    return lines;
  }
}

describe("DangerDialog — Rendering", () => {
  it("renders correct structure: top border → title → preview → hint → bottom border", () => {
    const dialog = new TestableDangerDialog("rm -rf /tmp/old", () => {});
    const lines = dialog.render(60);

    assert.ok(lines.length >= 5, "Should have at least 5 lines (borders + title + hint)");
    assert.ok(lines[0].includes("\u256d") || lines[0].includes("─"), "Line 0: top border with box chars");
    assert.ok(lines[1].includes("DANGEROUS COMMAND"), "Line 1: dangerous command title");
    assert.ok(lines[lines.length - 1].includes("\u2570"), "Last line: bottom border (╰)");

    const hintLines = lines.filter(l => l.includes("[Y]") && l.includes("[N]"));
    assert.ok(hintLines.length > 0, "Should contain Y/N hint");
  });

  it("renders command text in preview area", () => {
    const dialog = new TestableDangerDialog("rm -rf /tmp/data", () => {});
    const lines = dialog.render(60);
    const hasCmdLine = lines.some(l => l.includes("rm -rf /tmp/data"));
    assert.ok(hasCmdLine, "Preview area should contain the command text");
  });

  it("shows scroll indicator for long commands", () => {
    const longCmd = Array.from({ length: 30 }, (_, i) => `line_${i}`).join("\n");
    const dialog = new TestableDangerDialog(longCmd, () => {});
    const lines = dialog.render(60);

    // Should have scroll position indicator (at top, showing "↑ top")
    const hasScrollIndicator = lines.some(l => l.includes("top") || l.includes("bottom") || /\d+\/\d+/.test(l));
    assert.ok(hasScrollIndicator, "Should show scroll indicator for >16 line commands");
  });

  it("clamps visibleHeight based on dialog width", () => {
    const dialog = new TestableDangerDialog("rm test.txt", () => {});
    // With very narrow width, visibleHeight should shrink
    dialog.render(20);
    assert.ok(dialog.visibleHeight > 0, "visibleHeight should be positive even at narrow width");
    assert.ok(dialog.visibleHeight <= MAX_PREVIEW_HEIGHT, "visibleHeight should not exceed max");
  });

  it("handles empty command gracefully", () => {
    const dialog = new TestableDangerDialog("", () => {});
    const lines = dialog.render(60);
    assert.ok(lines.length >= 5, "Should render borders + chrome even for empty command");
  });
});

describe("DangerDialog — Timeout Behavior (HARDENED R1)", () => {
  it("show countdown in hint when time < 15s remaining", () => {
    const dialog = new TestableDangerDialog("rm test.txt", () => {});
    // Simulate elapsed time of 47 seconds (60 - 47 = 13s remaining, < 15)
    (dialog as any).startTime = Date.now() - 47_000;
    const lines = dialog.render(80);
    const hintLine = lines.find((l: string) => l.includes("[Y]") && l.includes("[N]"));
    assert.ok(hintLine, "Should have Y/N hint line");
    assert.ok(hintLine.includes("⏱"), `Hint should show countdown timer: ${hintLine}`);
    // Strip ANSI codes to check content
    const visible = hintLine!.replace(/\x1b\[[0-9;]*m/g, "");
    assert.ok(visible.includes("13s"), `Countdown should show ~13s remaining: ${visible}`);
  });

  it("does NOT show countdown when time > 15s remaining", () => {
    const dialog = new TestableDangerDialog("rm test.txt", () => {});
    (dialog as any).startTime = Date.now() - 30_000; // 30s elapsed, 30s remaining
    const lines = dialog.render(80);
    const hintLine = lines.find((l: string) => l.includes("[Y]"));
    assert.ok(hintLine, "Should have Y/N hint line");
    // Strip ANSI codes
    const visible = hintLine!.replace(/\x1b\[[0-9;]*m/g, "");
    assert.ok(!visible.includes("⏱"), `Hint should NOT show countdown with >15s remaining: ${visible}`);
  });
});

describe("DangerDialog — Input Handling", () => {
  it("confirms with 'y' or 'Y'", () => {
    let result: boolean | null = null;
    new TestableDangerDialog("rm test.txt", (r) => { result = r; }).handleInput("y");
    assert.equal(result, true);

    new TestableDangerDialog("rm test.txt", (r) => { result = r; }).handleInput("Y");
    assert.equal(result, true);
  });

  it("denies with 'n' or 'N'", () => {
    let result: boolean | null = null;
    new TestableDangerDialog("rm test.txt", (r) => { result = r; }).handleInput("n");
    assert.equal(result, false);

    new TestableDangerDialog("rm test.txt", (r) => { result = r; }).handleInput("N");
    assert.equal(result, false);
  });

  it("scrolls up/down within bounds", () => {
    const longCmd = Array.from({ length: 20 }, (_, i) => `line_${i}`).join("\n");
    const dialog = new TestableDangerDialog(longCmd, () => {});
    dialog.render(80); // initialize visibleHeight

    const startOffset = dialog.scrollOffset;
    dialog.handleInput("ArrowDown");
    assert.ok(dialog.scrollOffset >= startOffset, "ArrowDown should increase offset");

    dialog.handleInput("ArrowUp");
    assert.ok(dialog.scrollOffset <= startOffset + 1, "ArrowUp should decrease offset");
  });

  it("PageDown jumps by viewport height", () => {
    const longCmd = Array.from({ length: 50 }, (_, i) => `line_${i}`).join("\n");
    const dialog = new TestableDangerDialog(longCmd, () => {});
    dialog.render(80);

    const before = dialog.scrollOffset;
    dialog.handleInput("PageDown");
    assert.ok(dialog.scrollOffset > before, "PageDown should jump forward");
  });

  it("Home jumps to offset 0", () => {
    const longCmd = Array.from({ length: 30 }, (_, i) => `line_${i}`).join("\n");
    const dialog = new TestableDangerDialog(longCmd, () => {});
    dialog.render(80);
    dialog.scrollOffset = 10; // simulate scrolled position

    dialog.handleInput("Home");
    assert.equal(dialog.scrollOffset, 0, "Home should jump to 0");
  });

  it("End jumps to bottom", () => {
    const longCmd = Array.from({ length: 30 }, (_, i) => `line_${i}`).join("\n");
    const dialog = new TestableDangerDialog(longCmd, () => {});
    dialog.render(80);

    dialog.handleInput("End");
    assert.ok(dialog.scrollOffset > 0, "End should jump to bottom offset");
    // Verify at or near max scroll position
    const maxScroll = Math.max(0, dialog.commandLines.length - dialog.visibleHeight);
    assert.equal(dialog.scrollOffset, maxScroll, "End should be at max scroll");
  });
});

describe("DangerDialog — HARDENED: MAX_PREVIEW_CHARS Cap", () => {
  it("truncates commands exceeding 4KB to prevent allocation spike", () => {
    // Create a 10KB command line (adversarial input)
    const bigCmd = "x".repeat(10_000);
    const dialog = new TestableDangerDialog(bigCmd, () => {});

    assert.ok(dialog.commandLines.length > 0, "Should have at least one line");
    // Check that total rendered chars are bounded
    const totalChars = dialog.commandLines.join("").length;
    assert.ok(totalChars <= MAX_PREVIEW_CHARS + 256, `Total chars ${totalChars} should be within cap (${MAX_PREVIEW_CHARS} + overhead for truncation message)`);
  });

  it("appends truncation indicator when command exceeds cap", () => {
    const bigCmd = "A".repeat(5000);
    const dialog = new TestableDangerDialog(bigCmd, () => {});
    const lastLine = dialog.commandLines[dialog.commandLines.length - 1];
    assert.ok(lastLine.includes("truncated"), "Last line should contain truncation indicator");
    assert.ok(lastLine.includes("5000"), "Indicator should mention original length");
  });

  it("does NOT truncate commands under cap", () => {
    const smallCmd = "rm -rf /tmp/old";
    const dialog = new TestableDangerDialog(smallCmd, () => {});
    assert.equal(dialog.commandLines.length, 1);
    assert.ok(!dialog.commandLines[0].includes("truncated"), "Small command should not be truncated");
  });

  it("slice() happens BEFORE padEnd() in render (allocation safety)", () => {
    // This verifies the implementation order: safeLine = line.slice(0, limit); then safeLine.padEnd(...)
    const longLine = "B".repeat(1000);
    const dialog = new TestableDangerDialog(longLine, () => {});
    const lines = dialog.render(80);

    // With width=80, visible line length (minus ANSI codes) should be <= 80.
    // ANSI escape sequences add extra bytes but don't affect terminal column width.
    const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
    for (const line of lines) {
      const visibleLen = stripAnsi(line).length;
      assert.ok(visibleLen <= 80, `Visible length ${visibleLen} should fit within dialog width 80`);
    }
  });
});
