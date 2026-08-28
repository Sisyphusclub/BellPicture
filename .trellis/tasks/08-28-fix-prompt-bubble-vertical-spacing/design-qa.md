# Design QA: 用户提示词气泡垂直留白

## Evidence

The supplied screenshot (`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-4d1a58b7-9f00-4083-843d-5d4e577b6aca.png`) shows a single-line prompt bubble with excessive space below the text and an edit icon whose visual center sits too high.

## Root Cause and Fix

`IconTooltip` renders an `inline-flex` trigger wrapper. The previous CSS positioned only the nested edit button, leaving that wrapper in normal flow as an empty line. `EditablePromptBubble` now places the Tooltip in `.session-batch__prompt-edit-slot`; the slot is absolutely positioned at `top: 50%` and translated back by 50%, while the button remains static inside it. The prompt remains content-sized, metadata stays visible, and the edit action keeps its tooltip, focus, disabled, cancel, and regenerate behavior.

## Verification

- GenerateView regression test: 17/17 passed, including the slot/trigger relationship and edit workflow.
- Full test suite: 13 files, 76 tests passed.
- `npm run check:components`, `npm run typecheck`, `npm run lint`, and `npm run build`: passed.
- Targeted Prettier check and `git diff --check`: passed.
- Browser smoke at `/generate`: unauthenticated empty state rendered with no horizontal overflow or console warning/error. A populated prompt bubble could not be generated without authentication, so no implementation screenshot is claimed.
- Responsive CSS keeps the slot anchored to the bubble at desktop and `<=560px`; long prompt text continues to wrap with reserved right padding.

## Residual Notes

The in-app browser viewport override did not propagate to the claimed tab, so the browser smoke is not presented as a 390px measurement. Full `format:check` reports 42 pre-existing files outside this task. Lint retains the existing `sidebar.tsx:743` Fast Refresh warning, and build retains the existing large-chunk warning.
