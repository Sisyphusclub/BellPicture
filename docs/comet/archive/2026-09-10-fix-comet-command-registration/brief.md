# 目标

明确 Codex 中受支持的 Comet 显式入口，让用户通过 `$comet` 或 `/skills` 进入项目配置指定的 Comet workflow。

# 范围

- 已确认当前环境使用 Codex CLI 0.153.4。
- 已确认项目存在 `comet` Skill，但不存在名为 `/comet` 的 Codex 内建命令。
- 本次仅提供并采用受支持的显式入口，不修改仓库实现或说明文件。

# 非目标

- 不修改 Codex 宿主本身的内建斜杠命令集合。
- 不修订仓库内现有的 `/comet` 文字说明。
- 不改动 BellPicture 产品功能。

# 验收示例

- A1：在 Codex 中通过受支持的显式入口选择 `comet` Skill 时，不再出现 `/comet` 未识别错误，并进入项目配置指定的 Native workflow。

# 约束与不变量

- OpenAI 官方文档规定 Codex CLI/IDE 通过 `/skills` 或 `$<skill-name>` 显式调用 Skill。
- `/...` 命令由 Codex 宿主提供，项目 Skill 文件不会注册同名顶层斜杠命令。
- 保留 Comet 的 workflow 解析、Native/Classic 路由和环境感知恢复行为。

# 决策

- `comet` 继续作为 Skill 名称；Codex 中受支持的直接显式语法是 `$comet`。
- 用户选择只使用受支持入口，不修改仓库中的调用说明。

# 待解决问题

无。

# 验证预期

- 使用 Codex 当前技能发现机制确认 `comet` 可由 `/skills` 选择或以 `$comet` 提及。
- 运行 Comet workflow 解析命令，确认项目仍路由到 Native workflow。
