## Context

See `proposal.md` for motivation. The repository currently tracks five complete OpenSpec skill files under `.codex/skills/`, while matching directories under `.agents/skills/` contain no tracked files. `openspec/config.yaml` declares the `spec-driven` schema but otherwise contains example text. Root guidance is intentionally delegated through `AGENTS.md` to `RTK.md` and must remain concise.

The migration must not read secret-bearing files, must not introduce machine-specific paths into tracked content, and must not modify application source, dependencies, main specifications, or archived changes. Package-manager, build, lint, and application test commands remain container-only, although this documentation-only change should not require those gates.

## Goals / Non-Goals

**Goals:**

- Make `.agents/skills/` the single tracked repository-local home for all five OpenSpec workflows.
- Preserve the functional content of the current skills except where repository policy requires stricter archive behavior.
- Make OpenSpec-generated artifacts inherit concise, verified project constraints and artifact-specific guidance.
- Make synchronization a fail-closed prerequisite for archiving any change that has delta specs.
- Provide structural and OpenSpec-native verification proportional to a tooling-only migration.

**Non-Goals:**

- Changing application behavior, runtime configuration, dependencies, or package scripts.
- Rewriting main specs or archived change history.
- Expanding `AGENTS.md` with guidance already delegated to global instructions or `RTK.md`.
- Exercising a real archive against existing project history merely to test the workflow.
- Installing or updating OpenSpec, RTK, or any other tool.

## Decisions

### Use `.agents/skills/` as the only repository-local skill layout

Copy the five current `SKILL.md` files into their matching `.agents/skills/<skill-name>/` directories, verify their presence and intended contents, then remove `.codex/skills/`. This ordered migration avoids a window where the only functional copies have been removed before verification.

Keeping both layouts was rejected because duplicate discovery can make precedence ambiguous and violates the issue completion criteria. Moving the directory before inspection was rejected because the archive workflow requires a deliberate policy change rather than a byte-for-byte relocation.

### Keep four workflows behaviorally equivalent and harden archive separately

The explore, propose, apply, and sync workflows retain their current functional instructions. The archive workflow is changed so that:

1. it detects delta specs from resolved OpenSpec artifact paths;
2. it assesses whether they are already reflected in the main specs;
3. it invokes the sync workflow when synchronization is needed;
4. it verifies the synchronized state; and
5. it archives only after synchronization succeeds.

There is no “archive without syncing” option. Changes without delta specs may proceed directly after the normal artifact and task checks. Treating sync as a recommendation was rejected because repository policy explicitly requires it and optional behavior can silently leave main specs stale.

### Put durable project facts and artifact rules in `openspec/config.yaml`

The configuration will record only verified, repository-level facts needed when generating artifacts: the Vue 3 and Quasar application on Node.js 22, the Netlify Functions and Contentful/Cloudinary boundaries, container-only execution for package-manager and validation commands, sensitive-data restrictions, minimal-scope expectations, and preservation of existing specs and archives.

Artifact rules will keep proposals scoped with explicit non-goals and impacts; require specs to use normative requirements and concrete scenarios only for behavior changes; require designs to document alternatives, risks, migration, and rollback where relevant; and require tasks to identify focused container validation without repeating already-passing gates absent technical justification. The rules will also reinforce that archival follows successful synchronization.

Duplicating the full global instruction set was rejected because it would make configuration noisy, stale, and harder to reconcile. Leaving the template unchanged was rejected because generated artifacts would receive no project-specific constraints.

### Validate the migration without mutating application state or history

Verification will check tracked paths and file contents, ensure the legacy layout is gone, run OpenSpec health and strict validation commands, and inspect generated instruction context. Skill discovery should be confirmed from a fresh agent session because the current session may retain its startup catalog.

Creating and archiving a disposable change inside project history was rejected: it would add unnecessary artifacts merely to test a documentation workflow. Application builds and test suites were also rejected as disproportionate because application code and dependencies do not change.

## Risks / Trade-offs

- **[Risk] The current agent session continues showing skills from the legacy startup catalog.** → Verify filesystem structure immediately and confirm discovery in a fresh session before considering the migration fully accepted.
- **[Risk] Copying the archive skill unchanged preserves the optional sync bypass.** → Review that skill independently and assert that no archive-without-sync instruction remains.
- **[Risk] Overly broad OpenSpec context leaks transient or machine-specific details into future artifacts.** → Include only stable repository facts, relative paths, and sanitized placeholders.
- **[Risk] Removing `.codex/skills/` before checking the destination loses the working source.** → Copy, compare, validate, and only then remove the legacy files.
- **[Trade-off] This change has no delta spec.** → Mark it explicitly with `skip_specs: true` because it changes developer tooling rather than application requirements.

## Migration Plan

1. Create the five destination skill files under `.agents/skills/` from the current functional sources.
2. Apply the mandatory synchronization policy to the destination archive skill.
3. Compare source and destination workflows, accounting only for the intended archive-policy difference.
4. Replace the OpenSpec configuration template with verified context and artifact rules.
5. Remove the legacy `.codex/skills/` files and empty directories.
6. Run structural checks, OpenSpec health checks, strict validation, and instruction-context inspection.
7. In a fresh session, confirm that all five skills are discovered from `.agents/skills/` and that no duplicate repository-local skills appear.

Rollback consists of restoring the five version-controlled `.codex/skills/` files and the previous `openspec/config.yaml`, then removing the new `.agents/skills/` files. Main specs, archived changes, application files, and dependencies require no rollback because they are not modified.
