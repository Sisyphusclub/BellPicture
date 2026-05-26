# Research: Current Frontend UI Audit

- **Query**: Audit the Ref2Image_Studio frontend UI styles for inconsistency hot spots. Inspect `frontend/src/styles/tokens.css`, `frontend/src/styles/base.css`, `frontend/src/App.vue`, `frontend/src/views/DiscoverView.vue`, `frontend/src/views/GenerateView.vue`, `frontend/src/views/HistoryView.vue`, and gallery/common/auth/upload components. Focus on spacing, typography, colors, radius, shadows/glass blur, buttons, fields, panels, modals, and responsive rhythm.
- **Scope**: internal
- **Date**: 2026-05-25

## Findings

### Files Found

| File Path | Description |
|---|---|
| `frontend/src/styles/tokens.css` | Global color, font, radius, shadow, spacing, and layout token definitions. |
| `frontend/src/styles/base.css` | Global reset, container, display heading, section kicker, button, form field, and meta-list primitives. |
| `frontend/src/App.vue` | App-level video backdrop, global shell, main spacing offset for the fixed sidebar. |
| `frontend/src/views/DiscoverView.vue` | Thin wrapper that renders `GenerateView` with `mode="discover"`; discover page styles come from `GenerateView.vue`. |
| `frontend/src/views/GenerateView.vue` | Main discover/generate workspace, fixed/docked composer, stage/result surfaces, side history rail, hero, recent gallery modal mount. |
| `frontend/src/views/HistoryView.vue` | Image-management page, filters, date picker styling, history card wrapper, and custom history detail modal shell. |
| `frontend/src/components/common/AppHeader.vue` | Fixed left/bottom navigation, account menu, glass sidebar/chrome. |
| `frontend/src/components/common/AppFooter.vue` | Dark footer component; no imports found in `frontend/src/**/*.vue` or `frontend/src/**/*.ts` during this audit. |
| `frontend/src/components/auth/LoginModal.vue` | Element Plus dialog styled as warm off-white login/register modal. |
| `frontend/src/components/upload/ImageDropzone.vue` | Standalone upload dropzone component; no imports found in `frontend/src/**/*.vue` or `frontend/src/**/*.ts` during this audit. |
| `frontend/src/components/gallery/RecentCreationsMasonry.vue` | Public-gallery masonry grid and image cards on discover/home. |
| `frontend/src/components/gallery/RecentCreationDetailModal.vue` | Public-gallery image detail overlay, dark inspection panel, save/remix actions. |
| `frontend/src/components/gallery/HistoryGrid.vue` | History image tile grid, quick actions, empty state. |
| `frontend/src/components/gallery/HistoryDetailPanel.vue` | Inner content for history detail modal, expanded image viewer, metadata, prompt textarea, actions. |
| `frontend/src/components/gallery/GenerationStatusPanel.vue` | Dark status panel component; no imports found in `frontend/src/**/*.vue` or `frontend/src/**/*.ts` during this audit. |
| `frontend/src/router/index.ts` | Routes `/`, `/generate`, and `/history` to Discover, Generate, and History views. |

### Related Routing / Composition

- `frontend/src/views/DiscoverView.vue:1-7` contains only an import of `GenerateView` and `<GenerateView mode="discover" />`, so the discover/home surface shares `GenerateView.vue` styles.
- `frontend/src/router/index.ts` maps `/` to `DiscoverView`, `/generate` to `GenerateView`, and `/history` to `HistoryView`.
- `frontend/src/views/GenerateView.vue:1018-1022` mounts `RecentCreationDetailModal`, so the gallery modal is part of the discover/generate surface.
- `frontend/src/views/HistoryView.vue:254-260` mounts `HistoryGrid`; `frontend/src/views/HistoryView.vue:263-301` wraps `HistoryDetailPanel` in the history modal shell.

### Code Patterns

#### 1. Token layer exists, but local styles often bypass it

- `frontend/src/styles/tokens.css:4-87` defines the central token layer.
- Surface tokens live at `frontend/src/styles/tokens.css:5-18`, text tokens at `frontend/src/styles/tokens.css:20-29`, accent/state tokens at `frontend/src/styles/tokens.css:34-45`, radii at `frontend/src/styles/tokens.css:56-63`, shadows at `frontend/src/styles/tokens.css:65-69`, spacing at `frontend/src/styles/tokens.css:71-79`, and layout at `frontend/src/styles/tokens.css:81-86`.
- The token file itself mixes OKLCH tokens and raw hex/rgba values: text and accents include `#1f1d1a`, `#34302b`, `#8f8a83`, `#cc785c`, `#5db8a6`, and `#c64545` at `frontend/src/styles/tokens.css:21-45`.
- Local component CSS frequently adds one-off colors outside tokens, for example:
  - `frontend/src/views/GenerateView.vue:1200-1215` uses `#34302b`, `#8e887f`, and `#514b44` in sidebar text/actions.
  - `frontend/src/views/GenerateView.vue:1360-1380` uses `#292521` and `#746f86` in generation prompt/model text.
  - `frontend/src/components/gallery/RecentCreationDetailModal.vue:327-337` uses dark rgba surfaces plus `linear-gradient(135deg, #8157ff, #a66cff)` and `#fff` for the remix action.
  - `frontend/src/components/auth/LoginModal.vue:331-343` uses `var(--color-accent, oklch(...))` for submit background and `#fff` for submit text.

#### 2. Typography hierarchy differs by surface

- Global base type is 16px, line-height 1.55, and `var(--font-body)` in `frontend/src/styles/base.css:14-23`.
- Global display heading uses `var(--font-display)`, 400 weight, `letter-spacing: -0.03em`, and line-height 1.05 in `frontend/src/styles/base.css:51-58`.
- The token font setup imports Geist, Instrument Serif, Noto Serif SC, and LXGW WenKai at `frontend/src/styles/tokens.css:1-2`; `--font-display`, `--font-brand`, and `--font-body` all point primarily to Geist at `frontend/src/styles/tokens.css:48-54`.
- Home/discover hero uses a large display treatment with English copy and a serif italic span: template at `frontend/src/views/GenerateView.vue:721-729`, style at `frontend/src/views/GenerateView.vue:1639-1657` (`80px` title and `100px` serif span on desktop).
- History page heading uses a more compact page-title pattern: `frontend/src/views/HistoryView.vue:331-347` (`12px` uppercase kicker, `clamp(30px, 3.2vw, 44px)` title, 700 weight).
- Gallery section heading uses a smaller centered heading: `frontend/src/components/gallery/RecentCreationsMasonry.vue:119-141` (`22px`, 800 weight, 13px description).
- Recent detail modal uses English labels in some controls and headings: `PROMPT` and `Copy` at `frontend/src/components/gallery/RecentCreationDetailModal.vue:80-94`, while most application copy is Simplified Chinese.

#### 3. Spacing rhythm uses tokens plus multiple one-off pixel systems

- Global spacing tokens are 4/8/12/16/24/32/48/96px at `frontend/src/styles/tokens.css:71-79`.
- Global `.container` uses `100% - 48px`, reduced to `100% - 24px` on mobile at `frontend/src/styles/base.css:46-49` and `frontend/src/styles/base.css:186-189`.
- App main offsets the fixed sidebar with `padding-left: calc(var(--app-sidebar-width) + 28px)` at `frontend/src/App.vue:61-64`, then removes it at `frontend/src/App.vue:66-72`.
- History page uses `gap: 32px` and `padding: 96px 40px var(--space-section)` at `frontend/src/views/HistoryView.vue:307-315`, then switches to tokenized mobile padding at `frontend/src/views/HistoryView.vue:660-663`.
- Generate stage uses its own rail formula and top spacing: `--stage-rail-width` at `frontend/src/views/GenerateView.vue:1265-1267`, stage padding `74px 0 0` at `frontend/src/views/GenerateView.vue:1326-1334`, and mobile top padding `42px` at `frontend/src/views/GenerateView.vue:2193-2195`.
- Home hero uses a separate vertical rhythm: `padding: 214px 24px 0`, `gap: 20px` at `frontend/src/views/GenerateView.vue:1619-1628`, changing to 180px at `frontend/src/views/GenerateView.vue:2139-2145` and 96px at `frontend/src/views/GenerateView.vue:2226-2230`.
- Gallery masonry uses `margin: 62px auto 120px`, `gap: 12px` at `frontend/src/components/gallery/RecentCreationsMasonry.vue:114-156`.
- Common/sidebar components use their own local rhythm, for example AppHeader `top/bottom/left` fixed offsets and `gap: 26px` at `frontend/src/components/common/AppHeader.vue:152-170`.

#### 4. Radius vocabulary is broad and locally expanded

- Token radii are `4px`, `12px`, `18px`, `24px`, `28px`, and pill/full at `frontend/src/styles/tokens.css:56-63`.
- Global `.claude-button` and form fields use `var(--radius-sm)` (`12px`) at `frontend/src/styles/base.css:82-100` and `frontend/src/styles/base.css:135-145`.
- Composer panels use `24px`: `frontend/src/views/GenerateView.vue:1668-1681`; docked composer inherits it at `frontend/src/views/GenerateView.vue:1978-1990`.
- History card uses literal `24px` at `frontend/src/views/HistoryView.vue:585-592`; history modal panel uses literal `28px` at `frontend/src/views/HistoryView.vue:621-630`.
- Recent gallery cards use `10px` at `frontend/src/components/gallery/RecentCreationsMasonry.vue:162-172`, while history tiles use `var(--radius-sm)` (`12px`) at `frontend/src/components/gallery/HistoryGrid.vue:120-126`.
- AppHeader uses 24px shell radius, 18px brand/link radius, 15px mobile brand radius, and 22px mobile shell radius at `frontend/src/components/common/AppHeader.vue:152-180` and `frontend/src/components/common/AppHeader.vue:296-315`.
- History detail prompt textarea uses `var(--radius-xs)` (`4px`) at `frontend/src/components/gallery/HistoryDetailPanel.vue:392-405`, smaller than most product fields.

#### 5. Shadows and glass blur vary sharply by surface

- Global shadows are defined at `frontend/src/styles/tokens.css:65-69`, including `--shadow-glass`, `--shadow-soft`, and `--shadow-button`.
- Base primary button uses `--shadow-button` at `frontend/src/styles/base.css:107-115`.
- AppHeader is a cool-tinted glass sidebar with `box-shadow: 0 18px 44px rgba(48, 88, 126, 0.08)` and `backdrop-filter: blur(22px)` at `frontend/src/components/common/AppHeader.vue:152-170`.
- Generate workspace sidebar is a warm glass rail with `backdrop-filter: blur(18px)` at `frontend/src/views/GenerateView.vue:1034-1042`.
- Generate stage background adds blue/purple radial gradients and a grid mask at `frontend/src/views/GenerateView.vue:1276-1307`.
- Composer uses a prominent shadow and, when docked, blur: base composer at `frontend/src/views/GenerateView.vue:1668-1681`; docked composer at `frontend/src/views/GenerateView.vue:1978-1990`.
- Generation action pills use shadow and blur at `frontend/src/views/GenerateView.vue:1552-1568`; hover increases shadow and translates the button at `frontend/src/views/GenerateView.vue:1575-1579`.
- History date picker and history modal are flat/no-shadow: date picker popper at `frontend/src/views/HistoryView.vue:433-451`, history card at `frontend/src/views/HistoryView.vue:585-592`, modal panel at `frontend/src/views/HistoryView.vue:621-630`.
- Login modal is also flat/no-shadow: overlay and dialog at `frontend/src/components/auth/LoginModal.vue:182-197`, input wrappers at `frontend/src/components/auth/LoginModal.vue:231-254`.
- Recent gallery cards use image-card shadows and elevation on hover at `frontend/src/components/gallery/RecentCreationsMasonry.vue:162-180`.
- Recent creation detail modal uses a dark, blurred overlay with `backdrop-filter: blur(18px) brightness(0.52)` at `frontend/src/components/gallery/RecentCreationDetailModal.vue:135-147`, and dark prompt card at `frontend/src/components/gallery/RecentCreationDetailModal.vue:208-216`.

#### 6. Button vocabularies are duplicated across screens

- Global `claude-button` primitive is defined at `frontend/src/styles/base.css:82-125`, with 40px min-height, 12px radius, 14px text, primary dark fill, and secondary glass fill.
- History page defines a separate `.history-btn` system at `frontend/src/views/HistoryView.vue:531-574`, with 44px height, 12px radius, 14px/700 text, primary dark gradient/inset shadow, and ghost glass variant.
- Generate sidebar primary action `.sidebar-new` is another 48px dark-gradient button at `frontend/src/views/GenerateView.vue:1069-1085`.
- Generate composer submit `.prompt-showcase__generate` is a 40px pill at `frontend/src/views/GenerateView.vue:1877-1895`, with disabled gray fill and enabled dark gradient/inset shadow.
- Generate result actions `.generation-action` are 38px pill glass buttons at `frontend/src/views/GenerateView.vue:1552-1573`.
- Login submit `.login-modal__submit` is a 44px, 12px-radius, accent/coral full-width button at `frontend/src/components/auth/LoginModal.vue:331-349`.
- Recent detail modal actions are 42px pill buttons with dark translucent save and purple remix variants at `frontend/src/components/gallery/RecentCreationDetailModal.vue:290-337`.
- History detail panel uses the global `claude-button` primitive for rerun/download and a text-only remove action at `frontend/src/components/gallery/HistoryDetailPanel.vue:195-207`; it explicitly removes shadows from those buttons at `frontend/src/components/gallery/HistoryDetailPanel.vue:430-439`.

#### 7. Field and control styling has multiple focus treatments

- Global fields use border color plus a coral-tinted `box-shadow` focus ring at `frontend/src/styles/base.css:135-157`.
- History date filter uses border color plus `outline: 2px solid oklch(... / 0.28)` at `frontend/src/views/HistoryView.vue:356-375`; the Element Plus date picker internals are made transparent/no-shadow at `frontend/src/views/HistoryView.vue:382-431`.
- Login modal Element Plus inputs use custom warm wrappers and no focus shadow; focus changes border only at `frontend/src/components/auth/LoginModal.vue:231-254`.
- Generate composer textarea removes native outline at `frontend/src/views/GenerateView.vue:1697-1708`; related composer add/select/stepper/generate controls in `frontend/src/views/GenerateView.vue:1684-1895` do not define explicit `:focus-visible` styles in the inspected style block.
- History grid uses 3px focus outlines on thumbnail/action/copy controls at `frontend/src/components/gallery/HistoryGrid.vue:147-152`.
- Recent masonry image buttons remove focus outline and replace the focused state with transform/shadow plus metadata reveal at `frontend/src/components/gallery/RecentCreationsMasonry.vue:175-180` and `frontend/src/components/gallery/RecentCreationsMasonry.vue:226-231`.
- Recent detail modal uses a purple focus outline at `frontend/src/components/gallery/RecentCreationDetailModal.vue:339-345`, separate from the coral OKLCH focus rings used in history/login surfaces.

#### 8. Panels, cards, and image surfaces use several visual languages

- Base/global product surfaces are warm cream/off-white in `tokens.css` (`frontend/src/styles/tokens.css:5-18`).
- The main composer is a warm off-white panel with hairline border, 24px radius, and shadow at `frontend/src/views/GenerateView.vue:1668-1681`.
- History card is a flat warm panel with no shadow at `frontend/src/views/HistoryView.vue:585-592`.
- History grid tiles are flat, warm, no-shadow image cells at `frontend/src/components/gallery/HistoryGrid.vue:120-145`.
- Recent gallery cards are image-forward, smaller-radius, shadowed, hover-lifting cards at `frontend/src/components/gallery/RecentCreationsMasonry.vue:162-180`.
- Generate result frames share a purple-tinted border and shadow at `frontend/src/views/GenerateView.vue:1392-1400`; loading placeholder uses purple dot/grid gradients and shimmer at `frontend/src/views/GenerateView.vue:1403-1434`.
- History detail image area uses a warm gradient with raw hex colors at `frontend/src/components/gallery/HistoryDetailPanel.vue:238-245`; expanded viewer stage uses warm off-white with border and 22px radius at `frontend/src/components/gallery/HistoryDetailPanel.vue:333-349`.
- `GenerationStatusPanel` uses a dark-panel vocabulary (`var(--color-surface-dark)`) and code block styling at `frontend/src/components/gallery/GenerationStatusPanel.vue:35-80`; no imports were found for this component in the inspected source tree.

#### 9. Modal and popup surfaces split between warm flat and dark/glass treatments

- Frontend spec documents a modal/popup convention for warm off-white background, hairline border, generous radius, and no box-shadow/backdrop blur for popup surfaces in `.trellis/spec/frontend/component-guidelines.md:299-339`.
- History custom modal follows the warm/no-shadow direction: backdrop at `frontend/src/views/HistoryView.vue:611-619`, panel at `frontend/src/views/HistoryView.vue:621-630`, close button at `frontend/src/views/HistoryView.vue:639-657`.
- Login modal follows the warm/no-shadow direction via Element Plus overrides at `frontend/src/components/auth/LoginModal.vue:182-197` and `frontend/src/components/auth/LoginModal.vue:210-229`.
- History date picker popper also removes shadow, filter, and backdrop-filter at `frontend/src/views/HistoryView.vue:433-451`.
- Recent creation detail modal uses a different dark immersive treatment with blurred/dimmed backdrop at `frontend/src/components/gallery/RecentCreationDetailModal.vue:135-147`, dark prompt card at `frontend/src/components/gallery/RecentCreationDetailModal.vue:208-216`, and purple action/focus accents at `frontend/src/components/gallery/RecentCreationDetailModal.vue:327-345`.
- Account menu popup in AppHeader uses warm off-white and hairline border at `frontend/src/components/common/AppHeader.vue:268-294`, without shadow/blur on the menu itself.
- Composer aspect/model menus use warm off-white, 16px radius, no shadow at `frontend/src/views/GenerateView.vue:1793-1805`.

#### 10. Responsive breakpoints are component-local rather than centralized

- Global container breakpoint is `max-width: 767px` in `frontend/src/styles/base.css:186-194`.
- App shell and AppHeader use `max-width: 760px` at `frontend/src/App.vue:66-72` and `frontend/src/components/common/AppHeader.vue:296-364`.
- GenerateView uses `max-width: 1180px`, `1100px`, and `860px` at `frontend/src/views/GenerateView.vue:2134-2239`.
- HistoryView uses `max-width: 720px` for date picker popper and `860px` for page/modal layout at `frontend/src/views/HistoryView.vue:502-529` and `frontend/src/views/HistoryView.vue:660-701`.
- HistoryGrid uses `1180px`, `860px`, and `540px` breakpoints at `frontend/src/components/gallery/HistoryGrid.vue:261-277`.
- RecentCreationsMasonry uses `860px` and `560px` breakpoints at `frontend/src/components/gallery/RecentCreationsMasonry.vue:265-280`.
- RecentCreationDetailModal uses `900px` and `520px` breakpoints at `frontend/src/components/gallery/RecentCreationDetailModal.vue:355-414`.
- ImageDropzone uses `520px` at `frontend/src/components/upload/ImageDropzone.vue:226-230`.
- AppFooter uses `640px` at `frontend/src/components/common/AppFooter.vue:58-62`.

#### 11. Motion/reduced-motion coverage exists in GenerateView only

- GenerateView defines hero entrance animations at `frontend/src/views/GenerateView.vue:1942-1976`, loading shimmer/breathe animations at `frontend/src/views/GenerateView.vue:1586-1605`, and result reveal at `frontend/src/views/GenerateView.vue:1607-1617`.
- GenerateView includes a reduced-motion block that disables hero, placeholder, and result animations and generation-action transitions at `frontend/src/views/GenerateView.vue:2121-2132`.
- Other inspected components use transitions/transforms without local reduced-motion handling, for example:
  - AppHeader hover/active nav has no transition declarations, but uses glass surface at `frontend/src/components/common/AppHeader.vue:202-229`.
  - Recent masonry hover/focus transform and shadow at `frontend/src/components/gallery/RecentCreationsMasonry.vue:175-180`.
  - Recent masonry metadata opacity/transform transition at `frontend/src/components/gallery/RecentCreationsMasonry.vue:188-211`.
  - Recent detail hover uses `filter: brightness(1.08)` at `frontend/src/components/gallery/RecentCreationDetailModal.vue:348-353`.

### External References

- No external references were used. This audit is based on local source files and local Trellis/frontend specs only.

### Related Specs

- `.trellis/spec/frontend/index.md` — frontend stack snapshot says the app uses Vue 3.5, Vite 5, TypeScript strict, and a Hybrid Claude UI pattern with custom product surfaces plus Element Plus utilities.
- `.trellis/spec/frontend/component-guidelines.md:89-127` — documents the Hybrid Claude UI decision: custom product surfaces and CSS tokens should drive product-defining UI; Element Plus is for low-risk utilities.
- `.trellis/spec/frontend/component-guidelines.md:130-151` — documents Simplified Chinese as the default user-facing copy language, with allowed English exceptions for brand/model/technical terms.
- `.trellis/spec/frontend/component-guidelines.md:214-339` — documents custom modal accessibility and composer-like popup surface conventions, including warm off-white background, hairline border, generous radius, and no decorative blur/shadow on popup surfaces.
- `.trellis/spec/frontend/quality-guidelines.md:97-112` — frontend review checklist includes the Hybrid UI boundary and Simplified Chinese user-facing string contract.
- `.trellis/spec/frontend/quality-guidelines.md:116-125` — frontend accessibility baseline covers visible labels, color contrast, non-color-only state, and form labels.

## Caveats / Not Found

- `DESIGN.md` was not present when loading Impeccable context; `PRODUCT.md` was present and identifies the app as a product UI with a calm, precise, premium creative-workstation direction.
- `frontend/src/components/upload/ImageDropzone.vue`, `frontend/src/components/gallery/GenerationStatusPanel.vue`, and `frontend/src/components/common/AppFooter.vue` were inspected, but no imports of these components were found in `frontend/src/**/*.vue` or `frontend/src/**/*.ts` during this audit.
- `frontend/src/views/PromptsView.vue` exists and appeared in broad style searches, but it is outside the requested file list and no active route import was found in `frontend/src/router/index.ts`; it was not included in the main audit table beyond this caveat.
- This audit describes existing style patterns and inconsistency hot spots only. It does not include implementation changes or refactoring recommendations.
