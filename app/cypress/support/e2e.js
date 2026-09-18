import "./commands.js";

beforeEach(() => {
  cy.setViewportClass(Cypress.expose("viewportClass"));
  cy.clearAllCookies();
  cy.clearAllLocalStorage();
  cy.clearAllSessionStorage();
});

Cypress.on("uncaught:exception", (error) => {
  if (/ResizeObserver loop/.test(error.message)) return false;
  return true;
});
