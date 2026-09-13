const stubReferenceData = () => {
  cy.intercept("GET", "**/api/contentful/blog-years", { statusCode: 200, body: { years: ["2026", "2025"] } }).as("years");
  cy.intercept("GET", "**/api/contentful/tags", { statusCode: 200, body: { items: [{ sys: { id: "testing" }, name: "Testing" }] } }).as("tags");
};

describe("blog archive journeys", () => {
  beforeEach(() => stubReferenceData());

  it("renders the default archive and its meaningful metadata", () => {
    cy.fixture("public-content.json").then(({ archive }) => {
      cy.interceptJson("GET", "**/api/contentful/blog-index*", archive, "archive");
    });

    cy.visit("/blog");
    cy.acceptCookieNotice();
    cy.contains("h1", "Featured articles").should("be.visible");
    cy.contains("h2", "Article archive").should("be.visible");
    cy.contains("Reliable browser journeys").should("be.visible");
    cy.contains("25 articles · up to 12 per page").should("be.visible");
    cy.contains("#testing").should("be.visible");
  });

  it("canonicalizes invalid state and restores pagination through browser history", () => {
    cy.fixture("public-content.json").then(({ archive }) => {
      cy.intercept("GET", "**/api/contentful/blog-index*", (request) => {
        const page = Number(new URL(request.url).searchParams.get("page") || 1);
        request.reply({ ...archive, featured: page === 1 ? archive.featured : [], page });
      }).as("archive");
    });

    cy.visit("/blog?page=0&year=1800&tag=invalid!%20");
    cy.acceptCookieNotice();
    cy.location("search").should("equal", "");
    cy.get('[aria-label="Next page"]').filter(":visible").click({ force: true });
    cy.location("search").should("contain", "page=2");
    cy.contains("Page 2 of 3").should("be.visible");
    cy.go("back");
    cy.location("search").should("equal", "");
    cy.go("forward");
    cy.location("search").should("contain", "page=2");
  });

  it("updates search, year, and tag filters in the URL", () => {
    cy.fixture("public-content.json").then(({ archive }) => cy.interceptJson("GET", "**/api/contentful/blog-index*", archive, "archive"));
    cy.visit("/blog?page=2");
    cy.acceptCookieNotice();

    cy.get('input[aria-label="Search articles"]').type("browser testing");
    cy.location("search").should("contain", "q=browser+testing").and("not.contain", "page=2");
    cy.contains(".q-field", "Year").click();
    cy.contains(".q-item", "2026").click();
    cy.location("search").should("contain", "year=2026");
    cy.contains(".q-field", "Tag").click();
    cy.contains(".q-item", "Testing").click();
    cy.location("search").should("contain", "tag=testing");
  });

  it("recovers from a failed request and represents an empty result", () => {
    let attempts = 0;
    cy.fixture("public-content.json").then(({ emptyArchive }) => {
      cy.intercept("GET", "**/api/contentful/blog-index*", (request) => {
        attempts += 1;
        request.reply(attempts === 1 ? { statusCode: 503, body: { error: "Unavailable" } } : { statusCode: 200, body: emptyArchive });
      }).as("archive");
    });

    cy.visit("/blog");
    cy.acceptCookieNotice();
    cy.contains('[role="alert"]', "We could not load the article archive.").should("be.visible");
    cy.contains("button", "Try again").click();
    cy.contains("No articles match these filters.").should("be.visible");
  });
});
