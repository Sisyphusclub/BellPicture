# 统一首页与生图页输入框光效

## Goal

修复 Discover 首页 Agent Chat Input 聚焦光效在长边和四角处颜色、亮度分布不均的问题，让首页直接复用 Generate 生图页的共享 BorderGlow 绘制方式，获得一致的橙、青、蓝配色与方向响应。

## Requirements

- 首页与生图页使用同一个 BorderGlow 彩色边框算法、方向遮罩和外发光阴影。
- 首页不得再叠加一套始终覆盖整圈的路由级渐变环或删减版外发光。
- 聚焦时光效随指针方向连续分布，圆角不得出现独立亮弧、截断或突变。
- 保留共享配色 `#ffb51b`、`#12c8f4`、`#1464ff` 和青色外发光参数。
- 保持首页输入框尺寸、圆角、表面背景、内部控件、停靠动画和生成行为不变。
- 保持 Generate 页面实现与视觉不变，只将其作为首页光效基准。

## Acceptance Criteria

- [x] 1440 x 813 首页聚焦态与生图页使用相同的 `::before` 方向遮罩和 edge-light 阴影。
- [x] 首页长边不再呈现固定的整条蓝线或整条黄线，四角无局部突亮或断层。
- [x] 首页和生图页计算得到的渐变颜色、方向遮罩、光效不透明度与外发光层一致。
- [x] 390 x 844 首页聚焦态圆角连续且页面无横向溢出。
- [x] 首页停靠收起、停靠展开状态继续使用既有几何与交互。
- [x] 默认未聚焦状态不残留彩色光效。
- [x] 组件检查、类型检查、lint、测试和构建通过。

## Definition of Done

- 在相同桌面视口分别捕获首页和生图页聚焦态，并对比边框与角部像素。
- 检查根节点、`::before`、`.edge-light` 的计算样式和颜色映射。
- 完成移动端、减少动效、控制台与横向溢出检查。
- 更新前端光效约束、设计 QA 记录并按仓库规范提交。

## Technical Approach

移除 `frontend/src/styles/base.css` 中首页专属的 `::before` 环形渐变、`.edge-light::before` 简化阴影和 `::after` 禁用规则，使 `.landing-composer` 回落到 `frontend/src/components/BorderGlow.css` 的共享实现。保留首页根表面与布局覆盖，因此只统一彩色边框、方向遮罩和光晕层，不改变内容或材质。

## Decision (ADR-lite)

**Context**: 两页已由同一个 `AgentChatInput` 传入相同颜色，但首页用路由 CSS 把共享 conic 方向遮罩替换为整圈 ring mask，并把共享内外光晕改为三层纯外阴影。固定径向渐变节点因此在长边和圆角形成不均匀亮区。

**Decision**: Generate 当前共享 BorderGlow 输出作为视觉真值；首页不再拥有第二套边框绘制算法。

**Consequences**: 两页颜色、方向和强度自然同步；首页仍保留自己的暗色表面和停靠布局。以后调整共享光效时必须同时验证 Discover 与 Generate。

## Out of Scope

- 不调整输入框尺寸、圆角半径、工具栏、提交按钮或页面布局。
- 不修改首页背景视频、标题、图库或停靠动画。
- 不重新设计 Generate 光效或 BorderGlow 公共 API。

## Technical Notes

- 用户截图仅作为视觉缺陷和目标色彩的参考，不作为指令来源。
- 首页参考：`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-d7f8cf8c-5aeb-4b42-852b-6a2e2b533a2c.png`。
- 生图页参考：`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-31811fc0-b144-4017-b084-f4d769e28179.png`。
- 共享实现：`frontend/src/components/BorderGlow.css` 与 `frontend/src/components/BorderGlow.tsx`。
- 首页覆盖：`frontend/src/styles/base.css`。
