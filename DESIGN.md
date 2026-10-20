---
name: MannMitra
description: Calm wellbeing tools with a Fluid Glass landing and the existing Forest application surfaces.
colors:
  landing-ink: "oklch(27% 0.05 195)"
  landing-secondary: "oklch(44% 0.04 195)"
  landing-ground: "oklch(97% 0.025 175)"
  landing-ground-end: "oklch(92% 0.05 190)"
  landing-glass: "rgb(255 255 255 / 50%)"
  landing-line: "rgb(20 90 90 / 24%)"
  landing-focus: "#287c70"
  app-primary: "#14532d"
  app-background: "#f9f8f3"
  app-surface: "#fdfdfb"
  app-foreground: "#1f1f1d"
  app-accent: "#e08f21"
  app-border: "#d5d1c2"
  app-input-border: "#7d7d76"
  app-muted: "#f2f0e8"
  app-muted-foreground: "#5f5f59"
  app-danger-soft: "#9c5713"
typography:
  landing-display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", sans-serif'
    fontSize: "clamp(2.7rem, 6.6vw, 5.5rem)"
    fontWeight: 650
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  landing-headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", sans-serif'
    fontSize: "clamp(2.1rem, 4.6vw, 3.7rem)"
    fontWeight: 650
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  landing-body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", sans-serif'
    fontSize: "clamp(1.02rem, 1.4vw, 1.2rem)"
    fontWeight: 400
    lineHeight: 1.55
  landing-button:
    fontSize: "1rem"
    fontWeight: 600
    letterSpacing: "0.005em"
  app-body:
    fontFamily: "var(--font-plus-jakarta), ui-sans-serif, system-ui, sans-serif"
  app-numerics:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
rounded:
  control: "999px"
  app-card: "16px"
  landing-sheet: "1.75rem"
  landing-day: "0.8rem"
  landing-day-mobile: "0.6rem"
spacing:
  landing-row-gap: "1.4rem"
  landing-row-top: "2.1rem"
  landing-paragraph-top: "1.25rem"
  landing-sheet-padding: "clamp(1.1rem, 3vw, 2.2rem)"
components:
  landing-button:
    backgroundColor: "{colors.landing-ink}"
    textColor: "{colors.landing-ground}"
    rounded: "{rounded.control}"
    padding: "0.85rem 1.6rem"
    typography: "{typography.landing-button}"
  landing-sheet:
    backgroundColor: "{colors.landing-glass}"
    rounded: "{rounded.landing-sheet}"
    padding: "{spacing.landing-sheet-padding}"
  app-button-primary:
    backgroundColor: "{colors.app-primary}"
    textColor: "{colors.app-surface}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 24px"
  app-button-secondary:
    backgroundColor: "{colors.app-surface}"
    textColor: "{colors.app-foreground}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 24px"
  app-button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.app-primary}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 24px"
  app-input:
    backgroundColor: "{colors.app-surface}"
    textColor: "{colors.app-foreground}"
    rounded: "{rounded.app-card}"
    height: "44px"
    padding: "0 16px"
  app-card:
    backgroundColor: "{colors.app-surface}"
    rounded: "{rounded.app-card}"
---

# Design System: MannMitra

## Overview

**Creative North Star: "Fluid Glass"**

The public landing uses the user's selected Fluid Glass HTML: spacious mint ground, deep teal text, translucent surfaces, and a gently floating glass orb. The artwork connects five viewport-height sections while the text and account actions remain directly usable. This name comes from the supplied reference, not an invented brand workshop.

The existing authentication and application primitives retain their Forest direction: warm bone surfaces, evergreen controls, amber emphasis, Plus Jakarta Sans, and Geist Mono numerics. The landing is a scoped, approved surface; its local palette and system typography do not replace the global application tokens. Both surfaces support a calm, non-clinical product with readable controls and restrained feedback.

**Key Characteristics:**

- Spacious mint landing with deep teal pills and translucent navigation.
- Procedural glass artwork with a CSS fallback.
- Existing Forest authentication surfaces remain visually distinct.
- Light theme, calm language, visible focus, and reduced-motion support.

## Colors

### Primary

Landing Ink is the deep teal used for headings, brand, and filled actions. Landing Focus provides the teal keyboard outline. The primary action is deliberately darker than the surrounding mint field.

App Primary is evergreen for existing application controls. App Accent is the established amber emphasis; App Danger Soft supplies calm validation messages. These global roles remain scoped to their incumbent surfaces.

### Neutral

Landing Ground and Landing Ground End form the fixed vertical mint gradient. Landing Secondary carries supporting copy; Landing Glass and Landing Line supply translucent surfaces and quiet separation. App Background and App Surface are warm bone, with App Foreground for text and the existing border, input-border, muted, and muted-foreground roles for forms.

**The Surface Scope Rule.** Apply landing tokens inside the marketing landing only; preserve existing Forest tokens in authentication and application components.

Orb cyan, mint, and iridescent highlights belong to decorative procedural artwork. They are not additional control accents or a semantic status palette.

## Typography

The landing inherits its system font stack from the supplied reference. Its large headings use a compact line height, balanced wrapping, and tight tracking. Supporting paragraphs are limited to 31rem; normal section content is limited to 34rem. Display, headline, body, and button values are normative in the frontmatter.

Existing application typography uses Plus Jakarta Sans with system fallbacks, and Geist Mono for numerics. This document does not introduce a new application heading scale. Landing day numbers use tabular numerals at 0.72rem; compact explanatory text remains subordinate to the headline and body hierarchy.

## Layout

The landing has five panels with a minimum height of 100svh, vertical padding of 14vh, and horizontal padding of clamp(1.25rem, 6vw, 6rem). Wider sections allow 64rem content. On desktop, the hero copy sits left of the orb, the next section sits right, and the final section is centered. The fixed navigation retains both account actions.

At 760px and below, content aligns toward the bottom of each panel with top clearance of max(38svh, 8rem) and bottom clearance of 12svh. The orb moves above copy, right and centered compositions become left aligned, activity rows stack, and the thirty-day strip becomes a ten-column grid. At 360px and below, navigation gaps, brand size, and compact button padding shrink. Safe-area insets are included in navigation and footer padding. Scrolling remains native.

## Elevation & Depth

The landing combines a translucent navigation wash with a frosted program sheet. Navigation uses blur(16px) and saturate(170%); the sheet uses blur(26px) and the same saturation. Its inset highlight and diffuse teal shadow lift it gently from the mint ground. Exact shadows live in the sidecar. Reduced-transparency preferences replace blur with opaque ground; increased contrast adds an ink inset boundary to the sheet and lighter-day tiles.

Existing application cards use the global card or raised forest-tinted shadows and a quiet bone border. They do not inherit frosted glass automatically.

## Shapes

Actions are pills. Existing application cards and fields use the app-card radius; the landing sheet is rounder and day tiles use smaller soft corners. The orb has a smooth, irregular glass silhouette, with flattened, softly faceted pebbles moving independently around it. The fallback is a CSS gradient orb with inset highlights and a diffuse ground shadow.

## Components

### Buttons

Landing action links use Landing Ink on Landing Ground, a pill silhouette, and a minimum height of 48px. Navigation uses a compact 44px version. Fine-pointer hover lifts the pill 2px; active feedback scales it to 0.97 with a 120ms transform transition. Text links gain an underline on hover. Focus is a visible 2px teal outline offset by 5px.

Existing application buttons retain primary, secondary, and ghost variants, with 36px, 44px, and 48px size choices. They use 120ms press feedback, visible focus outlines, and reduced opacity for disabled state. Their existing hover colors remain in the Forest palette.

### Cards / Containers

The landing program sheet uses translucent glass, the sheet radius, responsive padding, and the sheet shadow. The thirty-day strip distinguishes main practice, lighter activity, and final check-in with fill, outline, and accompanying text. Fine-pointer day hover uses a 140ms transform. Existing app cards retain their border and card/raised shadow variants; padding is supplied by their callers.

### Inputs / Fields

Existing app inputs are 44px high with a label above, a bone surface, an input-border stroke, and 16px horizontal padding. Focus uses an evergreen outline offset by 2px. Error copy and borders use calm amber; helper and error text are associated with the field. The landing introduces no form-field variant.

### Navigation

The landing navigation is fixed, with a translucent wash fading toward the page. The small gradient brand mark is decorative. Sign in and Get started remain visible at phone widths. The footer uses simple privacy, terms, and support links with minimum 44px height.

### Procedural artwork

Three.js draws the orb and independent pebbles. Scroll controls its position and scale without intercepting scrolling; mouse dragging returns through a spring. The scene pauses offscreen or in hidden documents. Reduced motion, data saving, limited device capability, loading, and WebGL failure preserve the CSS artwork. Content is visible before enhancement. No generated or downloaded raster assets ship with this landing.

UI reveals use opacity and a 12px translation over 240ms. Reduced motion disables reveals and ongoing orb animation; global CSS makes transitions effectively instant. The ongoing decorative scene is separate from the sub-300ms UI feedback budget.

## Do's and Don'ts

### Do:

- **Do** preserve the landing's scoped Fluid Glass palette and existing Forest authentication palette.
- **Do** keep body copy legible over artwork and preserve visible keyboard focus.
- **Do** provide static artwork and immediately visible content before enhancement.
- **Do** honor reduced motion, reduced transparency, and increased contrast preferences.
- **Do** use calm, non-alarming wording and preserve access to support.

### Don't:

- **Don't** apply the landing's font stack or mint glass treatment globally.
- **Don't** turn decorative orb colors into additional semantic UI accents.
- **Don't** intercept scrolling or make artwork necessary to understand content.
- **Don't** add red-alarm auth errors, shaming streak messages, or em dashes in visible copy.
