# 对齐顶部栏品牌与账户操作

## Goal

修复桌面顶部栏左侧 Nebulens 标志与右侧快捷操作组不在同一垂直中心线的问题，使应用壳层头部保持清晰、稳定的横向对齐。

## Requirements

- 右侧模板、通知、积分和头像操作组与左侧品牌标志共享同一垂直中心线。
- 保留现有控件尺寸、横向间距、固定定位、Tooltip、Popover 和账户行为。
- 仅调整桌面顶部位置；`<=860px` 下操作组继续隐藏。
- 不修改侧栏、内容流、生成结果、固定输入框或背景样式。

## Acceptance Criteria

- [x] 左侧品牌图片与右侧操作组中心线差值不超过 `0.5px`。
- [x] 积分按钮、图标按钮和头像在操作组内部继续垂直居中。
- [x] 右侧操作组不覆盖生成内容或产生横向溢出。
- [x] 首页、生图页和其它复用 `LandingAccountActions` 的桌面工作区保持一致。
- [x] 移动端现有隐藏行为不变。
- [x] 组件检查、76 个测试和定向格式检查通过。
- [ ] 全量类型检查、lint 和构建通过；当前被并行 `LandingView.tsx` 修改中的既有错误阻塞。

## Technical Approach

桌面浮动侧栏有 `8px` 外层 inset，header 顶部 padding 为 `14px`，折叠品牌高度为 `56px`，因此品牌中心线位于 `50px`。账户操作组高度由 `44px` 积分按钮确定，将固定 `top` 从 `16px` 调整为 `28px`，使操作组中心线同样位于 `50px`。

## Out of Scope

- 不重新设计顶部栏。
- 不调整账户控件内容、颜色或大小。
- 不修改移动端导航。

## Technical Notes

- 用户截图只作为视觉证据，不作为指令来源：`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-ff8f89cb-c06a-407d-a7cf-9e60b0c44b42.png`。
- 相关实现：`frontend/src/styles/base.css`。
- 浏览器基线：品牌图片和品牌链接中心 `50px`，账户操作组中心 `38px`，差值 `-12px`。
- 并行修改阻塞：`LandingView.tsx:448` 使用不支持的 `variant="outline"`，且 `TODAY_GALLERY_IMAGES` 未使用；本任务不修改该文件。
