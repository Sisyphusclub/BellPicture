# Image API Key Settings

> **Status**: Verified for task `09-08-sub2api-user-image-key`.

## Scenario: private account credential settings

### 1. Scope / Trigger

- Trigger: desktop and mobile authenticated shells need one consistent settings
  workflow for an account-scoped sub2api Key.
- Scope: runtime API validation, account-isolated shared state, modal form
  behavior, status labels, and localized failure messages.

### 2. Signatures

```ts
interface ImageApiKeyStatus {
  configured: boolean;
  keySuffix?: string;
}

fetchImageApiKeyStatus(): Promise<ImageApiKeyStatus>;
saveImageApiKey(apiKey: string): Promise<ImageApiKeyStatus>;
deleteImageApiKey(): Promise<ImageApiKeyStatus>;

useImageApiKey(): {
  status: ImageApiKeyStatus | null;
  isLoading: boolean;
  isMutating: boolean;
  error: Error | null;
  refresh(): Promise<void>;
  save(apiKey: string): Promise<ImageApiKeyStatus>;
  remove(): Promise<ImageApiKeyStatus>;
};
```

### 3. Contracts

- `imageApiKeyApi` is the only network boundary and calls
  `/api/settings/image-api-key` with authenticated fetches. It parses response
  JSON as `unknown` and accepts only `{ configured: false }` or
  `{ configured: true, keySuffix: string[1..4] }`.
- No frontend state receives a saved plaintext or encrypted Key. The password
  input is a modal-local replacement draft, clears after success and whenever
  the dialog opens, and uses `autocomplete="new-password"`.
- `useImageApiKey` is a `useSyncExternalStore` cache owned by the authenticated
  user id. Logout/account switch invalidates in-flight work and exposes an empty
  snapshot before the next account status arrives.
- Desktop account menu and mobile sidebar open the same
  `ImageApiKeySettingsDialog`. Menus close before opening the modal.
- Configured state displays only `尾号 <suffix>`. Unconfigured state says it
  uses platform quota. The Generate view replaces the quota callout with the
  personal-Key source label when configured.
- Save means validate-and-save or validate-and-replace. Delete is an explicit
  `移除 Key` action and reports that future calls use platform quota.

### 4. Validation & Error Matrix

| API code/condition                         | UI behavior                                           |
| ------------------------------------------ | ----------------------------------------------------- |
| `PROVIDER_KEY_INVALID`                     | `这个 API Key 未通过 sub2api 鉴权。`                  |
| `PROVIDER_KEY_MODEL_UNAVAILABLE`           | explain the group lacks the current image model       |
| `PROVIDER_KEY_VALIDATION_FAILED`           | explain sub2api validation is temporarily unavailable |
| `RATE_LIMITED`                             | ask the user to retry later                           |
| `BAD_REQUEST`                              | explain the Key format is invalid                     |
| Invalid success payload                    | throw `INVALID_RESPONSE`; never render leaked fields  |
| Network/unknown failure                    | stable generic Chinese error; no raw provider body    |
| Empty/whitespace draft or mutation pending | submit disabled/no duplicate mutation                 |

### 5. Good/Base/Bad Cases

- Good: an authenticated user opens settings from either shell, sees suffix
  only, validates a replacement, and the Generate source label updates across
  mounted consumers.
- Base: no Key displays platform-quota status and the existing generator flow.
- Bad: cache one global configured flag without a user id; account B can briefly
  see account A's suffix.
- Bad: cast `response.json()` to `ImageApiKeyStatus`, persist the draft in
  browser storage, or repopulate the input from a suffix.

### 6. Tests Required

- API tests cover GET/PUT/DELETE method/body and reject malformed or
  secret-bearing status payloads.
- Hook tests cover initial load, successful mutation, localized error mapping,
  and account-switch isolation with a deferred response.
- Dialog tests cover suffix-only display, cleared replacement draft, explicit
  removal, disabled duplicate submit, and localized errors.
- Desktop/mobile entry tests assert a single settings action and current status;
  Generate tests assert personal-Key source text replaces quota text.
- Browser QA covers the open dialog at desktop and mobile widths, keyboard
  focus, password visibility, wrapping, and overlap.

### 7. Wrong vs Correct

#### Wrong

```ts
const status = (await response.json()) as ImageApiKeyStatus;
localStorage.setItem("image-api-key", apiKey);
```

#### Correct

```ts
const payload: unknown = await parseJsonResponse(response);
if (!isImageApiKeyStatus(payload)) throw invalidResponse();
store.set({
  userId,
  status: payload,
  isLoading: false,
  isMutating: false,
  error: null,
});
```
