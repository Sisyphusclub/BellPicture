# Fix ordinary user admin access

## Goal

Newly registered ordinary users must not receive admin navigation or admin API access because of their username. The reported user registered as `blur` and unexpectedly saw "用户管理", which indicates admin status was granted incorrectly.

## Requirements

- Admin authorization must depend only on the persisted `user.is_admin` flag.
- Registering or logging in as username `blur` must not automatically promote that account.
- `/api/auth/me` must return `isAdmin: false` for a non-admin `blur` user.
- `/api/admin/*` must return `403 FORBIDDEN` for a non-admin `blur` user.
- The frontend should continue to show "用户管理" only when `/api/auth/me` reports `isAdmin: true`.
- Correct the current production `blur` account back to ordinary user if it was auto-promoted.

## Acceptance Criteria

- [ ] Backend tests prove `isUserAdmin()` does not mutate or promote username `blur`.
- [ ] Backend admin route tests prove non-admin `blur` receives 403.
- [ ] Existing explicit seed behavior remains covered and gated by `SEED_DEFAULT_ADMIN`.
- [ ] Production `blur` row has `is_admin = 0` after deployment.
- [ ] Backend and frontend relevant tests, lint, and typecheck pass.

## Definition of Done

- Root cause removed from backend service code.
- Tests updated for the regression.
- Specs updated if the admin-role contract changed or was clarified.
- Changes committed, pushed, deployed, and production state corrected.

## Technical Approach

Remove the username-based auto-promotion path from `adminUser.service`. Treat `user.is_admin` as the only runtime authorization source. Keep the explicit seed service as the sole code path that may create/promote a default admin when `SEED_DEFAULT_ADMIN=true`.

## Decision (ADR-lite)

**Context**: The backend currently has an `ADMIN_USERNAME = blur` auto-promotion helper called inside `isUserAdmin()`, `listAdminUsers()`, and `getAdminUser()`. This makes any public registration with username `blur` an admin.

**Decision**: Delete the implicit username-admin behavior. Admin status is persistent data, not derived from username.

**Consequences**: Existing legitimate admins remain admins if their `is_admin` flag is true. A mistaken production user can be demoted with a one-time DB update. Future admin creation must be explicit via seed/admin-management flow.

## Out of Scope

- Building a new admin role assignment UI.
- Changing Better Auth session structure.
- Renaming the reported `blur` user.

## Technical Notes

- Root cause: `backend/src/services/adminUser.service.ts` auto-promotes username `blur`.
- Production confirmation: user `blur@users.ref2image.local` currently has `is_admin = 1`.
- Relevant tests: `backend/tests/routes/adminUsers.spec.ts`, `backend/tests/routes/auth.spec.ts`.
