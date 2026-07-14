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

Configure these variables in Netlify for the Contentful Function:

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `CONTENTFUL_SPACE_ID` | Yes | Functions | Contentful space used by the blog API. |
| `CONTENTFUL_DELIVERY_KEY` | Yes | Functions | Contentful delivery token used by the server-side proxy. |
| `VITE_API_BASE_URL` | No | Builds | Explicit frontend API override. Leave unset for normal Netlify and local usage. |
| `VITE_API_URL` | No | None | Legacy variable. The app ignores it; remove it from Netlify and local environments. |

Do not expose Contentful credentials as `VITE_*` variables. `CONTENTFUL_SPACE_ID` and `CONTENTFUL_DELIVERY_KEY` are server-side only.

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
openspec validate migrate-contentful-proxy-to-netlify-functions --strict
```

For a clean build validation without local `.env` files, use a temporary copy that excludes `.env`, `.env.*`, `node_modules`, `dist`, and `.quasar`, then run `npm ci`, `npm test`, `npm run lint`, and `npm run build` inside a Node container.

## Netlify Deployment

`app/netlify.toml` applies API redirects before the SPA fallback:

```toml
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

Optional smoke checks after a Netlify deploy:

```bash
curl "https://<netlify-site>/api/contentful/entries?page=1"
curl "https://<netlify-site>/api/contentful/tags"
```

## Netlify Free Plan Notes

This project uses standard static hosting, redirects, environment variables, and ordinary request-triggered Netlify Functions. It does not require paid add-ons, databases, blob storage, AI features, background jobs, scheduled jobs, or auto-recharge.

If auto-recharge is disabled, unusually high usage can still exhaust free monthly credits and pause the site instead of billing automatically.

## Troubleshooting

### Blog requests point to the wrong host

Remove legacy `VITE_API_URL` values from local and Netlify environments. The app ignores that variable, but removing stale configuration prevents confusion.

Normal local and production requests should target `/api/contentful/*`.

### API route returns the SPA HTML

Check `app/netlify.toml` route order. `/api/contentful/*` must appear before the catch-all `/*` redirect.

### Function returns a configuration error

Confirm `CONTENTFUL_SPACE_ID` and `CONTENTFUL_DELIVERY_KEY` are configured for Netlify Functions.

## Reference

- [Quasar Vite configuration](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Contentful JavaScript SDK](https://github.com/contentful/contentful.js)
