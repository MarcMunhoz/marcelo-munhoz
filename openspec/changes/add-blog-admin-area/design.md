## Context

The project is a Vue 3/Quasar site deployed on Netlify. Public blog pages already read Contentful data through a narrow same-origin server-side proxy backed by the Contentful Delivery API. That read path intentionally keeps delivery credentials out of browser bundles and exposes only the routes needed by the public blog.

The admin area is a different security boundary. It needs authenticated write operations against Contentful's Content Management API, including draft creation, updates, publication lifecycle actions, and permanent deletion. Contentful Free plan constraints are part of the design: custom roles are not available, so the app cannot rely on native Contentful fine-grained roles to express "writers can unpublish but cannot delete."

The safer free-plan model is to avoid granting guest writers broad Contentful Editor access. Guest writers use the website admin flow to draft and request editorial actions; the owner remains the actor allowed to publish, unpublish, archive, and permanently delete.

## Goals / Non-Goals

**Goals:**

- Provide a protected `/admin` experience for blog article drafting, editing, review, and owner actions.
- Provide a CMS-style admin dashboard as the first `/admin` screen, including article counts, status filters, article tables, and role-appropriate actions.
- Keep the existing public blog read API unchanged.
- Add separate server-side admin API routes for Contentful Management API operations.
- Keep the Contentful Management API token server-side only.
- Manage article images through Cloudinary from the custom admin without exposing Cloudinary secrets to the browser.
- Support guest writers without requiring paid Contentful custom roles.
- Enforce owner-only publication lifecycle and destructive actions in the admin backend.
- Keep article page-view metrics optional until a free-compatible analytics data source is selected.
- Preserve deterministic tests that do not require live Contentful data.

**Non-Goals:**

- Replace Contentful as the content repository.
- Require paid Contentful custom roles or a paid hosting plan.
- Build a generic Contentful administration console.
- Expose arbitrary Contentful Management API requests to the browser.
- Expose Cloudinary API secrets, upload signatures, or broad media-library credentials to the browser.
- Let guest writers permanently delete, archive, publish, or unpublish directly in the first version.
- Require Google Analytics Data API, paid analytics, or a database-backed metrics pipeline for the first dashboard version.
- Change the public blog route contract or article rendering behavior.

## Decisions

### Add a Separate Admin API Surface

Create admin routes under a separate prefix such as `/api/admin/contentful/*` instead of extending the public `/api/contentful/*` proxy.

Rationale: public reads and authenticated writes have different authentication, authorization, error handling, audit, and rate-limit concerns. Keeping them separate avoids accidentally widening the public proxy.

Alternatives considered:

- Extend `/api/contentful/*` with mutation routes: simpler routing, but weak separation between public and privileged operations.
- Add a generic Contentful proxy: flexible, but difficult to audit and unnecessary for this application.

### Use A CMS-Style Admin Shell

Use a dashboard-first layout inspired by compact CMS admin tools: persistent sidebar, topbar, status cards, filterable article table, and separate create/edit screens. The article editor should mirror the real Contentful Article model rather than exposing implementation fields.

The visual identity must remain consistent with the existing site. The CMS references guide structure and density only, not branding. Use the current Quasar/Roboto typography, existing `grey` and `blue-grey` palette, restrained spacing, and the site's current button/icon conventions unless a specific admin affordance requires a small extension.

Rationale: the admin must feel like an operational tool, not a public website page or a single long form. Writers need obvious create/edit flows, while owners need at-a-glance state and action queues.

Article editor fields for the first version:

- `createAt`
- `title`
- `slug`
- `description`
- `body`
- `thumbnail`
- `alt`
- `author`
- Contentful tags

Fields not shown as editable user inputs:

- Contentful version, kept as hidden state for optimistic concurrency.
- Review notes, removed until the editorial request workflow needs explicit notes.

Alternatives considered:

- Keep the direct article editor as `/admin`: faster, but it hides owner/admin needs and does not match the CMS workflow.
- Copy Contentful's full editor: familiar, but too large for this project and not necessary for guest writers.

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

### Use Netlify Identity For Admin Authentication

Use Netlify Identity as the first implementation's authentication provider. Configure registration as invite-only and represent admin authorization with server-verified roles:

- `writer`: create and edit permitted drafts or submissions, submit articles for owner review, and request unpublication.
- `owner`: perform all writer workflows plus publish, unpublish, archive, and permanently delete.

Rationale: Netlify Identity is available on the Free plan, integrates with Netlify Functions, supports JWT-backed roles, and avoids a separate paid authentication provider.

Alternatives considered:

- Contentful OAuth: aligns with Contentful user accounts, but Free plan roles are too coarse for the target writer/owner split.
- A separate auth provider: viable later, but adds another system and may complicate the 100% free constraint.

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

### Store Editorial Workflow Records Separately From Public Article Fields

Store article content in Contentful `article` entries and store writer ownership, submission status, and unpublication requests in a separate editorial workflow content type, tentatively `blogEditorialRequest`.

Rationale: the current public blog proxy returns complete article fields for published entries. Adding private writer identity or workflow state directly to published article entries could expose that data through public responses. Separate workflow records can remain admin-only and unpublished while still using Contentful as the free-plan-compatible storage location.

Alternatives considered:

- Store workflow fields directly on `article`: simpler, but risks leaking private workflow metadata unless the public proxy is changed to whitelist fields.
- Add a separate database: clearer separation, but outside the current free-plan target.

### Add Server-Side Cloudinary Media Handling

Add a narrow server-side media API for article image upload/selection. The browser should upload or select media through the admin backend, and the backend should handle Cloudinary credentials/signatures. The resulting Cloudinary metadata is saved into the Article `thumbnail` field in the shape expected by the existing public blog UI.

Rationale: the current Contentful app delegates image management to Cloudinary. The custom admin must preserve that workflow without requiring writers to manually copy public IDs or URLs.

Expected behavior:

- Writers can upload/select an image for an article thumbnail.
- The system stores Cloudinary `public_id` and URL-compatible metadata in Contentful.
- The optional `alt` field is edited separately as article accessibility metadata.
- Cloudinary credentials stay server-side and are never placed in `VITE_*` variables.

Implementation decision:

- Use backend-mediated Cloudinary operations for the first version.
- List existing images through a narrow server-side media route scoped to the configured Cloudinary folder.
- Upload images by sending a browser-selected Data URI to the admin backend; the backend signs and sends the upload request to Cloudinary.
- Store the returned asset metadata in the Contentful Article `thumbnail` field and keep `alt` as a separate Article field.
- Use sanitized server-only runtime variables for Cloudinary cloud name, API key, API secret, and folder.

Alternatives considered:

- Keep manual Cloudinary fields in the editor: lowest implementation cost, but poor author experience and error-prone.
- Use Contentful Assets instead of Cloudinary: simpler CMS integration, but changes the site's current image hosting model.
- Use signed direct browser upload: reduces backend transfer work, but exposes short-lived signatures in the browser and requires more client-side upload complexity.

### Defer Page-View Metrics Integration

The dashboard should include editorial status counts immediately and reserve a metrics area for page views, but page-view counts remain optional until a free-compatible analytics source is selected.

Rationale: status counts come from Contentful/admin data and are essential for admin work. View counts require a separate analytics integration and should not block the core admin permissions model.

Alternatives considered:

- Integrate Google Analytics Data API now: gives real page views, but adds credentials and complexity.
- Store custom page views in the app: creates a new tracking/storage problem and may affect privacy posture.

## Risks / Trade-offs

- Free-plan Contentful roles are coarse -> Keep guest writer permissions in the app and do not grant broad Contentful Editor access for normal guest authoring.
- App-level authorization can drift from Contentful reality -> Restrict server routes to narrow operations and cover each role/action combination with tests.
- Management token leakage would be high impact -> Keep it out of build config, responses, browser-visible logs, GitHub artifacts, and OpenSpec artifacts; scan built assets during validation.
- Cloudinary credential leakage would be high impact -> Keep Cloudinary upload credentials server-side, use signed or backend-mediated upload, and scan frontend build output for configured secret values.
- Multiple writers editing the same article can cause version conflicts -> Use Contentful version headers or equivalent optimistic concurrency behavior and return conflict-safe user errors.
- Draft ownership may be hard to infer from Contentful alone -> Store writer ownership in separate admin-only editorial workflow records keyed by the authenticated identity subject.
- Staying 100% free may limit collaboration features -> Keep first version focused on draft submission and owner review rather than full multi-user CMS parity.
- Dashboard view metrics may not be available for free -> Ship status counts first and show page-view metrics only when a free-compatible source is connected.
- Live Contentful behavior is external and mutable -> Use mocks/fixtures for routine tests and document optional live smoke checks separately.

## Migration Plan

1. Add the protected admin route shell without changing public blog behavior.
2. Add server-side admin API handlers with mocked Contentful Management API tests first.
3. Add the dashboard-first admin shell with article status counts and table scaffolding.
4. Add server-side Cloudinary media handling and image selection/upload UI.
5. Add the article draft/editor workflow for writers using the real Article field set.
6. Add owner review and lifecycle actions behind server-side owner authorization.
7. Add validation that no management or Cloudinary credentials appear in frontend bundles or user-visible responses.
8. Deploy behind the protected admin route while keeping public blog reads on the existing Delivery API proxy.
9. Roll back by disabling or hiding the admin route and leaving the existing public blog read path untouched.

## Open Questions

- Should the first version allow writers to select only their own owner-managed author profile, or should owners assign the author during review?
- What confirmation text should the owner UI require before permanent deletion?
