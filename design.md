---
version: "1.0"
name: Nebulens
description: Design system and brand-surface specification for the Nebulens AI image creation workstation.
language: zh-CN
theme: warm-light-workstation
token_source: frontend/src/styles/tokens.css
product_source: PRODUCT.md
navigation_source: frontend/src/components/common/AppHeader.vue
---

# Nebulens Design System

## Overview

Nebulens is a calm, precise, premium workstation for generating, reviewing, reusing, and locally archiving AI images. Its visual language is minimal and editorial: warm near-white canvases, exact typography, quiet borders, tactile controls, restrained coral accents, and generous working space.

This document describes the implemented design system. `frontend/src/styles/tokens.css` remains the single source of truth for token values; use its CSS custom properties directly instead of copying values into component styles. The full-screen video hero at the end of this document is an optional public brand surface and an intentional exception to the authenticated warm-light workstation shell.

## Product Principles

1. Lead with spacious clarity while keeping creation controls close to hand.
2. Prefer hierarchy, proportion, and tactile surfaces over decoration.
3. Treat image history as part of the creative loop, not a separate database.
4. Keep visible copy concise and in Simplified Chinese by default.
5. Preserve familiar controls and predictable navigation even when the composition is editorial.
6. Use motion to explain state changes; never make the workstation compete with the artwork.

## Language and Voice

- The default interface language is Simplified Chinese (`zh-CN`). This includes navigation, labels, buttons, helper text, validation, errors, toasts, `aria-label`s, image `alt` text, and metadata.
- Keep the product name `Nebulens`, model names such as `gpt-image-2`, route paths, API fields, file formats, and established technical terms in English where translation would reduce clarity.
- Write short, direct action labels such as `开始创作`, `生成图片`, `下载图片`, and `删除记录`.
- State errors as what happened plus the next action: `生成失败，请稍后重试。`
- Avoid hype, unexplained jargon, and borrowed product language.

## Token Contract

### Color and Surfaces

Use semantic variables rather than raw colors. The current key values are listed for reference; implementation must consume the variable names.

| Role                | Token                          | Current value                     |
| ------------------- | ------------------------------ | --------------------------------- |
| Primary canvas      | `--color-canvas`               | `oklch(97.4% 0.006 82deg)`        |
| Clean canvas        | `--color-canvas-clean`         | `oklch(99.1% 0.004 88deg)`        |
| Soft canvas         | `--color-canvas-soft`          | `oklch(98.7% 0.006 86deg)`        |
| Warm canvas         | `--color-canvas-warm`          | `oklch(94.8% 0.018 82deg)`        |
| Base surface        | `--color-surface`              | `oklch(99.2% 0.005 86deg)`        |
| Sidebar surface     | `--color-surface-sidebar`      | `oklch(99% 0.004 88deg / 0.72)`   |
| Glass surface       | `--color-surface-glass`        | `oklch(98.8% 0.006 86deg / 0.72)` |
| Strong glass        | `--color-surface-glass-strong` | `oklch(98.9% 0.006 86deg / 0.9)`  |
| Dark surface        | `--color-surface-dark`         | `oklch(18.6% 0.009 76deg)`        |
| Inspection backdrop | `--color-inspection-backdrop`  | `oklch(9% 0.01 276deg / 0.84)`    |
| Primary ink         | `--color-ink`                  | `oklch(22% 0.012 78deg)`          |
| Body text           | `--color-body`                 | `oklch(31% 0.012 78deg)`          |
| Muted text          | `--color-muted`                | `oklch(58% 0.012 78deg)`          |
| Text on dark        | `--color-on-dark`              | `oklch(98.4% 0.005 88deg)`        |
| Quiet text on dark  | `--color-on-dark-muted`        | `oklch(78% 0.006 88deg)`          |
| Primary action      | `--color-primary`              | `oklch(18.6% 0.009 76deg)`        |
| Coral accent        | `--color-accent`               | `oklch(66% 0.1 42deg)`            |
| Coral hover         | `--color-accent-hover`         | `oklch(60% 0.1 42deg)`            |
| Success             | `--color-success`              | `oklch(72% 0.11 138deg)`          |
| Warning             | `--color-warning`              | `oklch(72% 0.14 82deg)`           |
| Error               | `--color-error`                | `oklch(55% 0.17 28deg)`           |
| Hairline            | `--color-hairline`             | `oklch(24% 0.012 78deg / 0.1)`    |
| Focus ring          | `--color-focus`                | `oklch(78% 0.13 57deg / 0.78)`    |

Warm neutral surfaces carry the product. Coral is a directional accent for the primary creation path, active inspection controls, and focus support; it is not a decorative wash. Teal and amber are secondary semantic accents, not competing brand colors. State must never be communicated by color alone.

### Typography

| Role                    | Token                       | Stack or size                                                                              |
| ----------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| Display and UI          | `--font-display`            | `'Geist', 'Noto Serif SC', 'LXGW WenKai Screen', system-ui, sans-serif`                    |
| Editorial serif         | `--font-serif`              | `'Instrument Serif', 'Noto Serif SC', Georgia, 'Songti SC', serif`                         |
| Brand                   | `--font-brand`              | Same stack as `--font-display`                                                             |
| Body                    | `--font-body`               | Same stack as `--font-display`                                                             |
| Code and technical data | `--font-code`               | `'Söhne Mono', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |
| Caption                 | `--text-caption-size`       | `12px`                                                                                     |
| Label                   | `--text-label-size`         | `13px`                                                                                     |
| Small body              | `--text-body-sm-size`       | `14px`                                                                                     |
| Body                    | `--text-body-size`          | `16px`                                                                                     |
| Card title              | `--text-card-title-size`    | `18px`                                                                                     |
| Section title           | `--text-section-title-size` | `clamp(22px, 2vw, 28px)`                                                                   |
| Page title              | `--text-page-title-size`    | `clamp(30px, 3.2vw, 44px)`                                                                 |
| Hero title              | `--text-hero-title-size`    | `clamp(42px, 6.4vw, 80px)`                                                                 |

Use `--font-display` for controls, navigation, and direct product copy. Use `--font-serif` sparingly for editorial emphasis, never for dense forms or status data. Use `--font-code` only where the content is genuinely technical. Default label and title weights are `--font-weight-label: 700` and `--font-weight-title: 700`. Keep letter spacing at `0`; hierarchy should come from size, weight, line height, and spacing.

### Spacing

The spacing scale is based on 4px and should be used without local substitutes:

| Token             | Value  |
| ----------------- | ------ |
| `--space-xxs`     | `4px`  |
| `--space-xs`      | `8px`  |
| `--space-sm`      | `12px` |
| `--space-md`      | `16px` |
| `--space-lg`      | `24px` |
| `--space-xl`      | `32px` |
| `--space-xxl`     | `48px` |
| `--space-section` | `96px` |

Use 8-12px inside compact groups, 16-24px between related groups, 32-48px between major blocks, and 96px only for true section separation. Preserve whitespace around artwork and avoid card-heavy page composition.

### Radii and Shape

| Token           | Value    | Use                                          |
| --------------- | -------- | -------------------------------------------- |
| `--radius-xs`   | `4px`    | Tiny indicators and compact internal details |
| `--radius-sm`   | `12px`   | Fields, buttons, and images                  |
| `--radius-md`   | `18px`   | Navigation states and medium surfaces        |
| `--radius-lg`   | `24px`   | Panels and shell surfaces                    |
| `--radius-xl`   | `28px`   | Popups and prominent composer-like surfaces  |
| `--radius-pill` | `9999px` | Pills and badges only                        |

Use `--radius-panel`, `--radius-popup`, `--radius-image`, and `--radius-image-lg` aliases for their intended component roles. Do not mix multiple radius families inside one compact control group.

### Shadows and Elevation

| Token               | Current value                               |
| ------------------- | ------------------------------------------- |
| `--shadow-soft`     | `0 8px 24px oklch(24% 0.012 78deg / 0.06)`  |
| `--shadow-surface`  | `0 12px 34px oklch(24% 0.012 78deg / 0.07)` |
| `--shadow-composer` | `0 18px 60px oklch(24% 0.012 78deg / 0.08)` |
| `--shadow-button`   | `0 14px 28px oklch(0% 0 0deg / 0.16)`       |

Establish hierarchy with surface tone and hairline borders first. Reserve shadows for the persistent shell, composer, or a clearly raised action. Dialogs, menus, popovers, preview surfaces, and popup-contained images use warm surfaces, a subtle border, and `box-shadow: none`; avoid decorative glass blur in those surfaces.

### Layout

| Token                    | Value    | Contract                              |
| ------------------------ | -------- | ------------------------------------- |
| `--app-sidebar-width`    | `86px`   | Authenticated desktop navigation rail |
| `--sidebar-width`        | `280px`  | Wider secondary-panel allowance       |
| `--composer-height`      | `188px`  | Stable composer reservation           |
| `--container-width`      | `1200px` | Main maximum container                |
| `--content-width`        | `1200px` | Standard content width                |
| `--content-width-narrow` | `960px`  | Focused reading or form width         |
| `--breakpoint-mobile`    | `860px`  | Primary layout breakpoint             |

Use constrained containers with responsive side padding. Fixed-format elements such as image grids, toolbars, controls, and preview frames need stable tracks, explicit minimums, or aspect ratios so loading and hover states do not shift the page.

## Core Components

### Buttons

- Primary: `--button-primary-bg`, `--button-primary-bg-hover`, and `--button-primary-fg` for the single dominant command.
- Secondary: `--button-secondary-bg`, `--button-secondary-bg-hover`, and `--button-secondary-fg` for supporting actions.
- Ghost: `--button-ghost-bg`, `--button-ghost-bg-hover`, and `--button-ghost-fg` for low-emphasis tools.
- Danger: `--button-danger-fg` with `--button-danger-bg-hover`; destructive intent must also be explicit in the label.
- Standard heights are `--control-height-sm: 34px`, `--control-height-md: 40px`, and `--control-height-lg: 44px`; mobile touch targets must be at least 44px.
- Use an icon-only button when a familiar symbol is clearer than text. Give every icon-only control a Simplified Chinese accessible name and a tooltip when the meaning is not universal.

### Fields and Composer

Fields use `--field-background`, `--field-foreground`, `--field-placeholder`, and `--field-border`. Hover uses `--field-background-hover` and `--field-border-hover`; focus uses `--field-border-focus` plus `--field-focus-ring`. The standard field radius is `--field-radius`.

The image composer is a product-defining surface. Keep prompt entry, reference-image controls, generation settings, and the primary action visually connected. Avoid nested cards, oversized helper copy, or controls that move when labels and loading states change.

### Panels, Cards, and Popups

- Use cards only for repeated items, modals, and genuinely framed tools. Page sections remain unframed within the content container.
- Do not nest cards inside cards.
- Artwork is the visual subject; surrounding chrome stays quiet and must not crop an image when inspection is the task.
- Popup surfaces follow the composer vocabulary: warm off-white, one hairline border, generous radius, no shadow, and no ornamental blur.
- Custom modals require `role="dialog"`, `aria-modal="true"`, an accessible title, Escape handling, backdrop close, initial focus, and a labeled close button.

### Authenticated Navigation

The workstation shell uses the existing `AppHeader.vue` navigation model:

- Desktop: a fixed 86px rail with the Nebulens mark and `发现`, `生图`, and `资产`; administrators also see `用户管理`.
- Mobile: the rail becomes a stable 68px bottom navigation bar, with safe-area offsets and compact labels.
- The brand asset is `/brand/logo.png`, rendered at 42px on desktop and 32px on mobile.
- Login and account actions stay at the end of the navigation flow. Active state, hover, and focus each need a distinct visible treatment.

## Motion

Motion should clarify entry, completion, selection, or spatial change. Keep interaction transitions short and quiet. Do not add looping decorative animation to the workstation. Respect `prefers-reduced-motion` by removing nonessential transforms, parallax, and auto-advancing effects.

## Accessibility

- Meet WCAG AA contrast for body text and controls.
- Show a visible `:focus-visible` treatment for every interactive element.
- Pair semantic color with an icon, label, or status text.
- Use semantic landmarks and heading order; never simulate buttons with generic elements.
- Associate every field with a visible Simplified Chinese label or equivalent accessible name.
- Protect text and controls from image backgrounds with a reliable overlay or solid fallback.
- Verify text overflow, keyboard order, touch targets, and horizontal scrolling at desktop and mobile widths.

## Full-Screen Video Hero

### Role and Boundary

The full-screen video hero is an optional unauthenticated landing or brand-entry surface. It does not replace the authenticated workstation shell, its warm-light tokens, or `AppHeader.vue`. The cinematic black treatment and gradient headline are deliberate, page-scoped exceptions; they must not spread into generation, history, account, or admin views.

Use the existing `--font-display` stack throughout this surface. Do not add the source brief's General Sans or another hero-only webfont; the 14px subtitle intentionally uses `--text-body-sm-size` instead of the source's 15px value so the hero remains on the Nebulens type scale.

### Required Copy

All visible copy is Simplified Chinese except the `Nebulens` brand name.

| Element          | Copy                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Brand            | `Nebulens`                                                                               |
| Navigation       | `发现`, `生图`, `资产`                                                                   |
| Navbar CTA       | `进入工作台`                                                                             |
| Badge muted text | `全新创作体验已于`                                                                       |
| Badge emphasis   | `2026 年 5 月 1 日开放`                                                                  |
| Heading          | `Nebulens，让灵感抵达画面`                                                               |
| Subtitle         | `将提示词和参考图转化为成组作品，在一个安静、精确的工作台中完成生成、回看、复用与归档。` |
| Primary CTA      | `开始创作`                                                                               |

Both CTAs lead to `/generate`. If authentication is required, preserve the destination and open the existing login flow rather than introducing a separate waitlist interaction.

### Media and Layering

The hero fills the viewport with a pure black (`#000000`) fallback and a full-bleed looping background video:

`https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4`

- Root: `position: relative`, `isolation: isolate`, `min-height: 100svh`, and `min-height: 100dvh` where supported; clip overflow.
- Video: absolute inset `0`, width and height `100%`, `object-fit: cover`, `muted`, `autoplay`, `loop`, and `playsInline`. It is decorative and must be hidden from assistive technology.
- Overlay: absolute inset `0`, black at 50% opacity (`rgb(0 0 0 / 0.5)`). The overlay always remains between video and content.
- Content layer: navbar and hero content sit above both media layers with an explicit `z-index`.
- Do not blur, dark-crop, or otherwise obscure the video beyond the required overlay.

### Navbar

- Position the navbar across the top with 120px horizontal and 20px vertical padding on desktop.
- The left side uses the real `/brand/logo.png` mark with the `Nebulens` wordmark in white. Keep the lockup within the source composition's approximately 187px by 25px footprint.
- Place the direct links `发现`, `生图`, and `资产` after the wordmark with 30px gaps. Links use `--font-display`, 14px, weight 500, and white.
- Do not show a dropdown chevron on a direct route. A 14px white chevron may appear with a 14px label gap only when the item actually opens a menu and exposes the correct expanded state.
- Hide the link group at and below `--breakpoint-mobile`; retain the brand and navbar CTA.
- The right CTA is a layered pill: a fully rounded outer shell with a `0.6px` white border, containing a black inner pill with centered white 14px medium text and 29px horizontal by 11px vertical padding.
- Add a restrained top-edge light streak inside the outer pill using a blurred white-to-transparent gradient. It must not enlarge the control, obscure the label, or replace the visible focus ring.

### Content Stack

Center the content horizontally and vertically within the space below the navbar. Preserve approximately 280px top padding and 102px bottom padding on desktop; use approximately 200px top padding on mobile. If a short viewport cannot fit those values, reduce the padding before allowing content to overflow.

- Stack the badge, headline group, and CTA with 40px gaps.
- Keep the heading and subtitle in one group with a 24px internal gap.
- Constrain all copy with responsive inline padding so no text touches the viewport edge.

### Badge

- Use a pill with a 20px radius, 10% white background, and a 1px white border at 20% opacity.
- Place a 4px white dot before the copy.
- Render `全新创作体验已于` at 60% white and `2026 年 5 月 1 日开放` in solid white.
- Use `--font-display`, `--text-label-size` (13px), and weight 500.
- Keep the entire badge as one readable phrase for assistive technology; the dot is decorative.

### Heading and Subtitle

- Heading: one `h1`, maximum width 613px, 56px on desktop and 36px on mobile, weight 500, line-height `1.28`, letter spacing `0`.
- Apply the source visual treatment only here: `linear-gradient(144.5deg, #ffffff 28%, rgb(0 0 0 / 0) 115%)` clipped to the text. Declare solid white text first as fallback and disable clipping in forced-colors mode.
- Subtitle: maximum width 680px, centered, `--font-display`, `--text-body-sm-size` (14px), normal weight, readable line height, and white at 70% opacity.
- Confirm the gradient headline and subtitle still meet readable contrast over representative video frames; strengthen the overlay if a frame fails rather than adding a text shadow.

### Primary CTA

The main `开始创作` CTA repeats the layered navbar construction with reversed inner colors:

- Outer shell: fully rounded, `0.6px` solid white border, position context for the glow.
- Inner pill: white background, black 14px medium label, 29px horizontal by 11px vertical padding.
- Top edge: the same subtle blurred white-to-transparent light streak.
- Maintain a minimum 44px touch target and a visible `--color-focus-dark` focus ring.
- The glow is decorative, ignores pointer events, and is removed under reduced motion or increased-contrast preferences if it impairs clarity.

### Responsive Behavior

- At and below 860px, hide desktop navigation links, reduce navbar side padding to 24px, use the 36px heading, and use approximately 200px content top padding.
- At narrow phone widths, reduce side padding to 16px, keep both brand and CTA legible, and allow the badge copy to wrap without clipping.
- Use `max-width`, stable control heights, and `box-sizing: border-box` so the navbar and content never create horizontal overflow.
- On short landscape screens, prioritize a complete heading, CTA, and safe-area spacing over the nominal 280px/200px top padding.

### Accessibility and Fallbacks

- The video has no controls, audio, caption obligation, or accessible name because it is decorative. Meaning must live entirely in text and controls.
- When `prefers-reduced-motion: reduce` is active, pause or omit autoplay and show a representative poster frame or the pure-black fallback.
- If the video fails, stalls, data saving is active, or autoplay is blocked, keep the black fallback, overlay, navigation, copy, and CTAs fully functional. Never show a broken-media icon.
- Use a descriptive `alt` for the Nebulens mark or hide the image when adjacent visible wordmark text already names the brand.
- Preserve logical focus order: brand, navigation, navbar CTA, primary CTA.
- Validate keyboard access, focus visibility, mobile safe areas, text contrast across video frames, and no horizontal overflow.

## Do and Do Not

- Do use the CSS custom properties in `tokens.css` as the implementation contract.
- Do keep artwork, prompt controls, and history visually connected.
- Do make the Nebulens brand and the next creation action immediately clear.
- Do preserve warm neutral restraint inside the workstation.
- Do not reintroduce source-brand, unrelated product, or placeholder copy.
- Do not use neon science-fiction styling, repeated gradients, decorative orbs, heavy glassmorphism, or nested cards.
- Do not turn operational screens into landing pages.
- Do not use the video hero's black palette or gradient headline as a default application theme.
