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
- Use the layered dark workbench canvas and restrained graphite surfaces defined
  by the project. Do not flatten operational pages into one full-black canvas.
- Landing-page measurements follow the prompt-first beUI composition in
  `design.md`. Do not apply home display typography or carousel spacing to admin
  and workbench screens.
- Discover may apply a scoped cool-graphite liquid-glass material directly to the existing beUI Agent
  Chat Input. Implement it as a typed optional prop that composes a continuous full-surface SVG
  directional displacement map, lightly tinted radial sheen, and separate `4-6px` chrome blur behind
  the input content. The Discover material uses one concentric radius stack: a `20px` outer glass
  rim, a `19px` nested BorderGlow shell, and a `16px` content surface. Keep the root overflow and
  interaction hierarchy unchanged, clip only the material layers, preserve the focus-owned
  `BorderGlow` gradient as a masked 1px edge ring plus its outer edge light, disable only the colored
  interior fill layer, keep the root shell stroke transparent in idle and focus states, provide an
  opaque no-filter fallback, and do not carry this material into Generate.
- Keep card radii at 8px or less unless a source primitive requires otherwise.
- Do not add decorative gradients, orbs, fake artwork, or handcrafted SVG icons.
- Route-specific Agent Chat Input submit content must use the typed `submitContent` composition prop
  instead of forking the beUI control. Discover and Generate share `GenerationSubmitCost`, a compact
  credit pill with a Lucide sparkle and `1 * requestedImageCount`; changing the count updates the
  displayed cost from `1` to `4`. Custom idle content must never replace the shared pending stop
  state, accessible action label, disabled semantics, focus treatment, or reduced-motion behavior.
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

## Responsive Layout

- Define stable tracks, aspect ratios, and min/max sizes for carousels, grids,
  upload controls, toolbars, and navigation.
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
  transition={{ layout: { duration: composerIsExpanded ? 0.36 : 0.24, ease: [0.16, 1, 0.3, 1] } }}
>
  <AgentChatInput />
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
