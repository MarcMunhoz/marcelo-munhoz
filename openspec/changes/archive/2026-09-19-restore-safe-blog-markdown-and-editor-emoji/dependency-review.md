## Dependency Review

Review date: 2026-09-14

No package was installed during this review. Versions and package metadata were read from the public npm registry, upstream repositories, upstream documentation, and the OSV vulnerability database.

## Recommended Dependencies

### `dompurify@3.4.15`

- Purpose: sanitize Marked HTML at the browser boundary before Vue renders it.
- License: MPL-2.0 or Apache-2.0.
- Runtime footprint: no required production dependencies; the package declares only optional Trusted Types definitions.
- Compatibility: provides an ESM browser build compatible with the project's Vue, Vite, and supported browser runtime.
- Maintenance: current npm and upstream release at review time; the upstream project remains active and publishes provenance artifacts.
- Security: the exact version returned no matching OSV advisory at review time and includes fixes newer than the published advisories reviewed. DOMPurify remains security-sensitive and must stay under automated dependency monitoring.
- Integration constraints: use string-in/string-out sanitization with an explicit HTML and attribute allowlist; forbid SVG, MathML, custom elements, `style`, `iframe`, DOM-return modes, in-place mutation, mutable global hooks, and unsafe URL schemes.

Sources:

- https://www.npmjs.com/package/dompurify
- https://github.com/cure53/DOMPurify
- https://github.com/cure53/DOMPurify/security/advisories

### `emoji-picker-element@1.29.1`

- Purpose: provide the searchable, categorized, skin-tone-aware, keyboard-accessible emoji picker as a framework-neutral Web Component.
- License: Apache-2.0.
- Runtime footprint: no production dependencies; approximately 12.5 kB minified and compressed according to upstream documentation.
- Compatibility: client-only ESM using Custom Elements, Shadow DOM, ES2019+, and IndexedDB; compatible with Vue and Vite when dynamically imported after user interaction.
- Accessibility: upstream supplies keyboard navigation, screen-reader labels, search guidance, visible focus, categories, and skin-tone selection. Project-specific compact sizing and focus restoration remain required.
- Maintenance: active, unarchived upstream project with a current npm release at review time.
- Runtime network constraint: the default data source uses jsDelivr and MUST be overridden with a same-origin data asset. The picker itself will be lazy-loaded and no executable dependency will load from a CDN.
- Security: the exact version returned no matching OSV advisory at review time. The existing textarea remains available if the optional picker or IndexedDB initialization fails.

Sources:

- https://www.npmjs.com/package/emoji-picker-element
- https://github.com/nolanlawson/emoji-picker-element

### `emoji-picker-element-data@1.8.0`

- Purpose: supply official emoji data locally so the picker never fetches its default runtime catalog from a third-party CDN.
- License: Apache-2.0.
- Runtime footprint: no production dependencies. The package contains all supported locales and is approximately 31 MB unpacked in development dependencies, but only the Portuguese CLDR data file, approximately 455 kB before production compression, will be emitted as a same-origin build asset.
- Integration constraints: import the Portuguese CLDR JSON as a Vite asset URL and pass that URL explicitly as the picker `dataSource`; do not copy or expose the complete locale package in the production build.
- Security: the exact version returned no matching OSV advisory at review time.

Sources:

- https://www.npmjs.com/package/emoji-picker-element-data
- https://github.com/nolanlawson/emoji-picker-element-data

## Alternatives Rejected

- `sanitize-html`: primarily server-oriented for this use case and introduces a larger transitive browser bundle than the DOM-native sanitizer.
- Native Sanitizer API: browser interoperability and allowlist behavior are not yet sufficient for the project's supported browser matrix.
- Vue-specific emoji pickers: the reviewed options offered weaker maintenance, larger bundled data, or less explicit accessibility and offline behavior.
- A hand-maintained emoji catalog: cannot sustainably provide complete search, categories, skin-tone variants, and Unicode evolution.

## Installation Gate

If approved, install the following exact versions inside the project container only:

- Production: `dompurify@3.4.15`
- Production: `emoji-picker-element@1.29.1`
- Production: `emoji-picker-element-data@1.8.0`

All three packages must be recorded with exact versions rather than range prefixes. The package lockfile and dependency audit output must be reviewed before proceeding to rendering implementation.

## Installation Verification

The approved versions were installed inside the project container and recorded exactly in the package manifest and lockfile. The lockfile adds only the three approved packages plus DOMPurify's optional Trusted Types definitions.

The post-install npm audit reported one moderate `qs@6.15.3` advisory. The same version and integrity were already present in the pre-change lockfile through Express and Cypress request dependencies, so the finding was not introduced by this change. No automatic audit fix or unrelated dependency update was applied.
