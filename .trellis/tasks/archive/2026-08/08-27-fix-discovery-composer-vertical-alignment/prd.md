# 修复发现页输入框垂直对齐

## Goal

修复发现页底部停靠态创作输入框中文字相对输入框和两侧操作控件偏上的问题，使单行提示词在视觉和几何上稳定垂直居中。

## Requirements

- 保留现有 beUI `AgentChatInput` 组件、尺寸、文案、颜色和交互。
- 仅调整发现页停靠态输入区的垂直布局，不影响首页首屏完整输入框和生成页输入框。
- 已输入文本与流式占位文本使用一致的垂直中心线。
- 保持桌面端和移动端无文本裁切、控件重叠或横向溢出。

## Acceptance Criteria

- [x] 单行已输入文本在停靠态输入框内垂直居中，并与左右操作控件视觉对齐。
- [x] 空输入时的流式占位文本与已输入文本位置一致。
- [x] 输入框聚焦展开及失焦收起行为不变。
- [x] 前端类型检查、相关测试和构建通过。

## Definition of Done

- 通过浏览器计算样式和截图验证桌面端停靠态。
- 运行前端质量检查。
- 只提交与本次缺陷相关的改动。

## Technical Approach

检查停靠态最终级联规则中输入区的固定高度、行高和上下内边距，以对称内边距或等效布局让单行内容共享控件中心线；同步校准绝对定位的流式占位层，并增加针对样式契约的回归覆盖。

## Decision (ADR-lite)

**Context**: 左右控件通过 `top: 50%` 垂直居中，富文本输入区则依赖固定高度和不对称上下内边距，导致两者中心线不一致。

**Decision**: 在发现页停靠态的局部 CSS 中统一文本内容的垂直几何，不修改共享 beUI 组件结构。

**Consequences**: 修复范围局限于发现页停靠态，其他复用 `AgentChatInput` 的页面不会发生布局变化。

## Out of Scope

- 不调整输入框宽高、圆角、配色或动效。
- 不修改模板、图片详情和生成流程。
- 不重构现有 CSS 层级。

## Technical Notes

- 视觉依据：`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-8b0b94de-fab0-424c-b259-e2dab4cba876.png`。
- 设计约束：`.impeccable.md`、`design.md`，beUI Pro 为组件和交互权威来源。
- 初步相关文件：`frontend/src/styles/base.css`、`frontend/src/views/LandingView.tsx`、发现页相关测试。

## Verification

- 桌面展开态已输入文本中心差 `0px`；展开占位约 `0.40px`；紧凑占位约 `0.38px`。
- `390 x 844` 移动端已输入文本中心差约 `0.33px`；展开占位约 `0.40px`；紧凑占位约 `0.38px`。
- 桌面与移动端横向溢出均为 `0`，浏览器控制台无 warning/error。
- `check:components`、`typecheck`、`lint`、72 项前端测试、构建、修改文件 Prettier 和 `git diff --check` 通过。
- 全库 `format:check` 仍被 44 个既有未格式化文件阻塞；本次修改文件不在失败项中。
