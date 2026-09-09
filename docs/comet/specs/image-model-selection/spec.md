# 生图模型选择

## 需求：可用模型

生图工作区必须提供以下模型，并使用其精确标识作为提交值：

- `gpt-image-2`
- `gpt-image-2.5-flare`
- `gpt-image-2.5-sunburst`

新打开的生图工作区必须默认选择 `gpt-image-2`。模型选择控件在生成进行期间必须遵循现有控件禁用行为。

### Scenario: 默认模型与可选项

- GIVEN 用户打开生图工作区
- WHEN 用户查看模型选择控件
- THEN 当前模型为 `gpt-image-2`
- AND 可选项包含 `gpt-image-2`、`gpt-image-2.5-flare` 和 `gpt-image-2.5-sunburst`

## 需求：模型透传与持久设置

生图工作区必须把当前模型写入每次生成请求及对应的生成设置。当前模型不得因为提示词、画面比例、生成张数、公开范围或参考图变化而被替换。

### Scenario: 使用 Flare 生成

- GIVEN 用户选择 `gpt-image-2.5-flare`
- WHEN 用户提交有效的生图提示词
- THEN 生成请求的 `model` 为 `gpt-image-2.5-flare`
- AND 当前生成任务设置保留 `gpt-image-2.5-flare`

### Scenario: 使用 Sunburst 生成

- GIVEN 用户选择 `gpt-image-2.5-sunburst`
- WHEN 用户提交有效的生图提示词
- THEN 生成请求的 `model` 为 `gpt-image-2.5-sunburst`
- AND 当前生成任务设置保留 `gpt-image-2.5-sunburst`

## 需求：复用完整设置

复用已有批次的完整设置时，生图工作区必须恢复该批次记录的模型；再次提交必须继续使用恢复后的模型。

### Scenario: 恢复新模型设置

- GIVEN 一个批次的设置记录模型为 `gpt-image-2.5-sunburst`
- WHEN 用户选择“复用完整设置”
- THEN 当前模型变为 `gpt-image-2.5-sunburst`
- AND 用户再次提交时请求模型为 `gpt-image-2.5-sunburst`

## 需求：兼容模型发现

OpenAI 兼容模型发现接口必须在保留原有模型的同时，公开两个新增模型。

### Scenario: 查询兼容模型清单

- GIVEN 请求携带有效的兼容接口鉴权
- WHEN 客户端请求 `GET /v1/models`
- THEN 响应包含 `gpt-image-2.5-flare`
- AND 响应包含 `gpt-image-2.5-sunburst`
- AND 响应仍包含变更前的全部模型标识
