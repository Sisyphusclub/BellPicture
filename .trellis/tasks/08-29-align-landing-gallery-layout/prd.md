# 统一首页画廊内容区布局

## Goal

让首页 Discover 画廊的内容边界、最大宽度和左右留白与模板、资产、用户管理等运营页面保持一致，同时不改变 Hero、图片数据、排序、详情弹窗或输入框行为。

## What I already know

* 首页由 `LandingView` 渲染 `ImageGalleryVertical`，画廊使用 `landing-creations` 样式。
* `ImageGalleryVertical` 默认内层为 `mx-auto w-full max-w-7xl`，运营页面通过 `.workspace-page` 使用 `--workspace-content-max` 与 `--workspace-page-gutter`。
* 首页当前样式额外设置 `left: 64px`、`width: calc(100% - 148px)`，并将画廊内层 `max-width` 设为 `none`，造成左右边界与其他页面不一致。
* 共享布局 token 为 `--workspace-content-max: 1580px`、`--workspace-page-gutter: 32px`，在 860px 和 560px 以下分别收窄为 20px、14px。

## Requirements

* 首页画廊外层使用共享内容最大宽度并水平居中。
* 首页画廊左右内边距使用 `--workspace-page-gutter`，并沿用现有断点值。
* 保留 Hero 的全宽定位、画廊垂直起始位置、图片素材/顺序、响应式列数和详情交互。
* 桌面和 390px 移动端不得产生水平文档溢出。

## Acceptance Criteria

* [ ] 桌面首页画廊内容列的左右边界与 `.workspace-page` 对齐，最大宽度不超过 `--workspace-content-max`。
* [ ] 390px 首页画廊使用移动 gutter，图片列完整可见且 `document.documentElement.scrollWidth <= document.documentElement.clientWidth`。
* [ ] Hero 和画廊之间的既有垂直节奏保持不变。
* [ ] 现有前端类型检查、lint、测试、构建和格式检查通过。

## Definition of Done

* 添加/更新必要的布局回归测试或 CSS 契约。
* 通过前端质量检查与 `git diff --check`。
* 若发现可复用的布局约束，更新相应前端 spec。
* 使用独立的 `fix:` 中文提交。

## Technical Approach

将 `landing-creations` 设为 `width: min(100%, var(--workspace-content-max))`、`left: 0`、`margin-inline: auto`，并设置 `padding-inline: var(--workspace-page-gutter)`；移除清除共享画廊内层 `max-width` 的覆盖，保留仅与首页视觉节奏相关的垂直 margin/padding 和图片间距。

## Out of Scope

* 不替换图片素材、排序或画廊组件。
* 不修改 Hero、输入框、图片详情弹窗或其他运营页面。

## Technical Notes

* 相关代码：`frontend/src/views/LandingView.tsx`、`frontend/src/components/premium/image-galleries/image-gallery-vertical.tsx`、`frontend/src/styles/base.css`、`frontend/src/styles/tokens.css`。
* 画廊使用现有 beUI Pro `ImageGalleryVertical` 组件。
