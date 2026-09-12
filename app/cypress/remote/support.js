import { assertReadOnlyRequest } from "./read-only.js";

let criticalConsoleErrorCount = 0;

beforeEach(() => {
  const mobile = Cypress.expose("viewportClass") === "mobile";
  cy.viewport(mobile ? 390 : 1440, mobile ? 844 : 900);
  criticalConsoleErrorCount = 0;
  cy.on("window:before:load", (windowRef) => {
    windowRef.console.error = () => { criticalConsoleErrorCount += 1; };
  });
  cy.intercept("**", (request) => {
    assertReadOnlyRequest(request);
    request.continue();
  });
});

afterEach(() => {
  expect(criticalConsoleErrorCount, "critical browser console errors").to.equal(0);
});
