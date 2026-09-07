# 统一生图详情图片无黑边处理

## Goal

统一首页、历史记录和生成工作区共用的图片详情弹窗媒体布局。详情弹窗应根据生成记录的真实 `width/height` 展示完整原图，不因固定媒体高度或固定移动端行高产生黑边、裁切或拉伸，同时保留现有详情操作和可访问性行为。

## What I already know

- `ImageDetailModal` 被首页、历史页和生成页复用，当前媒体区使用固定 `min-height`、`max-height` 和 `object-fit: contain`。
- `ImageRecord` 已提供可靠的 `width` 与 `height`，`ImageGrid` 也已用这两个字段驱动原图比例。
- 模板详情已完成相同方向的修复：桌面按真实比例受视口约束，详情栏独立滚动，移动端使用自然图片高度。
- `MorphicCardModal` 对详情弹窗关闭了共享布局 morph，媒体应保持稳定位置。

## Assumptions

- 本任务只调整共用生图详情弹窗，不改变图片列表、生成结果卡片或模板详情的交互。
- 弹窗的详情栏继续使用固定可读宽度；当内容超出桌面高度时仅详情栏滚动。
- 移动端允许弹窗整体纵向滚动，关闭按钮和操作区始终保持可访问。

## Requirements

- 将 `record.width / record.height` 作为 CSS 比例传入 `.image-detail`，并为详情图片声明原始尺寸。
- 桌面媒体区按原图比例计算宽高，受视口宽高和详情栏宽度约束；媒体容器与图片比例一致，不显示由容器高度造成的黑边。
- 桌面详情栏独立滚动，滚动详情内容不会移动或重新计算媒体区。
- 手机媒体区按原图比例显示完整图片，详情内容排在媒体下方，弹窗整体可滚动且无水平溢出。
- 保留关闭、保存、复制提示词、复用设置、参考图、公开状态和删除等既有操作。
- 增加样式契约和组件回归测试，覆盖横图、竖图、方图的比例约束及现有弹窗结构。

## Acceptance Criteria

- [x] 横图、竖图、方图在详情弹窗中的媒体容器与原图比例一致，图片不裁切、不拉伸、不出现由固定高度导致的黑边。
- [x] 桌面弹窗受视口边界约束，详情栏可独立滚动，媒体位置稳定。
- [x] 390px 和 560px 以下视口无水平溢出，媒体按原比例展示，详情操作可访问。
- [x] 图片详情的关闭、Escape、保存和既有回调行为保持不变。
- [x] 前端 `check:components`、`typecheck`、`lint`、`test`、`build`、`format:check` 与 `git diff --check` 通过。
- [x] 完成 CSS 契约与组件测试覆盖横图、竖图、方图；当前环境无 Chromium 可执行文件，浏览器视觉检查留待具备浏览器的验收环境执行。

## Definition of Done

- 测试覆盖比例布局和详情弹窗结构。
- 前端质量门禁和浏览器检查通过。
- 组件规范或样式契约在需要时同步更新。
- 变更可通过独立 Git 提交回滚。

## Out of Scope

- 不修改图片源文件、API 数据格式、列表缩略图裁切策略或模板详情实现。
- 不重做 `MorphicCardModal` 的通用过渡和焦点管理。

## Technical Notes

- 相关组件：`frontend/src/components/gallery/ImageDetailModal.tsx`。
- 相关样式：`frontend/src/styles/base.css` 中 `.image-detail*` 及 `@media (max-width: 860px/560px)` 规则。
- 参考实现：`.trellis/tasks/archive/2026-09/09-05-template-detail-aspect/prd.md` 与 `TemplatesView` 的真实比例弹窗。
- 相关测试：`frontend/tests/App.spec.tsx`、`frontend/tests/styles/templateDetailSizing.spec.ts`。
