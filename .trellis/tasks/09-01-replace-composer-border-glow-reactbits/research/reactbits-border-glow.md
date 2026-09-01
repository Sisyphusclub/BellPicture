# ReactBits BorderGlow source review

## Sources

- User-provided ReactBits integration contract: `C:/Users/Administrator/.codex/attachments/26d88d62-c759-422d-bb45-327236a46968/pasted-text.txt`.
- Official library index: <https://reactbits.dev/llms.txt>.
- Component page: <https://reactbits.dev/components/border-glow>.

The component page is client-rendered and did not return useful text through the configured fetcher. The user-provided integration contract contains the complete JavaScript + CSS source, usage example, props table, and integration steps. The official `llms.txt` confirms BorderGlow is a copy-friendly React Bits component offered in JavaScript/TypeScript and CSS/Tailwind variants.

## Official contract

- The outer card tracks pointer position and writes `--edge-proximity` and `--cursor-angle`.
- `::before` renders the directional mesh-gradient border.
- `::after` renders a soft edge fill.
- `.edge-light` renders the outer directional glow.
- Effects appear from `:hover` or the optional intro sweep; the official source has no forced focus-active prop.
- The source exposes `edgeSensitivity`, `glowColor`, `backgroundColor`, `borderRadius`, `glowRadius`, `glowIntensity`, `coneSpread`, `animated`, `colors`, and `fillOpacity`.
- No external dependency is required beyond React.

## Current fork differences

The repository's current component began from ReactBits but added forced `active` state, reduced-motion branching, liquid-glass SVG filters and DOM layers, structural-ring masking, custom border-width geometry, and a different outer shadow stack. Agent Chat Input also stores focus state only to drive these extensions.

## Integration decision

Replace the fork with a typed TSX adaptation of the supplied official JavaScript + CSS source. Keep the official behavior and DOM structure, retain the project palette through supported component props, and add only the repository-required reduced-motion CSS override because `animated` remains false. Remove obsolete liquid-glass/focus-active integration code and tests.
