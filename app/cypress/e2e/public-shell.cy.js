describe("public shell journeys", () => {
    it("navigates Home, About, and Blog through the active viewport navigation", () => {
      cy.interceptJson("GET", "**/api/contentful/blog-years", { years: [] }, "years");
      cy.interceptJson("GET", "**/api/contentful/tags", { items: [] }, "tags");
      cy.interceptJson("GET", "**/api/contentful/blog-index*", { featured: [], items: [], total: 0, page: 1, pageSize: 12, totalPages: 1 }, "archive");
      cy.visit("/");
      cy.acceptCookieNotice();
      cy.contains("Eu faço coisas para a web.").should("be.visible");

      if (Cypress.env("viewportClass") === "mobile") {
        cy.get('[aria-label="Navigation menu"]').click();
        cy.contains(".q-menu .q-item", "About").click();
      } else {
        cy.get('[aria-label="About"]').filter(":visible").click();
      }
      cy.location("pathname").should("eq", "/about");
      cy.contains("Eu sou uma pessoa simples").should("be.visible");

      if (Cypress.env("viewportClass") === "mobile") {
        cy.get('[aria-label="Navigation menu"]').click();
        cy.contains(".q-menu .q-item", "Blog").click();
      } else {
        cy.get('[aria-label="Blog"]').filter(":visible").click();
      }
      cy.location("pathname").should("eq", "/blog");
      cy.contains("Article archive").should("be.visible");
      cy.contains("Olá! O site utiliza o Google Analytics").should("not.exist");
    });

  it("recovers from an unknown route through the visible home action", () => {
    cy.visit("/route-that-does-not-exist");
    cy.acceptCookieNotice();
    cy.contains("404").should("be.visible");
    cy.contains("Oops.").should("be.visible");
    cy.contains("a", "Go Home").click();
    cy.location("pathname").should("eq", "/");
  });
});
