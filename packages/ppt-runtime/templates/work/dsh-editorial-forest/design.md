# Editorial Forest / 森林季刊

Adapted from Zara Zhang's Editorial Forest, commit e5e204fb1f3b06290846e7dcd7aceddabeceec8c. MIT. This native edition rebuilds twelve editable layouts; it is not an HTML import or an exact copy of every upstream slide.

## Typography

English display: Georgia; English body: Arial. These portable Office substitutions replace the upstream display face Source Serif 4. Chinese display: Songti SC; body: PingFang SC. On Windows use SimSun / Microsoft YaHei; on Linux use Noto Serif CJK SC / Noto Sans CJK SC. No font binary is distributed. Keep the serif/sans distinction.

English previews use source/. Chinese examples use source-zh/. Preview language does not select the language of the user's output. Choose the matching fonts for the actual content; reflow longer translations instead of shrinking titles.

## Layout grammar

 A serif-led editorial presentation system in the register of a literary quarterly or art-book monograph. Display type runs in Source Serif 4 at weight 500 with optical-size axis engaged, scaling up to 220px for cover and stat moments. The palette pairs a deep forest green (#2e4a2a) with a dusty rose pink (#e89cb1) over an oat-cream paper ground (#efe7d4), with JetBrains Mono as the editorial chrome (labels, captions, axis ticks). The aesthetic is closer to a Penguin classic, Apartamento spread, or quiet annual report than a tech keynote — confident, paper-feeling, and committed to a small color vocabulary.

colors:
  green: "#2e4a2a"
  green-deep: "#243a21"
  green-lite: "#3a5a36"
  pink: "#e89cb1"
  pink-deep: "#d27e96"
  cream: "#efe7d4"
  cream-2: "#e6dcc4"
  ink: "#1a1a17"

typography:
  display-hero:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 220
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: -0.02em
  display:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 140
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 96
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: -0.02em
  headline:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 84
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 80
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.02em
  title-card-lg:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 84
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.01em
  title-card:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 68
    fontWeight: 500
    lineHeight: 0.96
    letterSpacing: -0.01em
  title-card-sm:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 56
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.01em
  figure-caption-serif:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 56
    fontWeight: 500
    lineHeight: 1.05
  name:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 44
    fontWeight: 600
    lineHeight: 1.0
  meta-value:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 32
    fontWeight: 500
  body-lg:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 32
    fontWeight: 400
    lineHeight: 1.32
  body:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 30
    fontWeight: 400
    lineHeight: 1.38
  body-card:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 26
    fontWeight: 400
    lineHeight: 1.34
  label:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: 26
    fontWeight: 500
    letterSpacing: 0.18em
    textTransform: uppercase
  label-tight:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: 26
    fontWeight: 500
    letterSpacing: 0.14em
    textTransform: uppercase
  caption-mono:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: 24
    fontWeight: 500
    letterSpacing: 0.14em
    textTransform: uppercase
  axis-mono:
    fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace"
    fontSize: 26
    fontWeight: 500
    letterSpacing: 0.08em
  stat-figure:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 220
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: -0.03em
  stat-figure-unit:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: 110
    fontWeight: 500
    lineHeight: 0.92

spacing:
  slide-pad-default: "96px 120px"
  slide-pad-narrow: "100px 120px"
  slide-pad-wide: "100px 140px"
  slide-pad-statement: "130px 160px"
  grid-gap-cards: 28
  grid-gap-topics: 24
  grid-gap-kpi: 60
  rule-weight: "2px"
  rule-weight-card: "2.5px"
  radius-card: "6px"
  radius-card-step: "8px"
  radius-bar-top: "3px 3px 0 0"
  radius-mark-circle: "50%"

canvas:
  width: 1920px
  height: 1080px

components:
  topic-tile:
    

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
2. A more resilient operating cycle — Asymmetric argument with three supporting evidence rows
3. Read the trend and investigate the pause — Labeled six-point trend with common scale and a separate interpretation
4. Reconcile the benefit with the cost — Sequential contribution waterfall with an explicitly reconciled net change
5. Separate the record from the explanation — Interview excerpt, observation, competing explanation and next check
6. Choose the next move with evidence — Two-axis decision map with direct labels and a recommended next step
7. Locate the friction along the journey — Four stages aligned across actions and independent outcome measures
8. A small intervention, a measurable change — Intervention narrative beside paired before and after comparisons
9. Design around explicit boundaries — Three layers, nine native nodes, horizontal handoffs and vertical dependencies
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
