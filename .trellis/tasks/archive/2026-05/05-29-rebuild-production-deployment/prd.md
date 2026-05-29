# Rebuild production deployment

## Goal

Rebuild and restart the production frontend container so the pushed image preview navigation fix is live.

## What I already know

* User reports production has not updated after the GitHub push.
* Local `main` matches `origin/main` at `f2c28d0`.
* The fix commit is `5325fe5 fix: hide navigation during image preview`.
* `docker-compose.yml` defines `frontend` and `backend`; the preview navigation fix only changes frontend code.
* The current frontend container was created before the fix and needs rebuilding.

## Requirements

* Rebuild the frontend image from the current repository state.
* Recreate/restart the frontend container.
* Do not reset backend data or volumes.
* Verify the service is running after rebuild.

## Acceptance Criteria

* [ ] `docker compose ps` shows `frontend` running after rebuild.
* [ ] The frontend container/image was recreated after the rebuild command.
* [ ] Git status is reported.

## Out of Scope

* Code changes.
* Backend rebuild unless the frontend rebuild reveals a dependency issue.
* Database or volume changes.
