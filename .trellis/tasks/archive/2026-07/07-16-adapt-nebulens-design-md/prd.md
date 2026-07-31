# Adapt Design System Documentation for Nebulens

## Goal

Replace the Vercel Geist reference document in `design.md` with a project-specific Nebulens design system that reflects the existing product, UI tokens, Simplified Chinese interface, and creative-workstation positioning. Add the supplied full-screen video hero brief as an adapted Nebulens specification.

## Requirements

- Keep `design.md` as the single edited product file.
- Replace Vercel/Geist system identity with Nebulens identity while retaining a structured token-first format.
- Align colors, typography, spacing, radii, shadows, layout dimensions, and control patterns with `frontend/src/styles/tokens.css`.
- Reflect the product principles in `PRODUCT.md`: minimal, editorial, exacting, calm, precise, and premium.
- Document Simplified Chinese as the default interface language.
- Add a complete full-screen video hero section based on the supplied external brief.
- Adapt the hero from Web3/EOS placeholders to Nebulens product navigation, copy, logo, and creation CTA.
- Preserve the supplied video URL, black overlay, responsive behavior, badge, heading, subtitle, and layered pill-button construction.
- Treat the cinematic hero as an optional landing/brand surface, separate from the authenticated workstation shell.

## Acceptance Criteria

- [ ] Frontmatter identifies the system as Nebulens rather than Geist or Vercel.
- [ ] Documented tokens match the existing CSS token families and key values.
- [ ] No `LOGOIPSUM`, `EOS`, `Web3`, or `Join Waitlist` product copy remains in the adapted hero.
- [ ] The hero specification includes video behavior, overlay, navbar, content stack, badge, heading, subtitle, CTA, responsive behavior, accessibility, and fallback behavior.
- [ ] Markdown frontmatter and heading structure are valid and readable.
- [ ] Only `design.md` plus Trellis task/session metadata are changed.

## Definition of Done

- Content checks confirm Nebulens terminology and the absence of source-brand placeholders.
- Git diff is reviewed for scope and accidental deletions.
- The Markdown file is readable as UTF-8 and has balanced frontmatter delimiters.
- The completed work is committed according to the repository workflow.

## Technical Approach

Rewrite the imported Geist document as a concise source-of-truth design brief. Reference existing CSS custom-property names rather than inventing a second token vocabulary. Add a dedicated `Full-Screen Video Hero` section that translates the supplied implementation brief into Nebulens-specific requirements and records its intentional exceptions to the default application shell.

## Decision (ADR-lite)

**Context**: The source hero brief is for an unrelated Web3/EOS landing page and conflicts with Nebulens product naming and authenticated workstation navigation.

**Decision**: Preserve the visual and interaction structure, but adapt all brand, navigation, copy, typography, and CTA details to Nebulens. Keep the video URL as supplied. Document the hero as a standalone marketing/entry surface.

**Consequences**: Future implementations can use the brief directly without leaking another product's identity. The cinematic dark hero remains an explicit exception to the app's warm-light workspace system.

## Out of Scope

- Implementing the hero in Vue.
- Changing CSS tokens or existing components.
- Editing the external source brief.
- Adding dependencies, fonts, routes, or video assets.

## Technical Notes

- Product source: `PRODUCT.md`.
- Token source: `frontend/src/styles/tokens.css`.
- Current navigation source: `frontend/src/components/common/AppHeader.vue`.
- Source brief: `C:/Users/Administrator/Desktop/Build a full-screen hero section for a W.md`.
- `design.md` was untracked before this task and contained the imported Vercel Geist light-theme document.
