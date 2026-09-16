# Playful / 杏色创意

Adapted from Zara Zhang's Playful, commit e5e204fb1f3b06290846e7dcd7aceddabeceec8c. MIT. This native edition rebuilds twelve editable layouts; it is not an HTML import or an exact copy of every upstream slide.

## Typography

English display: Arial Black; English body: Arial. These portable Office substitutions replace the upstream display face Syne. Chinese display: PingFang SC; body: PingFang SC. On Windows use Microsoft YaHei / Microsoft YaHei; on Linux use Noto Sans CJK SC / Noto Sans CJK SC. No font binary is distributed. Keep the serif/sans distinction.

English previews use source/. Chinese examples use source-zh/. Preview language does not select the language of the user's output. Choose the matching fonts for the actual content; reflow longer translations instead of shrinking titles.

## Layout grammar

 "A warm, hand-crafted editorial system built on a peach-clay canvas with charcoal ink as the only \"color.\" Display type runs in Syne (weight 700–800, tight negative tracking); body type runs in Space Grotesk at weight 400–500. The aesthetic borrows from independent studio decks, risograph zines, and sketchbook spreads: organic blob frames, scribbled SVG doodles, slightly rotated cards, and double-stroke offset borders give every slide a hand-touched, unpolished warmth. The effect is creative-studio editorial, not corporate pitch — confident but human, structured but loose."

colors:
  bg: "#F0C8A0"
  bg-alt: "#E8B88E"
  light: "#F7DEC6"
  text: "#1A1A1A"

color-aliases:
  accent: text

typography:
  display-hero:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(4rem, 10vw, 9rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.03em
  display:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(3rem, 8vw, 7rem)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.02em
  headline:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(2.5rem, 6vw, 5rem)"
    fontWeight: 700
    lineHeight: 1.0
    letterSpacing: -0.01em
  statement:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.01em
  title:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.01em
  title-sm:
    fontFamily: "Syne, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.2
  number-hero:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(4rem, 8vw, 7rem)"
    fontWeight: 800
    lineHeight: 1.0
  number-md:
    fontFamily: "Syne, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1.0
  number-sm:
    fontFamily: "Syne, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.0
  body:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "clamp(1rem, 1.2vw, 1.1rem)"
    fontWeight: 400
    lineHeight: 1.7
  body-md:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 500
    lineHeight: 1.6
  label-eyebrow:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.15em
    textTransform: uppercase
  caption:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 500
    lineHeight: 1.4
  tag:
    fontFamily: "Space Grotesk, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2

spacing:
  pad-slide-lg: "4rem 5rem"
  pad-slide-md: "3rem 4rem"
  pad-card-lg: "2rem 3rem"
  pad-card-md: "1.5rem"
  gap-lg: "3rem"
  gap-md: "2rem"
  gap-sm: "1.5rem"

canvas:
  width: 100vw
  height: 100vh

components:
  rough-box:
    border: "3px solid {colors.text}"
    background: "{colors.bg}"
    padding: "1.5rem"
    offsetShadowOffset: "6px 6px"
    offsetShadowBorder: "2–3px solid {colors.text}"
    

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
2. Make the idea easier to try — Asymmetric argument with three supporting evidence rows
3. Give each moment a distinct purpose — Three schematic frames with distinct content and intent
4. Trace the question to testable branches — Three-branch hypothesis tree with six testable leaves
5. Locate the friction along the journey — Four stages aligned across actions and independent outcome measures
6. Design the test before reading the result — One hypothesis with comparison, measure and a predeclared decision rule
7. Follow one cohort through the funnel — A single cohort with explicit conversion counts and an overall rate
8. A small intervention, a measurable change — Intervention narrative beside paired before and after comparisons
9. Choose the next move with evidence — Two-axis decision map with direct labels and a recommended next step
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
