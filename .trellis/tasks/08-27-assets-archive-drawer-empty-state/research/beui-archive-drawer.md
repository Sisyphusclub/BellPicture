# beUI Pro Archive drawer research

## Official source

- Catalog: https://pro.beui.dev/components/empty-states
- Registry item: `@beui-pro/empty-state-archive`
- Registry file label: `empty-state-archive.tsx`
- Public usage export: `EmptyStateArchive` from `@/components/premium/empty-states`

The public catalog describes the block as “A quiet isometric filing cabinet whose empty drawer springs open and extends on hover.” The registry source is locked unless `BEUI_PRO_TOKEN` is configured. The current project environment has no token, so `npx shadcn@latest view @beui-pro/empty-state-archive` cannot retrieve the protected file.

## Public preview observations

The rendered preview exposes the complete illustration DOM:

- Wrapper: centered section, minimum height `390px`, maximum width `520px`, horizontal padding `20px`, vertical padding `36px`.
- Illustration: SVG `viewBox="0 0 320 300"`, maximum rendered width `205px`.
- Cabinet paths:
  - `M88 58 174 12l91 54-87 47Z`
  - `m88 58 90 55v153l-90-53Z`
  - `m178 113 87-47v151l-87 49Z`
  - `m95 217-10 6v17l13 8`
  - `m246 227 12-7v16l-12 7Z`
  - `m88 72 90 54 87-47`
  - `m88 136 90 54 87-48`
- Drawer paths:
  - `m106 139 72 43 69-38-70-42Z`
  - `m106 139 71 43v72l-71-42Z`
  - `m177 182 70-38v70l-70 40Z`
  - `m118 145 59 35 57-31-59-35Z`
- Detail paths:
  - `m126 175 21 12 14-8`
  - `m118 159 22 13 14-8`
  - `m119 91 23 14 15-8-23-14Z`
  - `m126 118 21 13 14-8`

After the entrance settles, the drawer group is translated `-18px, 13px`. Hovering the illustration extends it to `-28px, 19px`; moving to the text/action returns it to the settled position. The outer art enters from `translateY(12px)` and opacity `0`; cabinet paths animate from hidden path length/opacity to a complete stroke.

## Product adaptation

Nebulens should preserve the exact illustration geometry and interaction while changing only content and action wiring:

- `No data yet` -> `还没有资产`
- Supporting copy -> `完成第一次创作后，生成结果会保存在这里。`
- `Add data` -> `开始创作`, navigating to `/generate`
- Shared Nebulens `Button` replaces the preview button styling adapter.
- Reduced motion renders the complete static cabinet and skips transform/opacity transitions.
