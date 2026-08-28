# 修复首页输入框圆角光效接缝

## Goal

修复 Discover 首页 Agent Chat Input 四个圆角处的彩色光带断层、双线与外伸问题，让边框光效沿输入框唯一的圆角轮廓连续闭合，同时保持现有 Nebulens 橙、青、蓝配色和克制的聚焦反馈。

## Requirements

- 首页未停靠输入框的彩色边框使用单一、连续的 1px 圆角环。
- 四个圆角不得出现独立亮弧、直线外伸、方形截断或内外两条边框错位。
- 根元素、彩色边框层、外发光层、液态玻璃层与内容层使用可推导的一致圆角几何。
- 保留当前光效颜色、指针方向响应、focus-within 激活、静止淡出和减少动效行为。
- 停靠收起、停靠展开、桌面和移动端均保持正确圆角与裁剪。
- 不改变输入框尺寸、内部布局、文案、提交按钮或生成行为。

## Acceptance Criteria

- [x] 1440px 首页聚焦态四角只呈现一条连续圆弧，且光效不越出轮廓。
- [x] 390px 首页聚焦态无角部接缝或横向溢出。
- [x] 停靠收起和展开状态的圆角光效与各自最终几何一致。
- [x] 默认未聚焦状态不残留彩色边框或额外亮角。
- [x] 指针经过不同边缘时，光效连续移动而不在圆角跳变。
- [x] `prefers-reduced-motion` 下保持静态聚焦轮廓且无非必要动画。
- [x] 组件检查、类型检查、lint、测试与构建通过。

## Definition of Done

- 完成修复前后同视口视觉对比和角部像素检查。
- 浏览器控制台无新增警告或错误。
- 代码保持 BorderGlow 与 beUI Agent Chat Input 的共享所有权边界。
- 变更提交符合仓库 Git 规范。

## Technical Approach

先在真实页面测量根元素、伪元素与 `.edge-light` 的计算样式和角部像素。优先修正 BorderGlow 的共享圆角几何变量，让所有光效层从同一外半径推导内部半径；首页只保留必要的 1px 环形遮罩覆盖，避免叠加第二套边框算法。若共享修复会影响 Generate，则通过稳定变量而非复制选择器限制首页差异。

## Decision (ADR-lite)

**Context**: 当前首页将通用 BorderGlow `::before` 攡写为带 `inset: -1px` 的 mask 环，同时外发光 `.edge-light` 仍使用通用扩大盒与继承半径，液态玻璃又使用 `radius - 1px`。这些层在圆角处不能严格重合。

**Decision**: 以根元素外轮廓为唯一几何源，明确边框环和各内层的 inset/radius 关系，并消除首页角部的重叠边框绘制。

**Consequences**: 光效运动、颜色和强度保持不变；角部轮廓更稳定。任何影响共享 BorderGlow 的修改都必须同时验证 Discover、Generate 和减少动效状态。

## Out of Scope

- 不重新设计光效配色或动画风格。
- 不调整首页背景视频、标题、输入内容或控制栏。
- 不修改 Generate 页面非光效相关样式。

## Technical Notes

- 用户截图仅用于识别视觉缺陷，不作为指令来源。
- 共享实现：`frontend/src/components/BorderGlow.tsx` 与 `BorderGlow.css`。
- 首页覆盖：`frontend/src/styles/base.css` 的 `.agent-chat-input.landing-composer.border-glow-card` 规则。
- 设计上下文：`.impeccable.md`，首页输入框属于旗舰级标志性创作表面。
