# Admin user management and auth recovery

## Goal

Add an admin-only user management surface for Blur, so the administrator can create users, delete users, and manage user image-generation quotas from the app. Restore Google login in the login/register flow, while keeping ordinary users from seeing or calling admin capabilities. Forgot password is intentionally excluded from this MVP.

## What I already know

* User asked to set `Blur` as the administrator account.
* Admin navigation should show a `用户管理` entry only for the admin account; ordinary users must not see it.
* Admin user management must support user quota management, user deletion, and user creation.
* Login/register should restore Google login.
* User clarified that forgot password should not be included in this MVP.
* Existing frontend auth lives in `frontend/src/composables/useAuth.ts`, `frontend/src/components/auth/LoginModal.vue`, and `frontend/src/lib/authClient.ts`.
* Frontend already has `signInWithGoogle()` in `useAuth`, and `authClient` uses Better Auth with `usernameClient()`.
* Backend Better Auth config in `backend/src/config/auth.ts` already wires Google as an optional provider when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.
* Current LoginModal only exposes username/password sign-in and sign-up; the Google entry has been removed from the UI.
* Existing auth schema has Better Auth `user`, `session`, `account`, `verification` tables plus app `user_quota` and `image_records` tables in `backend/src/db/schema.ts`.
* Existing `user` table has no role/admin column.
* Existing user quota is global daily quota from env `DAILY_USER_QUOTA` minus `user_quota.used_today`; there is no per-user quota override yet.
* Existing `defaultAdminSeed.service.ts` seeds username `admin` / password `admin123` when `SEED_DEFAULT_ADMIN=true`; it does not seed `Blur` and does not persist an admin role.
* Existing `requireAuth` attaches `req.user` with id/email/username/name/image only.
* Existing sidebar navigation lives in `frontend/src/components/common/AppHeader.vue`; nav items are static and currently `发现`, `生图`, `资产`.

## Assumptions (temporary)

* Admin identity should be stored server-side, not inferred only in the frontend.
* `Blur` should be matched by normalized username `blur` unless the existing account uses another canonical identifier.
* The implementation should add explicit admin authorization middleware for admin APIs.
* User chose per-user daily total quota management for this MVP; remaining quota should be derived from daily total minus today's used count.
* Forgot password is excluded for this MVP, so no email/reset-token flow is needed now.

## Open Questions

* None for MVP after excluding forgot password.

## Requirements (evolving)

* Mark `Blur`/`blur` as the administrator account in persistent backend data.
* Admin-only API authorization must be enforced on the backend; frontend hiding is not sufficient.
* Sidebar navigation should add `用户管理` only when the signed-in user is admin.
* Ordinary users must not see `用户管理` and must receive a forbidden response if they call admin endpoints directly.
* Admin user management should list users with at least username/name/email, created time, quota state, and admin indicator.
* Admin user management should create a username/password user.
* Admin user management should delete a user, while preventing accidental deletion of the active admin account.
* Admin user management should update each user's daily total quota; remaining quota is derived from daily total minus today's used count.
* Login/register modal should restore a Google login button using existing Better Auth Google provider support.
* Google login should be disabled or show a clear unavailable state if Google env vars are not configured.
* Login/register modal should not add forgot-password UI in this MVP.
* All user-facing UI/aria copy should remain Simplified Chinese.

## Acceptance Criteria (evolving)

* [ ] `Blur`/`blur` is recognized as admin after login, and this is backed by server-side authorization state.
* [ ] Admin sees `用户管理` in navigation; ordinary users do not.
* [ ] Direct calls to admin APIs by ordinary users return a forbidden response.
* [ ] Admin can list users with quota information.
* [ ] Admin can create a username/password user.
* [ ] Admin can delete a non-admin user.
* [ ] Admin cannot delete the current admin account.
* [ ] Admin can update a user's daily total quota, and the user's remaining quota reflects that total minus today's usage.
* [ ] Google login button appears in the login/register flow and calls existing social sign-in.
* [ ] Forgot-password UI/API is not added in this MVP.
* [ ] Backend tests cover admin authorization, user CRUD, quota update, and forbidden ordinary-user access.
* [ ] Frontend tests cover admin-only navigation, hidden navigation for ordinary users, Google login UI, forgot-password UI, and user management interactions where practical.
* [ ] Backend and frontend lint/typecheck pass.

## Technical Approach

* Add persistent admin/role state to backend user data, with `blur` seeded or promoted as admin. Backend admin middleware should check this state on every admin route.
* Add persistent per-user daily quota total, likely as a nullable/defaulted quota field associated with the user or quota table. Effective daily total should fall back to `DAILY_USER_QUOTA` when no override exists.
* Add admin API routes under a protected namespace such as `/api/admin/users`:
  * `GET /api/admin/users` returns users with admin flag, quota total, used today, remaining today, and created time.
  * `POST /api/admin/users` creates a username/password user.
  * `PATCH /api/admin/users/:id/quota` updates daily total quota.
  * `DELETE /api/admin/users/:id` deletes a non-current, non-protected user.
* Add frontend admin API client/composable and a `用户管理` route/view.
* Extend auth session/user shape enough for frontend to know `isAdmin`, but still enforce admin permission on backend.
* Restore Google login button in `LoginModal.vue` by wiring existing `signInWithGoogle()`.
* Do not add forgot-password UI/API in this MVP.

## Decision (ADR-lite)

**Context**: This task changes authentication, authorization, quota enforcement, database shape, and frontend navigation. The MVP needs admin power without creating a broad role system.

**Decision**: Use a minimal admin-vs-user model, promote/seed normalized username `blur` as admin, expose admin-only `/api/admin/users` endpoints, store per-user daily quota totals, and derive remaining quota from daily total minus today's used count. Restore Google login through the existing Better Auth social provider support. Do not implement forgot password in this MVP.

**Consequences**: This keeps scope small and testable, but leaves multi-role permissions, user self-service account management, and password recovery for later tasks. Backend authorization is mandatory; frontend hidden navigation is only UX.

## Expansion Sweep

* Future evolution: the admin flag can later grow into role/permission tables; user management can later add search, pagination, audit logs, and password reset.
* Related scenarios: quota reads in generation should use the same effective per-user daily total that admin updates; Google login should coexist with username/password accounts.
* Failure and edge cases: ordinary users calling admin APIs must receive forbidden responses; admin cannot delete the current admin account; invalid quota totals and duplicate usernames must return localized validation errors.

## Definition of Done

* PRD decisions are resolved before implementation.
* Code-spec depth is applied because this changes auth, authorization, API contracts, DB schema, and quota behavior.
* Backend tests and frontend tests are added/updated.
* Browser verification covers admin login/navigation and ordinary-user hidden nav behavior.
* Git status is checked and reported.

## Out of Scope (draft)

* Multi-role permission matrix beyond admin vs ordinary user.
* Public self-service profile editing.
* Bulk user import/export.
* Forgot password, password reset tokens, and email delivery.
* Changing the image generation provider or prompt workflow.

## Technical Notes

* Backend auth config: `backend/src/config/auth.ts`.
* Backend username auth wrapper: `backend/src/routes/auth.ts`.
* Backend schema: `backend/src/db/schema.ts`.
* Backend user quota: `backend/src/services/userQuota.service.ts`.
* Backend default admin seed currently seeds `admin`, not `Blur`: `backend/src/services/defaultAdminSeed.service.ts`.
* Backend request auth shape: `backend/src/types/express.ts` and `backend/src/middlewares/requireAuth.ts`.
* Frontend auth composable: `frontend/src/composables/useAuth.ts`.
* Frontend auth client: `frontend/src/lib/authClient.ts`.
* Frontend login modal: `frontend/src/components/auth/LoginModal.vue`.
* Frontend nav: `frontend/src/components/common/AppHeader.vue`.
