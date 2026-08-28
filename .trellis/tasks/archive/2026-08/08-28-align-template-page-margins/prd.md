# 统一创作模板页左右边距

## Goal

修复创作模板页桌面端左侧内容距折叠导航过宽、右侧距视口过窄的问题，让内容区两侧外边距在同一可用画布中保持一致。

## Requirements

- Templates、Assets、Admin 等运营页面的主区左侧预留宽度必须匹配折叠侧栏真实占位宽度。
- 页面内容继续使用共享 `--workspace-page-gutter`，桌面、平板、手机分别保持 `32px`、`20px`、`14px` 内边距。
- 仅修正桌面运营页面主区轨道；Discover 和 Generate 保留各自已有的画布布局。
- 移动端侧栏隐藏时，主区左侧 padding 继续为 `0`，不得产生横向溢出。
- 不覆盖并行任务对资产、用户管理和输入框样式的未提交改动。

## Acceptance Criteria

- [x] 桌面 Templates 页面内容外框距折叠侧栏占位和右侧视口的边距一致。
- [x] Assets、Admin 共享同一主区轨道，不出现单独的左偏移。
- [x] 1440px 与 1920px 桌面视口均无横向溢出，左右误差不超过 1px。
- [x] 390px 移动视口主区左侧 padding 为 0，内容不被导航遮挡。
- [x] 模板搜索、筛选、详情和使用模板交互保持不变。
- [x] 相关样式回归、组件检查、类型检查、lint、测试和构建通过；全仓格式检查仍报告既有未格式化文件。

## Definition of Done

- 侧栏轨道宽度由共享变量表达，不在页面组件中复制 magic number。
- CSS 回归测试覆盖轨道与响应式覆盖规则。
- 浏览器实测桌面与移动边界，控制台无新增错误。
- 改动以独立中文规范提交并推送到 `origin/dev`。

## Technical Approach

在全局 tokens 中定义 `--workspace-sidebar-rail: 126px`，对应 beUI 浮动折叠侧栏的 `110px` 图标宽度、`16px` 外间距和 `2px` 边框。最终级联层让非 landing、非 generate 的 `.app-main` 使用该轨道；`<=860px` 覆盖为 `0`。保留 `.workspace-page` 的最大宽度、居中和响应式 gutter 规则。

## Decision (ADR-lite)

**Context**: `.app-main` 仍按展开侧栏的 `232px` padding-left 计算，但实际运营页面使用折叠浮动侧栏，占位只有 `126px`，导致内容框相对视口左偏。

**Decision**: 用共享 token 表达运营页面的实际折叠侧栏轨道，并在主区级别修正，而不是给 Templates 单独增加负 margin。

**Consequences**: Templates、Assets、Admin 的边距计算统一，最大内容宽度在大屏仍可居中；若侧栏轨道未来变化只需更新 token和对应组件尺寸。

## Out of Scope

- 不调整卡片网格列数、图片尺寸、排序、筛选或详情弹窗动画。
- 不修改 Discover/Generate 的专用内容宽度和输入框位置。
- 不重写并行任务正在进行的资产页、用户管理页和全局光效样式。

## Technical Notes

- 用户截图路径：`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-be94108f-c65e-4b81-a4d6-ac9eb0d52776.png`。
- 当前浏览器测量（1280 CSS px）：折叠侧栏占位右边界 `126px`，`.app-main` padding-left `232px`，模板工具栏左 `264px`、右 `1232.67px`。
- 修复后预期工具栏左 `158px`、右 `1232.67px`，相对主区两侧均为约 `32px`。

## Verification (2026-08-28)

- 1280px：模板页主区使用 `126px` 侧栏轨道，工具栏左右相对主区均约 `32px`。
- 1440px：无横向溢出，工具栏相对主区左右均约 `32px`。
- 1920px：内容最大宽度 `1580px` 居中，侧栏轨道与右侧可用视口的剩余空间均约 `99px`。
- 390px：主区左 padding 为 `0px`，页面 scroll width 与 client width 均为 `375px`，无横向溢出。
- `check:components`、`typecheck`、`lint`、样式回归、全量测试（20 文件 / 92 测试）和 `build` 均通过；lint 仅有既有 Fast Refresh warning。
