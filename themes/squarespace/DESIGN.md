# Squarespace - Style Reference

> Editorial restraint, full-bleed imagery, and uncompromising black-and-white contrast

**Source:** https://www.squarespace.com/<br>
**Theme:** mixed, with section-based light and dark surfaces<br>
**Captured:** 2026-07-27

Squarespace treats the page as an editorial sequence of pure black and white stages, then lets photography provide nearly all of the color. Clarkson gives display text a wide, low-weight, precisely tracked voice, while Clarkson Serif appears sparingly on image-led cards to add a crafted, magazine-like counterpoint. Primary actions are plain white rectangles on dark media, with black uppercase labels and only a 4px radius; their confidence comes from contrast and proportion rather than decoration. Depth is almost entirely photographic: large images, 40% black overlays, horizontal carousels, and black fades replace conventional card shadows. White content bands carry oversized headings and generous empty space, while black bands reset the rhythm for search, proof, support, conversion, and footer content. Components stay quiet, using 4px or 8px radii, hairline dividers, compact uppercase labels, and arrow motion instead of saturated accents. The signature rhythm break is the hard alternation between luminous white space and full black sections, punctuated by oversized real-world imagery that remains the most colorful object on screen.

## Tokens - Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Dark Canvas | `#000000` | `--color-canvas-dark` | Hero base, dark content bands, sticky navigation, conversion section, footer |
| Light Canvas | `#ffffff` | `--color-canvas-light` | Primary content bands and inverse controls |
| Dark Surface 1 | `#1a1a1a` | `--color-surface-dark-1` | Deep secondary panels and dark media fallbacks |
| Dark Surface 2 | `#2f2f2f` | `--color-surface-dark-2` | Dark inputs, utility panels, and media-backed controls |
| Dark Surface 3 | `#323232` | `--color-surface-dark-3` | Slightly raised dark controls |
| Ink | `#000000` | `--color-ink` | Primary text and icons on light surfaces |
| Ink Inverse | `#ffffff` | `--color-ink-inverse` | Primary text and icons on dark surfaces and media |
| Ink Muted | `#898989` | `--color-ink-muted` | Secondary copy, footer links, and inactive labels |
| Ink Soft | `#d9d9d9` | `--color-ink-soft` | Low-emphasis text on dark media |
| Surface Subtle | `rgba(0,0,0,0.05)` | `--color-surface-subtle` | Mobile search fields and quiet selected regions on white |
| Selection Subtle | `rgba(0,0,0,0.08)` | `--color-selection-subtle` | Selected category tabs on light surfaces |
| Hairline Light | `rgba(0,0,0,0.08)` | `--color-hairline-light` | Dividers and boundaries on white |
| Hairline Dark | `rgba(255,255,255,0.10)` | `--color-hairline-dark` | Dividers and boundaries on black |
| Overlay Soft | `rgba(255,255,255,0.10)` | `--color-overlay-soft` | Quiet floating elements over dark imagery |
| Input Dark | `rgba(255,255,255,0.20)` | `--color-input-dark` | Domain/search input on desktop dark sections |
| Media Scrim | `rgba(0,0,0,0.40)` | `--color-media-scrim` | Legibility overlay on photographic cards |

The source does not use a persistent saturated accent color. Product imagery supplies chroma; interaction hierarchy stays black, white, and gray.

### Decorative / Gradient

| Name | Value | Token | Role |
|------|-------|-------|------|
| Hero Fade | `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,0) 70%, #000000 100%)` | `--gradient-hero-fade` | Connects full-bleed hero media to the black proof band |
| Media Scrim | `linear-gradient(rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.4) 100%)` | `--gradient-media-scrim` | Preserves white text over active imagery |
| Section Fade | `linear-gradient(rgba(0,0,0,0) 85%, #000000 100%)` | `--gradient-section-fade` | Ends the light AI section against the next black band |
| Card Bottom Fade | `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,0) 50%, #000000 100%)` | `--gradient-card-bottom` | Anchors labels and arrows to the base of image cards |

## Tokens - Typography

### Clarkson - Wide editorial sans for display and interface text - `--font-sans`

- **Substitute:** Inter, Helvetica Neue, Arial
- **Weights:** 300, 400, 500
- **Sizes:** 12px, 13px, 14px, 15px, 16px, 24px, 26px, 50px, 72px, 74px, 106px
- **Line height:** 12px, 14px, 16.8px, 18.2px, 21px, 28.8px, 54px, 74.88px, 79.92px, 110.24px
- **Letter spacing:** `-5.3px`, `-4.32px`, `-2.96px`, `-2px`, `-0.24px`, `-0.015px`, `0`
- **OpenType features:** no custom feature settings were exposed in computed styles
- **Role:** Display headings, navigation, body copy, buttons, tabs, utility labels, and footer

### Clarkson Serif - Crafted editorial counterpoint - `--font-serif`

- **Substitute:** Newsreader, Source Serif 4, Georgia
- **Weights:** 400
- **Sizes:** 20px mobile, 34px desktop
- **Line height:** 21.6px mobile, 36.72px desktop
- **Letter spacing:** `-0.4px` mobile, `-0.68px` desktop
- **OpenType features:** no custom feature settings were exposed in computed styles
- **Role:** Titles on image-led product and capability cards only

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| display-xl | 106px | 110.24px | -5.3px | `--text-display-xl` |
| display-lg | 74px | 79.92px | -2.96px | `--text-display-lg` |
| display | 72px | 74.88px | -4.32px | `--text-display` |
| heading | 50px | 54px | -2px | `--text-heading` |
| heading-sm | 34px | 36.72px | -0.68px | `--text-heading-sm` |
| title | 24px | 28.8px | -0.24px | `--text-title` |
| body | 16px | 21px | 0 | `--text-body` |
| body-sm | 15px | 21px | -0.015px | `--text-body-sm` |
| ui | 14px | 14px | 0 | `--text-ui` |
| caption | 12px | 16.8px | 0 | `--text-caption` |

### Responsive Type

| Role | Desktop | Mobile | Mobile Line Height | Mobile Tracking |
|------|---------|--------|--------------------|-----------------|
| hero display | 72px | 42.4066px | 44.1028px | -2.54439px |
| conversion display | 74px | 40px | 43.2px | -1.6px |
| section heading | 50px | 26px | 28.08px | -1.04px |
| editorial card title | 34px | 20px | 21.6px | -0.4px |

Do not interpolate font size continuously with viewport width. Switch at explicit responsive breakpoints and use the observed mobile values as fixed targets.

## Tokens - Spacing & Shapes

**Base unit:** 4px

**Density:** generous for pages, compact inside controls

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 24 | 24px | `--spacing-24` |
| 28 | 28px | `--spacing-28` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 64 | 64px | `--spacing-64` |
| 80 | 80px | `--spacing-80` |
| 120 | 120px | `--spacing-120` |
| 240 | 240px | `--spacing-240` |

### Border Radius

| Name | Value | Token |
|------|-------|-------|
| compact | 3px | `--radius-compact` |
| control | 4px | `--radius-control` |
| soft | 6px | `--radius-soft` |
| card | 8px | `--radius-card` |
| pill | 100px | `--radius-pill` |
| circle | 50% | `--radius-circle` |

| Element | Value |
|---------|-------|
| primary buttons | 4px |
| media and feature cards | 8px desktop; 0 on edge-to-edge mobile carousel cards |
| search inputs | 8px |
| selected tabs | 100px |
| avatar clusters and circular icons | 50% |

### Shadows

No material box-shadow token was observed. Primary buttons, navigation, cards, inputs, and page surfaces consistently resolved to `box-shadow: none`; separate depth with contrast, imagery, overlays, and spacing.

### Layout

- **Desktop edge inset:** 40px.
- **Mobile edge inset:** 16px for navigation and 24px for hero copy.
- **Desktop navigation:** 80px high with 32px between the central menu groups.
- **Mobile navigation:** 68px high with 16px side padding.
- **Section vertical padding:** 120px is the common large interval; the AI transition section reaches 240px at its base.
- **Control height:** 60px for primary CTAs and 62px for large search inputs.
- **Content rhythm:** centered headlines above full-width horizontal media sequences; black and white bands span the viewport.

## Components

### Desktop Navigation

**Role:** Persistent global navigation over hero media and content bands.

Transparent over the hero, 80px high, `0 40px` padding, and no border or shadow. The wordmark sits left, three menu groups sit centered with a 32px gap, and Log In plus a 166px primary CTA sit right. Once content scrolls under it, use Dark Canvas (`#000000`) with Ink Inverse (`#ffffff`) to preserve contrast. Menu labels are 14-16px, medium or regular weight, with no pill background.

### Mobile Navigation

**Role:** Compact global navigation.

Transparent over hero media, 68px high, and `0 16px` padding. Keep only the symbol mark and a three-line menu icon; do not squeeze desktop labels into the mobile header. On solid sections, switch the header surface and icon color together so contrast remains binary.

### Primary CTA

**Role:** Highest-priority conversion or creation action.

Light Canvas (`#ffffff`) background, Ink (`#000000`) text, no border, `4px` radius, `23px 28px` padding, and a 60px rendered height. Use Clarkson/Inter at `14px/500/14px`, uppercase. The observed hover keeps fill, color, and shadow unchanged; motion is confined to the label/arrow, shifting horizontally by roughly 2-4px. Keep a visible native or product focus outline because the source did not expose a custom focus-ring token; never suppress focus without replacing it.

### Inverse Primary CTA

**Role:** Primary action on a light content band.

Dark Canvas (`#000000`) background, Ink Inverse (`#ffffff`) text, the same 4px radius and 60px control height. Preserve the black/white inversion rather than introducing a saturated brand fill.

### Inline Arrow Link

**Role:** Secondary action in cards, rows, and editorial copy.

Transparent background, current text color, no border, and no enclosing pill. Pair a concise label with a right arrow. On hover, shift only the arrow 2-4px to the right; do not add a colored underline or background.

### Category Tabs

**Role:** Switches between content categories above a media carousel.

Unselected tabs use transparent backgrounds and Ink (`#000000`) text. The selected tab uses Selection Subtle (`rgba(0,0,0,0.08)`) and `--radius-pill` (100px). Keep labels at 16px and allow the group to scroll horizontally on small screens rather than wrapping into multiple irregular rows.

### Media Feature Card

**Role:** Product capability, example, or generated-image feature.

Use a real image as the entire surface, an 8px desktop radius, no border, and no shadow. In the observed mobile carousel, cards become edge-to-edge and the radius resolves to 0; retain 8px only when a mobile card remains visibly inset. Add Media Scrim (`rgba(0,0,0,0.40)`) only when needed for text legibility. Set the card title in Clarkson Serif/Newsreader at 34px/36.72px with -0.68px tracking on desktop and 20px/21.6px with -0.4px tracking on mobile. Place the description near the top and supporting metadata plus an arrow near the bottom edge.

### Platform Feature Card

**Role:** Repeated tool or capability tile.

Use a large image or product screenshot with white text over it, 8px radius, and no shadow. Favor tall 3:4 or near-square cards in horizontal carousels. Hover may reveal or move the directional arrow, but the surface should not lift with a drop shadow.

### Search Input

**Role:** Domain, asset, or prompt search.

On dark desktop bands, use Input Dark (`rgba(255,255,255,0.20)`), Ink Inverse, 8px radius, and 62px height. On mobile light bands, invert to Surface Subtle (`rgba(0,0,0,0.05)`) with Ink. Place search and submit icons inside the field at opposite edges. Preserve a visible focus outline; the source did not expose a custom focus color.

### Footer

**Role:** Dense global navigation and legal information.

Dark Canvas (`#000000`) background with 40px desktop edge padding. Use Ink Inverse for group labels and Ink Muted (`#898989`) for secondary links. Separate the legal row with Hairline Dark and keep the brand statement large enough to anchor the first column. Collapse groups into accordions or stacked sections on mobile without removing destinations.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Light Canvas | `#ffffff` | Primary product explanation and template sections |
| 1 | Surface Subtle | `rgba(0,0,0,0.05)` | Quiet controls and selected regions on white |
| 2 | Dark Canvas | `#000000` | Hero base, search/proof/conversion bands, footer |
| 3 | Dark Surface 2 | `#2f2f2f` | Inputs and operational panels on black |
| 4 | Media Surface | `image + rgba(0,0,0,0.40)` | Feature cards and cinematic hero compositions |

## Do's and Don'ts

### Do

- Alternate `--color-canvas-light` and `--color-canvas-dark` as full-width bands to create the primary page rhythm.
- Set display copy in `--font-sans` at the documented 72px/74.88px desktop or 42.4066px/44.1028px mobile values.
- Reserve `--font-serif` for 34px desktop and 20px mobile image-card titles.
- Use `--color-canvas-light` and `--color-canvas-dark` as the two CTA fills; let hierarchy come from inversion.
- Keep inset media and feature cards at `--radius-card` (8px) with `box-shadow: none`; use 0 radius for observed edge-to-edge mobile carousel cards.
- Apply `--gradient-media-scrim` only where white text overlaps photography.
- Use `--spacing-120` for major section intervals and `--spacing-40` for desktop edge insets.
- Let real generated images and product screenshots provide the palette beyond black, white, and gray.

### Don't

- Do not add a saturated accent color to primary actions; the observed system uses `#ffffff` and `#000000` fills.
- Do not place every section inside a floating card; `--color-canvas-light` and `--color-canvas-dark` should remain full-bleed.
- Do not replace `--radius-control` (4px) buttons with oversized pills or 16-24px SaaS radii; reserve `--radius-pill` (100px) for tabs and true capsules.
- Do not add decorative drop shadows; all observed primary surfaces resolve to `box-shadow: none`.
- Do not use `--font-serif` for body copy, forms, tables, or navigation.
- Do not dilute display tracking; 72px hero copy uses `-4.32px` and 50px section headings use `-2px`.
- Do not overlay text on busy imagery without `--gradient-media-scrim` or equivalent local contrast.
- Do not preserve black desktop sections blindly on mobile when the responsive source inverts them to white; switch text and control tokens as a pair.

## Imagery

Squarespace makes imagery the color system. The hero uses full-bleed lifestyle photography or video with enough human presence and environmental detail to communicate a real business, then darkens only the areas needed for white type. Product examples appear as large, sharp website screenshots arranged in overlapping or horizontal carousels; feature cards combine photography, UI mockups, and simple product visuals without decorative frames. Cards remain image-first with restrained text, minimal iconography, and 8px desktop corners; edge-to-edge mobile carousel cards resolve to square corners. For Nebulens, use actual generated images, prompt results, and interface screenshots at full fidelity; avoid abstract gradients, stock-like decorative scenes, and placeholder illustrations.

## Layout

The homepage alternates full-width black and white bands rather than stacking independent cards. A full-bleed hero occupies roughly the first viewport and continues into an overlapping horizontal showcase, leaving a visible hint of the proof band below. Headings are centered above wide carousels, while content within image cards aligns to their edges. Desktop uses 40px page insets and very large 120px section intervals; mobile reduces navigation to 16px insets, hero copy to 24px insets, and display text to about 42px. Long card sequences remain horizontal on mobile, preserving one strong focal card rather than compressing into a dense grid; cards that meet the viewport edge drop their radius to 0. Footer and operational content become denser, but retain strict column alignment and hairline separation.

## Agent Prompt Guide

1. Build a Nebulens landing hero with a full-bleed real generated-image background, `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,0) 70%, #000 100%)`, a centered Inter 72px/74.88px weight 300 headline at -4.32px tracking, and a 166x60px white CTA with black uppercase 14px text and 4px radius.
2. Build a generated-image feature carousel on `#ffffff` with a centered 50px/54px Inter heading, 120px section padding, horizontally arranged image-first cards with 8px radius, no shadow, a 40% black scrim, and Newsreader 34px/36.72px titles.
3. Build a dark prompt search band on `#000000` using a 62px `rgba(255,255,255,0.20)` input with 8px radius, white 16px text, search and submit icons inside the field, 40px desktop insets, and a responsive mobile inversion to `#ffffff` plus `rgba(0,0,0,0.05)`.

## Similar Brands

- **Webflow** - Similar product-led site building narrative, monochrome framing, and large interface demonstrations.
- **Framer** - Shares crisp editorial typography, image-led product cards, and restrained interaction motion.
- **Readymag** - Uses magazine-like type contrast and full-bleed creative examples.
- **Format** - Similar emphasis on portfolios, real customer work, and minimal neutral framing.
- **Apple** - Shares black/white stage changes, large centered statements, and imagery as the primary source of color.

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-canvas-dark: #000000;
  --color-canvas-light: #ffffff;
  --color-surface-dark-1: #1a1a1a;
  --color-surface-dark-2: #2f2f2f;
  --color-surface-dark-3: #323232;
  --color-ink: #000000;
  --color-ink-inverse: #ffffff;
  --color-ink-muted: #898989;
  --color-ink-soft: #d9d9d9;
  --color-surface-subtle: rgba(0, 0, 0, 0.05);
  --color-selection-subtle: rgba(0, 0, 0, 0.08);
  --color-hairline-light: rgba(0, 0, 0, 0.08);
  --color-hairline-dark: rgba(255, 255, 255, 0.10);
  --color-overlay-soft: rgba(255, 255, 255, 0.10);
  --color-input-dark: rgba(255, 255, 255, 0.20);
  --color-media-scrim: rgba(0, 0, 0, 0.40);

  /* Decorative */
  --gradient-hero-fade: linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 70%, #000000 100%);
  --gradient-media-scrim: linear-gradient(rgba(0, 0, 0, 0.40) 0%, rgba(0, 0, 0, 0.40) 100%);
  --gradient-section-fade: linear-gradient(rgba(0, 0, 0, 0) 85%, #000000 100%);
  --gradient-card-bottom: linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 50%, #000000 100%);

  /* Typography */
  --font-sans: Inter, "Helvetica Neue", Arial, sans-serif;
  --font-serif: Newsreader, "Source Serif 4", Georgia, serif;
  --text-display-xl: 106px;
  --leading-display-xl: 110.24px;
  --tracking-display-xl: -5.3px;
  --text-display-lg: 74px;
  --leading-display-lg: 79.92px;
  --tracking-display-lg: -2.96px;
  --text-display: 72px;
  --leading-display: 74.88px;
  --tracking-display: -4.32px;
  --text-heading: 50px;
  --leading-heading: 54px;
  --tracking-heading: -2px;
  --text-heading-sm: 34px;
  --leading-heading-sm: 36.72px;
  --tracking-heading-sm: -0.68px;
  --text-title: 24px;
  --leading-title: 28.8px;
  --tracking-title: -0.24px;
  --text-body: 16px;
  --leading-body: 21px;
  --tracking-body: 0;
  --text-body-sm: 15px;
  --leading-body-sm: 21px;
  --tracking-body-sm: -0.015px;
  --text-ui: 14px;
  --leading-ui: 14px;
  --tracking-ui: 0;
  --text-caption: 12px;
  --leading-caption: 16.8px;
  --tracking-caption: 0;

  /* Spacing */
  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-28: 28px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-80: 80px;
  --spacing-120: 120px;
  --spacing-240: 240px;

  /* Shapes */
  --radius-compact: 3px;
  --radius-control: 4px;
  --radius-soft: 6px;
  --radius-card: 8px;
  --radius-pill: 100px;
  --radius-circle: 50%;
}
```

### Tailwind v4

```css
@theme {
  --color-canvas-dark: #000000;
  --color-canvas-light: #ffffff;
  --color-surface-dark-1: #1a1a1a;
  --color-surface-dark-2: #2f2f2f;
  --color-surface-dark-3: #323232;
  --color-ink: #000000;
  --color-ink-inverse: #ffffff;
  --color-ink-muted: #898989;
  --color-ink-soft: #d9d9d9;
  --color-surface-subtle: rgba(0, 0, 0, 0.05);
  --color-selection-subtle: rgba(0, 0, 0, 0.08);
  --color-hairline-light: rgba(0, 0, 0, 0.08);
  --color-hairline-dark: rgba(255, 255, 255, 0.10);
  --color-overlay-soft: rgba(255, 255, 255, 0.10);
  --color-input-dark: rgba(255, 255, 255, 0.20);
  --color-media-scrim: rgba(0, 0, 0, 0.40);
  --font-sans: Inter, "Helvetica Neue", Arial, sans-serif;
  --font-serif: Newsreader, "Source Serif 4", Georgia, serif;
  --radius-control: 4px;
  --radius-card: 8px;
  --radius-pill: 100px;
  --radius-circle: 50%;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-40: 40px;
  --spacing-80: 80px;
  --spacing-120: 120px;
}
```
