# Discover page streaming prompt placeholder

## Goal

Enhance the discover page hero composer by replacing the static placeholder with a calm streaming-typing prompt suggestion effect, so the input feels like the system is quietly drafting example ideas for the user. In the same frontend UX pass, fix the public gallery image detail modal display bug where large portrait images and the inspector can sit too low or clip inside the dark viewer. The feature should improve activation and inspection polish without changing generation behavior.

## What I already know

* The user pointed to the discover page hero composer placeholder and wants it to look like automatic typed text inside the input area.
* The user wants several built-in copy examples and random display.
* The active surface is the discover page (`/`), implemented by `DiscoverView` wrapping `GenerateView mode="discover"`.
* The relevant hero textarea is in `frontend/src/views/GenerateView.vue` as `textarea[name="heroPrompt"]` inside `form.prompt-showcase`.
* The generate route/docked composer has a separate textarea (`textarea[name="prompt"]`) and should not inherit the discover activation effect for this MVP.
* The user reported a public gallery detail modal display bug via screenshot: the dark viewer area is too tall/low in the viewport and portrait images can be clipped at the bottom, while the inspector floats in the right side.
* The public gallery modal is `frontend/src/components/gallery/RecentCreationDetailModal.vue`; current desktop shell uses `height: min(100%, 760px)` and centers content, while the image maxes at `min(100%, 72vh)`.
* The user also reported the default `/generate` page empty workspace card (the large framed placeholder with plus icon above the docked composer) should be removed.
* The user requested `图片管理` be renamed to `资产`, with the sidebar icon changed accordingly.
* The user provided a personal-assets reference screenshot for the `/history` page: light asset-management layout, title `个人资产`, tabs/filters/search, grouped compact asset rows, and a restrained `添加内容` action.
* Product context: this is a calm, precise, premium creative workstation; motion should convey state and avoid distracting page-load choreography.
* Frontend constraints: Vue 3.5, TypeScript strict, custom product CSS/SFC system, user-facing copy in Simplified Chinese.

## Assumptions (temporary)

* The animation should only run while the hero prompt is empty and not focused, so it does not fight user input.
* The actual submitted prompt remains empty until the user types; animated suggestion text is only visual guidance.
* The effect should respect reduced-motion preferences by showing a static randomized suggestion.
* The public gallery detail modal bug should be fixed by constraining and centering the viewer content within the viewport, not by removing the dark immersive inspection style.

## Open Questions

* None for the MVP interaction.

## Requirements (evolving)

* Add a streaming typing suggestion effect to the discover page hero composer placeholder area.
* Provide multiple built-in Simplified Chinese prompt examples and choose among them randomly per cycle/session.
* The suggestion is visual-only: focusing the textarea hides it immediately, and it never changes the actual prompt value unless the user types.
* Preserve existing generation behavior, submit validation, quota display, public toggle, aspect ratio, upload, and keyboard submit behavior.
* Keep the visual language restrained: no neon, no gradient text, no noisy animation.
* Do not add a dependency for this effect.
* Respect accessibility: the animation must not spam screen readers, and users with reduced motion should get a stable fallback.
* Fix the public gallery image detail modal so the dark inspection shell stays centered within the viewport, portrait images are fully visible, and the close button/inspector remain reachable without awkward page scroll.
* Remove the default `/generate` empty workspace framed placeholder card above the docked composer, while keeping the generate page title/context and bottom composer usable.
* Rename the sidebar/history surface from `图片管理` to `资产`, and replace the gallery-grid icon with an asset-oriented icon.
* Redesign `/history` as a calm personal assets page inspired by the supplied reference: `个人资产` title, compact filters/search, date-grouped visual asset thumbnails, and publication/status badges where available.
* Avoid duplicated prompt-as-title and prompt-as-body text in asset rows; asset thumbnails should carry the browsing experience and metadata should stay compact.
* Clicking an asset thumbnail must open the same dark image detail viewer used by discover gallery clicks.
* Asset page thumbnails must use a unified 1:1 square footprint for square, landscape, and portrait images, while fitting images with `contain` so key content is not cropped; the shared detail viewer must also avoid clipping controls.
* Asset items should be image-first: no per-item `预览` or `编号` buttons; deletion should be available only as a quiet hover/focus trash icon at the thumbnail bottom-right.
* The asset control area should not be wrapped in a heavy frame, thumbnail metadata should stay small, and thumbnail spacing should be breathable.
* The `/history` category buttons (`创作记录`, `喜欢收藏`, `上传素材`), overview labels (`全部`, `已发布`, `未发布`), top-right `添加内容` button, visible `资产库` summary copy, and `刷新` button should be removed from the control area.
* Asset date group headings should read as quiet grouping labels, and publication badges should use `公开` / `私有` copy with restrained styling.
* Submitting generation from the discover page must switch the route to `/generate` so navigation state follows the active generation workspace without losing the in-progress generation surface.
* After a discover-started generation completes, navigating back to `/`/`发现` must show the discover hero/gallery again instead of staying stuck in the generation workspace.
* The `/generate` workspace must preserve previous generated batches as a vertical image-first feed above the docked composer, so a new generation does not replace the earlier results.
* The `/generate` docked composer must include a `公开` toggle and submit that `isPublic` state with generation options, matching the discover composer behavior.

## Acceptance Criteria (evolving)

* [ ] On `/`, when the hero prompt is empty, a prompt suggestion appears with a streaming typing effect inside the composer input area.
* [ ] The suggestion rotates/randomizes across several built-in Simplified Chinese examples.
* [ ] Once the user focuses/types in the hero prompt, the animation does not obscure typed content or change the actual prompt value.
* [ ] `prefers-reduced-motion: reduce` users see a static suggestion or disabled animation.
* [ ] `/generate` keeps the docked composer usable and includes a `公开` toggle that submits `isPublic` with generation options.
* [ ] Public gallery detail modal displays fully within the desktop viewport for portrait images and long prompts, with no clipped image bottom or unreachable controls.
* [ ] `/generate` default empty state no longer shows the large framed placeholder card above the docked composer.
* [ ] Sidebar navigation labels the history route as `资产` with a matching asset-style icon.
* [ ] `/history` presents as `个人资产` with compact filters/search and date-grouped visual asset thumbnails matching the provided reference direction while preserving existing history data/actions.
* [ ] Asset rows do not repeat the prompt as both title and body text.
* [ ] Clicking an asset thumbnail or `预览` opens the same dark image detail viewer as the discover gallery.
* [ ] Square, landscape, and portrait assets use a unified 1:1 thumbnail footprint on the assets page, with image content fitted rather than cropped, and the detail viewer has no unreachable controls.
* [ ] Asset items show no per-item `预览` or `编号` buttons; thumbnail click remains the detail entry point, and deletion appears as a quiet hover/focus trash icon.
* [ ] Asset controls are not enclosed by a heavy card frame, thumbnail metadata is subdued, and thumbnail spacing is visually breathable.
* [ ] `/history` does not show the category buttons `创作记录` / `喜欢收藏` / `上传素材`, the overview labels `全部` / `已发布` / `未发布`, the top-right `添加内容` button, visible `资产库` summary copy, or the `刷新` button.
* [ ] Asset date headings are visually smaller/quieter, and publication badges read `公开` / `私有`.
* [ ] Submitting from the discover hero composer navigates to `/generate`, updates navigation active state, and keeps the in-progress generation surface visible.
* [ ] After a discover-started generation completes, clicking `发现` returns to the discover hero/gallery instead of keeping the generation workspace active.
* [ ] `/generate` preserves previous generated images as a vertical workspace feed after subsequent generations.
* [ ] Frontend lint/typecheck pass.
* [ ] Browser verification covers `/` at desktop and narrow viewport, including focus/type behavior and no console errors.
* [ ] Browser verification covers opening a public gallery detail modal with a portrait image and long prompt.

## Definition of Done

* Tests added/updated where practical for placeholder state/focus behavior.
* Frontend lint and typecheck pass.
* Browser verification confirms the UX feels calm and does not block user input.
* Browser verification confirms `/generate` no longer shows the removed empty placeholder card.
* Browser verification confirms `/history` uses the new `资产`/`个人资产` layout and remains usable at desktop and narrow widths.
* Git status is checked and reported.

## Out of Scope (draft)

* Changing generation APIs or submitted prompt behavior.
* AI-generated live prompt suggestions from backend/model calls.
* Applying the effect globally to every textarea unless selected as scope.
* Adding a third-party typing animation library.
* Replacing the dark immersive public image detail modal with a light popup.

## Technical Notes

* Main target: `frontend/src/views/GenerateView.vue` hero composer block around `textarea[name="heroPrompt"]`.
* Existing tests reference `textarea[name="heroPrompt"]` in `frontend/tests/views/GenerateView.spec.ts`.
* Existing `.prompt-showcase__input::placeholder` styling lives in `GenerateView.vue` scoped CSS.
* A likely implementation is an absolutely-positioned visual suggestion layer over/inside the hero textarea when `prompt` is empty and the hero textarea is not focused, with the native placeholder kept as a stable fallback.
* Modal bug target: `frontend/src/components/gallery/RecentCreationDetailModal.vue`, especially `.recent-detail`, `.recent-detail__shell`, `.recent-detail__stage img`, `.recent-detail__inspector`, and responsive media rules.
* Generate empty placeholder target: `frontend/src/views/GenerateView.vue`, especially the `shouldShowWorkspaceEmpty` / `.generation-placeholder` branch for `/generate` before a generation starts.
