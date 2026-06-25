## 1. Container Baseline

- [x] 1.1 Confirm the available Docker workflow and identify the container command form to use for all npm operations.
- [x] 1.2 Build or start the project container context without reading `.env`, `.env.*`, secret, credential, or private key files directly.
- [x] 1.3 Capture the initial inside-container baseline for `npm install`, `npm audit`, `npm run lint`, `npm run build`, and `npm test`.

## 2. Dependency Discovery

- [x] 2.1 Run inside-container dependency discovery for outdated direct packages in `app/package.json`.
- [x] 2.2 Run inside-container audit discovery for production and development CVEs.
- [x] 2.3 Identify transitive vulnerable packages and the direct dependency or override path needed to remediate them.

## 3. Package Updates

- [x] 3.1 Update compatible direct dependencies in `app/package.json` and refresh `app/package-lock.json` inside the container.
- [x] 3.2 Update compatible development dependencies and tooling packages inside the container.
- [x] 3.3 Apply lockfile-only updates or npm overrides for compatible transitive CVE remediation where direct package updates are insufficient.
- [x] 3.4 Document any package that cannot be updated safely, including the compatibility blocker and follow-up path.

## 4. Compatibility Fixes

- [x] 4.1 Fix code or configuration issues introduced by dependency updates.
- [x] 4.2 Fix lint configuration or package-script issues introduced by tooling updates.
- [x] 4.3 Confirm the Docker development and production targets still install dependencies consistently.

## 5. Validation

- [x] 5.1 Run `npm install` or the project-equivalent clean install path inside the container and confirm the lockfile is consistent.
- [x] 5.2 Run `npm audit` inside the container and confirm no actionable vulnerabilities remain, or document any accepted blocker.
- [x] 5.3 Run `npm run lint` inside the container and resolve or document any remaining blocker.
- [x] 5.4 Run `npm run build` inside the container and resolve or document any remaining blocker.
- [x] 5.5 Run `npm test` inside the container and resolve or document any remaining blocker.
- [x] 5.6 Start the application through the container workflow and confirm frontend and backend processes start without dependency-related runtime failures.

## 6. Review

- [x] 6.1 Review the final Git diff to confirm only dependency, lockfile, container, and necessary compatibility changes were made.
- [x] 6.2 Summarize updated packages, remediated CVEs, remaining exceptions, and validation results.
