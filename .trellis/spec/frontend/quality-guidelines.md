# Frontend Quality Guidelines

> **Status**: Verified against the React implementation in `frontend/`.

Quality is evaluated at the contract boundary closest to the behavior. Tests and
visual checks should catch meaningful regressions without asserting framework
implementation details.

## Required Automated Checks

Run from `frontend/`:

```powershell
npm run check:components
npm run typecheck
npm run lint
npm run test
npm run build
npm run format:check
```

Run `git diff --check` from the repository root before handoff.

GitHub Actions repeats the release gate independently for `frontend/` and
`backend/` on Node 22. Each job must run `npm ci`,
`npm audit --omit=dev --audit-level=high`, format, lint, typecheck, tests, and
build. Do not weaken the workflow to make a failing local check green; fix the
source or update the documented contract with review.

## Test Strategy

| Layer        | Tool                        | Primary assertions                                                  |
| ------------ | --------------------------- | ------------------------------------------------------------------- |
| utilities    | Vitest                      | pure inputs, outputs, and edge cases                                |
| API services | Vitest with stubbed `fetch` | URL, method, payload, narrowing, normalized errors                  |
| components   | React Testing Library       | accessible rendering and user-visible interactions                  |
| routes       | React Testing Library       | workflow states and integration between hooks/components            |
| browser QA   | chosen browser              | responsive layout, motion, focus, overflow, console, real rendering |

- Query elements by role, label, or visible name before using test ids.
- Use `user-event` for user interaction.
- Assert visible outcomes, not hook call order, CSS implementation, or internal
  component-library markup.
- Use `fake-indexeddb` only where browser persistence behavior is part of the
  contract.
- Mock at network/service boundaries. Avoid mocking React itself.
- Add a regression test for every fixed behavior that is inexpensive to express.

## Accessibility

- Use semantic landmarks, headings, buttons, links, labels, tables, and lists.
- All interactive elements are keyboard reachable and have visible focus.
- Icon-only buttons have accessible names and tooltips when the icon is not
  universally clear.
- Dialogs expose a name, focus an appropriate control, close with Escape, and do
  not strand focus.
- Status feedback uses an appropriate live region without repeatedly announcing
  decorative updates.
- Images have meaningful alt text or empty alt text when decorative.
- Color is never the only carrier of state.
- Support reduced motion and do not autoplay nonessential video for users who
  request it.

## Responsive and Visual QA

For interface changes, inspect desktop and mobile in the user's selected browser.

- Confirm there is no horizontal document overflow.
- Confirm fixed navigation does not cover the page end or primary actions.
- Test loading, empty, error, unauthenticated, forbidden, and populated states
  that the change affects.
- Check long Chinese text, long filenames, prompts, and account identifiers.
- Check browser console warnings and errors.
- For reference matching, compare source and implementation at the same viewport
  and state. A screenshot alone is not a comparison.

The landing reference comparison uses 1440 x 813. Product routes additionally
use 1440px desktop and 390 x 844 mobile checks.

## Performance

- Keep render-time computations pure and avoid rebuilding large arrays when a
  stable memo has measurable value.
- Give images explicit dimensions or aspect ratios to prevent layout shift.
- Use local media sized for its rendered slot; do not stretch tiny assets.
- Clean up timers, subscriptions, and object URLs.
- Avoid introducing large dependencies for a single primitive.
- Keep animation on transform/opacity where possible and preserve a static
  reduced-motion state.

## Error Resilience

- Normalize network and backend errors at the service/hook boundary.
- Never render raw unknown exceptions directly.
- Keep retry paths available for recoverable failures.
- Prevent duplicate submissions while a mutation is pending.
- Treat invalid API and browser-storage data as recoverable boundary failures.
- Backend authorization remains authoritative even when the UI hides controls.

## Definition of Done

- The requested behavior works on every affected route.
- Typecheck, lint, tests, build, formatting, and whitespace checks pass.
- Relevant desktop/mobile layouts have been inspected.
- Keyboard, focus, labels, and reduced-motion behavior remain intact.
- Browser console has no new warnings or errors.
- Specifications and QA evidence are updated when the architecture or visual
  contract changes.

## Forbidden Patterns

- Snapshot-only testing of complex user workflows.
- Assertions on generated component-library class strings.
- Silencing TypeScript, ESLint, React hook, or accessibility failures without a
  documented cause.
- Shipping a visual clone without same-viewport reference comparison.
- Treating a successful build as proof of runtime or responsive correctness.
