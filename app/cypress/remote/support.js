import { enforceReadOnlyRequest } from "./read-only.js";

let criticalConsoleErrors = [];

beforeEach(() => {
  const mobile = Cypress.expose("viewportClass") === "mobile";
  cy.viewport(mobile ? 390 : 1440, mobile ? 844 : 900);
  criticalConsoleErrors = [];
  cy.on("window:before:load", (windowRef) => {
    windowRef.console.error = (...args) => { criticalConsoleErrors.push(args.map(String).join(" ")); };
  });
  cy.intercept({ method: "+(POST|PUT|PATCH|DELETE)", url: "**" }, (request) => {
    enforceReadOnlyRequest(request);
  });
});

afterEach(() => {
  expect(
    criticalConsoleErrors,
    `critical browser console errors: ${JSON.stringify(criticalConsoleErrors)}`,
  ).to.deep.equal([]);
});
