[![Netlify Status](https://api.netlify.com/api/v1/badges/4c287ef7-8060-480b-9aa4-42c4704b1c13/deploy-status)](https://app.netlify.com/sites/marcelomunhoz/deploys)
![Node](https://img.shields.io/badge/node-%3E%3D22.22.0-339933?logo=node.js&logoColor=white)
![Vue](https://img.shields.io/badge/vue-3.5-42b883?logo=vue.js&logoColor=white)
![Quasar](https://img.shields.io/badge/quasar-2.20-1976d2?logo=quasar&logoColor=white)
![Netlify Functions](https://img.shields.io/badge/netlify-functions-00ad9f?logo=netlify&logoColor=white)
![Tests](https://img.shields.io/badge/tests-node%20--test-2ea44f)

# Marcelo Munhoz Website

Personal website built with Vue 3, Quasar, Vite, Tailwind CSS, Contentful, Cloudinary, and Netlify.

The frontend and blog API are deployed together on Netlify. Browser requests use same-origin `/api/contentful/*` routes, and Netlify redirects those requests to a server-side Function that talks to Contentful. Contentful credentials stay out of browser bundles.

## Architecture

Public blog reads and admin writes use separate server-side boundaries.

```text
Browser
  -> /api/contentful/*
  -> Netlify redirect
  -> app/netlify/functions/contentful.js
  -> app/middleware/contentfulProxy.js
  -> Contentful Delivery API
```

The admin API is authenticated and write-capable:

```text
Authenticated browser session
  -> /api/admin/contentful/*
  -> Netlify redirect
  -> app/netlify/functions/contentful-admin.js
  -> server-side admin facade
  -> Contentful Management API and Cloudinary Admin/Upload APIs
```

Local development uses the same shared proxy behavior:

```text
Browser on :4242
  -> /api/contentful/*
  -> Quasar dev proxy
  -> Express local wrapper on :3000
  -> app/middleware/contentfulProxy.js
  -> Contentful Delivery API
```

Local admin requests use a separate dev proxy for `/api/admin/contentful/*`, then the same server-side admin routing used by the Function wrapper.

The public `/api/contentful/*` proxy remains read-only and is used by public blog pages. It must not expose create, edit, publish, unpublish, archive, delete, Cloudinary upload, or arbitrary upstream proxy behavior. The admin `/api/admin/contentful/*` surface is the only path for Contentful Management API mutations and Cloudinary media operations.

## Project Layout

- `app/src/`: Vue/Quasar application source.
- `app/middleware/`: local Express wrapper and shared Contentful proxy logic.
- `app/netlify/functions/`: Netlify Functions entrypoints.
- `app/netlify.toml`: Netlify redirects, SPA fallback, and security headers.
- `app/tests/`: deterministic Node test suite.
- `openspec/`: specification-driven change history and active changes.

## Environment Variables

Configure these variables in Netlify. Keep Function-scoped values in the server/runtime environment only, not in frontend build variables:

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `CONTENTFUL_SPACE_ID` | Yes | Functions | Contentful space used by the blog API. |
| `CONTENTFUL_DELIVERY_KEY` | Yes | Functions | Contentful delivery token used by the server-side proxy. |
| `CONTENTFUL_MANAGEMENT_KEY` or `CONTENTFUL_MANAGEMENT_TOKEN` | Yes for `/admin` writes | Functions | Contentful Management API token used only by the admin API facade. |
| `CONTENTFUL_ENVIRONMENT_ID` | No | Functions | Contentful environment for admin writes. Defaults to `master`. |
| `CONTENTFUL_DEFAULT_LOCALE` | No | Functions | Locale used for localized admin article fields. Defaults to `en-US`. |
| `CLOUDINARY_CLOUD_NAME` | Yes for admin media | Functions | Cloudinary cloud used by the server-side media facade. |
| `CLOUDINARY_API_KEY` | Yes for admin media | Functions | Cloudinary API key used only by the server-side media facade. |
| `CLOUDINARY_API_SECRET` | Yes for admin media | Functions | Cloudinary API secret used only by the server-side media facade. |
| `CLOUDINARY_UPLOAD_FOLDER` or `CLOUDINARY_FOLDER` | No | Functions | Folder/prefix used by the admin media picker and upload flow. |
| `VITE_API_BASE_URL` | No | Builds | Explicit frontend API override. Leave unset for normal Netlify and local usage. |
| `VITE_API_URL` | No | None | Legacy variable. The app ignores it; remove it from Netlify and local environments. |

Do not mark `CLOUDINARY_UPLOAD_FOLDER` or `CLOUDINARY_FOLDER` as secret values in Netlify. They are public path prefixes that can appear in Cloudinary image URLs. The build config omits those keys from Netlify secret scanning so real credential scanning can stay enabled.

The Cloudinary API key used by the admin media facade must belong to the same cloud as the Media Library and needs the `Master Admin` role. The `Media Library User` role can authenticate but does not provide enough access for the Admin API resource listing used by `/api/admin/contentful/media/assets`.

Use sanitized placeholder values in documentation and tickets, for example `<contentful-management-token>` or `<cloudinary-api-secret>`. Do not paste real values into README, OpenSpec artifacts, GitHub issues, PRs, commits, or logs intended for users.

Do not expose Contentful or Cloudinary credentials as `VITE_*` variables. The only supported frontend build variable is `VITE_API_BASE_URL`; all Contentful and Cloudinary credential variables above are server-side only.

`NODE_VERSION` and `NPM_VERSION` are Netlify build settings rather than application secrets. Keep them only if the Netlify build needs explicit version pinning.

For local or Netlify setup, use placeholders when documenting values:

```text
CONTENTFUL_SPACE_ID=<contentful-space-id>
CONTENTFUL_DELIVERY_KEY=<contentful-delivery-token>
CONTENTFUL_MANAGEMENT_KEY=<contentful-management-token>
CONTENTFUL_ENVIRONMENT_ID=master
CONTENTFUL_DEFAULT_LOCALE=pt-BR
CLOUDINARY_CLOUD_NAME=<cloudinary-cloud-name>
CLOUDINARY_API_KEY=<cloudinary-api-key>
CLOUDINARY_API_SECRET=<cloudinary-api-secret>
CLOUDINARY_UPLOAD_FOLDER=<cloudinary-folder>
```

`CONTENTFUL_DEFAULT_LOCALE=pt-BR` is supported and should be preferred for this project unless the Contentful space is intentionally moved to another default locale.

## Blog Admin

`/admin` is a compact CMS-style area for article drafting, review, and owner lifecycle actions. It is not a generic Contentful console. Contentful remains the content repository, Cloudinary remains the image host, and the website backend provides a narrow workflow-oriented API.

Admin authentication uses Netlify Identity in deployed environments. Registration should stay invite-only. Authorization is represented by server-verified roles:

| Role | Allowed workflow |
| --- | --- |
| `writer` | Create and edit permitted drafts or submissions, select or upload Cloudinary thumbnail images through the admin API, submit drafts for owner review, and request unpublication for eligible published articles. |
| `owner` | Edit only articles with a trusted creator match to the owner account, plus publish, unpublish, archive, and permanently delete articles through owner-only server routes. |

Frontend role checks only shape the UI. The admin backend must still reject unauthenticated requests, writer attempts to run owner-only lifecycle actions, and article body edits without a trusted `writerSubject` or Contentful Author entry match before calling Contentful or Cloudinary.

The admin dashboard is the first `/admin` screen. It loads real article rows, status cards, and owner review queues from `/api/admin/contentful/articles`. The dashboard should not use static sample articles at runtime; fixtures belong in deterministic tests only. Page-view metrics are optional and may remain unavailable until a free-compatible analytics source is connected.

Editorial workflow records are stored separately from public `article` entries, using the admin-only workflow content type selected for this change. That separation keeps writer identity and review state out of the public blog read API.

### Contentful Editorial Fields

The Article `locale` field is the only persisted source of article language and accepts `pt-BR` or `en-US`. While that field is localized in Contentful, the admin mirrors the selected value into every enabled locale slot so Management API reads and the default Delivery API response agree. Existing articles without a stored value keep a conservative text-and-slug fallback; `article-lang-*` tags are legacy metadata and are not used to determine language.

Before deploying the versioned review workflow, add `articleVersion` to the private `blogEditorialRequest` content type with these settings:

- Type: `Integer`
- Localization: disabled
- Public use: none; the field is admin workflow state

The admin rejects new review and unpublication requests when that field is missing or configured differently. An open request applies only to the exact Contentful article version stored in `articleVersion`; later saves make it stale, and publishing the reviewed version closes it.

For the optional Article model migration, first open each legacy article in the admin, select the correct PT or EN value, save it, and explicitly publish the resulting `Unpublished changes`. Confirm the public article byline language, including `what-id-learned-last-years`, before disabling localization on Article `locale`. Do not disable localization until every enabled locale slot has been reconciled and published.

Cloudinary media management is backend-mediated. The browser can request image listing or upload through the admin API, but Cloudinary API credentials and upload signatures stay server-side. The returned Cloudinary metadata is saved to the article thumbnail field, while alt text remains a separate article field.

Because Cloudinary exposes only `Master Admin` and `Media Library User` for the configured account, use `Master Admin` for the server-side API credentials. Keep those credentials scoped to Netlify Functions/runtime only and never expose them through frontend build variables.

### Guest Writer Access

Do not grant normal guest writers broad Contentful Editor access on the Free plan. Contentful Free plan roles are too coarse for this workflow and can allow actions outside the custom admin permission model. Guest writers should normally receive website admin access only, with the `writer` role represented in Netlify Identity and enforced by the server-side admin API.

The owner account may retain broad Contentful access for direct maintenance. If a temporary Contentful invitation is ever needed for a collaborator, treat it as an exceptional manual operation and remove it when the task is done.

## Local Development

Run package-manager commands inside the container context.

```bash
make dev
```

The development stack exposes:

- Frontend: `http://localhost:4242`
- Local API wrapper: `http://localhost:3000`
- Health check: `http://localhost:3000/healthz`

Local `/admin` uses a development-only preview session so the admin API can be tested without Netlify Identity running locally. The default preview role is `owner`, which can exercise writer and owner workflows. To test writer-only behavior, set the preview role in the browser console and reload:

```js
localStorage.setItem("admin.previewRole", "writer");
```

Restore full local admin access with:

```js
localStorage.setItem("admin.previewRole", "owner");
```

The preview role is sent to the local middleware with `x-admin-preview-role` only in the dev flow. The deployed Netlify Function ignores that header and requires a real Netlify Identity session.

Useful commands:

```bash
make logs
make restart
make stop
make down
```

`make down` removes local generated container artifacts, including `app/node_modules` and `app/.quasar`.

## Validation

Run validation inside the container:

```bash
docker compose exec app npm test
docker compose exec app npm run lint
docker compose exec app npm run build
docker compose exec app npm run scan:build-credentials
openspec validate add-blog-admin-area --strict
```

For a clean build validation without local `.env` files, use a temporary copy that excludes `.env`, `.env.*`, `node_modules`, `dist`, and `.quasar`, then run `npm ci`, `npm test`, `npm run lint`, and `npm run build` inside a Node container.

## Netlify Deployment

`app/netlify.toml` applies API redirects before the SPA fallback:

```toml
[[redirects]]
  from = "/api/admin/contentful/*"
  to = "/.netlify/functions/contentful-admin/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/api/contentful/*"
  to = "/.netlify/functions/contentful/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "index.html"
  status = 200
```

The Contentful API contract is:

- `/api/contentful/entries?page=<page>`
- `/api/contentful/tags`
- `/api/contentful/tagged?page=<page>&tag=<tag>`
- `/api/contentful/article/<slug>`

Optional public smoke checks after a Netlify deploy:

```bash
curl "https://<netlify-site>/api/contentful/entries?page=1"
curl "https://<netlify-site>/api/contentful/tags"
```

Optional live admin smoke checks are separate from routine automated validation. Run them only against a deployed Netlify site with provider credentials configured in Netlify and an invited authenticated writer or owner session:

- Writer session: open `/admin`, create a draft with placeholder article text, select or upload a Cloudinary thumbnail, save the draft, and submit it for owner review.
- Owner session: open `/admin`, confirm the submitted article appears in the owner queue, then publish, unpublish, archive, or delete only disposable test content.
- Admin Function: confirm `/api/admin/contentful/*` requests require authentication and return user-safe JSON errors when called without a session.

Do not paste live Contentful, Cloudinary, or Netlify Identity tokens into local files, docs, GitHub artifacts, OpenSpec artifacts, or smoke-check notes.

## Admin Rollback

The public blog read path is independent from the admin path, so rollback should preserve `/api/contentful/*` and public article rendering.

To disable the admin surface without changing public blog reads:

1. Hide or remove the `/admin` navigation entry in the frontend.
2. Disable or remove the `/admin` route from the frontend router if the route should be unreachable.
3. Remove or comment the `/api/admin/contentful/*` redirect in `app/netlify.toml`, leaving `/api/contentful/*` unchanged.
4. Remove the admin-only server-side runtime variables from Netlify if they are no longer needed.
5. Keep `CONTENTFUL_SPACE_ID` and `CONTENTFUL_DELIVERY_KEY` configured so public blog pages continue reading published entries.

If only the UI is being rolled back temporarily, keeping the admin Function code deployed is acceptable only when Netlify Identity still protects it and the route is not advertised. For a stronger rollback, remove the admin redirect so requests cannot reach the Function path through the public admin API prefix.

## Netlify Free Plan Notes

This project uses standard static hosting, redirects, environment variables, and ordinary request-triggered Netlify Functions. It does not require paid add-ons, databases, blob storage, AI features, background jobs, scheduled jobs, or auto-recharge.

The admin implementation is designed for free-plan operation: guest permissions are enforced in the app, editorial workflow records stay in Contentful, Cloudinary operations are request-triggered, and page-view metrics remain optional until a free-compatible source exists.

If auto-recharge is disabled, unusually high usage can still exhaust free monthly credits and pause the site instead of billing automatically.

## Troubleshooting

### Blog requests point to the wrong host

Remove legacy `VITE_API_URL` values from local and Netlify environments. The app ignores that variable, but removing stale configuration prevents confusion.

Normal local and production requests should target `/api/contentful/*`.

### API route returns the SPA HTML

Check `app/netlify.toml` route order. `/api/contentful/*` must appear before the catch-all `/*` redirect.

### Public Function returns a configuration error

Confirm `CONTENTFUL_SPACE_ID` and `CONTENTFUL_DELIVERY_KEY` are configured for Netlify Functions.

### Admin Function returns a configuration error

Confirm the admin server-side runtime variables are configured in Netlify Functions using placeholders in documentation and real values only in the provider environment. Do not add `VITE_` versions of Contentful Management or Cloudinary credentials.

## Reference

- [Quasar Vite configuration](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Contentful JavaScript SDK](https://github.com/contentful/contentful.js)
