# Nebulens Component Provenance Audit

**Date:** 2026-08-04
**Scope:** `frontend/src`, dependency manifest, shared component boundaries, browser-native dialogs
**Authoritative source:** [beUI Pro](https://pro.beui.dev/components)

## Outcome

The remediation pass replaced 79 visible native control declarations in route and business
components with shared `Button`, `Input`, `Textarea`, `Switch`, `SelectMenu`, beUI
`AnimatedDropdown`, and `ConfirmActionModal` contracts. The only remaining business-level native
control is a hidden `type="file"` input required by the browser file picker. Its visible trigger is
the shared `Button`.

The automated gate scans 78 TypeScript source files and currently reports:

- 0 visible native controls outside shared implementation roots.
- 1 exact hidden browser-control exception.
- 0 direct foundation imports outside approved roots.
- 0 competing component-system imports.
- 0 `window.confirm`, `window.alert`, or `window.prompt` calls.
- 1 documented external visual exception: ReactBits `BorderGlow`, limited to Agent Chat Input.

## Source Inventory

| Product contract | Source | Local boundary | Status |
| --- | --- | --- | --- |
| Prompt composer | beUI Pro Agent Chat Input | `src/components/premium/agent-chat-input/` | Approved |
| Menus and selects | beUI Pro Animated Dropdown | `src/components/premium/animated-dropdown/`, `ui/select-menu.tsx` | Approved |
| Image/detail transitions | beUI Pro Morphic Card Modal | `src/components/premium/morphic-card-modal/` | Approved |
| Icon guidance | beUI Pro Morphic Tooltip | `src/components/premium/morphic-tooltip/`, `ui/icon-tooltip.tsx` | Approved |
| Discovery gallery | beUI Pro Image Gallery Vertical | `src/components/premium/image-galleries/` | Approved |
| Discovery navigation | beUI Pro Navbar Expand | `src/components/premium/navbar-expand/` | Approved |
| Button and form semantics | Nebulens beUI/shadcn adapters | `src/components/ui/` | Approved |
| Authentication | beUI Auth interaction pattern + shared adapters | `src/components/auth/LoginModal.tsx` | Approved adaptation |
| Composer focus effect | ReactBits Border Glow | `src/components/BorderGlow.tsx` | Documented exception |
| File picker bridge | Browser hidden file input | `src/components/upload/ReferenceUploader.tsx` | Required exception |

The source tree contains 25 beUI premium source files, 6 shared UI adapter files, and 11 product
composition files. Radix is used only as a foundation inside `ui/button.tsx` and the beUI Animated
Dropdown implementation; it is not a route-level component API.

## Audit Health Score

| Dimension | Score | Key finding |
| --- | ---: | --- |
| Accessibility | 3/4 | Shared semantic controls and modal contracts now cover visible interactions; full browser a11y QA remains separate. |
| Performance | 4/4 | No second runtime component framework; source-owned components remain tree-shakeable. |
| Responsive design | 3/4 | Shared control dimensions reduce drift, but provenance checks cannot prove viewport layout. |
| Theming | 4/4 | Business controls route through semantic beUI/ui token boundaries. |
| Anti-patterns | 3/4 | No competing UI system or browser dialogs; one tightly scoped decorative exception remains. |
| **Total** | **17/20** | **Good** |

### Anti-Patterns Verdict

Pass for component provenance. The interface no longer mixes page-local native controls with the
shared design system. `BorderGlow` is visibly distinctive but remains focus-only, documented, and
does not replace semantic interaction behavior.

## Findings

### Resolved P1: Visible controls bypassed shared components

**Impact:** Button, form, focus, disabled, and hover behavior could drift by page even when the
screen looked superficially aligned with beUI.
**Resolution:** Migrated all 79 visible declarations to shared component contracts and added an AST
gate that rejects recurrence.

### Resolved P1: Destructive admin action used `window.confirm`

**Impact:** The dialog did not match beUI, could not share pending/focus behavior, and was difficult
to test consistently.
**Resolution:** Admin deletion now uses `ConfirmActionModal` with a pending guard and explicit copy.

### Resolved P2: Sidebar account menu was page-local

**Impact:** Menu keyboard, focus, positioning, and motion behavior differed from other product
menus.
**Resolution:** Desktop account actions now use beUI `AnimatedDropdown`; mobile state remains
independent.

### Open P2: Copied-source version identity is descriptive

**Location:** `frontend/component-provenance.json`
**Impact:** The gate proves ownership boundaries and consumers, but it does not verify copied beUI
files against an upstream registry checksum.
**Recommendation:** When the registry exposes stable component versions or hashes, record them in
the manifest and verify updates during component refreshes.

## Automated Enforcement

Run from `frontend/`:

```powershell
npm run check:components
```

The same gate runs before `npm run lint` and `npm run build`. Exceptions are data, not comments:
each entry in `component-provenance.json` requires an exact file, element count, attributes, source,
consumer boundary, and rationale. A moved, duplicated, or changed exception fails the command.

## Positive Findings

- `components.json` already points to the authenticated `@beui-pro` registry.
- Premium components are source-owned and can be tested and adapted without a second runtime UI
  dependency.
- Shared `SelectMenu`, `IconTooltip`, and `ConfirmActionModal` correctly compose the underlying beUI
  interaction primitives.
- Existing semantic tokens and reduced-motion rules remain the single styling and motion contract.
