# Administrative Session Lifecycle Evidence — 2026-08-31

## Scope and classification

This change addresses a bounded-session policy weakness in the administrative browser experience. It is not evidence of an authorization bypass: Netlify Functions remain responsible for authenticating the provider context and enforcing roles, ownership, versions, and editorial lifecycle rules before privileged upstream operations.

The original client path accepted a user restored by the Identity provider, requested a JWT, and used that bearer token for administrative API calls. Because the application did not impose its own browser-session or inactivity boundary, a prior valid provider session could remain usable after the intended browser session or on an unattended browser.

## Security invariant

A production administrative session is locally accepted only when all of the following are true:

- the Identity provider exposes an authenticated user;
- a session cookie contains a non-sensitive opaque marker;
- same-origin lifecycle storage contains the matching marker;
- the recorded activity timestamp and elapsed interval are finite and non-negative;
- inactivity is less than 15 minutes.

The application warns after 14 minutes of inactivity. Once warned, incidental input cannot renew the session; continuation requires the explicit action in the warning dialog. Qualifying activity is recorded only on authenticated administrative surfaces and writes are throttled.

The marker and coordination events contain no JWT, provider identity, email, roles, credentials, or private content. Development preview sessions remain separate and do not create or depend on production lifecycle state.

## Implemented controls

- `app/src/utils/adminSessionLifecycle.js` owns marker creation, validation, cleanup, inactivity evaluation, explicit continuation, and cross-tab propagation.
- `app/src/utils/adminAuth.js` rejects provider-restored users before requesting a JWT when the local browser-session gate is not accepted.
- `app/src/utils/adminApi.js` rejects an expired production session before starting a protected fetch.
- `app/src/layouts/MainLayout.vue` owns Identity callbacks, the inactivity warning, lifecycle teardown, profile cleanup, and signed-out navigation.
- Administrative pages use the centralized hydration path and no longer register competing provider callbacks.
- Cookie decoding errors, unavailable cookie/storage APIs, invalid clocks, transport failures, concurrent logout, and offline provider logout fail closed locally.
- BroadcastChannel coordination uses a same-origin storage-event fallback with strict message shape, event type, timestamp, marker, and key validation.

## Provider and browser limitations

The application depends on Netlify Identity for the underlying authenticated provider user and bearer token. The local lifecycle marker limits whether the SPA will accept and use that provider state, but it cannot revoke or replace the provider session and does not weaken the server authorization boundary.

Session-cookie deletion on a normal browser close is controlled by the browser. Some browsers can restore session cookies when restoring a previous session. Consequently, guaranteed invalidation on every browser-close behavior cannot be established solely by frontend code. The 15-minute inactivity expiry limits that residual window; a stricter universal guarantee requires a provider- or server-managed session lifetime policy.

If provider logout fails while offline, local lifecycle state and administrative UI are still cleared before the provider call settles. The provider may retain its own state until connectivity returns, but that state alone is rejected without an accepted local marker.

## Automated verification evidence

Verification uses the exact locked dependency graph already restored in a dedicated container volume, with networking disabled and without installing additional tools or dependencies. Environment files, credentials, tokens, and live administrative services are excluded from the procedure.

Final automated verification established:

- 363 tests pass in the full existing suite;
- focused lifecycle tests cover provider restoration, same-session reload, secure marker attributes, explicit and concurrent logout, offline logout, preview isolation, warning and expiry thresholds, explicit continuation, activity scoping and throttling, invalid clocks, cross-tab behavior, strict token-free messages, corrupted browser state, and pre-fetch expiry rejection;
- authentication and administrative frontend regression tests pass;
- lint passes;
- the production build passes from a sanitized source copy containing no `.env*` files and with zero injected environment values;
- the existing built-asset credential scanner passes against that production build.

Strict OpenSpec validation passes.

## Independent bypass and regression review

An independent read-only review covered startup races, multi-tab races, offline logout, direct administrative navigation, development preview isolation, token-free coordination, timer correctness, provider-originated logout, and server authorization preservation. It found no protected API or Function-side authorization bypass.

The review identified and the implementation subsequently resolved these frontend regressions:

- disappearance of lifecycle state now expires loaded administrative UI instead of only stopping its timer;
- session acceptance is revalidated after asynchronous JWT resolution, including bounded retry when a newer accepted marker replaces the original;
- delayed cross-tab messages cannot rewind a newer activity timestamp;
- throttled qualifying activity is coalesced instead of discarded;
- development preview clears a provisional production marker;
- provider-originated logout clears cookie and lifecycle storage before UI teardown.

The reviewer rechecked the fixes and found no directly introduced regression. Manual browser scenarios remain unclaimed until they are executed.

## Manual evidence still required

Manual browser verification must record the observed result for:

- same-browser-session reload;
- full browser close and reopen under the tested browser configuration;
- the 14-minute warning;
- automatic expiration at 15 minutes;
- explicit continuation from the warning;
- cross-tab logout and expiration.

No credentials, provider tokens, account identifiers, private URLs, local paths, screenshots containing sensitive data, or environment-specific identifiers may be included in that record.
