# Switch login to email/password and hide Google entrypoint

## Goal

Replace the current Google-OAuth-only sign-in with an email + password flow on the frontend, and hide the Google entrypoint. The product no longer wants to depend on Google OAuth for the MVP login surface; an email/password form is simpler to demo, doesn't need real OAuth credentials in `.env`, and works offline against a local SQLite.

## What I already know

- Backend uses Better Auth with `drizzleAdapter`. The schema is already laid out (`user`, `session`, `account`, `verification`) — see `backend/src/db/schema.ts`.
- The `account` table already has a nullable `password` column — Better Auth's built-in email/password plugin writes the bcrypt-style hash there with `providerId='credential'` + `accountId=userId`. No migration needed.
- Backend auth config currently has `socialProviders.google` enabled and no `emailAndPassword` block — see `backend/src/config/auth.ts:22-27`.
- The Better Auth core docs cover email/password via the top-level `emailAndPassword: { enabled: true, ... }` option on `betterAuth()`. Sign-in/sign-up endpoints are mounted automatically at `/api/auth/sign-in/email` and `/api/auth/sign-up/email`.
- Frontend modal is `frontend/src/components/auth/LoginModal.vue`. Today it renders a single "Continue with Google" button using `useAuth().signInWithGoogle()`.
- `useAuth` composable will need additional methods (`signInWithEmail`, `signUpWithEmail`); the current Google method should be hidden/removed accordingly.
- Quota system + history are keyed by `user.id`, so the auth provider change is transparent to all downstream data — same user → same records.
- `user.name` is `NOT NULL`. Email/password sign-up must therefore also collect a display name (or default it from the email local-part).
- `user.email` is unique; `verification` table exists for email-verification flow but Better Auth does not require verifying email before sign-in unless we set `emailAndPassword.requireEmailVerification: true`.
- Spec frontend/component-guidelines.md mandates Simplified-Chinese user-facing copy; the new form labels / placeholders / validation messages must comply. The recent network-error wrap (`httpClient.ts`) already routes auth API errors through `ImageApiError`, so sign-in failures will surface as Chinese-language messages automatically as long as the server-side message bodies are mapped (Better Auth's error codes return English by default — may need a code→Chinese map).

## Assumptions (temporary)

- The MVP audience is small (you + a handful of testers), so we accept low-friction password storage rules (≥8 chars, no complexity requirements) — Better Auth defaults are fine.
- No existing Google-linked users need migration; dev DB is throwaway, and there are no prod accounts.
- Hiding Google means we still want the option to re-enable it later, so the `socialProviders.google` block is preserved but feature-flagged off (env-driven) rather than ripped out.
- Email verification is OUT of MVP scope; sign-up is immediately usable after creating an account.

## Open Questions

- All resolved. See Decisions section.

## Decisions

**D1 — Hide Google: soft-hide.** Keep `socialProviders.google` in `auth.ts` source, but make `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` optional in `env.ts`. When either is missing, do NOT register `socialProviders.google` on the betterAuth instance (so Better Auth doesn't error at boot). The `.env.example` keeps Google keys with a comment that they are optional / unset by default. Re-enabling Google later = refill the env values; no code change needed.

**D2 — Sign-up: self-serve in modal.** The modal lets new users create an account on the spot. Fields collected: email + password + 昵称 (display name, required because `user.name NOT NULL`). On success, the user is signed in automatically and the modal auto-closes (same `isAuthenticated` watcher as today).

**D3 — Modal layout: tab-switch.** Top of the modal has two tabs (`登录` / `注册`). Sign-in tab = email + password. Sign-up tab = email + password + 昵称. State (which tab) is local to LoginModal.vue; `useAuthModal` is unchanged.

## Requirements (evolving)

- Frontend modal exposes an email + password form as the primary (and only visible) login surface.
- Backend Better Auth supports email/password sign-in (and sign-up if Q2=yes).
- Google OAuth UI is gone; backend Google config is at minimum hidden from the rendered modal.
- All form labels, placeholders, validation messages, and error toasts are Simplified Chinese.
- Existing session / quota / history behaviour is unchanged after the auth-provider swap.

## Acceptance Criteria (evolving)

- [ ] LoginModal no longer renders the "Continue with Google" button.
- [ ] LoginModal renders two tabs: 登录 (active by default) and 注册.
- [ ] 登录 tab shows 邮箱 + 密码 inputs and a primary 登录 submit button. 注册 tab shows 邮箱 + 密码 + 昵称 inputs and a primary 注册 submit button.
- [ ] Submitting valid 登录 credentials signs the user in; modal auto-closes; `/api/history` + `/api/images/quota` succeed.
- [ ] Submitting valid 注册 fields creates the account, immediately signs the new user in, and closes the modal.
- [ ] Submitting invalid 登录 credentials renders a Simplified-Chinese error toast (`邮箱或密码错误。`).
- [ ] Submitting 注册 with an email that already exists renders `该邮箱已注册，请直接登录。` and keeps the modal open with the 注册 tab still active.
- [ ] All field labels, placeholders, validation messages, and toasts are Simplified Chinese.
- [ ] When `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` is missing, the backend boots successfully (no `socialProviders.google` registered).
- [ ] When both Google envs are present, Better Auth still accepts requests to the Google endpoints (kept functional for future re-enable), but the UI no longer surfaces them.
- [ ] Backend + frontend lint + typecheck + test green; the new sign-in and sign-up flows each have at least one regression test (backend integration + frontend component).
- [ ] Manual browser smoke: open `/`, modal pops, register on 注册 tab, generate one image, refresh page, still signed in. Then sign out (or clear cookie), reopen `/`, sign in on 登录 tab.

## Definition of Done (team quality bar)

- Tests added/updated covering the new auth path.
- Lint / typecheck / tests green on both packages.
- Spec files updated if conventions change (e.g., `backend/database-guidelines.md` if schema changes).
- Manual browser smoke recorded in journal.
- `.env.example` updated to reflect the new env story.
- `git status` reviewed before reporting completion.

## Out of Scope (explicit)

- Email verification, password reset, "forgot password" flow.
- Account-linking (one user → multiple providers).
- Rate limiting / captcha on the sign-in form.
- Password strength meter / typed-policy rules beyond Better Auth defaults.
- Real prod-grade transactional email.
- 2FA / TOTP.

## Technical Notes

- Files likely touched:
  - `backend/src/config/auth.ts` (enable `emailAndPassword`; gate `socialProviders.google` behind a flag or remove the UI access)
  - `backend/src/config/env.ts` (Google env keys become optional behind the flag; new `AUTH_ENABLE_GOOGLE` toggle?)
  - `backend/.env.example` (document Google as optional / disabled)
  - `frontend/src/components/auth/LoginModal.vue` (replace Google CTA with email/password form, follow the modal a11y contract)
  - `frontend/src/composables/useAuth.ts` (new `signInWithEmail` / `signUpWithEmail`; remove or hide `signInWithGoogle`)
  - `backend/tests/...` + `frontend/tests/...` (regression tests)
- Spec to honor:
  - `.trellis/spec/frontend/component-guidelines.md` — modal a11y contract (Esc/focus/aria), Simplified-Chinese copy, wrap-fetch-failures convention.
  - `.trellis/spec/backend/error-handling.md` — preserve the standard ApiErrorEnvelope shape for sign-in failures.
  - `.trellis/spec/backend/database-guidelines.md` — drizzle ownership of schema; if we add columns, follow the documented migration workflow.
