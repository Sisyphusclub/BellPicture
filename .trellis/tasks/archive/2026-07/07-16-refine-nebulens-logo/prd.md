# Refine Nebulens Logo Direction

## Goal

Replace the first generated Nebulens logo with a lighter, more distinctive mark that reads clearly at sidebar size and avoids generic AI, planet, aperture, and notification-badge cues.

## What Did Not Work

* The circular aperture mass reads as a dark ball before it reads as an `N`.
* The orbital ring makes the mark look like a generic planet or technology logo.
* The separate coral dot resembles a notification badge.
* Too many blades and internal cuts collapse at 42px and 32px.
* The high near-black surface area feels heavy against the calm warm sidebar.

## Requirements

* Use `gpt-image-2` through the `openai-image-api` workflow.
* Create one open, compact mark from at most two continuous shapes.
* Make an abstract `N` readable through positive and negative space.
* Suggest a lens through curved geometry without using an aperture circle or shutter blades.
* Use near-black as a supporting color and muted coral as a structural stroke, not a detached dot.
* Keep the mark flat, text-free, shadow-free, gradient-free, and legible at 32px.
* Preserve the existing `/brand/logo.png` application contract and keep the first version available through Git history.

## Acceptance Criteria

* [x] The new mark has no circular outer frame, orbit ring, aperture blades, planet silhouette, or detached dot.
* [x] The `N` structure is visible at 42px and remains recognizable at 32px.
* [x] The mark uses at most two continuous visible color shapes.
* [x] The transparent asset passes the existing 256x256 RGBA contract.
* [x] The new mark looks lighter and more distinctive than the current asset in the live sidebar.
* [x] Existing frontend tests, lint, typecheck, build, and browser checks pass.

## Technical Approach

Generate one new 1024x1024 chroma-key source with `gpt-image-2`, remove the key locally, resize to 256x256, and compare source plus 42px/32px previews before replacing the committed asset. Do not edit application code unless the current fixed asset contract proves insufficient.

## Out of Scope

* Multiple public variants or a full identity system.
* Wordmarks, slogans, or typography.
* Header layout or palette redesign.
* Native transparency through another model.

## Technical Notes

* The current committed logo is preserved by commit `fa2e702`.
* User feedback: the first version does not look good enough.
* The second `gpt-image-2` request asked for 1024x1024 and the provider again returned 1254x1254; the mismatch was reported and the asset was normalized locally.
* Chroma removal auto-detected `#06f60b`; the final pass used soft matte, despill, one-pixel edge contraction, and 0.5px feathering before resizing.
* Final asset: 256x256 RGBA PNG, 18,433 bytes, alpha bounding box `(61, 46, 195, 210)`, 53,978 transparent pixels, 2,613 partially transparent pixels, 8,945 opaque pixels, zero visible greenish pixels, and four fully transparent corners.
* Browser verification: natural 256x256 dimensions, approximately 42x42 desktop and 32x32 mobile rendering, no horizontal overflow at the tested mobile viewport, and no console warnings or errors.
