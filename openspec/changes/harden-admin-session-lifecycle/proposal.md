## Why

The administrative frontend currently reaccepts a Netlify Identity session after the browser is closed and reopened, with no application-owned inactivity limit. This leaves valid administrative access available longer than the product's security policy permits, especially on shared or unattended devices.

## What Changes

- Limit production administrative sessions to the browser session in which authentication occurred, while preserving reloads and ordinary navigation during that browser session.
- End an administrative session after 15 minutes without qualifying user activity.
- Warn the authenticated administrator during the final minute and allow intentional activity to keep the session active.
- Coordinate activity, warning, and logout state across same-origin tabs so one tab cannot silently retain access after another expires or signs out.
- Reject persisted Netlify Identity state on a fresh browser session and clear it through the provider logout flow before allowing administrative access.
- Preserve explicit logout, server-side role and ownership enforcement, and development-only preview behavior.
- Add deterministic tests for startup restoration, inactivity, warning, cross-tab coordination, logout, and legitimate same-session reloads.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `blog-admin`: Strengthen administrative session controls with browser-session lifetime, inactivity expiration, warning, and multi-tab consistency requirements.

## Impact

- Affects the shared administrative authentication/session utility and the frontend surfaces that hydrate or react to admin sessions.
- Retains Netlify Identity as the authentication provider and keeps production authorization enforced by the existing server-side administrative API boundary.
- Requires browser lifecycle and cross-tab coordination logic, user-facing timeout feedback, and focused frontend tests.
- Does not require new runtime dependencies or changes to Contentful, Cloudinary, or public blog authentication behavior.
