# Monochrome / 极简研究

Adapted from Zara Zhang's Monochrome, commit e5e204fb1f3b06290846e7dcd7aceddabeceec8c. MIT. This native edition rebuilds twelve editable layouts; it is not an HTML import or an exact copy of every upstream slide.

## Typography

English display: Helvetica Neue; English body: Arial. These portable Office substitutions replace the upstream display face Jost. Chinese display: PingFang SC; body: PingFang SC. On Windows use Microsoft YaHei / Microsoft YaHei; on Linux use Noto Sans CJK SC / Noto Sans CJK SC. No font binary is distributed. Keep the serif/sans distinction.

English previews use source/. Chinese examples use source-zh/. Preview language does not select the language of the user's output. Choose the matching fonts for the actual content; reflow longer translations instead of shrinking titles.

## Layout grammar

 A literary editorial system rendered in black ink on cream paper. Ultra-light geometric sans (Jost at weight 200–300) carries every headline; Lora italic serif handles quote text and insight-card titles; JetBrains Mono provides the structural chrome. There are no chromatic accents — every color in the palette is a graphite or cream tone, and "accent" simply means "darker ink." The aesthetic borrows from independent research reports, scholarly monographs, and the quietest end of contemporary editorial design — closer to a printed journal than a tech presentation.

colors:
  cream-paper: "#FAFADF"
  cream-paper-2: "#F2F2D2"
  cream-paper-3: "#F0F0D4"
  cream-warm: "#F5F0E4"
  ink-black: "#1A1A16"
  ink-graphite: "#5E5E54"
  ink-graphite-light: "#8A8A80"

color-aliases:
  c-bg: cream-paper
  c-bg-light: cream-paper
  c-bg-cream: cream-warm
  c-fg: ink-black
  c-fg-light: ink-black
  c-fg-2: ink-graphite
  c-fg-3: ink-graphite-light
  c-accent: ink-black
  c-border: ink-black
  c-border-light: ink-black

typography:
  display:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 8.5vw
    fontWeight: 200
    lineHeight: 0.96
    letterSpacing: -0.02em
  h1:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 5vw
    fontWeight: 200
    lineHeight: 1.1
    letterSpacing: -0.01em
  h2:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 3.2vw
    fontWeight: 300
    lineHeight: 1.2
  h3:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 2vw
    fontWeight: 400
    lineHeight: 1.3
  lead:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.5vw
    fontWeight: 300
    lineHeight: 1.65
  body:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.1vw
    fontWeight: 300
    lineHeight: 1.7
  caption:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 0.85vw
    fontWeight: 300
    lineHeight: 1.55
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: 0.72vw
    fontWeight: 400
    letterSpacing: 0.12em
    textTransform: uppercase
  quote-serif:
    fontFamily: "Lora, Noto Serif SC, Georgia, serif"
    fontSize: 3.2vw
    fontWeight: 400
    lineHeight: 1.35
  insight-serif:
    fontFamily: "Lora, Noto Serif SC, Georgia, serif"
    fontSize: 2.8vw
    fontWeight: 400
    lineHeight: 1.15
  stat-value:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 5.5vw
    fontWeight: 200
    lineHeight: 1.0
    letterSpacing: -0.03em
  flow-num:
    fontFamily: "Jost, Noto Sans SC, system-ui, sans-serif"
    fontSize: 3.5vw
    fontWeight: 200
    lineHeight: 1.0
    letterSpacing: -0.02em

spacing:
  pad-x: 8vw
  pad-y: 6vh
  gap-lg: 5vh
  gap-md: 3vh
  gap-sm: 1.5vh

canvas:
  width: 100vw
  height: 100vh

components:
  rule:
    width: 36px
    height: 1px
    background: "{colors.ink-black}"
    

1. Cover (cover)
2. Agenda (agenda)
3. Insights (insights)
4. Metrics (data)
5. Comparison chart (data)
6. Process (process)
7. Before and after (comparison)
8. Closing (closing)

All charts and diagrams are native editable vectors. Example figures are illustrative, not reported facts. Retain a 48 pt outer margin and use 16:9, 960 × 540 pt.

Copyright (c) 2026 Zara Zhang. DSH adaptation 2026-09-06. See licenses/zara/LICENSE and the pinned source design specification.

## Expanded composition rules

Twelve editable reference pages. The cover and closing retain the parent style; ten content layouts add information structures with varied density.

1. Cover — Cover
2. Understand the moments that matter — Asymmetric argument with three supporting evidence rows
3. Separate the record from the explanation — Interview excerpt, observation, competing explanation and next check
4. Locate the friction along the journey — Four stages aligned across actions and independent outcome measures
5. Trace the question to testable branches — Three-branch hypothesis tree with six testable leaves
6. Read the trend and investigate the pause — Labeled six-point trend with common scale and a separate interpretation
7. Choose the next move with evidence — Two-axis decision map with direct labels and a recommended next step
8. Design the test before reading the result — One hypothesis with comparison, measure and a predeclared decision rule
9. A small intervention, a measurable change — Intervention narrative beside paired before and after comparisons
10. Define what independent work looks like — Three criteria across three levels of observable competence
11. Sequence the work around a decision gate — Four timed workstreams and a decision gate
12. Closing — Closing

Choose a layout by the information relationship: evidence and interpretation, hierarchy, change over time, decision criteria, timed dependencies or ordered handoffs. For six or more content pages, use at least four distinct structures when the material supports them; avoid repeating the same composition on adjacent pages. Alternate detailed evidence with a simpler synthesis. A detailed page needs one dominant argument, supporting evidence and a concise interpretation. More detail must come from meaningful relationships, not extra decoration or a smaller font.

Keep the parent palette and typography. Preserve its characteristic rails, paper fields, serif/sans hierarchy and light/dark rhythm. Use body text around 18–22 pt, direct chart labels around 13–16 pt, and 48 pt outer margins on 960 × 540 pt pages. Native text, shapes and connectors remain editable. Rescale the geometry or split a page before shrinking the text. Reference charts drawn with shapes have editable geometry; they do not contain an embedded chart spreadsheet.

New examples are explicitly illustrative: replace every invented value, quote and conclusion with the user's evidence. Retained sourced industry examples remain attributed in their existing notes. Never invent facts to fill a layout. Include units, common baselines, meaningful owners, measurement windows and dependencies as appropriate. English previews do not select the user's output language. Use the existing English/Chinese font pairs and platform fallbacks; reflow translated text.

## Composition finish

Treat an analytical slide as a small argument: a claim at the top, a dominant exhibit, and a concise readout or next decision. A second exhibit must add evidence (a reconciled breakdown, a comparison table, an exception or a test), not repeat the same headline. Do not fill every page with equally sized cards. Keep a quiet synthesis or section break between dense runs.

Use a shared baseline for chart labels, aligned numeric columns and a limited set of type sizes. Distinguish a section label, headline, exhibit label, evidence text and source note by size and spacing before adding color. Keep body text readable; short exhibit labels may be smaller. Avoid single-word last lines, detached punctuation and arbitrary line breaks. Reflow Chinese and English separately.

Put units, population and measurement window beside the relevant exhibit. Directly label the meaningful exception or inflection; use a subtle highlight or a short leader without crossing another label. For paired exhibits with different denominators, state both explicitly. Reconcile subtotals and deltas. Use a common quantitative scale; decorative bars must never imply a different value.

End an evidence page with a concise interpretation, bounded recommendation or open question. A roadmap names owners and a gate; a scorecard distinguishes exceptions from measures that pass. Highlight the one decision or exception, not every cell. Adapt these devices to the parent pack: quiet serif pages, engineering schematics and bold posters should not converge on one visual style.

Inspect a rendered page, not just its bounding boxes: check the reading order, line endings, label collisions, chart contrast and the gap above the footer. Keep labels clear of rules and markers. Use native editable text and geometry. Fictional reference data must be replaced by verified user material or visibly marked as an example.
