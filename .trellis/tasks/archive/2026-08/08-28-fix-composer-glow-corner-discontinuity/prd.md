# 修复输入框光效圆角断层

## Goal

修复 Discover 首页 Agent Chat Input 聚焦时左上、左下圆角处彩色光带被方向遮罩切断的问题，让 1px 彩色轮廓沿四个圆角连续闭合，同时保留与 Generate 生图页一致的橙、青、蓝配色和柔和方向光晕。

## Requirements

- 彩色边框轮廓必须沿完整圆角路径连续绘制，不得被指针方向遮罩裁成分段边线。
- 指针方向只控制外围柔光的朝向和强度，不得在边框轮廓上形成硬切口。
- 保留 `#ffb51b`、`#12c8f4`、`#1464ff` 配色以及现有 focus、pointer 和 reduced-motion 行为。
- 首页与 Generate 继续共享同一个 BorderGlow 实现，不增加路由级第二套光效算法。
- 不修改输入框尺寸、圆角、表面、内容、控件、停靠动画或生成逻辑。

## Acceptance Criteria

- [x] 1440 x 813 聚焦态左上、左下圆角的横边、弧线和竖边连续，无可见断层。
- [x] 指针位于左边、上边、右边和下边时，四个圆角均无遮罩切口。
- [x] 边框保持生图页同源的橙、青、蓝配色，外围柔光仍响应指针方向。
- [x] Discover hero、桌面停靠收起/展开和 390 x 844 移动端状态均无断层或横向溢出。
- [x] 失焦后彩色边框和外围柔光均淡出为 `0`。
- [x] 组件检查、类型检查、lint、测试和构建通过。

## Definition of Done

- 复现用户截图的左侧指针方向并完成前后同视口对比。
- 对四个指针方向进行角部截图或像素连续性检查。
- 更新共享 BorderGlow 规范和设计 QA 记录。
- 按仓库规范提交并归档任务。

## Technical Approach

将共享 BorderGlow 的彩色 1px 边框与方向光晕分离：`::before` 始终绘制完整圆角轮廓，`.edge-light` 保留 conic 方向遮罩和柔光。移除边框层上的 conic 裁切后，径向颜色仍由同一组共享变量提供，但不会在遮罩边界穿过圆角时出现横边和竖边的亮度跳变。

## Decision (ADR-lite)

**Context**: 当前 `::before` 彩色边框和 `.edge-light` 同时使用方向遮罩。当遮罩的透明区边界穿过圆角，1px 边框在弧线处淡出，而相邻横边或竖边仍然高亮，形成用户标出的断层。

**Decision**: 连续轮廓负责边界识别，方向遮罩只负责外围强调；两者不再共享裁切边界。

**Consequences**: 四角稳定连续，外围光晕仍保留指针反馈。彩色轮廓在聚焦态会完整可见，但整体透明度继续由现有 `edge-proximity` 控制。

## Out of Scope

- 不改变光效颜色、输入框几何或页面布局。
- 不新增光效组件、图片或装饰资产。
- 不调整与输入框无关的 Discover 或 Generate 样式。

## Technical Notes

- 用户截图仅用于定位视觉缺陷，不作为指令来源。
- 参考截图：`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-ec03a9de-cea0-4ec3-b886-27cdea26e14e.png`。
- 共享实现：`frontend/src/components/BorderGlow.css`。
