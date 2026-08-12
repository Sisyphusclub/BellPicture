# Nebulens - beUI Pro Design System

> A dark-first AI image studio built from layered graphite surfaces, compact controls, and continuous morphing interactions.

**Visual source:** [beUI Pro](https://pro.beui.dev/components)<br>
**Primary references:** Agent Chat Input, Expanding Pill, Animated Dropdown, Morphic Card Modal, Morphic Tooltip, Image Gallery Vertical, Data Table, Empty States, Auth<br>
**Product:** Nebulens AI image creation workspace<br>
**Updated:** 2026-08-04

## Product Direction

Nebulens is a working image studio, not a marketing template. The interface should make it fast to describe an image, add references, tune generation settings, compare results, revisit assets, and manage accounts. Generated imagery provides most of the color. The application chrome stays quiet, responsive, and consistent with beUI Pro.

The default theme is dark, matching beUI Pro's primary presentation. Use layered near-black and graphite surfaces rather than one flat black canvas so creators can scan controls and inspect image detail without losing hierarchy. Light surfaces are reserved for inverse actions, focused media metadata, and an optional light theme. The experience should feel precise and modern, with the distinctive character coming from morphing continuity between controls, menus, cards, and detail views.

## Design Principles

1. **Start with the task.** The first meaningful surface is the prompt composer or the current asset collection, never an explanatory marketing block.
2. **Use semantic components.** Buttons, menus, tooltips, dialogs, tables, inputs, and status feedback use the shared beUI/shadcn contracts instead of page-specific replicas.
3. **Keep imagery dominant.** Product chrome is neutral; generated images carry saturation, texture, and emotional impact.
4. **Show continuity through motion.** Menus expand from triggers, cards morph into detail views, and tooltips move between nearby controls. Motion explains state rather than decorating it.
5. **Keep operational density calm.** Controls are compact but not cramped, with stable dimensions, clear groups, and progressive disclosure for secondary settings.
6. **Design both themes, ship dark first.** Every semantic token has a light counterpart, but all routes open in dark mode unless the user changes theme.

## Foundations

### Semantic Colors

Use semantic names in product code. Component implementations should not hard-code page-specific neutral values.

| Token                  | Default dark             | Optional light           | Use                                                    |
| ---------------------- | ------------------------ | ------------------------ | ------------------------------------------------------ |
| `--background`         | `oklch(0.135 0 0)`       | `oklch(0.985 0 0)`       | Application canvas                                     |
| `--foreground`         | `oklch(0.96 0 0)`        | `oklch(0.145 0 0)`       | Primary text and icons                                 |
| `--card`               | `oklch(0.175 0 0)`       | `oklch(1 0 0)`           | Composer, modal, menu, and framed tool surfaces        |
| `--card-foreground`    | `oklch(0.96 0 0)`        | `oklch(0.145 0 0)`       | Content on card surfaces                               |
| `--muted`              | `oklch(0.225 0 0)`       | `oklch(0.965 0 0)`       | Quiet controls and grouped regions                     |
| `--muted-foreground`   | `oklch(0.67 0 0)`        | `oklch(0.48 0 0)`        | Secondary labels and metadata                          |
| `--border`             | `oklch(1 0 0 / 0.1)`     | `oklch(0.91 0 0)`        | Standard boundaries                                    |
| `--border-strong`      | `oklch(1 0 0 / 0.18)`    | `oklch(0.82 0 0)`        | Focused grouping and draggable regions                 |
| `--primary`            | `oklch(0.94 0 0)`        | `oklch(0.18 0 0)`        | Primary actions and selected controls                  |
| `--primary-foreground` | `oklch(0.16 0 0)`        | `oklch(0.985 0 0)`       | Content on primary surfaces                            |
| `--accent`             | `oklch(0.72 0.15 250)`   | `oklch(0.62 0.18 250)`   | Sparse Nebulens status and brand emphasis              |
| `--accent-soft`        | `oklch(0.28 0.06 250)`   | `oklch(0.94 0.035 250)`  | Selected skill, active search, and informational state |
| `--destructive`        | `oklch(0.68 0.18 25)`    | `oklch(0.56 0.2 25)`     | Destructive commands and errors                        |
| `--ring`               | `oklch(0.72 0.02 250)`   | `oklch(0.55 0.02 250)`   | Keyboard focus ring                                    |
| `--overlay`            | `oklch(0.04 0 0 / 0.82)` | `oklch(0.08 0 0 / 0.72)` | Image inspection backdrop                              |

Generated images are exempt from the neutral palette. Do not tint, blur, or darken them unless text or inspection controls require local contrast.

### Nebulens Brand Accents

Use the existing Nebulens logo as the source for sparse chromatic accents. The composer `BorderGlow` mesh uses logo-aligned golden orange (`#ffb51b`), cyan (`#12c8f4`), and royal blue (`#1464ff`), with the warm orange node appearing slightly more often so it remains visible in motion. Its directional outer light uses the cyan HSL value `198 96% 70%` to balance the warmer mesh. Keep these colors limited to focused creation surfaces and brand-led moments so generated imagery remains the dominant source of saturation.

### Typography

Use `Geist Sans`, `Inter`, `Helvetica Neue`, and `ui-sans-serif` as the interface stack. Reserve `Oxanium` for the Nebulens wordmark and compact brand-led labels. In the home headline, pair `Geist Variable` for `Turn your idea` with `Instrument Serif Italic` for `into images` at one shared display scale.

| Role          | Size / line height                            | Weight | Use                                   |
| ------------- | --------------------------------------------- | ------ | ------------------------------------- |
| Display       | `64-80px / 0.9` desktop, `40px / 0.88` mobile | 460    | Home prompt-led headline only         |
| Page title    | `36px / 1.12` desktop, `28px / 1.15` mobile   | 550    | Generate, history, and admin headings |
| Section title | `22px / 1.25`                                 | 600    | Result groups and major panels        |
| Card title    | `15px / 1.35`                                 | 600    | Asset and modal titles                |
| Body          | `15px / 1.6`                                  | 400    | Main product copy                     |
| UI            | `13px / 1.4`                                  | 500    | Controls, menus, and table values     |
| Caption       | `11px / 1.35`                                 | 500    | Metadata and helper text              |

Letter spacing is `0`. Use weight, contrast, and spacing for hierarchy. Do not use oversized editorial typography inside work surfaces.

### Spacing

Base unit: `4px`.

| Token        | Value  | Typical use                     |
| ------------ | ------ | ------------------------------- |
| `--space-1`  | `4px`  | Icon/text micro-gap             |
| `--space-2`  | `8px`  | Menu padding and compact groups |
| `--space-3`  | `12px` | Standard control gaps           |
| `--space-4`  | `16px` | Card and mobile page padding    |
| `--space-5`  | `20px` | Composer and toolbar sections   |
| `--space-6`  | `24px` | Page groups                     |
| `--space-8`  | `32px` | Section separation              |
| `--space-10` | `40px` | Desktop page inset              |
| `--space-16` | `64px` | Major page rhythm               |

Use stable grids, `aspect-ratio`, and min/max constraints for repeated assets and controls. Dynamic content must not resize toolbars or shift adjacent controls.

### Radius

beUI uses radius to express component role rather than one global corner value.

| Token           | Value   | Use                                             |
| --------------- | ------- | ----------------------------------------------- |
| `--radius-xs`   | `4px`   | Tooltips, code labels, tiny status surfaces     |
| `--radius-sm`   | `8px`   | Menu items, thumbnails, inputs, compact buttons |
| `--radius-md`   | `12px`  | Dropdowns, cards, grouped controls              |
| `--radius-lg`   | `16px`  | Asset cards and modal panels                    |
| `--radius-xl`   | `20px`  | Prompt composer and large morphing surfaces     |
| `--radius-full` | `999px` | Icon buttons, switches, and true pills          |

Do not make every container round. Page bands, tables, and unframed content regions remain square.

### Elevation

Use borders for ordinary separation. Shadows are reserved for floating or morphing surfaces.

| Token            | Value                                                         | Use                                    |
| ---------------- | ------------------------------------------------------------- | -------------------------------------- |
| `--shadow-float` | `0 16px 48px -28px rgb(0 0 0 / 0.35)`                         | Dropdowns and floating composer layers |
| `--shadow-modal` | `0 24px 80px -36px rgb(0 0 0 / 0.48)`                         | Modal content above backdrop           |
| `--shadow-focus` | `0 0 0 3px color-mix(in oklch, var(--ring) 24%, transparent)` | Keyboard focus support                 |

Do not apply shadows to every card, image tile, table row, or page section.

### Workspace Surface

All authenticated work routes sit on a shared graphite working plane inside the app rail. The
plane uses a raised graphite fill, a single quiet boundary, and a restrained inset highlight so
the page is visibly distinct from the application canvas without becoming a nested card. The
Generate canvas uses a React Flow-inspired, very low-contrast dot field to communicate an open
image-making surface; the dots must never compete with the prompt or media.
Toolbars and image collections inherit this plane rather than creating a separate full-page black
panel.

## Motion System

Motion uses `transform`, `opacity`, shared layout IDs, and measured dimensions. New product motion should use `cubic-bezier(0.16, 1, 0.3, 1)`.

| Motion   | Duration    | Use                                               |
| -------- | ----------- | ------------------------------------------------- |
| Fast     | `120-160ms` | Hover, selected state, icon feedback              |
| Standard | `180-240ms` | Dropdown reveal, toolbar changes, attachment tray |
| Morph    | `320-520ms` | Card-to-modal and shared-surface continuity       |

Installed beUI components may keep their internal spring transitions. Product-level additions should avoid elastic overshoot. Under `prefers-reduced-motion`, stop autoplay and replace spatial movement with immediate state changes or short opacity fades.

## Component Language

### beUI Pro Source and Usage Contract

beUI Pro is the authoritative component source for Nebulens. The canonical reference
is the [beUI Pro component catalog](https://pro.beui.dev/components) and its
[installation and registry guide](https://pro.beui.dev/components/installation). The
`@beui-pro` registry in `frontend/components.json` is the install/update path; it is
not a second visual system. Components copied from that registry live in this repository
so they can be typed, tested, and connected to Nebulens domain data without a runtime
dependency on the site.

The rules below are binding for new UI work:

- Start with the closest beUI Pro component and compose it with product data. Do not
  create a page-local dropdown, tooltip, modal, composer, gallery, or table when a
  mapped component exists.
- Local files are adapters, not alternative designs. They may add labels, event
  contracts, loading/error handling, or semantic token classes, but must preserve the
  source component's keyboard, focus, motion, and morphing behavior.
- Use the source component's documented interaction model before adding props. A new
  variant requires a concrete Nebulens workflow and must be documented in this file.
- Every interactive state is required: default, hover, active/pressed, selected,
  disabled, focus-visible, pending/error where relevant, and
  `prefers-reduced-motion` behavior. Color alone cannot communicate state.
- Option sets use an animated dropdown or select wrapper; binary state uses a switch;
  bounded numeric values use a stepper/input; unfamiliar icon-only actions use Lucide
  icons with an accessible name and `IconTooltip`.
- Keep one source of truth for spacing, color, radius, and elevation. Extend semantic
  tokens rather than adding one-off hex values in a route or component.

Toast providers, route shells, API clients, hooks, upload transport, and motion helpers
are infrastructure rather than visual components. They remain local when they do not
replace a beUI Pro surface; any visible UI they render still follows the mapped component
contract above.

#### Source-to-code mapping

| beUI Pro source                | Canonical reference                                                      | Local implementation                                                                    | Allowed adaptation                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Agent Chat Input               | [agent-chat-input](https://pro.beui.dev/components/agent-chat-input)     | `src/components/premium/agent-chat-input/*` and `AgentChatInput`                        | Prompt, attachments, model, ratio, count, private mode, quota, submit/stop, and product callbacks      |
| Expanding Pill / Navbar Expand | [navbar](https://pro.beui.dev/components/navbar)                         | `src/components/premium/navbar-expand/navbar-expand.tsx` and `NavbarExpand`             | Route items, current state, mobile collapse, and Nebulens logo                                         |
| Animated Dropdown              | [animated-dropdown](https://pro.beui.dev/components/animated-dropdown)   | `src/components/premium/animated-dropdown/*` and `src/components/ui/select-menu.tsx`    | Typed option data, labels, collision padding, and route-specific values                                |
| Morphic Card Modal             | [morphic-card-modal](https://pro.beui.dev/components/morphic-card-modal) | `src/components/premium/morphic-card-modal/*`, `ImageDetailModal`, `ConfirmActionModal` | Image metadata, destructive confirmation, download/reuse actions, and focus return                     |
| Morphic Tooltip                | [morphic-tooltip](https://pro.beui.dev/components/morphic-tooltip)       | `src/components/premium/morphic-tooltip/*` and `src/components/ui/icon-tooltip.tsx`     | Accessible labels and placement only                                                                   |
| Image Gallery Vertical         | [image-galleries](https://pro.beui.dev/components/image-galleries)       | `src/components/premium/image-galleries/image-gallery-vertical.tsx`                     | Six product-owned images, vertical looping columns, responsive column count, and reduced-motion freeze |
| Data Table                     | [data-table](https://pro.beui.dev/components/data-table)                 | Admin users table in `src/views/AdminUsersView.tsx`                                     | User rows, inline quota editing, pagination, and mobile record layout                                  |
| Empty States                   | [empty-states](https://pro.beui.dev/components/empty-states)             | Empty/loading/error patterns in route views                                             | Concise Chinese recovery copy and product actions                                                      |
| Auth                           | [auth](https://pro.beui.dev/components/auth)                             | `src/components/auth/*` and auth views                                                  | Existing Better Auth fields, validation, pending state, and provider limits                            |
| Shared button primitive        | beUI Pro control language via the `@beui-pro` registry                   | `src/components/ui/button.tsx`                                                          | Semantic variants and Lucide icon slots; no new button family                                          |

#### Explicit exceptions

Two intentional non-beUI Pro visual primitives are approved. `BorderGlow` follows the
previous product decision to use the [ReactBits Border Glow](https://reactbits.dev/components/border-glow)
effect around the Agent Chat Input. It is limited to the focused composer boundary,
uses Nebulens logo-aligned cyan/blue/orange tokens, has no content or layout responsibility,
and must honor reduced motion. Do not use it on navigation, cards, tables, galleries,
or generic page backgrounds.

`ImageGenerationPlaceholder` adapts the
[AICSS Image Generation](https://www.aicss.dev/components/image-generation) visual for pending
generation results. It is limited to `GenerateView`, preserves the selected output count and
aspect ratio, maps the supported ratios to square, landscape, and portrait dot-mask motion, and
uses the project's semantic dark-theme tokens. It may not replace completed media, error recovery,
or semantic controls. Any future third-party component requires the same explicit exception and a
documented replacement/ownership boundary before use.

#### Component review checklist

Before merging a component change, verify:

1. The component appears in the mapping above or has a documented beUI Pro source URL.
2. The implementation is imported from the shared component path, not duplicated in a
   view. A route may compose a component, but it may not fork its interaction logic.
3. The component has stable dimensions and does not cause overflow at 1366px, 1440px,
   1920px, 390px, or 320px widths.
4. Keyboard navigation, focus return, accessible names, disabled/pending/error states,
   and reduced-motion behavior are covered by tests or a documented manual check.
5. Visual changes use semantic tokens and keep the source component's hierarchy; do not
   add nested cards, decorative gradients, or a second component library.

### Agent Composer

The prompt composer is the signature product surface. Use the installed beUI Agent Chat Input as its interaction model.

- Place it at the center of the creation flow, up to `768px` wide on home and `1060px` in the generate workspace.
- Use a `20px` outer radius and a quiet 3px frame. Generate keeps the card-colored inner surface and
  no permanent heavy shadow. Discover may use one cool graphite glass material on this same beUI
  surface: a continuous full-surface SVG displacement-map refraction layer, a lightly tinted radial
  sheen, and a separate `20px` desktop / `18px` mobile chrome blur with restrained saturation.
  Discover uses a `30px`
  material radius and a low-contrast directional inset rim so the lens remains legible when the
  focus gradient is absent. Keep the moving hero video perceptible through the prompt area without
  reducing text contrast. Clip each material layer inside the radius, leave the root overflow
  available for menus, and provide opaque fallbacks for unsupported filters and higher contrast.
- Use ReactBits `BorderGlow` as the composer's only decorative focus effect. Keep a restrained logo-aligned golden orange, cyan, and royal blue mesh while the prompt editor is focused, intensify and orient it as the pointer approaches an edge, and replace pointer tracking with a static focus treatment under `prefers-reduced-motion`.
  On the translucent Discover composer, clip the colored `::before` mesh to a true 1px border ring,
  disable the `::after` interior mesh fill, and retain the pointer-owned outer edge light. The glass
  body must remain neutral; its inset glass rim stays subordinate to the focused gradient edge.
- On Discover/Home, stream concise image-prompt examples one character at a time from the shared prompt list. Use a low-saturation white, pale blue, and soft peach gradient (`#f3f5fa`, `#c5d9f2`, `#efc9ac`) for that shortcut prompt text; keep the logo-aligned orange, cyan, and royal-blue palette reserved for `BorderGlow`. The Generate workspace uses the quiet top-left composer placeholder `描述你想生成的画面…` instead of discovery or marketing copy.
- Keep prompt text, placeholders, and streamed prompt examples at `16px` across Discover and Generate so both composers share the same reading scale.
- Attachments appear as compact thumbnail chips above the toolbar.
- Model, ratio, count, and secondary controls sit in the lower toolbar or a morphing top layer.
- Use a circular primary submit button. Disabled, submitting, streaming, and stop states must be visible.
- Keep generation shortcuts out of visible instructional copy; expose them through tooltips or accessible descriptions.

### Animated Dropdown

- Dropdown surfaces use `12px` radius, 1px border, card background, `6px` padding, and `--shadow-float` only when separation requires it.
- Menu items use `8px` radius and a stable minimum height of `40px`.
- The highlighted background moves between items rather than flashing each row independently.
- Destructive items use semantic destructive color and a soft destructive highlight.
- Long labels truncate; descriptions may use a second muted line.

### Morphic Tooltip

- Use on unfamiliar icon-only controls and dense toolbars.
- Tooltip surface uses inverse foreground/background, `4px` radius, `12px` text, and no decorative shadow.
- Tooltips move between adjacent controls when the pointer travels across a toolbar.
- Focus-triggered tooltips appear immediately and do not animate spatially.

### Morphic Card Modal

- Use for generated-image and history-image inspection.
- The clicked card is the origin of the detail surface; preserve crop and position continuity into the modal.
- Modal panels use `16px` radius and `--shadow-modal`; the overlay uses `--overlay`.
- Do not use backdrop blur on product modals.
- Keep close, download, reuse prompt, public state, and destructive actions reachable by keyboard.
- Route destructive image actions through the shared `ConfirmActionModal`; use an `alertdialog`, explicit irreversible copy, an 8px radius, guarded pending state, and cancel/confirm actions that remain usable at 320px.
- Do not use native `window.confirm` in Generate or Assets because it breaks beUI styling, focus continuity, and pending feedback.

### Generation History Flyout

- Keep the history entry inside the right edge of the Generate canvas. The closed state is
  only a `28-32px` GPT-style rail with one horizontal tick per generation batch currently
  rendered in the result feed. Tick order mirrors the existing result order, the current batch
  tick is slightly longer and brighter, and an empty result feed renders no ticks. The rail must
  not consume a main-canvas grid track or change the composer width.
- Each tick is an independent shared `Button`. Its idle line is short and low contrast;
  hover or keyboard focus lengthens only that line and reveals a compact contextual preview
  aligned to the tick. The preview contains the prompt summary, time, model, aspect ratio, count,
  and visibility state. Hovering a tick never opens the full searchable history panel.
- Clicking a tick or its preview scrolls the canvas to that already-rendered result, marks the tick
  active, and closes every history surface without inserting, removing, or reordering result items.
  Treat this active extension as transient orientation feedback: clear it when the pointer or focus
  leaves the complete history interaction area, while direct tick hover/focus and result-card
  hover/focus continue to use their normal emphasized state.
  Open the full `320-360px` searchable panel only from the faint search icon above the rail. The
  search icon remains independently reachable on touch devices; while the panel is open, replace it
  with the panel-header close action and remove hidden ticks from pointer and keyboard navigation.
  Keep transparent pointer-safe travel between tick, preview, and panel, and close after a short
  delay outside the combined interaction area.
- Center the expanded panel in the available canvas above the fixed Agent Composer using
  viewport-relative sizing; do not pin it to the canvas top or make it participate in the
  main content grid.
- The panel uses a translucent graphite surface, a low-contrast boundary,
  `backdrop-filter: blur`, and a restrained floating shadow. Its bottom edge stays above
  the fixed Agent Composer so generated results and input controls remain reachable.
- Search matches prompt/task fallback text, model, batch id, and localized date text.
  Results group as `今天`, `昨天`, `过去 7 天`, and `更早`; each item exposes thumbnail,
  prompt summary, time, model, aspect ratio, and count.
- Selecting a searchable-panel item already present in the feed uses the same scroll-only behavior.
  A missing historical item may be loaded at the end of the feed, but existing result positions and
  order remain unchanged. A pending generation may show a low-frequency brand pulse, never a
  progress percentage.
- With no records, show only `暂无生成记录，完成第一次创作后将在这里显示`. Respect
  keyboard focus, `Escape` close/focus return, touch selection, and `prefers-reduced-motion`
  by removing the pulse and spatial transitions while preserving the state change.
- When results exist and the latest result batch is outside the usable window area above the fixed
  Agent Composer, show one circular shared `Button` with a Lucide down arrow centered immediately
  above the composer. Use a `42px` desktop target and a `40px` narrow-screen target so the action is
  legible without competing with the composer submit control. Measure against the window scroll
  container and the live composer boundary so
  multiline prompts, references, errors, and mobile navigation cannot overlap it. Observe the full
  feed as well as the latest batch and composer so upstream image or batch height changes trigger a
  fresh measurement. Activating it computes a window scroll target from the current batch and
  composer rectangles, placing the latest batch bottom about `24px` above the composer without
  changing feed order; use smooth scrolling by default and immediate scrolling for
  `prefers-reduced-motion`. Hide it only when the latest batch bottom is completely above that
  boundary and a meaningful portion of the batch, not merely a narrow strip, is visible.

### Creation Sessions

- Treat the left sidebar session list as the GPT-style conversation history for Generate.
  It sits directly below `新建生成`, uses the heading `最近会话`, and remains independent
  from the right-side Generation History Flyout: the left list switches complete creation
  sessions, while the right flyout searches generation batches inside the active session.
- Activating `新建生成` creates a fresh session immediately, navigates to
  `/generate?session=<id>`, clears the current composer/result context, and adds one
  `未命名会话` row. The first valid generation prompt automatically becomes the title;
  normalize whitespace and truncate long automatic titles to 30 characters plus an ellipsis.
- Order sessions by most recent activity. Each session persists its id, title, creation time,
  update time, and owned batch ids so switching sessions restores only that session's results.
  Keep direct `/generate` compatible with older unassigned generation history and create a
  session lazily on first submission.
- Keep a page-lifetime result cache keyed by session id and merge it with hydrated server batches
  during every switch. This prevents newly completed or still-transient results from disappearing
  when users move between sessions before history hydration catches up. Returning to bare
  `/generate` after removing the active session clears the visible feed without deleting cached or
  persisted results owned by other sessions.
- Rows are compact, single-line, and borderless with an `8px` radius. The active session uses a
  persistent full-row low-contrast fill and higher-contrast title, while inactive rows remain
  unfilled until hover or keyboard focus. Truncate long titles instead of changing sidebar width
  or row height. Do not show a visible session count beside the heading.
- Each row exposes one shared beUI `AnimatedDropdown` trigger using the shared ghost icon `Button`.
  Reveal the three-dot trigger only on hover, focus, or while its menu is open. Put `重命名` and
  `删除` inside that menu; do not reserve two visible action columns or expose a standalone trash
  button. Menu icons use Lucide and destructive state uses the dropdown's semantic variant.
- Rename in place without opening a modal. Focus the input immediately, accept Enter or the
  explicit save control, keep the current name when submitted empty, and preserve keyboard
  focus visibility. Session navigation and renaming must not reset model, ratio, count,
  visibility, resolution, or any in-flight generation owned by that session.

### Buttons and Icon Controls

- Primary buttons use `--primary`, `--primary-foreground`, `8px` radius, and a stable `40px` or `44px` height.
- Secondary buttons use card background and border. Ghost controls use transparent backgrounds and muted foreground.
- Icon-only controls are circular or `8px` rounded squares with a stable `36-40px` box.
- Every icon-only control has an accessible name. Add a Morphic Tooltip when the icon is not universally obvious.
- Use Lucide icons already installed in the project. Do not draw custom SVG icons.

### Inputs and Selection Controls

- Text inputs use an `8px` radius, 1px border, card background, and a visible semantic focus ring.
- Use animated menus for option sets, segmented controls for a small number of modes, switches for binary settings, and steppers for bounded image count.
- Do not hide primary generation settings behind multiple nested menus.

### Data Tables

- Keep tables dense and calm: `44-48px` rows, muted uppercase-free headers, hairline row dividers, and no card around every row.
- The table toolbar owns search, result count, page size, and relevant bulk actions.
- Pagination uses icon buttons and an animated page-size menu.
- Mobile changes rows into labeled records without dropping quota editing or delete actions.

### Empty, Loading, and Error States

- Empty states explain the next useful action in one sentence and provide one clear command when action is possible.
- Use inline skeletons or reserved space for loading; do not replace an entire page with a spinner.
- Errors stay near the failed task and preserve retry or correction paths.
- Status text uses live regions where appropriate and must not depend on color alone.

### Operational Copy

- Generate, Templates, Assets, Sign In, and Sign Up show only labels, values, state, validation, and concise empty/error recovery.
- Do not place page subtitles, feature summaries, tutorials, keyboard instructions, workflow explanations, or marketing copy inside work surfaces.
- Prefer a tooltip or accessible name for unfamiliar icon controls. Do not use visible helper copy to compensate for an unclear layout.

## Page Patterns

### Home (`/`)

The home page is a product-first creation screen, not a Squarespace clone.

- Use a full dark first viewport with a beUI-aligned fixed left rail, a centered product statement in the remaining canvas, and a functional Agent Composer. The desktop rail runs the full viewport height, keeps the Nebulens mark close to the route list, and uses one quiet active row for current-route emphasis.
- Keep login and personal points as a separate compact account cluster in the upper-right corner. Guest points open the auth modal; authenticated users see their account name and live remaining points.
- On mobile, reduce the rail to the existing brand-plus-menu control and open navigation/actions in a rounded graphite overlay below it. Preserve Escape closing, route-current semantics, and zero horizontal overflow.
- Keep the copy short: brand/product name, one concrete creation promise, and the composer placeholder. Set `Turn your idea` in Geist Variable at 460 weight with slightly tightened word spacing, and `into images` in same-scale Instrument Serif Italic. Align both on one baseline with a deliberate natural-space gap between the font treatments. Apply the Apple-inspired `110deg` blue-lilac-blush-ivory shiny gradient only to `into images`, pan its `200%` background from `200%` to `-200%` so the visible sheen travels left to right over a quiet 6-second linear loop, and hold a static centered gradient under reduced motion. Give the italic accent compensated lower padding so the `g` descender stays fully painted without moving the following content. Retain the restrained upward fade on entry.
- Keep the video, navigation, headline, and Agent Composer within a full `100svh` first viewport. Preserve the video across that complete viewport; pull the creation feed upward into the open space below the composer so the first image row appears within the first viewport rather than starting near the bottom.
- Present the six bundled works with beUI Pro `image-gallery-vertical`: four alternating motion columns on wide screens and the component's compact two-column layout below the large breakpoint. The gallery loops its local images vertically, never horizontally, and has no pagination or previous/next controls. Respect `prefers-reduced-motion` by freezing the columns.
- Keep the home gallery unlabeled and pull it upward into the lower hero space while preserving a clear visual boundary below the Agent Composer. Blend its moving columns into the graphite canvas with a long, symmetric multi-stop edge mask instead of a short linear fade. Use real generated images with `16px` radius, subtle borders, a restrained hover zoom, and the shared image-detail modal on primary images.

### Generate (`/generate`)

- Use a precision-first studio: a quiet app rail, one bottom-docked creation bar, and a continuous session feed. Keep the bar anchored near the lower edge for both empty and populated sessions, leaving the upper workspace open for generated results.
- Keep the main canvas visually quiet and reserve it for generated results. When empty, show one centered low-contrast empty state with a dashed image placeholder, `开始你的创作`, and the concise supporting line `在下方输入描述，或提供参考图，让 AI 帮你生成想象中的画面`; the bottom composer alone carries the `描述你想生成的画面…` placeholder in its upper-left prompt area. Never repeat the home headline, discovery examples, gallery, or marketing explanation.
- Treat every completed batch as one GPT-style conversation turn: a compact right-aligned prompt and metadata bubble leads into the generated media, then a quiet output-aligned batch toolbar. Do not restore the detached full-width batch header.
- On wide screens, keep the conversation column near `960px`, but cap a single result near `360px` so the workspace remains ready for batches of up to four images. Two results use a compact two-column grid, three use three smaller columns, and four use a restrained `2 x 2` grid whose total width stays near `640px`. Pending skeletons and completed media must share the same count-aware geometry. Preserve each result's source aspect ratio and collapse to one centered column on narrow mobile screens.
- Do not display a page title or explanatory introduction above the composer. The active workspace and current collection are communicated through navigation state and compact controls.
- The Agent Chat Input owns prompt, reference upload, model, ratio, count, private-mode switch, quota, and submit/stop behavior. Keep the toolbar in one row where space allows: upload, model, ratio, count, and private mode on the left; quota/status and generation on the right.
- Advanced options open through one Animated Dropdown or responsive side sheet. Core settings stay visible and stable.
- Reference thumbnails live inside the composer tray. Each thumbnail exposes preview and remove; reference roles or influence appear only when the generation API can honor them.
- Generation status reserves the exact result geometry immediately: render one AICSS Image Generation placeholder per requested image using the selected aspect ratio and the same responsive grid tracks as completed results. Adapt its low-contrast dot field and morphing highlight into three stable geometries: square (`1:1`), landscape (`3:2`, `16:9`), and portrait (`2:3`, `9:16`). Show the selected ratio/resolution and the quiet status `正在生成图片`; never use a shimmer sweep or invented percentage. Crossfade each loaded image over roughly `220ms` with only a slight scale correction, remove all looping motion under `prefers-reduced-motion`, and replace failed placeholders with an equal-ratio retry card.
- During pending and completed batches, keep the prompt as a compact right-aligned conversation
  bubble. Pending results render as a larger centered work card with a restrained dot field;
  completed results replace that card in the same reading flow without becoming a detached
  thumbnail grid. Batch actions sit below and align to the generated media. A single-image batch
  exposes only `复用完整设置` and `再次生成`; batch download and deletion appear only for batches
  with two to four results. Image-level actions remain attached to their corresponding result:
  using the image as a reference, downloading it, changing visibility, and deleting it. Clicking
  the image itself opens detail, so do not add a duplicate `查看图片` icon action.
- Completed prompt bubbles expose a quiet edit action on hover and keyboard focus. Editing happens
  in place inside one continuous GPT-style surface: the text area has no nested border or background,
  the desktop editor may widen to `640px` while remaining right-aligned, and a quiet `取消` action
  plus high-contrast `修改` action sit at the lower right. Both actions use the shared `Button`
  primitive (`secondary` and `primary`) at the compact `36px` control height with a `16px` gap; do not
  recreate their borders, radii, hover, focus, or disabled states in the page stylesheet. Keep a one-line editor compact with a
  `56px` text-area minimum and roughly `110-125px` total surface height. Grow multiline content only
  as needed up to a `120px` text-area maximum, then scroll internally with a low-contrast thin scrollbar; never expose the native resize
  handle. Submitting
  reuses the batch's model, aspect ratio, count, resolution, visibility, and
  reference IDs, then replaces that turn with equal-geometry loading placeholders. Commit the new
  batch to the session before removing the old persisted batch, and restore the original result if
  replacement generation is cancelled or fails.
- Reuse and rerun restore the complete supported generation contract, not prompt text alone.
- Image cards morph into the shared detail modal. The modal remains a continuation surface, not a dead-end preview.

### Creation Templates (`/templates`)

- Use an image-led browser with a compact sticky search/filter toolbar and no explanatory hero.
- Keep the toolbar inside the shared working plane with a visible search surface and clear separation from the image-led gallery.
- Template data includes image, title, category, prompt, supported generation settings, favorite state, and recent-use state.
- Each visible template owns a distinct Nebulens raster thumbnail matched to its prompt. Do not reuse third-party page imagery, source-site UI, unrelated in-image copy, logos, or watermarks.
- Search updates immediately. Category and sort controls use Animated Dropdown or a compact segmented filter where the option count is small.
- Cards reveal only high-frequency actions on hover/focus: favorite and quick use. Full prompt, settings, copy, and use live in a Morphic Card Modal.
- Using a template opens Generate with its supported prompt and settings prefilled. Never show a template action that does not reach a working generation state.

### History (`/history`)

- Treat History as the Assets library. Use a compact sticky toolbar, collection rail, image grid/list switch, and optional selection action bar.
- Keep the collection rail and image library on the same graphite plane; use each image's source aspect ratio for scanning instead of forcing every asset into a square crop.
- Do not show an explanatory page heading. Search, item count, filters, view mode, and sorting provide the page context.
- Search, sort, date, visibility, favorites, and collection filters use shared inputs and Animated Dropdown patterns.
- Generated images are the repeated surface; do not put image cards inside a larger decorative card.
- Selection mode supports select all in the current result set, bulk download, collection assignment, and bulk delete. Destructive bulk actions require confirmation.
- Preserve inspect, download, reuse prompt/settings, public state, pagination/load-more, single delete, loading, empty, error, unauthenticated, and retry behavior.
- Grid mode optimizes visual scanning. List mode exposes prompt, model, dimensions, visibility, collection, and created date without opening each image.

### Admin Users (`/admin/users`)

- Use a compact page heading and a restrained account-creation form.
- Present users in a responsive data-table pattern with search, result count, page-size menu, and pagination.
- Quota editing remains inline. Destructive actions require clear text or a tooltip plus confirmation.
- Mobile records must retain identity, role, quota, created date, save, and delete actions.

### Authentication and Overlays

- Login/sign-up uses the beUI Auth interaction model in a focused one-column overlay with a `16px` radius and clear segmented mode switch.
- Preserve username/password and Google. Do not add password recovery, verification, or social providers that the backend does not support.
- Provide password visibility, inline field validation, pending/error states, correct autocomplete, and an explicit primary action. Do not add explanatory account-benefit copy.
- Successful authentication returns focus and execution context to the command that requested login.
- Image inspection uses the Morphic Card Modal and a near-black media stage with a raised graphite metadata panel when space permits.
- Escape, outside-click where safe, focus containment, and focus return are required.

## Responsive Rules

### Desktop: `>= 1180px`

- Navigation rail: `224-240px`.
- Page inset: `32-40px`.
- Main content max width: `1180px`; composer max width: `1060px` on desktop.
- Asset grids use 3-4 stable columns depending on available width.

### Tablet: `720-1179px`

- Collapse the navigation rail to icons or a compact top bar.
- Use two-column result and asset grids.
- Keep primary settings visible; move secondary settings into one animated dropdown or disclosure.

### Mobile: `< 720px`

- Use `14-16px` page insets and a fixed bottom navigation with safe-area padding.
- Composer fills the available width and keeps `16-20px` radius while visibly inset.
- Toolbars wrap into deliberate rows; controls remain at least `40px` high.
- The home vertical gallery uses its compact two-column component layout and remains horizontally contained; images continue to move only along the vertical axis.
- Tables become labeled records. Modals become full-height sheets only when the media and actions cannot fit otherwise.
- Do not hide primary actions, quota controls, filters, or destructive commands.

## Accessibility

- Meet WCAG AA contrast for text, icons, focus, and disabled states.
- All interactions work with keyboard and expose stable accessible names.
- Focus indicators use `--ring` and remain visible on light and dark surfaces.
- Tooltips supplement accessible names; they never replace them.
- Dialogs expose a title, manage focus, close with Escape, and return focus to the originating card.
- Respect reduced motion and stop nonessential autoplay.
- Images use prompt-based alt text when meaningful and empty alt text when decorative.

## Do

- Use beUI components as source-owned product primitives and adapt them through semantic tokens.
- Let menus, tooltips, attachments, and image details morph continuously from their triggers.
- Keep operational screens dark, layered, focused, and scan-friendly.
- Use generated imagery and the existing Nebulens logo as the visual identity.
- Use progressive disclosure for advanced options while keeping core generation controls visible.
- Test populated, loading, empty, error, unauthenticated, forbidden, and mobile states.

## Do Not

- Do not reproduce Squarespace navigation, typography, black/white section alternation, or editorial page composition.
- Do not flatten generation, history, or admin into one undifferentiated black surface; use semantic graphite layers and borders.
- Do not force the old 4-8px radius limit onto beUI components.
- Do not wrap every section or row in a card.
- Do not nest cards, add decorative gradient backgrounds, or use glow as a substitute for hierarchy.
- Do not replace real images or familiar library icons with placeholders, CSS drawings, emoji, or handcrafted SVG.
- Do not keep a component merely because it was installed; use it only where its interaction model improves the task.
- Do not expose Canvas, video, reference-role, personalization, folder, favorite, or bulk controls until their actions and persistence work end to end.
- Do not place explanatory subtitles, keyboard tips, feature descriptions, or onboarding prose inside operational pages.

## Persisted Product Contracts

### Generation Settings Snapshot

Every completed generation retains the settings required to reproduce its request: `prompt`, `model`, `aspectRatio`, `count`, `resolution`, `isPublic`, and all uploaded `referenceIds`. Reuse settings and rerun restore this complete snapshot. A persisted output used as a new reference is loaded from its output blob and uploaded through the same reference pipeline as a local attachment.

Generation history records persist `count` and `resolution` alongside the existing prompt, model, aspect ratio, reference IDs, dimensions, visibility, and timestamps. Standard generation stores `resolution: "standard"`; high-resolution generation stores the requested resolution. Older records may omit the new fields at the frontend validation boundary and use UI defaults, while all newly written records include them.

### Asset Metadata

Favorites, visibility, and collection membership are server-owned image metadata rather than browser-only preferences. The history contract exposes `isFavorite`, `isPublic`, and optional `collection` on each image record. Collection removal is represented by `collection: null` in update commands and by an omitted collection in returned records.

Authenticated metadata mutations are owner-scoped:

- `PATCH /api/history/:id` updates one owned image.
- `PATCH /api/history` applies one metadata update to the supplied owned image IDs.
- `POST /api/history/bulk-delete` deletes the supplied owned image IDs and returns the removed count.

Foreign or nonexistent IDs are never mutated by bulk operations. The frontend validates every returned image record before updating the shared history cache so Generate, Assets, and detail views observe one consistent state.

## Implementation Mapping

| Product need                               | Preferred implementation                                                |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Prompt, attachments, quota, and generation | `AgentChatInput` Studio Composer                                        |
| Model, ratio, sort, filters, contextual action | `AnimatedDropdown` through shared select/menu wrappers                  |
| Icon guidance                              | `MorphicTooltip` through `IconTooltip`                                  |
| Image/template inspection and continuation | `MorphicCard` + `MorphicCardModal`                                      |
| Asset list mode and bulk selection         | beUI `Data Table` adapted to image metadata                             |
| Asset and template browsing                | beUI `Image Galleries` patterns with product-owned actions              |
| Authentication                             | beUI `Auth` pattern with existing Better Auth behavior                  |
| Empty and disconnected states              | beUI `Empty States` adapted to concise product recovery                 |
| User list                                  | Local responsive table using shared tokens and animated pagination menu |
| Buttons                                        | Shared `Button` primitive and icon-button contract                      |
| Navigation                                     | Existing React Router shell restyled with semantic tokens               |

## Quality Gate

- `frontend/component-provenance.json` is the machine-readable source policy. Visible controls in
  route and domain components must compose the shared beUI/ui primitives; native control
  implementation is limited to `src/components/premium/`, `src/components/ui/`, and exact audited
  exceptions.
- Run `npm run check:components` from `frontend/` after adding or changing a component. The check
  rejects unapproved native controls, direct foundation imports outside shared roots, competing
  component systems, browser dialogs, and undocumented consumers of external visual exceptions.
- `BorderGlow` and `ImageGenerationPlaceholder` are the only non-beUI visual exceptions.
  `BorderGlow` may only wrap the beUI Agent Chat Input focus surface; the AICSS placeholder may only
  render pending or image-loading states in `GenerateView`. The hidden file input in
  `ReferenceUploader` is the only business-component native-control exception; its visible trigger
  remains the shared `Button`.
- Every route uses the semantic token layer in this document.
- Homepage presents a usable prompt-first beUI experience followed by the beUI Pro six-image vertical gallery.
- Generate, templates, assets, authentication, and image detail preserve existing behavior and satisfy their page-pattern requirements above.
- Dark theme is complete across every route; optional light tokens remain coherent.
- Operational pages contain no visible explanatory subtitles, feature descriptions, tutorials, or keyboard shortcut prose.
- Every visible action works end to end; unsupported provider capabilities are absent rather than disabled decoration.
- No horizontal overflow, clipped text, overlapping controls, or layout shifts at 1440px, 1024px, 768px, 390px, and 320px.
- Typecheck, lint, tests, production build, formatting, whitespace checks, browser console checks, and same-viewport visual QA pass before handoff.
