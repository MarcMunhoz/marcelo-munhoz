const epoch = Date.UTC(2026, 7, 20, 12, 0, 0);
const sessionId = "browser-session-e2e";

const visitWithIdentity = (path = "/admin") => {
  cy.interceptJson("GET", "**/api/admin/contentful/articles", { articles: [] }, "articles");
  cy.interceptJson("GET", "**/api/admin/contentful/author-profile", { profile: null }, "profile");
  cy.setCookie("admin_browser_session", sessionId, { secure: true, sameSite: "strict" });
  cy.visit(path, {
    onBeforeLoad(windowRef) {
      windowRef.localStorage.setItem("admin.sessionLifecycle", JSON.stringify({
        version: 1,
        sessionId,
        lastActivityAt: epoch,
        event: "login",
      }));
      const callbacks = new Map();
      windowRef.__identityLogoutCalls = 0;
      windowRef.netlifyIdentity = {
        currentUser: () => ({
          id: "writer-e2e",
          app_metadata: { roles: ["writer"], authorEntryId: "author-1" },
          user_metadata: { full_name: "Writer E2E" },
          jwt: async () => "deterministic-test-token",
        }),
        on: (event, callback) => callbacks.set(event, callback),
        off: (event) => callbacks.delete(event),
        logout: async () => { windowRef.__identityLogoutCalls += 1; },
      };
    },
  });
};

describe("administrative session lifecycle", () => {
  beforeEach(() => cy.clock(epoch));

  it("warns before inactivity expiry and continues the session intentionally", () => {
    visitWithIdentity();
    cy.contains("h1", "Editorial dashboard").should("be.visible");
    cy.tick(14 * 60 * 1_000);
    cy.tick(500);
    cy.contains('[role="alertdialog"]', "Admin session expiring").should("exist");
    cy.contains("button", "Continue session").click({ force: true });
    cy.window().then((windowRef) => {
      const state = JSON.parse(windowRef.localStorage.getItem("admin.sessionLifecycle"));
      expect(state.event).to.equal("continue");
      expect(state.lastActivityAt).to.equal(epoch + 14 * 60 * 1_000 + 500);
    });
    cy.clock().then((clock) => clock.restore());
    cy.contains('[role="alertdialog"]', "Admin session expiring").should("not.be.visible");
  });

  it("expires an inactive session and returns to the public home", () => {
    visitWithIdentity();
    cy.contains("h1", "Editorial dashboard").should("be.visible");
    cy.tick(14 * 60 * 1_000);
    cy.tick(60 * 1_000);
    cy.clock().then((clock) => clock.restore());
    cy.location("pathname").should("equal", "/");
    cy.window().its("__identityLogoutCalls").should("be.gte", 1);
    cy.getCookie("admin_browser_session").should("be.null");
  });

  it("signs out intentionally from the inactivity warning", () => {
    visitWithIdentity();
    cy.contains("h1", "Editorial dashboard").should("be.visible");
    cy.tick(14 * 60 * 1_000);
    cy.tick(500);
    cy.contains('[role="alertdialog"]', "Admin session expiring").should("exist");
    cy.contains("button", "Sign out").click({ force: true });
    cy.clock().then((clock) => clock.restore());
    cy.location("pathname").should("equal", "/");
    cy.window().its("__identityLogoutCalls").should("be.gte", 1);
    cy.getCookie("admin_browser_session").should("be.null");
  });

  it("applies a valid cross-tab logout event", () => {
    visitWithIdentity();
    cy.contains("h1", "Editorial dashboard").should("be.visible");
    cy.window().then((windowRef) => {
      windowRef.dispatchEvent(new windowRef.StorageEvent("storage", {
        key: "admin.sessionLifecycleEvent",
        newValue: JSON.stringify({ version: 1, type: "logout", sessionId, at: epoch }),
      }));
    });
    cy.clock().then((clock) => clock.restore());
    cy.location("pathname").should("equal", "/");
    cy.window().its("__identityLogoutCalls").should("be.gte", 1);
  });
});
