# 优化资产图片悬浮操作栏

## Goal

让资产图片的悬浮操作符合 Nebulens 的 beUI 组件语言：媒体保持主视觉，操作按钮轻量浮现，不再由一条厚重的自定义黑色容器遮挡图片。

## Requirements

- 继续使用共享 beUI `Button`、`IconTooltip`/`MorphicTooltip` 和 `MorphicCard`。
- 删除操作组自定义整条黑色背景、边框和模糊表面。
- 五个动作使用独立的 beUI secondary 图标按钮，保持复制、复用、下载、可见性和删除的原有顺序与行为。
- 操作组位于图片内部底部居中，桌面 hover 与键盘 `focus-within` 时显示。
- 触屏设备保持操作可见；窄卡片下缩小间距并保证整组不溢出图片。
- 保留顶部选择、收藏、图片原始宽高比和详情打开行为。

## Acceptance Criteria

- [ ] 操作组容器没有可见背景、边框或整条黑色底板。
- [ ] 五个动作按钮渲染为共享 `button--secondary button--icon` 组件。
- [ ] 操作组具备 `role="toolbar"` 和可访问名称。
- [ ] 默认态隐藏，hover、键盘聚焦和触屏状态可用。
- [ ] 桌面与 390px 移动端不溢出、不遮挡顶部操作。
- [ ] 相关组件测试、样式契约、类型检查、lint 和构建通过。

## Definition of Done

- 自动化测试覆盖 beUI 按钮变体、工具栏语义和结构位置。
- 浏览器检查默认、hover、键盘/触屏适配与响应式布局。
- 工作区通过项目规定的质量检查并创建独立提交。

## Technical Approach

在 `ImageGrid` 中把动作按钮切换为共享 `secondary` icon 变体，并为容器补充 toolbar 语义。CSS 容器只负责定位、显隐和过渡；按钮表面完全由共享 beUI 组件及语义 token 提供。桌面使用内容宽度居中，窄屏使用卡片内可用宽度均匀排布。

## Decision (ADR-lite)

**Context**: 当前按钮已经使用 beUI primitive，但路由 CSS 清除了按钮表面，并在外层绘制了自定义整块黑色栏，导致视觉笨重且来源不一致。

**Decision**: 保留现有 beUI 组件组合，恢复 `secondary` icon 按钮表面，移除外层视觉绘制。

**Consequences**: 不增加依赖或新组件；按钮交互、Tooltip 和可访问性沿用共享实现，资产页只保留布局适配。

## Out of Scope

- 不修改资产数据、操作回调或详情弹窗。
- 不修改顶部选择与收藏按钮样式。
- 不安装新的组件库或新增按钮家族。

## Technical Notes

- `design.md` 指定 beUI Pro 为权威来源，共享按钮位于 `src/components/ui/button.tsx`。
- `.trellis/spec/frontend/component-guidelines.md` 要求资产动作保持固定图标几何、触屏可用和媒体原始比例。
- 影响范围：`ImageGrid.tsx`、`base.css` 及对应组件/样式测试。
