# Containerized Testing

The canonical `compose.yaml` keeps project commands in pinned containers. Every validation command passes `--env-file /dev/null`; the build context also excludes local environment files. Do not install project packages or browsers on the host.

## Vitest

Run the complete Node, DOM, component, integration, and contract suite:

```bash
docker compose --env-file /dev/null --profile test run --build --rm test
```

Run one project or the coverage gate:

```bash
docker compose --env-file /dev/null --profile test run --build --rm test npm run test:vitest -- --run --project unit-node
docker compose --env-file /dev/null --profile test run --build --rm test npm run test:vitest -- --run --project unit-dom
docker compose --env-file /dev/null --profile test run --build --rm test npm run test:vitest -- --run --project component
docker compose --env-file /dev/null --profile test run --build --rm test npm run test:vitest:coverage
```

The global V8 baseline is 83% branches, 86% functions, 92% lines, and 91% statements. Reports are generated as console text, HTML, LCOV, JSON, and JSON summary. Treat uncovered code as a risk-review prompt; add tests for meaningful behavior, not solely to increase a metric.

## Lint, build, and credential scanning

```bash
docker compose --env-file /dev/null --profile test run --build --rm test npm run lint
docker compose --env-file /dev/null --profile test run --build --rm test npm run build
docker compose --env-file /dev/null --profile test run --build --rm test sh -ec "npm run build && npm run scan:build-credentials"
```

## Cypress browser matrix

Chrome and Firefox execute the same critical journeys at desktop and mobile viewports. Compose starts the isolated frontend and backend dependencies for each browser profile.

```bash
docker compose --env-file /dev/null --profile chrome run --build --rm \
  -v ./app/artifacts:/app/artifacts cypress-chrome
docker compose --env-file /dev/null down --remove-orphans

docker compose --env-file /dev/null --profile firefox run --build --rm \
  -v ./app/artifacts:/app/artifacts cypress-firefox
docker compose --env-file /dev/null down --remove-orphans
```

Routine E2E uses fixtures, intercepts, and controlled local authorization. It does not contact mutable Contentful, Cloudinary, or Netlify Identity workflows.

## Deploy Preview smoke

The release workflow runs a Chrome-only, read-only smoke against the current pull request's Netlify Deploy Preview:

```bash
docker compose --env-file /dev/null --profile remote-smoke run --build --rm \
  -v ./app/artifacts:/app/artifacts \
  -e DEPLOY_PREVIEW_URL -e EXPECTED_COMMIT_SHA cypress-remote
```

Supply only the HTTPS preview URL and expected pull-request commit through the command environment. The bounded readiness check rejects unavailable or stale previews before Cypress starts. The suite covers desktop and mobile layouts, public routes and Functions, SPA redirects, assets, headers, critical console failures, and signed-out admin safety. Known external telemetry is answered locally; all other mutating browser requests are blocked.

Never point remote smoke at production, authenticate an administrator, or supply provider credentials.

## Sanitized evidence

Only sanitized directories are publishable:

- `app/artifacts/coverage-sanitized` — coverage evidence retained in CI for 14 days.
- `app/artifacts/cypress-sanitized` — Chrome or Firefox diagnostics retained for 7 days.
- `app/artifacts/remote-smoke/sanitized` — deployed smoke diagnostics retained for 7 days.

Raw coverage and browser output may contain environment-specific details. Do not upload, quote, or attach raw artifact directories. CI sanitizes URLs, paths, environment metadata, request diagnostics, logs, and text reports and omits binary remote-smoke evidence.

## Release gate

The `Release quality` workflow runs only for pull requests targeting `main`. `source-policy` explicitly rejects any head other than `develop`. For an approved source it runs lint, build, credential scan, Vitest coverage, Chrome E2E, Firefox E2E, and remote smoke independently. The final `quality-gate` runs unconditionally and fails unless every required current-run result succeeded.

The Netlify Deploy Preview check and `quality-gate` are the stable machine controls. Human review and release/version requirements remain separate controls, and no workflow merges the pull request.

## Troubleshooting

### Coverage falls below the baseline

Open the file-level HTML or LCOV report, identify the behavior or security boundary at risk, and add the narrowest meaningful test. Do not manufacture assertions for incidental branches or add unreviewed ignore directives.

### A Cypress profile fails or cannot start

Clean the isolated services and rerun only the affected browser:

```bash
docker compose --env-file /dev/null down --remove-orphans
```

Use the mounted sanitized directory for diagnosis. Confirm that no host browser or package installation is being used.

### Remote smoke reports a stale preview or times out

Confirm the Deploy Preview belongs to the same pull request and exposes the expected commit marker. Wait for or rebuild that preview. Do not accept a different commit, another preview, or production as fallback.

### Artifact ownership or publication fails

Use the documented `./app/artifacts:/app/artifacts` bind mount. Publish only the sanitized output directories and keep the workflow's missing-file behavior fail-closed.

### Finding CI evidence

In the pull request, inspect the exact checks `source-policy`, `lint`, `build`, `credential-scan`, `coverage`, `e2e-chrome`, `e2e-firefox`, `remote-smoke`, and `quality-gate`. Coverage and browser artifacts are attached to the corresponding workflow run under their sanitized names.
