## Dependency Update Report

## Baseline

GitHub Dependabot reported 12 open npm alerts for `app/package-lock.json`: 168, 166, 164, 163, 162, 161, 160, 159, 158, 157, 156, and 155.

The containerized baseline `npm audit --json` grouped the same vulnerable dependency state into 9 vulnerable packages: `body-parser`, `brace-expansion`, `concurrently`, `fast-uri`, `immutable`, `js-yaml`, `postcss`, `quasar`, and `shell-quote`.

The counts differ because Dependabot tracks individual alert/advisory records, while `npm audit` groups advisories by affected package. Multiple Dependabot alerts were grouped under single audit packages, including `js-yaml`, `fast-uri`, `immutable`, `brace-expansion`, and `body-parser`.

## Updated Packages

- Runtime dependency `quasar` was updated from `^2.20.1` to `^2.23.5`.
- Development dependency `postcss` was updated from `^8.5.15` to `^8.5.25`.
- Development dependency `concurrently` was updated from `^10.0.3` to `^10.0.4`.
- `app/package-lock.json` was refreshed for patched transitive versions of `body-parser`, `brace-expansion`, `fast-uri`, `immutable`, `js-yaml`, and `shell-quote`.
- No new npm overrides were required. The existing overrides remain unchanged.

## Remediated Dependabot Alerts

| Alert | Package | Advisory | Vulnerable range | First patched version | Remediation |
| --- | --- | --- | --- | --- | --- |
| 168 | `postcss` | GHSA-r28c-9q8g-f849 | `<= 8.5.17` | `8.5.18` | Direct update to `postcss@8.5.25`. |
| 166 | `brace-expansion` | GHSA-3jxr-9vmj-r5cp / CVE-2026-13149 | `< 1.1.16` | `1.1.16` | Lockfile refresh to `1.1.18` and `2.1.4`. |
| 164 | `quasar` | GHSA-3r53-75j5-3g7j | `<= 2.21.4` | `2.22.0` | Direct update to `quasar@2.23.5`. |
| 163 | `js-yaml` | GHSA-pm4m-ph32-ghv5 | `>= 5.0.0, <= 5.2.1` | `5.2.2` | Lockfile refresh to `js-yaml@5.2.3`. |
| 162 | `shell-quote` | GHSA-395f-4hp3-45gv / CVE-2026-13311 | `<= 1.8.4` | `1.9.0` | `concurrently@10.0.4` uses `shell-quote@1.9.0`. |
| 161 | `fast-uri` | GHSA-v2hh-gcrm-f6hx / CVE-2026-16221 | `>= 3.0.0, <= 3.1.3` | `3.1.4` | Lockfile refresh to `fast-uri@3.1.5`. |
| 160 | `fast-uri` | GHSA-4c8g-83qw-93j6 / CVE-2026-13676 | `>= 3.0.0, < 3.1.3` | `3.1.3` | Lockfile refresh to `fast-uri@3.1.5`. |
| 159 | `immutable` | GHSA-xvcm-6775-5m9r / CVE-2026-59880 | `>= 5.0.0-beta.1, < 5.1.8` | `5.1.8` | Lockfile refresh to `immutable@5.1.9`. |
| 158 | `immutable` | GHSA-v56q-mh7h-f735 / CVE-2026-59879 | `>= 5.0.0-beta.1, < 5.1.8` | `5.1.8` | Lockfile refresh to `immutable@5.1.9`. |
| 157 | `body-parser` | GHSA-v422-hmwv-36x6 / CVE-2026-12590 | `>= 2.0.0, < 2.3.0` | `2.3.0` | Lockfile refresh to `body-parser@2.3.0` and `1.20.6`. |
| 156 | `js-yaml` | GHSA-g796-fgmg-93mv / CVE-2026-59868 | `>= 5.0.0, <= 5.1.0` | `5.2.0` | Lockfile refresh to `js-yaml@5.2.3`. |
| 155 | `js-yaml` | GHSA-724g-mxrg-4qvm / CVE-2026-59870 | `>= 5.0.0, <= 5.2.0` | `5.2.1` | Lockfile refresh to `js-yaml@5.2.3`. |

## Remaining Exceptions

No local `npm audit` vulnerabilities remain after the dependency updates.

The GitHub Dependabot re-query still listed alerts 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 166, and 168 as open because the remediation is local and has not yet been pushed for GitHub to re-evaluate.

## Validation

All package-manager, audit, lint, build, test, and smoke commands were run inside Docker containers. Final validation used a sanitized temporary application copy that excluded `.env`, `.env.*`, `node_modules`, `dist`, and `.quasar`.

- `docker run --rm -v <sanitized-app-copy>:/app -w /app node:22.22-alpine npm ci`: passes with 0 vulnerabilities.
- `docker run --rm -v <sanitized-app-copy>:/app -w /app node:22.22-alpine npm audit --json`: passes with 0 total vulnerabilities.
- `docker run --rm -v <sanitized-app-copy>:/app -w /app node:22.22-alpine npm run lint`: passes.
- `docker run --rm -v <sanitized-app-copy>:/app -w /app node:22.22-alpine npm run build`: passes; Quasar builds with `quasar@2.23.5`, `@quasar/app-vite@2.6.2`, and `vite@6.4.3`.
- `docker run --rm -v <sanitized-app-copy>:/app -w /app node:22.22-alpine npm test`: passes 21 tests.
- `docker run --rm -v <sanitized-app-copy>:/app -w /app -e CONTENTFUL_SPACE_ID=dummy-space -e CONTENTFUL_DELIVERY_KEY=dummy-key node:22.22-alpine sh -c 'npm start ... wget ... /healthz'`: returns `OK`.

## Secret Handling

No `.env`, `.env.*`, credential, secret, private key, or `app/.npmrc` file contents were inspected during implementation.
