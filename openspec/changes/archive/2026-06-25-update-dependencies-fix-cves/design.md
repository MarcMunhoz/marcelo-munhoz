## Context

The application is a Node/Quasar project under `app/` using `package.json` and `package-lock.json`, with development and production execution defined through Docker assets at the repository root. The mandatory constraint for this change is that package manager, audit, build, and test commands run inside the container context only; the host must not be used for dependency installation or validation.

The current validation surface includes npm install behavior, `npm audit`, `npm run lint`, `npm run build`, and `npm test`. The test script currently exits successfully after reporting that no tests are specified, so build and lint are the strongest available automated checks unless the implementation adds or discovers additional tests.

## Goals / Non-Goals

**Goals:**
- Identify outdated direct and transitive npm dependencies from inside the container.
- Update every package that can be updated without breaking application behavior or the supported Node 22 runtime.
- Remediate known CVEs through safe dependency upgrades, lockfile refreshes, overrides, or documented mitigations.
- Keep `app/package.json` and `app/package-lock.json` consistent after dependency changes.
- Validate the updated application inside the container with install, audit, lint, build, and available tests.
- Record any dependency that remains outdated or vulnerable, including the reason and follow-up path.

**Non-Goals:**
- Rewrite the application architecture or replace Quasar/Vue as part of the dependency update.
- Add broad new feature behavior unrelated to dependency maintenance.
- Run package manager, audit, build, or test commands directly on the host.
- Read `.env` files or other secret material while testing the application.

## Decisions

- Use the container as the command boundary for all dependency work. This preserves parity with the existing Docker workflow and satisfies the explicit safety constraint. Alternative considered: running npm locally for speed; rejected because it violates the requested execution context and can produce host-specific artifacts.
- Prefer lockfile-preserving upgrades before broad major-version jumps. This reduces regression risk while still allowing CVE remediation. Alternative considered: update every package to the latest major immediately; rejected because it can introduce avoidable breaking changes across Quasar, Vue, Vite, and ESLint at the same time.
- Treat CVE remediation as complete only when `npm audit` inside the container reports no actionable production or development vulnerabilities, or when remaining findings have documented constraints and mitigations. Alternative considered: accepting `npm audit fix --force` output blindly; rejected because forced updates can bypass compatibility review.
- Validate through the existing project scripts first, then add targeted checks only if dependency changes require them. This keeps the change aligned with current project conventions while still allowing necessary compatibility fixes.

## Risks / Trade-offs

- Major dependency updates may introduce breaking API or tooling changes -> Update in small groups where possible and run lint/build/test after meaningful upgrade batches.
- Some CVEs may only be fixable through disruptive major upgrades or upstream releases -> Document the affected package, advisory, reason for deferral, and mitigation.
- Container builds can be slower than host execution -> Accept the extra runtime to preserve environment parity and comply with the project rule.
- Existing automated tests are limited -> Use build, lint, audit, and manual runtime smoke checks as the acceptance baseline unless additional tests are available.

## Migration Plan

1. Build or start the existing development container context without reading secret files directly.
2. Run dependency discovery commands inside the container to identify outdated packages and audit findings.
3. Apply compatible updates to `app/package.json` and refresh `app/package-lock.json` inside the container.
4. Fix any code, lint, or build incompatibilities introduced by upgraded packages.
5. Re-run install, audit, lint, build, and available tests inside the container until the acceptance criteria pass or any remaining CVE is explicitly documented.
6. Use Git diff review to confirm only dependency, lockfile, and necessary compatibility changes were made.

Rollback is the standard Git rollback of the dependency and compatibility changes. Because the update is limited to repository files, reverting the implementation commit restores the previous package set.

## Open Questions

- Whether any manual browser smoke test is required beyond automated build and script validation.
- Whether development-only CVEs can be accepted temporarily if no compatible fix exists.
