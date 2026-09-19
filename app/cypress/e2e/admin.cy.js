const visitAsPreview = (path, role) => cy.visit(path, {
  onBeforeLoad(windowRef) {
    windowRef.localStorage.setItem("admin.previewRole", role);
  },
});

const stubDashboard = (articles) => {
  cy.interceptJson("GET", "**/api/admin/contentful/articles", { articles, session: { authorEntryId: "author-1" } }, "articles");
};

describe("administrative journeys", () => {
  for (const path of ["/admin", "/admin/articles/new", "/admin/profile", "/admin/tags"]) {
    it(`redirects the signed-out route ${path} without opening live Identity`, () => {
      cy.intercept("GET", "**/api/admin/contentful/**", { forceNetworkError: true }).as("unexpectedAdminRequest");
      cy.visit(path, { onBeforeLoad: (windowRef) => { windowRef.__ADMIN_PREVIEW_DISABLED__ = true; } });
      cy.location("pathname").should("equal", "/");
      cy.contains("Editorial dashboard").should("not.exist");
    });
  }

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

  it("inserts a searched emoji through keyboard interaction without persisting provider data", () => {
    let unexpectedMutations = 0;
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      cy.intercept(method, "**/api/admin/contentful/**", (request) => {
        unexpectedMutations += 1;
        request.reply({ statusCode: 503, body: { error: "Unexpected test mutation" } });
      });
    }
    cy.fixture("admin-content.json").then(({ articles, tags }) => {
      stubDashboard(articles);
      cy.interceptJson("GET", "**/api/admin/contentful/tags", tags, "tags");
    });
    visitAsPreview("/admin/articles/draft-1/edit", "writer");

    cy.get('textarea[aria-label="Body"]').should("have.value", "Draft body").then(($textarea) => {
      const textarea = $textarea[0];
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });
    cy.get('button[aria-label="Insert emoji"]').focus().type("{enter}");
    cy.get("#body-emoji-picker").should("be.visible");
    cy.get('button[aria-label="Insert emoji"]').should("have.attr", "aria-expanded", "true");
    cy.get("emoji-picker").shadow().find('input#search[type="search"][role="combobox"]')
      .should("be.focused")
      .type("girassol")
      .should("have.attr", "aria-expanded", "true");
    cy.press(Cypress.Keyboard.Keys.DOWN);
    cy.get("emoji-picker").shadow().find("input#search")
      .invoke("attr", "aria-activedescendant")
      .should("match", /^emo-/);
    cy.press(Cypress.Keyboard.Keys.ENTER);
    cy.get('textarea[aria-label="Body"]')
      .should("have.value", "Draft body🌻")
      .and("be.focused")
      .then(($textarea) => {
        expect($textarea[0].selectionStart).to.equal(12);
        expect($textarea[0].selectionEnd).to.equal(12);
      });
    cy.get("#body-emoji-picker").should("not.exist");
    cy.get('button[aria-label="Insert emoji"]').should("have.attr", "aria-expanded", "false");
    cy.then(() => expect(unexpectedMutations).to.equal(0));
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

  it("requires a writer to request unpublication from the dashboard before editing", () => {
    cy.fixture("admin-content.json").then(({ articles }) => {
      stubDashboard([articles.find((article) => article.id === "published-1")]);
      cy.interceptJson("POST", "**/api/admin/contentful/articles/published-1/unpublication-requests", { ok: true }, "requestUnpublication");
    });
    visitAsPreview("/admin", "writer");

    cy.contains("tr, .admin-article-card", "Published article").within(() => {
      cy.get('button[aria-label="Edit"]').should("not.exist");
      cy.get('button[aria-label="Request unpublication"]').click();
    });
    cy.wait("@requestUnpublication").its("request.body").should("deep.equal", { version: 5, notes: "" });
  });

  it("lets an owner unpublish a live article before opening its editor", () => {
    cy.fixture("admin-content.json").then(({ articles, tags }) => {
      const published = articles.find((article) => article.id === "published-1");
      let unpublished = false;
      cy.intercept("GET", "**/api/admin/contentful/articles", (request) => request.reply({
        statusCode: 200,
        body: {
          articles: [{ ...published, status: unpublished ? "unpublished" : "published", lifecycleStatus: unpublished ? "unpublished" : "published" }],
          session: { authorEntryId: "author-1" },
        },
      })).as("articles");
      cy.intercept("POST", "**/api/admin/contentful/articles/published-1/unpublish", (request) => {
        unpublished = true;
        request.reply({ statusCode: 200, body: { ok: true } });
      }).as("unpublishBeforeEdit");
      cy.interceptJson("GET", "**/api/admin/contentful/tags", tags, "tags");
    });
    visitAsPreview("/admin", "owner");

    cy.contains("tr, .admin-article-card", "Published article").find('button[aria-label="Unpublish"]').click();
    cy.wait("@unpublishBeforeEdit").its("request.body.version").should("equal", 5);
    cy.contains("tr, .admin-article-card", "Published article").find('button[aria-label="Edit"]').click();
    cy.location("pathname").should("equal", "/admin/articles/published-article/edit");
    cy.contains("h1", "Edit article").should("be.visible");
  });

  for (const lifecycleStatus of ["published", "changed"]) {
    it(`blocks direct ${lifecycleStatus} editor routes without sending updates`, () => {
      let updateRequests = 0;
      cy.fixture("admin-content.json").then(({ articles, tags }) => {
        const liveArticle = {
          ...articles.find((article) => article.id === "published-1"),
          status: lifecycleStatus === "changed" ? "review" : "published",
          lifecycleStatus,
        };
        stubDashboard([liveArticle]);
        cy.interceptJson("GET", "**/api/admin/contentful/tags", tags, "tags");
        cy.intercept("PUT", "**/api/admin/contentful/articles/published-1", (request) => {
          updateRequests += 1;
          request.reply({ statusCode: 500, body: { error: "Unexpected update" } });
        });
      });
      visitAsPreview("/admin/articles/published-1/edit", "writer");

      cy.contains("h2", "Unpublish before editing").should("be.visible");
      cy.get("form").should("not.exist");
      cy.contains("button", "Save").should("not.exist");
      cy.then(() => expect(updateRequests).to.equal(0));
    });
  }

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
