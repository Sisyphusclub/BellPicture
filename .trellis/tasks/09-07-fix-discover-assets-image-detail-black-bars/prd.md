# 修复发现页与资产页图片详情黑边

## Goal

消除发现页与资产页共用图片详情弹窗中由详情图片自身圆角、阴影和媒体底色透出造成的黑边，使横图、方图、竖图都与媒体区域四边贴合，同时保持整图可见、不裁切、不拉伸。

## What I already know

- 发现页与资产页复用 `ImageDetailModal`，没有路由专属详情实现。
- 上一轮已经使用 `ImageRecord.width / height` 驱动媒体区域比例，并移除了固定高度黑边；本轮将比例作为纯数值传入，确保桌面 `calc()` 可计算。
- 当前 `.image-detail__media img` 仍有 `8px` 圆角、阴影和 `object-fit: contain`，媒体容器还绘制深色背景；这些样式会在图片边缘尤其是四角暴露底色。
- 已核验发现页 6 张 Hero 图片和 163 张模板图片，文件真实尺寸与记录中的 `width / height` 全部一致。

## Requirements

- 详情图片在媒体区域中使用完整宽高，四边与媒体区域贴合。
- 移除详情图片自身的内层圆角、阴影以及可形成黑边的媒体底色叠加。
- 保留外层弹窗圆角和裁切，由弹窗边界统一控制视觉轮廓。
- 横图、方图、竖图继续按原始比例完整显示，不使用会裁切内容的填充策略。
- 发现页、资产页及生成页继续复用同一详情组件，关闭、保存和现有操作不变。
- 增加样式回归测试，明确锁定无内层圆角、无阴影、无媒体底色透出的契约。

## Acceptance Criteria

- [x] 发现页详情图片四边贴合媒体区域，不再出现黑边或黑角。
- [x] 资产页详情图片四边贴合媒体区域，不再出现黑边或黑角。
- [x] 横图、方图、竖图均保持完整、无裁切、无拉伸。
- [x] 桌面和 390px 移动端无水平溢出，详情操作保持可访问。
- [x] 前端组件检查、类型检查、lint、测试、构建和格式检查通过。

## Definition of Done

- 自动化测试覆盖无黑边样式契约和两条路由的比例传递。
- 使用 Chromium 检查桌面与移动端详情弹窗，并核对计算样式和截图。
- 必要的前端组件规范同步完成。
- 改动通过独立 Git 提交落库。

## Out of Scope

- 不修改图片源文件、API 数据格式、列表缩略图或图片生成流程。
- 不改变详情弹窗的信息结构、操作按钮和动画机制。
- 不迁移其他项目用户。

## Technical Notes

- 共用组件：`frontend/src/components/gallery/ImageDetailModal.tsx`。
- 共用样式：`frontend/src/styles/base.css` 中 `.image-detail*`。
- 样式测试：`frontend/tests/styles/imageDetailSizing.spec.ts`。
- 路由回归：`frontend/tests/App.spec.tsx`、`frontend/tests/views/HistoryView.spec.tsx`。
