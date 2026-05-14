# Logged-in users get 20 daily image generations

## Goal

Authenticated users should reliably see and use their daily image-generation quota: 20 generations per server-local day by default, decremented after successful generation, and reset automatically on the next day. The frontend must not leave a logged-in user stuck on `额度暂不可用` when the quota endpoint is temporarily unavailable or when the page first loaded before login.

## What I already know

- User request: `额度暂不可用那 只要登录了就给20次 生图次数 次日刷新`.
- Backend already has per-user daily quota in `backend/src/services/userQuota.service.ts`.
- Backend `snapshot()` returns `{ total: env.DAILY_USER_QUOTA, remaining: total - usedToday }`; if the user has no row or the stored `quotaDate` is not today, it treats used count as `0`.
- Backend `consume(count)` upserts `user_quota` with today's date and decrements remaining after successful generation.
- `env.DAILY_USER_QUOTA` defaults to 20 in the existing test expectations and API behavior.
- Frontend `frontend/src/composables/useImageQuota.ts` fetches `/api/images/quota` once per module lifetime and stores `quota = null` on failure.
- Frontend `frontend/src/views/GenerateView.vue` displays `额度暂不可用` whenever `quota` is null.
- Current likely bug: if quota fetch runs before authentication, it receives 401, sets `requested = true`, and does not automatically refresh after the user signs in; the logged-in user can remain on `额度暂不可用` even though backend quota is valid.
- `GenerateView.vue` already calls `refreshQuota()` after a successful generation.

## Assumptions (temporary)

- The product default is exactly 20 generations per logged-in user per server-local calendar day.
- Backend enforcement should remain authoritative; frontend labels are UX only.
- We should not add paid tiers, admin quota controls, or per-model quota in this task.

## Open Questions

- None.

## Requirements

- Logged-in users receive 20 image generation attempts per day by default.
- The quota resets the next server-local day.
- Quota is decremented by the requested generation count after successful generation.
- Frontend must refresh quota after login/session becomes authenticated, not only on initial page load.
- Frontend must not leave authenticated users on `额度暂不可用` because of a stale pre-login 401 result.
- If an authenticated quota fetch is temporarily unavailable, the UI should optimistically show the default daily quota as `剩余额度 20`.
- Backend remains the source of truth for quota exhaustion and daily reset; optimistic UI must not bypass backend `QUOTA_EXHAUSTED`.

## Acceptance Criteria

- [ ] Fresh logged-in user sees `剩余额度 20` on the generate page.
- [ ] After generating 1 image, the UI refreshes to `剩余额度 19`.
- [ ] After generating `count = 2`, remaining decreases by 2.
- [ ] If the page fetched quota while unauthenticated, signing in triggers a quota refresh and replaces `额度暂不可用` with the server quota or the optimistic default `剩余额度 20`.
- [ ] If a logged-in quota fetch fails due to temporary network/server failure, the label shows `剩余额度 20` rather than `额度暂不可用`.
- [ ] Existing backend daily reset behavior remains covered by tests or existing verified tests.
- [ ] Frontend tests cover authenticated refresh behavior and no stale quota-unavailable state after login.
- [ ] Frontend/backend lint, typecheck, and relevant tests pass.

## Definition of Done

- Tests added/updated for the changed frontend quota behavior and any touched backend quota contract.
- Lint/typecheck/tests pass for affected packages.
- Manual browser smoke: sign in, load generate page, confirm remaining quota; generate once, confirm decrement.
- Spec updated if a reusable auth-dependent fetch/refresh convention emerges.
- Git status reviewed before completion.

## Out of Scope

- Paid quota tiers or configurable per-user overrides.
- Admin quota dashboard.
- Multiple quota pools by model/provider.
- Changing production env/default values unless required by existing code.
- Changing unauthenticated access rules for generation endpoints.

## Technical Notes

- Relevant backend files:
  - `backend/src/services/userQuota.service.ts`
  - `backend/src/controllers/images.controller.ts`
  - backend controller tests around `/api/images/quota` and `/api/images/generate`
- Relevant frontend files:
  - `frontend/src/composables/useImageQuota.ts`
  - `frontend/src/views/GenerateView.vue`
  - `frontend/src/services/api/imagesApi.ts`
  - auth/session composables in `frontend/src/composables/useAuth.ts`
- Current UI label source: `GenerateView.vue` `quotaLabel` returns `额度暂不可用` when `quota.value` is null.

## Technical Approach

- Keep `backend/src/services/userQuota.service.ts` as the authoritative quota enforcement boundary.
- On the frontend, make quota state auth-aware: after session becomes authenticated, refresh quota again even if an earlier unauthenticated request failed.
- Represent the optimistic fallback as the same shape as the API response (`{ total: 20, remaining: 20 }`) only for authenticated users when quota fetch fails; this keeps the UI simple while backend remains authoritative.
- Continue refreshing quota after successful generation so real server remaining replaces the optimistic value.

## Decision (ADR-lite)

**Context**: The backend already grants each authenticated user a daily quota and resets it by server-local date, but the frontend can show `额度暂不可用` if the initial quota request fails before login or during a transient issue.

**Decision**: Use optimistic frontend display for authenticated quota-read failures: show `剩余额度 20`, refresh after login and generation, and keep backend as the source of truth for quota exhaustion.

**Consequences**: A user may briefly see 20 even if they already consumed quota and the quota endpoint is unavailable. This is acceptable because generation still calls the backend, which enforces the real remaining count and returns `QUOTA_EXHAUSTED` if needed.

## Expansion Sweep

### Future evolution

- The quota model may later support paid tiers or admin overrides; keep backend service as the authoritative boundary.
- Auth-dependent frontend fetches may need a common pattern: wait for authenticated session, then fetch; clear or retry on logout/login transitions.

### Related scenarios

- History and quota requests both depend on auth; their 401 behavior should stay consistent.
- Generation should continue to rely on backend 429 `QUOTA_EXHAUSTED` rather than trusting frontend remaining count.

### Failure / edge cases

- Initial unauthenticated quota fetch should not permanently poison the quota state after login.
- Network failure after login should not bypass backend quota enforcement.
- Cross-day reset should be based on backend/server-local date, not frontend clock.
