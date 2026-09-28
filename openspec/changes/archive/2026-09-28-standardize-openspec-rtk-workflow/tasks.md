## 1. Establish the migration baseline

- [x] 1.1 Reconfirm the tracked legacy skill files, empty repository-native destinations, concise root guidance, placeholder OpenSpec configuration, and clean preservation scope for main specs and archived changes.
- [x] 1.2 Record content checks for the five source skills so the four unchanged workflows can be compared exactly and the archive workflow can be compared with only its intended policy difference.

## 2. Migrate and harden the OpenSpec skills

- [x] 2.1 Populate `.agents/skills/` with the explore, propose, apply, sync, and archive `SKILL.md` files from the functional repository-local sources.
- [x] 2.2 Update the migrated archive workflow to require successful delta-spec synchronization and verification before archive, removing every archive-without-sync path while preserving handling for changes without delta specs.
- [x] 2.3 Verify the destination skill set and intended archive-only difference before removing all legacy `.codex/skills/` copies.

## 3. Configure project-aware OpenSpec guidance

- [x] 3.1 Replace the template context in `openspec/config.yaml` with concise, verified project facts, container-only execution constraints, sensitive-data protections, minimal-scope guidance, and preservation requirements.
- [x] 3.2 Add artifact-specific rules for proposals, specs, designs, and tasks, including focused validation and mandatory synchronization before archive without duplicating the full global instruction set.

## 4. Verify the standardized workflow

- [x] 4.1 Confirm that exactly five repository-local OpenSpec skills are tracked under `.agents/skills/` and none remain under `.codex/skills/`.
- [x] 4.2 Run OpenSpec health and strict validation checks and confirm all existing main specs and archived changes remain intact.
- [x] 4.3 Inspect generated OpenSpec instructions to confirm project context and artifact rules are applied without local paths, secrets, credentials, or other machine-specific information.
- [x] 4.4 Confirm from a fresh agent session that all five workflows are discovered from `.agents/skills/`, with no duplicate repository-local entries and with sync enforced before archive.
- [x] 4.5 Review the final diff to confirm application files, dependencies, main specs, archived changes, `AGENTS.md`, and `RTK.md` have no unintended modifications.
