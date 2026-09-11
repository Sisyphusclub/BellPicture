---
generated_from_state_version: 21
---

# 验证

## 当前结果

- 结果: **已归档**
- 验证情况: **已完成检查，验证结果已确认**
- 目标周期: 1
- 迭代: 1
- 验证器尝试次数: 4
- 完成时间: 2026-09-09T10:45:25.159Z
- 摘要: 25/25 验收项通过；实现、请求链路、响应式与覆盖层稳定性均已独立验证。

## 验收

| 编号 | 结果 | 来源 | 验收项 | 原因 |
| --- | --- | --- | --- | --- |
| A1 | passed | brief.md | A1：发现页和生图页输入框具有一致的外框、输入区、工具栏、模型选择及“自定义”入口样式。 | 发现页与生图页均使用 GenerationComposerControls，共享 composer 结构与样式契约。 |
| A2 | passed | brief.md | A2：两个页面的模型选择器均显示三个指定模型，默认选择 `gpt-image-2`，切换后提交值与所选标识一致。 | 三个精确模型标识、默认 gpt-image-2 与提交值一致。 |
| A3 | passed | brief.md | A3：打开“自定义”后，比例、张数和清晰度使用 Beui 组件横向排列；关闭后设置仍保留，工具栏不平铺这些参数控件。 | 自定义面板使用 Beui 组件，桌面横排、窄屏换行，关闭后值保留。 |
| A4 | passed | brief.md | A4：比例列表按指定顺序完整显示，包含新增的 3:4、4:3；“智能”按第一张可读取的参考图匹配最接近比例，无参考图时解析为 1:1。 | 比例顺序完整，智能按第一张可读取参考图匹配，失败回退 1:1。 |
| A5 | passed | brief.md | A5：张数只能选择 1 至 4；所有已登录用户均可选择并成功提交 1K、2K、4K，不因非管理员身份收到高分辨率权限错误。 | 张数 1-4，非管理员可提交 1K/2K/4K。 |
| A6 | passed | brief.md | A6：选择 4K 时，若当前为“智能”或其他不兼容比例则自动切换到 16:9；4K 状态下仅 16:9、9:16 可用。 | 4K 自动归一 16:9，仅 16:9/9:16 可选。 |
| A7 | passed | brief.md | A7：从发现页带设置发起生成时，生图页与实际生成请求保留模型、解析后比例、张数、清晰度和公开范围；历史完整设置复用后再次提交也保持一致。 | 发现页交接、任务、历史与完整设置复用均保留全部设置。 |
| A8 | passed | brief.md | A8：后端接受 1K、2K 的 3:4、4:3 请求并向上游发送对应尺寸；4K 的 3:4、4:3 仍在上游调用前被拒绝。 | 1K/2K 新比例尺寸映射通过，4K 非法比例在上游调用前拒绝。 |
| A9 | passed | brief.md | A9：在 1440、900 和 390 像素宽视口打开或操作模型/自定义下拉层时，页面没有横向跳动、控件重叠或文本溢出。 | 1440/900/390 视口无横向跳动、重叠或文本溢出。 |
| A10 | passed | specs/image-generation-composer/spec.md | 两个页面显示一致的输入框 - GIVEN 用户分别打开发现页和生图页 - WHEN 用户查看生图输入框及其工具栏 - THEN 两个输入框使用一致的外框、输入区和控件视觉样式 - AND 两个工具栏均提供模型选择和“自定义”入口 - AND 比例、张数和清晰度没有直接平铺在关闭状态的工具栏中 | 两页共享视觉契约，关闭状态不平铺参数。 |
| A11 | passed | specs/image-generation-composer/spec.md | 选择模型并从发现页生成 - GIVEN 用户在发现页选择 `gpt-image-2.5-flare` - WHEN 用户输入有效提示词并发起生成 - THEN 生图页恢复 `gpt-image-2.5-flare` 为当前模型 - AND 生成请求的 `model` 为 `gpt-image-2.5-flare` - AND 对应任务和历史设置记录相同模型标识 | 模型切换后发现页交接、生图请求和历史快照标识一致。 |
| A12 | passed | specs/image-generation-composer/spec.md | 新会话模型默认值 - GIVEN 用户打开没有可恢复设置的新生图会话 - WHEN 用户查看模型选择器 - THEN 当前模型为 `gpt-image-2` - AND 模型列表同时包含三个指定模型 | 新会话默认 gpt-image-2 且列表包含三个模型。 |
| A13 | passed | specs/image-generation-composer/spec.md | 编辑并保留自定义设置 - GIVEN 用户打开任一页面的生图输入框 - WHEN 用户打开“自定义”并修改比例、张数和清晰度后关闭面板 - THEN 三组参数使用 Beui 控件呈现 - AND 桌面宽度下三组控件横向排列 - AND 再次打开面板时仍显示修改后的值 | 自定义三组控件横排并可关闭重开保留。 |
| A14 | passed | specs/image-generation-composer/spec.md | 显示完整比例选项 - GIVEN 当前清晰度为 1K 或 2K - WHEN 用户展开比例控件 - THEN 选项按“智能、1:1、3:4、4:3、16:9、9:16、2:3、3:2”排序 - AND 所有选项均可选择 | 1K/2K 比例列表完整且顺序正确。 |
| A15 | passed | specs/image-generation-composer/spec.md | 使用新增比例生成 - GIVEN 已登录用户选择 3:4 或 4:3 - AND 当前清晰度为 1K 或 2K - WHEN 用户提交有效生图请求 - THEN 前端请求携带所选具体比例 - AND 后端通过校验并向上游发送该比例对应的尺寸 - AND 历史记录能够解析并恢复该比例 | 3:4/4:3 请求、后端校验、尺寸映射、历史解析通过。 |
| A16 | passed | specs/image-generation-composer/spec.md | 根据第一张参考图匹配比例 - GIVEN 用户选择“智能” - AND 第一张参考图可读取且其宽高比最接近 3:4 - WHEN 用户提交生成 - THEN 请求的 `aspectRatio` 为 `3:4` - AND 任务与历史设置记录 `3:4` | 智能比例使用第一张可读取参考图的最近比例。 |
| A17 | passed | specs/image-generation-composer/spec.md | 没有可读取参考图时使用正方形 - GIVEN 用户选择“智能” - AND 没有可读取的参考图尺寸 - WHEN 用户提交生成 - THEN 请求的 `aspectRatio` 为 `1:1` - AND 当前生成任务使用 1:1 | 无可读取参考图时使用 1:1。 |
| A18 | passed | specs/image-generation-composer/spec.md | 选择四张图片 - GIVEN 当前未在生成中 - WHEN 用户把生成张数设置为 4 并提交有效提示词 - THEN 请求的 `count` 为 4 - AND 提交额度提示反映 4 张的现有额度成本 - AND 张数增加控件在 4 时不可继续增加 | 4 张请求、额度提示和边界行为通过。 |
| A19 | passed | specs/image-generation-composer/spec.md | 普通用户提交 2K - GIVEN 已登录的非管理员用户选择 2K - WHEN 用户提交有效生图请求 - THEN 请求进入现有高分辨率端点 - AND 请求不会因用户不是管理员而返回 403 - AND 任务和历史设置记录 `2k` | 普通用户 2K 进入高分辨率端点且无管理员 403。 |
| A20 | passed | specs/image-generation-composer/spec.md | 复用高分辨率设置 - GIVEN 一个历史批次记录模型为 `gpt-image-2.5-sunburst`、比例为 9:16、张数为 2、清晰度为 4K - WHEN 用户执行“复用完整设置”并再次生成 - THEN 输入框恢复该模型、比例、张数和清晰度 - AND 新请求继续使用这些设置 | 高分辨率历史完整设置可恢复并再次提交。 |
| A21 | passed | specs/image-generation-composer/spec.md | 切换到 4K 时归一比例 - GIVEN 当前比例为 3:4 或“智能” - WHEN 用户把清晰度切换为 4K - THEN 当前比例自动变为 16:9 - AND 比例控件中只有 16:9 和 9:16 可选择 | 切换 4K 时不兼容比例立即变为 16:9。 |
| A22 | passed | specs/image-generation-composer/spec.md | 服务端拒绝无效 4K 比例 - GIVEN 客户端直接提交清晰度为 4K、比例为 4:3 的请求 - WHEN 请求到达生成服务 - THEN 服务返回 400 - AND 上游图像服务没有被调用 | 服务端拒绝 4K 非法比例且不调用上游。 |
| A23 | passed | specs/image-generation-composer/spec.md | 从发现页交接全部设置 - GIVEN 用户在发现页选择 Sunburst、4K、9:16、3 张并启用发布到发现 - WHEN 用户提交提示词并完成登录流程 - THEN 生图页在自动生成前恢复全部选择 - AND 请求使用 Sunburst、`4k`、`9:16`、`count=3`、`isPublic=true` | 发现页 Sunburst/4K/9:16/3 张/公开设置完整交接。 |
| A24 | passed | specs/image-generation-composer/spec.md | 打开覆盖层时页面不位移 - GIVEN 页面存在垂直滚动条 - WHEN 用户依次打开模型菜单和自定义面板 - THEN 页面主体和输入框的横向坐标保持不变 - AND 页面没有新增横向滚动 - AND 关闭覆盖层后输入框状态符合所在页面原有规则 | 覆盖层打开关闭不改变主体坐标或页面宽度。 |
| A25 | passed | specs/image-generation-composer/spec.md | 移动端自定义面板可用 - GIVEN 视口宽度为 390 像素 - WHEN 用户打开自定义面板并操作每一组参数 - THEN 参数按可用宽度换行且互不重叠 - AND 选项文本完整可读 - AND 页面没有横向溢出 | 390px 面板单列可用、文本完整、无横向溢出。 |

## 检查

_没有记录 Runtime 检查。_

## 阻塞项

_无。_

## 风险与跳过的工作

- 前端全量并发测试存在既有懒加载时序失败；相关 change 定向测试均通过。

## 之前的迭代

| 目标周期 | 迭代 | 尝试 | 结果 | 未解决项 | 摘要 | 完成时间 |
| ---: | ---: | ---: | --- | --- | --- | --- |
| 1 | 1 | 1 | execution-error | — | Independent verifier remained running without returning a result beyond the execution window; no candidate files changed. | 2026-09-09T09:41:25.670Z |
| 1 | 1 | 2 | execution-error | — | The second independent verifier execution was interrupted after remaining without a result; candidate and prior Runtime checks remain unchanged. | 2026-09-09T10:02:40.610Z |
| 1 | 1 | 3 | execution-error | — | The third independent verifier execution did not return a result and was stopped; implementation and completed checks are unchanged. | 2026-09-09T10:15:52.450Z |
| 1 | 1 | 4 | pass | — | 25/25 验收项通过；实现、请求链路、响应式与覆盖层稳定性均已独立验证。 | 2026-09-09T10:45:25.159Z |



## 结论

25/25 验收项通过；实现、请求链路、响应式与覆盖层稳定性均已独立验证。
