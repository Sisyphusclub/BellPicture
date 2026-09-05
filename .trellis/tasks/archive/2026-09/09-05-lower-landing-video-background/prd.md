# 下移发现页视频背景

## Goal

将发现页首屏的视频背景主体向下调整，让顶部背景焦点与标题区域的视觉比例更舒适，同时保持内容层、输入框和移动端布局不变。

## Requirements

* 只调整 `.landing-hero__video` 的垂直 object-position。
* 桌面和窄屏使用一致的下移方向，避免横向位移变化。
* 保持视频 cover、叠加层、自动播放和 reduced-motion 行为不变。
* 增加样式契约断言，记录新的垂直位置。

## Acceptance Criteria

* [x] 首屏视频视觉主体相对当前向下移动。
* [x] 标题、输入框和画廊布局不发生位移。
* [x] 桌面与移动端无水平溢出，视频仍铺满 hero。
* [x] 前端测试、类型检查、lint、构建和格式检查通过。

## Technical Notes

* 视频样式位于 `frontend/src/styles/base.css` 的 `.landing-hero__video`。
* 当前默认垂直位置为 58%，桌面覆盖为 60%；降低百分比会让 cover 内容向下显示。
