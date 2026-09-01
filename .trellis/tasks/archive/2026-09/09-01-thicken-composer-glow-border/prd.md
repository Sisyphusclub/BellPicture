# 加粗输入框光效描边

## Goal

提升首页创作输入框激活态光效描边的可见度，让青、蓝、橙边界比当前 1px 更清晰，同时保持现有色彩、圆角、表面材质和交互行为不变。

## Requirements

- 将共享 BorderGlow 的结构光环提升到 2px。
- 描边宽度同时驱动伪元素的边框、外扩距离和圆角补偿，避免出现空隙、错位或角部断层。
- 首页 Discover 与 Generate 继续使用同一套 BorderGlow 厚度和颜色模型。
- 保留默认态静态边框、聚焦激活逻辑、方向柔光和 reduced-motion 行为。

## Acceptance Criteria

- [x] 激活输入框时，结构光环计算宽度为 2px。
- [x] `::before` 与 `::after` 都使用同一 `--border-width`，且圆角保持同心。
- [x] 首页和生图页的光效厚度一致。
- [x] 1440px 桌面和 390px 移动端没有角部断层、布局位移或水平溢出。
- [x] 相关样式测试、类型检查、lint 和生产构建通过。

## Definition of Done

- 回归测试覆盖描边厚度契约。
- 浏览器中验证默认、hover、focus 和移动端状态。
- 修改以独立 `fix:` 中文提交提交并推送到 `dev`。

## Technical Approach

保留共享 `BorderGlow` 的三层渲染结构。把 `--border-width` 默认值从 1px 提升到 2px，并让结构环伪元素的透明边框也直接使用该变量，使环宽、负 inset 和半径补偿一致。由于项目中只有 beUI Agent Chat Input 使用该组件，这一共享修改可确保 Discover 与 Generate 保持一致。

## Decision (ADR-lite)

**Context**: 单独增加外层模糊只会放大柔光，无法改善截图中偏细的结构边界；仅扩大 inset 而不扩大伪元素边框还会产生间隙。

**Decision**: 将共享结构环从 1px 调整为 2px，并统一以 `--border-width` 驱动环的全部几何参数。

**Consequences**: 激活态边界更清楚，两个创作入口保持一致；默认未激活表面和内部布局不受影响。

## Out of Scope

- 不改变光效颜色、亮度、方向跟随算法或动画时长。
- 不调整输入框尺寸、圆角、内容间距、文案和按钮。
- 不改变默认态静态边框的 1px 几何。

## Technical Notes

- 共享实现：`frontend/src/components/BorderGlow.css`。
- 组件规范：`.trellis/spec/frontend/component-guidelines.md` 中的 Discover / Generate BorderGlow 一致性契约。
- 现有表面契约测试：`frontend/tests/styles/landingComposerSurface.spec.ts`。
