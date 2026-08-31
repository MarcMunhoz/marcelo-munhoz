## Why

The project has a substantial deterministic Node test suite, but many frontend regressions are checked through source-text assertions rather than rendered behavior, and no active CI workflow prevents an untested `develop` to `main` release. A unified Vitest, Cypress, GitHub Actions, and Netlify assurance platform is needed so every release is accepted only after comprehensive, reproducible validation.

## What Changes

- Replace the final `node --test` workflow with Vitest projects for Node, DOM, Vue/Quasar component, integration, and contract testing after preserving all relevant existing guarantees.
- Enforce 100% global and per-file line, statement, function, and branch coverage for in-scope application code, with only reviewed and documented technical exclusions.
- Replace frontend source-text assertions with rendered behavioral tests wherever the requirement is observable at runtime.
- Add deterministic Cypress E2E coverage in containerized Chrome and Firefox across desktop and mobile viewports, covering every first-class route and critical public, writer, owner, authorization, session, failure, and recovery journey.
- Keep routine browser tests independent of live Contentful, Cloudinary, and Netlify Identity services through fixtures, intercepts, and controlled test doubles.
- Add a mandatory Chrome smoke suite against the Netlify Deploy Preview that proves the preview was built from the current pull-request commit before testing deployed routing, assets, headers, public Functions, and critical page availability.
- Add container-only GitHub Actions validation for pull requests targeting `main`, reject sources other than `develop`, and aggregate every required result through a fail-closed `quality-gate` check.
- Require both the GitHub `quality-gate` and the Netlify Deploy Preview check before a pull request can be accepted into `main`.
- Publish sanitized coverage and Cypress diagnostics without exposing credentials, private URLs, local paths, or environment identifiers.
- **BREAKING** Remove the legacy `node --test` command and obsolete source-inspection tests after Vitest and Cypress reach full parity.

## Capabilities

### New Capabilities

- `automated-test-assurance`: Defines the deterministic Vitest and Cypress test architecture, complete application coverage contract, browser matrix, test isolation, and sanitized evidence requirements.
- `release-quality-gates`: Defines the `develop` to `main` pull-request policy, container-only CI orchestration, fail-closed aggregate check, Deploy Preview commit verification, remote smoke validation, and mandatory merge protections.

### Modified Capabilities

- `blog-admin`: Replaces optional deployed smoke validation with mandatory, read-only Deploy Preview smoke assurance while keeping routine admin coverage deterministic and isolated from live privileged services.
- `netlify-contentful-proxy`: Replaces optional deployed Netlify smoke validation with mandatory Deploy Preview validation of the public Function and routing boundary.

## Impact

- Affected test and application areas: `app/tests/`, Vue/Quasar pages and components, utilities, middleware, Netlify Functions, project scripts, routing, and deploy metadata used to identify the tested commit.
- Affected tooling and dependencies: Vitest, Vue component-test support, coverage provider, Cypress, browser-enabled container images, test reporters, and supporting fixtures or polyfills.
- Affected automation: container definitions or test profiles, GitHub Actions workflows, coverage and diagnostic artifacts, Netlify Deploy Preview coordination, and `main` ruleset or branch-protection checks.
- External services remain isolated from routine test mutations; the remote smoke suite is read-only and operates only against the generated Deploy Preview.
- All package-manager, build, test, and browser execution introduced by this change runs inside containers, and dependency installation requires explicit approval before implementation begins.
