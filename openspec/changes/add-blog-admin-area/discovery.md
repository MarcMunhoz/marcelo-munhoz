## Discovery And Baseline

This document captures the decisions needed before implementing the blog administration area. It intentionally uses sanitized configuration names only and does not include local paths, credentials, tokens, user emails, or private identifiers.

## 1.1 Public Blog Read Baseline

The current public blog API remains a read-only Contentful Delivery API facade:

- Public browser routes call same-origin `/api/contentful/*` URLs through `buildApiUrl`.
- Netlify redirects `/api/contentful/*` to the existing Contentful Function before the SPA fallback.
- Local development mounts the same behavior under the Express `/api/contentful` route.
- The shared proxy calls `https://cdn.contentful.com` with server-side `CONTENTFUL_SPACE_ID` and `CONTENTFUL_DELIVERY_KEY`.
- The public proxy supports only:
  - `GET /api/contentful/entries?page=<page>`
  - `GET /api/contentful/tags`
  - `GET /api/contentful/tagged?page=<page>&tag=<tag>`
  - `GET /api/contentful/article/<slug>`
- Article list queries use `content_type: "article"`, `limit: 3`, pagination via `skip`, and ordering by Contentful/system creation fields.
- Tagged article queries filter by `metadata.tags.sys.id[all]`.
- Article detail queries fetch one `article` by `fields.slug`.
- The public proxy resolves included Contentful links so the frontend can read linked author fields.

Admin write behavior must stay outside this public route surface.

## 1.2 Current Article Field Baseline

The current frontend expects these Contentful article fields and metadata:

| Purpose | Current data shape |
| --- | --- |
| Card/detail title | `article.fields.title` |
| Route slug | `article.fields.slug` |
| Card/detail description | `article.fields.description` |
| Detail body | `article.fields.body`, rendered as Markdown |
| Display date | `article.fields.createAt`, with fallback to `article.sys.createdAt` |
| Author display | `article.fields.author.fields.name` |
| Card image | Cloudinary metadata from the article thumbnail field, including `public_id` where available |
| Detail/social image | Cloudinary metadata from the article thumbnail field, including URL-compatible data where available |
| Image alt text | `article.fields.alt` |
| Tags | `article.metadata.tags[*].sys.id` |

The first admin editor must preserve this shape for published articles so existing public blog rendering remains unchanged.

## 1.3 Authentication Decision

Use Netlify Identity for the first implementation:

- It is available on the Netlify Free plan.
- It supports invite-only registration, which matches a private writer workflow.
- It supports JWT-backed roles and Functions integration.
- It avoids adding a separate paid authentication provider.

Server-side role representation:

- `writer`: can access writer workflows, create/edit permitted drafts or submissions, submit for owner review, and request unpublication.
- `owner`: can access all writer workflows plus publish, unpublish, archive, and permanently delete.

Identity rules:

- Configure Netlify Identity registration as invite-only.
- Store writer/owner authorization in Netlify Identity roles, not Contentful roles.
- Require the backend to verify the authenticated user and role for every admin API request.
- Do not use frontend-only role checks as authorization.

Implementation note:

- Adding the Netlify Identity package is deferred to the implementation set that introduces authentication code, because package installation requires explicit permission.

## 1.4 Editorial Metadata Storage Decision

Use Contentful as the free-plan-compatible storage location for editorial state, but keep workflow metadata separate from public article fields.

Decision:

- Store article content as Contentful `article` entries.
- Store writer ownership, submission status, and unpublication requests in a separate editorial workflow content type, tentatively `blogEditorialRequest`.
- Access editorial workflow records only through the authenticated admin API and Contentful Management API.
- Do not add private writer identity or review-status fields directly to published `article` entries unless the public read proxy is later changed to whitelist safe fields.

Rationale:

- The current public proxy returns full article `fields` for published entries.
- Putting private workflow metadata directly on published articles could expose that metadata to public blog responses.
- A separate workflow content type can stay unpublished and admin-only while still using Contentful within the Free plan.

Proposed `blogEditorialRequest` fields:

- `requestType`: `publication` or `unpublication`.
- `status`: `draft`, `readyForReview`, `approved`, `rejected`, or `closed`.
- `article`: reference to the related `article` entry.
- `writerSubject`: stable Netlify Identity subject for authorization checks.
- `writerName`: display name for owner review.
- `notes`: optional writer or owner notes.
- `createdAt`: request creation timestamp.
- `updatedAt`: last workflow update timestamp.

Avoid storing writer email unless the authentication implementation proves it is necessary.

## 1.5 First-Version Editor Field Set

The first article editor should support the fields from the real Contentful Article model, plus minimal workflow controls:

Article fields:

- `createAt`: optional display date; default to current date when creating.
- `title`: required plain text.
- `slug`: required URL-safe unique slug.
- `description`: required long text summary.
- `body`: required Markdown content.
- `thumbnail`: optional Cloudinary image metadata selected or uploaded through admin media controls.
- `alt`: optional image alt text.
- `author`: required owner-managed author reference.
- `metadata.tags`: optional Contentful tag selection.

Workflow fields:

- Request type: publication or unpublication.
- Review status.
- Writer display name.

Technical state:

- Contentful version is tracked internally for optimistic concurrency and MUST NOT be a manually editable form field.
- Review notes are deferred until the review workflow has a clear user-facing need.

Validation rules:

- `title` must be non-empty.
- `slug` must be non-empty, URL-safe, and unique among articles.
- `description` must be non-empty and short enough for cards and meta descriptions.
- `body` must be non-empty Markdown.
- `author` must reference an allowed author profile.
- `thumbnail`, when present, must provide the Cloudinary values currently consumed by list and detail views.
- `alt` should be present when `thumbnail` is present.
- Writer saves must not publish content.
- Owner lifecycle actions must be authorized server-side.
- Saves must include Contentful version handling to avoid silently overwriting newer edits.

## 1.6 Admin UI Direction

The current admin direction is dashboard-first, not editor-first.

Required first screen:

- Sidebar navigation for Dashboard, Articles, Drafts, Review, Media, and Settings.
- Topbar with search and session state.
- Status summary cards for published articles, drafts/unpublished articles, and review requests.
- Article table with title, status, tags, create date, author, and role-appropriate actions.
- Metrics area prepared for page views, but not blocked on a metrics integration.

Visual target:

- Compact CMS layout with dense tables and clear operational affordances.
- Avoid public-site hero composition and decorative cards.
- Use cards only for metrics, repeated article rows, and framed editor/queue panels.
- Follow the existing site identity for colors, typography, spacing, and component language.
- Treat external CMS screenshots as structural references only; do not copy their red/accent palette or unrelated branding.

## 1.7 Cloudinary Baseline

The live Contentful editor uses a Cloudinary app/integration for Article images. The custom admin must replicate the outcome, not require manual public ID or URL copying.

Expected media flow:

- Writer chooses an existing image from the configured Cloudinary folder or uploads a new image.
- The admin backend authorizes the Cloudinary operation using server-side configuration.
- The returned Cloudinary metadata is stored in the Article thumbnail field.
- The public blog continues rendering images from Cloudinary.

Resolved implementation details:

- The Article media fields are treated as `thumbnail` for Cloudinary metadata and `alt` for accessibility text, matching the provided Contentful model references.
- Existing public rendering keeps compatibility with legacy `cloudinary` data while preferring `thumbnail`.
- The first Cloudinary upload mode is backend-mediated: the browser sends a selected image as a Data URI to the admin backend, and the backend signs the upload request using server-side Cloudinary credentials.
- Existing image selection uses a server-side Cloudinary Admin API request scoped to the configured folder.
- Required runtime configuration remains server-side and should use sanitized placeholder names in documentation: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and optional `CLOUDINARY_UPLOAD_FOLDER`.
