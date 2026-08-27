# Motion content scale correction

## Observed behavior

- The outer `.landing-composer-layout` FLIP projection scales from the expanded box to the compact box.
- Text and controls are descendants, so they inherit the parent transform and visibly grow during collapse.
- At `1280px`, the dock center is `664.33px` while `.landing-hero__content` is centered at `696.33px`.

## Implementation constraint

Keep the outer compositor transform for the surface, but establish a nested Motion layout boundary for
the existing `AgentChatInput` so Motion can correct the parent's scale for readable content. Validate the
rendered text or a stable control rectangle during multiple animation frames; checking only the outer
transform is insufficient.

If nested projection does not keep content scale near `1`, use an explicit inverse-scale Motion value on a
content wrapper driven by the outer projection. Do not animate width, height, padding, or positioning.

## Centering contract

Desktop discovery content uses `left: calc(50% + 64px)`. The fixed composer must use the same center line.
At `<=860px`, keep the existing `left: 50%` override.

