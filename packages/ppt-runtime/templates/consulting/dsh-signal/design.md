# Signal / 深蓝决策

Adapted from Zara Zhang's Signal, commit e5e204fb1f3b06290846e7dcd7aceddabeceec8c. MIT. This native edition rebuilds twelve editable layouts; it is not an HTML import or an exact copy of every upstream slide.

## Typography

English display: Georgia; English body: Arial. These portable Office substitutions replace the upstream display face Source Serif 4. Chinese display: Songti SC; body: PingFang SC. On Windows use SimSun / Microsoft YaHei; on Linux use Noto Serif CJK SC / Noto Sans CJK SC. No font binary is distributed. Keep the serif/sans distinction.

English previews use source/. Chinese examples use source-zh/. Preview language does not select the language of the user's output. Choose the matching fonts for the actual content; reflow longer translations instead of shrinking titles.

## Layout grammar

 A literary editorial presentation system in the spirit of a long-form magazine — The Economist's restraint crossed with a private intelligence briefing. Source Serif 4 carries every headline with roman/italic mixing mid-sentence in antique gold, DM Sans steps back for body, and IBM Plex Mono runs all the timestamps, kickers, and chrome. The dual surface system is warm cream paper (#F0ECE3) and deep editorial navy (#1C2644), connected by a single hot accent — antique gold (#C8A870) — used only on rules, italic emphasis, and numerical figures. A near-invisible 80px grid texture overlays every dark slide as a fingerprint. The effect is sober, considered, and a little bit aristocratic.

colors:
  navy: "#1C2644"
  navy-alt: "#232F55"
  cream: "#F0ECE3"
  cream-alt: "#E6E0D4"
  text-warm: "#E2DCD0"
  text-muted-dark: "#8A96A8"
  text-hint-dark: "#4E5A6E"
  ink: "#1A2030"
  text-muted-light: "#5A6270"
  text-hint-light: "#9AA0A8"
  gold: "#C8A870"
  border-dark: "#2E3D5C"
  border-light: "#CAC4B4"

color-aliases:
  c-bg: navy
  c-bg-alt: navy-alt
  c-bg-light: cream
  c-bg-light-alt: cream-alt
  c-fg: text-warm
  c-fg-2: text-muted-dark
  c-fg-3: text-hint-dark
  c-fg-light: ink
  c-fg-light-2: text-muted-light
  c-fg-light-3: text-hint-light
  c-accent: gold
  c-border: border-dark
  c-border-light: border-light

typography:
  display:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 9.5vw
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: -0.02em
  h1:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 5.2vw
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: -0.01em
  h2:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 3vw
    fontWeight: 600
    lineHeight: 1.18
  h3:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 1.9vw
    fontWeight: 500
    lineHeight: 1.3
  lead:
    fontFamily: "DM Sans, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.4vw
    fontWeight: 400
    lineHeight: 1.58
  body:
    fontFamily: "DM Sans, Noto Sans SC, system-ui, sans-serif"
    fontSize: 1.05vw
    fontWeight: 400
    lineHeight: 1.65
  caption:
    fontFamily: "DM Sans, Noto Sans SC, system-ui, sans-serif"
    fontSize: 0.82vw
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, JetBrains Mono, monospace"
    fontSize: 0.7vw
    fontWeight: 500
    letterSpacing: 0.14em
    textTransform: uppercase
  stat-value:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 5.5vw
    fontWeight: 600
    lineHeight: 1
    letterSpacing: -0.02em
  quote-text:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 3.6vw
    fontWeight: 400
    lineHeight: 1.28
    letterSpacing: -0.01em
  quote-mark:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 8vw
    fontWeight: 300
    lineHeight: 0.6
  editorial-headline:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 2.75vw
    fontWeight: 600
    lineHeight: 1.2
  dense-headline:
    fontFamily: "Source Serif 4, Noto Serif SC, Georgia, serif"
    fontSize: 2.4vw
    fontWeight: 600
    lineHeight: 1.2

spacing:
  pad-x: 7.5vw
  pad-y: 5.5vh
  gap-lg: 4vh
  gap-md: 2.5vh
  gap-sm: 1.2vh
  grid-cell: 80px

canvas:
  width: 100vw
  height: 100vh

components:
  rule-short:
    width: 36px
    height: 1px
    background: "{colors.gold}"
    

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
2. Turn uncertainty into a decision — Asymmetric argument with three supporting evidence rows
3. Trace the question to testable branches — Three-branch hypothesis tree with six testable leaves
4. Read the trend and investigate the pause — Labeled six-point trend with common scale and a separate interpretation
5. Choose the next move with evidence — Two-axis decision map with direct labels and a recommended next step
6. Reconcile the benefit with the cost — Sequential contribution waterfall with an explicitly reconciled net change
7. A small intervention, a measurable change — Intervention narrative beside paired before and after comparisons
8. Locate the friction along the journey — Four stages aligned across actions and independent outcome measures
9. Design the test before reading the result — One hypothesis with comparison, measure and a predeclared decision rule
10. Connect each measure to a response — Actual, target and response aligned across four measures
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
