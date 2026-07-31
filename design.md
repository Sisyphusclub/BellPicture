# Nebulens - beUI Pro Design System

> A dark-first AI image studio built from layered graphite surfaces, compact controls, and continuous morphing interactions.

**Visual source:** [beUI Pro](https://pro.beui.dev/components)<br>
**Primary references:** Agent Chat Input, Animated Dropdown, Morphic Card Modal, Morphic Tooltip, Data Table<br>
**Product:** Nebulens AI image creation workspace<br>
**Updated:** 2026-07-30

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

## Motion System

Motion uses `transform`, `opacity`, shared layout IDs, and measured dimensions. New product motion should use `cubic-bezier(0.16, 1, 0.3, 1)`.

| Motion   | Duration    | Use                                               |
| -------- | ----------- | ------------------------------------------------- |
| Fast     | `120-160ms` | Hover, selected state, icon feedback              |
| Standard | `180-240ms` | Dropdown reveal, toolbar changes, attachment tray |
| Morph    | `320-520ms` | Card-to-modal and shared-surface continuity       |

Installed beUI components may keep their internal spring transitions. Product-level additions should avoid elastic overshoot. Under `prefers-reduced-motion`, stop autoplay and replace spatial movement with immediate state changes or short opacity fades.

## Component Language

### Agent Composer

The prompt composer is the signature product surface. Use the installed beUI Agent Chat Input as its interaction model.

- Place it at the center of the creation flow, up to `768px` wide on home and `880px` in the generate workspace.
- Use a `20px` outer radius, muted 3px frame, card-colored inner surface, and no permanent heavy shadow.
- Prompt text starts at `16px` and may reach `18px` on desktop.
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

- Use a full dark first viewport with the beUI Expanding pill navigation, centered product statement, and a functional Agent Composer. The desktop pill stays fixed at the top, expands continuously from `720px` to `960px` over the first `320px` of scroll, and uses one shared-layout surface for hover and current-route emphasis.
- On mobile, reduce the Expanding pill to brand plus menu control and open navigation/actions in a rounded graphite overlay below it. Preserve Escape closing, route-current semantics, and zero horizontal overflow.
- Keep the copy short: brand/product name, one concrete creation promise, and the composer placeholder. Set `Turn your idea` in Geist Variable at 460 weight with slightly tightened word spacing, and `into images` in same-scale Instrument Serif Italic. Align both on one baseline with a deliberate natural-space gap between the font treatments. Retain the restrained upward fade on entry.
- Keep the video, navigation, headline, and Agent Composer within a full `100svh` first viewport. Preserve the video across that complete viewport; pull the creation feed upward into the open space below the composer so the first image row appears within the first viewport rather than starting near the bottom.
- Present the six bundled works with beUI Pro `image-gallery-vertical`: four alternating motion columns on wide screens and the component's compact two-column layout below the large breakpoint. The gallery loops its local images vertically, never horizontally, and has no pagination or previous/next controls. Respect `prefers-reduced-motion` by freezing the columns.
- Keep the home gallery unlabeled and separate it from the Agent Composer with a generous `64-96px` visual gap. Blend its moving columns into the graphite canvas with a long, symmetric multi-stop edge mask instead of a short linear fade. Use real generated images with `16px` radius, subtle borders, a restrained hover zoom, and the shared image-detail modal on primary images.

### Generate (`/generate`)

- Use a precision-first studio: a quiet app rail, one persistent creation bar, and a continuous session feed.
- Do not display a page title or explanatory introduction above the composer. The active workspace and current collection are communicated through navigation state and compact controls.
- The Agent Chat Input owns prompt, attachments, model, ratio, count, quality, visibility, quota, and submit/stop behavior.
- Advanced options open through one Animated Dropdown or responsive side sheet. Core settings stay visible and stable.
- Reference thumbnails live inside the composer tray. Each thumbnail exposes preview and remove; reference roles or influence appear only when the generation API can honor them.
- Generation status reserves the result geometry immediately. Completed batches expose inspect, rerun, use as reference, reuse settings, download, visibility, and delete without requiring the detail modal.
- Reuse and rerun restore the complete supported generation contract, not prompt text alone.
- Image cards morph into the shared detail modal. The modal remains a continuation surface, not a dead-end preview.

### Creation Templates (`/templates`)

- Use an image-led browser with a compact sticky search/filter toolbar and no explanatory hero.
- Template data includes image, title, category, prompt, supported generation settings, favorite state, and recent-use state.
- Each visible template owns a distinct Nebulens raster thumbnail matched to its prompt. Do not reuse third-party page imagery, source-site UI, unrelated in-image copy, logos, or watermarks.
- Search updates immediately. Category and sort controls use Animated Dropdown or a compact segmented filter where the option count is small.
- Cards reveal only high-frequency actions on hover/focus: favorite and quick use. Full prompt, settings, copy, and use live in a Morphic Card Modal.
- Using a template opens Generate with its supported prompt and settings prefilled. Never show a template action that does not reach a working generation state.

### History (`/history`)

- Treat History as the Assets library. Use a compact sticky toolbar, collection rail, image grid/list switch, and optional selection action bar.
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
- Main content max width: `1180px`; composer max width: `880px`.
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

| Product need                                   | Preferred implementation                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| Prompt, attachments, quota, and generation     | `AgentChatInput` Studio Composer                                        |
| Model, ratio, sort, filters, contextual action | `AnimatedDropdown` through shared select/menu wrappers                  |
| Icon guidance                                  | `MorphicTooltip` through `IconTooltip`                                  |
| Image/template inspection and continuation     | `MorphicCard` + `MorphicCardModal`                                      |
| Asset list mode and bulk selection             | beUI `Data Table` adapted to image metadata                             |
| Asset and template browsing                    | beUI `Image Galleries` patterns with product-owned actions              |
| Authentication                                 | beUI `Auth` pattern with existing Better Auth behavior                  |
| Empty and disconnected states                  | beUI `Empty States` adapted to concise product recovery                 |
| User list                                      | Local responsive table using shared tokens and animated pagination menu |
| Buttons                                        | Shared `Button` primitive and icon-button contract                      |
| Navigation                                     | Existing React Router shell restyled with semantic tokens               |

## Quality Gate

- Every route uses the semantic token layer in this document.
- Homepage presents a usable prompt-first beUI experience followed by the beUI Pro six-image vertical gallery.
- Generate, templates, assets, authentication, and image detail preserve existing behavior and satisfy their page-pattern requirements above.
- Dark theme is complete across every route; optional light tokens remain coherent.
- Operational pages contain no visible explanatory subtitles, feature descriptions, tutorials, or keyboard shortcut prose.
- Every visible action works end to end; unsupported provider capabilities are absent rather than disabled decoration.
- No horizontal overflow, clipped text, overlapping controls, or layout shifts at 1440px, 1024px, 768px, 390px, and 320px.
- Typecheck, lint, tests, production build, formatting, whitespace checks, browser console checks, and same-viewport visual QA pass before handoff.
