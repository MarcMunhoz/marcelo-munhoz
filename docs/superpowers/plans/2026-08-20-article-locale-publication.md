# Article Locale And Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin's PT/EN selection persist through Contentful publication and render the matching public byline without breaking legacy articles.

**Architecture:** The Contentful `locale` field is the sole stored source of truth. Admin reads use the Contentful environment default locale, writes mirror the selected value to all enabled locales while the field remains localized, and public reads use the stored field with text inference only for legacy entries. Contentful lifecycle normalization distinguishes fully published entries from entries with unpublished changes; private review requests pin `articleVersion`, become stale after later saves, and close after publication.

**Tech Stack:** Node.js 22, Vue 3, Quasar, Netlify Functions, Contentful Management and Delivery APIs, `node:test`.

**Spec:** `openspec/changes/improve-blog-admin-author-editor-ux/specs/blog-admin/spec.md` and `openspec/changes/refine-blog-admin-experience/specs/blog-admin/spec.md`

## Global Constraints

- Never read `.env`, `.env.*`, secrets, credentials, or private keys.
- Run package, test, lint, and build commands only in the existing container context; install nothing.
- Do not create a worktree, duplicate the development stack, or perform `git add`, commit, push, or pull.
- Keep creator-scoped editing and owner moderation boundaries unchanged.
- Treat locale save and article publication as separate operations.

---

### Task 1: Canonical Contentful Locale Contract

**Files:**
- Modify: `app/netlify/functions/contentfulAdminCore.js`
- Test: `app/tests/contentfulManagementFacade.test.js`
- Test: `app/tests/contentfulAdmin.test.js`

**Interfaces:**
- Consumes: Contentful `/locales` response and Article content-type fields.
- Produces: locale metadata containing `codes` and `defaultCode`; article payloads whose `fields.locale` values are identical for every enabled locale; normalized admin articles using the environment-default locale value.

- [ ] **Step 1: Write failing tests**

Add literal fixtures where `fields.locale` contains `{ "en-US": "en-US", "pt-BR": "pt-BR" }`. Assert that an environment whose default is `en-US` normalizes the article as `en-US`, even when the configured content locale is `pt-BR`. Add a save assertion expecting PT selection to produce:

```js
assert.deepEqual(body.fields.locale, {
  "en-US": "pt-BR",
  "pt-BR": "pt-BR",
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run in the existing Docker image:

```bash
rtk docker run --rm -v "$PWD/app:/app" -w /app marcelo-munhoz_img \
  npm test -- '--test-name-pattern=canonical editorial locale|writes editorial locale to every enabled locale'
```

Expected: the canonical-read test reports `pt-BR` instead of `en-US`, or the write test omits an enabled locale.

- [ ] **Step 3: Implement the minimal canonical read/write behavior**

Replace field-ID-only inspection with content-type field metadata sufficient to identify the `locale` field. Fetch environment locale metadata once per article operation. Pass `defaultCode` to article normalization and all `codes` to locale-field serialization. Keep ordinary article prose normalization on the configured content locale.

- [ ] **Step 4: Remove the tag storage branch**

Delete `ARTICLE_LANGUAGE_TAGS`, language-tag creation, filtering, and public/admin tag-based locale resolution. If the Article model lacks `locale`, omit storage and preserve legacy text inference on public rendering.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the Task 1 command plus all `contentfulManagementFacade` and `contentfulAdmin` tests. Expected: all pass with no warnings from application code.

### Task 2: Changed Contentful Lifecycle

**Files:**
- Modify: `app/netlify/functions/contentfulAdminCore.js`
- Modify: `app/src/utils/adminDashboard.js`
- Test: `app/tests/contentfulAdmin.test.js`
- Test: `app/tests/adminFrontend.test.js`

**Interfaces:**
- Consumes: `sys.version`, `sys.publishedVersion`, and `sys.archivedVersion`.
- Produces: normalized status `changed` when an entry has a published version plus a newer draft; `canPrepareReviewAction(article, session)` and `canOwnerPublishAction(article, session)` eligibility for changed entries.

- [ ] **Step 1: Write failing lifecycle tests**

Use literal Contentful sys fixtures:

```js
{ version: 8, publishedVersion: 7 } // published
{ version: 9, publishedVersion: 7 } // changed
```

Assert that the first is `published`, the second is `changed`, a writer can submit their changed article for review, and an owner can publish an owned changed article but another owner cannot edit its body.

- [ ] **Step 2: Run focused tests and verify RED**

Run tests matching `changed article|unpublished changes`. Expected: current code returns `published` and action eligibility is false.

- [ ] **Step 3: Implement minimal status and action behavior**

Update entry status normalization using Contentful version semantics. Add `changed: "Unpublished changes"` to `statusLabel()`. Include `changed` in creator edit eligibility and writer review eligibility. Include `changed` in owner publish eligibility without widening body-edit authorization.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run all admin backend and frontend tests. Expected: all pass.

- [ ] **Step 5: Write failing review-integrity tests**

Assert that a publication request stores literal `articleVersion: 9`, that a request for version 9 does not overlay lifecycle status when the current article is version 10, and that publishing version 9 updates the matching request status to `closed`.

- [ ] **Step 6: Implement version-pinned review state**

Normalize `lifecycleStatus` separately from `reviewStatus`. Include `articleVersion` in private workflow payloads and normalization, reject stale requests during dashboard reconciliation, and close the matching open request after a successful publish. Require the Contentful `blogEditorialRequest.articleVersion` field to be a non-localized Integer and return a user-safe workflow configuration error when it is unavailable.

- [ ] **Step 7: Run review-integrity tests and verify GREEN**

Run all management facade, admin handler, and admin frontend tests. Expected: all pass.

### Task 3: Admin Publication Feedback

**Files:**
- Modify: `app/src/pages/Admin.vue`
- Modify: `app/src/pages/AdminArticleEditor.vue`
- Modify: `app/src/utils/adminDashboard.js`
- Test: `app/tests/adminFrontend.test.js`

**Interfaces:**
- Consumes: normalized `changed` status and existing publish API.
- Produces: `Publish changes` owner action and truthful post-save editor state.

- [ ] **Step 1: Write failing UI behavior tests**

Assert that changed owner articles expose a publish action labeled `Publish changes`, writer-owned changed articles expose review submission, and saving a published article transitions local display state to `changed` rather than claiming the public article was updated.

- [ ] **Step 2: Run focused tests and verify RED**

Expected: no changed label/action exists and save preserves `published`.

- [ ] **Step 3: Implement minimal UI behavior**

Update dashboard action copy and editor save state. Reuse the existing authenticated publish endpoint and its Contentful version header; do not auto-publish on save.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run `app/tests/adminFrontend.test.js`. Expected: all pass.

### Task 4: Public Locale Contract And Legacy Fallback

**Files:**
- Modify: `app/netlify/functions/contentfulProxyCore.js`
- Modify: `app/src/utils/articleDates.js`
- Test: `app/tests/contentfulProxy.test.js`
- Test: `app/tests/adminFrontend.test.js`

**Interfaces:**
- Consumes: public Article `fields.locale` when present.
- Produces: unchanged public Article payload with explicit locale; conservative text inference only when locale is absent.

- [ ] **Step 1: Write failing public contract tests**

Assert that PT and EN explicit fields pass through unchanged, language tags do not synthesize or override `fields.locale`, Portuguese legacy text infers PT, and `what-id-learned-last-years`-style legacy English text infers EN.

- [ ] **Step 2: Run focused tests and verify RED**

Expected: current proxy synthesizes locale from `article-lang-*` tags.

- [ ] **Step 3: Implement minimal public behavior**

Remove tag transformation from the proxy. Keep `articleLocaleFromArticle()` precedence as explicit field first and text inference second.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run proxy and frontend locale tests. Expected: all pass.

### Task 5: End-To-End Verification And OpenSpec Completion

**Files:**
- Modify: `app/tests/contentfulManagementFacade.test.js`
- Modify: `openspec/changes/improve-blog-admin-author-editor-ux/tasks.md`
- Modify: `openspec/changes/refine-blog-admin-experience/tasks.md`
- Modify: operational notes under both change directories as required.

**Interfaces:**
- Consumes: completed Tasks 1-4.
- Produces: regression proof and completed local OpenSpec tasks; staging tasks remain open until production-like smoke is actually performed.

- [x] **Step 1: Add the round-trip regression test**

Create one controlled fixture that passes a PT selection through article payload construction, Contentful localized storage, changed-state normalization, publication response, public field delivery, and Portuguese byline labels. Add the corresponding EN case.

- [x] **Step 2: Run the full verification suite**

Run `npm test`, `npm run lint`, `npm run build`, and `npm run scan:build-credentials` in the existing Docker image. Run strict validation for both OpenSpec changes.

- [x] **Step 3: Update task status and operational notes**

Mark only tasks proven complete. Document that existing localized `locale` values must be reconciled and published before disabling field localization in Contentful. Document the required private workflow field `articleVersion` as a non-localized Integer. Keep staging smoke tasks unchecked until verified against disposable content.

- [x] **Step 4: Review the working tree**

Run `rtk git diff --check`, inspect `rtk git diff`, and verify no sensitive or absolute local data appears in changed artifacts.

- [ ] **Step 5: Stop before Git history or remote operations**

Report the verified diff and request separate explicit authorization before any commit. Synchronize each OpenSpec change before archival, and archive only after its remaining staging task is genuinely complete.
