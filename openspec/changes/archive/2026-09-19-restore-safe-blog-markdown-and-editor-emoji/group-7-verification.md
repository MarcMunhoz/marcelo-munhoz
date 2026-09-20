## Group 7: Browser Journeys And Release Verification

The deterministic public journey now covers semantic Markdown, safe external-link attributes, Unicode emoji, the canonical privacy-enhanced player, its full-width 16:9 layout, and document-level overflow at desktop and mobile viewports. The administrative journey covers keyboard opening, localized search, active-option navigation, emoji insertion at the saved cursor, focus and caret restoration, picker dismissal, and the absence of provider mutations.

### Local verification

- The complete containerized Vitest suite passed: 46 files and 444 tests.
- Coverage passed the configured thresholds: 91.06% statements, 83.34% branches, 86.61% functions, and 92.53% lines.
- Lint completed with zero errors and six warnings from pre-existing generated coverage artifacts.
- The production build and built-asset credential scan passed. The emoji picker remains split into lazy-loaded picker, locale, and data assets.
- All five Cypress specifications passed at desktop and mobile viewport classes in Chrome and Firefox. The administrative signed-out routing scenario needed its configured retry in the desktop runs; each final administrative result was 11 of 11 passing, and the mobile runs passed 11 of 11 without a retry artifact.
- Independent review findings were addressed and covered by regression tests: preview media is mounted only in preview mode, document-scoped Markdown definitions survive trusted-video boundaries, and iframe feature permissions are limited to playback requirements.
- The emoji picker now floats without displacing article text, remains constrained to the body editor when moved by pointer or keyboard, and refreshes the insertion target when the focused textarea selection changes.
- The focused change and all repository specifications passed strict OpenSpec validation: 11 of 11 items.
- The diff whitespace check passed. The change-artifact audit found no placeholders, contradictory pending-group statements, local machine paths, private endpoints, private-key markers, or credential-like assignments.

### Deploy Preview verification

- The affected published article was validated in the Netlify branch deploy for exact commit `80e057d` on September 19, 2026.
- Wide and compact viewport checks confirmed semantic Markdown presentation, preserved Unicode emoji, safe external-link rendering, and no document-level horizontal overflow.
- The approved player loaded successfully, remained contained at a responsive 16:9 ratio, and produced no Content Security Policy violation in the browser console.
- The only visible console warning concerned unavailable media adapters and was unrelated to the Content Security Policy or article rendering.
- The verification did not merge a pull request or modify production content.
