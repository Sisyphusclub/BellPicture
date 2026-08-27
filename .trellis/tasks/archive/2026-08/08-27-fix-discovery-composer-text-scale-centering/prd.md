# 修复发现页输入框文字缩放与居中

## Goal

修复发现页停靠创作框收起时文字和控件随外框放大再缩小的问题，并让桌面紧凑框与发现页实际内容画布水平居中。

## Requirements

- 保留同一个 beUI `AgentChatInput` 实例、现有展开/收起状态和最终尺寸。
- 外框可以继续使用合成层 FLIP 解释尺寸连续性，但文字、占位符、图标和控件不得出现可见缩放。
- 不重新引入 `width`、高度、padding、定位或其他布局属性 transition。
- 桌面停靠框中心与 `.landing-hero__content` 中心一致；当前实测误差约 `32px` 必须消除。
- `<=860px` 继续以视口中心定位，不能引入横向溢出。
- 保留现有文字垂直居中、输入焦点、空内容失焦收起和 reduced-motion 行为。

## Acceptance Criteria

- [x] 收起和展开过程中，输入文字及工具栏文字/图标保持稳定字号和比例。
- [x] 外框仍连续形变，动画只使用 `transform` / `opacity`。
- [x] `1280px` 与 `1440px` 桌面停靠框中心和 hero 内容中心误差小于 `1px`。
- [x] `390 x 844` 移动端停靠框水平居中且横向溢出为 `0`。
- [x] reduced-motion、焦点、输入和收起交互正常。
- [x] 相关测试、完整测试、类型检查、lint 和构建通过。

## Technical Direction

- 保留已有 Motion 外层 layout projection。
- 为可读内容建立单独的投影/缩放校正边界，抵消父层 FLIP scale；禁止用反向 CSS layout transition。
- 桌面 fixed anchor 使用与 `.landing-hero__content` 相同的 `calc(50% + 64px)` 中心线，移动端规则继续覆盖为 `50%`。

## Verification Notes

- 修复前 `1280 x 720`：紧凑框中心 `664.33px`，hero 内容中心 `696.33px`，向左偏 `32px`。
- 修复前收起投影会出现父层约 `scale(1.68, 1.98)`，子文字继承该缩放，造成明显放大再缩小。

## Verification

- `1280px` 桌面：停靠框与 hero 内容中心误差从 `32px` 降为 `0px`。
- 收起逐帧采样：输入区保持 `52px`，生成张数控件保持约 `40px`。
- 展开逐帧采样：桌面输入区保持 `76px`，生成张数控件保持约 `40px`。
- `390 x 844`：输入区保持 `86px`，控件为 `39.997-40px`，水平中心误差约 `0.17px`，横向溢出为 `0`。
- reduced-motion 回归测试、`check:components`、`typecheck`、lint、73 项完整测试、build、修改文件 Prettier 和 `git diff --check` 通过。

## Out of Scope

- 不调整最终尺寸、圆角、颜色、文案、生成设置或画廊内容。
- 不修改生成页输入框或图片详情动画。
