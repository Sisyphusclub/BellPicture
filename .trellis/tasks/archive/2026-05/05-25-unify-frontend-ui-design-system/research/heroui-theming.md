# Research: HeroUI/NextUI theming conventions for transferable Vue CSS tokens

- **Query**: Research HeroUI/NextUI theming conventions for a product UI design system and persist findings to `C:/Users/Administrator/Desktop/Ref2Image_Studio/.trellis/tasks/05-25-unify-frontend-ui-design-system/research/heroui-theming.md`. Context: Ref2Image_Studio is a Vue 3 app, not React, so only capture transferable ideas: semantic CSS variables, OKLCH color roles, spacing/radius/shadow tokens, typography roles, component states, and how to map them to existing custom CSS. Use official HeroUI docs and the GitHub repo if useful. Do not modify code outside this research file.
- **Scope**: mixed: external HeroUI official docs/GitHub source plus internal Ref2Image_Studio CSS/spec scan
- **Date**: 2026-05-26

## Findings

### Files Found

| File Path | Description |
|---|---|
| `frontend/src/styles/tokens.css` | Project-wide Vue CSS variables for warm canvas/surfaces, text, hairlines, brand accents, fonts, radii, shadows, spacing, and layout. |
| `frontend/src/styles/base.css` | Global base styles and reusable classes (`.display-heading`, `.section-kicker`, `.claude-button`, `.text-field`, `.textarea-field`, `.select-field`, `.meta-list`). |
| `frontend/src/App.vue` | App shell uses `--color-canvas-clean` as backdrop/base canvas and a gradient over video. |
| `frontend/src/components/common/AppHeader.vue` | Sidebar navigation uses custom CSS, hover/active states, blur/glass surface, local radii/shadows, and project color tokens. |
| `.trellis/spec/frontend/index.md` | Frontend stack snapshot: Vue 3.5, Vite 5, strict TypeScript, Hybrid Claude UI, custom product surfaces plus Element Plus utilities. |
| `.trellis/spec/frontend/component-guidelines.md` | Product UI convention: custom SFCs/CSS tokens own product-defining surfaces; Element Plus is utility-only. Also records popup surface visual rules. |

### External References

- [HeroUI v3 docs index (`llms.txt`)](https://www.heroui.com/llms.txt) — Official documentation index says HeroUI v3 is a React/React Native component library built on Tailwind CSS v4 and React Aria; transferable material is therefore styling/token architecture, not framework APIs.
- [HeroUI React colors docs](https://www.heroui.com/en/docs/react/getting-started/colors) — Describes the color system as semantic-intent based, with small meaningful roles rather than large raw palettes, and derived color behavior for contrast, hierarchy, and theming.
- [HeroUI `variables.css` source](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/themes/default/variables.css) — Source of default theme variables, including OKLCH primitives, semantic colors, spacing, border/radius, focus, disabled opacity, field tokens, soft/hover derived tokens, and light/dark selectors.
- [HeroUI Button docs](https://www.heroui.com/en/docs/react/components/button) and [`button.css`](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/button.css) — Shows component style decomposition into base, size variants, color variants, and interaction states such as focus-visible, disabled, pending/loading, pressed, and hovered.
- [HeroUI Typography docs](https://www.heroui.com/en/docs/react/components/typography) and [`typography.css`](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/typography.css) — Shows semantic typography roles (`h1`-`h6`, body sizes, code), color roles (`default`, `muted`), alignment, truncation, and weight variants.
- [HeroUI styling migration guide](https://www.heroui.com/en/docs/react/migration/styling) — Documents v3 styling architecture changes: semantic color overhaul, `primary` -> `accent`, removal of numbered/content color scales, and migration from content colors to `surface`/`overlay` roles.
- [HeroUI theme builder source: `generate-css-variables.ts`](https://github.com/heroui-inc/heroui/blob/v3/apps/docs/src/app/%5Blang%5D/themes/utils/generate-css-variables.ts) — Shows that exported customization focuses on authored/base variables while derived variables stay in the default stylesheet.
- [HeroUI theme builder source: `generate-theme-colors.ts`](https://github.com/heroui-inc/heroui/blob/v3/apps/docs/src/app/%5Blang%5D/themes/utils/generate-theme-colors.ts) — Shows OKLCH generation utilities and automatic foreground calculation based on perceptual lightness.

### HeroUI / NextUI theming conventions that transfer to Vue CSS

#### 1. Semantic variables over raw palettes

HeroUI v3's color docs explicitly frame the system around semantic intent: the system avoids exposing large raw palettes, defines a small set of roles, and derives related values automatically from limited base colors. The transferable convention is to treat tokens as UI roles, not color names.

Official roles visible in `packages/styles/themes/default/variables.css` include:

| HeroUI role | Purpose in HeroUI source/docs | Existing Ref2Image equivalent |
|---|---|---|
| `--background`, `--foreground` | Base canvas and primary readable foreground. | `--color-canvas-clean`, `--color-canvas`, `--color-ink`, `--color-body` in `frontend/src/styles/tokens.css:6-25`. |
| `--surface`, `--surface-secondary`, `--surface-tertiary` | Non-overlay containers such as cards, accordions, disclosure groups. | `--color-surface-card`, `--color-surface-card-solid`, `--color-surface-soft`, `--color-surface-cream-strong` in `frontend/src/styles/tokens.css:10-15`. |
| `--overlay`, `--overlay-foreground` | Floating/overlay components such as tooltips, popovers, modals, menus. | Popup convention in `.trellis/spec/frontend/component-guidelines.md:299-339`; current examples use `oklch(99.1% 0.004 88deg / 0.96)` and `--color-hairline`. |
| `--muted` | Secondary readable foreground. | `--color-muted`, `--color-muted-soft` in `frontend/src/styles/tokens.css:24-25`. |
| `--accent`, `--accent-foreground` | Primary brand/emphasis role. | `--color-accent`, `--color-accent-active`; project CTAs also use `--color-primary` and `--color-on-primary` in `frontend/src/styles/tokens.css:35-39`. |
| `--default`, `--default-foreground` | Neutral/default control color. | Neutral button/field surfaces: `--color-surface-glass-strong`, `--color-surface-card-solid`, `--color-hairline` in `frontend/src/styles/base.css:117-124` and `135-157`. |
| `--success`, `--warning`, `--danger` | Semantic feedback/status colors. | `--color-success`, `--color-warning`, `--color-error` in `frontend/src/styles/tokens.css:42-44`. |
| `--field-background`, `--field-foreground`, `--field-placeholder`, `--field-border` | Dedicated field/control tokens separate from generic surfaces. | `.text-field`, `.textarea-field`, `.select-field` in `frontend/src/styles/base.css:135-157` use `--color-surface-card-solid`, `--color-ink`, `--color-hairline`, and `--color-accent-active`. |
| `--border`, `--separator`, `--focus` | Low-contrast lines and focus indication. | `--color-hairline`, `--color-hairline-soft`, and focus styles in `frontend/src/styles/base.css:152-157`; additional focus-visible rings appear in views such as `frontend/src/views/PromptsView.vue:544-546`. |

Relevant HeroUI source details from `variables.css`: primitive colors are OKLCH (`--white`, `--black`, `--snow`, `--eclipse`); common variables include `--spacing`, border widths, `--disabled-opacity`, ring offset, cursors, `--radius`, and `--field-radius`; light theme variables include `--background`, `--foreground`, `--surface*`, `--overlay`, `--muted`, `--default`, `--accent`, field tokens, semantic status tokens, `--border`, `--separator`, `--focus`, `--link`, and `--backdrop`.

#### 2. OKLCH roles plus derived state colors

HeroUI's default theme uses OKLCH for base primitives and semantic colors, then derives state tokens with `color-mix(...)` rather than manually hand-picking every hover/soft shade. Examples from HeroUI source/docs:

- `--accent: oklch(0.6204 0.195 253.83)` with `--accent-foreground: var(--snow)`.
- `--success`, `--warning`, and `--danger` are separate semantic OKLCH colors with matching foreground tokens.
- Hover tokens include `--accent-hover`, `--success-hover`, `--warning-hover`, `--danger-hover` derived with `color-mix(in oklab, ...)`.
- Soft tokens include `--accent-soft`, `--danger-soft`, `--warning-soft`, and matching `*-soft-foreground`/`*-soft-hover` roles.
- Field hover/focus/border colors are isolated as `--field-hover`, `--field-focus`, `--field-border-hover`, `--field-border-focus`.

Existing project mapping:

- `frontend/src/styles/tokens.css:6-18` already uses OKLCH for warm canvas and surfaces.
- `frontend/src/styles/tokens.css:35-36` uses OKLCH for dark primary/active primary.
- `frontend/src/styles/base.css:152-157` already separates field focus border and ring behavior, though the variables are project-specific rather than HeroUI names.
- Views already use OKLCH alpha surfaces and focus outlines, for example `PromptsView.vue:481-483`, `PromptsView.vue:544-546`, `HistoryView.vue:372-374`, and `HistoryView.vue:434-439`.

#### 3. Spacing, radius, shadow, and layout tokens

HeroUI source separates common non-color variables from color variables:

- `--spacing: 0.25rem` as a scale base.
- `--border-width`, `--field-border-width`.
- `--disabled-opacity: 0.5`.
- `--ring-offset-width: 2px`.
- `--cursor-interactive`, `--cursor-disabled`.
- `--radius: 0.5rem` and `--field-radius: calc(var(--radius) * 1.5)`.

HeroUI v3.0.4 release notes also mention border-radius design tokens with `min()` capping across component CSS files, so components do not break when users set very large custom radius values.

Existing project mapping:

- Ref2Image already has a named spacing scale in `frontend/src/styles/tokens.css:71-79`: `--space-xxs` through `--space-section`.
- Ref2Image already has named radii in `frontend/src/styles/tokens.css:56-63`: `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-pill`, `--radius-full`.
- Ref2Image already has named shadows in `frontend/src/styles/tokens.css:65-69`: `--shadow-glass`, `--shadow-soft`, `--shadow-button`, `--shadow-button-soft`.
- Ref2Image popup spec intentionally suppresses shadows on popup chrome: `.trellis/spec/frontend/component-guidelines.md:301-305` says modal/dialog/popover/dropdown surfaces use warm off-white, hairline border, generous radius, and no `box-shadow`.

#### 4. Typography roles

HeroUI's Typography docs define transferable role names independent of React:

- Heading roles: `h1` through `h6`.
- Paragraph/body roles: `body`, `body-sm`, `body-xs`.
- Inline code role: `code`.
- Color roles: `default`, `muted`.
- Alignment roles: `start`, `center`, `end`, `justify`.
- Weight roles: `normal`, `medium`, `semibold`, `bold`.
- Utility role: `truncate`.

Existing project mapping:

- Ref2Image stores font stacks in `frontend/src/styles/tokens.css:48-54`: `--font-display`, `--font-serif`, `--font-brand`, `--font-body`, `--font-code`.
- Global `.display-heading` in `frontend/src/styles/base.css:51-58` maps to a display/heading role using `--font-display`, ink color, negative tracking, and tight line height.
- `.field-label` in `frontend/src/styles/base.css:127-133` maps to a label role with strong body color and semibold weight.
- `.meta-row dt/dd` in `frontend/src/styles/base.css:174-183` maps to muted label plus strong value roles.
- Current view-specific headings and labels use the same project tokens, for example `PromptsView.vue:372-384` and `HistoryView.vue:341-343`.

#### 5. Component states and variant anatomy

HeroUI's component CSS separates component styling into base styles, size variants, color/semantic variants, and state attributes. In `packages/styles/components/button.css`, the button component has:

- Base focus-visible state via `[data-focus-visible="true"]`.
- Disabled state and pending/loading state.
- Pressed state via `[data-pressed="true"]`.
- Hover state via `[data-hovered="true"]`.
- Size variants such as `.button--sm`, `.button--md`, `.button--lg`.
- Color variants that set component-local CSS custom properties, e.g. `.button--primary` assigns `--button-bg`, `--button-bg-hover`, `--button-bg-pressed`, and `--button-fg`; additional variants include secondary, tertiary, ghost/outline, danger, danger-soft, icon-only, and full-width.

Existing project mapping:

- Global `.claude-button` has base button styles and transitions in `frontend/src/styles/base.css:82-100`.
- `.claude-button:disabled` maps disabled state in `frontend/src/styles/base.css:102-105`.
- `.claude-button--primary` and hover state map primary variant in `frontend/src/styles/base.css:107-115`.
- `.claude-button--secondary` and hover state map neutral/secondary variant in `frontend/src/styles/base.css:117-124`.
- Field focus state maps to `frontend/src/styles/base.css:152-157`.
- Sidebar hover and active navigation states map to `frontend/src/components/common/AppHeader.vue:220-229`.
- Prompt category selected state maps to `frontend/src/views/PromptsView.vue:604-607`.

#### 6. Light/dark theme attachment model

HeroUI attaches theme variables to multiple selectors in `variables.css`: `:root`, `.light`, `.default`, `[data-theme="light"]`, and `[data-theme="default"]`; dark variables are similarly scoped under dark selectors. This is transferable as a CSS selector pattern even without React.

Existing Ref2Image state found in this scan: current tokens are declared once at `frontend/src/styles/tokens.css:4-87` under `:root`; no dark-mode token block was found in the scanned CSS files.

### Code Patterns

#### Current project token organization

`frontend/src/styles/tokens.css` groups tokens by role:

- Surfaces: `frontend/src/styles/tokens.css:5-18`.
- Text: `frontend/src/styles/tokens.css:20-28`.
- Lines: `frontend/src/styles/tokens.css:30-32`.
- Brand/accent/status: `frontend/src/styles/tokens.css:34-46`.
- Fonts: `frontend/src/styles/tokens.css:48-54`.
- Radii: `frontend/src/styles/tokens.css:56-63`.
- Shadows: `frontend/src/styles/tokens.css:65-69`.
- Spacing: `frontend/src/styles/tokens.css:71-79`.
- Layout: `frontend/src/styles/tokens.css:81-86`.

This already aligns structurally with HeroUI's separation of common variables, base colors, surfaces/overlays, status colors, fields, borders/separators, and derived interaction states.

#### Current reusable CSS component primitives

`frontend/src/styles/base.css` defines global reusable classes rather than framework components:

- `.display-heading` (`base.css:51-58`) for display/heading typography.
- `.section-kicker` (`base.css:60-80`) for small uppercase label/chip treatment.
- `.claude-button` and variants (`base.css:82-124`) for button base, disabled, primary, secondary, and hover states.
- `.field-label`, `.text-field`, `.textarea-field`, `.select-field` (`base.css:127-157`) for form labels and field states.
- `.meta-list`/`.meta-row` (`base.css:159-183`) for structured metadata text roles.

#### Project UI-system boundary

`.trellis/spec/frontend/component-guidelines.md:102-126` records that product-defining UI should use custom SFCs and CSS tokens from `src/styles/`, while Element Plus should stay utility-only and not become the primary source for layout, cards, CTA buttons, upload zones, galleries, or hero surfaces.

`.trellis/spec/frontend/component-guidelines.md:299-339` records the popup surface convention: warm off-white background, subtle hairline border, generous radius, no `box-shadow`, and no decorative glass blur on popup surfaces.

### Related Specs

- `.trellis/spec/frontend/index.md` — Frontend stack and convention index; confirms Vue 3.5, Vite 5, strict TypeScript, Hybrid Claude UI, custom surfaces plus Element Plus utilities.
- `.trellis/spec/frontend/component-guidelines.md` — Product UI boundary, Element Plus utility-only rule, custom token usage, Simplified Chinese UI copy, modal accessibility, and popup-surface visual convention.
- `.trellis/spec/frontend/quality-guidelines.md` — Relevant for future verification if CSS/theming changes are implemented, but not read in full for this theming research.

## Caveats / Not Found

- HeroUI/NextUI is React-oriented; no Vue-specific HeroUI implementation was used here. Findings are limited to CSS token architecture, role naming, state modeling, and source-level styling patterns.
- Official docs paths without `/en/docs/react/...` returned 404; the valid v3 docs are under `/en/docs/react/...` and the canonical docs index is `https://www.heroui.com/llms.txt`.
- The external scan used official HeroUI docs and the `heroui-inc/heroui` GitHub repository default `v3` branch. It did not inspect package versions installed in this Vue app because HeroUI is not a project dependency in the searched files.
- No code files were modified. Only this research file was written.
