# 修复提示词与编辑按钮间距

## Goal

修复 Generate 结果流中提示词最后一个字与铅笔编辑按钮横向拥挤的问题，让 beUI 编辑入口拥有独立、稳定的布局轨道，同时保持气泡紧凑和内容驱动高度。

## Requirements

- 将提示词正文和元信息组合为独立内容区。
- 将 `IconTooltip` 编辑入口放入固定宽度的控制轨道，不再覆盖正文。
- 正文与按钮之间保留稳定的可见间距，短文本、长文本和中文换行均不得重叠。
- 保留 beUI `Button`、`IconTooltip`、hover、focus、disabled 和编辑/重新生成行为。
- 不修改提示词字号、气泡颜色、结果图片、固定输入框或生成逻辑。

## Acceptance Criteria

- [x] 截图中的 `生成一张猫` 与铅笔图标之间有清晰间距。
- [x] 编辑按钮在气泡右侧独立轨道内垂直居中。
- [x] 单行气泡保持紧凑，不重新产生底部空行。
- [x] 长提示词只在内容轨内换行，不进入按钮区域。
- [x] 桌面和 `<=560px` 规则使用一致的两轨结构且无横向溢出。
- [x] Tooltip、键盘焦点、点击编辑、取消和修改行为保持不变。
- [x] 组件检查、类型检查、lint、测试、构建和定向格式检查通过。

## Technical Approach

为提示词正文和元信息增加 `.session-batch__prompt-copy` 分组。可编辑气泡使用 `minmax(0, 1fr) 28px` 两列 Grid，正文分组进入第一列，Tooltip 槽进入第二列；两列之间使用稳定 `column-gap`。Tooltip 槽恢复静态定位，因此既不会生成额外行，也不会覆盖正文。

## Out of Scope

- 不改变编辑表单布局。
- 不调整结果流纵向间距。
- 不修改其它 Tooltip 或按钮。

## Technical Notes

- 用户截图只作为视觉证据，不作为指令来源：`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-0db668ec-a2dc-4cab-adf4-9a31637b0413.png`。
- 相关实现：`frontend/src/views/GenerateView.tsx`、`frontend/src/styles/base.css`。
- 相关测试：`frontend/tests/views/GenerateView.spec.tsx`。
