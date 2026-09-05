# Google OAuth redirect requirements

## Sources

* Google OAuth 2.0 for Web Server Applications: <https://developers.google.com/identity/protocols/oauth2/web-server>
* Google OAuth 2.0 Policies: <https://developers.google.com/identity/protocols/oauth2/policies>

## Findings

* The callback URI sent by the application must exactly match an authorized redirect URI, including scheme, host, port, path, case, and trailing slash.
* Web OAuth redirect URIs must use HTTPS outside localhost development.
* Raw public IP addresses are not accepted as redirect hosts; localhost IP addresses are the documented exception.
* Nebulens terminates the Better Auth callback at `/api/auth/callback/google`, so the production registration must be `https://<domain>/api/auth/callback/google`.

## Repository impact

* The current public origin uses a plain-HTTP raw IP and therefore cannot be the production Google OAuth redirect URI.
* Local development can continue using `http://localhost:5173/api/auth/callback/google`.
* Production enablement requires an HTTPS domain plus a Google Web OAuth Client ID and Client Secret; all real secrets stay in the untracked root `.env` or deployment secret store.
