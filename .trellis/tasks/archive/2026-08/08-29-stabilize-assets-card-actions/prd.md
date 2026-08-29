# 统一资产顶部按钮背景并稳定悬浮栏

## Goal

统一资产卡片顶部与底部图标按钮的半透明表面，并让鼠标在图片、选择按钮和收藏按钮之间移动时底部工具栏保持稳定。

## Requirements

- 左上选择与右上收藏按钮使用与底部动作一致的 78% 半透明 `--card` 背景。
- 顶部按钮 hover 使用半透明 `--surface-hover`，图标保持完整不透明度。
- 底部动作的完整 hover/focus 状态绑定到整张 `.image-tile`，不是仅绑定 `.image-tile__morph`。
- 鼠标移到顶部按钮时，底部工具栏不得改变 opacity、transform 或 pointer-events。
- 保留已选状态、按钮形状、Tooltip、动作逻辑与触屏行为。

## Acceptance Criteria

- [ ] 顶部按钮背景与底部按钮使用同一语义透明度。
- [ ] hover 左上选择按钮前后，底部工具栏几何与显示状态不变。
- [ ] 样式契约覆盖卡片级 hover/focus 触发器。
- [ ] 桌面、390px、测试、类型检查、lint 和构建通过。

## Technical Approach

在资产页 CSS 中统一顶部按钮表面，并把底部 action reveal selector 提升到 `.image-tile:hover` / `.image-tile:focus-within`。同步组件规范与样式回归测试。

## Out of Scope

- 不修改 DOM、按钮组件、图片比例或业务回调。
