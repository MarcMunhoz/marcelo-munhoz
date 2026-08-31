## Context

See `proposal.md` for motivation. The application is a Vue 3 and Quasar SPA with Express middleware and equivalent Netlify Function wrappers under `app/`. Its 337 legacy tests use `node --test`; domain, adapter, authorization, and session tests execute meaningful behavior, while a large frontend subset reads Vue and configuration source text. There is no active GitHub Actions workflow, coverage is not measured, and Netlify independently builds production from `main`, a branch deploy from `staging`, and Deploy Previews for eligible pull requests.

Project policy requires package-manager, build, test, and browser commands to run only in containers. Tests must not read local environment files or publish credentials, private URLs, local paths, or environment identifiers. GitHub release metadata is managed through `gh`, branches follow `issue_<number>`, and production promotion is `develop` to `main`.

## Goals / Non-Goals

**Goals:**

- Give pure Node logic, browser-dependent logic, Vue/Quasar rendering, static contracts, and full browser journeys explicit test boundaries.
- Make 100 percent coverage in all four metrics an enforceable global and per-file property rather than an aspirational report.
- Keep local and CI execution reproducible through pinned containers with no host browser requirement.
- Validate two browser engines deterministically and validate the exact Netlify preview artifact separately.
- Produce one stable, fail-closed GitHub quality check suitable for `main` protection.
- Preserve all meaningful legacy regression guarantees during an incremental internal migration that finishes atomically.

**Non-Goals:**

- Exercise privileged mutations against live Contentful, Cloudinary, or Netlify Identity environments.
- Add Cypress Cloud or require a paid test-reporting service.
- Support Safari or WebKit through Cypress.
- Replace Netlify deployment with GitHub Actions.
- Change the product UI or domain behavior except for narrow testability seams and sanitized build identity needed by preview verification.
- Merge or publish the branch automatically.

## Decisions

### 1. Use Vitest projects to separate execution environments

Vitest will replace the final legacy runner and define distinct logical projects:

- `unit-node` for pure utilities, middleware, Function cores, service facades, scripts, and parsed configuration contracts.
- `unit-dom` for modules using storage, timers, history, media queries, cookies, broadcast channels, or other browser APIs.
- `component` for mounted Vue SFCs with Quasar and router test factories.

A shared test setup will provide only the browser polyfills required by a project. Provider clients, fetch, clocks, storage, router state, and browser globals will be injected or reset per test. Keeping Node and DOM environments separate avoids hiding server-only incompatibilities behind an overly permissive simulated browser.

Alternative considered: one DOM environment for all tests. Rejected because it weakens Node boundary fidelity, increases global state leakage, and obscures which runtime a module actually requires.

### 2. Replace source inspection with behavior while retaining true contract tests

Frontend tests that currently assert Vue source strings will be decomposed: pure helpers move to unit tests, observable UI moves to mounted component or E2E tests, and only genuinely declarative guarantees remain contract tests. Netlify headers and redirects, route metadata, credential allowlists, and build configuration will be parsed or evaluated rather than treated as rendered UI behavior.

Alternative considered: mechanically translate every `node:test` assertion to Vitest. Rejected because it would change runners without correcting the central assurance gap.

### 3. Enforce coverage globally and per file

The V8 coverage provider will include first-party JavaScript and Vue code under `src`, middleware, Netlify Functions, and project scripts. Generated output, dependencies, fixtures, and test infrastructure will be excluded by boundary rather than ad hoc ignore comments. Thresholds for lines, statements, functions, and branches will all be 100 percent globally and per file.

Any genuinely unreachable generated or platform wrapper path must enter a small configuration allowlist with a written rationale and the narrowest possible scope. Coverage reports will be produced as console output, HTML, LCOV, and machine-readable data. Codecov may visualize results, but the containerized Vitest command is the authoritative gate.

Alternative considered: establish a lower baseline and ratchet upward. Rejected because the approved objective is to settle application coverage in this change rather than leave a partial migration.

### 4. Use Cypress for deterministic cross-engine journeys

One shared Cypress scenario set will run in pinned browser-enabled containers for Chrome/Blink and Firefox/Gecko. Both runs cover desktop and mobile viewport classes. Tests will use stable accessible roles, labels, and visible text by default; dedicated test selectors will be added only where semantic selection is ambiguous or unstable.

Public and administrative API traffic will be controlled with fixtures and intercepts. The existing development preview-role boundary can represent writer and owner UI flows without live Identity. Server authorization and provider mutations remain covered by Vitest integration tests with injected clients, so Cypress does not need privileged credentials.

Alternative considered: require locally installed browsers. Rejected because it breaks container reproducibility and burdens contributors. Electron is omitted because Chrome already supplies Chromium coverage; WebKit is outside Cypress support.

### 5. Separate deterministic E2E from deployed smoke assurance

The complete Cypress matrix runs against frontend and backend services started on an isolated container network. It proves application behavior without Netlify timing or mutable provider data.

A smaller Chrome-only remote suite waits for the pull request Deploy Preview, verifies a sanitized build marker against the expected pull-request head commit, and then checks deployed public pages, SPA routing, redirects, assets, security headers, public Function availability, responsive smoke behavior, signed-out admin safety, and critical browser errors. It never authenticates or mutates privileged data.

The build marker will disclose only the minimum public commit identity needed to reject a stale preview. Preview discovery configuration will be supplied through repository or CI configuration and sanitized from published artifacts. The wait is bounded and fails rather than falling back to a stale preview.

Alternative considered: run the full suite against live provider integrations. Rejected because credentials, mutable data, cleanup, provider availability, and rate limits would make release acceptance unsafe and nondeterministic.

### 6. Orchestrate one fail-closed release workflow

The workflow listens to pull requests targeting `main` without filtering the head branch at trigger level. A source-policy job explicitly fails unless the head is `develop`, preventing a skipped job from being accepted. Independent validation jobs cover lint/build/credential scanning, Vitest coverage, Chrome E2E, Firefox E2E, and remote smoke.

All project commands execute in containers; the GitHub runner only checks out source, builds or pulls pinned images, orchestrates services, and uploads sanitized artifacts. Concurrency is grouped by pull request so newer commits cancel obsolete work.

The final `quality-gate` uses an unconditional dependency evaluation and succeeds only when every required current-run result is successful. This stable job and the Netlify Deploy Preview check become the required `main` checks. The Netlify check proves deployment completion; remote smoke inside `quality-gate` proves deployed behavior.

Alternative considered: mark every intermediate job as an independent required check. Rejected because renaming or splitting jobs would make repository protection brittle and because an explicit aggregator can report missing, cancelled, or unexpectedly skipped dependencies consistently.

### 7. Migrate incrementally inside one atomic change

Meaningful legacy tests will first run in Vitest with parity mapping. Hybrid source-inspection suites will then be split into unit, component, contract, and E2E ownership. Coverage gaps and the route/journey matrix will be closed before the legacy command is removed. During implementation, both runners may coexist for comparison; the completed change exposes only the new platform.

The implementation will use separate detailed commits for platform scaffolding, legacy migration, component behavior, coverage closure, Cypress journeys, remote smoke, and CI/protection documentation. No commit, push, or merge is automatic.

## Risks / Trade-offs

- [100 percent branch coverage encourages artificial tests or exclusions] → Require per-file thresholds, behavior-oriented assertions, mutation-sensitive review, and a documented narrow allowlist instead of broad ignore directives.
- [Quasar components need complex global setup] → Centralize a minimal mount factory and reset plugins, router state, teleports, dialogs, and global mocks between tests.
- [Timers and browser globals make session tests flaky] → Use fake timers, injected clocks, deterministic storage and broadcast doubles, and explicit cleanup.
- [Two browser engines increase CI duration] → Reuse the same built artifact and fixtures, run Chrome and Firefox in parallel, cache only safe immutable layers, and cancel superseded runs.
- [Deploy Preview may be stale while Netlify rebuilds] → Require the preview build marker to match the expected pull-request commit before smoke begins.
- [Netlify or GitHub has a transient outage] → Use bounded readiness retries and preserve diagnostics; remain fail-closed because a production candidate without deployed evidence must not be accepted.
- [Remote responses contain sensitive diagnostics] → Assert only sanitized public behavior and scrub URLs, headers, payload fragments, screenshots, videos, and logs before publication.
- [Container and browser image drift changes results] → Pin runtime and browser image versions and update them through reviewed dependency maintenance.
- [Required checks cannot be selected before their first run] → Land the workflow, run it on the release PR, and then configure the `main` ruleset with the observed stable check sources before declaring rollout complete.

## Migration Plan

1. Obtain explicit approval before installing or changing dependencies, then add pinned Vitest, Vue/Quasar test support, coverage, Cypress, and reporter dependencies inside the container workflow.
2. Add container test profiles and baseline Vitest projects without removing the legacy runner.
3. Migrate executable unit, middleware, Function, authorization, and session tests with a parity inventory.
4. Replace source-text frontend assertions with mounted component behavior and retain only legitimate parsed contract checks.
5. Close coverage gaps until every included file and metric reaches 100 percent; review and document any technical allowlist entry.
6. Add deterministic fixtures and the complete Cypress journey matrix, then pass it in containerized Chrome and Firefox at desktop and mobile viewports.
7. Add sanitized build identity and the Chrome-only Deploy Preview smoke suite with bounded stale-preview detection.
8. Add the pull-request workflow, fail-closed aggregate check, artifacts, concurrency, and contributor documentation.
9. Remove the legacy runner and redundant tests only after parity, coverage, browser, build, lint, and security validation all pass.
10. Run the workflow on the `develop` to `main` release PR, configure `quality-gate` and the Netlify Deploy Preview check as required `main` protections through `gh`, and read back the ruleset.

Rollback is performed by reverting the workflow and test-platform commits while restoring the last passing legacy test script. Repository protection changes must be reverted separately through `gh` only if the new checks cannot report; Netlify production and branch deploy configuration remains unchanged throughout.
