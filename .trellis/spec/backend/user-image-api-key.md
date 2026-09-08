# User Image API Key Integration

> **Status**: Verified for task `09-08-sub2api-user-image-key`.

## Scenario: account-scoped sub2api credentials

### 1. Scope / Trigger

- Trigger: authenticated users may supply their own sub2api image-group Key for
  standard image generation.
- Scope: encrypted storage, settings endpoints, credential validation, provider
  routing, quota selection, and secret-safe errors/logging.
- High-resolution admin generation and external OpenAI-compatible `/v1` routes
  remain platform-credential paths.

### 2. Signatures

```ts
// Authenticated settings API
GET / api / settings / image - api - key;
PUT / api / settings / image - api - key; // body: { apiKey: string }
DELETE / api / settings / image - api - key;

interface UserImageApiKeyStatus {
  configured: boolean;
  keySuffix?: string;
}

interface ProviderCredentialValidationInput {
  credential: string;
  model: string;
  requestId?: string;
  signal?: AbortSignal;
}

interface GenerateInput {
  providerCredential?: string; // server-internal only
}
```

```sql
user_image_api_keys(
  user_id text primary key references user(id) on delete cascade,
  encrypted_key text not null,
  key_suffix text not null,
  created_at integer not null,
  updated_at integer not null
)
```

### 3. Contracts

- `USER_API_KEY_ENCRYPTION_KEY` is required and must be canonical base64 that
  decodes to exactly 32 bytes. Generate it with `openssl rand -base64 32`.
- Store one row per user. Encrypt normalized Key text with AES-256-GCM and a
  random 12-byte IV. Persist `v1.<iv>.<tag>.<ciphertext>` with base64url
  segments and use `userId` as authenticated additional data.
- Only the last four characters may remain in plaintext. GET, PUT, and DELETE
  return status only; they never return the credential or encrypted payload.
- PUT trims a `1..4096` character string, calls provider `GET /v1/models` with
  that Key, and saves only when the response authenticates and includes the
  configured `IMAGE_MODEL`. A failed replacement leaves the old row intact.
- PUT and DELETE use the settings mutation limiter: 10 requests per minute per
  authenticated user. GET remains behind `requireAuth` without that limiter.
- Standard generation loads the current user's decrypted credential once. When
  present, it overrides only that provider request and skips all bellpicture
  quota reserve/commit/release operations. When absent, the platform
  `IMAGE_API_KEY` and existing quota path remain authoritative.
- A personal-Key provider failure is returned directly and never retried with
  the platform Key. Text-to-image and reference-image generation share this
  routing rule.
- A personal Key must never cross to `HIGH_RES_IMAGE_API_BASE_URL`; 2K/4K uses
  the configured high-resolution/platform credential and existing admin rules.

### 4. Validation & Error Matrix

| Condition                                                   | Result                                                |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| Missing session on any settings route                       | 401 `UNAUTHORIZED`                                    |
| PUT body missing/empty/whitespace or over 4096 characters   | 400 `BAD_REQUEST`                                     |
| `/v1/models` returns 401/403                                | 400 `PROVIDER_KEY_INVALID`; do not save               |
| Model list omits `IMAGE_MODEL`                              | 400 `PROVIDER_KEY_MODEL_UNAVAILABLE`; do not save     |
| Validation times out, is unreachable, non-2xx, or malformed | 502/504 `PROVIDER_KEY_VALIDATION_FAILED`; do not save |
| Saved Key gets 401/403 during generation                    | 400 `PROVIDER_KEY_INVALID`; no platform retry         |
| Ciphertext version/dimensions/authentication fail           | 500 `INTERNAL`; fail closed                           |
| Personal-Key standard generation succeeds or fails          | bellpicture quota is unchanged                        |
| No personal Key                                             | existing platform credential and quota behavior       |

### 5. Good/Base/Bad Cases

- Good: user A validates and stores a Key, then a standard reference-image
  request sends it as the upstream Bearer token without changing A's quota.
- Base: user B has no row, so generation uses `IMAGE_API_KEY` and performs the
  existing quota reservation and settlement.
- Bad: store plaintext, return it to the UI, or log an Authorization header.
- Bad: treat validation failure as permission to overwrite the current Key or
  silently fall back to the platform credential.
- Bad: attach a personal Key to an admin high-resolution provider origin.

### 6. Tests Required

- Service tests cover encryption round-trip, non-deterministic ciphertext,
  user-id AAD isolation, replacement, deletion, and corrupt payload failure.
- Route tests cover auth, status-only DTOs, save/replace/delete, validation
  ordering, all provider validation errors, and preservation of an old Key.
- Provider tests assert `/v1/models` Bearer validation, model membership,
  per-request standard overrides, generation 401/403 mapping, and high-resolution
  credential isolation.
- Controller tests assert a personal Key works with zero quota and leaves quota
  unchanged on success/failure; platform generation keeps existing accounting.
- Env tests reject missing, malformed, non-canonical, and wrong-length master
  keys. Logging tests/review assert all credential field variants are redacted.

### 7. Wrong vs Correct

#### Wrong

```ts
const provider = new TwoApiImageProvider({ ...config, apiKey: userKey });
await quota.reserve(user.id, count);
try {
  return await provider.generate(input);
} catch {
  return platformProvider.generate(input);
}
```

#### Correct

```ts
const providerCredential = userImageApiKeys.getProviderCredential(user.id);
return imageGeneration.generate(
  { ...input, ...(providerCredential ? { providerCredential } : {}) },
  providerCredential ? undefined : userQuotaPool(user.id),
);
```
