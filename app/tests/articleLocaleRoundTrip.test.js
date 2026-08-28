import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createContentfulManagementFacade } from "../middleware/contentfulAdmin.js";
import { createContentfulHandler } from "../middleware/contentfulProxy.js";
import { articleBylineLabels } from "../src/utils/articleDates.js";
import { buildArticlePayload } from "../src/utils/adminDashboard.js";

const response = (status, payload = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    return payload;
  },
});

describe("article locale publication contract", () => {
  for (const fixture of [
    {
      locale: "pt-BR",
      slug: "o-efeito-cd-rom-e-o-fim-da-sintaxe",
      labels: { by: "Por", on: "em", updated: "Atualizado em" },
    },
    {
      locale: "en-US",
      slug: "what-id-learned-last-years",
      labels: { by: "By", on: "on", updated: "Updated on" },
    },
  ]) {
    it(`keeps ${fixture.locale} canonical from editor payload through publication and public labels`, async () => {
      let createdEntryBody;
      const facade = createContentfulManagementFacade({
        env: {
          CONTENTFUL_SPACE_ID: "space-id",
          CONTENTFUL_MANAGEMENT_KEY: "management-key",
          CONTENTFUL_ENVIRONMENT_ID: "staging",
          CONTENTFUL_DEFAULT_LOCALE: "pt-BR",
        },
        async fetchImpl(url, options) {
          const pathname = new URL(url).pathname;

          if (pathname.endsWith("/content_types/article")) {
            return response(200, { fields: [{ id: "locale", type: "Symbol", localized: true }] });
          }

          if (pathname.endsWith("/locales")) {
            return response(200, {
              items: [
                { code: "en-US", default: true },
                { code: "pt-BR", default: false },
              ],
            });
          }

          if (pathname.endsWith("/entries") && options.method === "POST") {
            createdEntryBody = JSON.parse(options.body);
            return response(201, { sys: { id: "article-1", version: 1 } });
          }

          if (pathname.endsWith("/entries") && options.method === "GET") {
            return response(200, {
              items: [
                {
                  sys: {
                    id: "article-1",
                    version: 2,
                    publishedVersion: 1,
                    contentType: { sys: { id: "article" } },
                  },
                  fields: createdEntryBody.fields,
                },
              ],
            });
          }

          if (pathname.endsWith("/entries/article-1/published")) {
            return response(200, { sys: { id: "article-1", version: 2, publishedVersion: 1 } });
          }

          if (pathname.endsWith("/entries/author-1")) {
            return response(200, {
              sys: { id: "author-1", contentType: { sys: { id: "author" } } },
              fields: {
                name: { "pt-BR": "Marcelo Munhoz" },
                slug: { "pt-BR": "marcelo-munhoz" },
              },
            });
          }

          throw new Error(`Unexpected Contentful path: ${pathname}`);
        },
      });
      const article = buildArticlePayload({
        title: "Article title",
        slug: fixture.slug,
        description: "Article description",
        body: "Article body",
        createAt: "2026-08-20",
        locale: fixture.locale,
        authorEntryId: "author-1",
        tagList: [],
      });

      await facade.createArticleDraft({
        data: article,
        session: { subject: "writer-1", authorEntryId: "author-1" },
      });
      await facade.publishArticle({ articleId: "article-1", data: { version: 1 } });
      const adminResult = await facade.listAdminArticles({ session: { roles: ["owner"] } });

      assert.deepEqual(createdEntryBody.fields.locale, {
        "en-US": fixture.locale,
        "pt-BR": fixture.locale,
      });
      assert.equal(adminResult.articles[0].locale, fixture.locale);

      const publicHandler = createContentfulHandler({
        client: {
          async getEntries() {
            return {
              items: [
                {
                  sys: { id: "article-1" },
                  fields: {
                    slug: fixture.slug,
                    locale: createdEntryBody.fields.locale["en-US"],
                  },
                },
              ],
              total: 1,
            };
          },
          async getTags() {
            return { items: [] };
          },
        },
      });
      const publicResponse = await publicHandler({ path: `/article/${fixture.slug}`, query: {} });
      const publicArticle = JSON.parse(publicResponse.body);

      assert.equal(publicResponse.statusCode, 200);
      assert.equal(publicArticle.fields.locale, fixture.locale);
      assert.deepEqual(articleBylineLabels(publicArticle.fields.locale, publicArticle.fields), fixture.labels);
    });
  }
});
