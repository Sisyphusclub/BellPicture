# Add Logged-Out Account Icon

## Goal

Improve the sidebar account entry in the logged-out state by replacing the plain text-only "登录" affordance with a more polished icon treatment.

## Requirements

- Add an icon or avatar-like mark to the logged-out account button.
- Preserve the login behavior: clicking the logged-out account entry opens the login modal.
- Keep user-facing labels in Simplified Chinese.
- Preserve the existing authenticated account display and menu behavior.
- Do not touch the user's pending logo replacement in `frontend/public/brand/logo.png`.

## Acceptance Criteria

- [ ] Logged-out account entry includes an icon/mark instead of relying on text alone.
- [ ] Logged-out account button still opens the login modal.
- [ ] Authenticated account button and logout menu still work.
- [ ] Relevant component tests pass.

## Out of Scope

- Changing the login modal flow.
- Changing navigation labels or logo assets.
