# Sakura Chroma / 复古彩带

Adapted from Zara Zhang's Sakura Chroma, commit e5e204fb1f3b06290846e7dcd7aceddabeceec8c. MIT. This native edition rebuilds twelve editable layouts; it is not an HTML import or an exact copy of every upstream slide.

## Typography

English display: Arial Narrow; English body: Arial. These portable Office substitutions replace the upstream display face Big Shoulders Display. Chinese display: PingFang SC; body: PingFang SC. On Windows use Microsoft YaHei / Microsoft YaHei; on Linux use Noto Sans CJK SC / Noto Sans CJK SC. No font binary is distributed. Keep the serif/sans distinction.

English previews use source/. Chinese examples use source-zh/. Preview language does not select the language of the user's output. Choose the matching fonts for the actual content; reflow longer translations instead of shrinking titles.

## Layout grammar

 "A cassette-package editorial system on warm cream paper with a six-color primary palette and warm-brown ink. Display type runs in Big Shoulders Display (condensed industrial display sans at weight 900); body in Albert Sans; tabular and tag content in JetBrains Mono; occasional Japanese accents in Noto Sans JP. The aesthetic borrows from 1970s consumer cassette packaging, Japanese print catalogues, and lo-fi product zines: petal-cluster blob clusters, diagonal multi-color ribbon bands, 12-point starburst seals, red rectangular stamps, and tracked uppercase micro-labels. The effect is hand-curated industrial editorial — warm but disciplined, playful but tightly typeset, with the cassette as its visual metaphor."

colors:
  paper: "#F1E6CB"
  paper-dk: "#E5D6B0"
  ink: "#3A2516"
  red: "#E5392A"
  pink: "#E54489"
  orange: "#F09131"
  green: "#3D9F47"
  blue: "#3F8BC4"
  yellow: "#F0BC2A"

color-aliases:
  line: ink

typography:
  disp-hero:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(120px, min(14vw, 22vh), 280px)"
    fontWeight: 900
    lineHeight: 0.84
    letterSpacing: -0.025em
  disp-statement:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(70px, min(8.4vw, 14vh), 168px)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: -0.022em
  disp-title:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(80px, min(9vw, 14vh), 180px)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: -0.022em
  disp-lockup:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(56px, min(7vw, 11vh), 130px)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.015em
  disp-section:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(52px, min(5.6vw, 9vh), 100px)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.018em
  disp-quote:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(48px, min(5.4vw, 9vh), 110px)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: -0.018em
  disp-quote-lg:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(56px, min(6.4vw, 10.5vh), 130px)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.018em
  disp-brand:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(32px, min(3.4vw, 5.4vh), 56px)"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: -0.02em
  disp-card-name:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(28px, min(2.6vw, 4.6vh), 48px)"
    fontWeight: 900
    lineHeight: 0.94
    letterSpacing: -0.012em
  num-hero:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(110px, min(11vw, 18vh), 240px)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: -0.025em
  num-md:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(70px, min(7vw, 11vh), 150px)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: -0.02em
  ttl-row:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(22px, 1.7vw, 30px)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.005em
  body:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(14px, 1vw, 17px)"
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(14px, 0.95vw, 15px)"
    fontWeight: 400
    lineHeight: 1.4
  body-emphasis:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(15px, 1.1vw, 20px)"
    fontWeight: 600
    lineHeight: 1.4
  micro:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(12px, 0.9vw, 14px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.16em
    textTransform: uppercase
  micro-lg:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(12px, 0.9vw, 14px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.2em
    textTransform: uppercase
  micro-xl:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(12px, 0.92vw, 14px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.32em
    textTransform: uppercase
  micro-spec:
    fontFamily: "'Albert Sans', sans-serif"
    fontSize: "clamp(14px, 1.1vw, 20px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.04em
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "clamp(11px, 0.78vw, 12px)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.02em
  mono-md:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "clamp(14px, 0.95vw, 16px)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.02em
  mono-tag:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "clamp(12px, 0.85vw, 14px)"
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.04em
  jp:
    fontFamily: "'Noto Sans JP', sans-serif"
    fontSize: "inherit"
    fontWeight: 500
    lineHeight: inherit
  stamp-text:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(20px, 1.6vw, 28px)"
    fontWeight: 900
    lineHeight: 1.0
    letterSpacing: 0.02em
  seal-text:
    fontFamily: "'Big Shoulders Display', sans-serif"
    fontSize: "clamp(22px, 2vw, 38px)"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.01em

spacing:
  frame-inset: "clamp(36px, 3.6vw, 72px)"
  frame-inset-bottom: "clamp(72px, 7vh, 110px)"
  topbar-gap: "clamp(12px, 1.4vh, 22px)"
  card-pad-x: "clamp(14px, 1.4vw, 20px)"
  card-pad-y: "clamp(16px, 1.7vw, 24px)"
  grid-gap: "clamp(16px, 1.6vw, 26px)"
  col-gap: "clamp(28px, 3vw, 56px)"
  pagenum-inset: "clamp(20px, 2.2vh, 36px) clamp(24px, 2.2vw, 44px)"

canvas:
  width: 100vw
  height: 100vh

components:
  paper-texture:
    backgroundImage: "radial-gradient(circle at 1px 1px, rgba(58,37,22,0.55) 1px, transparent 1.6px)"
    backgroundSize: "4px 4px"
    opacity: 0.16
    zIndex: 1
    

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
2. Design a campaign people can follow — Asymmetric argument with three supporting evidence rows
3. Give each moment a distinct purpose — Three schematic frames with distinct content and intent
4. Locate the friction along the journey — Four stages aligned across actions and independent outcome measures
5. Separate the record from the explanation — Interview excerpt, observation, competing explanation and next check
6. Follow one cohort through the funnel — A single cohort with explicit conversion counts and an overall rate
7. Choose the next move with evidence — Two-axis decision map with direct labels and a recommended next step
8. Design the test before reading the result — One hypothesis with comparison, measure and a predeclared decision rule
9. A small intervention, a measurable change — Intervention narrative beside paired before and after comparisons
10. Show how the judgment develops — Alternating milestone notes around a continuous argument timeline
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
