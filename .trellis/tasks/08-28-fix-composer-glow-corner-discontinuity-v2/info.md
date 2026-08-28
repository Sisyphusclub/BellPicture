# Bug Analysis: 输入框光效四角断层

## 1. Root Cause Category

- **Category**: E - Implicit Assumption
- **Specific Cause**: 实现默认绝对定位伪元素、放大的 `.edge-light` 遮罩和内缩的发光源会自动继承同一圆角路径。实际上三层使用了不同的包含块和半径，根元素的静态边框又比伪元素渐变环外移一层，最终在四角形成不同圆心的弧线。

## 2. Why Fixes Failed

1. 移除结构环的方向遮罩：只消除了方向裁剪，没有修正静态边框和渐变环的坐标差。
2. 移除发光源的 inset 描边：减少了一条叠加线，但放大遮罩层仍继承根半径，四角曲线仍不同心。
3. 将遮罩缩回根尺寸：几何一致，但遮罩裁掉了需要溢出显示的 `box-shadow`，外发光不可见。

## 3. Prevention Mechanisms

| Priority | Mechanism     | Specific Action                                                                       | Status |
| -------- | ------------- | ------------------------------------------------------------------------------------- | ------ |
| P0       | Architecture  | 外层扩散容器半径随 inset 同步增加，内部源显式使用结构环半径                           | DONE   |
| P0       | Documentation | 在前端组件规范中记录共享 BorderGlow 的同心圆角契约                                    | DONE   |
| P1       | Browser QA    | 在真实 Generate/Discover 页面读取 pseudo-element computed style，并检查 1440/390 视口 | DONE   |
| P2       | Test Coverage | 后续引入稳定的视觉回归工具后增加四角像素基准                                          | TODO   |

## 4. Systematic Expansion

- **Similar Issues**: 所有使用负 inset 放大遮罩并在内部重新 inset 发光源的组件都可能出现同类断层。
- **Design Improvement**: 半径和结构边框宽度必须由根 CSS 变量派生，路由样式不能复制光效算法。
- **Process Improvement**: 视觉修复不能只看静态截图；需要同时验证伪元素的 inset、radius、mask 和真实页面像素。

## 5. Knowledge Capture

- [x] 更新 `.trellis/spec/frontend/component-guidelines.md`。
- [x] 在本任务 PRD 中记录技术决策和验收标准。
- [x] 复核 Generate 与 Discover 的共享实现。
- [ ] 视觉回归基础设施成熟后补充像素级自动化。
