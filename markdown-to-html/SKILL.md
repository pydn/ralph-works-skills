---
name: markdown-to-html
description: Converts a hardened markdown spec file into a polished, self-contained HTML document. The LLM generates the HTML directly with creative visual judgment — adding color-coded badges, sidebar navigation, visual callouts, diagram blocks, and readability optimizations for maximum human scanability.
input:
  input_file: (Required) Path to the source markdown spec file (e.g., docs/specs/FEATURE.md)
  output_file: (Optional) Path for the HTML output. Defaults to same directory as input with .html extension.
---

# Markdown-to-HTML Skill — Creative Chunked Build

## Goal

Convert a hardened markdown specification into a **visually rich, immediately digestible** self-contained HTML document. You are not doing a mechanical conversion — you are designing a reading experience. Every visual decision should make the document more scannable, more memorable, and faster to understand for human reviewers.

**Core mindset**: The reader is glancing at this under time pressure — likely reviewing a security-critical spec. They need to find risk signals in seconds, navigate sections without scrolling aimlessly, and absorb structure at a glance. Make that effortless.

---

## Phase 1: Read & Analyze the Source

### 1. Load the Markdown File

Read `input_file` completely. Understand the full document before generating any HTML.

### 2. Pre-Scan — Mental Map of Rendering Needs

As you read, note every feature that needs special treatment:

| Pattern | Rendering Treatment |
|---------|-------------------|
| `[CRITICAL]` tags | Red badge with glow — must be impossible to miss |
| `[WARNING]` tags | Amber badge with warm tint |
| `[INFO]` tags | Blue badge with cool tint |
| `> blockquotes` | Callout boxes with left-border accent |
| Fenced code blocks (```) | Dark background, monospace, scrollable, language label |
| Mermaid blocks (` ```mermaid `) | `<pre class="mermaid">` — renders via CDN script |
| Pipe tables | Styled HTML table with sticky header, alternating rows |
| H1 heading | Hero section — large title, subtitle if present |
| H2 headings | Section dividers with visual weight + anchor IDs |
| H3+ headings | Sub-sections nested under H2 sections |

### 3. Determine Output Path

- If `output_file` provided → use it
- Otherwise: `docs/specs/FEATURE.md` → `docs/specs/FEATURE.html`

---

## Phase 2: Build HTML in Chunks — DO NOT Skip This Rule

**Critical**: Generate the HTML in **sequential chunks**. Write each chunk, then move to the next. Do NOT attempt to output the entire document in a single response — long single-shot generation drops sections and produces malformed markup.

### Chunk 1: Shell — `<head>` with CSS, Opening Body

Generate the complete `<head>` and opening structure. Embed **all CSS inline** (no external stylesheets). 

#### Required CSS Design Tokens

```css
:root {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #1c2128;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;
  --border-color: #30363d;
  --accent-blue: #58a6ff;
  --accent-red: #f85149;
  --accent-amber: #d29922;
  --accent-green: #3fb950;
  --accent-purple: #bc8cff;
  --code-bg: #161b22;
  --font-stack: system-ui, -apple-system, 'Segoe UI', Inter, Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--font-stack);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.7;
  font-size: 16px;
}

.spec-doc {
  max-width: 85ch;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 3rem;
}

.spec-doc > .content-area { min-width: 0; }

/* Responsive: collapse sidebar on narrower screens */
@media (max-width: 900px) {
  .spec-doc { grid-template-columns: 1fr; }
  .sidebar { display: none; }
}
```

#### Required Layout Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Doc Title]</title>
  <style>
    /* ALL CSS HERE */
  </style>
</head>
<body>
<main class="spec-doc">

<nav class="sidebar" id="toc">
  <!-- populated in Chunk 2 -->
</nav>

<div class="content-area">
  <!-- content populates in Chunks 3-6 -->
</div>

</main>
```

#### CSS You MUST Include (complete list)

1. **Typography scale**: `h1` (2.25rem, bold), `h2` (1.75rem, with top border), `h3` (1.35rem), body (1rem, line-height 1.7+)
2. **Paragraphs**: `margin-bottom: 1.2em`, proper spacing between blocks
3. **Horizontal rules**: Styled dividers between major sections (`border-color`, subtle)
4. **Links**: Accent blue color, underline on hover
5. **Inline code**: Monospace font, slight background tint, rounded corners, padding
6. **Bold/italic**: Standard HTML semantic styling

---

### Chunk 2: Sidebar Navigation (Table of Contents)

Generate a clickable sidebar from the H1/H2 headings. 

#### Structure

```html
<nav class="sidebar" id="toc">
  <h3 class="toc-title">Contents</h3>
  <ul class="toc-list">
    <li><a href="#heading-slug">Heading Text</a></li>
    <!-- H3+ items nested under their parent H2 -->
    <li>
      <a href="#parent-h2">Parent Section</a>
      <ul class="toc-sublist">
        <li><a href="#child-h3">Sub Section</a></li>
      </ul>
    </li>
  </ul>
</nav>
```

#### CSS for Sidebar

```css
.sidebar {
  position: sticky;
  top: 2rem;
  align-self: start;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
}
.toc-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}
.toc-list { list-style: none; }
.toc-list li a {
  display: block;
  padding: 4px 8px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: all 0.15s ease;
}
.toc-list li a:hover {
  color: var(--text-primary);
  border-left-color: var(--accent-blue);
}
.toc-sublist { list-style: none; padding-left: 1rem; }
```

---

### Chunk 3: Content Sections — The Core Document Body

Convert each top-level markdown section (H2) into its own HTML `<section>`. **Build one section at a time** within this chunk.

#### Section Structure

Each H2 heading starts a new `<section>`:

```html
<section id="slugified-heading">
  <h2 id="slugified-heading">Section Title</h2>
  
  <p>Paragraph content converted from markdown.</p>
  
  <!-- nested elements: code blocks, tables, lists, badges -->
  
</section>
```

#### H1 / Hero Section

The top-level H1 becomes a hero banner at the very top of content:

```html
<header class="doc-header">
  <h1 id="top">[Document Title]</h1>
  <p class="doc-subtitle">[Any subtitle or description from the markdown]</p>
</header>
```

CSS for hero:
- Large font (2.5rem), bold
- Subtle bottom border separator
- Generous top/bottom padding (3rem+)

#### Lists — Ordered and Unordered

Convert markdown lists with proper nesting. Use semantic `<ol>`/`<ul>` tags. Style with adequate padding-left so nested items are clearly indented.

#### Inline Formatting Rules

| Markdown | HTML | Notes |
|----------|------|-------|
| `**text**` or `__text__` | `<strong>text</strong>` | |
| `*text*` or `_text_` | `<em>text</em>` | |
| `` `code` `` | `<code class="inline-code">code</code>` | Small background tint, monospace |
| `[text](url)` | `<a href="url">text</a>` | Accent color |
| `~~strikethrough~~` | `<del>strikethrough</del>` | Muted styling |

---

### Chunk 4: Code Blocks — Syntax-Highlighted Presentation

Every fenced code block (```language ... ```) gets a rich card-style container.

#### Structure

```html
<div class="code-block">
  <div class="code-header">
    <span class="lang-tag language-[lang]">[LANGUAGE]</span>
  </div>
  <pre><code class="language-[lang]">[code content]</code></pre>
</div>
```

#### CSS Requirements for Code Blocks

```css
.code-block {
  background: var(--code-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin: 1.5em 0;
  overflow: hidden;
}
.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}
.lang-tag {
  font-size: 0.7rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}
.code-block pre {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
}
.code-block code {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--text-primary);
}
```

#### Creative Enhancements You Should Add

- **Color-coded language tags**: Different accent colors for `python` (green), `javascript`/`typescript` (yellow), `bash`/`shell` (orange), `json` (blue)
- If the code block is particularly long (>30 lines), consider adding a visual line-count indicator in the header

---

### Chunk 5: Tables & Mermaid Diagrams

#### Styled Tables

Convert pipe tables into rich HTML tables:

```html
<div class="table-wrapper">
  <table>
    <thead>
      <tr>
        <th scope="col">Header 1</th>
        <th scope="col">Header 2</th>
      </tr>
    </thead>
    <tbody>
      <tr class="row-alt">
        <td>Data cell</td>
        <td>Data cell</td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Table CSS

```css
.table-wrapper {
  margin: 1.5em 0;
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
thead th {
  background: var(--bg-secondary);
  padding: 10px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 2px solid var(--border-color);
  position: sticky;
  top: 0;
}
tbody td {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}
tbody tr:hover { background: rgba(88, 166, 255, 0.04); }
tbody tr.row-alt { background: rgba(255,255,255, 0.015); }
```

#### Mermaid Diagrams

Wrap ` ```mermaid ` blocks:

```html
<div class="diagram-block">
  <div class="diagram-header">📊 Diagram</div>
  <pre class="mermaid">
    [mermaid source code]
  </pre>
</div>
```

CSS:
- Container with dark background, border-radius, margin
- The `<pre class="mermaid">` renders via CDN script
- If mermaid content is complex/wide, add `overflow-x: auto` on container

---

### Chunk 6: Severity Badges & Callouts — Visual Risk Signals

This chunk adds the finishing visual touches that make risk instantly scannable.

#### Severity Badge Rendering

Replace every `[CRITICAL]`, `[WARNING]`, `[INFO]` in the document with styled badge spans:

```html
<span class="badge badge-critical">CRITICAL</span>
<span class="badge badge-warning">WARNING</span>
<span class="badge badge-info">INFO</span>
```

#### Badge CSS — MUST Be Visually Prominent

```css
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  line-height: 1.6;
}

.badge-critical {
  background: #da3633;
  color: #fff;
  box-shadow: 0 0 8px rgba(248, 81, 73, 0.5);
}

.badge-warning {
  background: #bb8009;
  color: #fff;
  box-shadow: 0 0 8px rgba(210, 153, 34, 0.35);
}

.badge-info {
  background: #1f6feb;
  color: #fff;
  box-shadow: 0 0 6px rgba(88, 166, 255, 0.3);
}
```

#### Blockquote / Callout Boxes

Render `> blockquotes` as distinct callout containers:

```html
<blockquote class="callout">
  <p>[converted content]</p>
</blockquote>
```

If the blockquote starts with specific keywords, apply a themed variant:

| Keyword in blockquote | Variant class | Left border color | Background tint |
|----------------------|---------------|-------------------|-----------------|
| `> **Note**:` or `> Note:` | `.callout-note` | `var(--accent-blue)` | `rgba(88,166,255,0.06)` |
| `> **Warning**:` or `> Warning:` | `.callout-warning` | `var(--accent-amber)` | `rgba(210,153,34,0.06)` |
| `> **Important**:` or `> Important:` | `.callout-important` | `var(--accent-red)` | `rgba(248,81,73,0.06)` |
| `> **Tip**:` or `> Tip:` | `.callout-tip` | `var(--accent-green)` | `rgba(63,185,80,0.06)` |

Default callouts (no keyword match) use blue accent.

```css
.callout {
  border-left: 4px solid var(--accent-blue);
  background: rgba(88, 166, 255, 0.06);
  padding: 1rem 1.25rem;
  margin: 1.2em 0;
  border-radius: 0 8px 8px 0;
}
.callout p { margin: 0; color: var(--text-secondary); }
.callout strong { color: var(--text-primary); }
```

---

### Chunk 7: Close Document + Mermaid Script + Validate

#### Footer and Script Injection

```html
<footer class="doc-footer">
  <p>Generated from markdown specification on [CURRENT DATE]</p>
</footer>

<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    securityLevel: 'loose'
  });
</script>

</body>
</html>
```

#### Footer CSS

```css
.doc-footer {
  max-width: 85ch;
  margin: 3rem auto 2rem;
  padding: 1.5rem 1.5rem 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  border-top: 1px solid var(--border-color);
}
```

#### Post-Generation Validation

After writing the final chunk, verify the output:

```bash
# Tag balance check
echo "=== Tag Balance ==="
echo "sections: $(grep -c '<section' OUTPUT) open / $(grep -c '</section>' OUTPUT) close"
echo "divs: $(grep -oc '<div' OUTPUT) open / $(grep -oc '</div>' OUTPUT) close"
echo "main: $(grep -c '<main' OUTPUT) open / $(grep -c '</main>' OUTPUT) close"
echo "body: $(grep -c '<body' OUTPUT) open / $(grep -c '</body>' OUTPUT) close"
echo "html: $(grep -c '<html' OUTPUT) open / $(grep -c '</html>' OUTPUT) close"

# Required components
grep -q 'mermaid.initialize' OUTPUT && echo "✅ Mermaid init" || echo "❌ No Mermaid init"
grep -q '<nav.*sidebar' OUTPUT && echo "✅ Sidebar nav" || echo "❌ No sidebar"
grep -q 'bg-primary.*0d1117\|:root' OUTPUT && echo "✅ CSS variables" || echo "❌ No dark theme vars"

# Badge classes (only if source had severity tags)
grep -c 'badge-' OUTPUT | xargs -I{} echo "Badge elements: {}"

echo "File size: $(wc -c < OUTPUT) bytes, $(wc -l < OUTPUT) lines"
```

If any tag counts don't match, inspect and fix the mismatched region.

---

## Phase 3: Visual Verification

Open the output HTML file in a browser and confirm each criterion:

- [ ] **Dark theme**: Background is dark (#0d1117), text is high-contrast white
- [ ] **Typography**: Readable font sizes, proper line-height (1.6+), max-width ~85ch
- [ ] **Sidebar nav**: Sticky sidebar with clickable TOC links, smooth scroll to sections
- [ ] **Hero header**: H1 renders as prominent document title
- [ ] **Code blocks**: Dark background (#161b22), monospace font, scrollable overflow, language labels
- [ ] **Tables**: Bordered cells, sticky headers, alternating row backgrounds, hover states
- [ ] **Severity badges**: CRITICAL (red/glow), WARNING (amber), INFO (blue) — visually pop from text
- [ ] **Callouts**: Blockquotes render as left-bordered boxes with background tint
- [ ] **Mermaid diagrams**: Render correctly (if any exist in source)
- [ ] **Responsive**: No horizontal scroll on normal viewport; sidebar collapses on narrow screens
- [ ] **No broken links**: All anchor IDs match between TOC and section headings

---

## Creative Design Guidance — Use Your Judgment

You are encouraged to go beyond the baseline requirements. Consider adding:

### Visual Enhancements (choose what fits the document)

- **Section progress indicator**: Subtle colored left-border on sections that changes per depth
- **Abbreviation / acronym tooltips**: For technical terms, add `<abbr title="...">` where helpful
- **Key metrics callout**: If a section contains critical numbers or thresholds, visually highlight them
- **Emoji icons in headings**: Small contextual emoji before section titles (🔐 for security, 📊 for data, ⚙️ for config) — use sparingly and tastefully
- **Status chips**: For sections that describe requirements status, add visual status indicators
- **Summary box at top**: If the document is long (>10 sections), consider a "key takeaways" summary block after the hero

### What NOT to do

- Do NOT add JavaScript beyond Mermaid CDN init (no frameworks, no analytics)
- Do NOT load external fonts or assets (keep self-contained)
- Do NOT alter the semantic meaning of any content
- Do NOT skip sections — every H2 section must be converted
- Do NOT use inline styles where CSS classes work (keep HTML clean)

---

## Quick-Start Checklist

1. ✅ Read full markdown source file
2. ✅ Analyze: note headings, code blocks, tables, badges, callouts, mermaid
3. ✅ **Chunk 1**: Write `<head>` + complete embedded CSS + opening body structure
4. ✅ **Chunk 2**: Generate sidebar navigation from H1/H2 headings
5. ✅ **Chunk 3**: Convert each H2 section into `<section>` blocks (one at a time)
6. ✅ **Chunk 4**: Render all code blocks with styled containers
7. ✅ **Chunk 5**: Convert tables + Mermaid diagram blocks
8. ✅ **Chunk 6**: Apply severity badges (`[CRITICAL]`/`[WARNING]`/`[INFO]`) + style callouts
9. ✅ **Chunk 7**: Close all tags, add `<footer>`, inject Mermaid CDN script
10. ✅ Validate: tag balance check, Mermaid init present, visual inspection in browser

**Golden rules**: Chunked build always. Creative visual judgment welcomed and expected. Severity badges must be impossible to miss. Dark theme mandatory. Every section gets an anchor ID. Zero external dependencies beyond Mermaid CDN.
