# 统一发现页与资产页图片详情比例

## Goal

确保发现页与资产页打开图片详情时，沿用共用详情弹窗的原图比例布局，不因页面入口或记录类型差异重新出现黑边、裁切、拉伸或固定高度媒体区。

## What I already know

- 发现页 `LandingView` 通过 `ImageGalleryVertical` 选择公开画廊条目，再传给共享 `ImageDetailModal`。
- 资产页 `HistoryView` 通过 `ImageGrid` 选择 `HistoryEntry`，同样传给共享 `ImageDetailModal`。
- 共用弹窗已按 `ImageRecord.width / height` 生成 CSS 比例；本任务需要补齐两条路由的行为回归，确认页面入口没有额外覆盖。

## Requirements

- 发现页横图、方图、竖图打开详情后，媒体容器使用被选条目的真实宽高比例。
- 资产页横图、方图、竖图打开详情后，媒体容器使用被选条目的真实宽高比例。
- 两页继续保留现有图片详情的关闭、Escape 和页面操作行为，不复制或分叉弹窗实现。
- 为发现页和资产页增加路由级回归测试，覆盖入口选择与比例属性传递。

## Acceptance Criteria

- [x] 发现页图片详情回归覆盖横图、方图、竖图入口。
- [x] 资产页图片详情回归覆盖横图、方图、竖图入口。
- [x] 两页使用同一个 `ImageDetailModal`，没有页面专属固定高度或黑边覆盖。
- [x] 前端组件检查、类型、lint、测试、构建和格式检查通过。

## Definition of Done

- 测试覆盖两条路由的详情入口和媒体比例。
- 不引入重复详情组件或额外状态源。
- 完成必要规范同步与独立 Git 提交。

## Out of Scope

- 不修改图片源文件、公开画廊分页、资产筛选或列表缩略图裁切策略。
- 不重做共用弹窗的动画、焦点陷阱和操作按钮。

## Technical Notes

- 发现页：`frontend/src/views/LandingView.tsx`。
- 资产页：`frontend/src/views/HistoryView.tsx`。
- 共用弹窗：`frontend/src/components/gallery/ImageDetailModal.tsx`。
- 现有测试：`frontend/tests/App.spec.tsx`、`frontend/tests/views/HistoryView.spec.tsx`。
