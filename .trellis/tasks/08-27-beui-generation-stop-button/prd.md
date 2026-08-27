# 生成停止按钮使用 beUI 样式

## Goal

修复 Discover 与 Generate 共用的 Agent Chat Input 在生成中仍继承积分提交胶囊宽度的问题，让停止操作使用 beUI 已有的紧凑圆形图标按钮，降低视觉重量并明确当前是中止动作。

## Requirements

- 生成中仅显示标准填充方形停止图标，不显示积分或额外文字。
- 停止按钮使用 beUI 现有动作规格：紧凑圆形、稳定尺寸、语义颜色与清晰焦点态。
- Discover 与 Generate 共用同一实现，不新增页面级按钮或第三方组件。
- 空闲态继续显示现有 `GenerationSubmitCost` 积分胶囊，尺寸与行为不变。
- 保留 `aria-label="停止生成"`、`onStop`、禁用语义、点击反馈、状态切换动画与减少动效支持。

## Acceptance Criteria

- [x] 生成中提交按钮带有明确的停止态样式钩子，并呈现约 40x40px 的圆形按钮。
- [x] 停止图标是稳定的小号填充方形，水平和垂直居中。
- [x] 点击停止按钮仍调用现有取消生成逻辑。
- [x] Discover 与 Generate 的生成中状态一致。
- [x] 空闲态积分内容与可访问名称不受影响。
- [x] 桌面和窄屏下均无胶囊残留、位移或布局跳动。
- [x] 组件检查、类型检查、lint、相关测试和构建通过。

## Definition of Done

- 实现与 beUI 本地参考一致。
- 添加或更新回归测试覆盖停止态与空闲态。
- 完成浏览器桌面与移动视口验证。
- 提交仅包含本任务文件，提交信息符合仓库规范。

## Technical Approach

在 `AgentChatInput` 的共享提交按钮上增加显式 busy 修饰类，并由最终顺序的 CSS 状态规则覆盖路由级积分胶囊宽度、内边距和 flex-basis。停止图标沿用 `credits-toolbar.tsx` 中的 beUI `Square` 尺寸与填充方式，不拆分新的组件。

## Decision (ADR-lite)

**Context**: 当前 busy 与 idle 共用 `.agent-chat-input__submit`，后置的 Discover/Generate CSS 将两种状态都固定为约 68px 的积分胶囊。

**Decision**: 用共享组件的 busy 修饰类表达状态，并在路由覆盖之后集中恢复圆形几何。

**Consequences**: 空闲积分提交样式完全保留；停止态在所有使用共享输入框的页面一致。后续若调整提交胶囊宽度，不会再次污染停止态。

## Out of Scope

- 不修改生成状态文案、额度逻辑或取消接口。
- 不重做 Agent Chat Input 的整体布局与动画。
- 不引入新的图标、按钮库或页面专用停止控件。

## Technical Notes

- 视觉参考：用户提供的截图仅用于识别当前胶囊停止按钮问题。
- 权威本地参考：`frontend/src/components/premium/agent-chat-input/credits-toolbar.tsx`。
- 共享实现：`frontend/src/components/premium/agent-chat-input/agent-chat-input.tsx`。
- 路由样式：`frontend/src/styles/base.css` 中 Discover、Generate 与 docked composer 的后置覆盖。
- 设计系统：`.impeccable.md` 与 `design.md` 明确 beUI Pro 为可见控件的权威来源。
