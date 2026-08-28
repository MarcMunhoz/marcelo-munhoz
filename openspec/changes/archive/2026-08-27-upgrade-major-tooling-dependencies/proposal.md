## Why

The project is current on security patches but intentionally remains on older major lines for Quasar tooling, router, linting, and Tailwind. These majors now require a deliberate compatibility pass so the toolchain can stay supported without mixing framework migrations into routine CVE maintenance.

## What Changes

- Upgrade `@quasar/app-vite` from v2 to v3 and align required Quasar tooling.
- Upgrade Vue Router from v4 to v5 and `@quasar/extras` from v1 to v2 where compatible.
- **BREAKING** Convert every Vue single-file component from Options API or hybrid syntax to Composition API with `<script setup>` while preserving behavior.
- Upgrade ESLint and `eslint-plugin-vue` to their v10 major lines and adapt flat configuration if needed.
- **BREAKING** Upgrade Tailwind CSS from v3 to v4, including its PostCSS/configuration integration and browser-support review.
- Refresh direct and transitive lockfile dependencies after each major group.
- Resolve compatibility issues through focused source/configuration changes and document any deferred major.
- Validate the complete container workflow, browser support, lint, tests, and production build.

## Capabilities

### New Capabilities

- `major-dependency-upgrades`: Defines the compatibility and validation contract for coordinated major dependency migrations.

### Modified Capabilities

None.

## Impact

- `app/package.json`, `app/package-lock.json`, Quasar configuration, PostCSS/Tailwind configuration, and ESLint configuration.
- Router imports/configuration, all Vue single-file components, and tests coupled to Options API structure.
- Browser support policy if Tailwind 4's minimum browser baseline is accepted.
- Docker-only install/build/test workflow; no production API contract changes expected.
