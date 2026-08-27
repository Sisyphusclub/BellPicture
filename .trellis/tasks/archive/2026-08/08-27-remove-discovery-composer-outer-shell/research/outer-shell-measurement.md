# Discovery composer outer-shell measurement

At `1280 x 720`, non-docked state:

- `.landing-liquidglass-target`: `940 x 142.67px`, gradient background, `0.67px` border, shadow, `20px` radius.
- `.landing-composer`: `938.67 x 141.33px`, its own background and rounded BorderGlow shell.
- `.landing-composer-layout` and `.landing-composer-content`: transparent, no border, no shadow, no padding.

The screenshot's duplicate shell is therefore the LiquidGlass target, not either Motion wrapper. Remove the
LiquidGlass component from the Landing route and preserve a plain anchor div for behavior. The inner beUI
composer must become the sole painted surface.

