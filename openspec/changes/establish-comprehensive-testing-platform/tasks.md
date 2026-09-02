## 1. Baseline And Approved Dependency Setup

- [x] 1.1 Record the 20 legacy test files, 337 existing cases, source-inspection assertions, route matrix, endpoint matrix, and current container validation results as the migration baseline
- [x] 1.2 Map every meaningful legacy guarantee to its target Vitest unit, DOM, component, integration, contract, or Cypress suite before removing any test
- [x] 1.3 Obtain explicit user approval before installing or changing Vitest, Vue/Quasar test, coverage, Cypress, browser, polyfill, or reporter dependencies
- [x] 1.4 Select mutually compatible pinned dependency and container-image versions for Node, Vitest, Vue 3, Quasar, Chrome, and Firefox
- [x] 1.5 Install the approved dependencies and update the lockfile only through the container workflow

## 2. Containerized Test Infrastructure

- [x] 2.1 Add an isolated test container profile for deterministic Node, DOM, component, and contract execution
- [x] 2.2 Add browser-enabled Cypress container profiles with pinned Chrome and Firefox versions and no host-browser dependency
- [x] 2.3 Add container-networked frontend and backend services that start without reading local `.env` or credential files
- [x] 2.4 Add documented container commands for the complete suite and each focused project or browser run
- [x] 2.5 Verify clean container startup, shutdown, exit-code propagation, and generated-artifact ownership

## 3. Vitest Architecture And Shared Harnesses

- [x] 3.1 Configure separate `unit-node`, `unit-dom`, and `component` Vitest projects with explicit include and environment boundaries
- [x] 3.2 Configure V8 coverage for first-party Vue, utility, middleware, Function, and script code with 100 percent global and per-file thresholds for all four metrics
- [x] 3.3 Configure console, HTML, LCOV, and machine-readable coverage reports while excluding only generated output, dependencies, fixtures, and test infrastructure
- [x] 3.4 Add a reviewed technical coverage-exclusion allowlist format and automated validation that rejects undocumented broad ignore directives
- [x] 3.5 Add minimal deterministic browser polyfills and cleanup for fetch, storage, cookies, history, media queries, observers, broadcast channels, dialogs, file APIs, and timers
- [x] 3.6 Add shared Vue/Quasar mount, router, fixture, provider-client, clock, and browser-state factories with per-test isolation

## 4. Legacy Behavioral And Contract Migration

- [x] 4.1 Migrate pure utility suites for API bases, archives, dates, authors, media, tags, routing helpers, and responsive logic to Vitest
- [x] 4.2 Migrate authentication and administrative session lifecycle suites with fake clocks, controlled storage, cross-tab events, and callback cleanup
- [x] 4.3 Migrate public proxy middleware and Netlify Function core tests for success, normalization, bounds, missing configuration, upstream failure, and sanitized errors
- [x] 4.4 Migrate administrative facade and handler tests for authentication, authorization, ownership, workflow state, version conflicts, tags, profiles, and media operations
- [x] 4.5 Migrate CORS, credential scanning, route metadata, redirects, security headers, and other declarative guarantees into parsed or executable contract tests
- [x] 4.6 Produce a parity report showing the new owner of every retained legacy guarantee and identifying obsolete implementation-detail assertions

## 5. Rendered Vue And Quasar Behavior

- [x] 5.1 Replace source inspection for the application shell and main layout with rendered navigation, access entry, account menu, cookie, metadata, focus, and responsive tests
- [x] 5.2 Add rendered Home, About, and not-found page tests for content, interactions, external-link safety, and responsive presentation
- [ ] 5.3 Add rendered Blog archive tests for highlights, filters, pagination, URL state, loading, empty, failure, retry, and responsive controls
- [ ] 5.4 Add rendered article and author tests for locale, Markdown boundary, tags, images, archive return state, chronological neighbors, pagination, and fallbacks
- [ ] 5.5 Add rendered admin dashboard tests for signed-out, writer, owner, filters, queues, actions, loading, empty, error, and responsive states
- [ ] 5.6 Add rendered article editor tests for create and edit modes, validation, ownership, locale, slug, Markdown, tags, images, unsaved changes, and terminal actions
- [ ] 5.7 Add rendered author profile and tag management tests for validation, photo fallbacks, creation, usage constraints, deletion confirmation, and role enforcement
- [ ] 5.8 Remove redundant composition and source-text assertions only after their observable or contract guarantees pass in the replacement suites

## 6. Complete Coverage Closure

- [ ] 6.1 Run the full Vitest coverage suite in containers and classify every uncovered location as missing behavior, missing error handling, or a potential technical exclusion
- [ ] 6.2 Add behavior-oriented tests for every uncovered line, statement, function, and branch in included frontend code
- [ ] 6.3 Add behavior-oriented tests for every uncovered line, statement, function, and branch in included middleware, Function, and script code
- [ ] 6.4 Refactor only narrowly coupled or unreachable code needed to expose deterministic test seams without changing product behavior
- [ ] 6.5 Review every proposed coverage allowlist entry, reduce it to the smallest scope, and document why execution cannot provide meaningful assurance
- [ ] 6.6 Confirm 100 percent global and per-file coverage for lines, statements, functions, and branches from a clean container run

## 7. Deterministic Cypress Journey Matrix

- [ ] 7.1 Configure Cypress fixtures, commands, accessible selector conventions, API intercepts, failure artifact limits, and state reset between scenarios
- [ ] 7.2 Cover the public shell, Home, About, not-found, desktop navigation, mobile navigation, and cookie behavior
- [ ] 7.3 Cover Blog default, search, year, tag, pagination, invalid URL state, empty, failure, retry, browser history, and responsive flows
- [ ] 7.4 Cover article direct entry, archive return, previous and next boundaries, author navigation, locale, tags, images, and malformed-response recovery
- [ ] 7.5 Cover signed-out administrative entry and safe redirect behavior without opening or depending on live Netlify Identity
- [ ] 7.6 Cover writer dashboard, draft creation and editing, validation, save, review submission, unpublication request, thumbnail workflows, and unsaved-change guards
- [ ] 7.7 Cover owner dashboard, review queues, publish, unpublish, archive, unarchive, permanent delete, profile, and tag management flows
- [ ] 7.8 Cover session warning, continuation, expiration, sign-out, and applicable cross-tab behavior with deterministic time control
- [ ] 7.9 Run the complete shared journey suite in pinned Chrome and Firefox containers at desktop and mobile viewport classes

## 8. Deploy Preview Identity And Remote Smoke

- [ ] 8.1 Add a minimal sanitized build identity artifact that allows the tested Deploy Preview commit to be compared with the pull-request head commit
- [ ] 8.2 Add bounded preview readiness and commit-matching logic that fails on timeout or stale content instead of falling back
- [ ] 8.3 Add a Chrome-only remote smoke configuration that cannot invoke privileged mutations or require administrative credentials
- [ ] 8.4 Cover deployed Home, About, Blog, not-found, SPA routing, redirects, assets, public Functions, health behavior, and critical browser errors
- [ ] 8.5 Cover deployed security headers, administrative indexing policy, signed-out admin safety, and representative desktop and mobile layouts
- [ ] 8.6 Sanitize remote smoke logs, screenshots, videos, request diagnostics, URLs, paths, and environment metadata before artifact publication

## 9. Pull Request CI And Fail-Closed Gate

- [ ] 9.1 Add a GitHub Actions workflow for pull requests targeting `main` with an explicit failing source-policy check for heads other than `develop`
- [ ] 9.2 Add safe concurrency so a newer pull-request commit cancels obsolete work without allowing the current required checks to disappear
- [ ] 9.3 Add independent container-orchestrated jobs for lint, build, credential scanning, Vitest coverage, Chrome E2E, Firefox E2E, and remote smoke
- [ ] 9.4 Upload bounded sanitized coverage and Cypress diagnostics with clear retention and failure behavior
- [ ] 9.5 Add an unconditional `quality-gate` job that inspects every dependency result and fails for failure, timeout, cancellation, or unexpected skip
- [ ] 9.6 Verify the workflow never installs or runs project packages or browsers directly on the GitHub runner host
- [ ] 9.7 Verify a non-`develop` pull request to `main` fails explicitly and a `develop` to `main` pull request exercises every required job

## 10. Final Migration, Documentation, And Repository Protection

- [ ] 10.1 Remove `node --test`, legacy runner imports, and superseded source-inspection tests after parity and complete new-suite validation pass
- [ ] 10.2 Update project documentation and badges with container-only Vitest, coverage, Cypress, browser matrix, remote smoke, diagnostics, and troubleshooting commands
- [ ] 10.3 Run clean container validation for lint, build, credential scanning, 100 percent Vitest coverage, Chrome E2E, Firefox E2E, and local runtime startup
- [ ] 10.4 Validate the current Deploy Preview commit and remote Chrome smoke without exposing or mutating privileged data
- [ ] 10.5 Run strict OpenSpec validation and reconcile implementation evidence against every requirement and task
- [ ] 10.6 Use `gh` to configure `quality-gate` and the Netlify Deploy Preview check as required `main` protections after both checks have reported successfully
- [ ] 10.7 Read back the active GitHub ruleset or branch protection through `gh` and verify an unsuccessful or missing required check blocks acceptance
- [ ] 10.8 Synchronize all change delta specs into the main specs before archiving the completed change
