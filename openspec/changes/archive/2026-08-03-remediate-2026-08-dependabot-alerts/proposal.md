## Why

Dependabot reports 12 open npm security alerts for `app/package-lock.json`, including high-severity advisories in runtime and development dependency paths. The prior dependency-maintenance change established the container-only remediation workflow; this change applies that workflow to the current August 2026 alert set.

## What Changes

- Reconcile the 12 open Dependabot alerts with the current containerized `npm audit` result, which groups the same dependency state into 9 vulnerable packages.
- Update compatible direct and transitive npm dependencies in `app/package.json` and `app/package-lock.json` to remediate the current alerts.
- Prefer compatible patch/minor upgrades and targeted overrides before broad major-version migrations.
- Document any alert that cannot be safely remediated, including the advisory, affected package, blocker, mitigation, and follow-up path.
- Run dependency install, audit, lint, build, tests, and runtime smoke validation inside the container context.
- Produce a new dependency update report for this remediation pass.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `dependency-maintenance`: Clarify that each remediation pass must reconcile Dependabot alert counts with containerized audit output and explicitly track open Dependabot alerts through resolution or documented exception.

## Impact

- Affects `app/package.json`, `app/package-lock.json`, and any required npm override entries.
- May require small code or configuration adjustments if dependency updates introduce compatibility changes.
- Uses the existing Docker/container workflow for all package-manager, build, lint, audit, test, and smoke commands.
- Security tracking source is GitHub Dependabot alerts for `MarcMunhoz/marcelo-munhoz`; local validation source is `npm audit` executed inside the project container.
