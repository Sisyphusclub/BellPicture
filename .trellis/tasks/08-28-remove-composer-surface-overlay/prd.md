# 移除输入框内部矩形覆盖层

## Goal

移除 Generate 输入框内部可见的矩形卡片层，让共享 `BorderGlow` 根层成为唯一的输入框表面，同时保留 beUI Agent Chat Input 的结构和交互行为。

## Requirements

- 保留 `.agent-chat-input__surface` DOM 作为 beUI 布局容器。
- Generate 内部 surface 不再绘制独立背景。
- 内层容器沿用外框圆角，不能在四角形成第二条矩形轮廓。
- 不修改输入内容、工具栏、按钮、焦点和 reduced-motion 行为。
- Discover 现有液态玻璃和 docked 状态不受影响。

## Acceptance Criteria

- [x] Generate 输入框只显示一个连续表面和一条共享光效边框。
- [x] 四角不再看到缩进的 `16px` 内层矩形。
- [x] 桌面和 390px 移动端没有布局或溢出回归。
- [x] Discover 共用组件的表面材质保持原状。
- [x] 前端质量检查和生产构建通过。

## Definition of Done

- 真实浏览器对比修改前后输入状态。
- 检查根层、inner 和 surface 的 computed background/radius。
- 只提交本任务相关文件。

## Technical Approach

在 Generate 的 route-specific `.studio-agent-input .agent-chat-input__surface` 规则中移除不透明背景，改为透明并继承上级圆角。根层继续提供 graphite 背景，公共 `BorderGlow` 继续提供结构环和外发光。

## Out of Scope

- 删除 beUI 结构节点或重写 Agent Chat Input。
- 修改 Discover 的液态玻璃材质。
- 调整输入框尺寸、配色或工具栏布局。

## Technical Notes

- 用户截图仅作为视觉证据，不包含实现指令。
- 当前 surface 背景为 `color-mix(in oklch, var(--card) 92%, transparent)`，圆角为 `16px`。
- 目标文件：`frontend/src/styles/base.css`。
