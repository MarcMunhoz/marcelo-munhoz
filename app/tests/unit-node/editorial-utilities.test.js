import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { adminUserMessage, AdminApiError } from "../../src/utils/adminApi.js";
import {
  applyArticleResponseToForm,
  articleToForm,
  authorProfileToForm,
  buildAuthorProfilePayload,
  buildArticlePayload,
  canArchiveArticleAction,
  canConfirmArticleDeletion,
  canEditArticleAction,
  canOwnerPublishAction,
  canOwnerUnpublishAction,
  canPrepareReviewAction,
  canRequestUnpublicationAction,
  canUnarchiveArticleAction,
  createEmptyArticleForm,
  createEmptyAuthorProfileForm,
  filterAdminArticles,
  formatMarkdownSelection,
  mediaLibraryState,
  normalizeAdminArticleDisplay,
  normalizeMediaAssetDisplay,
  ownerReviewQueues,
  reconcileAdminDashboardData,
  removeArticleById,
  slugFromTitle,
  statusLabel,
  summarizeArticleStatuses,
  updateArticleStatusById,
  updateAuthorGravatarDraft,
} from "../../src/utils/adminDashboard.js";
import { buildMediaEditorOptions, normalizeMediaEditorExport, openCloudinaryMediaEditor } from "../../src/utils/cloudinaryMediaEditor.js";
import { canDeleteManagedTag, normalizeEditorialTagOptions, toggleArticleTagFilter } from "../../src/utils/adminTags.js";
import { publicAuthorProfile } from "../../src/utils/authorProfiles.js";
import { articleBylineLabels, publicArticleDates } from "../../src/utils/articleDates.js";
import { articleCardImageUrl, articleHeroImageUrl } from "../../src/utils/contentfulImages.js";

describe("editorial utilities", () => {
  it("normalizes empty admin dashboard responses into stable frontend state", () => {
    assert.deepEqual(reconcileAdminDashboardData({}), {
      articles: [],
      summary: { published: 0, drafts: 0, review: 0, archived: 0, total: 0 },
      reviewRequests: [],
    });
  });

  it("formats admin article dates for editorial display", () => {
    assert.equal(normalizeAdminArticleDisplay({ createAt: "2026-07-25T14:38:24.390Z" }).displayDate, "July 25, 2026");
    assert.equal(normalizeAdminArticleDisplay({ createAt: "2026-08-11" }).displayDate, "August 11, 2026");
    assert.equal(normalizeAdminArticleDisplay({ createAt: "" }).displayDate, "No date");
  });

  it("resolves admin author display without exposing entry ids as primary values", () => {
    assert.equal(
      normalizeAdminArticleDisplay({
        author: "Marcelo Munhoz",
        authorEntryId: "cvs0Tg41EntryId",
      }).displayAuthor,
      "Marcelo Munhoz"
    );
    assert.equal(
      normalizeAdminArticleDisplay({
        author: "cvs0Tg41EntryId",
        authorEntryId: "cvs0Tg41EntryId",
      }).displayAuthor,
      "Unknown author"
    );
    assert.equal(normalizeAdminArticleDisplay({ authorEntryId: "cvs0Tg41EntryId" }).displayAuthor, "Unknown author");
  });

  it("builds structured admin tag display and thumbnail preview metadata", () => {
    const article = normalizeAdminArticleDisplay({
      tags: ["admin", "contentful"],
      thumbnail: {
        public_id: "marcelo-munhoz-website/admin",
        secure_url: "https://example.test/admin.jpg",
      },
    });

    assert.deepEqual(article.displayTags, [
      { id: "admin", label: "admin" },
      { id: "contentful", label: "contentful" },
    ]);
    assert.equal(article.thumbnailPreviewUrl, "https://example.test/admin.jpg");
  });

  it("summarizes article status counts for the dashboard", () => {
    const summary = summarizeArticleStatuses([
      { status: "published" },
      { status: "draft" },
      { status: "unpublished" },
      { status: "changed" },
      { status: "review" },
      { status: "review" },
      { status: "archived" },
    ]);

    assert.deepEqual(summary, {
      published: 1,
      drafts: 3,
      review: 2,
      archived: 1,
      total: 7,
    });
    assert.equal(statusLabel("changed"), "Unpublished changes");
  });

  it("filters article table rows by search, status, tag, date, and author", () => {
    const rows = [
      { title: "Admin area", status: "draft", tags: ["vue", "cms"], createAt: "2026-08-11", author: "Marcelo" },
      { title: "Public blog", status: "published", tags: ["contentful"], createAt: "2026-08-10", author: "Guest" },
      { title: "Cloudinary upload", status: "review", tags: ["media"], createAt: "2026-08-11", author: "Marcelo" },
    ];

    const filtered = filterAdminArticles(rows, {
      search: "admin",
      status: "draft",
      tag: "cms",
      date: "2026-08-11",
      author: "Marcelo",
    });

    assert.deepEqual(filtered, [rows[0]]);
  });

  it("toggles an article tag filter without changing unrelated filters", () => {
    const filters = { search: "cloud", status: "published", tag: "career", date: "2026-08-11", author: "Marcelo" };

    assert.deepEqual(toggleArticleTagFilter(filters, "ai"), { ...filters, tag: "ai" });
    assert.deepEqual(toggleArticleTagFilter({ ...filters, tag: "ai" }, "ai"), { ...filters, tag: "" });
  });

  it("removes reserved language tags from administrative tag choices", () => {
    assert.deepEqual(
      normalizeEditorialTagOptions([
        { id: "ai", label: "AI" },
        { id: "article-lang-pt-br", label: "Article language: Portuguese" },
        { id: "article-lang-en-us", label: "Article language: English" },
      ]),
      [{ id: "ai", label: "AI" }]
    );
  });

  it("allows deletion only for tags with zero article usage", () => {
    assert.equal(canDeleteManagedTag({ articleCount: 0 }), true);
    assert.equal(canDeleteManagedTag({ articleCount: 1 }), false);
  });

  it("builds owner review queues for publication and unpublication requests", () => {
    const queues = ownerReviewQueues([
      { id: "review-1", title: "Ready article", status: "review", version: 4 },
      { id: "take-down-1", title: "Published article", status: "unpublicationRequested", version: 9 },
      { id: "draft-1", title: "Draft article", status: "draft", version: 2 },
    ]);

    assert.deepEqual(queues, {
      submissions: [
        { id: "review-1", title: "Ready article", status: "review", version: 4 },
        { id: "draft-1", title: "Draft article", status: "draft", version: 2 },
      ],
      unpublicationRequests: [{ id: "take-down-1", title: "Published article", status: "unpublicationRequested", version: 9 }],
    });
  });

  it("builds article payloads with hidden technical author, Cloudinary media, tag, and version state", () => {
    const payload = buildArticlePayload({
      title: "  New Admin  ",
      slug: "new-admin",
      description: "  Dashboard work  ",
      body: "# Body",
      createAt: "2026-08-11",
      locale: "en-US",
      thumbnail: { public_id: "marcelo-munhoz-website/image", secure_url: "https://example.test/image.jpg" },
      alt: "Admin screenshot",
      authorName: "Marcelo Munhoz",
      authorEntryId: "authorEntry",
      tagList: ["admin", "contentful"],
      version: 7,
      reviewNotes: "do not send",
    });

    assert.deepEqual(payload, {
      title: "New Admin",
      slug: "new-admin",
      description: "Dashboard work",
      body: "# Body",
      createAt: "2026-08-11T12:00:00.000Z",
      locale: "en-US",
      cloudinary: [{ public_id: "marcelo-munhoz-website/image", secure_url: "https://example.test/image.jpg" }],
      alt: "Admin screenshot",
      author: "authorEntry",
      tags: ["admin", "contentful"],
      version: 7,
    });
  });

  it("adds timezone-safe update timestamps only when saving existing article edits", () => {
    const newArticlePayload = buildArticlePayload({
      title: "New article",
      slug: "new-article",
      description: "Description",
      body: "Body",
      createAt: "2026-08-11",
      authorEntryId: "authorEntry",
    }, { now: () => new Date("2026-08-13T18:20:30.000Z") });
    const editPayload = buildArticlePayload({
      id: "article-1",
      title: "Existing article",
      slug: "existing-article",
      description: "Description",
      body: "Body",
      createAt: "2026-08-11",
      authorEntryId: "authorEntry",
      version: 7,
    }, { now: () => new Date("2026-08-13T18:20:30.000Z") });

    assert.equal(newArticlePayload.updatedAt, undefined);
    assert.equal(editPayload.createAt, "2026-08-11T12:00:00.000Z");
    assert.equal(editPayload.updatedAt, "2026-08-13T18:20:30.000Z");
  });

  it("defaults new article dates from the writer local calendar day", () => {
    const form = createEmptyArticleForm({
      now: () => new Date("2026-08-12T02:30:00.000Z"),
      timeZone: "America/Sao_Paulo",
    });

    assert.equal(form.createAt, "2026-08-11");
  });

  it("defaults and hydrates editable article language metadata", () => {
    assert.equal(createEmptyArticleForm().locale, "pt-BR");
    assert.equal(articleToForm({ title: "English article", locale: "en-US" }).locale, "en-US");
    assert.equal(articleToForm({ title: "During 9 years my career changed", body: "When I wrote about software" }).locale, "en-US");
    assert.equal(buildArticlePayload({ title: "PT", slug: "pt", description: "D", body: "B", createAt: "2026-08-11" }).locale, "pt-BR");
  });

  it("preserves complete Cloudinary asset metadata when building article payloads", () => {
    const payload = buildArticlePayload({
      title: "Image metadata",
      slug: "image-metadata",
      description: "Dashboard work",
      body: "# Body",
      createAt: "2026-08-11",
      thumbnail: {
        public_id: "marcelo-munhoz-website/image",
        secure_url: "https://example.test/image.jpg",
        url: "https://example.test/image.jpg",
        width: 1600,
        height: 900,
        format: "jpg",
        resource_type: "image",
        type: "upload",
      },
      authorEntryId: "authorEntry",
      version: 7,
    });

    assert.deepEqual(payload.cloudinary, [
      {
        public_id: "marcelo-munhoz-website/image",
        secure_url: "https://example.test/image.jpg",
        url: "https://example.test/image.jpg",
        width: 1600,
        height: 900,
        format: "jpg",
        resource_type: "image",
        type: "upload",
      },
    ]);
  });

  it("formats Markdown around selected text or inserts a placeholder at the cursor", () => {
    assert.deepEqual(
      formatMarkdownSelection({
        value: "Use selected words here",
        selectionStart: 4,
        selectionEnd: 18,
        before: "**",
        after: "**",
        placeholder: "bold text",
      }),
      {
        value: "Use **selected words** here",
        selectionStart: 6,
        selectionEnd: 20,
      }
    );

    assert.deepEqual(
      formatMarkdownSelection({
        value: "Before after",
        selectionStart: 7,
        selectionEnd: 7,
        before: "[",
        after: "](https://)",
        placeholder: "link text",
      }),
      {
        value: "Before [link text](https://)after",
        selectionStart: 8,
        selectionEnd: 17,
      }
    );

    assert.deepEqual(
      formatMarkdownSelection({
        value: "item 1\nitem 2\nitem 3",
        selectionStart: 0,
        selectionEnd: 20,
        before: "- ",
        placeholder: "List item",
      }),
      {
        value: "- item 1\n- item 2\n- item 3",
        selectionStart: 2,
        selectionEnd: 26,
      }
    );
  });

  it("derives URL-safe slugs from new article titles", () => {
    assert.equal(slugFromTitle("Inteligência Artificial para developers e creators"), "inteligencia-artificial-para-developers-e-creators");
    assert.equal(slugFromTitle("  Vue, Contentful & Cloudinary!  "), "vue-contentful-cloudinary");
    assert.equal(slugFromTitle("Inteligência Artificial para developers e creators 123456"), "inteligencia-artificial-para-developers-e-creators");
  });

  it("creates new article forms with focused-editor display fields and internal technical state", () => {
    const form = createEmptyArticleForm();

    assert.equal(form.authorName, "");
    assert.equal(form.authorEntryId, "");
    assert.equal(form.thumbnailPublicId, "");
    assert.equal(form.thumbnailUrl, "");
    assert.deepEqual(form.tagList, []);
    assert.equal(form.tagInput, "");
    assert.equal(form.version, null);
  });

  it("normalizes author profile forms with optional photo fallback", () => {
    assert.deepEqual(createEmptyAuthorProfileForm(), {
      id: "",
      name: "",
      slug: "",
      biography: "",
      gravatarProfile: "",
      gravatarHash: "",
      fallbackPhotoUrl: "",
      photoSettingsChanged: false,
      photoUrl: "",
      photoPublicId: "",
      version: null,
    });
    assert.deepEqual(
      authorProfileToForm({
        id: "author-1",
        name: "Marcelo Munhoz",
        slug: "marcelo-munhoz",
        biography: "But first...",
        photo: {
          gravatar_profile: "marcelo.munhoz",
          gravatar_hash: "a".repeat(64),
          fallback_url: "https://res.cloudinary.com/demo/image/upload/marcelo.jpg",
          secure_url: `https://gravatar.com/avatar/${"a".repeat(64)}?s=192&r=g&d=404`,
        },
        version: 11,
      }),
      {
        id: "author-1",
        name: "Marcelo Munhoz",
        slug: "marcelo-munhoz",
        biography: "But first...",
        gravatarProfile: "marcelo.munhoz",
        gravatarHash: "a".repeat(64),
        fallbackPhotoUrl: "https://res.cloudinary.com/demo/image/upload/marcelo.jpg",
        photoSettingsChanged: false,
        photoUrl: `https://gravatar.com/avatar/${"a".repeat(64)}?s=192&r=g&d=404`,
        photoPublicId: "",
        version: 11,
      }
    );
    assert.deepEqual(buildAuthorProfilePayload({ name: " Marcelo Munhoz ", slug: "marcelo-munhoz", biography: " Bio ", version: 11 }), {
      name: "Marcelo Munhoz",
      slug: "marcelo-munhoz",
      biography: "Bio",
      version: 11,
    });
    assert.deepEqual(
      buildAuthorProfilePayload({
        name: "Marcelo",
        biography: "Bio",
        photoUrl: "https://secure.gravatar.com/avatar/legacy",
        photoSettingsChanged: false,
        version: 11,
      }),
      { name: "Marcelo", slug: "", biography: "Bio", version: 11 }
    );
    assert.deepEqual(
      buildAuthorProfilePayload({ name: "Marcelo", photoSettingsChanged: true, gravatarProfile: "", fallbackPhotoUrl: "", version: 11 }),
      { name: "Marcelo", slug: "", biography: "", gravatarProfile: "", fallbackPhotoUrl: "", version: 11 }
    );
  });

  it("invalidates the resolved photo when the Gravatar profile draft changes", () => {
    assert.deepEqual(
      updateAuthorGravatarDraft(
        {
          name: "Marcelo",
          gravatarProfile: "old-profile",
          gravatarHash: "a".repeat(64),
          fallbackPhotoUrl: "https://res.cloudinary.com/demo/image/upload/fallback.jpg",
          photoSettingsChanged: false,
          photoUrl: `https://gravatar.com/avatar/${"a".repeat(64)}?s=192&r=g&d=404`,
        },
        "new-profile"
      ),
      {
        name: "Marcelo",
        gravatarProfile: "new-profile",
        gravatarHash: "",
        fallbackPhotoUrl: "https://res.cloudinary.com/demo/image/upload/fallback.jpg",
        photoSettingsChanged: true,
        photoUrl: "",
      }
    );
  });

  it("derives public author slugs from names instead of exposing entry ids", () => {
    assert.deepEqual(
      publicAuthorProfile({
        sys: { id: "cvs0Tg41EntryId" },
        fields: {
          name: "Marcelo Munhoz",
          photo: {
            fields: {
              file: {
                url: "//images.ctfassets.net/space/marcelo.jpg",
              },
            },
          },
        },
      }),
      {
        id: "cvs0Tg41EntryId",
        name: "Marcelo Munhoz",
        slug: "marcelo-munhoz",
        biography: "",
        photoUrl: "https://images.ctfassets.net/space/marcelo.jpg",
      }
    );
  });

  it("hydrates writer edit forms with display controls without exposing review notes", () => {
    const form = articleToForm({
      id: "article-1",
      title: "Existing article",
      slug: "existing-article",
      description: "Existing description",
      body: "# Body",
      locale: "pt-BR",
      createAt: "2026-08-11",
      thumbnail: {
        public_id: "marcelo-munhoz-website/existing",
        secure_url: "https://example.test/existing.jpg",
      },
      alt: "Existing image",
      authorEntryId: "author-1",
      authorName: "Marcelo Munhoz",
      tags: ["admin", "review"],
      version: 12,
      reviewNotes: "owner-only note",
    });

    assert.deepEqual(form, {
      id: "article-1",
      title: "Existing article",
      slug: "existing-article",
      description: "Existing description",
      body: "# Body",
      locale: "pt-BR",
      createAt: "2026-08-11",
      thumbnailPublicId: "marcelo-munhoz-website/existing",
      thumbnailUrl: "https://example.test/existing.jpg",
      thumbnail: {
        public_id: "marcelo-munhoz-website/existing",
        secure_url: "https://example.test/existing.jpg",
      },
      alt: "Existing image",
      author: "author-1",
      authorEntryId: "author-1",
      authorName: "Marcelo Munhoz",
      tags: "admin, review",
      tagList: ["admin", "review"],
      tagInput: "",
      version: 12,
    });
  });

  it("hydrates editor date inputs from Contentful timestamps", () => {
    const form = articleToForm({
      id: "article-1",
      createAt: "2026-06-25T14:38:24.390Z",
      author: "Marcelo Munhoz",
      authorEntryId: "author-1",
    });

    assert.equal(form.createAt, "2026-06-25");
    assert.equal(form.authorName, "Marcelo Munhoz");
  });

  it("stores returned Contentful id and version after a successful draft save", () => {
    const form = { id: "", version: null, title: "Draft" };

    assert.deepEqual(
      applyArticleResponseToForm(form, {
        sys: { id: "article-1", version: 3 },
      }),
      { id: "article-1", version: 3, title: "Draft" }
    );
    assert.deepEqual(
      applyArticleResponseToForm(form, {
        draft: { sys: { id: "article-2", version: 4 } },
      }),
      { id: "article-2", version: 4, title: "Draft" }
    );
  });

  it("updates owner lifecycle article state without changing unrelated rows", () => {
    const rows = [
      { id: "article-1", status: "review" },
      { id: "article-2", status: "published" },
    ];

    assert.deepEqual(updateArticleStatusById(rows, "article-1", "published"), [
      { id: "article-1", status: "published" },
      { id: "article-2", status: "published" },
    ]);
    assert.deepEqual(removeArticleById(rows, "article-2"), [{ id: "article-1", status: "review" }]);
  });

  it("requires an exact article title before confirming permanent deletion", () => {
    const article = { id: "article-1", title: "Permanent Delete Target" };

    assert.equal(canConfirmArticleDeletion(article, "Permanent Delete Target"), true);
    assert.equal(canConfirmArticleDeletion(article, " permanent delete target "), false);
    assert.equal(canConfirmArticleDeletion(article, "Other article"), false);
    assert.equal(canConfirmArticleDeletion(null, "Permanent Delete Target"), false);
  });

  it("shows row lifecycle actions only for article states supported by backend routes", () => {
    const writer = { subject: "writer-1", roles: ["writer"] };

    assert.equal(canEditArticleAction(null, writer), false);
    assert.equal(canPrepareReviewAction(null, writer), false);
    assert.equal(canRequestUnpublicationAction(null, writer), false);
    assert.equal(canPrepareReviewAction({ id: "draft-1", status: "draft", writerSubject: "writer-1" }, writer), true);
    assert.equal(canPrepareReviewAction({ id: "published-1", status: "published", writerSubject: "writer-1" }, writer), false);
    assert.equal(canPrepareReviewAction({ id: "changed-1", status: "changed", writerSubject: "writer-1" }, writer), true);
    assert.equal(canPrepareReviewAction({ id: "", status: "draft", writerSubject: "writer-1" }, writer), false);

    assert.equal(canRequestUnpublicationAction({ id: "published-1", status: "published", writerSubject: "writer-1" }, writer), true);
    assert.equal(canRequestUnpublicationAction({ id: "draft-1", status: "draft", writerSubject: "writer-1" }, writer), false);
    assert.equal(canRequestUnpublicationAction({ id: "review-1", status: "review", writerSubject: "writer-1" }, writer), false);
  });

  it("shows writer actions only for writer-owned article states", () => {
    const writer = { subject: "writer-1", roles: ["writer"], authorEntryId: "author-1" };

    assert.equal(canEditArticleAction({ id: "draft-1", status: "draft", writerSubject: "writer-1" }, writer), true);
    assert.equal(canEditArticleAction({ id: "draft-2", status: "draft", authorEntryId: "author-1" }, writer), true);
    assert.equal(canEditArticleAction({ id: "draft-3", status: "draft", writerSubject: "writer-2", authorEntryId: "author-2" }, writer), false);
    assert.equal(canEditArticleAction({ id: "draft-4", status: "draft" }, writer), false);
    assert.equal(canPrepareReviewAction({ id: "draft-1", status: "draft", writerSubject: "writer-1" }, writer), true);
    assert.equal(canRequestUnpublicationAction({ id: "published-1", status: "published", writerSubject: "writer-1" }, writer), true);

    assert.equal(canPrepareReviewAction({ id: "published-1", status: "published", writerSubject: "writer-1" }, writer), false);
    assert.equal(canOwnerPublishAction({ id: "review-1", status: "review" }, writer), false);
    assert.equal(canOwnerUnpublishAction({ id: "published-1", status: "published" }, writer), false);
    assert.equal(canArchiveArticleAction({ id: "draft-1", status: "draft" }, writer), false);
  });

  it("keeps owner body editing scoped to owned articles while preserving moderation", () => {
    const owner = { subject: "owner-1", roles: ["owner"], authorEntryId: "author-1" };
    const identityOwner = { subject: "owner-1", roles: ["Owner"], authorEntryId: "author-1" };

    assert.equal(canEditArticleAction({ id: "draft-1", status: "draft", writerSubject: "owner-1" }, owner), true);
    assert.equal(canEditArticleAction({ id: "published-1", status: "published", authorEntryId: "author-1" }, owner), true);
    assert.equal(canEditArticleAction({ id: "changed-1", status: "changed", authorEntryId: "author-1" }, owner), true);
    assert.equal(canEditArticleAction({ id: "published-2", status: "published", authorEntryId: "author-2" }, owner), false);
    assert.equal(canOwnerPublishAction({ id: "review-1", status: "review" }, owner), true);
    assert.equal(canOwnerPublishAction({ id: "changed-1", status: "changed" }, owner), true);
    assert.equal(canOwnerPublishAction({ id: "changed-review-1", status: "review", lifecycleStatus: "changed" }, owner), true);
    assert.equal(canOwnerUnpublishAction({ id: "published-1", status: "published" }, owner), true);
    assert.equal(canOwnerUnpublishAction({ id: "changed-1", status: "changed" }, owner), true);
    assert.equal(canOwnerUnpublishAction({ id: "changed-review-1", status: "review", lifecycleStatus: "changed" }, owner), true);
    assert.equal(canOwnerUnpublishAction({ id: "published-1", status: "published" }, identityOwner), true);
    assert.equal(canOwnerUnpublishAction({ id: "take-down-1", status: "unpublicationRequested" }, owner), true);
    assert.equal(canArchiveArticleAction({ id: "draft-1", status: "draft" }, owner), true);
    assert.equal(canArchiveArticleAction({ id: "changed-1", status: "changed" }, owner), false);
    assert.equal(canArchiveArticleAction({ id: "changed-review-1", status: "review", lifecycleStatus: "changed" }, owner), false);

    assert.equal(canPrepareReviewAction({ id: "review-1", status: "review" }, owner), false);
    assert.equal(canRequestUnpublicationAction({ id: "published-1", status: "published" }, owner), false);
  });

  it("does not treat matching display names as trusted edit ownership", () => {
    const owner = { subject: "owner-1", name: "Marcelo Munhoz", roles: ["owner"] };

    assert.equal(canEditArticleAction({ id: "draft-1", status: "draft", author: "Marcelo Munhoz" }, owner), false);
    assert.equal(canEditArticleAction({ id: "draft-2", status: "draft", author: "Guest Writer" }, owner), false);
  });

  it("covers creator-scoped action matrices across draft, review, published, and other-author rows", () => {
    const writer = { subject: "writer-1", roles: ["writer"], authorEntryId: "author-1" };
    const owner = { subject: "owner-1", roles: ["owner"], authorEntryId: "author-owner" };
    const rows = [
      { id: "own-draft", status: "draft", authorEntryId: "author-1" },
      { id: "own-review", status: "review", writerSubject: "writer-1" },
      { id: "own-published", status: "published", writerSubject: "writer-1" },
      { id: "archived", status: "archived", writerSubject: "writer-1" },
      { id: "other-draft", status: "draft", authorEntryId: "author-2" },
    ];

    assert.deepEqual(
      rows.map((row) => ({
        id: row.id,
        edit: canEditArticleAction(row, writer),
        review: canPrepareReviewAction(row, writer),
        requestUnpublication: canRequestUnpublicationAction(row, writer),
      })),
      [
        { id: "own-draft", edit: true, review: true, requestUnpublication: false },
        { id: "own-review", edit: true, review: false, requestUnpublication: false },
        { id: "own-published", edit: true, review: false, requestUnpublication: true },
        { id: "archived", edit: false, review: false, requestUnpublication: false },
        { id: "other-draft", edit: false, review: false, requestUnpublication: false },
      ]
    );

    assert.deepEqual(
      rows.map((row) => ({
        id: row.id,
        edit: canEditArticleAction(row, owner),
        publish: canOwnerPublishAction(row, owner),
        unpublish: canOwnerUnpublishAction(row, owner),
        archive: canArchiveArticleAction(row, owner),
        unarchive: canUnarchiveArticleAction(row, owner),
      })),
      [
        { id: "own-draft", edit: false, publish: false, unpublish: false, archive: true, unarchive: false },
        { id: "own-review", edit: false, publish: true, unpublish: false, archive: true, unarchive: false },
        { id: "own-published", edit: false, publish: false, unpublish: true, archive: false, unarchive: false },
        { id: "archived", edit: false, publish: false, unpublish: false, archive: false, unarchive: true },
        { id: "other-draft", edit: false, publish: false, unpublish: false, archive: true, unarchive: false },
      ]
    );
  });

  it("resolves Contentful thumbnail images with legacy Cloudinary fallback", () => {
    assert.equal(
      articleCardImageUrl({ thumbnail: { public_id: "marcelo-munhoz-website/new-image" } }),
      "https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,w_350,h_233,c_fill/marcelo-munhoz-website/new-image"
    );
    assert.equal(
      articleHeroImageUrl({ thumbnail: { secure_url: "http://example.test/new-image.jpg" } }),
      "https://example.test/new-image.jpg"
    );
    assert.equal(
      articleCardImageUrl({ cloudinary: [{ public_id: "marcelo-munhoz-website/old-image" }] }),
      "https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,w_350,h_233,c_fill/marcelo-munhoz-website/old-image"
    );
    assert.equal(
      articleHeroImageUrl({ cloudinary: [{ url: "http://example.test/old-image.jpg" }] }),
      "https://example.test/old-image.jpg"
    );
  });

  it("normalizes media assets for visual selection without using raw ids as primary labels", () => {
    assert.deepEqual(
      normalizeMediaAssetDisplay({
        public_id: "marcelo-munhoz-website/blog/admin-dashboard",
        secure_url: "https://example.test/admin-dashboard.jpg",
        width: 1600,
        height: 900,
        format: "jpg",
        resource_type: "image",
        type: "upload",
        asset_folder: "marcelo-munhoz-website",
        context: { custom: { alt: "Admin dashboard thumbnail" } },
      }),
      {
        publicId: "marcelo-munhoz-website/blog/admin-dashboard",
        thumbnailUrl: "https://example.test/admin-dashboard.jpg",
        title: "Admin dashboard thumbnail",
        alt: "Admin dashboard thumbnail",
        dimensions: "1600 x 900",
        asset: {
          public_id: "marcelo-munhoz-website/blog/admin-dashboard",
          secure_url: "https://example.test/admin-dashboard.jpg",
          url: "https://example.test/admin-dashboard.jpg",
          width: 1600,
          height: 900,
          format: "jpg",
          resource_type: "image",
          type: "upload",
          asset_folder: "marcelo-munhoz-website",
          context: { custom: { alt: "Admin dashboard thumbnail" } },
        },
      }
    );
    assert.equal(normalizeMediaAssetDisplay({ public_id: "folder/public-id-only" }).title, "public-id-only");
  });

  it("derives user-safe media library states for loading, empty, error, and ready responses", () => {
    assert.deepEqual(mediaLibraryState({ isLoading: true }), {
      status: "loading",
      message: "Loading media library.",
      assets: [],
    });
    assert.deepEqual(mediaLibraryState({ assets: [] }), {
      status: "empty",
      message: "No images are available in the selected media folder.",
      assets: [],
    });
    assert.deepEqual(mediaLibraryState({ error: "Cloudinary API secret leaked raw diagnostic" }), {
      status: "error",
      message: "Media request failed.",
      assets: [],
    });
    assert.deepEqual(mediaLibraryState({ error: "Media service is not configured for this environment." }), {
      status: "error",
      message: "Media service is not configured for this environment.",
      assets: [],
    });
    assert.deepEqual(mediaLibraryState({ assets: [{ public_id: "folder/photo", url: "https://example.test/photo.jpg" }] }), {
      status: "ready",
      message: "",
      assets: [
        {
          publicId: "folder/photo",
          thumbnailUrl: "https://example.test/photo.jpg",
          title: "photo",
          alt: "photo",
          dimensions: "",
          asset: {
            public_id: "folder/photo",
            url: "https://example.test/photo.jpg",
          },
        },
      ],
    });
  });

  it("localizes public article byline labels and date-only update display", () => {
    assert.deepEqual(articleBylineLabels("en-US"), { by: "By", on: "on", updated: "Updated on" });
    assert.deepEqual(articleBylineLabels("pt-BR"), { by: "Por", on: "em", updated: "Atualizado em" });
    assert.deepEqual(
      publicArticleDates({
        createAt: "2026-06-25T12:00:00.000Z",
        updatedAt: "2026-06-25T22:00:00.000Z",
        locale: "en-US",
      }),
      { created: "June 25, 2026", updated: "" }
    );
    assert.deepEqual(
      publicArticleDates({
        createAt: "2026-06-25T12:00:00.000Z",
        updatedAt: "2026-06-27T08:00:00.000Z",
        locale: "en-US",
      }),
      { created: "June 25, 2026", updated: "June 27, 2026" }
    );
  });

  it("maps backend admin error payloads to fixed user-safe frontend messages", () => {
    assert.equal(
      adminUserMessage(new AdminApiError(500, { error: "CONTENTFUL_MANAGEMENT_KEY=cfmgmt_sanitized_secret_123 upstream failed" })),
      "The admin request could not be completed."
    );
    assert.equal(
      adminUserMessage(new AdminApiError(502, { error: "Cloudinary API returned api-secret from raw diagnostics" }), { media: true }),
      "Media request failed."
    );
    assert.equal(
      adminUserMessage(new AdminApiError(500, { error: "Server configuration error" }), { media: true }),
      "Media service is not configured for this environment."
    );
    assert.equal(adminUserMessage(new AdminApiError(401, { error: "raw" })), "Sign in again before saving.");
    assert.equal(adminUserMessage(new AdminApiError(403, { error: "raw" })), "Your account cannot perform this action.");
    assert.equal(adminUserMessage(new AdminApiError(409, { error: "raw" })), "This article changed elsewhere. Reload before saving.");
  });

  it("configures Cloudinary Media Editor with public image options only", async () => {
    assert.deepEqual(buildMediaEditorOptions({ cloudName: "demo-cloud", publicId: "folder/image" }), {
      cloudName: "demo-cloud",
      publicIds: ["folder/image"],
      image: {
        steps: ["resizeAndCrop", "textOverlays", "export"],
        resizeAndCrop: {
          cropPresets: ["original", "square", "landscape-16:9", "landscape-4:3"],
        },
        export: {
          formats: ["jpg", "png", "webp"],
          quality: ["auto", "best", "good"],
          download: false,
          share: false,
        },
      },
    });

    assert.deepEqual(normalizeMediaEditorExport({ assets: [{ public_id: "folder/image", secure_url: "https://res.cloudinary.com/demo/image/upload/f_auto/folder/image.jpg" }] }), {
      publicId: "folder/image",
      secureUrl: "https://res.cloudinary.com/demo/image/upload/f_auto/folder/image.jpg",
      transformation: "",
    });

    let updateOptions = null;
    const editorHandlers = {};
    let shown = false;
    let destroyed = 0;
    const windowRef = {
      cloudinary: {
        mediaEditor() {
          return {
            update(options) {
              updateOptions = options;
            },
            on(eventName, handler) {
              editorHandlers[eventName] = handler;
            },
            show() {
              shown = true;
            },
            destroy() {
              destroyed += 1;
            },
          };
        },
      },
    };
    const documentRef = {
      body: {
        style: {
          properties: { overflow: "hidden", "padding-right": "15px" },
          removeProperty(name) {
            delete this.properties[name];
          },
        },
        classList: {
          removed: [],
          remove(...classNames) {
            this.removed.push(...classNames);
          },
        },
      },
      documentElement: {
        style: {
          properties: { overflow: "hidden" },
          removeProperty(name) {
            delete this.properties[name];
          },
        },
        classList: {
          removed: [],
          remove(...classNames) {
            this.removed.push(...classNames);
          },
        },
      },
    };
    const exported = [];

    await openCloudinaryMediaEditor({
      cloudName: "demo-cloud",
      publicId: "folder/image",
      onExport: (asset) => exported.push(asset),
      windowRef,
      documentRef,
    });
    editorHandlers.export({ public_id: "folder/image", url: "https://res.cloudinary.com/demo/image/upload/c_crop/folder/image.jpg" });
    editorHandlers.close();

    assert.equal(shown, true);
    assert.equal(destroyed, 2);
    assert.equal(updateOptions.cloudName, "demo-cloud");
    assert.deepEqual(updateOptions.publicIds, ["folder/image"]);
    assert.deepEqual(documentRef.body.style.properties, {});
    assert.deepEqual(documentRef.documentElement.style.properties, {});
    assert.deepEqual(new Set(documentRef.body.classList.removed), new Set(["q-body--prevent-scroll", "overflow-hidden"]));
    assert.deepEqual(exported, [
      {
        publicId: "folder/image",
        secureUrl: "https://res.cloudinary.com/demo/image/upload/c_crop/folder/image.jpg",
        transformation: "",
      },
    ]);
    assert.doesNotMatch(JSON.stringify(updateOptions), /api.?key|secret/i);
  });
});
