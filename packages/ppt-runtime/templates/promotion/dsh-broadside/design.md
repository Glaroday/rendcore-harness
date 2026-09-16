# Broadside / 橙黑宣言

Adapted from Zara Zhang's Broadside, commit e5e204fb1f3b06290846e7dcd7aceddabeceec8c. MIT. This native edition rebuilds 12 editable layouts; it is not an HTML import or an exact copy of every upstream slide.

## Typography

English display: Arial Black; English body: Arial. These portable Office substitutions replace the upstream display face Barlow. Chinese display: PingFang SC; body: PingFang SC. On Windows use Microsoft YaHei / Microsoft YaHei; on Linux use Noto Sans CJK SC / Noto Sans CJK SC. No font binary is distributed. Keep the serif/sans distinction.

English previews use source/. Chinese examples use source-zh/. Preview language does not select the language of the user's output. Choose the matching fonts for the actual content; reflow longer translations instead of shrinking titles.

## Layout grammar

 A protest-poster editorial system built on massive Barlow type and a single fire-orange environment color. The aesthetic is "ink on fire" — dark slides for documentation, orange slides for declaration. Display type is enormous (13vw, roughly 187px at 1440 width) in weight 900 lowercase, treating words as graphic elements rather than reading copy. The cultural reference is broadside printing, SPACE10 reports, and Wim Crouwel grids reinterpreted with one loud color and zero decoration.

colors:
  ink-black: "#111111"
  ink-black-alt: "#1A1A18"
  fire-orange: "#E85D26"
  cream: "#F0ECE5"
  cream-muted: "#888880"
  cream-hint: "#505048"
  border-dark: "#282826"
  ink-on-orange-muted: "rgba(17, 17, 17, 0.75)"
  ink-on-orange-hint: "rgba(17, 17, 17, 0.55)"
  ink-on-orange-faint: "rgba(17, 17, 17, 0.40)"
  ink-on-orange-border: "rgba(17, 17, 17, 0.20)"

color-aliases:
  c-bg: ink-black
  c-bg-alt: ink-black-alt
  c-bg-light: ink-black            # Broadside collapses "light" → dark; there are no cream slides
  c-bg-orange: fire-orange
  c-fg: cream
  c-fg-2: cream-muted
  c-fg-3: cream-hint
  c-accent: fire-orange
  c-border: border-dark

typography:
  display:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "13vw"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: -0.04em
  h1:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "7.5vw"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: -0.03em
  h2:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "4.5vw"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  h3:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "2.8vw"
    fontWeight: 600
    lineHeight: 1.2
  lead:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "1.6vw"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "1.2vw"
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "0.9vw"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.72vw"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.14em
    textTransform: uppercase
  stat-value:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "5.5vw"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: -0.04em
  quote-mark:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "10vw"
    fontWeight: 900
    lineHeight: 0.6
  quote-text:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "3.8vw"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  fadelist-item:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "7.5vw"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: -0.03em
  fadelist-title:
    fontFamily: "Barlow, Noto Sans SC, sans-serif"
    fontSize: "10.5vw"
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.04em

spacing:
  pad-x: "5.5vw"
  pad-y: "5.5vh"
  gap-lg: "3.5vh"
  gap-md: "2vh"
  gap-sm: "1vh"

canvas:
  width: 100vw
  height: 100vh

motion:
  ease-slide: "cubic-bezier(0.77, 0, 0.175, 1)"
  dur-slide: "0.8s"
  ease-enter: "cubic-bezier(0.16, 1, 0.3, 1)"
  dur-enter: "0.5s"

components:
  slide-chrome:
    layout: "flex row, justify space-between"
    paddingBottom: "{spacing.gap-sm}"
    borderBottom: "1px solid {colors.border-dark}"
    marginBottom: "{spacing.gap-md}"
    

1. Cover (cover)
2. Editorial thesis (insights)
3. Evidence spread (data)
4. Operating model contrast (comparison)
5. Learning feedback loop (process)
6. Conversion staircase (data)
7. Effort and impact map (comparison)
8. Campaign storyboard (agenda)
9. Case results poster (comparison)
10. Launch schedule (process)
11. Performance scorecard (data)
12. Closing (closing)

## Expanded composition rules

This pack has twelve layouts. Start with the information relationship, then choose a reference page. Do not default to three equal cards or one chart per slide.

Use editorial rhythm: alternate a quiet cream evidence page, a black analytical page and an orange statement page. Combine oversized type with smaller supporting evidence; use a conversion staircase, causal feedback loop, effort/impact map, annotated case results, campaign storyboard, launch schedule and scorecard. Do not apply one recolored grid to every page.

For a deck of six or more content pages, use at least four distinct structural families when the material supports them. Avoid repeating the same family on adjacent slides. A detailed page should have one dominant argument, a supporting chart/diagram/table, and one concise interpretation. Alternate detailed evidence pages with simpler synthesis pages.

Adapt the reference geometry to the real content. Add annotations, units, direct labels, baselines, owners and dependencies where they carry meaning. These examples use invented, explicitly marked sample data: replace every value and conclusion with user evidence; never fabricate data to make a page look fuller. Preserve native editable text and geometry. Do not turn all content into images. Keep body text around 18–22 pt and chart labels around 13–16 pt; reflow or split before shrinking.

Reference families: 2 editorial thesis; 3 evidence spread; 4 operating model comparison; 5 feedback loop; 6 conversion staircase; 7 priority map; 8 campaign storyboard; 9 case study; 10 launch schedule; 11 performance scorecard.

## Composition finish

Treat an analytical slide as a small argument: a claim at the top, a dominant exhibit, and a concise readout or next decision. A second exhibit must add evidence (a reconciled breakdown, a comparison table, an exception or a test), not repeat the same headline. Do not fill every page with equally sized cards. Keep a quiet synthesis or section break between dense runs.

Use a shared baseline for chart labels, aligned numeric columns and a limited set of type sizes. Distinguish a section label, headline, exhibit label, evidence text and source note by size and spacing before adding color. Keep body text readable; short exhibit labels may be smaller. Avoid single-word last lines, detached punctuation and arbitrary line breaks. Reflow Chinese and English separately.

Put units, population and measurement window beside the relevant exhibit. Directly label the meaningful exception or inflection; use a subtle highlight or a short leader without crossing another label. For paired exhibits with different denominators, state both explicitly. Reconcile subtotals and deltas. Use a common quantitative scale; decorative bars must never imply a different value.

End an evidence page with a concise interpretation, bounded recommendation or open question. A roadmap names owners and a gate; a scorecard distinguishes exceptions from measures that pass. Highlight the one decision or exception, not every cell. Adapt these devices to the parent pack: quiet serif pages, engineering schematics and bold posters should not converge on one visual style.

Inspect a rendered page, not just its bounding boxes: check the reading order, line endings, label collisions, chart contrast and the gap above the footer. Keep labels clear of rules and markers. Use native editable text and geometry. Fictional reference data must be replaced by verified user material or visibly marked as an example.
All charts and diagrams are native editable vectors. Example figures are illustrative, not reported facts. Retain a 48 pt outer margin and use 16:9, 960 × 540 pt.

Copyright (c) 2026 Zara Zhang. DSH adaptation 2026-09-06. See licenses/zara/LICENSE and the pinned source design specification.
