## Why

The repository still exposes its functional OpenSpec skills through the legacy `.codex/skills/` layout while the repository-native `.agents/skills/` locations are empty, and its OpenSpec configuration still contains template guidance. Standardizing these entry points now will make future changes follow verified project constraints consistently and will enforce specification synchronization before archival.

## What Changes

- Populate `.agents/skills/` with the five functional OpenSpec workflows for exploring, proposing, applying, synchronizing, and archiving changes.
- Update the archive workflow so changes with delta specs must synchronize them successfully before archival, with no bypass path.
- Remove the duplicate legacy skill copies under `.codex/skills/` after verifying the migrated files.
- Replace the placeholder `openspec/config.yaml` guidance with concise, verified project context and artifact-specific rules.
- Keep the root `AGENTS.md` and `RTK.md` entry points concise and authoritative.
- Preserve all main specifications and archived changes while leaving application behavior and dependencies unchanged.

## Capabilities

### New Capabilities

None. This change standardizes repository tooling and documentation without adding product behavior; the change opts out of delta specs.

### Modified Capabilities

None. Existing application requirements remain unchanged.

## Impact

- Repository guidance: `AGENTS.md`, `RTK.md`, and `openspec/config.yaml`.
- Agent workflows: `.agents/skills/` becomes the repository-native skill location and `.codex/skills/` is removed.
- OpenSpec lifecycle: archive operations require completed synchronization whenever delta specs exist.
- Application source, runtime behavior, package manifests, dependencies, main specs, and archived changes are unaffected.
