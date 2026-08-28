# 优化生成对话气泡操作

## Goal

让生成页的用户提示词消息更接近 GPT 的紧凑气泡：气泡只包裹提示词文本，不因隐藏操作或生成状态留下空白；复制和编辑操作位于气泡下方，并在悬停或键盘聚焦时显现。

## Requirements

- 用户提示词气泡右对齐，宽度由文本内容决定，并保留合理的最大宽度和换行。
- 气泡内部只显示提示词文本，不显示生成参数元数据，也不为操作按钮预留固定列。
- 气泡下方提供“复制提示词”和“编辑提示词”两个 BeUI 图标按钮，不提供分享按钮。
- 支持鼠标悬停和键盘焦点显现操作；无 hover 的触屏环境中操作保持可见。
- 复制成功后使用现有 Toast 反馈。
- 生成进行中允许复制，但继续禁用编辑，避免破坏现有并发生成约束。
- 保留现有编辑、取消、提交、替换批次、失败回退和文本域自适应高度行为。

## Acceptance Criteria

- [x] 静态与生成中的提示词气泡都不包含隐藏操作造成的空白区域。
- [x] 气泡 DOM 只承载提示词文本，操作工具栏位于气泡外部。
- [x] 工具栏仅包含复制和编辑两个操作，不存在分享操作。
- [x] 复制操作写入完整提示词并显示成功 Toast。
- [x] 编辑操作仍能打开编辑器并用修改后的提示词重新生成。
- [x] 鼠标、键盘和触屏环境均可访问操作按钮。
- [x] 1440px 桌面与 390px 移动端无溢出、遮挡或异常空白。
- [x] GenerateView 聚焦测试、组件来源检查、类型检查、Lint、全量测试和构建通过。

## Definition of Done

- 组件、样式和测试已更新。
- 视觉 QA 对比提供的 GPT 气泡参考，并在 `design-qa.md` 中记录通过结果。
- 相关前端规范按需要更新。
- 改动以独立中文规范提交到 Git。

## Technical Approach

在 `EditablePromptBubble` 中增加内容自适应的 `session-batch__prompt-shell`，让只含文本的 `session-batch__prompt` 与独立的 `session-batch__prompt-actions` 工具栏成为同级节点。使用现有 `Button`、`IconTooltip`、Lucide `Copy` 与 `Pencil`；通过 shell 的 `:hover` 和 `:focus-within` 控制工具栏可见性，并在 `hover: none` 媒体查询下常显。编辑态继续使用现有表单分支。

## Decision (ADR-lite)

**Context**: 当前两列网格始终为隐藏编辑按钮保留 28px 列，生成中禁用按钮仍留下明显空白；参数元数据也使气泡尺寸偏离参考。

**Decision**: 将内容与操作分离为上下两个独立区域，气泡仅由提示词文本决定尺寸。

**Consequences**: 气泡尺寸稳定且符合参考；工具栏不再影响文本换行。触屏环境需要单独的常显规则以保证可发现性。

## Out of Scope

- 不修改图片生成 API、生成队列或历史数据模型。
- 不新增分享功能。
- 不重做结果图片卡片、整组操作或底部生成输入框。
- 不更改编辑提交后的批次替换语义。

## Technical Notes

- 视觉参考：用户提供的三张 ChatGPT 用户消息气泡截图。
- 主要组件：`frontend/src/views/GenerateView.tsx`。
- 主要样式：`frontend/src/styles/base.css`。
- 回归测试：`frontend/tests/views/GenerateView.spec.tsx`。
- `base.css` 已存在其他未提交改动，提交时只暂存本任务的相关 hunk。
