import { describe, expect, it } from "vitest";
import AdminArticleCard from "../../src/components/AdminArticleCard.vue";
import BlogArchiveList from "../../src/components/BlogArchiveList.vue";
import BlogHighlights from "../../src/components/BlogHighlights.vue";
import { createRouter, createTestMount } from "../harness/index.js";

const router = () => {
  const created = createRouter({
    routes: [
      { path: "/", name: "Home", component: { template: "<main>Home</main>" } },
      { path: "/blog", name: "Meus Artigos", component: { template: "<main>Archive</main>" } },
      { path: "/blog/:slug", name: "Artigo", component: { template: "<main>Article</main>" } },
    ],
  });
  return created;
};

const article = ({
  id = "article-1",
  slug = "article-one",
  title = "Article one",
  status = "draft",
  lifecycleStatus = status,
  author = "Ada Lovelace",
  tags = ["testing"],
  createAt = "2026-08-20T12:00:00.000Z",
  updatedAt,
  image = "https://images.example.test/article.jpg",
  alt = "Article cover",
} = {}) => ({
  id,
  authorEntryId: "author-1",
  writerSubject: "writer-1",
  title,
  status,
  lifecycleStatus,
  displayAuthor: author,
  displayDate: "August 20, 2026",
  displayTags: tags.map((tag) => ({ id: tag, label: tag })),
  fields: {
    title,
    slug,
    description: `${title} description`,
    createAt,
    updatedAt,
    alt,
    thumbnail: image ? { secure_url: image } : undefined,
    author: author ? { fields: { name: author } } : undefined,
  },
  sys: { id, createdAt: createAt },
  metadata: { tags: tags.map((tag) => ({ sys: { id: tag } })) },
});

const writer = { subject: "writer-1", authorEntryId: "author-1", roles: ["writer"] };
const owner = { subject: "owner-1", roles: ["owner"] };

describe("component coverage boundaries", () => {
  it("catches removal of authorized article-card actions and keyboard tag selection", async () => {
    const mounted = createTestMount({ router: router() })(AdminArticleCard, {
      props: {
        article: article({ id: "draft", status: "draft" }),
        session: writer,
        activeTag: "testing",
      },
    });

    expect(mounted.text()).toContain("Edit");
    expect(mounted.text()).toContain("Review");
    const buttonByLabel = (wrapper, label) => wrapper.findAll(".q-btn").find((button) => button.text().includes(label));
    await buttonByLabel(mounted, "Edit").trigger("click");
    await buttonByLabel(mounted, "Review").trigger("click");
    expect(mounted.emitted("edit")).toEqual([[expect.objectContaining({ id: "draft" })]]);
    expect(mounted.emitted("review")).toEqual([[expect.objectContaining({ id: "draft" })]]);
    const tag = mounted.get("[role='button']");
    expect(tag.attributes("aria-pressed")).toBe("true");
    await tag.trigger("click");
    await tag.trigger("keyup.enter");
    await tag.trigger("keydown.space");
    await tag.trigger("keyup.space");
    expect(mounted.emitted("toggle-tag")).toEqual([["testing"], ["testing"], ["testing"]]);
    mounted.unmount();

    const published = createTestMount({ router: router() })(AdminArticleCard, {
      props: { article: article({ status: "published", lifecycleStatus: "published" }), session: writer },
    });
    expect(published.text()).not.toContain("Edit");
    expect(published.text()).toContain("Request unpublication");
    await buttonByLabel(published, "Request unpublication").trigger("click");
    expect(published.emitted("request-unpublication")).toEqual([[expect.objectContaining({ status: "published" })]]);
    published.unmount();

    const privileged = createTestMount({ router: router() })(AdminArticleCard, {
      props: { article: article({ status: "review", lifecycleStatus: "changed" }), session: owner },
    });
    expect(privileged.text()).not.toContain("Edit");
    expect(privileged.text()).not.toContain("Publish changes");
    expect(privileged.text()).toContain("Unpublish");
    await buttonByLabel(privileged, "Unpublish").trigger("click");
    expect(privileged.emitted("publish")).toBeUndefined();
    expect(privileged.emitted("unpublish")).toEqual([[expect.objectContaining({ status: "review" })]]);
    privileged.unmount();

    const changedWriter = createTestMount({ router: router() })(AdminArticleCard, {
      props: { article: article({ status: "review", lifecycleStatus: "changed" }), session: writer },
    });
    expect(changedWriter.text()).not.toContain("Edit");
    expect(changedWriter.text()).not.toContain("Review");
    expect(changedWriter.text()).toContain("Request unpublication");
    changedWriter.unmount();

    const archivable = createTestMount({ router: router() })(AdminArticleCard, {
      props: { article: article({ status: "draft", lifecycleStatus: "draft" }), session: owner },
    });
    expect(archivable.text()).toContain("Archive");
    await buttonByLabel(archivable, "Archive").trigger("click");
    expect(archivable.emitted("archive")).toEqual([[expect.objectContaining({ status: "draft" })]]);
    archivable.unmount();

    const archived = createTestMount({ router: router() })(AdminArticleCard, {
      props: { article: article({ status: "archived", lifecycleStatus: "archived" }), session: owner },
    });
    expect(archived.text()).toContain("Unarchive");
    expect(archived.text()).toContain("Delete");
    await buttonByLabel(archived, "Unarchive").trigger("click");
    await buttonByLabel(archived, "Delete").trigger("click");
    expect(archived.emitted("unarchive")).toEqual([[expect.objectContaining({ status: "archived" })]]);
    expect(archived.emitted("delete")).toEqual([[expect.objectContaining({ status: "archived" })]]);
    archived.unmount();

    const unknown = createTestMount({ router: router() })(AdminArticleCard, {
      props: { article: article({ status: "unknown", lifecycleStatus: "unknown" }) },
    });
    expect(unknown.text()).toContain("Draft");
    unknown.unmount();
  });

  it("catches rendering metadata that is absent from an archive article", async () => {
    const mountedRouter = router();
    await mountedRouter.push("/blog");
    await mountedRouter.isReady();
    const missing = article({ id: "", slug: "fallback-slug", author: "", tags: [], createAt: "", image: "", alt: "" });
    delete missing.sys;
    const fallbackDate = article({ id: "fallback-date", slug: "fallback-date", createAt: "", alt: "", author: "", tags: [] });
    fallbackDate.sys.createdAt = "2026-08-20T12:00:00.000Z";
    const mounted = createTestMount({ router: mountedRouter })(BlogArchiveList, {
      props: { articles: [missing, fallbackDate], returnTo: "/blog?q=coverage" },
    });

    expect(mounted.get(".blog-archive-row__link").attributes("href")).toBe("/blog/fallback-slug");
    expect(mounted.get(".blog-archive-row__image").attributes("alt")).toBe("Article one");
    expect(mounted.find(".blog-archive-row__meta span").exists()).toBe(false);
    expect(mounted.findAll(".blog-archive-row")[0].find(".blog-archive-row__meta time").exists()).toBe(false);
    expect(mounted.find(".blog-archive-row__tags").exists()).toBe(false);
    expect(mounted.findAll(".blog-archive-row__meta time")).toHaveLength(1);
    mounted.unmount();
  });

  it("catches omission of the primary card or inclusion of a third secondary highlight", async () => {
    const mountedRouter = router();
    await mountedRouter.push("/blog");
    await mountedRouter.isReady();
    const mounted = createTestMount({ router: mountedRouter })(BlogHighlights, {
      props: {
        articles: [
          {
            ...article({ id: "primary", title: "Primary", author: "", createAt: "", alt: "" }),
            sys: { id: "primary", createdAt: "2026-08-20T12:00:00.000Z" },
          },
          {
            ...article({ id: "secondary-1", title: "Secondary one", author: "", createAt: "", image: "", alt: "" }),
            sys: undefined,
          },
          {
            ...article({ id: "secondary-2", title: "Secondary two", createAt: "", tags: [] }),
            sys: { id: "secondary-2", createdAt: "2026-08-20T12:00:00.000Z" },
          },
          article({ id: "secondary-3", title: "Excluded third" }),
        ],
        returnTo: "/blog?year=2026",
      },
    });
    expect(mounted.findAll(".blog-highlight")).toHaveLength(3);
    expect(mounted.text()).toContain("Primary");
    expect(mounted.text()).toContain("Secondary one");
    expect(mounted.text()).toContain("Secondary two");
    expect(mounted.text()).not.toContain("Excluded third");
    expect(mounted.findAll(".blog-highlight__meta span")).toHaveLength(1);
    expect(mounted.findAll(".blog-highlight__meta time")).toHaveLength(2);
    expect(mounted.findAllComponents({ name: "RouterLink" })[0].props("to")).toEqual({
      name: "Artigo",
      params: { slug: "article-one" },
      state: { blogReturnTo: "/blog?year=2026" },
    });
    mounted.unmount();

    const empty = createTestMount({ router: router() })(BlogHighlights, { props: { articles: [] } });
    expect(empty.find(".blog-highlights").exists()).toBe(false);
    empty.unmount();
  });
});
