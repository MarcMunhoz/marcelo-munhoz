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
