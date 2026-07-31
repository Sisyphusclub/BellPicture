# COSMOQ - Style Reference

> A black AI command center lit by blue and amber energy

**Source:** https://cosmoq.framer.website/<br>
**Theme:** dark<br>
**Captured:** 2026-07-16

COSMOQ uses a near-black canvas and lets light do the branding work. The page is set in Inter Display for large, calm headlines and Inter for supporting copy, with tight negative tracking on the hero to create a cinematic, high-confidence voice. The dominant visual rhythm is a centered stack: a small launch notice, oversized white headline, concise supporting copy, then a compact CTA above a large product image. Orange and electric blue light leaks form the hero atmosphere, while product and feature surfaces stay close to black (`#06070a`) so the artwork remains the highest-contrast object. Panels are architectural rather than heavily shadowed: 24px cards, 10px/12px inner surfaces, and translucent white overlays with blur. The signature break is the CTA treatment, whose black body is framed by blue and warm-gold inset highlights instead of a conventional solid accent fill.

## Tokens - Colors

| Name             | Value                    | Token                      | Role                                            |
| ---------------- | ------------------------ | -------------------------- | ----------------------------------------------- |
| Void             | `#000000`                | `--color-void`             | Page canvas and hero base                       |
| Panel Black      | `#06070a`                | `--color-panel-black`      | Feature cards, product panels, step cards       |
| Panel Navy       | `#0c0f16`                | `--color-panel-navy`       | Secondary buttons and darker elevated surfaces  |
| Frosted White    | `rgba(255,255,255,0.07)` | `--color-frosted-white`    | Testimonials and translucent overlays           |
| Cloud White      | `#ffffff`                | `--color-cloud-white`      | Headings, body copy, navigation, primary icons  |
| Muted Periwinkle | `#9ba9c4`                | `--color-muted-periwinkle` | Section labels and supporting metadata          |
| Electric Blue    | `#0175ff`                | `--color-electric-blue`    | CTA left inset highlight and active energy      |
| Warm Gold        | `#ffcd7d`                | `--color-warm-gold`        | CTA right inset highlight and warm counterpoint |
| Hairline White   | `rgba(255,255,255,0.1)`  | `--color-hairline-white`   | Soft borders and translucent containers         |

### Decorative / Gradient

| Name      | Value                                                                  | Token                  | Role                                        |
| --------- | ---------------------------------------------------------------------- | ---------------------- | ------------------------------------------- |
| Hero Veil | `linear-gradient(rgba(255,254,250,0) 0%, rgba(255,255,255,0.07) 100%)` | `--gradient-hero-veil` | Full-bleed hero wash over the black canvas  |
| CTA Inset | `inset -4px 3px 9px #0175ff, inset 3px -2px 8px #ffcd7d`               | `--shadow-cta-inset`   | Blue-to-gold edge light inside primary CTAs |

## Tokens - Typography

### Inter Display - Display and section headings · `--font-inter-display`

- **Substitute:** Inter, Geist Sans
- **Weights:** 400, 500
- **Sizes:** 24px, 36px, 56px, 82px
- **Line height:** 36px, 46.8px, 67.2px, 98.4px
- **Letter spacing:** normal for section headings; `-1.12px` at 56px; `-2.46px` at 82px
- **Role:** Hero title, section headings, feature titles, pricing values

### Inter - Body and interface copy · `--font-inter`

- **Substitute:** Geist Sans, system-ui
- **Weights:** 400, 500
- **Sizes:** 14px, 16px, 18px
- **Line height:** 19.6px, 24px, 25.2px
- **Letter spacing:** normal for metadata; `-0.54px` for the hero supporting paragraph
- **Role:** Navigation labels, launch notice, body copy, section labels, button labels

### Type Scale

| Role       | Size | Line Height | Letter Spacing | Token               |
| ---------- | ---- | ----------- | -------------- | ------------------- |
| display    | 82px | 98.4px      | -2.46px        | `--text-display`    |
| heading    | 56px | 67.2px      | -1.12px        | `--text-heading`    |
| heading-sm | 36px | 46.8px      | 0              | `--text-heading-sm` |
| title      | 24px | 36px        | 0              | `--text-title`      |
| body-lg    | 18px | 25.2px      | -0.54px        | `--text-body-lg`    |
| body       | 16px | 24px        | 0              | `--text-body`       |
| body-sm    | 14px | 19.6px      | 0              | `--text-body-sm`    |

## Tokens - Spacing & Shapes

**Density:** comfortable with large section breaks. Repeated computed gaps cluster around 10px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 74px, and 80px.

### Spacing Scale

| Name    | Value | Token               |
| ------- | ----- | ------------------- |
| micro   | 4px   | `--spacing-micro`   |
| xs      | 8px   | `--spacing-xs`      |
| sm      | 10px  | `--spacing-sm`      |
| control | 12px  | `--spacing-control` |
| md      | 16px  | `--spacing-md`      |
| lg      | 24px  | `--spacing-lg`      |
| xl      | 32px  | `--spacing-xl`      |
| 2xl     | 40px  | `--spacing-2xl`     |
| 3xl     | 48px  | `--spacing-3xl`     |
| 4xl     | 64px  | `--spacing-4xl`     |
| section | 80px  | `--spacing-section` |

### Border Radius

| Name    | Value | Token              |
| ------- | ----- | ------------------ |
| micro   | 4px   | `--radius-micro`   |
| control | 10px  | `--radius-control` |
| inner   | 12px  | `--radius-inner`   |
| button  | 15px  | `--radius-button`  |
| nav     | 16px  | `--radius-nav`     |
| card    | 24px  | `--radius-card`    |
| pill    | 999px | `--radius-pill`    |

| Element            | Value |
| ------------------ | ----- |
| cards              | 24px  |
| buttons            | 15px  |
| navigation capsule | 999px |
| chips/tabs         | 999px |

### Shadows

| Name           | Value                                                                                                                                                                                                        | Token                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| CTA depth      | `rgba(0,0,0,0.18) 0 0.83px 0.83px -0.75px, rgba(0,0,0,0.18) 0 2.26px 2.26px -1.5px, rgba(0,0,0,0.17) 0 4.96px 4.96px -2.25px, rgba(0,0,0,0.14) 0 11.01px 11.01px -3px, rgba(0,0,0,0.06) 0 28px 28px -3.75px` | `--shadow-cta-depth` |
| CTA blue edge  | `#0175ff -4px 3px 9px 0 inset`                                                                                                                                                                               | `--shadow-cta-blue`  |
| CTA gold edge  | `#ffcd7d 3px -2px 8px 0 inset`                                                                                                                                                                               | `--shadow-cta-gold`  |
| Nav inner edge | `rgba(255,255,255,0.07) -3px -2px 8px 0 inset`                                                                                                                                                               | `--shadow-nav-inner` |

### Layout

- **Hero height:** 857px at the captured desktop viewport.
- **Hero content width:** approximately 524px for supporting copy; product image 1120px wide.
- **Feature card radius:** 24px.
- **Card padding:** observed 24px, with larger feature modules using 40px/28px edge insets.
- **Navigation:** 52-53px high, 16px from the top edge, centered pill capsule.

## Components

### Primary CTA

**Role:** Main conversion action (`Get Started`).

Black background, 15px radius, `14px 24px` padding, 47px rendered height, and a layered depth shadow. The inset edges combine Electric Blue on the lower-left and Warm Gold on the upper-right. Hover and active states should preserve the black body and edge-light language; do not replace it with a flat blue fill.

### Secondary CTA

**Role:** Supporting action (`Get in touch`, feature links).

Panel Navy (`#0c0f16`) body, 15px radius, `14px 24px` padding, 47px rendered height, and no visible outer shadow. Use where an action is important but should sit below the primary conversion.

### Navigation Capsule

**Role:** Primary site navigation.

Transparent black capsule with 999px radius, `backdrop-filter: blur(8px)`, a subtle white inset edge, and 53px height. Navigation labels sit in white with generous horizontal breathing room. The top-right CTA is a separate 15px control rather than part of the capsule.

### Feature Card

**Role:** Product capability or enterprise proof point.

Panel Black (`#06070a`) surface, 24px radius, and no conventional drop shadow. Interior content uses 10px or 12px rounded sub-surfaces and small muted labels. Reserve translucent white (`rgba(255,255,255,0.07)`) for image overlays or testimonial modules.

### Pill Chip

**Role:** Product category or pricing filter.

999px radius, 40px observed height, white active fill for the selected chip and `rgba(255,255,255,0.07)` for inactive chips. Keep labels short and let the pill group act as a quiet navigation layer.

### Input / Search Surface

**Role:** Search or conversational controls inside product imagery.

Use a dark translucent field with a 12px radius, `12px 16px` padding, white text, and a blurred or low-contrast surrounding panel. Avoid bright borders; separation should come from surface contrast and hairline white.

## Surfaces

| Level | Name          | Value                    | Purpose                                       |
| ----- | ------------- | ------------------------ | --------------------------------------------- |
| 0     | Void          | `#000000`                | Full page and hero background                 |
| 1     | Panel Black   | `#06070a`                | Feature cards and product shells              |
| 2     | Panel Navy    | `#0c0f16`                | Secondary actions and dark controls           |
| 3     | Frosted White | `rgba(255,255,255,0.07)` | Testimonials, overlays, floating glass layers |

## Do's and Don'ts

### Do

- Start new sections on `--color-void` and use `--color-panel-black` only when a surface needs to separate from the canvas.
- Keep display text in `--font-inter-display` with the observed negative tracking at 56px and 82px.
- Use white as the primary text color and `--color-muted-periwinkle` only for labels and supporting metadata.
- Preserve the `15px` CTA radius and the blue/gold inset edge treatment for primary actions.
- Use `24px` cards with low-contrast surfaces instead of heavy drop shadows.
- Use `--color-frosted-white` with blur for testimonials and floating overlays.
- Keep hero compositions centered and let a single product image carry the visual weight below the CTA.

### Don't

- Do not replace the black canvas with a generic dark navy or a saturated blue background.
- Do not fill primary CTAs with flat Electric Blue; blue is an inset highlight, not the button body.
- Do not use Warm Gold as a text color or general accent; it is a restrained edge light.
- Do not introduce sharp-corner cards; the observed feature language is 24px rounded.
- Do not add large opaque borders to glass surfaces; use blur, translucency, and hairlines.
- Do not use loose display tracking; the hero depends on `-2.46px` at 82px.
- Do not turn every label into a pill; reserve 999px shapes for nav capsules and category chips.

## Imagery

COSMOQ uses luminous, abstract atmosphere behind a tangible enterprise dashboard. The hero art combines an orange-to-blue light field with a dark product screenshot, creating a cinematic contrast between energy and control. Product imagery is wide, centered, and allowed to extend below the first viewport. Feature visuals are usually contained in near-black 24px shells with translucent overlays, rather than presented as isolated illustrations. Use clean UI screenshots, soft glow, and restrained color accents; avoid busy stock photography or colorful illustration systems.

## Layout

The desktop page uses a centered max-width composition with a 52px navigation bar at the top and an 857px hero stage. The hero stacks the announcement, display headline, supporting paragraph, CTA, then a 1120px product image with generous vertical breathing room. Later sections alternate broad heading blocks with 2- or 3-column feature cards and full-width step cards. Responsive layouts should keep the same hierarchy, collapse columns into a single flow, and preserve 24px card radii and 16px internal rhythm.

## Agent Prompt Guide

1. Build a COSMOQ hero with a `#000000` canvas, an orange/blue light-field background, `Inter Display` 82px/98.4px weight 500 headline at `-2.46px` tracking, and a 15px black CTA with `#0175ff` and `#ffcd7d` inset edges.
2. Build a feature card using `#06070a`, 24px radius, 24px padding, white Inter Display title at 24px/36px, and `#9ba9c4` metadata at 16px/24px.
3. Build a glass testimonial row with `rgba(255,255,255,0.07)`, `backdrop-filter: blur(10px)`, 24px radius, white quote text, and muted periwinkle attribution.

## Similar Brands

- **Vercel** - Similar black canvas, restrained type, and high-contrast product-first hero composition.
- **Linear** - Shares precise display typography, dark surfaces, and quiet translucent layering.
- **Stripe** - Uses light as a brand device and treats product visuals as the main emotional anchor.
- **Raycast** - Similar dark productivity-tool vocabulary with bright but disciplined interaction accents.

## Quick Start

### CSS Custom Properties

```css
:root {
  --color-void: #000000;
  --color-panel-black: #06070a;
  --color-panel-navy: #0c0f16;
  --color-frosted-white: rgba(255, 255, 255, 0.07);
  --color-cloud-white: #ffffff;
  --color-muted-periwinkle: #9ba9c4;
  --color-electric-blue: #0175ff;
  --color-warm-gold: #ffcd7d;
  --color-hairline-white: rgba(255, 255, 255, 0.1);

  --font-inter-display: "Inter Display", Inter, sans-serif;
  --font-inter: Inter, ui-sans-serif, system-ui, sans-serif;

  --text-display: 82px;
  --leading-display: 98.4px;
  --tracking-display: -2.46px;
  --text-heading: 56px;
  --leading-heading: 67.2px;
  --tracking-heading: -1.12px;
  --text-heading-sm: 36px;
  --leading-heading-sm: 46.8px;
  --text-body-lg: 18px;
  --leading-body-lg: 25.2px;
  --tracking-body-lg: -0.54px;

  --spacing-micro: 4px;
  --spacing-xs: 8px;
  --spacing-sm: 10px;
  --spacing-control: 12px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 40px;
  --spacing-3xl: 48px;
  --spacing-4xl: 64px;
  --spacing-section: 80px;

  --radius-control: 10px;
  --radius-inner: 12px;
  --radius-button: 15px;
  --radius-card: 24px;
  --radius-pill: 999px;

  --shadow-cta-depth:
    rgba(0, 0, 0, 0.18) 0 0.83px 0.83px -0.75px,
    rgba(0, 0, 0, 0.18) 0 2.26px 2.26px -1.5px,
    rgba(0, 0, 0, 0.17) 0 4.96px 4.96px -2.25px,
    rgba(0, 0, 0, 0.14) 0 11.01px 11.01px -3px,
    rgba(0, 0, 0, 0.06) 0 28px 28px -3.75px;
}
```

### Tailwind v4

```css
@theme {
  --color-void: #000000;
  --color-panel-black: #06070a;
  --color-panel-navy: #0c0f16;
  --color-frosted-white: rgba(255, 255, 255, 0.07);
  --color-cloud-white: #ffffff;
  --color-muted-periwinkle: #9ba9c4;
  --color-electric-blue: #0175ff;
  --color-warm-gold: #ffcd7d;
  --font-inter-display: "Inter Display", Inter, sans-serif;
  --font-inter: Inter, ui-sans-serif, system-ui, sans-serif;
  --radius-button: 15px;
  --radius-card: 24px;
  --radius-pill: 999px;
}
```
