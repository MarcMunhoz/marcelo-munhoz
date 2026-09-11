# Containerized Development and Test Commands

The canonical `compose.yaml` defines development, test, and browser services behind separate profiles. Shared YAML fragments keep the test runtimes consistent without duplicating service configuration.

The Compose definition has no `env_file` declaration. Validation commands also pass `--env-file /dev/null`, and the Docker build context excludes `.env` and `.env.*` files.

## Local development

Start the application through the development profile:

```bash
docker compose --profile dev up app
```

The mounted application runtime loads its local development configuration directly. Compose itself does not load or inject an environment file.

## Current baseline validation

Run the retained legacy Node suite in the isolated test image:

```bash
docker compose --env-file /dev/null --profile test run --rm test
```

## Focused Vitest projects

The commands below are the stable container entry points. Their project configuration is added in Group 3.

```bash
docker compose --env-file /dev/null --profile test run --rm test npm exec -- vitest run --project unit-node
docker compose --env-file /dev/null --profile test run --rm test npm exec -- vitest run --project unit-dom
docker compose --env-file /dev/null --profile test run --rm test npm exec -- vitest run --project component
docker compose --env-file /dev/null --profile test run --rm test npm exec -- vitest run --coverage
```

## Browser profiles

Start the isolated frontend and backend services, then run one pinned browser profile. Cypress suites are introduced in Group 7.

```bash
docker compose --env-file /dev/null --profile e2e up -d test-frontend test-backend
docker compose --env-file /dev/null --profile chrome run --rm cypress-chrome
docker compose --env-file /dev/null --profile firefox run --rm cypress-firefox
docker compose --env-file /dev/null --profile e2e down --remove-orphans
```

The test and browser images run as non-root users. Test artifacts created by later Vitest and Cypress configuration remain inside the container unless an explicit, owned CI artifact mount is supplied.
