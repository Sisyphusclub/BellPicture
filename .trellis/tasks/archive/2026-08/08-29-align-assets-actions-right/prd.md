# 调整资产操作按钮透明度与右对齐

## Goal

降低资产图片悬浮按钮背景的视觉重量，并将整组动作对齐到图片右下角。

## Requirements

- 保留现有 beUI secondary icon Button、MorphicTooltip、动作顺序和交互。
- 按钮背景使用语义 `--card` 的半透明混合，图标本身保持完整不透明度。
- 工具栏由底部居中改为右下角对齐。
- hover、focus-within、触屏和 reduced-motion 行为保持可用。
- 桌面及 390px 视口内不溢出。

## Acceptance Criteria

- [ ] 工具栏使用 `right: 10px`，不再使用 `left: 50%` 水平居中。
- [ ] 按钮背景为 `color-mix` 半透明语义表面，未对完整按钮设置 `opacity`。
- [ ] 显示/隐藏过渡只使用纵向 transform 与 opacity。
- [ ] 相关样式契约、组件测试、类型检查、lint 和构建通过。

## Technical Approach

只修改资产页 action overlay CSS 与对应样式契约；同步前端组件规范中的定位说明。

## Out of Scope

- 不改按钮组件、图标、动作逻辑、图片比例和顶部控件。
