## Why

The previous dependency maintenance pass established a clean baseline, but CVEs and upstream releases change over time. A new container-only audit is needed to reconcile current npm and Dependabot findings, apply safe updates, and keep the Node/Quasar stack supportable.

## What Changes

- Audit current direct, transitive, and development dependencies inside the project container.
- Reconcile `npm audit` results with open GitHub Dependabot alerts.
- Apply compatible package, lockfile, and override updates that remediate actionable CVEs.
- Make narrowly scoped compatibility fixes when an update changes APIs or tooling behavior.
- Validate install, audit, lint, tests, build, and container startup after updates.
- Document deferred upgrades, unresolved advisories, and their mitigations.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dependency-maintenance`: Refreshes the dependency/CVE remediation pass and its required Dependabot reconciliation evidence.

## Impact

- `app/package.json` and `app/package-lock.json`.
- Docker and build configuration only if required for compatibility.
- Small source or test adjustments only when caused by dependency upgrades.
- No new runtime feature, API, or secret/configuration behavior.
