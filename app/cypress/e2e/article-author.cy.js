const stubArticle = (article, navigation) => {
  cy.interceptJson("GET", "**/api/contentful/article-navigation/*", navigation, "navigation");
  cy.interceptJson("GET", "**/api/contentful/article/*", article, "article");
};

describe("article and author journeys", () => {
  it("renders a direct article entry with safe body, metadata, tags, image, and author navigation", () => {
    cy.fixture("public-content.json").then(({ article, navigation, author }) => {
      stubArticle(article, navigation);
      cy.interceptJson("GET", "**/api/contentful/author/*", author, "author");
    });

    cy.visit("/blog/reliable-browser-journeys");
    cy.acceptCookieNotice();
    cy.contains("Behavior-first end-to-end testing.").should("be.visible");
    cy.get(".rendered-text").should("have.text", "Rendered as inert article text.").find("script").should("not.exist");
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
