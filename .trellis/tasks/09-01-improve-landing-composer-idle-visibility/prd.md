# 增强首页默认输入框辨识度

## Goal

提升首页 Discover 主输入框在未聚焦默认状态下的可辨识度，让用户能快速识别可输入区域，同时保持现有 beUI Agent Chat Input、BorderGlow 聚焦光效、尺寸和交互行为。

## Requirements

* 默认态具有清晰但克制的单层结构描边和稳定的石墨材质对比。
* 只由 Agent Chat Input 外层绘制背景与边界，内层结构保持透明，避免重复黑色矩形或双层描边。
* 聚焦、hover、停靠、展开、移动端和高对比度状态继续沿用现有交互契约。
* 使用现有语义 token 与 BorderGlow 色系，不新增组件、硬编码品牌外配色或装饰性光晕。

## Acceptance Criteria

* [x] 桌面默认态输入框边界在 Hero 视频上清晰可见，但不抢过标题和图片内容。
* [x] 默认态只有一个可见外框，内层 surface 不形成第二个矩形。
* [x] 聚焦后原有 cyan/blue/orange BorderGlow 正常显示，无断层或双描边。
* [x] 390px 移动端无横向溢出，输入区与控制项布局不变。
* [x] 前端类型检查、lint、测试和构建通过。

## Technical Approach

收敛 `.landing-composer-anchor:not(.is-docked) .landing-composer` 的最终覆盖规则：提高外层背景不透明度，使用 `--border-strong` 混合一个静态结构边界，并在根节点保留轻微内侧顶部高光；将 `.border-glow-inner` 与 `.agent-chat-input__surface` 恢复为透明，避免嵌套材质层。通过 CSS 契约测试锁定 idle、inner 和 focus 三种状态。

## Out of Scope

* 不调整输入框尺寸、位置、圆角、文字、工具栏或生成按钮。
* 不修改停靠态动画、图片画廊、Hero 视频或生图页输入框。

## Technical Notes

* 现有问题来自 `frontend/src/styles/base.css` 末尾对首页 Hero composer 的高优先级覆盖。
* 共享 BorderGlow 算法位于 `frontend/src/components/BorderGlow.css`，本任务不修改该算法。
