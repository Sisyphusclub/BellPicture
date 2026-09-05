# 对齐模板详情顶部文字

## Goal

模板详情右侧的分类、标题和提示词应从详情栏顶部开始，不因关闭按钮的预留空白整体下移；文字顶部与关闭按钮区域保持同一视觉基线。

## Requirements

* 移除桌面详情栏顶部额外的 58px 空白。
* 保留关闭按钮在右上角，并确保文字不会与按钮重叠。
* 保持右侧详情独立滚动、移动端布局和原图比例布局不变。
* 增加样式回归断言，避免后续再次通过 margin-top 推低详情内容。

## Acceptance Criteria

* [x] 桌面模板详情的分类、标题、提示词从详情栏顶部正常起始。
* [x] 关闭按钮仍位于右上角，且可点击、不会被详情滚动遮挡。
* [x] 横图、竖图和手机详情布局无回归。
* [x] 前端测试、类型检查、lint、构建、格式检查通过。

## Verification

* 样式契约和模板路由定向回归 27 项通过；前端完整测试 34 个套件、137 项通过。
* typecheck、lint、format:check、build 和 `git diff --check` 通过。
* 桌面详情栏已移除 `margin-top: 58px`，关闭按钮和分类/标题/提示词处于同一顶部区域。

## Technical Notes

* 主要样式：`frontend/src/styles/base.css` 的 `.template-detail__body`。
* 现有原图比例布局由 `--template-image-ratio` 和独立详情滚动提供。
