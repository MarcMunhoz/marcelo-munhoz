const stubArticle = (article, navigation) => {
  cy.interceptJson("GET", "**/api/contentful/article-navigation/*", navigation, "navigation");
  cy.interceptJson("GET", "**/api/contentful/article/*", article, "article");
};

describe("article and author journeys", () => {
  it("renders formatted article content and a standalone full-width player without viewport overflow", () => {
    cy.fixture("public-content.json").then(({ article, navigation, author, formattedArticleBody }) => {
      stubArticle({ ...article, fields: { ...article.fields, body: formattedArticleBody } }, navigation);
      cy.interceptJson("GET", "**/api/contentful/author/*", author, "author");
      cy.intercept("GET", "https://www.youtube-nocookie.com/embed/bovBQtB_PDo", "<title>Test player</title>");
    });

    cy.visit("/blog/reliable-browser-journeys");
    cy.acceptCookieNotice();
    cy.contains("Behavior-first end-to-end testing.").should("be.visible");
    cy.get(".rendered-text").within(() => {
      cy.contains("h2", "Formatted reader content").should("be.visible");
      cy.contains("strong", "important").should("be.visible");
      cy.contains("a", "documented")
        .should("have.attr", "href", "https://example.test/reference")
        .and("have.attr", "rel", "noopener noreferrer");
      cy.contains("👩🏽‍💻").should("be.visible");
      cy.get(".article-video iframe")
        .should("have.attr", "src", "https://www.youtube-nocookie.com/embed/bovBQtB_PDo")
        .and("have.attr", "title", "YouTube video: Reliable browser journeys");
    });
    cy.get(".rendered-text").then(($content) => {
      cy.get(".article-video").then(($video) => {
        const content = $content[0].getBoundingClientRect();
        const video = $video[0].getBoundingClientRect();
        expect(Math.abs(video.width - content.width)).to.be.lessThan(1);
        expect(Math.abs(video.width / video.height - 16 / 9)).to.be.lessThan(0.02);
      });
    });
    cy.document().then((documentRef) => {
      expect(documentRef.documentElement.scrollWidth).to.be.at.most(documentRef.documentElement.clientWidth);
    });
    cy.get('img[alt="A browser test diagram"]').should("have.attr", "src", "https://images.example.test/article.jpg");
    cy.contains("#testing").should("be.visible");
    cy.contains("a", "Ada Lovelace").click();
    cy.location("pathname").should("equal", "/blog/authors/ada-lovelace");
    cy.contains("h1", "Ada Lovelace").should("be.visible");
    cy.contains("Computing pioneer.").should("be.visible");
  });

  it("preserves the archive return URL and exposes chronological neighbors", () => {
    cy.fixture("public-content.json").then(({ archive, article, navigation }) => {
      cy.interceptJson("GET", "**/api/contentful/blog-years", { years: ["2026"] }, "years");
      cy.interceptJson("GET", "**/api/contentful/tags", { items: [] }, "tags");
      cy.interceptJson("GET", "**/api/contentful/blog-index*", { ...archive, featured: [], page: 2 }, "archive");
      stubArticle(article, navigation);
    });

    cy.visit("/blog?page=2&tag=testing");
    cy.acceptCookieNotice();
    cy.contains("a", "Reliable browser journeys").click();
    cy.contains("Earlier article").should("be.visible");
    cy.contains("Later article").should("be.visible");
    cy.contains("a", "All articles").click();
    cy.location("pathname").should("equal", "/blog");
    cy.location("search").should("contain", "page=2").and("contain", "tag=testing");
  });

  it("renders the first and last article navigation boundaries", () => {
    cy.fixture("public-content.json").then(({ article }) => {
      stubArticle(article, { previous: null, next: { title: "Later article", slug: "later-article" } });
    });
    cy.visit("/blog/first-article");
    cy.acceptCookieNotice();
    cy.contains("Later article").should("be.visible");
    cy.contains("Earlier article").should("not.exist");

    cy.fixture("public-content.json").then(({ article }) => {
      stubArticle(article, { previous: { title: "Earlier article", slug: "earlier-article" }, next: null });
    });
    cy.visit("/blog/last-article");
    cy.acceptCookieNotice();
    cy.contains("Earlier article").should("be.visible");
    cy.contains("Later article").should("not.exist");
  });

  it("paginates an author collection and returns to an article", () => {
    cy.fixture("public-content.json").then(({ author, article, navigation }) => {
      cy.interceptJson("GET", "**/api/contentful/author/*", author, "author");
      stubArticle({ ...article, fields: { ...article.fields, title: "Article 10", slug: "article-10" } }, navigation);
    });

    cy.visit("/blog/authors/ada-lovelace");
    cy.acceptCookieNotice();
    cy.get(".article-row").should("have.length", 8);
    cy.contains("button", "Load more").click();
    cy.get(".article-row").should("have.length", 10);
    cy.contains("button", "Show less").click();
    cy.get(".article-row").should("have.length", 8);
    cy.contains("a", "Article 1").click();
    cy.location("pathname").should("equal", "/blog/article-1");
  });

  it("recovers after a malformed article response", () => {
    let attempts = 0;
    cy.fixture("public-content.json").then(({ article, navigation }) => {
      cy.interceptJson("GET", "**/api/contentful/article-navigation/*", navigation, "navigation");
      cy.intercept("GET", "**/api/contentful/article/*", (request) => {
        attempts += 1;
        request.reply({ statusCode: 200, body: attempts === 1 ? { fields: null } : article });
      }).as("article");
    });

    cy.visit("/blog/reliable-browser-journeys");
    cy.acceptCookieNotice();
    cy.contains('[role="alert"]', "We could not load this article.").should("be.visible");
    cy.contains("button", "Try again").click();
    cy.contains("Behavior-first end-to-end testing.").should("be.visible");
  });
});
