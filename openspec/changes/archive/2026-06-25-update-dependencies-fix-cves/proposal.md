## Why

Project dependencies can accumulate security advisories, outdated transitive packages, and compatibility drift over time. This change establishes a container-only maintenance pass to update all feasible packages, remediate known CVEs, and prove the application still builds and runs correctly after the update.

## What Changes

- Audit the Node/Quasar application dependencies from inside the project container context.
- Update direct and transitive packages where compatible with the current application and Node 22 runtime.
- Remediate known CVEs through package upgrades, lockfile refreshes, or documented mitigations when no safe upgrade exists.
- Run validation inside the container, including install, audit, lint, build, and available tests.
- Document any packages that cannot be updated safely and the reason they remain pinned.

## Capabilities

### New Capabilities
- `dependency-maintenance`: Defines the expected dependency update, CVE remediation, and container-only validation workflow for this application.

### Modified Capabilities

## Impact

- Affects `app/package.json`, `app/package-lock.json`, and any dependency-related configuration required by package updates.
- May affect Docker build behavior if package manager or runtime compatibility requires configuration changes.
- May require code adjustments only where dependency upgrades introduce breaking or deprecated APIs.
- All package manager, build, audit, and test commands must run inside the container context, not on the host.
