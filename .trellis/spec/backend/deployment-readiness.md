# Deployment Readiness

> **Status**: Verified for task `09-01-production-readiness-hardening`.

## Scenario: single-host production deployment

### 1. Scope / Trigger

- Trigger: a public deployment must distinguish process liveness from storage
  readiness, trust only configured proxy hops, keep the backend private to the
  Compose network, and expose the SPA and API through one origin.

### 2. Signatures

```http
GET /api/health/live
GET /api/health/ready
```

```ts
TRUST_PROXY_HOPS: number; // non-negative, default 0
```

```yaml
# Base deployment
docker compose up -d --build

# Optional existing provider network
docker compose -f docker-compose.yml -f docker-compose.provider.yml up -d --build
```

### 3. Contracts

- `/api/health/live` returns `200 { status, uptimeSec, version }` when the
  process can serve requests. It does not touch external dependencies.
- `/api/health/ready` runs `SELECT 1` and verifies the SQLite parent, upload,
  and output directories are writable. Success returns 200 with named checks;
  failure returns `503 { status: "not_ready" }` without filesystem paths.
- Production frontend API calls default to same-origin `/api` and `/v1` paths.
  Nginx is the public boundary; the backend has no host `ports` mapping in the
  base Compose file.
- The base deployment has no mandatory external provider network. Operators
  opt into `docker-compose.provider.yml` only when that network already exists.
- `TRUST_PROXY_HOPS=0` is the safe default. Increase it only to the exact number
  of trusted reverse proxies so IP rate limiting cannot be spoofed with
  `X-Forwarded-For`.
- TLS terminates before or at Nginx. SQLite WAL backup must include a consistent
  database snapshot, and upload/output volumes must be backed up with it.

### 4. Validation & Error Matrix

| Condition                                    | Expected result                 |
| -------------------------------------------- | ------------------------------- |
| Process running, DB/storage writable         | Live 200; ready 200             |
| DB query or required directory check fails   | Live 200; ready 503             |
| Base Compose starts without provider network | Deployment remains valid        |
| Backend port is scanned from the host        | No base Compose mapping         |
| Proxy hop count is malformed or negative     | Backend fails env validation    |
| SPA is served behind production Nginx        | API requests remain same-origin |

### 5. Good/Base/Bad Cases

- Good: an orchestrator restarts on failed liveness and removes an instance
  from traffic on failed readiness.
- Base: local development uses explicit Vite proxy behavior while production
  uses same-origin paths.
- Bad: mapping `3000:3000` in base Compose bypasses Nginx headers and exposes a
  second public boundary.
- Bad: enabling `trust proxy` unconditionally lets clients forge the address
  used by IP-based rate limits.

### 6. Tests Required

- Route tests assert live and ready success payloads plus ready 503 behavior.
- Env tests assert `TRUST_PROXY_HOPS` accepts zero/positive integers and rejects
  invalid values.
- CI runs install, production audit, format, lint, typecheck, tests, and build
  independently for frontend and backend on Node 22.
- Before release, parse both Compose YAML files and perform runtime validation
  with Docker on a Docker-capable host.

### 7. Wrong vs Correct

#### Wrong

```yaml
backend:
  ports: ["3000:3000"]
  networks: [required-provider-network]
```

#### Correct

```yaml
backend:
  expose: ["3000"]
  healthcheck:
    test:
      [
        "CMD-SHELL",
        'node -e "fetch(''http://127.0.0.1:3000/api/health/ready'').then(r => process.exit(r.ok ? 0 : 1))"',
      ]
```
