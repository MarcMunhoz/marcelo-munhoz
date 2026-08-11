## Context

The project is a Vue 3/Quasar site deployed on Netlify. Public blog pages already read Contentful data through a narrow same-origin server-side proxy backed by the Contentful Delivery API. That read path intentionally keeps delivery credentials out of browser bundles and exposes only the routes needed by the public blog.

The admin area is a different security boundary. It needs authenticated write operations against Contentful's Content Management API, including draft creation, updates, publication lifecycle actions, and permanent deletion. Contentful Free plan constraints are part of the design: custom roles are not available, so the app cannot rely on native Contentful fine-grained roles to express "writers can unpublish but cannot delete."

The safer free-plan model is to avoid granting guest writers broad Contentful Editor access. Guest writers use the website admin flow to draft and request editorial actions; the owner remains the actor allowed to publish, unpublish, archive, and permanently delete.

## Goals / Non-Goals

**Goals:**

- Provide a protected `/admin` experience for blog article drafting, editing, review, and owner actions.
- Keep the existing public blog read API unchanged.
- Add separate server-side admin API routes for Contentful Management API operations.
- Keep the Contentful Management API token server-side only.
- Support guest writers without requiring paid Contentful custom roles.
- Enforce owner-only publication lifecycle and destructive actions in the admin backend.
- Preserve deterministic tests that do not require live Contentful data.

**Non-Goals:**

- Replace Contentful as the content repository.
- Require paid Contentful custom roles or a paid hosting plan.
- Build a generic Contentful administration console.
- Expose arbitrary Contentful Management API requests to the browser.
- Let guest writers permanently delete, archive, publish, or unpublish directly in the first version.
- Change the public blog route contract or article rendering behavior.

## Decisions

### Add a Separate Admin API Surface

Create admin routes under a separate prefix such as `/api/admin/contentful/*` instead of extending the public `/api/contentful/*` proxy.

Rationale: public reads and authenticated writes have different authentication, authorization, error handling, audit, and rate-limit concerns. Keeping them separate avoids accidentally widening the public proxy.

Alternatives considered:

- Extend `/api/contentful/*` with mutation routes: simpler routing, but weak separation between public and privileged operations.
- Add a generic Contentful proxy: flexible, but difficult to audit and unnecessary for this application.

### Use Server-Side Contentful Management API Access

Admin write operations call Contentful's Content Management API from Netlify Functions or the local server wrapper. The browser never receives the management token and never supplies Contentful credentials.

Rationale: the management token can mutate content and must be treated as a high-impact secret. A server-side facade can validate inputs, enforce app-level permissions, normalize errors, and prevent arbitrary upstream calls.

Alternatives considered:

- Call the Contentful Management API directly from the browser: rejected because it exposes write credentials.
- Use each guest writer's Contentful account directly: rejected for the first version because Free plan roles are too coarse for the desired permission model.

### Model Guest Writers In The App, Not As Broad Contentful Editors

Guest writers authenticate to the website admin area and receive app-level permissions. They can create and edit drafts or submissions and request publication or unpublication. They cannot publish, unpublish, archive, or permanently delete through the admin API.

Rationale: Contentful Free plan role options do not safely express the target rule where writers can request editorial changes but only the owner can perform destructive or publication lifecycle actions.

Alternatives considered:

- Invite writers as Contentful Editors: convenient, but they may gain destructive permissions outside the custom admin UI.
- Require paid custom Contentful roles: better permission fit, but violates the goal of staying on free plans.

### Keep Owner Actions Explicit And Server-Enforced

The admin backend must identify owner sessions separately from writer sessions. Owner-only routes perform publication, unpublication, archiving, and permanent deletion. Permanent deletion requires an article to be selected explicitly and should be implemented with confirmation-oriented UI and tests.

Rationale: hiding buttons in the frontend is not sufficient authorization. The server must reject non-owner lifecycle and destructive requests.

Alternatives considered:

- Frontend-only role checks: rejected because they are bypassable.
- Shared writer/owner mutation endpoint: rejected because it makes authorization harder to reason about and test.

### Preserve Free-Plan Operation

The first implementation should avoid paid Contentful features, paid Netlify features, additional hosted databases, and background job requirements. If persistent metadata is needed for writer ownership or review requests, it should be modeled using Contentful entries or another free-plan-compatible storage choice selected during implementation design.

Rationale: the user explicitly wants to keep the project 100% free if feasible.

Alternatives considered:

- Add a separate paid database or queue: operationally clean, but outside the current cost goal.
- Depend on Contentful custom roles: unavailable on the target plan.

## Risks / Trade-offs

- Free-plan Contentful roles are coarse -> Keep guest writer permissions in the app and do not grant broad Contentful Editor access for normal guest authoring.
- App-level authorization can drift from Contentful reality -> Restrict server routes to narrow operations and cover each role/action combination with tests.
- Management token leakage would be high impact -> Keep it out of build config, responses, browser-visible logs, GitHub artifacts, and OpenSpec artifacts; scan built assets during validation.
- Multiple writers editing the same article can cause version conflicts -> Use Contentful version headers or equivalent optimistic concurrency behavior and return conflict-safe user errors.
- Draft ownership may be hard to infer from Contentful alone -> Define explicit metadata for writer ownership or submission attribution before implementation.
- Staying 100% free may limit collaboration features -> Keep first version focused on draft submission and owner review rather than full multi-user CMS parity.
- Live Contentful behavior is external and mutable -> Use mocks/fixtures for routine tests and document optional live smoke checks separately.

## Migration Plan

1. Add the protected admin route shell without changing public blog behavior.
2. Add server-side admin API handlers with mocked Contentful Management API tests first.
3. Add the article draft/editor workflow for writers.
4. Add owner review and lifecycle actions behind server-side owner authorization.
5. Add validation that no management credentials appear in frontend bundles or user-visible responses.
6. Deploy behind the protected admin route while keeping public blog reads on the existing Delivery API proxy.
7. Roll back by disabling or hiding the admin route and leaving the existing public blog read path untouched.

## Open Questions

- Which free-compatible authentication provider will protect `/admin` and provide stable user identities?
- How will owner identity be configured in the runtime without exposing local or personal identifiers in public artifacts?
- Should writer ownership be stored as Contentful metadata, article fields, or a separate Contentful entry type?
- Which article fields are required in the first editor experience?
- Should unpublication requests be stored on the article entry or as separate review-request entries?
