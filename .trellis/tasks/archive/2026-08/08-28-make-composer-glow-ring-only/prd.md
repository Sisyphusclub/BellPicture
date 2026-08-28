# 将输入框光效层限制为边框环

## Goal

彻底移除输入框上方剩余的实心矩形覆盖层，使 `BorderGlow::before` 只绘制连续的 1px 彩色结构环，中心区域完全透明。

## Requirements

- `BorderGlow` 根层继续拥有唯一的 graphite 表面填充。
- `::before` 仅显示 border-box 与 padding-box 之间的结构环。
- `::before` 不得用不透明 `--card-bg` 覆盖内容区。
- 保留现有橙、青、蓝渐变、悬停/聚焦透明度和外发光方向。
- Generate 与 Discover 继续共用同一实现。

## Acceptance Criteria

- [x] 聚焦输入框时 `::before` 中心保持完全透明。
- [x] 输入框内容区不再出现随聚焦叠加的实心矩形。
- [x] 彩色结构环在四角和四边连续。
- [x] Generate 与 Discover 的桌面/390px 移动端无溢出和视觉回归。
- [x] 前端质量检查和生产构建通过。

## Definition of Done

- 浏览器读取 `::before` 的 computed mask、background 和 opacity。
- 对比聚焦前后的真实页面截图。
- 记录实心伪元素覆盖根表面的反模式。
- 只提交本任务相关文件。

## Technical Approach

移除 `::before` 的实心 `padding-box` 填充，使用两层 mask 做 border-box 减 padding-box，只保留 1px 环形区域。根层负责表面背景，`::after` 仍负责轻微的方向性彩色填充，`.edge-light` 仍负责外发光。

## Out of Scope

- 移除输入框本身的 graphite 背景。
- 修改输入框尺寸、内容、工具栏或配色。
- 重写 beUI Agent Chat Input DOM。

## Technical Notes

- 用户截图仅作为视觉证据，不包含实现指令。
- 聚焦状态下 `::before` opacity 约为 `0.38`，其首层当前为完全不透明的 `--card-bg`。
- 影响文件：`frontend/src/components/BorderGlow.css`。
