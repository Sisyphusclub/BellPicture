# 替换为 ReactBits BorderGlow

## Goal

删除当前输入框自定义描边光效实现，改用用户指定的 ReactBits `BorderGlow` JavaScript + CSS 组件，使首页与生图页共享官方 pointer-near-edge 交互和渲染结构，同时保留现有 beUI Agent Chat Input 的业务、布局与可访问性行为。

## Requirements

- 用用户附件提供的 ReactBits 官方组件算法和 CSS 替换当前扩展版 `BorderGlow`。
- 保留官方 `::before`、`::after`、`.edge-light` 三层结构与 hover-near-edge 激活方式。
- 移除项目扩展的 `active`、`liquidGlass`、`reducedMotion` 组件参数、液态玻璃 SVG/DOM 和强制 focus 激活状态。
- 移除旧自定义的 2px 结构环、镂空 mask、同心外扩补偿和定制外层阴影算法。
- 继续通过 ReactBits 官方 `colors` 属性为首页和生图页传入同一 Nebulens 橙、青、蓝配色。
- 保留 Agent Chat Input 的内容、尺寸、工具栏、附件、提交、停止、键盘焦点和 reduced-motion 业务行为。
- 不新增组件依赖；使用项目现有 React 和 CSS。

## Acceptance Criteria

- [x] `BorderGlow` 的公开参数和 DOM 结构与用户提供的 ReactBits 源码一致，并使用项目 TypeScript 类型。
- [x] 旧 `data-glow-active`、`data-liquid-glass`、液态玻璃节点和 focus glow state 不再存在。
- [x] 光效只在鼠标靠近输入框边缘时按 ReactBits 官方公式显现，离开后淡出。
- [x] 首页与生图页使用同一 ReactBits 实现和颜色参数。
- [x] 输入框默认、hover、focus、docked、expanded、移动端与 reduced-motion 状态保持可用。
- [x] 1440 x 813 与 390 x 844 下无角部断层、内容遮挡、布局位移或水平溢出。
- [x] 组件测试、样式契约、类型检查、lint 和生产构建通过。

## Definition of Done

- 更新或替换旧扩展实现相关测试与规范。
- 浏览器实测首页和生图页，检查 pointer glow、焦点、响应式与控制台。
- 创建独立 `fix:` 中文提交并推送到 `dev`。

## Technical Approach

将 `frontend/src/components/BorderGlow.tsx` 收敛为附件中 ReactBits JavaScript 源码的 typed TSX 版本，将 `BorderGlow.css` 替换为官方 CSS。`AgentChatInput` 删除只为旧扩展存在的 focus glow state/handlers，并仅传递 ReactBits 支持的 props。删除未使用的 `liquidGlass` Agent Chat Input API 和 route CSS。为项目质量规范保留一个 `prefers-reduced-motion` CSS 覆盖，且继续设置 `animated={false}`。

## Decision (ADR-lite)

**Context**: 当前实现虽然源自 ReactBits，但经过多轮结构环、液态玻璃、focus 激活和圆角修补，已经不再等同于用户指定的官方组件。

**Decision**: 直接以用户提供的 ReactBits 完整源码为权威，删除扩展功能，不在旧算法上继续打补丁。

**Consequences**: 光效回到 ReactBits 官方 hover-near-edge 行为；键盘 focus 不再强制显示光效，但输入框自身 focus 可见性与键盘操作仍由 beUI/现有样式负责。

## Out of Scope

- 不修改输入框文案、生成参数、按钮、菜单或布局。
- 不调整图库、模板、资产或用户管理页面。
- 不安装 ReactBits 全库或其他组件系统。
- 不启用 ReactBits mount sweep 动画。

## Research References

- [`research/reactbits-border-glow.md`](research/reactbits-border-glow.md) - 官方结构、当前 fork 差异与接入决定。
