const requestOk = (path, options = {}) => cy.request({ url: path, log: false, ...options }).then((response) => {
  expect(response.status, `${path} status`).to.be.within(200, 299);
  return response;
});

describe("deployed public boundary", () => {
  it("serves Home, About, Blog, SPA direct entry, and not-found routes", () => {
    cy.visit("/");
    cy.contains("h1", "Eu faço coisas para a web.").should("be.visible");

    cy.visit("/about");
    cy.contains("Eu sou uma pessoa simples").should("be.visible");

    cy.visit("/blog");
    cy.contains("Article archive").should("be.visible");

    cy.visit("/remote-smoke-route-that-does-not-exist");
    cy.contains("404").should("be.visible");
    cy.contains("Oops.").should("be.visible");
  });

  it("resolves the legacy tag redirect in the deployed SPA", () => {
    cy.visit("/blog/tags/testing");
    cy.location("pathname").should("eq", "/blog");
    cy.location("search").should("eq", "?tag=testing");
  });

  it("serves built assets, the public Function, and health without mutations", () => {
    cy.visit("/");
    cy.document().then((documentRef) => {
      const assets = [...documentRef.querySelectorAll('script[src], link[rel="stylesheet"][href]')]
        .map((element) => element.src || element.href)
        .filter((url) => new URL(url).origin === documentRef.location.origin);
      expect(assets.length).to.be.greaterThan(0);
      cy.wrap(assets.slice(0, 12), { log: false }).each((url) => requestOk(url));
    });

    requestOk("/api/contentful/blog-years").its("headers.content-type").should("include", "application/json");
    requestOk("/healthz").then((response) => expect(response.body).to.equal("OK"));
  });

  it("applies security headers and the administrative indexing policy", () => {
    requestOk("/").then((response) => {
      expect(response.headers).to.include({
        "x-content-type-options": "nosniff",
        "x-frame-options": "SAMEORIGIN",
      });
      expect(response.headers["strict-transport-security"]).to.include("max-age=");
      expect(response.headers["content-security-policy"]).to.include("default-src");
    });
    requestOk("/robots.txt").its("body").should("include", "Disallow: /admin");

    cy.visit("/admin");
    cy.location("pathname").should("eq", "/");
    cy.contains("h1", "Eu faço coisas para a web.").should("be.visible");
  });

  it("renders the representative navigation for the active viewport", () => {
    cy.visit("/");
    if (Cypress.expose("viewportClass") === "mobile") {
      cy.get('[aria-label="Navigation menu"]').should("be.visible");
    } else {
      cy.get('[aria-label="About"]').filter(":visible").should("be.visible");
      cy.get('[aria-label="Blog"]').filter(":visible").should("be.visible");
    }
  });
});
