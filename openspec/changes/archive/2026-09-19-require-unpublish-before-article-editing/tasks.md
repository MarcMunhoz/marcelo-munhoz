## 1. Lock Article Edit Eligibility

- [x] 1.1 Add failing editorial-utility tests for draft, review, unpublished, published, changed, and request-overlay lifecycle combinations.
- [x] 1.2 Centralize edit eligibility on authoritative lifecycle state while preserving existing role and ownership rules.

## 2. Update Dashboard Actions

- [x] 2.1 Add failing dashboard and article-card tests that hide Edit for published and changed lifecycle states.
- [x] 2.2 Keep owner Unpublish and writer Request unpublication actions available for eligible live articles.
- [x] 2.3 Remove direct publish-changes actions for entries that still have a live published version.

## 3. Guard The Focused Editor

- [x] 3.1 Add failing route-level component tests for direct navigation to published and changed articles.
- [x] 3.2 Render the dedicated unpublish-before-editing state without mutable fields or Save controls for live articles.
- [x] 3.3 Add a client save precondition that rejects stale live lifecycle state with stable user feedback.
- [x] 3.4 Preserve article creation and eligible draft, review, and unpublished editing flows.

## 4. Enforce The Server Write Boundary

- [x] 4.1 Add failing Contentful facade and handler tests for update attempts against published and changed entries.
- [x] 4.2 Fetch the authoritative Contentful entry before updating an existing article and reject live lifecycle states before any write.
- [x] 4.3 Map the rejection to the established safe lifecycle-error response and stable unpublish-first message.
- [x] 4.4 Preserve update behavior and authorization checks for eligible non-live entries.

## 5. Verify Editorial Journeys

- [x] 5.1 Add browser coverage for an owner unpublishing before editing and for a writer requesting unpublication.
- [x] 5.2 Cover blocked direct editor routes and confirm no update request is sent for live articles.
- [x] 5.3 Run the focused unit and component suites, then the complete containerized test and coverage suite.
- [x] 5.4 Run containerized lint, production build, built-asset credential scan, and relevant browser journeys.
- [x] 5.5 Run strict OpenSpec validation, diff whitespace checks, and artifact sanitization before review.
