# 移除发现页输入框外层玻璃壳

## Goal

移除发现页创作输入框外部重复的玻璃卡片层，只保留 beUI `AgentChatInput` 自己的一层可见表面。

## Requirements

- 从发现页输入框渲染树移除 `LiquidGlassSurface` 可见外壳，不用透明遮盖伪装删除。
- 使用无视觉样式的普通定位容器继续承载 docking ref、data 属性和焦点/失焦事件。
- 保留唯一的 beUI `AgentChatInput` 实例及其 BorderGlow、焦点、禁用和生成控件行为。
- 保留外框 FLIP 与内容缩放校正两个透明 Motion 边界，不能重新引入文字缩放问题。
- 非停靠、停靠紧凑和停靠展开状态都只能看到一层圆角卡片。
- 不改变上一任务完成的桌面/移动端居中、文字垂直居中和 reduced-motion 行为。
- 删除不再使用的 LiquidGlass 组件和样式，清理相关规范描述。

## Acceptance Criteria

- [x] DOM 中不再存在 `.landing-liquidglass-target`、`.landing-liquidglass-backdrop` 或 LiquidGlass canvas。
- [x] beUI 输入框是唯一具有背景、边框、圆角和阴影的可见表面。
- [x] hero 非停靠态、桌面停靠态和 `390 x 844` 移动端没有额外轮廓、重叠或横向溢出。
- [x] 展开/收起仍平滑，文字和 `40px` 控件在逐帧采样中不缩放。
- [x] 输入、焦点、空内容失焦收起和 reduced-motion 行为正常。
- [x] 相关测试、完整测试、类型检查、lint、构建和格式检查通过。

## Verification Baseline

- 修复前非停靠态 `.landing-liquidglass-target` 为 `940 x 142.67px`，绘制灰色渐变、边框和阴影。
- 内部 `.landing-composer` 同时为 `938.67 x 141.33px` 并绘制自己的卡片背景，构成重复表面。
- Motion 的 `.landing-composer-layout` 与 `.landing-composer-content` 均为透明定位层，不是截图中的可见外壳。

## Verification

- 非停靠、紧凑停靠和展开停靠三种状态均确认只存在一个 `AgentChatInput`，LiquidGlass target、backdrop 和 canvas 数量为 `0`。
- anchor、layout 和 content 层的 background、border、shadow 均为空；beUI composer 是唯一可绘制卡片。
- `1280px` 桌面中心保持 `696.33px`；`390 x 844` 移动端中心误差约 `0.17px`，横向溢出为 `0`。
- 展开态输入区保持 `76px`，生成张数控件保持 `40px`；上一任务的 Motion 缩放校正未回归。
- console 无新增 warning/error；`check:components`、typecheck、lint、73 项完整测试、build、修改文件 Prettier 和 `git diff --check` 通过。

## Out of Scope

- 不调整输入框最终尺寸、生成控件、文案、配色或画廊。
- 不修改生成页输入框和图片详情。
