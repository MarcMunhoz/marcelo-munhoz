const visitAsPreview = (path, role) => cy.visit(path, {
  onBeforeLoad(windowRef) {
    windowRef.localStorage.setItem("admin.previewRole", role);
  },
});

const stubDashboard = (articles) => {
  cy.interceptJson("GET", "**/api/admin/contentful/articles", { articles, session: { authorEntryId: "author-1" } }, "articles");
};

describe("administrative journeys", () => {
  it("redirects signed-out administrative routes without opening live Identity", () => {
    cy.intercept("GET", "**/api/admin/contentful/**", { forceNetworkError: true }).as("unexpectedAdminRequest");
    for (const path of ["/admin", "/admin/articles/new", "/admin/profile", "/admin/tags"]) {
      cy.visit(path, { onBeforeLoad: (windowRef) => { windowRef.__ADMIN_PREVIEW_DISABLED__ = true; } });
      cy.location("pathname").should("equal", "/");
      cy.contains("Editorial dashboard").should("not.exist");
    }
  });

  it("lets a writer filter owned work while hiding owner-only actions", () => {
    cy.fixture("admin-content.json").then(({ articles }) => stubDashboard(articles));
    visitAsPreview("/admin", "writer");

    cy.contains("h1", "Editorial dashboard").should("be.visible");
    cy.contains("button", "New article").should("be.visible");
    cy.contains("button", "Tags").should("not.exist");
    cy.contains(".q-field", "Status").click();
    cy.contains(".q-item", "Draft").click();
    cy.contains("Writer draft").should("be.visible");
    cy.contains("Review candidate").should("not.exist");
    cy.get('button[aria-label="Publish"], button[aria-label="Publish changes"]').should("not.exist");
  });

  it("creates a valid writer draft after validation and media selection", () => {
    cy.fixture("admin-content.json").then(({ profile, tags, media }) => {
      cy.interceptJson("GET", "**/api/admin/contentful/tags", tags, "tags");
      cy.interceptJson("GET", "**/api/admin/contentful/author-profile", profile, "profile");
      cy.interceptJson("GET", "**/api/admin/contentful/media/assets*", media, "media");
      cy.intercept("POST", "**/api/admin/contentful/articles", (request) => {
        expect(request.headers["x-admin-preview-role"]).to.equal("writer");
        expect(request.body).to.include({ title: "New browser article", slug: "new-browser-article" });
        request.reply({ statusCode: 200, body: { sys: { id: "created-1", version: 1 } } });
      }).as("createDraft");
      stubDashboard([]);
    });
    visitAsPreview("/admin/articles/new", "writer");

    cy.contains("button", "Save draft").click();
    cy.contains("Fix the highlighted fields before saving.").should("be.visible");
    cy.contains(".q-field", "Title").find("input").type("New browser article");
    cy.contains(".q-field", "Description").find("textarea").type("Created through a real browser journey");
    cy.get('textarea[aria-label="Body"]').type("Behavior-first body");
    cy.contains("button", "Select image").click();
    cy.wait("@media");
    cy.contains("Test cover").click();
    cy.contains("button", "Save draft").click();
    cy.wait("@createDraft");
    cy.location("pathname").should("equal", "/admin");
  });

  it("submits a writer draft and protects unsaved navigation", () => {
    cy.fixture("admin-content.json").then(({ articles, tags }) => {
      stubDashboard(articles);
      cy.interceptJson("GET", "**/api/admin/contentful/tags", tags, "tags");
      cy.interceptJson("POST", "**/api/admin/contentful/articles/draft-1/submit", { ok: true }, "submitReview");
    });
    cy.on("window:confirm", () => false);
    visitAsPreview("/admin/articles/draft-1/edit", "writer");

    cy.contains(".q-field", "Description").find("textarea").clear().type("Unsaved change");
    cy.contains("button", "Dashboard").click();
    cy.location("pathname").should("contain", "/admin/articles/draft-1/edit");
    cy.contains("button", "Submit for review").click();
    cy.wait("@submitReview").its("request.body").should("deep.equal", { version: 3, notes: "" });
    cy.location("pathname").should("equal", "/admin");
  });

  it("uploads and clears a thumbnail before requesting unpublication", () => {
    cy.fixture("admin-content.json").then(({ articles, tags }) => {
      const published = {
        ...articles.find((article) => article.id === "published-1"),
        thumbnailPublicId: "articles/original",
        thumbnailUrl: "https://images.example.test/original.jpg",
        alt: "Original thumbnail",
      };
      stubDashboard([published]);
      cy.interceptJson("GET", "**/api/admin/contentful/tags", tags, "tags");
      cy.intercept("POST", "**/api/admin/contentful/media/upload", (request) => {
        expect(request.body.filename).to.equal("replacement.png");
        expect(request.body.file).to.match(/^data:image\/png;base64,/);
        request.reply({
          statusCode: 200,
          body: {
            asset: {
              public_id: "articles/replacement",
              secure_url: "https://images.example.test/replacement.png",
              display_name: "Replacement",
              width: 32,
              height: 32,
            },
          },
        });
      }).as("uploadMedia");
      cy.interceptJson("POST", "**/api/admin/contentful/articles/published-1/unpublication-requests", { ok: true }, "requestUnpublication");
    });
    visitAsPreview("/admin/articles/published-1/edit", "writer");

    cy.contains(".q-field", "Upload image").find('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from("browser-thumbnail"),
      fileName: "replacement.png",
      mimeType: "image/png",
    });
    cy.wait("@uploadMedia");
    cy.get('img[src="https://images.example.test/replacement.png"]').should("be.visible");
    cy.contains("button", "Clear image").click();
    cy.contains("No thumbnail selected").should("be.visible");
    cy.contains("button", "Request unpublication").click();
    cy.wait("@requestUnpublication").its("request.body").should("deep.equal", { version: 5, notes: "" });
  });

  it("executes owner lifecycle actions with versioned requests", () => {
    cy.fixture("admin-content.json").then(({ articles }) => {
      stubDashboard(articles);
      for (const action of ["publish", "unpublish", "archive", "unarchive"]) {
        cy.interceptJson("POST", `**/api/admin/contentful/articles/*/${action}`, { ok: true }, action);
      }
      cy.interceptJson("DELETE", "**/api/admin/contentful/articles/*", { ok: true }, "deleteArticle");
    });
    visitAsPreview("/admin", "owner");

    cy.get('button[aria-label="Publish"]').filter(":visible").first().click();
    cy.wait("@publish").its("request.body.version").should("equal", 4);
    cy.get('button[aria-label="Unpublish"]').filter(":visible").first().click();
    cy.wait("@unpublish").its("request.body.version").should("equal", 5);
    cy.get('button[aria-label="Archive"]').filter(":visible").first().click();
    cy.wait("@archive");
    cy.get('button[aria-label="Unarchive"]').filter(":visible").first().click();
    cy.wait("@unarchive");
    cy.get('button[aria-label="Delete"]').filter(":visible").first().click();
    cy.contains(".q-field", "Article title").find("input").type("Archived article");
    cy.contains("button", "Delete permanently").click();
    cy.wait("@deleteArticle").its("request.body.version").should("equal", 6);
  });

  it("saves an owner profile and manages editorial tags", () => {
    cy.fixture("admin-content.json").then(({ profile, managedTags }) => {
      cy.interceptJson("GET", "**/api/admin/contentful/author-profile", profile, "profile");
      cy.interceptJson("PUT", "**/api/admin/contentful/author-profile", profile, "saveProfile");
      cy.interceptJson("GET", "**/api/admin/contentful/tags/manage", managedTags, "managedTags");
      cy.interceptJson("POST", "**/api/admin/contentful/tags", { tag: { id: "quality", label: "Quality" } }, "createTag");
      cy.interceptJson("POST", "**/api/admin/contentful/tags/unused/delete", { ok: true }, "deleteTag");
    });
    visitAsPreview("/admin/profile", "owner");
    cy.get('textarea[aria-label="Biography"]').clear().type("Updated biography");
    cy.contains("button", "Save profile").click();
    cy.wait("@saveProfile").its("request.body.biography").should("equal", "Updated biography");

    cy.visit("/admin/tags");
    cy.contains("Remove this tag from matching articles first").should("exist");
    cy.contains(".q-field", "New tag name").find("input").type("Quality");
    cy.contains("button", "Create tag").click();
    cy.wait("@createTag");
    cy.get('[aria-label="Delete Unused"]').click();
    cy.contains("button", "Delete permanently").click();
    cy.wait("@deleteTag");
  });
});
