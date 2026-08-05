<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

## Git 提交规范

- 每一次代码改动完成并通过必要验证后，都必须立即创建独立的 Git 提交。
- 提交信息只使用 `feat: 中文说明` 或 `fix: 中文说明` 格式，冒号后必须是简洁、明确的中文描述。
- 新增功能或功能增强使用 `feat:`；缺陷修复、样式修复或行为修正使用 `fix:`。
- 每次提交只包含当前改动相关文件，不得夹带工作区中的其他未提交内容。
