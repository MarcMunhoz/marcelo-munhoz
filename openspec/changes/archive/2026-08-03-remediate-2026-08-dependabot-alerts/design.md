## Context

The application already has a `dependency-maintenance` capability that requires dependency work to run inside the container context, avoid direct secret-file reads, remediate safe CVE fixes, and document exceptions. The previous dependency-maintenance change was archived on 2026-06-25 and should be reused as the process precedent.

GitHub Dependabot currently reports 12 open npm security alerts for `app/package-lock.json`. A fresh containerized `npm audit --json` groups the local dependency state into 9 vulnerable packages: `body-parser`, `brace-expansion`, `concurrently`, `fast-uri`, `immutable`, `js-yaml`, `postcss`, `quasar`, and `shell-quote`.

## Goals / Non-Goals

**Goals:**

- Remediate all safe fixes for the 12 open Dependabot alerts.
- Keep all npm, audit, lint, build, test, and smoke commands inside the container context.
- Prefer compatible direct upgrades, lockfile refreshes, and targeted overrides over broad framework migrations.
- Reconcile Dependabot alert count with `npm audit` package grouping in the implementation report.
- Preserve the current Vue/Quasar/Netlify application behavior.

**Non-Goals:**

- Do not perform broad major migrations unless required to remediate an alert safely.
- Do not migrate framework architecture, routing, styling, deployment, or Contentful behavior.
- Do not read `.env`, `.env.*`, private keys, or credential files directly.
- Do not treat auto-dismissed, fixed, or historical Dependabot alerts as in-scope unless they reappear as open alerts.

## Decisions

### Use Dependabot open alerts as the tracking source

The implementation should treat the GitHub Dependabot open-alert list as the source of security-tracking truth because it is what blocks repository security status. `npm audit` remains the local validation tool, but its package grouping does not match Dependabot's alert count one-to-one.

Alternatives considered:

- Use only `npm audit`: simpler locally, but it would obscure the 12 open GitHub alerts and under-describe the work.
- Use only Dependabot: aligns with GitHub status, but misses a reproducible local validation command.

### Apply the existing container-only maintenance workflow

All package-manager, audit, lint, build, test, and smoke validation commands should run inside the project container. This preserves the repository rule and avoids host-environment drift.

Alternatives considered:

- Run npm directly on the host: faster, but violates the established workflow and can produce host-specific lockfile or native-package behavior.
- Use GitHub-only validation: useful as a final signal, but too slow and indirect for local remediation.

### Prefer compatible updates and targeted overrides first

The remediation should start with safe semver-compatible updates and lockfile refreshes. If transitive vulnerable packages remain, targeted `overrides` can be used when they are compatible with the dependent package graph. Broad major migrations should be deferred unless required to resolve an alert with no compatible path.

Alternatives considered:

- Run `npm audit fix --force`: may perform major or breaking upgrades without enough control.
- Upgrade every outdated package to latest major: increases blast radius beyond CVE remediation.

## Risks / Trade-offs

- A transitive fix may require an override that is incompatible with a parent package -> Validate install, lint, build, tests, and runtime smoke inside the container before completion.
- Direct upgrades to Quasar, PostCSS, Express, or tooling may alter build behavior -> Keep changes scoped and use the existing application validation commands.
- Dependabot may report different counts than `npm audit` -> Document both counts and track each open Dependabot alert number explicitly.
- Some deferred major updates from the previous maintenance pass may still be risky -> Re-evaluate them only if they block CVE remediation.

## Migration Plan

1. Capture the active Dependabot open-alert list and the containerized `npm audit --json` baseline.
2. Identify direct dependency updates that remediate alerts with the least blast radius.
3. Refresh the lockfile inside the container and apply targeted overrides only where needed.
4. Run install/audit/lint/build/test validation inside the container.
5. Run a containerized runtime smoke check using non-secret dummy values where configuration is required.
6. Produce `dependency-update-report.md` listing remediated alerts, remaining exceptions, validation commands, and no-secret-file confirmation.

Rollback strategy:

- Revert the dependency and lockfile changes if validation or production smoke reveals a regression.
- Preserve the report details so any reverted alert can be reopened with a documented blocker and follow-up path.

## Open Questions

- Whether any of the 12 open alerts requires a major dependency migration will be determined during implementation after attempting compatible updates first.
