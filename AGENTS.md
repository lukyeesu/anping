# Workspace Rules & Agent Instructions

## Git Operations Policy (STRICT)
- **Strictly DO NOT run `git add`, `git commit`, or `git push`**: The user manually stages, commits, and pushes code to Git/production.
- Only read-only Git commands like `git status`, `git diff`, and `git log` are allowed.

## Commands & Build
- You are allowed to run dev and build commands (e.g. `npm run dev`, `npm run build`, `npm test`) automatically without asking for confirmation.
- Preserve existing comments and architecture conventions.

## Skills & Capabilities
- Specialized agent skills are accessible via `D:\.agent\skills` (linked from `~/.agents/skills`). Check the respective `SKILL.md` when executing specialized tasks.
