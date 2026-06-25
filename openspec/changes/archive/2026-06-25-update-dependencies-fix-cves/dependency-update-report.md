## Dependency Update Report

## Updated Packages

- Runtime dependencies updated include Cloudinary packages, Axios, Contentful, Marked, Quasar, Sass loader, Vue, and related transitive packages.
- Development dependencies updated include `@quasar/app-vite`, Autoprefixer, Concurrently, Dotenv, `eslint-config-prettier`, Prettier, PostCSS, Sass, and related transitive packages.
- CVE remediation uses npm overrides for `vite`, `esbuild`, `form-data`, and `js-yaml` where direct package updates did not resolve the vulnerable transitive versions.

## Remediated CVEs

- `shell-quote` through `concurrently@10.0.3`.
- `form-data` through override to `^4.0.6`.
- `js-yaml` through override to `^5.1.0`.
- `vite` through override to `^6.4.3`.
- `esbuild` through override to `0.25.12`, avoiding the vulnerable `0.27.3 - 0.28.0` range while preserving the current browser targets.

## Deferred Major Updates

- `@quasar/app-vite@3.0.0-rc.3`: deferred because it is a release candidate and would be a framework tooling migration rather than a maintenance patch.
- `@quasar/extras@2.0.1`: tested and reverted because Quasar build could not resolve the existing `fontawesome-v6` asset path.
- `eslint@10.5.0` and `eslint-plugin-vue@10.9.2`: deferred because ESLint 9 is already audit-clean after migration to flat config, while the major upgrade requires a separate peer dependency migration.
- `tailwindcss@4.3.1`: deferred because Tailwind 4 changes the PostCSS integration and configuration model.
- `vue-router@5.1.0`: deferred because it introduces a major router migration and peer expectations outside the current Quasar/Vite stack.

## Validation

All validation commands were run inside Docker containers.

- `npm install`: passes with 0 vulnerabilities.
- `npm audit --json`: passes with 0 total vulnerabilities.
- `npm run lint`: passes with ESLint flat config.
- `npm run build`: passes with Quasar SPA production build.
- `npm test`: passes; the project currently uses a placeholder test script.
- Docker `develop` target: builds successfully.
- Docker `production` target: builds successfully and runs the Quasar build.
- Runtime smoke: `npm run dev` starts the Express backend on port 3000 and the Quasar frontend on port 4242 when dummy Contentful environment values are supplied.

No secret file contents were inspected during implementation.
