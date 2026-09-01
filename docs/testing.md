# Containerized Test Commands

All validation runs through `docker-compose.test.yaml`. This file has no `env_file` declaration, and the Docker build context excludes `.env` and `.env.*` files.

## Current baseline validation

Run the retained legacy Node suite in the isolated test image:

```bash
docker compose -f docker-compose.test.yaml --profile test run --rm test
```

## Focused Vitest projects

The commands below are the stable container entry points. Their project configuration is added in Group 3.

```bash
docker compose -f docker-compose.test.yaml run --rm test npm exec vitest --project unit-node
docker compose -f docker-compose.test.yaml run --rm test npm exec vitest --project unit-dom
docker compose -f docker-compose.test.yaml run --rm test npm exec vitest --project component
docker compose -f docker-compose.test.yaml run --rm test npm exec vitest --coverage
```

## Browser profiles

Start the isolated frontend and backend services, then run one pinned browser profile. Cypress suites are introduced in Group 7.

```bash
docker compose -f docker-compose.test.yaml --profile e2e up -d test-frontend test-backend
docker compose -f docker-compose.test.yaml --profile chrome run --rm cypress-chrome
docker compose -f docker-compose.test.yaml --profile firefox run --rm cypress-firefox
docker compose -f docker-compose.test.yaml --profile e2e down --remove-orphans
```

The test and browser images run as non-root users. Test artifacts created by later Vitest and Cypress configuration remain inside the container unless an explicit, owned CI artifact mount is supplied.
