---
name: markdown-to-html
description: Converts a hardened markdown spec file into a polished, self-contained editorial visual story with high-fidelity layouts, narrative pacing, explanatory visualizations, audience-friendly summaries, risk badges, diagrams, and lightweight interaction. Use when a spec should be readable by both technical and non-technical audiences.
input:
  input_file: (Required) Path to the source markdown spec file (e.g., docs/specs/FEATURE.md)
  output_file: (Optional) Path for the HTML output. Defaults to same directory as input with .html extension.
---

# Markdown-to-HTML Skill — Editorial Visual Story Build

## Goal

Convert a hardened markdown specification into a **visually rich, immediately digestible editorial visual story** as a self-contained HTML document. You are not doing a mechanical conversion — you are designing a reading experience with the polish, pacing, and explanatory clarity of a high-end interactive newsroom visual feature.

**Core mindset**: The reader may be an engineer, executive, designer, security reviewer, or operations lead. They need the same facts at different depths. Lead with comprehension: turn complex requirements into visual explanations, plain-language takeaways, and progressive technical detail.

**Style target**: Editorial visual storytelling inspired by high-end visual journalism. Do not copy any publication's branding, assets, proprietary layouts, logos, or trade dress. Recreate the qualities that matter: strong hierarchy, generous pacing, clear annotations, scrollytelling rhythm, precise charts, and humane explanations.

---

## Visual Story Contract

Every generated HTML spec should feel like a narrative explainer, not a decorated document:

- Lead with a full-viewport editorial hero that states the feature, status, risk posture, and one-sentence thesis.
- Add a "What matters" summary for non-technical readers and a "Technical map" for implementation readers.
- Convert dense markdown structures into visual artifacts whenever possible: architecture maps, timelines, scorecards, risk matrices, dependency maps, state diagrams, or implementation roadmaps.
- Use progressive disclosure: plain-language explanation first, technical details nearby in expandable or anchored sections.
- Build scroll rhythm with sections, sticky side notes, annotated figures, and visual separators.
- Prefer purposeful motion: scroll progress, section reveal, active TOC state, figure annotations, and audience-depth toggles. Use lightweight vanilla JS only.
- Keep everything accessible: semantic HTML, keyboard-friendly controls, visible focus states, reduced-motion support, and sufficient color contrast.

### Visual Journalism Patterns to Adapt

Choose a story archetype before designing the page. Use the source spec's content to decide which pattern helps comprehension most:

| Archetype | Use When | Spec Translation |
|-----------|----------|------------------|
| Scroll explainer | A system change has a chain of causes and effects | Walk readers from trigger → system response → user impact → mitigation |
| Searchable matrix | Many entities, endpoints, roles, jobs, services, or files need comparison | Add a filter/search control with a visual grid and plain-language empty state |
| Step-through interactive | The concept is best understood one decision or state at a time | Use previous/next controls, keyboard arrows, and visible step count |
| Compare-and-contrast panel | Two approaches, configurations, prompts, responses, or flows differ | Place variants side by side with highlighted deltas and takeaway captions |
| Tracker/dashboard | Status changes over time or across many items | Lead with counts, progress bars, status chips, and grouped detail tables |
| Annotated evidence board | The spec depends on screenshots, logs, traces, examples, or audit findings | Show evidence snippets with callout labels tied to the requirement they justify |
| Methodology-backed analysis | Claims depend on source data, assumptions, or calculations | Add a methodology section explaining sources, transformations, and limits |

Do not use an archetype as decoration. If the spec lacks the content needed for an interaction, use a static annotated figure instead.

### Interaction Contract

Interactive elements must teach, not entertain:

- Add a visible "Scroll to continue", step count, or progress cue for long narrative sequences.
- Search/filter controls must include labels, keyboard support, reset behavior, and an empty-state message.
- Step-through components must work with buttons and arrow keys; never require swipe-only navigation.
- Comparison panels must label what changed and why it matters.
- If JavaScript is required for a visualization, include a non-JS fallback summary or table and a short notice.
- Every chart-like visual must include source/methodology notes when numbers, scoring, or classifications are derived.

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
| Problem / goals / user stories | Plain-language "What this changes" panel |
| Architecture / flow text | Annotated system map or step-flow visualization |
| Risk tables / severity counts | Risk matrix, stacked count strip, or priority board |
| Implementation phases | Horizontal roadmap or vertical timeline |
| Testing strategy | Coverage grid with validation targets |
| Open questions | Decision board grouped by owner / impact / urgency |

### 3. Build a Story Blueprint Before Writing HTML

Before generating HTML, decide the visual narrative:

| Story Layer | Purpose | Required Output |
|-------------|---------|-----------------|
| Archetype layer | Choose the dominant reading pattern | Scroll explainer, searchable matrix, stepper, comparison, tracker, evidence board, or methodology-backed analysis |
| Executive layer | Explain the why, impact, and risk in plain language | Hero thesis, key takeaways, risk posture |
| Technical layer | Preserve implementation-ready detail | Anchored sections, diagrams, tables, code blocks |
| Visual layer | Make relationships understandable quickly | At least 3 meaningful visual treatments for non-trivial specs |
| Navigation layer | Let readers move by interest and depth | Sticky TOC, section progress, audience/depth controls |
| Source layer | Preserve trust and auditability | Methodology/source note for derived claims, generated visuals, or transformed tables |

For short specs, use compact visual cards. For long specs, create a scrollytelling sequence with visual anchors every 1-2 sections. Never add decorative visuals that do not clarify the content.

### 4. Determine Output Path

- If `output_file` provided → use it
- Otherwise: `docs/specs/FEATURE.md` → `docs/specs/FEATURE.html`

---

## Phase 2: Build HTML in Chunks — DO NOT Skip This Rule

**Critical**: Generate the HTML in **sequential chunks**. Write each chunk, then move to the next. Do NOT attempt to output the entire document in a single response — long single-shot generation drops sections and produces malformed markup.

### Chunk 1: Shell — `<head>` with CSS, Opening Body

Generate the complete `<head>` and opening structure. Embed **all CSS inline** (no external stylesheets). 

#### Required Editorial CSS Design Tokens

```css
:root {
  --page-bg: #f7f3ec;
  --paper: #fffdf8;
  --ink: #17130f;
  --ink-soft: #4c463f;
  --ink-muted: #746c61;
  --rule: #d8cfc2;
  --panel: #efe7da;
  --panel-strong: #e3d7c7;
  --accent-red: #b3261e;
  --accent-amber: #b86b00;
  --accent-blue: #155e91;
  --accent-green: #2f6f4e;
  --accent-purple: #6f4aa8;
  --accent-cyan: #147c83;
  --code-bg: #17130f;
  --code-ink: #f5efe5;
  --shadow-soft: 0 18px 50px rgba(23, 19, 15, 0.10);
  --font-stack: Georgia, 'Times New Roman', serif;
  --font-sans: system-ui, -apple-system, 'Segoe UI', Inter, Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
  /* Compatibility aliases for component snippets below */
  --bg-primary: var(--page-bg);
  --bg-secondary: var(--paper);
  --bg-tertiary: var(--panel);
  --text-primary: var(--ink);
  --text-secondary: var(--ink-soft);
  --text-muted: var(--ink-muted);
  --border-color: var(--rule);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--font-sans);
  background: var(--page-bg);
  color: var(--ink);
  line-height: 1.7;
  font-size: 16px;
}

.scroll-progress {
  position: fixed;
  inset: 0 0 auto;
  height: 4px;
  z-index: 20;
  background: rgba(23, 19, 15, 0.08);
}
.scroll-progress span {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--accent-red);
  transform: scaleX(0);
  transform-origin: left center;
}
.noscript-banner {
  padding: 0.75rem 1rem;
  background: var(--accent-amber);
  color: #fff;
  font: 700 0.9rem/1.4 var(--font-sans);
  text-align: center;
}

.spec-doc {
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 0 3rem 3rem;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 3rem;
}

.spec-doc > .content-area {
  min-width: 0;
  max-width: 1180px;
}

.story-section {
  display: grid;
  grid-template-columns: minmax(0, 68ch) minmax(260px, 1fr);
  gap: clamp(1.5rem, 4vw, 4rem);
  align-items: start;
  padding: clamp(3rem, 8vh, 7rem) 0;
  border-top: 1px solid var(--rule);
}

.section-copy {
  min-width: 0;
}

.visual-anchor,
.figure-card,
.data-card {
  background: var(--paper);
  border: 1px solid var(--rule);
  box-shadow: var(--shadow-soft);
  padding: clamp(1rem, 2vw, 1.75rem);
}

.kicker,
.eyebrow,
.toc-title {
  font-family: var(--font-sans);
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}

/* On very wide screens, allow content to expand but keep reading-friendly line length */
@media (min-width: 1400px) {
  .spec-doc > .content-area {
    max-width: none;
  }
}

/* Tablet: collapse sidebar, full single column */
@media (max-width: 1100px) {
  .spec-doc {
    grid-template-columns: 1fr;
    padding: 2rem 2rem;
  }
  .sidebar { display: none; }
  .story-section {
    grid-template-columns: 1fr;
  }
}

/* Mobile: tighter padding */
@media (max-width: 600px) {
  .spec-doc {
    padding: 1.5rem 1rem;
  }
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
<noscript>
  <div class="noscript-banner">
    This page includes interactive visualizations. Core findings and source tables remain available below.
  </div>
</noscript>
<div class="scroll-progress" aria-hidden="true"><span></span></div>
<main class="spec-doc">

<nav class="sidebar" id="toc">
  <!-- populated in Chunk 2 -->
</nav>

<div class="content-area">
  <!-- content populates in Chunks 3-6 -->
</div>

</main>
```

#### Responsive Layout Requirements

• The `.spec-doc` wrapper must use `width: 100%` — no fixed max-width on the outer container. It should span the full viewport width.
• Main narrative copy should stay near 65-75 characters per line; visual anchors and figures may use wider space.
• Use THREE responsive breakpoints (1400px wide / 1100px tablet / 600px mobile) instead of a single one.
• Padding scales with screen size: generous on desktop (3rem), moderate on tablet (2rem), tight on mobile (1rem).
• Sidebar collapses to hidden at 1100px, not 900px — earlier collapse gives more content room on medium screens.
• Use two-column story sections on desktop: narrative copy on the left, visual explanation on the right. Collapse to one column on tablet/mobile.
• Include `prefers-reduced-motion` support for any animation or scroll reveal.

#### CSS You MUST Include (complete list)

1. **Typography scale**: editorial hero `h1` (clamp 2.75rem-6rem, serif), `h2` (clamp 1.9rem-3rem), `h3` (1.35rem), body (1rem, line-height 1.7+)
2. **Paragraphs**: `margin-bottom: 1.2em`, proper spacing between blocks
3. **Horizontal rules**: Styled dividers between major sections (`border-color`, subtle)
4. **Links**: Accent blue color, underline on hover
5. **Inline code**: Monospace font, slight background tint, rounded corners, padding
6. **Bold/italic**: Standard HTML semantic styling
7. **Scroll progress**: fixed top progress bar driven by lightweight JS
8. **Visual figure system**: `.visual-anchor`, `.figure-card`, `.caption`, `.annotation`, `.metric-strip`

---

### Chunk 2: Navigation, Reading Controls, and Story Index

Generate a clickable sidebar from the H1/H2 headings and add reading controls that let mixed audiences choose the level of detail they need.

#### Structure

```html
<nav class="sidebar" id="toc">
  <a class="skip-link" href="#story-start">Skip to story</a>
  <h3 class="toc-title">Contents</h3>
  <div class="audience-toggle" role="group" aria-label="Reading depth">
    <button type="button" class="depth-btn active" data-depth="summary">Summary</button>
    <button type="button" class="depth-btn" data-depth="technical">Technical</button>
  </div>
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
  font-family: var(--font-sans);
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
.toc-list li a.active {
  color: var(--ink);
  border-left-color: var(--accent-red);
  font-weight: 700;
}
.toc-sublist { list-style: none; padding-left: 1rem; }
.audience-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 0 0 1rem;
  padding: 4px;
  background: var(--panel);
  border: 1px solid var(--rule);
}
.depth-btn {
  border: 0;
  background: transparent;
  color: var(--ink-soft);
  font: 700 0.75rem/1 var(--font-sans);
  padding: 0.55rem 0.65rem;
  cursor: pointer;
}
.depth-btn.active {
  background: var(--ink);
  color: var(--paper);
}

html[data-depth="summary"] .technical-layer {
  display: none;
}

html[data-depth="technical"] .summary-layer {
  display: none;
}

html:not([data-depth]) .technical-layer {
  display: none;
}
```

---

### Chunk 3: Editorial Story Sections — The Core Document Body

Convert each top-level markdown section (H2) into its own editorial `<section>`. **Build one section at a time** within this chunk. Each substantial section should pair explanatory copy with a visual anchor.

#### Section Structure

Each H2 heading starts a new `<section>`:

```html
<section class="story-section" id="slugified-heading">
  <div class="section-copy">
    <p class="kicker">[Short section category]</p>
    <h2 id="slugified-heading">Section Title</h2>
    <p class="lede">[Plain-language summary of why this section matters]</p>
    <div class="summary-layer" data-depth="summary">
      <!-- Non-technical explanation and key takeaway -->
    </div>
    <div class="technical-layer" data-depth="technical">
      <!-- Original spec details converted from markdown -->
    </div>
  </div>
  <aside class="visual-anchor" aria-label="[visual explanation label]">
    <!-- chart, timeline, system map, scorecard, matrix, or annotated diagram -->
  </aside>
</section>
```

#### H1 / Hero Section

The top-level H1 becomes a hero banner at the very top of content:

```html
<header class="doc-header" id="story-start">
  <p class="eyebrow">Technical specification visual story</p>
  <h1 id="top">[Document Title]</h1>
  <p class="doc-subtitle">[One-sentence thesis in plain language]</p>
  <div class="metric-strip" aria-label="Document status summary">
    <div><span class="metric-value">[status]</span><span class="metric-label">Status</span></div>
    <div><span class="metric-value">[N]</span><span class="metric-label">Critical risks</span></div>
    <div><span class="metric-value">[N]</span><span class="metric-label">Implementation phases</span></div>
  </div>
</header>
```

CSS for hero:
- Full-width editorial opening with `min-height: 70vh` on desktop
- Huge serif headline with responsive `clamp()`
- Plain-language subtitle with readable line length
- Metric strip or status summary visible in the first viewport

#### Required Visual Treatments

Choose visual treatments that fit the source content. For non-trivial specs, include at least three:

| Source Content | Visual Treatment |
|----------------|------------------|
| Architecture / request flow | Annotated system map, Mermaid diagram, or custom CSS node-link figure |
| Implementation phases | Roadmap timeline with phase status and dependencies |
| Risk assessment | Matrix by likelihood/impact plus severity count strip |
| API endpoints | Endpoint cards grouped by resource and auth requirement |
| Data model | Entity relationship figure plus field glossary |
| Testing strategy | Coverage heatmap by layer and environment |
| Rollout / rollback | Step timeline with monitoring checkpoints |
| Open questions | Decision board sorted by impact and owner |

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
  color: var(--code-ink);
}
```

#### Creative Enhancements You Should Add

- **Color-coded language tags**: Different accent colors for `python` (green), `javascript`/`typescript` (yellow), `bash`/`shell` (orange), `json` (blue)
- If the code block is particularly long (>30 lines), consider adding a visual line-count indicator in the header

---

### Chunk 5: Visualizations, Tables & Mermaid Diagrams

Do not default every table to a literal table. Decide whether the reader will understand the content faster as a table, chart-like card set, matrix, timeline, dependency map, or annotated figure.

#### Visualization Selection Rules

| Markdown Source | Prefer This HTML Treatment |
|-----------------|----------------------------|
| Severity/count summary | Horizontal stacked bar or metric strip, with table available below if needed |
| Likelihood x impact risk table | 2D risk matrix with findings positioned by severity |
| Phase/milestone table | Timeline or roadmap with dependency arrows/labels |
| API endpoint table | Grouped endpoint cards with method badges and auth chips |
| Acceptance criteria | Checklist board grouped by user outcome |
| Environment constraints | Constraint cards grouped by filesystem, runtime, network, hardware |
| Open questions | Decision board with impact and urgency indicators |

When transforming a table into a visualization, preserve all source information. If the visualization summarizes, include the full table below it in a collapsible `<details>` block.

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
<figure class="diagram-block visual-anchor">
  <figcaption class="diagram-header">Diagram: [plain-language explanation]</figcaption>
  <pre class="mermaid">
    [mermaid source code]
  </pre>
</figure>
```

CSS:
- Container with editorial paper or high-contrast background, border, generous margin
- The `<pre class="mermaid">` renders via CDN script
- If mermaid content is complex/wide, add `overflow-x: auto` on container
- Add a caption that explains what the reader should notice, not merely "Diagram"

#### Custom CSS Figures

When Mermaid is not enough or source content is not diagram syntax, build semantic CSS/HTML figures:

```html
<figure class="explainer-figure">
  <figcaption>
    <span class="kicker">Risk posture</span>
    <strong>Most residual risk clusters around deployment timing.</strong>
  </figcaption>
  <div class="risk-matrix" role="img" aria-label="[text alternative]">
    <!-- positioned cells/cards -->
  </div>
</figure>
```

Each figure needs:
- A real `<figcaption>` with the takeaway
- An `aria-label` or nearby text alternative when the visual encodes meaning
- No color-only encoding; combine color with text, shape, label, or position

#### Interactive Explainer Components

Use these components when the source content warrants them:

```html
<section class="interactive-module searchable-matrix" aria-labelledby="matrix-title">
  <div class="module-header">
    <p class="kicker">Explore</p>
    <h3 id="matrix-title">Find the affected service, role, endpoint, or risk</h3>
  </div>
  <label class="search-label" for="matrix-search">Search</label>
  <input id="matrix-search" type="search" placeholder="Type to filter..." />
  <div class="matrix-results" aria-live="polite">
    <!-- cards or rows filtered by vanilla JS -->
  </div>
  <p class="empty-state" hidden>No matching items. Try a broader term.</p>
</section>
```

```html
<section class="interactive-module stepper" aria-labelledby="stepper-title">
  <h3 id="stepper-title">Follow the decision path</h3>
  <div class="step-panel" data-step="1">...</div>
  <div class="step-controls">
    <button type="button" data-step-prev>Previous</button>
    <span class="step-count">1 / [N]</span>
    <button type="button" data-step-next>Next</button>
  </div>
</section>
```

```html
<figure class="comparison-panel">
  <figcaption><strong>What changes when the mitigation is added?</strong></figcaption>
  <div class="compare-grid">
    <div><h4>Before</h4><!-- original behavior --></div>
    <div><h4>After</h4><!-- hardened behavior --></div>
  </div>
</figure>
```

Rules:
- Searchable modules need reset behavior, keyboard-accessible controls, and a visible result count.
- Steppers need previous/next buttons, keyboard arrow support, and a full static fallback in source order.
- Comparison panels should highlight deltas, not merely duplicate two text blocks.
- Keep datasets inline as HTML attributes or embedded JSON only when small; otherwise render static cards/tables.

---

### Chunk 6: Severity, Disposition Badges & Callouts — Visual Risk Signals

This chunk adds the finishing visual touches that make risk instantly scannable.

#### Severity Badge Rendering

Replace every `[CRITICAL]`, `[WARNING]`, `[INFO]` and hardening dispositions in the document with styled badge spans:

```html
<span class="badge badge-critical">CRITICAL</span>
<span class="badge badge-warning">WARNING</span>
<span class="badge badge-info">INFO</span>
<span class="badge badge-resolved">RESOLVED</span>
<span class="badge badge-deferred">DEFERRED</span>
<span class="badge badge-rejected">REJECTED</span>
<span class="badge badge-na">NOT APPLICABLE</span>
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

.badge-resolved {
  background: var(--accent-green);
  color: #fff;
}

.badge-deferred {
  background: var(--accent-purple);
  color: #fff;
}

.badge-rejected,
.badge-na {
  background: var(--ink-muted);
  color: #fff;
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
<section class="methodology-block" aria-labelledby="methodology-title">
  <h2 id="methodology-title">About this spec visualization</h2>
  <p>Generated from [input_file]. Visual transformations preserve the source markdown and summarize derived tables for readability.</p>
  <ul>
    <li><strong>Source:</strong> [input_file path and date]</li>
    <li><strong>Transformations:</strong> [tables converted to matrices/timelines/cards]</li>
    <li><strong>Limitations:</strong> [any assumptions, missing data, or JS-dependent interactions]</li>
  </ul>
</section>

<footer class="doc-footer">
  <p>Generated from markdown specification on [CURRENT DATE]</p>
</footer>

<script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
      background: '#fffdf8',
      primaryColor: '#efe7da',
      primaryTextColor: '#17130f',
      lineColor: '#746c61',
      fontFamily: 'system-ui, sans-serif'
    },
    securityLevel: 'loose'
  });

  const progress = document.querySelector('.scroll-progress span');
  const links = Array.from(document.querySelectorAll('.toc-list a'));
  const sections = links
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const pct = height > 0 ? Math.min(1, scrollTop / height) : 0;
    if (progress) progress.style.transform = `scaleX(${pct})`;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
      entry.target.classList.add('in-view');
    });
  }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });

  sections.forEach(section => observer.observe(section));
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  document.querySelectorAll('.depth-btn').forEach(button => {
    button.addEventListener('click', () => {
      const depth = button.dataset.depth;
      document.documentElement.dataset.depth = depth;
      document.querySelectorAll('.depth-btn').forEach(btn => btn.classList.toggle('active', btn === button));
    });
  });

  document.querySelectorAll('[data-step-next], [data-step-prev]').forEach(button => {
    button.addEventListener('click', () => {
      const stepper = button.closest('.stepper');
      if (!stepper) return;
      const panels = Array.from(stepper.querySelectorAll('.step-panel'));
      const current = panels.findIndex(panel => !panel.hidden);
      const delta = button.matches('[data-step-next]') ? 1 : -1;
      const next = Math.max(0, Math.min(panels.length - 1, current + delta));
      panels.forEach((panel, index) => panel.hidden = index !== next);
      const count = stepper.querySelector('.step-count');
      if (count) count.textContent = `${next + 1} / ${panels.length}`;
    });
  });

  document.querySelectorAll('input[type="search"][id$="-search"]').forEach(input => {
    input.addEventListener('input', () => {
      const module = input.closest('.searchable-matrix');
      if (!module) return;
      const query = input.value.trim().toLowerCase();
      const items = Array.from(module.querySelectorAll('[data-search-text]'));
      let visible = 0;
      items.forEach(item => {
        const match = item.dataset.searchText.toLowerCase().includes(query);
        item.hidden = !match;
        if (match) visible += 1;
      });
      const empty = module.querySelector('.empty-state');
      if (empty) empty.hidden = visible !== 0;
      const count = module.querySelector('.result-count');
      if (count) count.textContent = `${visible} result${visible === 1 ? '' : 's'}`;
    });
  });
</script>

</body>
</html>
```

#### Footer CSS

```css
.doc-footer {
  width: 100%;
  padding: 2rem 3rem 2rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  border-top: 1px solid var(--border-color);
}

@media (max-width: 1100px) {
  .doc-footer { padding: 2rem 2rem; }
}

@media (max-width: 600px) {
  .doc-footer { padding: 1.5rem 1rem; }
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
grep -q 'Visual Story\\|story-section\\|visual-anchor' OUTPUT && echo "✅ Visual story structure" || echo "❌ Missing story structure"
grep -q 'scroll-progress' OUTPUT && echo "✅ Scroll progress" || echo "❌ No scroll progress"
grep -q 'depth-btn\\|data-depth' OUTPUT && echo "✅ Audience depth controls" || echo "❌ No audience controls"
grep -q '<figure\\|visual-anchor\\|risk-matrix\\|roadmap' OUTPUT && echo "✅ Visual figures" || echo "❌ No visual figures"
grep -q 'methodology-block\\|About this spec visualization' OUTPUT && echo "✅ Methodology block" || echo "❌ No methodology block"
grep -q '<noscript' OUTPUT && echo "✅ No-JS fallback notice" || echo "❌ No no-JS notice"
grep -q ':root' OUTPUT && echo "✅ CSS variables" || echo "❌ No CSS variables"

# Badge classes (only if source had severity tags)
grep -c 'badge-' OUTPUT | xargs -I{} echo "Badge elements: {}"

echo "File size: $(wc -c < OUTPUT) bytes, $(wc -l < OUTPUT) lines"
```

If any tag counts don't match, inspect and fix the mismatched region.

---

## Phase 3: Visual Verification

Open the output HTML file in a browser and confirm each criterion:

- [ ] **Editorial presentation**: Page feels like a polished visual explainer, not a decorated markdown export
- [ ] **Typography**: Strong editorial hierarchy, readable body text, line-height 1.6+, no text overflow
- [ ] **Sidebar nav**: Sticky sidebar with clickable TOC links, smooth scroll to sections
- [ ] **Hero header**: H1, thesis, status/risk summary, and first visual signal appear in the opening viewport
- [ ] **Audience accessibility**: Non-technical summary layer and technical detail layer both work
- [ ] **Visual density**: Non-trivial specs include at least 3 meaningful visual treatments
- [ ] **Comprehension**: Each major visual has a takeaway caption or annotation
- [ ] **Code blocks**: High-contrast code background, monospace font, scrollable overflow, language labels
- [ ] **Tables**: Bordered cells, sticky headers, alternating row backgrounds, hover states
- [ ] **Severity badges**: CRITICAL (red/glow), WARNING (amber), INFO (blue) — visually pop from text
- [ ] **Callouts**: Blockquotes render as left-bordered boxes with background tint
- [ ] **Mermaid diagrams**: Render correctly (if any exist in source)
- [ ] **Interaction**: Scroll progress, active nav state, depth toggle, and reveal states work without errors
- [ ] **Interactive modules**: Search, stepper, or comparison components have keyboard-accessible controls when present
- [ ] **Methodology**: Derived visuals include source, transformation, and limitation notes
- [ ] **Fallbacks**: JS-dependent interactions have a no-JS notice and static source-order content
- [ ] **Reduced motion**: `prefers-reduced-motion` disables nonessential movement
- [ ] **Responsive**: Content fills full width on wide screens; sidebar collapses at 1100px; no horizontal scroll
- [ ] **No broken links**: All anchor IDs match between TOC and section headings

---

## Creative Design Guidance — Use Your Judgment

You are encouraged to go beyond the baseline requirements. Consider adding:

### Visual Enhancements (choose what fits the document)

- **Section progress indicator**: Subtle colored left-border on sections that changes per depth
- **Abbreviation / acronym tooltips**: For technical terms, add `<abbr title="...">` where helpful
- **Key metrics callout**: If a section contains critical numbers or thresholds, visually highlight them
- **Status chips**: For sections that describe requirements status, add visual status indicators
- **Summary box at top**: If the document is long (>10 sections), consider a "key takeaways" summary block after the hero
- **Scrollytelling steps**: For sequences, use sticky figures with adjacent step text
- **Annotated relationships**: Label arrows, dependencies, and trust boundaries in diagrams
- **Non-technical glossary**: Add inline definitions or a glossary strip for dense technical terms

### What NOT to do

- Do NOT copy the branding, proprietary visual identity, logos, fonts, or layouts of any publication
- Do NOT add JavaScript frameworks, analytics, remote widgets, or tracking
- Do NOT load external fonts or assets (keep self-contained)
- Do NOT add motion that is essential to understanding; the page must work with reduced motion
- Do NOT alter the semantic meaning of any content
- Do NOT skip sections — every H2 section must be converted
- Do NOT use inline styles where CSS classes work (keep HTML clean)

---

## Quick-Start Checklist

1. ✅ Read full markdown source file
2. ✅ Analyze: note headings, code blocks, tables, badges, callouts, mermaid, visual opportunities
3. ✅ Choose the dominant story archetype and note any secondary modules
4. ✅ **Chunk 1**: Write `<head>` + complete embedded CSS + opening body structure
5. ✅ **Chunk 2**: Generate sidebar navigation, scroll progress, and audience controls
6. ✅ **Chunk 3**: Convert each H2 section into editorial story sections with visual anchors
7. ✅ **Chunk 4**: Render all code blocks with styled containers
8. ✅ **Chunk 5**: Convert tables into the clearest visualization, plus Mermaid diagram blocks
9. ✅ **Chunk 6**: Apply severity/disposition badges + style callouts
10. ✅ **Chunk 7**: Add methodology block, close all tags, add `<footer>`, inject Mermaid CDN script and lightweight vanilla JS
11. ✅ Validate: tag balance check, Mermaid init present, visual inspection in browser

**Golden rules**: Chunked build always. Visual storytelling is required, not optional. Every meaningful visual must teach something. Severity badges must be impossible to miss. Every section gets an anchor ID. The page must serve both technical and non-technical audiences. Zero external dependencies beyond Mermaid CDN.
