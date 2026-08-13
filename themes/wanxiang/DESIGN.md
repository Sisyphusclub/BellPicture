# Wanxiang Explore - Style Reference
> Full-bleed generative media, restrained glass controls, and a quiet creator-first stage

**Theme:** dark
**Source:** [Wanxiang Explore](https://tongyi.aliyun.com/wan/explore)
**Captured:** 2026-08-13 at 1952x1098 and 1366x768

Wanxiang Explore treats generated media as the interface canvas rather than placing it inside a conventional marketing shell. A near-black base is mostly concealed by a full-bleed moving image, while navigation and creation controls sit above it as thin, refractive glass. The Chinese display title uses a restrained serif face, contrasting with the compact sans-serif product controls. White is the dominant interface color; cyan, blue, and violet appear only as low-area focus energy around the composer. Depth comes from tint, refraction, inset highlights, and media contrast instead of large opaque cards or heavy shadows. The composition stays operational: an 83px tool rail, a centered 940px composer, one row of capability pills, then a dense masonry feed entering from the lower edge. Its signature rhythm break is the immediate handoff from cinematic full-screen media into a tightly packed gallery without a separate section container.

## Tokens - Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Canvas | `#0d0d0e` | `--color-canvas` | Fallback page background and left-side media fade |
| Surface | `#17171b` | `--color-surface` | Gallery loading surface and quiet raised regions |
| Active Surface | `rgba(38,38,44,0.80)` | `--color-surface-active` | Selected navigation and floating status surfaces |
| Glass Center | `rgba(19,19,20,0.64)` | `--color-glass-center` | Central tint of composer and pills |
| Glass Edge | `rgba(19,19,20,0.56)` | `--color-glass-edge` | Outer tint of composer and pills |
| Control Quiet | `rgba(255,255,255,0.04)` | `--color-control-quiet` | Model and parameter capsules |
| Control Hover | `rgba(255,255,255,0.08)` | `--color-control-hover` | Hovered upload and icon controls |
| Control Strong | `rgba(255,255,255,0.20)` | `--color-control-strong` | Submit action against the glass composer |
| Ink | `#fafafc` | `--color-ink` | Primary title, active labels, and icons |
| Ink Secondary | `rgba(255,255,255,0.80)` | `--color-ink-secondary` | Navigation, controls, and metadata |
| Ink Muted | `rgba(255,255,255,0.50)` | `--color-ink-muted` | Placeholders and supporting metadata |
| Hairline | `rgba(255,255,255,0.10)` | `--color-hairline` | Header controls and subtle boundaries |
| Hairline Strong | `rgba(255,255,255,0.30)` | `--color-hairline-strong` | Directional glass edge highlights |
| Focus Cyan | `#00f8f1` | `--color-focus-cyan` | Composer lower-edge aura only |
| Focus Blue | `#6691ff` | `--color-focus-blue` | Rotating focus shine and focused controls |
| Focus Violet | `#a900ff` | `--color-focus-violet` | Composer focus bloom only |
| Membership Pink | `#ffdff6` | `--color-membership-pink` | Membership gradient text, not general UI |
| Membership Lavender | `#c0ace1` | `--color-membership-lavender` | Membership gradient text |
| Membership Blue | `#9cb9ff` | `--color-membership-blue` | Membership gradient text |

### Decorative / Gradient

| Name | Value | Token | Role |
|------|-------|-------|------|
| Glass Tint | `radial-gradient(50% 50%, rgba(19,19,20,0.64) 0%, rgba(19,19,20,0.56) 100%)` | `--gradient-glass-tint` | Continuous dark tint above media |
| Glass Edge | `linear-gradient(337deg, rgba(255,255,255,0.30) 5%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04) 70%, rgba(255,255,255,0.30) 95%)` | `--gradient-glass-edge` | Directional edge around composer and pills |
| Nav Edge | `linear-gradient(335deg, rgba(255,255,255,0.15) 5%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.03) 59%, rgba(255,255,255,0.15) 95%)` | `--gradient-nav-edge` | Selected side navigation outline |
| Header Fade | `linear-gradient(180deg, rgba(13,13,14,0.60) 0%, rgba(13,13,14,0) 100%)` | `--gradient-header-fade` | Readability behind top account controls |
| Media Fade | `linear-gradient(90deg, #0d0d0e 63%, rgba(13,13,14,0) 72%)` | `--gradient-media-fade` | Transition from gallery/media into canvas |
| Focus Aura | `linear-gradient(90deg, #00f8f1 0%, transparent 16.5%, transparent 85.5%, #00f8f1 100%)` | `--gradient-focus-aura` | Blurred composer focus energy |
| Focus Bloom | `radial-gradient(at 50% 75%, #a900ff 50%, transparent 75%)` | `--gradient-focus-bloom` | Small violet focus bloom beneath composer |
| Membership | `linear-gradient(102deg, rgba(255,223,246,0.40) 12%, rgba(192,172,225,0.40) 43%, rgba(156,185,255,0.40) 75%, rgba(255,255,255,0.40) 94%)` | `--gradient-membership` | Membership label only |

## Tokens - Typography

### Feature Noto Serif SC - cinematic Chinese display face - `--font-display`
- **Substitute:** Noto Serif SC, Source Han Serif SC, serif
- **Weights:** 400, 500, 600
- **Sizes:** 54px observed on desktop
- **Line height:** 64px
- **Letter spacing:** 0
- **OpenType features:** none observed
- **Role:** Hero statement and gallery section title only. Do not use in toolbars or work surfaces.

### Alibaba PuHuiTi - compact product interface - `--font-interface`
- **Substitute:** Noto Sans SC, PingFang SC, Microsoft YaHei, Inter, sans-serif
- **Weights:** 400, 500, 600
- **Sizes:** 10px, 12px, 14px, 16px
- **Line height:** 12px, 20px, 24px, 28px
- **Letter spacing:** 0
- **OpenType features:** none observed
- **Role:** Navigation, prompt text, controls, tabs, metadata, and account actions.

### Crimson Pro - editorial Latin accent - `--font-editorial`
- **Substitute:** Instrument Serif, Source Serif 4, serif
- **Weights:** 200-900 variable
- **Sizes:** not visibly dominant in the captured route
- **Line height:** normal
- **Letter spacing:** 0
- **OpenType features:** variable weight axis
- **Role:** Available in the source bundle for selective editorial Latin copy; not required for the core interface.

### IBM Plex Sans - technical Latin fallback - `--font-technical`
- **Substitute:** Inter, Geist, sans-serif
- **Weights:** 100-900 variable
- **Sizes:** not visibly dominant in the captured route
- **Line height:** normal
- **Letter spacing:** 0
- **OpenType features:** variable width and weight axes
- **Role:** Technical Latin fallback where Alibaba PuHuiTi is not used.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| display | 54px | 64px | 0 | `--text-display` |
| section | 32px | 40px | 0 | `--text-section` |
| headline | 20px | 28px | 0 | `--text-headline` |
| body | 16px | 24px | 0 | `--text-body` |
| body-sm | 14px | 22px | 0 | `--text-body-sm` |
| composer | 14px | 28px | 0 | `--text-composer` |
| caption | 12px | 20px | 0 | `--text-caption` |
| navigation | 10px | 12px | 0 | `--text-navigation` |

## Tokens - Spacing & Shapes

**Base unit:** 4px

**Density:** comfortable around the composer, compact in navigation and gallery

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 4 | 4px | `--spacing-4` |
| 6 | 6px | `--spacing-6` |
| 8 | 8px | `--spacing-8` |
| 10 | 10px | `--spacing-10` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 20 | 20px | `--spacing-20` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 52 | 52px | `--spacing-52` |
| 64 | 64px | `--spacing-64` |
| 88 | 88px | `--spacing-88` |

### Border Radius

| Name | Value | Token |
|------|-------|-------|
| media-sm | 2px | `--radius-media-sm` |
| media | 4px | `--radius-media` |
| control | 8px | `--radius-control` |
| popover | 12px | `--radius-popover` |
| selector | 20px | `--radius-selector` |
| composer | 24px | `--radius-composer` |
| pill | 100px | `--radius-pill` |

### Shadows

| Name | Value | Token |
|------|-------|-------|
| Composer inset | `rgba(255,255,255,0.08) 0 0 10px 0 inset` | `--shadow-composer-inset` |
| Selector inset | `rgba(255,255,255,0.08) 0 0 6px 0 inset` | `--shadow-selector-inset` |
| Pill refraction | `rgba(255,255,255,0.133) 0 0 2px 1px inset, rgba(255,255,255,0.067) 0 0 8px 2px inset, rgba(255,255,255,0.05) 0 2px 12px 0 inset, rgba(255,255,255,0.03) 0 4px 20px 0 inset` | `--shadow-pill-refraction` |
| Popover | `rgba(0,0,0,0.08) 0 6px 16px 0, rgba(0,0,0,0.12) 0 3px 6px -4px, rgba(0,0,0,0.05) 0 9px 28px 8px` | `--shadow-popover` |

### Layout

- **Desktop side rail:** 83px rendered width; main content begins at 88-100px.
- **Hero stage:** one viewport high with the media, title, composer, capability pills, and start of gallery visible together.
- **Desktop composer:** 940px x 145px outer boundary at both 1952px and 1366px viewport widths.
- **Composer inner padding:** 8px outer padding, 12px gap between selector and prompt body.
- **Capability gap:** approximately 10px; each pill is 44px high with 12px 20px content padding.
- **Gallery:** full available width with 4px visual gaps, mixed aspect ratios, and 2-4px media radii.
- **Observed vertical anchors at 1098px height:** title y=164px, composer y=324px, capability row y=512px, gallery y=703px.

## Components

### Full-Bleed Media Stage
**Role:** Emotional and product-relevant hero canvas.

Use a real generated image or video at `object-fit: cover` across the full first viewport. Add `--gradient-header-fade` for top controls and a local dark fade where text or the side rail needs contrast. Do not blur the primary media globally. The next gallery must remain visible at the lower edge so the first screen feels like an active product, not a landing-page poster.

### Vertical Side Rail
**Role:** Persistent primary navigation.

Rendered desktop width is 83px with 12px horizontal inset. Each item is 58px wide and 46-52px high, uses an icon above a 10px/12px label, 6px internal padding, and an 8px radius. Default text and icons use `--color-ink-secondary`. Selected state uses `--color-surface-active`, `--gradient-nav-edge`, white content, and a 300ms transition. Hover increases icon/text contrast toward `--color-ink`; active/pressed reduces background opacity slightly. Keyboard focus must add a visible 2px `--color-focus-blue` ring even though the captured page does not expose a strong focus ring.

### Refractive Composer
**Role:** Primary creation entry.

Use a 24px radius, 940px desktop maximum width, 145px total height, 8px outer padding, `--gradient-glass-tint`, directional `--gradient-glass-edge`, SVG displacement-map refraction, `backdrop-filter: blur(2px) saturate(1.15)`, and `--shadow-composer-inset`. The prompt area uses 14px/28px text. Controls are quiet pills using 4-8% white fills. Focus does not add a second rectangular outline; it activates a local cyan/violet/blue lower-edge aura. In Nebulens, retain an accessible `focus-visible` ring around the existing beUI composer in addition to the visual aura.

### Primary Selector
**Role:** Switch creation modes inside the composer.

Use a 40px-wide vertical selector, 128px high, 20px radius, `rgba(255,255,255,0.10)` fill, `backdrop-filter: blur(15px)`, and `--shadow-selector-inset`. Each icon target must remain at least 40px tall. Selected mode uses white; unselected modes use `--color-ink-muted`.

### Capability Pill
**Role:** Fast route into a creation workflow.

Use 44px height, 100px radius, 12px 20px padding, 16px type, `--gradient-glass-tint`, directional edge gradient, `backdrop-filter: blur(2px) saturate(1.15)`, and `--shadow-pill-refraction`. Hover raises the tint from 56-64% black to approximately 68% and increases the white edge. Active scales to 0.98 for 120ms. Focus-visible adds a 2px blue ring with 2px offset.

### Submit Button
**Role:** Execute the current generation.

Use a 64px x 40px pill with `rgba(255,255,255,0.20)` fill. Disabled uses 8% fill and 45% content opacity. Hover uses 28% fill; active uses 18% fill and scale(0.97). Product brand color may replace the white fill only when the prompt is valid.

### Top Account Cluster
**Role:** Membership, credits, notification, and profile actions.

Place at the top-right over `--gradient-header-fade`. Icon targets are 36-40px. Membership uses a 35px-high transparent pill, `--color-hairline`, 100px radius, and `backdrop-filter: blur(10px)`. Keep login/profile and credits visually distinct; do not wrap the entire cluster in one heavy card.

### Masonry Media Card
**Role:** Discovery feed item.

Use the source aspect ratio, 2-4px radius, 4px gutter, and no external card background or drop shadow. Metadata sits in a 52px bottom fade from transparent to `rgba(0,0,0,0.30)`. Hover reveals play, author, like, and reuse actions without shifting image dimensions. Focus-visible draws an inset 2px white boundary.

### Floating Popover
**Role:** Small reminders, menus, and status prompts.

Use `rgba(38,38,44,0.60)`, 12px radius, `backdrop-filter: blur(20px)`, and `--shadow-popover`. Keep copy to one line when possible and use a 32px action button with an 8px radius.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Canvas | `#0d0d0e` | Fallback behind all media and pages |
| 1 | Media | full-bleed image/video | Primary emotional and informational surface |
| 2 | Quiet control | `rgba(255,255,255,0.04-0.10)` | Parameters and secondary controls |
| 3 | Refractive glass | `rgba(19,19,20,0.56-0.64)` + blur/refraction | Composer, navigation active state, and capability pills |
| 4 | Floating status | `rgba(38,38,44,0.60-0.80)` + blur | Popovers, selected navigation, and reminders |

## Do's and Don'ts

### Do
- Use `--color-canvas` only as a fallback; let actual generated media carry most first-screen color.
- Keep the 83px desktop rail independent from the centered 940px composer so navigation never changes the composer width.
- Use `--gradient-glass-tint`, 2px blur, and inset highlights together; glass must reveal media rather than become an opaque gray card.
- Keep the desktop composer at 128-145px total height with prompt and parameters in one continuous surface.
- Use `--radius-composer` only for the large composer and `--radius-control` for navigation and account controls.
- Keep `--color-focus-cyan`, `--color-focus-blue`, and `--color-focus-violet` below 5% of the screen area and reserve them for focus/brand energy.
- Let the gallery enter within the first viewport and use 4px gutters so the discovery route reads as an active feed.
- Adapt the 83px rail into a mobile drawer below 860px; preserve access without preserving desktop geometry.

### Don't
- Do not cover the media stage with an opaque black content panel; use local fades and refractive glass.
- Do not use `--color-focus-violet` as a page background or turn the interface into a purple theme.
- Do not place the composer inside another card or add a second visible border around its 24px boundary.
- Do not use 24px radius on gallery images; the observed media tiles use 2-4px corners.
- Do not use the 54px serif display style inside the generation workspace, navigation, or account controls.
- Do not copy the source's narrow-screen clipping: the observed 940px composer remained fixed at 390px and was visually cropped.
- Do not hide keyboard focus because the source focus treatment is subtle; add a semantic focus-visible ring in production.
- Do not reproduce Wanxiang logos, copy, avatars, media, or membership gradients as Nebulens brand assets.

## Imagery

Generated imagery is the page's primary color and texture system. The first viewport uses one real, inspectable image or video rather than an abstract decorative background. The feed mixes landscape, portrait, and square work in a dense masonry composition with minimal framing. Media remains sharp and readable; only local fades are allowed under metadata or interface controls. Avoid stock photography, global blur, dark overlays that conceal the subject, and uniform card crops that erase the output's native ratio.

## Layout

Desktop composition uses a fixed 83px side rail and a full remaining media stage. The title, supporting copy, 940px composer, and capability pills align to the center of the post-rail canvas rather than the full viewport. The gallery begins around 64% of viewport height and continues within the same scroll surface, creating a seamless transition from creation to discovery. At 1366px the composer remains 940px, leaving about 170px breathing room on either side of the main canvas. For implementation, switch to a drawer or compact header below 860px and make the composer `width: min(940px, calc(100vw - 32px))`; the captured source does not do this reliably and should not be copied verbatim.

## Agent Prompt Guide

1. Create a media-first discovery hero using `#0d0d0e`, a full-bleed generated video, a centered 54px/64px Noto Serif SC title, and a 940px x 145px refractive composer with 24px radius and `rgba(19,19,20,0.56-0.64)` tint.
2. Create a desktop creator rail 83px wide with 58px x 46px navigation items, 10px/12px labels, 8px radius, `rgba(255,255,255,0.80)` default content, and `rgba(38,38,44,0.80)` selected state with the measured directional edge gradient.
3. Create a discovery masonry feed with 4px gutters, 2-4px image radii, native aspect ratios, no card shadows, and a 52px transparent-to-`rgba(0,0,0,0.30)` metadata fade.

## Similar Brands

- **Krea** - Media-first generation surfaces and compact creation controls.
- **Midjourney Explore** - Dense visual discovery feed with minimal card chrome.
- **Runway** - Dark creator tooling that lets media supply color.
- **ChatGPT Images** - Quiet prompt-led generation flow and low-interference controls.
- **Nebulens** - Existing dark AI image studio that can adopt the media-stage and refractive-glass hierarchy without copying Wanxiang branding.

## Quick Start

### CSS Custom Properties

```css
:root {
  --color-canvas: #0d0d0e;
  --color-surface: #17171b;
  --color-surface-active: rgba(38, 38, 44, 0.80);
  --color-glass-center: rgba(19, 19, 20, 0.64);
  --color-glass-edge: rgba(19, 19, 20, 0.56);
  --color-control-quiet: rgba(255, 255, 255, 0.04);
  --color-control-hover: rgba(255, 255, 255, 0.08);
  --color-control-strong: rgba(255, 255, 255, 0.20);
  --color-ink: #fafafc;
  --color-ink-secondary: rgba(255, 255, 255, 0.80);
  --color-ink-muted: rgba(255, 255, 255, 0.50);
  --color-hairline: rgba(255, 255, 255, 0.10);
  --color-focus-cyan: #00f8f1;
  --color-focus-blue: #6691ff;
  --color-focus-violet: #a900ff;

  --gradient-glass-tint: radial-gradient(50% 50%, rgba(19,19,20,0.64) 0%, rgba(19,19,20,0.56) 100%);
  --gradient-glass-edge: linear-gradient(337deg, rgba(255,255,255,0.30) 5%, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04) 70%, rgba(255,255,255,0.30) 95%);
  --gradient-nav-edge: linear-gradient(335deg, rgba(255,255,255,0.15) 5%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.03) 59%, rgba(255,255,255,0.15) 95%);

  --font-display: "Noto Serif SC", "Source Han Serif SC", serif;
  --font-interface: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Inter, sans-serif;
  --text-display: 54px;
  --leading-display: 64px;
  --text-composer: 14px;
  --leading-composer: 28px;
  --text-navigation: 10px;
  --leading-navigation: 12px;

  --spacing-4: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-20: 20px;
  --spacing-24: 24px;
  --spacing-40: 40px;
  --spacing-64: 64px;
  --spacing-88: 88px;

  --radius-media: 4px;
  --radius-control: 8px;
  --radius-popover: 12px;
  --radius-selector: 20px;
  --radius-composer: 24px;
  --radius-pill: 100px;

  --shadow-composer-inset: rgba(255,255,255,0.08) 0 0 10px 0 inset;
  --shadow-pill-refraction: rgba(255,255,255,0.133) 0 0 2px 1px inset, rgba(255,255,255,0.067) 0 0 8px 2px inset, rgba(255,255,255,0.05) 0 2px 12px 0 inset, rgba(255,255,255,0.03) 0 4px 20px 0 inset;
}
```

### Tailwind v4

```css
@theme {
  --color-canvas: #0d0d0e;
  --color-surface: #17171b;
  --color-ink: #fafafc;
  --color-focus-cyan: #00f8f1;
  --color-focus-blue: #6691ff;
  --color-focus-violet: #a900ff;
  --font-display: "Noto Serif SC", "Source Han Serif SC", serif;
  --font-interface: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", Inter, sans-serif;
  --radius-control: 8px;
  --radius-composer: 24px;
  --radius-pill: 100px;
}
```
