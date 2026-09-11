import { assertReadOnlyRequest } from "./read-only.js";

beforeEach(() => {
  const mobile = Cypress.env("viewportClass") === "mobile";
  cy.viewport(mobile ? 390 : 1440, mobile ? 844 : 900);
  Cypress.env("criticalConsoleErrorCount", 0);
  cy.on("window:before:load", (windowRef) => {
    windowRef.console.error = () => Cypress.env("criticalConsoleErrorCount", Cypress.env("criticalConsoleErrorCount") + 1);
  });
  cy.intercept("**", (request) => {
    assertReadOnlyRequest(request);
    request.continue();
  });
});

afterEach(() => {
  expect(Cypress.env("criticalConsoleErrorCount"), "critical browser console errors").to.equal(0);
});
