# Soft Editorial / 柔和编辑部

Adapted from Zara Zhang's Soft Editorial, commit e5e204fb1f3b06290846e7dcd7aceddabeceec8c. MIT. This native edition rebuilds twelve editable layouts; it is not an HTML import or an exact copy of every upstream slide.

## Typography

English display: Georgia; English body: Arial. These portable Office substitutions replace the upstream display face Cormorant Garamond. Chinese display: Songti SC; body: PingFang SC. On Windows use SimSun / Microsoft YaHei; on Linux use Noto Serif CJK SC / Noto Sans CJK SC. No font binary is distributed. Keep the serif/sans distinction.

English previews use source/. Chinese examples use source-zh/. Preview language does not select the language of the user's output. Choose the matching fonts for the actual content; reflow longer translations instead of shrinking titles.

## Layout grammar

 A warm magazine spread aesthetic — the kind of layout a small print quarterly with field-notes pretensions would commission. Cormorant Garamond carries every headline and ornamental moment with mixed roman and italic; Work Sans recedes into supporting body. The palette is cream paper with a quartet of pastel candy accents (dusty pink, chartreuse lemon, soft peach blush, sage green, lilac) used as colored card backgrounds. Generous rounded cards (24–36px radius) float on translucent white over the cream field. The mood is editorial calm with a sprinkling of riso-print color — closer to a literary research notebook than a corporate deck.

colors:
  paper: "#F2EEDF"
  paper-2: "#ECE6D2"
  ink: "#2A241B"
  ink-soft: "#5C5345"
  pink: "#E1A4C2"
  lemon: "#D6DD63"
  blush: "#E8C9B6"
  sage: "#B7C7A8"
  lilac: "#C9BEDC"
  card-fill: "rgba(255,255,255,0.55)"
  rule-soft: "rgba(42,36,27,0.18)"
  rule-medium: "rgba(42,36,27,0.35)"

color-aliases:
  background: paper
  text-primary: ink
  text-secondary: ink-soft

typography:
  display:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 232px
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: -0.02em
  title:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 188px
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: -0.015em
  closer:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 168px
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: -0.015em
  numeral-hero:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 320px
    fontWeight: 500
    lineHeight: 0.9
    letterSpacing: -0.02em
  numeral-lg:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 200px
    fontWeight: 500
    lineHeight: 0.9
    letterSpacing: -0.02em
  panel-headline:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 124px
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.01em
  section-headline:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 96px
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -0.01em
  page-headline:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 88px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.01em
  quote-text:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 88px
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: -0.01em
  quote-mark:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 220px
    fontWeight: 500
    lineHeight: 0.7
    fontStyle: italic
  card-headline:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 72px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.01em
  drop-cap:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 132px
    fontWeight: 500
    lineHeight: 0.85
  opener:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 56px
    fontWeight: 500
    fontStyle: italic
    lineHeight: 1.1
  numeral-step:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 92px
    fontWeight: 500
    fontStyle: italic
    lineHeight: 0.9
  numeral-card:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 64px
    fontWeight: 500
    fontStyle: italic
    lineHeight: 1
  subhead-lg:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 56px
    fontWeight: 500
    fontStyle: italic
    lineHeight: 1.1
  subhead-md:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 44px
    fontWeight: 500
    lineHeight: 1.05
  subhead-sm:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 38px
    fontWeight: 500
    lineHeight: 1.05
  kicker:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 38px
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.2
  marker:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 32px
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.3
  card-sub:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 32px
    fontWeight: 500
    lineHeight: 1.1
  eyebrow:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 28px
    fontWeight: 400
    letterSpacing: -0.005em
  page-marker:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 26px
    fontWeight: 400
    fontStyle: italic
  footer:
    fontFamily: "Cormorant Garamond, Garamond, serif"
    fontSize: 26px
    fontWeight: 400
    fontStyle: italic
  body:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 26px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.5
  attr:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.3
  swatch-label:
    fontFamily: "Work Sans, sans-serif"
    fontSize: 11px
    fontWeight: 400
    letterSpacing: 0.06em
    textTransform: uppercase

spacing:
  pad-outer: 80px
  pad-top: 60px
  pad-bottom: 50px
  card-pad-lg: "64px 48px"
  card-pad-md: "48px 52px"
  card-pad-sm: "28px 30px"
  gap-cards: 28px
  gap-cards-lg: 36px
  gap-stack: 36px

canvas:
  width: 1920px
  height: 1080px

components:
  card-soft:
    background: "{colors.card-fill}"
    borderRadius: "24px to 36px"
    padding: "{spacing.card-pad-sm} to {spacing.card-pad-lg}"
    

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
2. A judgment worth revisiting — Asymmetric argument with three supporting evidence rows
3. Separate the record from the explanation — Interview excerpt, observation, competing explanation and next check
4. Trace the question to testable branches — Three-branch hypothesis tree with six testable leaves
5. Read the trend and investigate the pause — Labeled six-point trend with common scale and a separate interpretation
6. A small intervention, a measurable change — Intervention narrative beside paired before and after comparisons
7. Show how the judgment develops — Alternating milestone notes around a continuous argument timeline
8. Choose the next move with evidence — Two-axis decision map with direct labels and a recommended next step
9. Give each moment a distinct purpose — Three schematic frames with distinct content and intent
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
