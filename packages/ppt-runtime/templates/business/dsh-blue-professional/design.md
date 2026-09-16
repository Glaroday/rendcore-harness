# Blue Professional / 蓝色商务

Adapted from Zara Zhang's Blue Professional, commit e5e204fb1f3b06290846e7dcd7aceddabeceec8c. MIT. This native edition rebuilds 12 editable layouts; it is not an HTML import or an exact copy of every upstream slide.

## Typography

English display: Arial; English body: Arial. These portable Office substitutions replace the upstream display face Space Grotesk. Chinese display: PingFang SC; body: PingFang SC. On Windows use Microsoft YaHei / Microsoft YaHei; on Linux use Noto Sans CJK SC / Noto Sans CJK SC. No font binary is distributed. Keep the serif/sans distinction.

English previews use source/. Chinese examples use source-zh/. Preview language does not select the language of the user's output. Choose the matching fonts for the actual content; reflow longer translations instead of shrinking titles.

## Layout grammar

 A restrained, consulting-grade presentation system on a warm cream canvas (#fdfae7) with a single saturated cobalt blue (#1e2bfa) as the only accent color. Display type runs Space Grotesk for headlines and numerical callouts; Inter handles body and chrome. Cards are soft-tinted cobalt at 4% opacity with 1.5px translucent borders and 10-14px rounded corners — quiet, never bordered in solid color. The aesthetic borrows from investment-research reports, McKinsey-grade quarterly briefings, and contemporary financial dashboards — measured, data-dense without feeling crowded, and unmistakably professional. The system is built for executive readability at distance, with strong typographic hierarchy and a single accent color carrying every emphasis moment.

colors:
  bg: "#fdfae7"
  primary: "#1e2bfa"
  text: "#111111"
  text-muted: "#6b6b6b"
  text-light: "#9a9a9a"
  accent-light: "rgba(30, 43, 250, 0.08)"
  accent-medium: "rgba(30, 43, 250, 0.15)"
  border: "rgba(30, 43, 250, 0.2)"
  card-bg: "rgba(30, 43, 250, 0.04)"
  positive: "#059669"
  negative: "#dc2626"

typography:
  h1:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: "clamp(44.8px, 5vw, 67.2px)"
    lineHeight: 1.1
    letterSpacing: -0.02em
  h2:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: "clamp(28.8px, 3vw, 41.6px)"
    lineHeight: 1.1
    letterSpacing: -0.02em
  h3:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: "clamp(17.6px, 1.8vw, 24px)"
    lineHeight: 1.3
    letterSpacing: -0.02em
  h4-eyebrow:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: "clamp(13.6px, 1.2vw, 16px)"
    lineHeight: 1.1
    letterSpacing: 0.08em
    textTransform: uppercase
    color: "{colors.primary}"
  body:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 400
    fontSize: "clamp(13.6px, 1.1vw, 16.8px)"
    lineHeight: 1.6
    color: "{colors.text-muted}"
  metric-value:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: "clamp(35.2px, 3.4vw, 48px)"
    lineHeight: 1
    color: "{colors.primary}"
  metric-label:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 600
    fontSize: "clamp(15.2px, 1.3vw, 17.6px)"
    lineHeight: 1.3
    color: "{colors.text}"
  metric-desc:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 400
    fontSize: "clamp(12.5px, 0.95vw, 14.4px)"
    lineHeight: 1.5
    color: "{colors.text-muted}"
  metric-support:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 400
    fontSize: "clamp(12px, 0.9vw, 13.6px)"
    lineHeight: 1.45
    color: "{colors.text-muted}"
  stat-num:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: "clamp(25.6px, 2.4vw, 33.6px)"
    lineHeight: 1
    color: "{colors.primary}"
  stat-name:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 500
    fontSize: "clamp(13.6px, 1vw, 15.2px)"
    lineHeight: 1.35
    color: "{colors.text}"
  stat-context:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 400
    fontSize: 12px
    lineHeight: 1.4
    color: "{colors.text-light}"
  agenda-num:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: 28.8px
    lineHeight: 1
    color: "{colors.primary}"
  insight-num:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: 12.5px
    lineHeight: 1.7
    letterSpacing: 0.05em
    color: "{colors.primary}"
  split-highlight:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: "clamp(18.4px, 1.55vw, 24px)"
    lineHeight: 1.4
    color: "{colors.text}"
  blockquote:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: "clamp(25.6px, 2.8vw, 38.4px)"
    lineHeight: 1.35
    color: "{colors.text}"
  quote-mark:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: "128px"
    lineHeight: 0.5
    color: "{colors.primary}"
    opacity: 0.15
  step-circle-text:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 700
    fontSize: 20.8px
    lineHeight: 1
  step-title:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: "clamp(15.2px, 1.4vw, 18.4px)"
    lineHeight: 1.2
  bar-label:
    fontFamily: "'Inter', sans-serif"
    fontWeight: 500
    fontSize: "clamp(12.8px, 1.1vw, 16px)"
    lineHeight: 1.3
    color: "{colors.text}"
  bar-pct:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 600
    fontSize: 15.2px
    color: "{colors.primary}"
  tag:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: 12px
    lineHeight: 1
    color: "{colors.primary}"
  counter:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: 12.8px
    lineHeight: 1
    letterSpacing: 0.05em
    color: "{colors.text-muted}"
  meta:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 400
    fontSize: 12.8px
    lineHeight: 1.4
    letterSpacing: 0.05em
    color: "{colors.text-light}"
  cite:
    fontFamily: "'Space Grotesk', sans-serif"
    fontWeight: 500
    fontSize: 12.5px
    lineHeight: 1.4
    letterSpacing: 0.04em
    textTransform: uppercase
    color: "{colors.text-muted}"

spacing:
  pad-slide-x: "4vw"
  pad-slide-y-top: "3.5vw"
  pad-slide-y-bottom: "8.5vh"
  pad-card-lg: "1.5rem 1.6rem"
  pad-card-md: "1.4rem 1.5rem"
  pad-card-sm: "1rem 1.2rem"
  pad-mini: "0.9rem 1rem"
  gap-grid-lg: "3.5rem"
  gap-grid-md: "2rem 3rem"
  gap-grid-sm: "1.5rem"
  gap-cards: "1.2rem"
  gap-mini: "1rem"
  header-margin: "2.5vh"
  accent-line-width: "60px"
  accent-line-height: "4px"

canvas:
  width: 100vw
  height: 100vh
  background: "{colors.bg}"

radii:
  pill: "100px"
  card-lg: "14px"
  card-md: "12px"
  card-sm: "10px"
  bar: "6px"
  circle: "50%"

components:
  card-tinted:
    background: "{colors.card-bg}"
    border: "1.5px solid {colors.border}"
    borderRadius: 14px
    padding: "1.5rem 1.6rem"
    

1. Cover (cover)
2. Executive synthesis (insights)
3. Market segmentation (data)
4. Stacked trend and interpretation (data)
5. Opportunity matrix (comparison)
6. Profit bridge (data)
7. Customer journey (process)
8. Service architecture (process)
9. Annotated case comparison (comparison)
10. Dependency roadmap (process)
11. Decision table (comparison)
12. Closing (closing)

## Expanded composition rules

This pack has twelve layouts. Start with the information relationship, then choose a reference page. Do not default to three equal cards or one chart per slide.

Use evidence-led report compositions: an executive thesis beside supporting evidence, stacked trends with annotations, a contribution bridge, a portfolio matrix, a customer journey, a capability architecture, a case comparison, a dependency roadmap, and a decision table. Keep cream as the field and use cobalt to identify the decision or most important series.

For a deck of six or more content pages, use at least four distinct structural families when the material supports them. Avoid repeating the same family on adjacent slides. A detailed page should have one dominant argument, a supporting chart/diagram/table, and one concise interpretation. Alternate detailed evidence pages with simpler synthesis pages.

Adapt the reference geometry to the real content. Add annotations, units, direct labels, baselines, owners and dependencies where they carry meaning. These examples use invented, explicitly marked sample data: replace every value and conclusion with user evidence; never fabricate data to make a page look fuller. Preserve native editable text and geometry. Do not turn all content into images. Keep body text around 18–22 pt and chart labels around 13–16 pt; reflow or split before shrinking.

Reference families: 2 executive synthesis; 3 market segmentation; 4 stacked trend; 5 opportunity matrix; 6 profit bridge; 7 customer journey; 8 service architecture; 9 case study; 10 delivery roadmap; 11 decision table.

## Composition finish

Treat an analytical slide as a small argument: a claim at the top, a dominant exhibit, and a concise readout or next decision. A second exhibit must add evidence (a reconciled breakdown, a comparison table, an exception or a test), not repeat the same headline. Do not fill every page with equally sized cards. Keep a quiet synthesis or section break between dense runs.

Use a shared baseline for chart labels, aligned numeric columns and a limited set of type sizes. Distinguish a section label, headline, exhibit label, evidence text and source note by size and spacing before adding color. Keep body text readable; short exhibit labels may be smaller. Avoid single-word last lines, detached punctuation and arbitrary line breaks. Reflow Chinese and English separately.

Put units, population and measurement window beside the relevant exhibit. Directly label the meaningful exception or inflection; use a subtle highlight or a short leader without crossing another label. For paired exhibits with different denominators, state both explicitly. Reconcile subtotals and deltas. Use a common quantitative scale; decorative bars must never imply a different value.

End an evidence page with a concise interpretation, bounded recommendation or open question. A roadmap names owners and a gate; a scorecard distinguishes exceptions from measures that pass. Highlight the one decision or exception, not every cell. Adapt these devices to the parent pack: quiet serif pages, engineering schematics and bold posters should not converge on one visual style.

Inspect a rendered page, not just its bounding boxes: check the reading order, line endings, label collisions, chart contrast and the gap above the footer. Keep labels clear of rules and markers. Use native editable text and geometry. Fictional reference data must be replaced by verified user material or visibly marked as an example.
All charts and diagrams are native editable vectors. Example figures are illustrative, not reported facts. Retain a 48 pt outer margin and use 16:9, 960 × 540 pt.

Copyright (c) 2026 Zara Zhang. DSH adaptation 2026-09-06. See licenses/zara/LICENSE and the pinned source design specification.
