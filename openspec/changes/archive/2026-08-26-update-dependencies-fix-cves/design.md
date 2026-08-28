## Context

The repository already has a container-only dependency maintenance workflow and a prior CVE remediation report. This pass must start from the current manifests and current provider advisories rather than assume the previous package set remains complete. Package operations, audit, tests, and builds are restricted to the project container.

## Goals / Non-Goals

**Goals:**

- Establish a reproducible baseline for the current dependency tree.
- Reconcile npm audit findings with GitHub Dependabot alerts.
- Apply compatible direct, transitive, and override updates with evidence.
- Preserve the Node 22, Quasar, Vue, and Netlify build/runtime contract.

**Non-Goals:**

- Broad framework migrations without a separate compatibility plan.
- New application features or architectural refactoring.
- Reading secret files or running package-manager commands on the host.

## Decisions

- **Audit before changing manifests.** Capture current versions, audit findings, and Dependabot state first so every update has a before/after reason. Blindly running forced upgrades is rejected.
- **Prefer the smallest compatible remediation.** Update direct dependencies when safe, then use lockfile refreshes or narrowly scoped npm overrides for transitive CVEs. Major framework/tooling migrations are deferred unless required for a vulnerability.
- **Use the container as the only execution boundary.** The existing Docker workflow remains authoritative; host-side npm installs are not used.
- **Record exceptions explicitly.** A package that remains outdated or vulnerable must include its advisory, blocker, mitigation, and follow-up path in the change report.
- **Validate incrementally and at the end.** Run install/audit after dependency changes, then lint, tests, build, and runtime smoke checks before declaring completion.

## Risks / Trade-offs

- **[A major update breaks Quasar/Vue integration]** → Keep major updates separate, inspect peer constraints, and revert or defer when compatibility is not proven.
- **[npm audit and Dependabot group findings differently]** → Record both alert-level and package-level counts and map each alert to its remediation evidence.
- **[Container cache hides an inconsistent lockfile]** → Run a clean install path in the container and review the lockfile diff.
- **[A remaining CVE has no safe fix]** → Document the exact advisory and mitigation rather than forcing an unsafe upgrade.

## Migration Plan

1. Start/build the existing container context without directly reading secret files.
2. Capture manifest, outdated-package, npm-audit, and Dependabot baselines inside the container/GitHub CLI.
3. Apply compatible updates in small groups and refresh the lockfile inside the container.
4. Fix only dependency-induced source, configuration, or test incompatibilities.
5. Run clean install, audit, lint, tests, build, and startup smoke checks.
6. Review the diff and document every update, remediation, and exception.

Rollback is a Git revert of dependency, lockfile, and compatibility changes.

## Open Questions

- Which current Dependabot alerts remain open at execution time, and do they match npm audit findings?
- Are any available major updates worth separating into a dedicated migration change?
