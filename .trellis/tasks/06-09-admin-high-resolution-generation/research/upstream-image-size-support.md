# Upstream Image Size Support

## Question

How should the app represent 2K/4K generation when the current provider is OpenAI-compatible and already sends a `size` string?

## Findings

- The provider implementation already uses the OpenAI-compatible `size` request field for both text-to-image JSON requests and image-to-image multipart edit requests.
- Current standard sizing is local app policy, not a provider discovery result.
- Public GPT-image-2 compatible docs describe explicit pixel sizes and high-resolution dimensions as request `size` values, so the app can extend the existing size mapping without introducing a new provider method.
- Keep the app contract as `resolution` instead of `quality`, because provider quality tiers and pixel dimensions are separate concepts.

## Decision

- Add app-level `resolution: "standard" | "2k" | "4k"`.
- Keep `ASPECT_SIZE_MAP` as the standard map for existing callers.
- Add high-resolution maps keyed by `resolution + aspectRatio`.
- Route 2K/4K through a dedicated app endpoint and the same provider interface with explicit `size`.

## Candidate Size Policy

- `standard`: existing sizes.
- `2k`: max edge around 2048 px, preserving current supported aspect ratios.
- `4k`: legal high-resolution sizes with max edge up to 3840 px and total pixels at or below 3840 x 2160 where needed.
