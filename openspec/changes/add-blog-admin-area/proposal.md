## Why

Blog administration currently depends on the Contentful web app, which keeps publishing workflows outside the website and makes guest writing cumbersome. Adding a protected admin area creates a focused editorial workflow for creating and reviewing articles while preserving Contentful as the source of truth and keeping the project on free plans where possible.

This change captures the decisions from GitHub issue #49: guest writers should be able to draft and request editorial actions, while the owner retains authority over publishing, unpublishing, archiving, and permanent deletion under the constraints of the Contentful Free plan.

## What Changes

- Add a protected blog administration area for article drafting, editing, review, and owner actions.
- Add server-side admin API routes separate from the existing public `/api/contentful/*` read API.
- Integrate server-side Contentful Management API access for article draft management and owner-only publication lifecycle actions.
- Keep Contentful Management API credentials exclusively in server-side runtime configuration.
- Support a free-plan-safe guest writer flow where writers create and edit drafts or submissions but do not receive broad destructive Contentful access.
- Add an owner review workflow for publication, unpublication requests, archiving, and permanent deletion.
- Preserve the existing public blog read behavior and Contentful Delivery API proxy contract.

## Capabilities

### New Capabilities

- `blog-admin`: Protected blog administration, writer submissions, owner review, server-side Contentful Management API operations, and free-plan editorial authorization behavior.

### Modified Capabilities

- None.

## Impact

- Affected frontend areas: routing, layout/navigation, new admin views, article editor UI, review queues, and authenticated admin states.
- Affected server/runtime areas: Netlify Functions, local middleware wrappers, server-side Contentful Management API client logic, environment configuration, and admin API error handling.
- Affected existing systems: Contentful remains the content repository; the current public Contentful Delivery API proxy remains the read path for published blog pages.
- Security impact: introduces authenticated write-capable server operations and a high-impact Contentful Management API token that must never be exposed to browser bundles, user-visible errors, logs intended for users, or GitHub/OpenSpec artifacts.
- Operational impact: keep the implementation compatible with Contentful Free plan limits and Netlify Free plan usage constraints; do not require paid Contentful custom roles for the first version.
