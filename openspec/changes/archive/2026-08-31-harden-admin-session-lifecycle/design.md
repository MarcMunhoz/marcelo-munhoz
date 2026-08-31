## Context

See `proposal.md` for motivation. Production session hydration currently converges on the shared admin authentication utility: it accepts the user returned by Netlify Identity, obtains a JWT, and exposes that session to the layout and administrative pages. The provider widget is configured to remember users and can restore them from durable browser storage; the application adds no browser-lifetime or inactivity boundary of its own. The administrative backend independently derives identity from Netlify's verified request context and already enforces roles and article ownership.

The solution must work with the CDN-delivered widget, avoid new dependencies, preserve normal reloads and multiple tabs, and leave development preview behavior unchanged. Browser close events are not reliable enough to perform asynchronous logout, so shutdown detection cannot be the primary control.

## Goals / Non-Goals

**Goals:**

- Add one application-owned lifecycle gate through which every production admin session is accepted, refreshed, or invalidated.
- Represent the current browser lifetime without storing a bearer token or identity data in application lifecycle storage.
- Apply one 15-minute inactivity policy consistently across tabs and admin surfaces.
- Make expiration fail closed in the UI and invoke the provider's supported logout operation idempotently.
- Keep lifecycle behavior deterministic under fake clocks and browser-storage test doubles.

**Non-Goals:**

- Replacing Netlify Identity or changing the server's existing role and ownership model.
- Treating client lifecycle state as server authorization evidence.
- Adding a server-side session database or new runtime dependency.
- Applying the production inactivity policy to development-only preview sessions.
- Counting interaction with public pages as administrative activity.

## Decisions

### 1. Gate provider restoration with an ephemeral browser-session marker

After a successful production login, the application will create an opaque, non-sensitive marker in a session cookie with `Secure`, `SameSite=Strict`, and the narrowest usable path, without `Expires` or `Max-Age`. All production session hydration will require both the provider user and this marker. If the provider returns a user without the marker, hydration will fail closed and invoke provider logout before returning an unauthenticated result.

The cookie is only a browser-lifecycle signal. It will contain no JWT, identity, role, or authorization claim, and neither the backend nor API authorization will trust it. A cookie is preferred over `sessionStorage` because it is shared across same-origin tabs; per-tab storage would cause a newly opened tab to invalidate an otherwise active browser session. Explicit logout and inactivity expiration will delete the marker.

Alternatives considered:

- Relying on `beforeunload` or `pagehide` was rejected because those events are unreliable for async logout and also run during reloads and ordinary navigation.
- Directly deleting undocumented widget storage keys was rejected because it couples the app to provider internals and can desynchronize widget state.
- Replacing the identity UI to force the provider's internal `remember=false` path was rejected for this change because it is broader, depends on undocumented integration details, and risks breaking login and reload behavior.

### 2. Centralize lifecycle state and make session acceptance asynchronous

A shared lifecycle controller will own marker validation, last qualifying activity, warning state, timeout scheduling, cross-tab messages, and idempotent logout. Existing session consumers will use the controller-backed session resolution instead of accepting `currentUser()` directly. Identity initialization and login/logout callbacks will feed the controller so a startup race cannot temporarily expose a restored session before the lifecycle gate is evaluated.

The controller will clear local admin profile/session state before awaiting remote logout. This makes the browser fail closed immediately if the provider request is slow, unavailable, or already in progress. Repeated expiry or cross-tab logout events will converge on the same result.

### 3. Track only deliberate activity on administrative surfaces

While an accepted production session is on an administrative route, bounded listeners will observe keyboard input, pointer activation, and touch activation. High-frequency events will be throttled and will not write on every browser event. Passive pointer movement and activity on public routes will not extend the administrative session.

Before the warning threshold, qualifying activity renews the shared last-activity time. Once the one-minute warning is visible, only the explicit continue-session action renews the session; incidental input cannot hide the warning or silently extend access. The sign-out action remains immediately available. The warning displays an `MM:SS` countdown recalculated from the controller's remaining-time snapshot every second rather than decrementing an independent UI clock, so delayed timers and cross-tab continuation converge on the authoritative lifecycle state.

### 4. Coordinate tabs with non-sensitive browser messages

Tabs will publish lifecycle messages containing only a session marker identifier, event type, and bounded timestamp. The preferred transport will be `BroadcastChannel`, with the browser `storage` event as a compatibility fallback. No message or coordination key will contain a token, email, role, profile, or Contentful identifier.

Activity in any administrative tab renews the accepted session for all tabs. Warning, continuation, explicit logout, and expiration are broadcast. Receivers validate message shape and session identifier, ignore stale or implausible timestamps, and apply logout idempotently. Persisted coordination timestamps do not restore access by themselves; the ephemeral browser-session marker remains mandatory.

### 5. Preserve server authorization as the security boundary

The lifecycle gate limits use of a legitimately issued provider session in the application but does not replace server authentication. Administrative functions will continue deriving the verified identity from the Netlify request context and enforcing roles and ownership. No client-supplied activity time or marker will authorize an API request.

## Risks / Trade-offs

- [Some browsers can restore session cookies when the user explicitly restores a previous browser session] → Treat absence of the marker as a mandatory fail-closed signal, document this browser-controlled limitation, and retain the independent 15-minute inactivity limit. A strict guarantee across session-restoration settings would require provider or server-side session changes outside this bounded frontend change.
- [A sleeping tab may run timers late] → Recalculate elapsed time from validated timestamps whenever the page becomes visible or receives an event instead of trusting timer cadence.
- [The system clock can jump] → Expire on negative, non-finite, or implausibly future timestamps and test clock discontinuities.
- [Several tabs may initiate logout together] → Clear local state first and guard provider logout with an idempotent in-flight operation.
- [Provider logout may fail while offline] → Keep the application marker and local admin state cleared so the UI remains unauthenticated; retry provider cleanup on the next lifecycle initialization before accepting a session.
- [Cross-tab APIs may be unavailable] → Use the storage-event fallback and retain per-tab expiry checks on focus and visibility changes.

## Migration Plan

1. Add lifecycle primitives and deterministic unit tests behind the shared authentication utility.
2. Integrate session initialization, activity observation, warning UI, and cross-tab teardown with all administrative surfaces.
3. Run focused frontend and administrative authorization tests in the project container, followed by the full existing test/build checks.
4. Deploy normally; existing durable provider sessions will be rejected once because they lack the new ephemeral marker, requiring administrators to authenticate again.

Rollback removes the lifecycle controller integration and marker handling. The existing provider session and server authorization behavior then resume without a data migration because the lifecycle marker contains no durable account data.
