const viewports = { desktop: [1440, 900], mobile: [375, 812] };

Cypress.Commands.add("setViewportClass", (viewportClass) => {
  const dimensions = viewports[viewportClass];
  if (!dimensions) throw new Error(`Unsupported viewport class: ${viewportClass}`);
  cy.viewport(...dimensions);
});

Cypress.Commands.add("usePreviewRole", (role) => {
  if (!["writer", "owner"].includes(role)) throw new Error(`Unsupported preview role: ${role}`);
  cy.window().then((windowRef) => windowRef.localStorage.setItem("admin.previewRole", role));
});

Cypress.Commands.add("acceptCookieNotice", () => {
  cy.get(".cookie-card").should("be.visible").within(() => {
    cy.contains("button", "OK").click();
  });
});

Cypress.Commands.add("interceptJson", (method, url, body, alias) => {
  cy.intercept(method, url, { statusCode: 200, body }).as(alias);
});
