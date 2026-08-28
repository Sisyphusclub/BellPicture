# Bug Analysis: 输入框仍有矩形覆盖层

## 1. Root Cause Category

- **Category**: E - Implicit Assumption
- **Specific Cause**: `BorderGlow::before` 被当作结构边框使用，但传统 gradient-border 写法同时包含了完全不透明的 `padding-box` 背景。聚焦时整个伪元素提高透明度，实心中心便透过半透明根层叠加为一块矩形。

## 2. Why Fixes Failed

1. 修正外发光圆角：只解决了不同圆角路径的断层，没有检查伪元素中心是否实心。
2. 移除 beUI surface 背景：消除了 DOM 内层卡片，却暴露出共享 `::before` 仍在绘制完整卡片。
3. 只看 DOM 层级：伪元素不出现在子节点列表中，误把“唯一 DOM 表面”等同于“唯一绘制表面”。

## 3. Prevention Mechanisms

| Priority | Mechanism     | Specific Action                                                      | Status |
| -------- | ------------- | -------------------------------------------------------------------- | ------ |
| P0       | Architecture  | `::before` 使用 border-box 减 padding-box 的 hollow mask             | DONE   |
| P0       | Documentation | 明确根层唯一填充、surface 透明、结构环中心透明                       | DONE   |
| P1       | Browser QA    | 聚焦时读取 pseudo-element background、mask clip/composite 和 opacity | DONE   |
| P2       | Test Coverage | 视觉回归设施成熟后增加聚焦前后中心像素稳定性检查                     | TODO   |

## 4. Systematic Expansion

- **Similar Issues**: 所有用伪元素实现渐变边框、同时让根层半透明的组件都可能产生隐蔽的双重填充。
- **Design Improvement**: 每个绘制层只承担一种职责：root 填充、`::before` 结构环、`::after` 轻微彩色填充、`.edge-light` 外发光。
- **Process Improvement**: 视觉分层排查必须包含伪元素 computed background/mask，不能只列 DOM children。

## 5. Knowledge Capture

- [x] 更新 `.trellis/spec/frontend/component-guidelines.md`。
- [x] 记录结构环的 hollow mask 契约。
- [x] 在 Generate、Discover、桌面和移动端验证。
- [ ] 后续增加像素级视觉回归。
