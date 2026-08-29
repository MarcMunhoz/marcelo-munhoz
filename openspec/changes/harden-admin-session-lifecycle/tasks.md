## 1. Session Policy Test Harness

- [ ] 1.1 Add deterministic test doubles for time, session cookies, provider initialization, visibility changes, and cross-tab lifecycle messages without introducing dependencies
- [ ] 1.2 Add failing tests proving a provider-restored user without the current browser-session marker is rejected and logged out
- [ ] 1.3 Add failing tests proving a successful login and same-browser-session reload remain authenticated while explicit logout clears all lifecycle state

## 2. Browser-Session Acceptance Gate

- [ ] 2.1 Implement non-sensitive ephemeral browser-session marker creation, validation, and deletion with secure cookie attributes in production
- [ ] 2.2 Centralize production session hydration so provider users are never exposed before browser-session acceptance completes
- [ ] 2.3 Make stale-provider cleanup and explicit logout fail closed and idempotent while preserving existing navigation behavior
- [ ] 2.4 Verify development preview sessions remain separate from production markers and continue to work unchanged

## 3. Inactivity Lifecycle

- [ ] 3.1 Add failing fake-clock tests for the 14-minute warning, explicit continuation, and mandatory logout at 15 minutes
- [ ] 3.2 Implement throttled qualifying-activity tracking only on authenticated administrative surfaces
- [ ] 3.3 Recalculate inactivity safely on page visibility, focus, timer delay, and invalid or discontinuous timestamps
- [ ] 3.4 Add the one-minute expiration warning with explicit continue-session and sign-out actions, ensuring incidental input cannot silently renew a warned session

## 4. Cross-Tab Consistency

- [ ] 4.1 Add failing tests for activity renewal, warning, continuation, explicit logout, and expiration propagated between same-origin tabs
- [ ] 4.2 Implement non-sensitive BroadcastChannel coordination with storage-event fallback and strict message validation
- [ ] 4.3 Ensure concurrent expiration and logout events clear every tab immediately and invoke provider logout idempotently

## 5. Administrative Surface Integration

- [ ] 5.1 Route the main layout and every administrative page through the shared lifecycle controller for initialization and teardown
- [ ] 5.2 Prevent protected API actions after local expiration while retaining server-side authentication, role, and ownership enforcement as the authorization boundary
- [ ] 5.3 Verify signed-out redirects, browser history behavior, profile cleanup, and existing writer and owner workflows remain intact

## 6. Security Evidence And Verification

- [ ] 6.1 Update the threat model and sanitized security evidence with the bounded-session invariant, provider-storage dependency, and browser session-restoration limitation
- [ ] 6.2 Run focused authentication, frontend, admin access, and server authorization tests in the project container
- [ ] 6.3 Run the full existing test and production build checks in the project container without installing additional tools or dependencies
- [ ] 6.4 Perform an independent bypass and regression review covering startup races, multi-tab races, offline logout, direct admin navigation, development preview isolation, and token-free coordination state
- [ ] 6.5 Record manual browser evidence for same-session reload, full browser reopen, the inactivity warning, automatic expiration, continuation, and cross-tab logout
