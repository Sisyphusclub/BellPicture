# Bug Analysis: BorderGlow 内容区块状伪影

## 1. Root Cause Category

- **Category**: E - Implicit Assumption
- **Specific Cause**: React Bits 示例假设卡片背景可以在 `::before` 的 padding-box 中再次绘制而不产生视觉差异。Nebulens 创作输入框使用半透明石墨背景，伪元素再次绘制相同半透明颜色会与根背景叠加，形成方向性黑色矩形。`::after` 的多层网格填充还会在超宽、浅高的输入框中形成大面积棕色和蓝色色块。

## 2. Why Fixes Failed

1. **按官方三层结构整体替换**: 解决了旧结构的断层，但保留了不适合半透明创作输入框的 padding-box 与 soft-fill 假设。
2. **只将 `fillOpacity` 设为 `0`**: 关闭了 `::after` 色块，却没有处理 `::before` 对半透明背景的重复绘制，因此中心黑块仍存在。
3. **结构测试通过**: 测试验证了 CSS 层和变量存在，却没有验证鼠标靠近边缘时内容区的实际像素结果。

## 3. Prevention Mechanisms

| Priority | Mechanism            | Specific Action                                                                | Status |
| -------- | -------------------- | ------------------------------------------------------------------------------ | ------ |
| P0       | Architecture         | 将 `::before` mesh 裁剪到 1px 边缘环，根节点作为唯一 surface paint             | DONE   |
| P0       | Integration contract | 共享 beUI Agent Chat Input 固定传入 `fillOpacity={0}`                          | DONE   |
| P0       | Test coverage        | CSS 测试拒绝在 `::before` 中使用 `--card-bg`，路由测试断言 `--fill-opacity: 0` | DONE   |
| P1       | Browser QA           | 在 1440 x 813 与 390 x 844 下激活四边光效，检查内容区、圆角、溢出和控制台      | DONE   |

## 4. Systematic Expansion

- **Similar Issues**: 任何在半透明根 surface 上再次绘制同色背景的伪元素、inner wrapper 或 route overlay 都可能产生矩形叠色。
- **Design Improvement**: 每个创作输入框只允许根容器绘制完整 surface；伪元素只能绘制边缘或外部效果。
- **Process Improvement**: 光效检查必须包含“激活状态截图”，不能只读取计算样式或在指针中心验证透明度。

## 5. Knowledge Capture

- [x] 更新 `.trellis/spec/frontend/component-guidelines.md`，记录半透明 surface 与边缘环约束。
- [x] 更新组件集成和 CSS 结构测试。
- [x] 完成首页与生图页桌面/移动浏览器验证。
- [x] 本仓库没有 `src/templates/markdown/spec/`，无需同步模板副本。
