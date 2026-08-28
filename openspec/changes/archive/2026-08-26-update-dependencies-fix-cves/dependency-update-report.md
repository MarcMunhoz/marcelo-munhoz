## Baseline

- Runtime: Node `v22.22.3`; npm `10.9.8`.
- Initial `npm audit`: 1 high vulnerability, `nanoid <3.3.18`, advisory `GHSA-2v37-7h3g-55p8`.
- Initial Dependabot state: 1 open alert, alert `#170`, package `nanoid`, manifest `app/package-lock.json`, severity high, vulnerable range `<3.3.18`, first patched version `3.3.18`.

## Remediation

- Updated direct development dependency `postcss` from `^8.5.25` to `^8.5.26`.
- Added npm override `nanoid: ^3.3.18` to force the patched transitive version used by PostCSS.
- Refreshed `app/package-lock.json` and ran `npm update` inside the container for compatible patch-level resolutions.
- No application source or configuration compatibility fix was required.

## Validation

- Container `npm audit --json`: 0 total vulnerabilities.
- Container `npm ls postcss nanoid --all`: `postcss@8.5.26` and overridden `nanoid@3.3.18`.
- GitHub Dependabot query after remediation: alert `#170` remains open at query time, despite the local audit being clean. This is an alert-state synchronization delay or pending provider re-scan; no additional vulnerable package is present locally.
- Remaining major upgrades (`@quasar/app-vite` 3.x, `@quasar/extras` 2.x, ESLint 10, Tailwind 4, Vue Router 5) are deferred because they require separate compatibility migrations.
