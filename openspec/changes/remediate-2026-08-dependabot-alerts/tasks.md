## 1. Baseline and Alert Reconciliation

- [ ] 1.1 Confirm all dependency, audit, install, lint, build, test, and smoke commands will run inside the Docker/container context.
- [ ] 1.2 Confirm no `.env`, `.env.*`, credential, secret, or private key file contents are read during implementation.
- [ ] 1.3 Capture the open Dependabot alert baseline for `app/package-lock.json`, including alert numbers 168, 166, 164, 163, 162, 161, 160, 159, 158, 157, 156, and 155.
- [ ] 1.4 Capture the containerized `npm audit --json` baseline and document why it groups the current state into 9 vulnerable packages while Dependabot reports 12 open alerts.
- [ ] 1.5 Capture containerized outdated-package discovery for direct dependency update candidates.

## 2. Remediation Planning

- [ ] 2.1 Map each open Dependabot alert to the vulnerable package, manifest path, scope, relationship, advisory, current vulnerable range, and first patched version.
- [ ] 2.2 Identify which alerts can be remediated through direct dependency updates.
- [ ] 2.3 Identify which alerts require lockfile refreshes or targeted npm overrides for transitive dependencies.
- [ ] 2.4 Identify any alert that may require a major migration and document the compatibility risk before attempting broad upgrades.
- [ ] 2.5 Prefer compatible patch/minor updates and targeted overrides before using `npm audit fix --force` or broad latest-major upgrades.

## 3. Package and Lockfile Updates

- [ ] 3.1 Update direct runtime dependencies needed to remediate alerts, including `postcss` and `quasar` if compatible.
- [ ] 3.2 Update direct development dependencies needed to remediate alerts, including `concurrently` if compatible.
- [ ] 3.3 Refresh transitive vulnerable packages in `app/package-lock.json` for `body-parser`, `brace-expansion`, `fast-uri`, `immutable`, `js-yaml`, and `shell-quote`.
- [ ] 3.4 Add or adjust npm overrides only where dependency updates do not safely resolve vulnerable transitive packages.
- [ ] 3.5 Keep previously deferred major migrations out of scope unless they are required to resolve an open alert.

## 4. Compatibility Fixes

- [ ] 4.1 Fix any application code or configuration issue introduced by dependency updates.
- [ ] 4.2 Fix any lint, build, or test configuration issue introduced by tooling updates.
- [ ] 4.3 Confirm Netlify Function, local middleware, Vue/Quasar frontend, and Docker workflow behavior remain compatible after dependency changes.

## 5. Validation

- [ ] 5.1 Run clean dependency install or equivalent lockfile consistency validation inside the container.
- [ ] 5.2 Run `npm audit --json` inside the container and confirm no actionable vulnerabilities remain, or document each remaining blocker.
- [ ] 5.3 Re-query open Dependabot alerts if GitHub access is available and confirm all in-scope alerts are fixed or documented.
- [ ] 5.4 Run `npm run lint` inside the container.
- [ ] 5.5 Run `npm run build` inside the container.
- [ ] 5.6 Run `npm test` inside the container.
- [ ] 5.7 Run a containerized runtime smoke check with non-secret dummy values where required configuration is needed.

## 6. Reporting and Review

- [ ] 6.1 Create `dependency-update-report.md` for this change with updated packages, remediated Dependabot alerts, remaining exceptions, and validation results.
- [ ] 6.2 In the report, reconcile the Dependabot alert count with the `npm audit` package count.
- [ ] 6.3 Confirm the report states that no secret file contents were inspected.
- [ ] 6.4 Review the final Git diff to confirm only dependency, lockfile, OpenSpec, and necessary compatibility changes were made.
- [ ] 6.5 Run `openspec validate remediate-2026-08-dependabot-alerts --strict`.
