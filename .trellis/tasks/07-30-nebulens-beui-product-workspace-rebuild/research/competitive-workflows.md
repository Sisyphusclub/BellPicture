# Competitive Workflow Research

Date: 2026-07-30

## Scope

Compare current creator workflows from Midjourney Create, Adobe Firefly, and Leonardo AI, then map the useful patterns to Nebulens and the available beUI Pro component set. This research is for product interaction and information architecture, not visual imitation.

## Evidence

- [beUI Pro components](https://pro.beui.dev/components) - fetched component catalog.
- [Midjourney: Creating on Web](https://docs.midjourney.com/hc/en-us/articles/33390732264589-Creating-on-Web) - prompt bar, generation feed, image actions, folders, and fullscreen actions.
- [Midjourney: Using Folders](https://docs.midjourney.com/hc/en-us/articles/34580542725645-Using-Folders) - folder creation, groups, bulk organization, and generate-in-folder behavior.
- [Midjourney: Logging In and Connecting Accounts](https://docs.midjourney.com/hc/en-us/articles/33390994570509-Logging-In-Connecting-Accounts) - current account entry and identity linking.
- [Adobe Firefly: Generate images from text descriptions](https://helpx.adobe.com/firefly/web/work-with-images/generate-images/generate-images-from-text-descriptions.html) - model, ratio, content type, intensity, composition/style references, effects, grid/list history, and rerun.
- [Leonardo AI: Flow State](https://intercom.help/leonardo-ai/en/articles/10002805-flow-state) - streaming exploration, More Like This, style facets, branching stages, and quota-aware scrolling.
- [Leonardo AI: Image Guidance](https://intercom.help/leonardo-ai/en/articles/8497988-image-guidance) - multiple references, reference roles, per-reference influence, and model compatibility feedback.
- [Leonardo AI FAQ](https://intercom.help/leonardo-ai/en/articles/7051613-frequently-asked-questions) - account and platform entry context.

Raw evidence is stored under `C:\tmp\smart-search-evidence\20260730-nebulens-competitive-research`.

## Competitive Patterns

### Midjourney Create

- The prompt composer and live creation feed form one continuous workspace; users do not submit into a separate results page.
- Uploads are reusable assets. A reference can be dropped into a specific role in the composer instead of appearing as an undifferentiated attachment.
- Finished images expose direct continuation actions: subtle/strong variations, rerun, reuse prompt and images, favorite, download, privacy, and folder assignment.
- Prompt search and folder context sit beside the composer, so creation and organization are connected.
- Folders support direct generation, grouping, bulk assignment, and Saved Searches. Deleting a folder does not delete the underlying images.

### Adobe Firefly

- Core generation settings are explicit and model-aware: model, aspect ratio, content type, visual intensity, composition reference, style reference, effects, color/tone, lighting, and camera angle.
- Reference strength is adjustable and belongs to the reference control itself.
- Results can be viewed as a grid or list. History is directly reachable from the prompt area.
- Rerun preserves the full prompt and settings contract, not only the text.
- Advanced controls live in a structured side panel while the prompt and results stay visually dominant.

### Leonardo AI

- Normal Image Generation is the precision workflow; Flow State is a separate fast exploration mode.
- Flow State creates a continuous visual stream and lets users branch with More Like This. Branch stages remain navigable.
- Style facets such as vibe, lighting, shot type, and color theme are fast preset controls rather than prose instructions.
- Quota cost is visible near actions that consume it, including scroll-to-generate behavior.
- Multiple references have semantic roles and independent influence. Unsupported combinations are disabled with a reason instead of disappearing.

## beUI Pro Mapping

| Nebulens need                                               | beUI Pro component or pattern               |
| ----------------------------------------------------------- | ------------------------------------------- |
| Prompt, attachments, model and generation controls          | Agent Chat Input                            |
| Settings, sort, filters, row actions and contextual actions | Animated Dropdown                           |
| Image inspection and continuation actions                   | Morphic Card Modal                          |
| Dense icon controls                                         | Morphic Tooltip                             |
| Asset list mode and future bulk operations                  | Data Table                                  |
| Asset and template image browsing                           | Image Galleries                             |
| Authentication and registration                             | Auth                                        |
| First-run preference setup if added later                   | Onboarding / Step Form                      |
| No results, offline and unauthenticated states              | Empty States                                |
| Workspace shell and responsive navigation                   | Navbar, adapted to the existing route model |

The repository currently includes Agent Chat Input, Animated Dropdown, Morphic Tooltip, Morphic Card Modal, Navbar Expand, Button, and SelectMenu. Auth, Data Table, Image Galleries, and Empty States are available from beUI Pro but are not yet installed as source-owned primitives.

## Current Nebulens Capability Gap

### P0: Required in this rebuild

- One continuous create workspace with a stable prompt composer and session feed.
- Preserve complete generation settings when reusing or rerunning a batch.
- Direct image continuation actions: rerun, use as reference, reuse prompt/settings, download, visibility, and delete.
- Reference tray with clear per-image state; only expose roles and weights that the backend/provider can honor.
- Asset grid/list modes, sort, visibility filter, batch selection, bulk download, and bulk delete.
- Asset collections/favorites with server persistence if included in the UI.
- Searchable, category-based templates with preview, quick use, favorite/recent state, and no fake template action.
- Complete sign-in/sign-up states: password visibility, inline validation, pending/error/success state, keyboard focus containment, and focus return.
- Operational UI copy only. Remove page introductions, tutorials, feature explanations, and keyboard-instruction text from visible work surfaces.

### P1: Valuable after the core rebuild

- Generate inside a collection and Saved Search-style smart collections.
- Branch history for More Like This and variation chains.
- Reference roles and influence when the upstream API contract can represent them.
- Lightweight first-run preferences and recent style/template memory.

### P2: Explicitly not faked

- Canvas inpainting/outpainting, layers, pose/depth/edge guidance, video generation, and trained personalization profiles.
- These require upstream model/API work and must not appear as inactive decorative controls.

## Recommended Product Model

Use a precision-first studio with two clear layers:

1. A compact persistent create bar owns prompt, references, model, aspect, count, quality, visibility, quota, and submit/stop state.
2. The surrounding page owns session history and result continuation. Advanced settings open from one beUI Animated Dropdown or side sheet rather than remaining permanently expanded.

Templates feed the same create contract. Assets are the durable library for search, organization, selection, and reuse. Authentication is a focused entry flow that returns the user to the command they attempted.

## Product Decisions

- Borrow workflow logic, not visual branding, from competitors.
- Keep dark graphite surfaces and image-led color from the existing Nebulens design context.
- Install or port beUI source components only when their interaction model is actually used.
- Do not add visible explanatory paragraphs to operational pages.
- Do not display controls the backend cannot execute.

## Research Commands

```powershell
smart-search doctor --format json
smart-search deep "Compare the current interaction patterns..." --budget deep --format json
smart-search search "Midjourney Create page current 2026 official docs..." --validation strict --extra-sources 2 --timeout 180 --format json
smart-search search "Adobe Firefly current 2026 official text to image interface..." --validation strict --extra-sources 2 --timeout 180 --format json
smart-search search "Leonardo AI current 2026 official image generation interface..." --validation strict --extra-sources 2 --timeout 180 --format json
smart-search fetch "https://pro.beui.dev/components" --format markdown
```
