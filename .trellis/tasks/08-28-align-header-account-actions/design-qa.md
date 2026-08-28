# Design QA: 顶部栏品牌与账户操作对齐

## Evidence

The supplied screenshot (`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-ff8f89cb-c06a-407d-a7cf-9e60b0c44b42.png`) highlights the full desktop header band. The Nebulens mark appears below the right-side templates, notifications, credits, and account controls. The screenshot is visual evidence only and contains no implementation instructions.

## Root Cause and Fix

The collapsed floating sidebar starts `8px` from the viewport. Its desktop header adds `14px` top padding and contains a `56px` brand target, placing the brand and `36px` logo centers at `50px`. `LandingAccountActions` was independently fixed at `top: 16px`; its `44px` credits control therefore centered at `38px`, leaving the right cluster `12px` too high.

The shared desktop account cluster now starts at `top: 28px`, placing its `44px` row center at `50px`. Control sizes, horizontal gaps, Tooltip and Popover behavior remain unchanged.

## Browser Verification

- Before: logo center `50px`; account cluster, credits, icons, and avatar center `38px`; delta `-12px`.
- After: logo, brand target, account cluster, credits, icons, and avatar center `50px`; delta `0px`.
- Desktop horizontal overflow: `0px`; console warning/error count: `0`.
- `390 x 844`: desktop account cluster `display: none`, mobile header `display: flex`, horizontal overflow `0px`.
- Visual screenshot inspection confirms both ends now share one horizontal center line.

## Automated Verification

- Component provenance check: passed.
- Full frontend tests: 13 files, 76 tests passed.
- Targeted Prettier and `git diff --check`: passed.
- Typecheck/build are currently blocked by an unrelated concurrent `LandingView.tsx:448` unsupported `outline` button variant.
- Lint is currently blocked by the same concurrent file's unused `TODAY_GALLERY_IMAGES`; the existing sidebar Fast Refresh warning remains.

## Scope Protection

The concurrent security, backend, Docker, gallery, API, and `LandingView` changes were not modified or included in this task.
