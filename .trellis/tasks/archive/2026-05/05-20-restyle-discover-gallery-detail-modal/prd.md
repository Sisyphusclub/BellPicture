# Restyle Discover Gallery Detail Modal

## Goal

Redesign the Discover page gallery image detail modal to closely match the provided Image5 reference: a dark, immersive image preview overlay with the selected artwork as the primary focus and a compact prompt/action panel on the right.

## Requirements

* Replace the current light two-column detail dialog for Discover gallery clicks with a dark full-screen overlay.
* The selected image should be large, left-of-center, and preserve its aspect ratio with rounded corners.
* The surrounding page should remain visible only as a heavily darkened, blurred backdrop.
* The right side should contain a compact dark prompt card with:
  * Uppercase `PROMPT` label.
  * Small `Copy` action in the card header.
  * Scrollable prompt body.
* Metadata should appear below the prompt card as a compact single-line row using model and timestamp.
* The bottom actions should match Image5 structure:
  * Secondary `保存` button.
  * Primary purple `做同款` button.
* A round close button should sit near the right panel, not in the top-right corner of a large white dialog.
* Remove the old light detail metadata list from this modal presentation.
* Preserve keyboard Escape close behavior and accessible labels.

## Acceptance Criteria

* [ ] Clicking a Discover gallery image opens a dark full-screen preview matching Image5 layout.
* [ ] The image is the visual focal point and scales correctly for square, portrait, and landscape images.
* [ ] Prompt panel is compact, dark, and scrollable.
* [ ] `Copy`, `保存`, and `做同款` controls are visible with button styling matching the reference.
* [ ] Close button and Escape key still close the modal.
* [ ] Frontend lint and typecheck pass.
* [ ] Chrome DevTools verification confirms the modal visually resembles Image5 and has no console errors.

## Definition of Done

* UI uses project Vue SFC conventions and scoped CSS.
* Product UI remains restrained and premium, with dark scene justified by immersive image inspection.
* No unrelated navigation, gallery, or generation behavior changes.

## Technical Approach

Update `frontend/src/components/gallery/RecentCreationDetailModal.vue` template and scoped styles. Keep existing props/emits and copy behavior. Introduce a dark viewer layout with image stage, right inspector stack, copy button, metadata, save and remix action buttons. If the current component has a separate expanded-image mode, simplify or restyle it so the main detail modal itself is the immersive viewer.

## Decision (ADR-lite)

**Context**: The existing modal is a light information sheet. The requested reference is an immersive dark preview focused on image review and prompt reuse.
**Decision**: Make the gallery detail modal a full-screen dark viewer with a compact prompt/action panel.
**Consequences**: Less detailed metadata is shown in the modal, improving visual fidelity to the reference. Full historical metadata remains out of scope for this modal restyle.

## Out of Scope

* Backend/API changes.
* Changing gallery cards outside the opened modal.
* Implementing actual download/remix workflows if not already wired. Buttons may preserve current available behavior or be non-destructive placeholders only if no existing handlers exist.
* Global design system extraction.

## Technical Notes

* Existing modal component: `frontend/src/components/gallery/RecentCreationDetailModal.vue`.
* Discover renders `GenerateView mode="discover"`, which uses `RecentCreationsMasonry` and `RecentCreationDetailModal`.
* Product context: premium creative workstation; dark theme is appropriate here because the user is inspecting an image in a dimmed focus mode.
* Image5 reference: dark nearly full-screen backdrop, large artwork left, compact right prompt card, tiny close circle above, action row below.
