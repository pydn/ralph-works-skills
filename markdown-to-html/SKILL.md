---
name: markdown-to-html
description: Converts a hardened markdown spec file into a polished, self-contained HTML document with dark theme, severity badges, sidebar navigation, and Mermaid diagram support. Build output incrementally in chunks to avoid malformed markup.
input:
  input_file: (Required) Path to the source markdown spec file (e.g., docs/specs/FEATURE.md)
  output_file: (Optional) Path for the HTML output. Defaults to same directory as input with .html extension.
---

# Markdown-to-HTML Skill — Chunked Build Pipeline

## Goal

Convert a hardened markdown specification into a polished, self-contained HTML document optimized for human readability and quick comprehension. The output uses a dark theme, severity badges, sidebar navigation, syntax-highlighted code blocks, styled tables, and Mermaid diagram rendering.

**Mindset**: You are building a reading experience — not just converting text to markup. Every visual choice must improve scan-ability and reduce cognitive load for the reader reviewing security-critical specifications.

---

## Phase 1: Validate Input

### 1. Read and Verify the Source File

```bash
# Confirm the markdown file exists and is readable
cat "$input_file" | head -20
wc -l "$input_file"
```

### 2. Determine Output Path

- If `output_file` is provided, use it directly.
- Otherwise, derive from input: `docs/specs/FEATURE.md` → `docs/specs/FEATURE.html`

### 3. Pre-scan the Document

Before conversion, scan for key patterns to understand what rendering features are needed:

```bash
# Count structural elements
echo "Headings: $(grep -c '^#' "$input_file")"
echo "Code blocks: $(grep -c '^\`\`\`' "$input_file")"
echo "Tables: $(grep -c '|' "$input_file")"
echo "Mermaid: $(grep -c 'mermaid' "$input_file")"
echo "Severity tags: $(grep -coE '\[(CRITICAL|WARNING|INFO)\]' "$input_file")"
echo "Blockquotes: $(grep -c '^>' "$input_file")"
```

---

## Phase 2: Run the Converter (Chunked Build)

The converter script builds the HTML in **7 sequential chunks**. This prevents single-shot generation failures where long documents lose sections or produce malformed markup.

### Execute the Converter

```bash
node skills/markdown-to-html/convert.js "$input_file" "$output_file"
```

If `node` is unavailable, fall back to manual chunked construction following Phase 3 below.

---

## Phase 3: Manual Chunked Build (Fallback)

If the script cannot run, construct the HTML manually in chunks. Write each chunk sequentially, appending to the output file.

### Chunk 1: Shell — CSS Variables, Dark Theme, Typography

Write the document shell with embedded CSS. Key design tokens:

```css
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #1c2128;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --border-color: #30363d;
  --accent-blue: #58a6ff;
  --accent-red: #f85149;
  --accent-amber: #d29922;
  --accent-green: #3fb950;
  --accent-purple: #bc8cff;
  --code-bg: #161b22;
  --font-stack: system-ui, -apple-system, 'Segoe UI', Inter, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  --max-width: 72ch;
}
```

Required body structure:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Document Title]</title>
  <style>
    /* All CSS embedded here */
  </style>
</head>
<body>
  <main class="spec-doc">
```

### Chunk 2: Table of Contents (Sidebar Navigation)

Auto-generate from H1/H2 headings found in the document:

```html
<nav class="sidebar" id="toc">
  <h2>Table of Contents</h2>
  <ul>
    <li><a href="#section-id">Heading Text</a></li>
    <!-- Nested for H3+ under each H2 -->
  </ul>
</nav>
```

### Chunk 3: Content Sections — Convert Each H2 Section

For each top-level section (H2 heading and everything below it until the next H2):

```html
<section id="[slugified-heading]">
  <h2 id="[slugified-heading]">Heading Text</h2>
  <!-- converted content -->
</section>
```

Apply these rules for inline elements:
- `**bold**` → `<strong>`
- `*italic*` → `<em>`
- `` `inline code` `` → `<code class="inline-code">`
- `[text](url)` → `<a href="url">text</a>`
- Paragraphs separated by blank lines → wrapped in `<p>`

### Chunk 4: Code Blocks — Syntax-Highlighted Rendering

Fenced code blocks (```) render as:

```html
<div class="code-block">
  <div class="code-header">
    <span class="lang-tag">language</span>
    <button class="copy-btn" onclick="copyCode(this)">Copy</button>
  </div>
  <pre><code class="language-[lang]">...</code></pre>
</div>
```

- Language tag from fence (e.g., ` ```python `) → displayed in header
- Use monospace font (`var(--font-mono)`), background `var(--code-bg)`
- Scrollable overflow for wide code blocks
- If no language specified, omit the `lang-tag` span

### Chunk 5: Tables & Mermaid Diagrams

**Tables** — Convert markdown pipe tables to styled HTML:

```html
<div class="table-wrapper">
  <table>
    <thead>
      <tr>
        <th>Header 1</th>
        <th>Header 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Data</td>
        <td>Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Mermaid Diagrams** — Wrap in `<pre class="mermaid">`:

```html
<div class="diagram-block">
  <div class="diagram-header">Diagram</div>
  <pre class="mermaid">
    graph TD
      A --> B
  </pre>
</div>
```

### Chunk 6: Severity Badges & Callouts

**Severity Tags** — Replace inline `[CRITICAL]`, `[WARNING]`, `[INFO]` with styled badges:

```html
<span class="badge badge-critical">CRITICAL</span>
<span class="badge badge-warning">WARNING</span>
<span class="badge badge-info">INFO</span>
```

CSS requirements:
- `badge-critical`: Red background (`#da3633`), text glow effect, subtle pulse animation option
- `badge-warning`: Amber background (`#bb8009`), warm tint
- `badge-info`: Blue background (`#1f6feb`), cool tint
- All badges: rounded corners (6px), padding (2px 8px), uppercase, bold, slightly smaller font

**Blockquotes / Callouts** — Render as distinct callout boxes:

```html
<blockquote class="callout">
  <!-- converted quote content -->
</blockquote>
```

CSS: Left border accent (4px solid `var(--accent-blue)`), background tint (`rgba(88, 166, 255, 0.1)`), padding, margin.

### Chunk 7: Close Tags, Add Footer, Validate

Close the document structure:

```html
  </main>
  <footer>
    <p>Generated from markdown spec on [DATE]</p>
  </footer>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
  </script>
</body>
</html>
```

---

## Phase 4: Validation Checklist

After the HTML file is complete (whether via script or manual build), verify:

### 1. Structural Integrity

```bash
# Count opening vs closing tags
echo "Sections: $(grep -c '<section' "$output_file") open, $(grep -c '</section>' "$output_file") close"
echo "Divs: $(grep -oc '<div' "$output_file") open, $(grep -oc '</div>' "$output_file") close"
echo "Main: $(grep -c '<main' "$output_file") open, $(grep -c '</main>' "$output_file") close"
```

### 2. Required Components Present

```bash
# Verify Mermaid initialization
grep -q 'mermaid.initialize' "$output_file" && echo "✅ Mermaid init found" || echo "❌ Missing Mermaid init"

# Verify severity badges exist if source had them
grep -q 'badge-critical\|badge-warning\|badge-info' "$output_file" && echo "✅ Severity badges present" || echo "⚠️  No severity badges (may not be needed)"

# Verify table of contents exists
grep -q '<nav.*sidebar' "$output_file" && echo "✅ Sidebar navigation found" || echo "❌ Missing sidebar navigation"

# Verify dark theme CSS variables
grep -q 'bg-primary.*0d1117' "$output_file" && echo "✅ Dark theme defined" || echo "❌ Missing dark theme"
```

### 3. Visual Verification

Open the output file in a browser and confirm:
- [ ] Dark theme renders correctly with high-contrast text
- [ ] Sidebar navigation is visible and links scroll to sections
- [ ] Code blocks have dark backgrounds with monospace font
- [ ] Tables render with borders and alternating rows
- [ ] Severity badges are color-coded and visually prominent
- [ ] Callout boxes have left border accent and background tint
- [ ] Mermaid diagrams render (if mermaid blocks exist)
- [ ] No horizontal scroll on normal viewport widths
- [ ] Typography is readable with proper line-height and max-width

---

## Quick-Start Checklist

1. ✅ Read and validate source markdown file
2. ✅ Determine output path
3. ✅ Pre-scan document for rendering features needed
4. ✅ Run `node convert.js input.md output.html` (or build manually in 7 chunks)
5. ✅ Validate tag balance, Mermaid init, badges, sidebar
6. ✅ Open in browser for visual confirmation
7. ✅ Report completion: file path, line count, features detected

**Golden rules**: Build in chunks — never single-shot. Dark theme mandatory. Severity badges must pop. Tables must be readable. All sections must have anchor IDs. Mermaid must initialize with dark theme.
