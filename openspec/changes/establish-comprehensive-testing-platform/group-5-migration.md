# Group 5 Migration Record

Recorded on 2026-09-02 for change `establish-comprehensive-testing-platform`.

## Items 5.1 and 5.2 completed

Item 5.1 replaces application-shell and main-layout source inspection with mounted Vue/Quasar behavior:

- `tests/component/app-shell.test.js` verifies query-stable page identity, document title, description and robots metadata, public cookie presentation and dismissal, and suppression on administrative routes.
- `tests/component/main-layout.test.js` verifies desktop and mobile navigation surfaces, keyboard-focusable site-name access, the three-activation administrative entry, accepted and rejected access phrases, safe public fallback, authenticated account presentation, profile initials fallback, the session-expiry warning, and safe sign-out.

Item 5.2 adds `tests/component/public-pages.test.js` for rendered Home, About, and not-found behavior. It verifies public copy, deterministic experience age, hero and biography media, skills, alphabetic project presentation, safe project links, every social destination, social-icon interaction, the responsive semantic containers, and recovery from an unknown route. The About popup boundary now requests `noopener,noreferrer`, closing the opener-access gap exposed by the test-first failure.

Happy DOM proves the rendered semantics and breakpoint-owned component structure but does not calculate CSS media-query layout. Actual desktop and mobile layout remains assigned to Cypress task 7.2. Legacy source-inspection suites remain in place until tasks 5.8 and 10.1 authorize retirement.

## Validation evidence

- Component project: 11 passing tests in 4 files.
- The external-popup safety assertion failed before the production change because the features argument was absent, then passed after the minimal correction.
- Tests use memory routing, fake time where calendar output matters, controlled authentication and session doubles, and no live provider access.

All test commands execute through the isolated Compose test profile with implicit environment-file loading disabled.

## Items 5.3 through 5.8 completed

Items 5.3 through 5.7 add rendered component ownership for the blog archive, article and author pages, administrative dashboard and editor, author profile, and tag management. The resulting component project contains 43 passing tests in 10 files.

Item 5.8 removes 36 source-inspection cases only after their unit, contract, or rendered owners pass. The obsolete four-case Composition API structural suite is removed completely; replaced markup, state, route, and configuration token assertions are removed surgically from the hybrid frontend and routing suites. Functional legacy cases and CSS, focus, containment, and responsive assertions remain until Cypress supplies their browser owners and item 10.1 authorizes final runner retirement.

Validation after retirement: 306 legacy functional or pending-browser cases pass, and the complete Vitest suite passes 336 tests in 29 files. No dependency, production behavior, or container image changes are part of this item.
