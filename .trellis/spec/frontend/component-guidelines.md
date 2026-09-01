# React Component Guidelines

> **Status**: Verified against the React implementation in `frontend/`.

## Component Contract

- Use named function components and typed prop interfaces.
- Keep route orchestration in `views/`; extract a component when it is reused or
  when a page section has its own interaction contract.
- Prefer composition over boolean-heavy components.
- Keep render functions pure. Network calls, subscriptions, timers, and DOM
  synchronization belong in hooks/effects.
- Use stable domain identifiers for list keys. Never use an array index when
  records can be inserted, removed, or reordered.
- Do not mirror props in state unless the component deliberately owns a draft.

```tsx
import { Button } from "@/components/ui/button";

interface ImageGridProps {
  records: readonly ImageRecord[];
  onOpen: (record: ImageRecord) => void;
}

export function ImageGrid({ records, onOpen }: ImageGridProps) {
  return records.map((record) => (
    <Button
      key={record.id}
      type="button"
      variant="ghost"
      onClick={() => onOpen(record)}
    >
      <img src={toDisplayImageUrl(record.outputUrl)} alt={record.prompt} />
    </Button>
  ));
}
```

## shadcn and beUI

The project uses a shadcn-compatible component layout configured by
`components.json`. beUI dependencies and copied components are source code owned
by this repository, not a runtime black box.

- Put reusable primitives in `src/components/ui/`.
- Use `cn()` from `@/lib/utils` to merge conditional classes.
- Use `class-variance-authority` when a primitive has meaningful visual variants.
- Preserve a primitive's keyboard, focus, disabled, and ARIA behavior when
  restyling it.
- Use Lucide React for familiar interface icons.
- Do not install a second component system for an isolated control.
- Avoid deeply wrapping primitives when a direct prop or class extension is
  sufficient.

## Styling

- Shared color, typography, spacing, radii, and elevation values belong in
  `styles/tokens.css`.
- Global layout and application-specific selectors belong in `styles/base.css`.
- Tailwind utilities are appropriate for small, local arrangements; repeated or
  stateful product surfaces should use a stable class contract.
- Do not style generic descendants such as `.session-batch__header span` when a
  container may host metadata and control groups. Target the semantic element
  class so component-owned `display`, alignment, and gap rules remain authoritative.
- When an icon control uses `IconTooltip` inside a content-sized bubble, give the
  complete Tooltip trigger wrapper its own layout track or position the complete
  wrapper out of document flow. Positioning only the nested button leaves the
  wrapper's inline box as an empty line, while overlaying the full trigger can crowd
  short text. Prefer a semantic two-column layout when the control needs stable
  separation from wrapping copy.

### Generate Prompt Bubble Actions

The Generate user-message bubble is content-sized and contains prompt text only. Put contextual
actions in a sibling `role="toolbar"` below the bubble so hidden or disabled controls never add an
empty grid column inside the painted surface. The toolbar contains Copy and Edit in that order; do
not add Share. Reveal it from the shell's `:hover` and `:focus-within`, and keep it visible for
`hover: none` or coarse-pointer environments. Copy remains available while generation is pending;
Edit preserves the route's pending disabled guard.

```tsx
// Wrong: an invisible button still widens the painted bubble.
<div className="session-batch__prompt session-batch__prompt--editable">
  <p>{prompt}</p>
  <IconTooltip label="编辑提示词"><Button /></IconTooltip>
</div>

// Correct: the bubble owns text; the shell owns contextual operations.
<div className="session-batch__prompt-shell">
  <div className="session-batch__prompt session-batch__prompt--editable"><p>{prompt}</p></div>
  <div className="session-batch__prompt-actions" role="toolbar" aria-label="提示词操作">
    <IconTooltip label="复制提示词"><Button /></IconTooltip>
    <IconTooltip label="编辑提示词"><Button disabled={pending} /></IconTooltip>
  </div>
</div>
```

Pending-state CSS must target `.session-batch__prompt` for surface paint and
`.session-batch__prompt-shell` only for alignment/max-width. Route tests must assert that the
toolbar is not a bubble descendant, prompt metadata and Share are absent, Copy writes the complete
prompt, and pending Edit is disabled without changing bubble child count.

- Use the layered dark workbench canvas and restrained graphite surfaces defined
  by the project. Do not flatten operational pages into one full-black canvas.
- Landing-page measurements follow the prompt-first beUI composition in
  `design.md`. Do not apply home display typography or carousel spacing to admin
  and workbench screens.
- The Discover gallery keeps the prompt-first hero full-bleed while its content
  column follows the operational workspace geometry: center the outer section
  on the post-sidebar rail, cap it with `--workspace-content-max`, and use
  `--workspace-page-gutter` for both the section and its inner gallery. Reset
  the rail offset and reuse the 20px/14px gutter values at the mobile
  breakpoints so gallery media aligns with Templates, Assets, and Users.
- Discover keeps its docking anchor and both Motion layout boundaries visual-neutral. The existing
  beUI Agent Chat Input and its BorderGlow are the only painted composer surface in hero, compact
  docked, and expanded docked states; do not wrap it in another card, glass target, or canvas layer.
- Discover and Generate must use the shared React Bits `BorderGlow` so the orange, cyan, and blue
  palette has one interaction model. Pointer movement writes `--edge-proximity` and
  `--cursor-angle`; `::before` renders the directional mesh border and `.edge-light` renders the
  outer directional glow. Clip the `::before` mesh to its 1px border ring rather than repainting
  `--card-bg` across the padding box: repeating a translucent surface color produces a dark rectangle
  inside the composer. Keep the source-owned `::after` soft-fill layer in the reusable component,
  but pass `fillOpacity={0}` from the shared beUI Agent Chat Input. On this unusually wide, shallow
  composer, the multi-mask fill produces large rectangular color fields inside the text and toolbar
  areas in Chromium. The effect appears only while the pointer is near the edge, or during the
  optional mount sweep. Do not add focus-forced activation attributes, liquid-glass nodes, or
  route-specific replacements for the shared edge layers.

```tsx
// The composer keeps the reusable React Bits component, but its content plane stays unpainted.
<BorderGlow fillOpacity={0} colors={["#ffb51b", "#12c8f4", "#1464ff"]}>
  <AgentChatInputSurface />
</BorderGlow>
```

```css
/* The mesh paints only the edge ring; never repeat a translucent card fill here. */
.border-glow-card::before {
  padding: 1px;
  mask-clip: border-box, border-box, content-box;
  mask-composite: intersect, exclude;
}
```

In Generate, `.agent-chat-input__surface` is a structural layout container only: keep its
background transparent and let it inherit the inner radius. The `BorderGlow` root owns the sole
graphite fill; painting the inset surface creates a second rectangular card over the shared glow.
In the Discover hero idle state, the root owns one semantic static border and the complete graphite
fill while `.border-glow-inner` and `.agent-chat-input__surface` remain transparent. The static
border remains available for focus visibility; focus must not synthesize pointer proximity or force
the glow visible. Route CSS may change the composer's surface material, but must not replace the
shared React Bits algorithm or re-enable the content fill on a composer route. Browser QA must
compare the computed gradient palette, directional masks, edge-light shadows, content-fill
opacity, and root radius at 1440px, 390px, and both Discover docked states.

```css
/* Correct: customize only the route surface; shared pseudo-elements remain authoritative. */
.landing-composer.border-glow-card {
  --card-bg: color-mix(in oklch, var(--card) 76%, transparent);
}
```

- Keep card radii at 8px or less unless a source primitive requires otherwise.
- Do not add decorative gradients, orbs, fake artwork, or handcrafted SVG icons.
- Route-specific Agent Chat Input submit content must use the typed `submitContent` composition prop
  instead of forking the beUI control. Discover and Generate share `GenerationSubmitCost`, a compact
  credit pill with a Lucide sparkle and `1 * requestedImageCount`; changing the count updates the
  displayed cost from `1` to `4`. Custom idle content must never replace the shared pending stop
  state, accessible action label, disabled semantics, focus treatment, or reduced-motion behavior.
- When route CSS widens that idle credit action, expose busy state through a component-owned modifier
  such as `agent-chat-input__submit--stop` and restore the complete beUI icon-button geometry in the
  final state rule: `36-40px` square size, matching `flex-basis`, zero horizontal padding, full radius,
  and a centered filled stop icon. Swapping the React child alone is insufficient because the idle
  pill's width and flex rules remain active. Regression coverage must keep the idle credit content,
  pending accessible name, stop callback, and stop icon distinct.
- Grouped toolbar controls use a stable `40px` outer height. When a grid or
  segmented control contains smaller icon buttons, set `align-items: center`
  on the container and `place-items: center` on each item explicitly; CSS Grid's
  default stretch alignment can leave `32px` buttons visibly above the text
  baseline.

### Docked Discover Composer Alignment

The compact editor, streaming placeholder, add action, and submit action must share one vertical
center line. In the expanded state, a single rendered text line must center within the editor while
multiline content keeps its natural growth and scrolling behavior. The desktop editor is `76px`
tall, while the `<=860px` editor is `86px`; do not reuse desktop vertical padding or placeholder
offsets at the mobile breakpoint.

```css
/* Correct: preserve total padding while calibrating each editor height. */
.is-docked.is-expanded .agent-chat-input__textarea {
  padding-block: 27px 10px;
}

@media (max-width: 860px) {
  .is-docked.is-expanded .agent-chat-input__textarea {
    padding-block: 31px 6px;
  }
}
```

For browser QA, compare the rendered text `Range` center to the editor center rather than comparing
element boxes alone. Keep the delta below `1px` at desktop and `390px` mobile, and require zero
horizontal document overflow.

### Image-led Library Assets

- Every visible template in an image-led library uses a semantically matched,
  product-owned raster asset. Do not repeat a small source set across differently
  named templates.
- Reject assets that contain third-party branding, source-site navigation,
  unrelated poster copy, watermarks, or text that contradicts the template.
- Keep template thumbnails under `public/media/templates/` and store their stable
  public URLs in the structured template data.
- Route tests must assert that every template image resolves and that the number
  of unique image URLs matches the number of visible templates.

```tsx
// Wrong: distinct template contracts share source-site imagery.
const templates = [
  { id: "campaign", imageUrl: "/media/source-card.jpg" },
  { id: "packaging", imageUrl: "/media/source-card.jpg" },
];

// Correct: each contract owns a purpose-built visual.
const templates = [
  { id: "campaign", imageUrl: "/media/templates/template-07.webp" },
  { id: "packaging", imageUrl: "/media/templates/template-09.webp" },
];
```

### Assets Media Geometry

The Assets grid preserves each record's source `width / height` ratio on the outer
`.image-tile__morph` layout participant. Do not put the ratio only on the nested preview Button:
the shared Button baseline has square geometry, while the MorphicCard wrapper is the box measured by
the grid and Motion layout. The preview fills that wrapper and the image uses `object-fit: contain` so
source media is not cropped. Disable the shared preview hover scale in the Assets route because a
scaled image inside the clipped media wrapper loses its outer edges.

Assets overlay actions live inside `.image-tile__morph` as a labelled `role="toolbar"`. Compose the
shared beUI `Button` with `variant="secondary"` and `size="icon"`, wrapped by `IconTooltip`; do not
strip the button surface and replace it with a page-local toolbar slab. The toolbar container is
visual-neutral: it owns only bottom-right positioning, spacing, pointer state, and opacity/transform
reveal. Keep each icon control at `32px × 32px`, use `flex: 0 0 32px`, and center a `15px` Lucide icon.
Reveal the toolbar from the complete `.image-tile` hover or `focus-within` state, not only from the
nested media wrapper. The selection and favorite controls sit outside `.image-tile__morph`; binding
the complete state to that wrapper makes the toolbar translate or lose pointer events when the cursor
moves to a top control. Keep the toolbar visible and interactive for coarse pointers. This preserves
beUI hover/focus styling while generated media remains the dominant surface.

The top selection and favorite controls use the same translucent semantic surface as the bottom
secondary actions: mix `var(--card)` at `78%` for rest and `var(--surface-hover)` at `88%` for hover.
Apply transparency to `background`, never to the complete button, so icons and focus treatment remain
fully opaque. The selected checkbox state remains authoritative and may replace this surface with
`var(--primary)`.

For overlay controls wrapped in `IconTooltip`, position the complete Tooltip trigger when it needs an
independent anchor; positioning only the nested Button leaves an empty inline trigger in document
flow. At `1600px` and wider, use five columns so the `1580px` workspace does not produce oversized
thumbnails. Regression coverage must include square, landscape, and portrait records, toolbar
semantics and beUI button variants, plus a CSS contract that rejects a background, border, or blur on
the toolbar container. On hover-capable devices, keep an unselected multi-select control hidden at
rest, reveal its Lucide `Square` on card hover or keyboard focus, and keep the selected `Check`
visible. On coarse-pointer devices, keep the control visible so per-item selection remains usable.

```tsx
<MorphicCard style={{ aspectRatio: `${record.width} / ${record.height}` }}>
  <Button className="image-tile__preview">
    <img src={imageUrl} alt={record.prompt} />
  </Button>
</MorphicCard>
```

```css
.assets-page .image-tile__preview {
  width: 100%;
  height: 100%;
  aspect-ratio: inherit;
}

.assets-page .image-tile__preview:hover img {
  transform: none;
}

.assets-page .image-tile__select {
  opacity: 0;
  pointer-events: none;
}

.assets-page .image-tile:hover .image-tile__select,
.assets-page .image-tile:focus-within .image-tile__select,
.assets-page .image-tile.is-selected .image-tile__select {
  opacity: 1;
  pointer-events: auto;
}

.assets-page .image-tile__actions button {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
}

/* Wrong: a route-owned slab hides the beUI control language. */
.assets-page .image-tile__actions {
  background: rgb(0 0 0 / 90%);
  backdrop-filter: blur(12px);
}

/* Correct: the container positions shared beUI secondary icon buttons only. */
.assets-page .image-tile__actions {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: max-content;
  gap: 6px;
}

.assets-page .image-tile__actions button {
  background: color-mix(in oklch, var(--card) 78%, transparent);
}

.assets-page .image-tile__select,
.assets-page .image-tile__favorite {
  background: color-mix(in oklch, var(--card) 78%, transparent);
}

.assets-page .image-tile:hover .image-tile__actions,
.assets-page .image-tile:focus-within .image-tile__actions {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

@media (min-width: 1600px) {
  .assets-page .image-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
```

For the beUI Data Table adapter in the user-management view, define desktop column tracks once on
the table container and reference them from both the header row and data rows. A content-sized
action column in only the data rows shifts every preceding header boundary; reserve the action
button group width explicitly, then override to the existing labelled record layout below the
desktop breakpoint.

### GPT Image 2 Template Manifest

When a prompt gallery is imported into the template route, keep the complete
catalog in `src/data/creationTemplates.json` and keep the raster files under
`public/media/templates/gpt-image2/`. Each item must expose `id`, `title`,
`category`, `prompt`, `sourcePath`, `sourceUrl`, `width`, `height`, and a local
`imageUrl`. `src/data/creationTemplates.ts` is the typed normalization boundary;
views must consume `CREATION_TEMPLATES` rather than maintaining a second image or
prompt array. This keeps the landing gallery, template route, and generation
handoff synchronized while allowing the catalog to grow without duplicating
route code.

```ts
const entries = CREATION_TEMPLATES.map(templateToHistoryEntry);
```

The Discover gallery and the template route's default `featured` order must
use `orderTemplatesWithAnimeLast(CREATION_TEMPLATES)`: general-purpose
categories retain manifest order, followed by the `动漫漫画` category in its
manifest order. Apply this priority only to the default content order. Explicit
user choices such as recent-use or title sorting remain authoritative. Route
tests must assert the category boundary rather than inferring category from
image filename prefixes.

Operational `.workspace-page` routes sit after the collapsed floating sidebar
rail. Use the shared `--workspace-sidebar-rail` token for desktop `.app-main`
padding and reset it to `0` at the mobile breakpoint where the sidebar is
hidden; do not reuse the expanded `--sidebar-width` value for this canvas.

## Responsive Layout

- Define stable tracks, aspect ratios, and min/max sizes for carousels, grids,
  upload controls, toolbars, and navigation.
- Treat fixed mobile navigation and page-level sticky controls as one vertical
  stack. Page content must clear the fixed header, and sticky toolbars must use
  the same header-plus-safe-area offset instead of attaching to viewport top.
- Define explicit tablet tracks for media grids and recompose dense tables into
  labeled records before their minimum columns would create page overflow. Do
  not rely on desktop tracks to shrink naturally between desktop and mobile.
- Test at 1440px desktop and 390px mobile at minimum.
- Page content must not create horizontal document overflow.
- Desktop navigation may collapse to fixed mobile navigation, but every route and
  primary action must remain reachable.
- Text must wrap without overlapping adjacent controls.

## Interaction and Motion

- Buttons use `<button type="button">` unless they submit a form.
- Links use React Router `Link`/`NavLink` for in-app navigation.
- Use Motion or CSS transitions only when motion explains state or continuity.
- Autoplay surfaces must pause on hover and keyboard focus. The Discover image gallery is intentionally static and unmasked: render each work once per responsive gallery at full opacity, without vertical loop tracks, animation timing styles, or top/bottom edge fades.
- Discover uses one Agent Chat Input instance across hero and gallery browsing. When its reserved anchor leaves the viewport, the same component becomes a bottom-fixed compact prompt bar; prompt pointer or keyboard focus expands the full toolbar in place. Keep a pointer-transparent black-to-transparent backdrop behind the dock, preserve the anchor's document height so gallery results do not shift, and undock when scrolling back to the hero.
- Animate the docked Discover composer with Motion layout projection on a wrapper that is enabled from
  the component's first render. Keep `layoutDependency` scoped to the compact/expanded state so prompt
  edits do not trigger extra measurements. React applies the final geometry once; the projection owns
  the visible `transform`, while auxiliary controls may transition only `transform` and `opacity`.
  Never transition `width`, height constraints, padding, positioning, `flex-basis`, radius, background,
  border, or shadow during this morph. Disable layout projection for `prefers-reduced-motion` and switch
  state immediately without remounting the underlying `AgentChatInput`.

```tsx
<motion.div
  layout={!reducedMotion}
  layoutDependency={composerIsExpanded}
  transition={{
    layout: {
      duration: composerIsExpanded ? 0.36 : 0.24,
      ease: [0.16, 1, 0.3, 1],
    },
  }}
>
  <AgentChatInput />
</motion.div>
```

Because the surface projection scales the full outer box, place the existing `AgentChatInput` inside a
nested `layout="position"` Motion boundary. The nested projection must counteract the parent's scale so
text, icons, and `40px` toolbar controls keep their rendered size throughout both directions. Browser QA
must sample a readable child/control over multiple animation frames, not only the outer transform or the
settled frame. On desktop, center the fixed dock on the same `calc(50% + 64px)` line as
`.landing-hero__content`; keep the `<=860px` override at `50%`.

```tsx
<motion.div layout={!reducedMotion} layoutDependency={composerIsExpanded}>
  <motion.div
    layout={reducedMotion ? false : "position"}
    layoutDependency={composerIsExpanded}
  >
    <AgentChatInput />
  </motion.div>
</motion.div>
```

- Honor `prefers-reduced-motion`; disable autoplay video and remove nonessential
  transitions for reduced-motion users.
- Dense history rails use one shared `Button` for each result batch currently rendered in
  the feed, in the same order as those result nodes. Hover or focus may reveal a contextual
  preview, but must not trigger a large overlay; direct tick or preview activation scrolls
  to the matching existing result without inserting, removing, or reordering feed items.
  A separate accessible secondary action opens complete search or management and may append
  a missing historical result without moving existing results. While the overlay is open,
  mark the tick group hidden, set every tick to `tabIndex={-1}`, and disable pointer hits.
  Preserve a pointer-safe corridor and delayed leave between the tick, preview, and overlay
  without expanding the main layout track; a focused preview or overlay must not close on
  pointer leave. Direct-navigation active emphasis is transient and clears when pointer or
  focus leaves the complete history interaction region; hover/focus emphasis remains independent.
- A fixed-composer result feed may expose one shared circular `Button` immediately above the
  composer to return to its latest batch. Use a `42px` desktop target and a `40px` narrow-screen
  target for this secondary action. Derive visibility from the actual window scroll container,
  latest batch bounds, and live composer bounds; listen to window scroll/resize and observe the feed,
  latest batch, and composer for element resize without changing feed order. Compute the window scroll
  target from current rectangles so the latest batch bottom lands about `24px` above the composer;
  do not delegate this clearance to `scrollIntoView` plus static scroll margins. Smooth-scroll by
  default, switch to immediate scrolling for reduced motion, and keep the control attached to the
  composer so dynamic composer height and mobile navigation cannot overlap it. Hide the control only
  after the complete batch bottom clears the composer boundary and a meaningful batch area is visible.

### Generate Workspace Vertical Rhythm

The fixed Generate composer uses one `16px` supplemental bottom gap in empty and populated states.
On mobile, add that gap after the `74px` bottom navigation and `safe-area-inset-bottom`; do not replace
the navigation avoidance with the gap. Keep the empty-state illustration formulas on the same base so
moving the composer does not change their relative separation.

```css
.generation-console.has-results .studio-create-bar {
  bottom: 16px;
}

@media (max-width: 560px) {
  .generation-console.has-results .studio-create-bar {
    bottom: calc(74px + 16px + env(safe-area-inset-bottom));
  }
}
```

On desktop, a populated session begins with `clamp(64px, 9svh, 112px)` top padding so large workbench
viewports do not pin the conversation to the top chrome. At `<=860px`, use `64px` so the first batch
clears the fixed `56px` mobile header. When changing these values, search every later Generate media
query: narrow-screen rules intentionally repeat the empty-state padding, composer bottom, and
illustration offset. Browser QA must measure the first batch, header boundary, composer bottom, and
last-batch clearance at 1440 x 813 and 390 x 844.

- Generate-result skeletons must preserve the requested count, aspect ratio, and
  final responsive grid tracks. Use the source-owned AICSS Image Generation dot
  field with separate square, landscape, and portrait masks, a quiet morph and
  breathing state, and the requested ratio/resolution label. Do not show a fake
  percentage. Disable every loop for reduced motion, reveal loaded images with a
  roughly 220ms opacity/scale transition, and replace failures with an equal-ratio
  retry card.
- Keep carousel dimensions stable while slides move. The landing carousel uses
  five virtual slots, three visible positions, 5-second autoplay, and an 800ms
  transition.

## Dialogs and Feedback

- Dialogs must have an accessible name, initial focus, Escape close, backdrop
  close where safe, and focus-visible controls.
- Destructive actions require explicit wording and must not be implied by an icon
  alone.
- Generate and Assets destructive actions use the shared `ConfirmActionModal`
  alert dialog instead of `window.confirm`; keep cancel, confirm, focus return,
  pending guards, and 320px action layout intact.
- Use `ToastProvider` for short completion/error feedback and inline text for
  errors that the user must correct in place.
- Loading, empty, error, unauthorized, and forbidden states are first-class UI
  states, not blank containers.

### Assets Empty-State Contract

- Determine a truly empty asset library from `history.entries.length === 0`, after authentication
  and history hydration settle. Render the source-owned beUI `EmptyStateArchive` with the heading
  `还没有资产`, one concise sentence, and a shared `Button` that navigates to `/generate`.
- A non-empty library whose `filtered` array is empty is a no-results state, not an empty library.
  Keep `暂无符合条件的资产。` in that branch so search, date, visibility, favorites, and collection
  filters do not falsely suggest that the account has never created anything.
- Do not render `EmptyStateArchive` over the initial hydration skeleton or an empty-library hydration
  error. The error and retry path remain authoritative until a successful refresh.
- Route tests must cover the true-empty branch, the action route, and the filtered-empty branch as
  separate visible outcomes.

### Landing Account and Daily Check-in

- Compose the discovery header from the shared `Button`, `IconTooltip`, and
  `MorphPopover` primitives. Desktop order is Templates, Notifications,
  Personal Credits, Account; do not replace this with raw controls or a
  page-local popover implementation.
- The credits trigger reads `QuotaResponse.remaining` and exposes the current
  check-in state in its accessible name. Its popover must render pending,
  available, claimed, guest, and error behavior without optimistic fake points.
- `POST /api/images/quota/check-in` is the only mutation path. On success,
  replace the quota store with the returned snapshot so the header and every
  composer show the same `total`, `remaining`, `checkedInToday`, and
  `dailyCheckInReward` values.
- Keep the desktop cluster fixed inside the discovery viewport without causing
  horizontal overflow. Below `860px`, hide it and surface the same account,
  credits, and check-in operation through `LandingSidebar`.
- On desktop, align the fixed account cluster to the collapsed sidebar brand's
  `50px` vertical center line. The `44px` cluster therefore starts at `28px`;
  do not independently anchor it to the viewport's original `16px` inset.
- A successful daily check-in is acknowledged by the popover/sidebar changing to its claimed
  state; do not add a second success Toast for the same action. Keep the error Toast for failed
  check-ins so the user still receives recovery guidance when the mutation fails.
- Popovers close on outside pointer interaction and Escape, preserve their
  trigger relationship through ARIA attributes, and reduce spatial motion to a
  short opacity transition under `prefers-reduced-motion`.

## Forms and Uploads

- Every field has a visible label or a programmatic accessible name.
- Validate cheap constraints before network IO and keep backend errors intact
  enough to present actionable Chinese messages.
- Upload controls support click, drag/drop, and paste where the workflow expects
  them. Enforce type, count, and size limits before upload.
- Binary settings use switches or checkboxes; modes use segmented controls;
  bounded numeric settings use inputs, steppers, or sliders.

## Forbidden Patterns

- Raw visible `<button>`, `<input>`, `<textarea>`, or `<select>` elements outside
  `src/components/ui/` and `src/components/premium/`. Browser-required hidden controls must be
  recorded as exact exceptions in `frontend/component-provenance.json`.
- Direct Radix imports outside shared component roots, imports from competing component systems,
  and `window.confirm` / `window.alert` / `window.prompt`.
- Anonymous default-export components.
- Fetch calls or response casting inside visual components.
- Click handlers on non-interactive `div` elements.
- Index keys for mutable lists.
- Duplicated icon SVG paths.
- Component-local copies of shared design tokens.
- Animation without reduced-motion behavior.
- Desktop-only controls with no mobile equivalent.
- Reused third-party or text-bearing source imagery in product-owned template cards.
