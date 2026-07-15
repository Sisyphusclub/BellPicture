# Rename Product to Nebulens

## Goal

Remove the current 贝尔灵画 / BellPicture / Ref2Image branding from the active product and consistently rename the application to Nebulens across user-facing UI, application metadata, runtime identifiers, configuration, tests, and maintained documentation.

## What I Already Know

* The requested replacement brand is exactly `Nebulens`.
* The current user-facing name appears as `贝尔灵画` in the app shell, login modal, generator hero, footer, page metadata, README, tests, and product context.
* Older technical branding remains as `Ref2Image` / `ref2image` in package names, backend logging, Docker aliases, compatibility API metadata, username domains, tests, and maintained specifications.
* `frontend/public/brand/logo.png` is a standalone old-brand graphic without text. The app can use a Nebulens text wordmark until a new approved logo is supplied.
* Archived Trellis tasks and journals are historical audit records rather than maintained product surfaces.

## Assumptions (Temporary)

* Active product code and maintained project documentation should use `Nebulens`; machine-readable lowercase identifiers should use `nebulens`.
* The old graphic logo should be removed from the rendered navigation rather than presented as a Nebulens asset.
* Existing database identities using `@users.ref2image.local` do not require an in-place production migration in this task.

## Open Questions

* Confirm whether archived Trellis records and the GitHub repository/remote name should remain unchanged as historical and remote infrastructure records.

## Requirements

* Replace all active user-facing 贝尔灵画 branding with `Nebulens`.
* Replace active `BellPicture`, `Ref2Image`, and `ref2image` product identifiers with appropriate `Nebulens` / `nebulens` forms.
* Remove obsolete old-brand assets and references from active frontend code and tests.
* Update maintained READMEs, `PRODUCT.md`, package metadata/lockfiles, Docker configuration, backend metadata, and relevant Trellis specifications.
* Keep the existing UI layout and visual system unchanged except where needed to present the new brand.

## Acceptance Criteria

* [x] No old brand string remains in active source, configuration, tests, package metadata, or maintained documentation.
* [x] The rendered page title, navigation, login modal, generator hero, footer, and accessibility labels use `Nebulens`.
* [x] Backend logger metadata, compatibility API ownership, generated local username domain, Docker alias, and package names use `nebulens`.
* [x] Obsolete `ref2image`-named frontend assets and test references are removed or renamed.
* [x] Frontend tests/lint/typecheck/build and backend lint/typecheck/build plus the username identity smoke check pass.
* [x] Git status contains only the intended brand migration and Trellis task artifacts.

## Definition of Done

* Focused tests are updated before implementation assertions are changed.
* Frontend and backend validation commands pass, or unrelated failures are documented.
* Exhaustive text searches confirm old branding remains only in explicitly excluded historical records or Git metadata.
* Rollback is available through the single task commit.

## Technical Approach

Use exact repository-wide searches to divide live product surfaces from historical records. Update tests and maintained specs alongside implementation. Prefer a text wordmark in `AppHeader` and remove the old standalone logo assets rather than relabeling an unapproved old graphic. Do not add dependencies or redesign unrelated UI.

## Decision (ADR-lite)

**Context**: The repository contains three generations of branding and an old graphical logo, while the user requested a complete rename.

**Decision**: Normalize maintained product surfaces to `Nebulens` / `nebulens`, remove old rendered branding, and preserve archived Trellis records plus the existing Git remote unless explicitly requested otherwise.

**Consequences**: New local username identities will use a new internal domain. Existing persisted databases may need a separate migration if they must retain username-based login continuity. Historical audit files will still mention the old names by design.

## Out of Scope

* Renaming the GitHub repository or mutating remote Git configuration.
* Rewriting archived Trellis task records, research notes, or developer journals.
* Designing a final Nebulens graphical logo.
* Migrating an existing production database or deployed Docker network.

## Technical Notes

* Frontend stack: Vue 3, Vite, TypeScript, Vitest, ESLint.
* Backend stack: Express, TypeScript, Vitest, ESLint.
* The project uses Trellis and an inline Codex dispatch workflow.
* Product design register: product UI; preserve the current restrained creative-workstation system.
* Semantic search and exact `rg` scans were used to locate branding surfaces.
* Backend Vitest is environment-blocked because the local Node 24 runtime has no `better-sqlite3` prebuild and the machine lacks Visual Studio C++ build tools. Three bounded attempts (Node 24 rebuild, temporary Node 22 rebuild, direct Node 22 prebuild lookup) did not produce the native binding. This is unrelated to the brand changes; backend lint, typecheck, build, and a direct username-domain runtime smoke check pass.
* Full-package Prettier checks report existing formatting drift across many untouched files. The new username test passes a focused Prettier check; no broad formatting rewrite was performed.
