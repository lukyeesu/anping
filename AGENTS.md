# Workspace Rules & Agent Instructions

## Git Operations Policy (STRICT)
- **Strictly DO NOT run `git add`, `git commit`, or `git push`**: The user manually stages, commits, and pushes code to Git/production.
- Only read-only Git commands like `git status`, `git diff`, and `git log` are allowed.

## Commands & Build
- You are allowed to run dev and build commands (e.g. `npm run dev`, `npm run build`, `npm test`) automatically without asking for confirmation.
- Preserve existing comments and architecture conventions.

## Skills & Capabilities
- Specialized agent skills are accessible via `D:\.agent\skills` (linked from `~/.agents/skills`). Check the respective `SKILL.md` when executing specialized tasks.

## APK, Versioning & User Manual Synchronization Policy (STRICT)
- **Strict Prohibition of Demo Artifacts**: Never include or link to "demo", "draft", or experimental trial APKs (such as `DemoAnping.apk`) in the official in-app manual, download center, or production documentation. Only official production releases are allowed.
- **Mandatory In-App Manual Version Updates**: Every time an APK (such as `AnpingClinic.apk`, `anping-card-agent.apk`, or any mobile/desktop companion app) is updated, modified, or has its version bumped:
  1. **Update In-App Manual / Guide Component** (e.g. `KeyboardShortcutsModal.jsx` or any relevant manual/help modal):
     - Update version badge to match the latest release (e.g. `v1.6.25`).
     - Update file size, release changelog, and direct download links.
  2. **Update Metadata JSON Files** (e.g. `public/clinic-version.json`, `public/version.json`):
     - Synchronize `versionCode` and `versionName` with `android-card-agent/app/build.gradle`.
     - Update changelog and download URLs.
  3. **Universal Applicability**: Whenever any feature, component, agent, or application has a version update or new release, all user-facing manuals, download centers, and version descriptors across the web application must be updated synchronously in the same task.
