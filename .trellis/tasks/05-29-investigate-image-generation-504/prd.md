# Investigate image generation 504

## Goal

Restore production image generation after user reported `生成失败，请求失败，状态码 504`.

## What I already know

- Production frontend and backend containers are running.
- Upload requests succeed before generation.
- Backend logs show `/api/images/generate` reaches the image provider.
- Failures are logged as `PROVIDER_TIMEOUT` with status `504`.
- The failing provider calls hit the configured `IMAGE_API_TIMEOUT_MS=120000` exactly.
- Caddy proxy timeout for `pic.chen08.de` backend routes is 300 seconds.
- After raising backend timeout, upstream returned Cloudflare `524`, proving the provider URL was still traversing the public Cloudflare route.
- The local provider container is `chatgpt2api` on Docker network `chatgpt2api_default`.
- Backend can reach `http://chatgpt2api/v1/models` once it joins that external network.

## Requirements

- Identify whether the 504 is from app proxy, backend, or upstream provider.
- Apply a production-safe mitigation without changing database or image volumes.
- Route backend provider traffic through the Docker internal network, not the public Cloudflare hostname.
- Verify backend is healthy after the mitigation.
- Report the residual risk if the upstream provider remains slow.

## Acceptance Criteria

- [ ] Cause of 504 is identified from logs.
- [ ] Backend generation timeout is increased below the outer proxy timeout.
- [ ] Backend provider URL uses the internal provider container route.
- [ ] Backend container is recreated/restarted with the new env value.
- [ ] Health check passes after restart.

## Out of Scope

- Rewriting generation to async jobs.
- Changing provider API keys.
- Database/schema changes.
