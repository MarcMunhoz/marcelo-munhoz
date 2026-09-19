## Context

The admin currently derives a display status from Contentful state plus editorial requests, and the same published entry can still be opened and updated as a newer draft version. The dashboard, focused editor, client API, and server-side Contentful facade all participate in this workflow, so a UI-only restriction would be bypassable. See `proposal.md` for motivation and the `blog-admin` delta for the required behavior.

## Goals / Non-Goals

**Goals:**

- Base edit eligibility on the authoritative lifecycle state rather than a request-overlay display status.
- Give users clear next actions: owners unpublish, while writers request unpublication.
- Enforce the invariant at both the focused editor and the server-side write boundary.
- Preserve current creation, draft, review, and unpublished editing flows.

**Non-Goals:**

- Automatically unpublish an article when an edit is attempted.
- Change role ownership rules or give writers direct unpublish authority.
- Migrate or discard unpublished changes that already exist in Contentful.
- Implement the behavior as part of this planning change.

## Decisions

### Treat published and changed lifecycle states as live

Edit eligibility will use the authoritative `lifecycleStatus`, with `published` and `changed` both considered live. A display status such as review or unpublication requested can overlay that lifecycle without making the underlying entry editable.

Using the displayed status was rejected because an editorial request can conceal that Contentful still serves a published version.

### Make the dashboard the lifecycle transition surface

For live articles, the dashboard will hide Edit. Owners receive Unpublish and eligible writers receive Request unpublication. After Contentful reports `unpublished`, the existing Edit action can return according to ownership and role rules.

Automatically chaining unpublication into Edit was rejected because taking public content offline is a distinct, consequential action that must remain explicit.

### Render a dedicated blocked editor state

Direct navigation to a live article edit route will load enough authoritative metadata to identify the lifecycle, then render a dedicated “Unpublish before editing” state without mounting mutable fields or Save controls. This keeps bookmarked or manually entered routes understandable while preventing accidental edits.

Redirecting silently was rejected because it would obscure why editing is unavailable and make stale links harder to diagnose.

### Enforce the invariant before every write

The client save path will guard the loaded lifecycle for immediate feedback. Independently, the server-side Contentful management facade will fetch the current entry before an update and reject it when Contentful indicates a published version or changes over a published version. The handler will expose this as the established safe lifecycle-error response with a stable user-facing message.

Relying on the client alone was rejected because direct API calls and stale browser state could bypass it. Relying only on the server was also rejected because the editor would expose a workflow guaranteed to fail late.

### Keep the existing data model

No new Contentful fields or editorial request types are required. The change reuses existing lifecycle metadata, unpublish operations, and unpublication requests, limiting deployment and rollback risk.

## Risks / Trade-offs

- [A lifecycle status becomes stale between load and save] → Fetch and validate the current Contentful entry at the server write boundary.
- [Existing entries already have unpublished changes over a live version] → Treat them as live and require explicit unpublication before any further edit; do not mutate them during deployment.
- [A request overlay is mistaken for an editable state] → Centralize eligibility around authoritative `lifecycleStatus` and cover overlay combinations in tests.
- [Users perceive the removed Edit action as missing functionality] → Keep the appropriate unpublish or request-unpublication action visible and explain the prerequisite on direct routes.

## Migration Plan

1. Add failing regression coverage for lifecycle eligibility, dashboard actions, direct editor routes, and server update rejection.
2. Introduce the shared live-state rule and update the dashboard and focused editor.
3. Add the independent client save guard and authoritative server precondition.
4. Run unit, component, browser, lint, build, security-scan, and strict OpenSpec gates.
5. Deploy through the existing preview workflow and verify owner and writer paths before production integration.

Rollback consists of reverting the application commits. No content-model or persisted-data migration needs reversal.

