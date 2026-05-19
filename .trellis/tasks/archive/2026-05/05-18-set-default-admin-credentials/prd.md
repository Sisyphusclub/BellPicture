# Username/password login with default admin account

## Goal

Change Ref2Image Studio from user-facing email/password authentication to username/password authentication, while keeping Better Auth session compatibility and providing a local/demo default admin account for quick access.

## Requirements

* Replace user-facing email/password login with username/password login.
* Keep public/self-service registration, but change registration from email-based to username-based.
* Add first-class username support instead of hiding usernames behind generated email surrogates.
* Provide a usable default account with username `admin` and password `admin123`.
* Auto-create the default admin account only for local/demo use, behind an explicit backend environment gate such as `SEED_DEFAULT_ADMIN=true`.
* Enforce usernames as 3–32 characters, lowercase letters, digits, and underscores only.
* Normalize submitted usernames to lowercase before validation and lookup.
* Keep credential storage compatible with Better Auth password hashing.
* Do not store plaintext passwords in the database.
* Do not create a production weak default credential unless the explicit local/demo seed gate is enabled.
* Use Simplified Chinese for all user-facing login/register labels, placeholders, validation messages, and errors.

## Acceptance Criteria

* [ ] A fresh local/demo database with the seed gate enabled can sign in with `admin` / `admin123`.
* [ ] The login modal labels and placeholders say username/password, not email/password.
* [ ] Registration accepts a valid username and password, creates a user, and allows later sign-in with that username.
* [ ] Registration rejects invalid usernames outside `^[a-z0-9_]{3,32}$` after lowercase normalization.
* [ ] Duplicate usernames are rejected with a Simplified Chinese message.
* [ ] Passwords are stored as Better Auth-compatible hashes, not plaintext.
* [ ] Existing authenticated image/history/quota flows continue to use the Better Auth session user.
* [ ] Backend and frontend tests cover username login/register and default admin seeding.
* [ ] Lint/typecheck/tests pass.

## Definition of Done

* Tests added/updated for backend auth behavior and frontend login/register UI behavior.
* Lint and typecheck pass for changed packages.
* Local/demo seed behavior is explicitly gated and documented in env example.
* Rollback is straightforward: disable the seed gate and revert username login changes.

## Technical Approach

* Add a first-class `username` field with a unique constraint to the Better Auth user model/schema and migration path.
* Keep Better Auth as the session and password-hash authority.
* Add backend username sign-in/sign-up endpoints or adapter logic that resolves username credentials into the existing Better Auth credential account flow.
* Seed `admin` / `admin123` at backend startup only when `SEED_DEFAULT_ADMIN=true`, using the same password hashing path as regular registration.
* Update frontend auth composables and `LoginModal.vue` from email inputs to username inputs.
* Preserve existing session consumers so image generation, history, and quota remain keyed by `user.id`.

## Decision (ADR-lite)

**Context**: The current product uses Better Auth email/password, but the desired UX is username/password with a default `admin` account.

**Decision**: Implement first-class username support, keep username registration public, and seed the default admin account only behind an explicit local/demo environment gate.

**Consequences**: This requires backend schema/auth changes instead of a simple UI alias, but gives a clean user-facing model and avoids leaking generated internal email addresses. The default weak password remains constrained to local/demo environments by configuration.

## Out of Scope

* Role-based admin permissions.
* Password reset flows.
* Email verification or email collection.
* Production secret/password rotation beyond gating the default seed.

## Technical Notes

* `backend/src/config/auth.ts` wires Better Auth with the SQLite Drizzle adapter.
* `backend/src/db/schema.ts` defines Better Auth tables; current `user.email` is unique and `user.name` is required, while `username` does not exist yet.
* `backend/src/config/env.ts` currently has no environment-type field or seed flag; add an explicit boolean-like seed gate.
* `backend/.env.example` should document the seed gate and warn against enabling it for production.
* `frontend/src/composables/useAuth.ts` currently exposes `signInWithEmail` and `signUpWithEmail`.
* `frontend/src/components/auth/LoginModal.vue` currently renders email/password login and registration copy.
