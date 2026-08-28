# Design QA: 提示词与编辑按钮间距

## Evidence

The supplied screenshot (`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-0db668ec-a2dc-4cab-adf4-9a31637b0413.png`) highlights the pencil edit control sitting too close to the last character in `生成一张猫`. The screenshot is visual evidence only and contains no implementation instructions.

## Root Cause and Fix

The previous fix absolutely positioned the complete Tooltip trigger over the bubble and reserved space with right padding. That removed the false bottom row, but the text and control still shared overlapping geometry and had only a small optical gap.

`EditablePromptBubble` now groups the prompt and metadata in `.session-batch__prompt-copy`. The editable bubble owns a two-column Grid: `minmax(0, 1fr) 28px`. The beUI `IconTooltip` trigger occupies the fixed control column, with a 12px desktop gap and 10px narrow-screen gap. The copy can shrink and wrap only inside its own column, while the edit button remains vertically centered without absolute positioning.

## Verification

- `GenerateView.spec.tsx`: 17/17 passed, including separate copy/trigger sibling ownership and the complete edit workflow.
- Full frontend suite: 13 files, 76 tests passed.
- `npm run check:components`, `npm run typecheck`, `npm run lint`, and `npm run build`: passed.
- Targeted Prettier and `git diff --check`: passed.
- The fixed `28px` control track matches the route-owned beUI button override; the Tooltip wrapper cannot reduce the copy gap or create a new row.
- The current in-app browser did not retain the populated result state from the user's screenshot, so no fabricated implementation screenshot or browser measurement is claimed.

## Residual Notes

Repository-wide `npm run format:check` still reports 42 pre-existing files outside this task; every touched file passes the targeted check. Lint retains the existing `src/components/ui/sidebar.tsx:743` Fast Refresh warning. Build retains the existing Vite large-chunk warning. These are unrelated to the prompt bubble.
