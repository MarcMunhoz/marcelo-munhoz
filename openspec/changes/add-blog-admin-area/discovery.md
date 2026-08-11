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
| Card image | optional `article.fields.cloudinary[0].public_id` |
| Detail/social image | optional `article.fields.cloudinary[0].url` |
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

The first article editor should support the fields needed by the existing public blog, plus minimal review controls:

Article fields:

- `title`: required plain text.
- `slug`: required URL-safe unique slug.
- `description`: required short summary.
- `body`: required Markdown content.
- `createAt`: optional display date; default to current date when creating.
- `author`: required owner-managed author reference.
- `cloudinary`: optional image metadata compatible with the existing `public_id` and `url` usage.
- `metadata.tags`: optional Contentful tag selection.

Workflow fields:

- Request type: publication or unpublication.
- Review status.
- Writer display name.
- Optional notes.

Validation rules:

- `title` must be non-empty.
- `slug` must be non-empty, URL-safe, and unique among articles.
- `description` must be non-empty and short enough for cards and meta descriptions.
- `body` must be non-empty Markdown.
- `author` must reference an allowed author profile.
- `cloudinary`, when present, must provide the values currently consumed by list and detail views.
- Writer saves must not publish content.
- Owner lifecycle actions must be authorized server-side.
- Saves must include Contentful version handling to avoid silently overwriting newer edits.
