# Comet 的 Codex 显式入口

## 目标行为

Comet 作为 Codex Skill 被发现和调用。项目继续通过 `.comet/config.yaml` 决定该 Skill 后续进入的 workflow。

## 验收场景

Scenario: 使用 Skill 提及语法进入 Comet

- GIVEN 当前 Codex 会话已发现名为 `comet` 的 Skill
- WHEN 用户在提示中输入 `$comet`
- THEN Codex 激活 `comet` Skill
- AND Comet 根据项目配置解析并进入 `native` workflow
- AND 不出现 `/comet` 未识别错误

Scenario: 从技能列表进入 Comet

- GIVEN 当前 Codex 会话已发现名为 `comet` 的 Skill
- WHEN 用户运行 `/skills` 并选择 `comet`
- THEN Codex 激活 `comet` Skill
- AND Comet 根据项目配置解析并进入 `native` workflow

## 不变量

- 项目不尝试向 Codex 注册自定义顶层 `/comet` 命令。
- 不修改 BellPicture 产品功能。
- 不修改仓库内现有的 Comet 调用说明。
