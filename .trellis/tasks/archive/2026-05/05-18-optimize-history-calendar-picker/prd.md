# Optimize history calendar picker

## Goal

优化图片管理页顶部日期筛选控件，让日期范围选择更符合 Ref2Image 的暖色、无阴影、低圆角视觉体系，并避免浏览器原生日期弹层在截图中出现的默认样式割裂。

## What I already know

* 用户截图指出当前日历组件视觉需要优化。
* 当前 `HistoryView.vue` 使用两个原生 `<input type="date">` 作为起始/结束日期。
* 截图中的弹出日历是浏览器原生 date picker UI，无法通过项目 CSS 稳定深度定制。
* 项目规范允许 Element Plus 作为低风险工具型组件；产品主体样式仍使用项目 tokens 和自定义 class。
* 日期筛选当前只影响前端本地过滤，不涉及后端 API 或数据结构变更。

## Assumptions (temporary)

* 用户希望优化截图中展开后的日历弹层，而不只是顶部日期输入框的静态外观。
* 日期范围筛选行为保持不变：选择起始/结束日期后点击 `查询` 应过滤历史记录，`清除筛选条件` 清空筛选。

## Open Questions

* None.

## Requirements

* Replace the native browser date inputs with a customizable date range picker.
* 日期筛选控件必须保留起始日期、结束日期、查询和清除筛选能力。
* 用户可见文案和 aria label 使用简体中文。
* 弹层表面应遵循项目 popup 约定：暖白/米白、细边框、较小圆角、无投影、不使用玻璃模糊。
* 不改变图片历史数据、后端 API 或图片网格/详情弹窗行为。

## Acceptance Criteria (evolving)

* [ ] 图片管理页不再显示浏览器默认样式的原生日期弹层。
* [ ] 日期范围选择弹层视觉符合项目暖白、细边框、较小圆角、无阴影风格。
* [ ] 起始/结束日期筛选、查询、清除筛选仍正常工作。
* [ ] 移动端布局不溢出视口。
* [ ] 相关前端组件测试通过。

## Definition of Done

* Implementation uses existing Vue component patterns.
* Focused component tests cover date range interaction and clearing behavior where practical.
* Frontend lint/typecheck and focused tests pass.
* Browser smoke verifies date picker open/select/clear flow.

## Feasible Approaches

### Approach A: Replace native inputs with an Element Plus date-range picker (Recommended)

* How it works: use Element Plus date range utility for calendar behavior, then apply a scoped popper class/global override to match project visual tokens.
* Pros: avoids unstyleable browser native popup; built-in keyboard/calendar behavior; minimal custom date math.
* Cons: requires careful CSS override to keep it from looking like stock Element Plus.

### Approach B: Build a small custom range calendar

* How it works: implement our own popover month grid, range selection, keyboard/focus behavior and date formatting.
* Pros: full visual control.
* Cons: more code and more a11y/date edge cases for a simple filter.

### Approach C: Only restyle the closed filter pill

* How it works: keep native date inputs and adjust the top control visuals.
* Pros: smallest change.
* Cons: cannot fix the screenshot problem because the opened calendar is controlled by the browser.

## Technical Approach

Use Element Plus `ElDatePicker` with `type="daterange"`, `format="YYYY/MM/DD"`, `value-format="YYYY-MM-DD"`, Simplified Chinese placeholders, and a dedicated `popper-class` for project-specific warm off-white styling. Keep the existing `查询` and `清除筛选条件` actions, mapping the range array into the existing `startDate`/`endDate` filter state.

## Decision (ADR-lite)

**Context**: The current screenshot shows the browser native date picker, which is not reliably styleable via project CSS.

**Decision**: Replace the two native date inputs with an Element Plus date-range utility and custom project styling.

**Consequences**: We get reliable calendar behavior and a styleable popup, while accepting limited Element Plus CSS override work. A fully custom calendar is out of scope for this filter.

## External Documentation

* Context7 `/websites/element-plus_en-us`: Element Plus DatePicker supports `type="daterange"`, `format`, `value-format`, `range-separator`, `start-placeholder`, `end-placeholder`, and `unlink-panels`.

## Out of Scope

* Changing backend image/history APIs.
* Changing history grid card layout or detail modal behavior.
* Adding preset ranges, saved filters, or timezone controls.

## Technical Notes

* Relevant file inspected: `frontend/src/views/HistoryView.vue`.
* Relevant specs inspected: `.trellis/spec/frontend/component-guidelines.md`, `.trellis/spec/frontend/quality-guidelines.md`, `.trellis/spec/guides/index.md`.
