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

```text
Browser
  -> /api/contentful/*
  -> Netlify redirect
  -> app/netlify/functions/contentful.js
  -> app/middleware/contentfulProxy.js
  -> Contentful Delivery API
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

Use sanitized placeholder values in documentation and tickets, for example `<contentful-management-token>` or `<cloudinary-api-secret>`. Do not paste real values into README, OpenSpec artifacts, GitHub issues, PRs, commits, or logs intended for users.

Do not expose Contentful or Cloudinary credentials as `VITE_*` variables. The only supported frontend build variable is `VITE_API_BASE_URL`; all Contentful and Cloudinary credential variables above are server-side only.

`NODE_VERSION` and `NPM_VERSION` are Netlify build settings rather than application secrets. Keep them only if the Netlify build needs explicit version pinning.

## Local Development

Run package-manager commands inside the container context.

```bash
make dev
```

The development stack exposes:

- Frontend: `http://localhost:4242`
- Local API wrapper: `http://localhost:3000`
- Health check: `http://localhost:3000/healthz`

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

## Netlify Free Plan Notes

This project uses standard static hosting, redirects, environment variables, and ordinary request-triggered Netlify Functions. It does not require paid add-ons, databases, blob storage, AI features, background jobs, scheduled jobs, or auto-recharge.

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
