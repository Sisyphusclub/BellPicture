# 简化生图导航图标

## Goal

消除“生图”导航图标在紧凑侧栏中的轮廓叠加感，改为清晰的单画框图像符号，并保持现有导航顺序、激活状态和可访问名称不变。

## What I already know

- “生图”导航项由 `frontend/src/config/navigation.ts` 统一配置，发现页、生成页和通用应用头部共用。
- 当前使用 Lucide `ImagePlus`；右上加号与图框轮廓在 16px 导航尺寸下显得叠加。
- 导航没有重复渲染图标，问题来自图标本身的多轮廓构成。

## Requirements

- 仅将“生图”导航项改为 Lucide 单画框 `Image` 图标。
- 不手写或复制 SVG path，继续使用项目统一的 Lucide 图标系统。
- 保持“发现 / 生图 / 创作模板 / 资产 / 用户管理”的顺序和路由不变。
- 保持桌面折叠侧栏、展开侧栏和移动导航中的图标尺寸、颜色及激活状态不变。
- 增加导航配置回归，锁定“生图”图标为单画框图标。

## Acceptance Criteria

- [x] “生图”导航不再显示外置加号造成的叠加轮廓。
- [x] 桌面与移动导航仍能正确进入 `/generate`。
- [x] 导航图标风格与其他 Lucide 图标一致。
- [x] 前端类型、lint、测试、构建和格式检查通过。

## Out of Scope

- 不修改上传、用作参考图或生成空状态中的 `ImagePlus` 操作图标。
- 不调整导航尺寸、间距、颜色或路由结构。

## Technical Notes

- 导航配置：`frontend/src/config/navigation.ts`。
- 导航渲染：`frontend/src/components/landing/LandingSidebar.tsx`。
- 导航配置测试：`frontend/tests/config/navigation.spec.ts`。
