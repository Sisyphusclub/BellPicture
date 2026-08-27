# 修复发现页输入框展开动画卡顿

## Goal

修复发现页底部停靠输入框从紧凑态展开为完整 beUI 创作框时的卡顿和不连续感，让形变即时响应、轨迹连贯，并保持现有布局和交互契约。

## Requirements

- 保留同一个 beUI `AgentChatInput` 实例及现有紧凑态、展开态最终几何。
- 展开主形变只使用合成友好的 `transform`；辅助控件仅使用 `transform` 和 `opacity`。
- 移除会在动画期间逐帧触发布局的 `width`、高度、内边距、定位和 `flex-basis` 过渡。
- 点击或键盘聚焦后立即开始动画，过程中不阻断输入和控件交互。
- 收起过渡使用相同空间关系但更短；`prefers-reduced-motion` 下立即切换状态。
- 保持上一任务完成的桌面和移动端文字垂直居中规则。

## Acceptance Criteria

- [x] 紧凑态点击后连续形变到完整输入框，无明显尺寸跳帧或子控件突然挤压。
- [x] 动画运行期间仅存在 `transform` / `opacity` 合成动画，不存在布局属性 transition。
- [x] 桌面和 `390 x 844` 移动端展开/收起均无重叠和横向溢出。
- [x] reduced-motion 下无空间形变动画，状态和焦点行为正常。
- [x] 前端类型检查、相关测试、完整测试和构建通过。

## Definition of Done

- 通过真实浏览器采样动画属性、帧间隔、最终几何和控制台。
- 回归测试覆盖停靠输入框展开/收起状态。
- 更新前端 motion 规范并创建独立修复提交。

## Technical Approach

使用仓库现有 Motion `layout` 投影，在同一个 `AgentChatInput` 外增加无视觉样式的布局动画层。React 状态一次性切换到最终布局，Motion 通过 FLIP transform 投影紧凑态到完整态；CSS 只保留子控件的 opacity/transform 过渡。reduced-motion 时禁用 layout 投影并立即切换。

## Decision (ADR-lite)

**Context**: 当前 CSS 同时过渡多个布局属性，图片密集页面会在约 360ms 内反复进行 style/layout/paint，造成可见卡顿。

**Decision**: 用现有 `motion/react` 的 layout FLIP 合成形变替代逐帧布局动画，不新增依赖，不复制 beUI 组件。

**Consequences**: 紧凑态和展开态布局会一次性切换，视觉连续性由 Motion compositor transform 承担；子控件通过短 opacity/transform 过渡解释信息层级变化。

## Out of Scope

- 不调整最终宽高、圆角、配色、文案或生成参数控件。
- 不修改发现页画廊、图片详情、模板页面或生成页输入框。
- 不增加装饰性动画。

## Technical Notes

- 视觉依据：`C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-5a2eb382-f703-486a-ba04-745fd9bd8f35.png`。
- 项目 motion 约束：约 `360ms` ease-out-expo；只动画 transform/opacity；reduced-motion 立即切换。
- 初步相关文件：`frontend/src/views/LandingView.tsx`、`frontend/src/styles/base.css`、`frontend/tests/App.spec.tsx`。

## Verification

- 桌面 `1440 x 813`：紧凑态约 `560 x 72.67`，展开态约 `939 x 141.33`，横向溢出为 `0`。
- 移动端 `390 x 844`：紧凑态约 `358 x 72.67`，展开态约 `357 x 195.33`，横向溢出为 `0`。
- 展开和收起均采样到 Motion `translate3d(...) scale(...)` 投影，结束后归一为 `transform: none`。
- 布局元素 CSS transition 时长为 `0s`；辅助控件仅暴露 `opacity, transform`。
- reduced-motion 回归测试确认焦点、展开和空内容失焦收起保持正常，并禁用布局投影。
- `check:components`、`typecheck`、`lint`、73 项完整测试、`build`、修改文件 Prettier 和 `git diff --check` 通过。
