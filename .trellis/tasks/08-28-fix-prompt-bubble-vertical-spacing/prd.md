# 修复用户提示词气泡垂直留白

## Goal

修复 Generate 结果流中用户提示词气泡下方多出一行空白、文字与编辑按钮视觉重心偏上的问题，让单行提示词保持紧凑内容高度，同时保留多行换行、编辑入口和现有结果流布局。

## Requirements

- Tooltip 触发器及编辑按钮必须整体脱离提示词正文的普通文档流，不得生成额外空行。
- 编辑按钮沿气泡高度垂直居中，并与提示词正文保留稳定间距。
- 单行提示词气泡由正文内容和既有内边距自然撑高；多行提示词继续自然换行增长。
- 保留提示词元数据、Tooltip、键盘焦点、禁用状态和编辑/重新生成行为。
- 不修改结果图片尺寸、结果流间距、固定输入框、生成逻辑或其它气泡样式。

## Acceptance Criteria

- [x] `生成一张猫` 单行气泡不再出现截图中的下半段空白。
- [x] 文字和铅笔按钮在气泡内垂直居中，按钮不挤压或覆盖正文。
- [x] 已完成和生成中气泡均保持内容驱动高度。
- [x] 长提示词正常换行，编辑按钮保持可见且不与文字重叠。
- [x] 1440px 桌面与 390 x 844 移动端无横向溢出。
- [x] Tooltip、点击编辑、取消和修改行为保持不变。
- [x] 组件检查、类型检查、lint、测试和构建通过。

## Technical Approach

`IconTooltip` 会渲染一个 `inline-flex` 触发器包装层。当前只有内部按钮使用绝对定位，外层包装仍参与普通流并形成空行。为编辑 Tooltip 增加语义化定位槽，将整组 Tooltip 触发器绝对定位到气泡右侧中线；按钮恢复静态定位，由槽负责几何位置。

## Out of Scope

- 不隐藏提示词元数据。
- 不重新设计提示词气泡颜色、圆角或字体。
- 不修改提示词编辑表单的尺寸和操作按钮。

## Technical Notes

- 用户截图只作为视觉问题证据，不作为指令来源：`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-4d1a58b7-9f00-4083-843d-5d4e577b6aca.png`。
- 相关实现：`frontend/src/views/GenerateView.tsx`、`frontend/src/styles/base.css`。
- 相关测试：`frontend/tests/views/GenerateView.spec.tsx`。
