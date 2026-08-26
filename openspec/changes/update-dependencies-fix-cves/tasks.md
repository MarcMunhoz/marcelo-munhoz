## 1. Baseline And Discovery

- [ ] 1.1 Start or build the existing project container without directly reading secret files.
- [ ] 1.2 Capture current package, lockfile, runtime, npm audit, and outdated-package baselines inside the container.
- [ ] 1.3 Query open GitHub Dependabot alerts with `gh` and reconcile alert-level findings with npm audit output.

## 2. Remediation

- [ ] 2.1 Update compatible direct runtime dependencies and refresh the lockfile inside the container.
- [ ] 2.2 Update compatible development/tooling dependencies without forcing unrelated major migrations.
- [ ] 2.3 Remediate vulnerable transitive packages with lockfile updates or narrowly scoped overrides where appropriate.
- [ ] 2.4 Apply and test only source/configuration changes required by dependency compatibility.
- [ ] 2.5 Document deferred upgrades, unresolved advisories, mitigations, and follow-up paths.

## 3. Validation And Review

- [ ] 3.1 Run a clean container install and confirm manifest/lockfile consistency.
- [ ] 3.2 Run npm audit and verify every finding is remediated or documented.
- [ ] 3.3 Run lint, the complete test suite, and the production build inside the container.
- [ ] 3.4 Start the development/runtime container and verify frontend and backend startup.
- [ ] 3.5 Review the final Git diff and produce a dependency/CVE update report with validation evidence.
