# 修复展开态流式提示文字位置

## Goal

让 Discover 页面底部输入框进入展开态时，流式输入提示文字与真实 textarea 的文字起始位置保持一致，避免提示文字仍然出现在输入框下方。

## Requirements

* 调整展开态桌面端流式提示层的垂直偏移，使其匹配 `21px` 的 textarea 顶部内边距。
* 调整 `<=860px` 移动端流式提示层的垂直偏移，使其匹配 `25px` 的 textarea 顶部内边距。
* 让提示层的水平边界、字号和行高与展开态 textarea 的文字排版保持一致。
* 保留紧凑态输入框现有的提示位置与行为。

## Acceptance Criteria

* [x] 展开态桌面端流式提示文字与 textarea 文字基线对齐，不再明显偏低。
* [x] 展开态移动端流式提示文字与 textarea 文字基线对齐，不再明显偏低。
* [x] 紧凑态提示文字位置不变。
* [x] 样式契约测试覆盖桌面和移动端提示层的关键位置与排版声明。
* [x] 前端类型检查、lint、测试、构建、格式检查和浏览器 QA 通过。

## Definition of Done

* 代码与回归测试完成。
* `frontend/` 质量检查全部通过。
* 390x844 移动端和桌面端展开态已检查，无水平溢出或控制台新增错误。
* 变更已按仓库规范独立提交。

## Technical Approach

在现有 Discover dock 最后覆盖规则中直接校准 `.agent-chat-input__streaming-placeholder`，不改动共享 AgentChatInput 组件逻辑。桌面端使用 `top: 21px`、左右 `14px`，移动端使用 `top: 25px`、左右 `12px`，并在展开态指定 `15px/1.5` 的文字排版。

## Decision (ADR-lite)

**Context**: 流式提示层是绝对定位的独立元素，不能自动继承 textarea 的 padding；此前只调整 textarea padding 导致提示层仍然偏低。

**Decision**: 继续在 Discover 路由的展开态覆盖中同步提示层的定位和排版参数。

**Consequences**: 共享组件保持稳定，紧凑态和 Studio 输入框不受影响；后续若调整展开态 textarea 内边距，需要同步更新提示层契约。

## Out of Scope

* 不改变流式提示文字的轮播、光标动画或组件生命周期。
* 不调整登录、画廊、Google OAuth 或其他页面布局。

## Technical Notes

* `frontend/src/styles/base.css`：Discover dock 展开态最终覆盖规则。
* `frontend/tests/styles/landingComposerMotion.spec.ts`：现有 landing composer 样式契约测试。
* `frontend/src/components/premium/agent-chat-input/agent-chat-input.tsx`：流式提示层 DOM 结构，仅用于确认定位边界。
* `.trellis/spec/frontend/component-guidelines.md`：Discover composer alignment 约束。
* `.trellis/spec/frontend/quality-guidelines.md`：前端质量门禁与浏览器 QA 要求。
