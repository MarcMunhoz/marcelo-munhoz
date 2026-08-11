<template>
  <q-page class="admin-page q-pa-md">
    <section class="admin-shell">
      <header class="admin-header">
        <div>
          <p class="admin-kicker">Blog admin</p>
          <h1>Editorial desk</h1>
        </div>

        <div class="admin-session">
          <q-icon :name="session ? 'edit_note' : 'lock'" size="24px" />
          <div>
            <strong>{{ sessionLabel }}</strong>
            <span>{{ roleLabel }}</span>
          </div>
          <q-btn v-if="!session" outline color="blue-grey-7" icon="login" label="Sign in" size="sm" @click="openLogin" />
        </div>
      </header>

      <section v-if="!canWrite" class="admin-blocked">
        <q-icon name="lock" size="32px" />
        <div>
          <h2>Writer access required</h2>
          <p>Sign in with an invited writer account to draft articles.</p>
        </div>
      </section>

      <section v-else class="admin-grid">
        <aside class="editorial-rail">
          <span :class="{ active: activeStep === 'draft' }">Draft</span>
          <span :class="{ active: activeStep === 'review' }">Review</span>
          <span :class="{ active: activeStep === 'request' }">Take down</span>
        </aside>

        <section class="admin-editor">
          <div class="editor-toolbar">
            <div>
              <p class="admin-kicker">Article</p>
              <h2>{{ articleForm.id ? "Edit draft" : "New draft" }}</h2>
            </div>
            <q-badge outline color="teal-8">{{ statusMessage || "Not saved" }}</q-badge>
          </div>

          <q-form class="editor-form" @submit.prevent="saveDraft">
            <div class="form-row">
              <q-input v-model="articleForm.title" label="Title" outlined dense :error="Boolean(errors.title)" :error-message="errors.title" />
              <q-input v-model="articleForm.slug" label="Slug" outlined dense :error="Boolean(errors.slug)" :error-message="errors.slug" />
            </div>

            <q-input v-model="articleForm.description" label="Description" outlined dense type="textarea" autogrow :error="Boolean(errors.description)" :error-message="errors.description" />
            <q-input v-model="articleForm.body" label="Body" outlined type="textarea" :rows="10" :error="Boolean(errors.body)" :error-message="errors.body" />

            <div class="form-row">
              <q-input v-model="articleForm.createAt" label="Display date" outlined dense type="date" />
              <q-input v-model="articleForm.author" label="Author entry ID" outlined dense :error="Boolean(errors.author)" :error-message="errors.author" />
              <q-input v-model.number="articleForm.version" label="Version" outlined dense type="number" />
            </div>

            <div class="form-row">
              <q-input v-model="articleForm.cloudinaryPublicId" label="Cloudinary public ID" outlined dense />
              <q-input v-model="articleForm.cloudinaryUrl" label="Cloudinary URL" outlined dense />
            </div>

            <q-input v-model="articleForm.tags" label="Tags" outlined dense hint="Comma-separated Contentful tag IDs" />
            <q-input v-model="articleForm.notes" label="Review notes" outlined dense type="textarea" autogrow />

            <q-banner v-if="feedbackMessage" :class="feedbackClass" rounded>{{ feedbackMessage }}</q-banner>

            <div class="editor-actions">
              <q-btn unelevated color="teal-8" icon="save" label="Save draft" type="submit" :loading="loadingAction === 'save'" />
              <q-btn outline color="blue-grey-7" icon="rate_review" label="Submit for review" :disable="!articleForm.id" :loading="loadingAction === 'review'" @click="submitReview" />
              <q-btn outline color="amber-9" icon="visibility_off" label="Request unpublication" :disable="!articleForm.id" :loading="loadingAction === 'unpublish'" @click="requestUnpublication" />
            </div>
          </q-form>
        </section>

        <aside class="writer-panel">
          <section>
            <p class="admin-kicker">Draft status</p>
            <dl>
              <div>
                <dt>Entry ID</dt>
                <dd>{{ articleForm.id || "New draft" }}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{{ articleForm.version || "Unsaved" }}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{{ roleLabel }}</dd>
              </div>
            </dl>
          </section>

          <section>
            <p class="admin-kicker">Writer queue</p>
            <ul>
              <li>Save drafts without publishing.</li>
              <li>Send ready drafts to owner review.</li>
              <li>Ask the owner to take published work down.</li>
            </ul>
          </section>
        </aside>
      </section>
    </section>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { createArticleDraft, requestArticleUnpublication, submitArticleForReview, updateArticleDraft, AdminApiError } from "../utils/adminApi.js";
import { getAdminSession, isOwnerSession, isWriterSession, openAdminLogin } from "../utils/adminAuth.js";

const today = () => new Date().toISOString().slice(0, 10);

const defaultArticleForm = () => ({
  id: "",
  title: "",
  slug: "",
  description: "",
  body: "",
  createAt: today(),
  author: "",
  version: null,
  cloudinaryPublicId: "",
  cloudinaryUrl: "",
  tags: "",
  notes: "",
});

export default defineComponent({
  name: "AdminPage",
  data() {
    return {
      session: null,
      articleForm: defaultArticleForm(),
      errors: {},
      statusMessage: "",
      feedbackMessage: "",
      feedbackTone: "info",
      loadingAction: "",
      activeStep: "draft",
    };
  },
  computed: {
    canWrite() {
      return isWriterSession(this.session);
    },
    sessionLabel() {
      return this.session?.name || "Signed out";
    },
    roleLabel() {
      if (!this.session) {
        return "No session";
      }

      if (this.session.preview) {
        return "Writer preview";
      }

      return isOwnerSession(this.session) ? "Owner" : "Writer";
    },
    feedbackClass() {
      return {
        "feedback-success": this.feedbackTone === "success",
        "feedback-error": this.feedbackTone === "error",
        "feedback-info": this.feedbackTone === "info",
      };
    },
  },
  async mounted() {
    this.session = await getAdminSession();
  },
  methods: {
    openLogin() {
      openAdminLogin();
    },
    validateArticleForm() {
      const errors = {};

      if (!this.articleForm.title.trim()) {
        errors.title = "Title is required";
      }

      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(this.articleForm.slug)) {
        errors.slug = "Use a URL-safe slug";
      }

      if (!this.articleForm.description.trim()) {
        errors.description = "Description is required";
      }

      if (!this.articleForm.body.trim()) {
        errors.body = "Body is required";
      }

      if (!this.articleForm.author.trim()) {
        errors.author = "Author entry ID is required";
      }

      this.errors = errors;
      return Object.keys(errors).length === 0;
    },
    articlePayload() {
      const cloudinary = this.articleForm.cloudinaryPublicId || this.articleForm.cloudinaryUrl
        ? [
            {
              public_id: this.articleForm.cloudinaryPublicId,
              url: this.articleForm.cloudinaryUrl,
            },
          ]
        : undefined;

      return {
        title: this.articleForm.title.trim(),
        slug: this.articleForm.slug.trim(),
        description: this.articleForm.description.trim(),
        body: this.articleForm.body,
        createAt: this.articleForm.createAt,
        author: this.articleForm.author.trim(),
        version: this.articleForm.version,
        cloudinary,
        tags: this.articleForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
    },
    applyArticleResponse(payload = {}) {
      const sys = payload.sys || payload.draft?.sys;

      if (sys?.id) {
        this.articleForm.id = sys.id;
      }

      if (sys?.version) {
        this.articleForm.version = sys.version;
      }
    },
    async saveDraft() {
      this.activeStep = "draft";

      if (!this.validateArticleForm()) {
        this.showFeedback("Fix the highlighted fields before saving.", "error");
        return;
      }

      this.loadingAction = "save";

      try {
        const payload = this.articlePayload();
        const response = this.articleForm.id
          ? await updateArticleDraft({ articleId: this.articleForm.id, article: payload, session: this.session })
          : await createArticleDraft({ article: payload, session: this.session });

        this.applyArticleResponse(response);
        this.statusMessage = "Draft saved";
        this.showFeedback("Draft saved.", "success");
      } catch (error) {
        this.handleAdminError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    async submitReview() {
      this.activeStep = "review";
      this.loadingAction = "review";

      try {
        await submitArticleForReview({
          articleId: this.articleForm.id,
          version: this.articleForm.version,
          notes: this.articleForm.notes,
          session: this.session,
        });
        this.showFeedback("Submitted for owner review.", "success");
      } catch (error) {
        this.handleAdminError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    async requestUnpublication() {
      this.activeStep = "request";
      this.loadingAction = "unpublish";

      try {
        await requestArticleUnpublication({
          articleId: this.articleForm.id,
          version: this.articleForm.version,
          notes: this.articleForm.notes,
          session: this.session,
        });
        this.showFeedback("Unpublication request sent.", "success");
      } catch (error) {
        this.handleAdminError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    handleAdminError(error) {
      if (error instanceof AdminApiError) {
        if (error.status === 401) {
          this.showFeedback("Sign in again before saving.", "error");
          return;
        }

        if (error.status === 403) {
          this.showFeedback("Your account cannot perform this action.", "error");
          return;
        }

        if (error.status === 409) {
          this.showFeedback("This article changed elsewhere. Reload before saving.", "error");
          return;
        }

        this.showFeedback(error.message, "error");
        return;
      }

      this.showFeedback("The admin request could not be completed.", "error");
    },
    showFeedback(message, tone = "info") {
      this.feedbackMessage = message;
      this.feedbackTone = tone;
    },
  },
});
</script>

<style lang="scss" scoped>
.admin-page {
  background: #f5f7f4;
  color: #1e2a27;
}

.admin-shell {
  max-width: 1180px;
  margin: 0 auto;
}

.admin-header,
.admin-grid,
.editor-toolbar,
.editor-actions,
.form-row {
  display: flex;
  gap: 16px;
}

.admin-header {
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #c8d6d0;
  padding: 18px 0 22px;

  h1 {
    font-size: 2rem;
    line-height: 1.1;
    margin: 0;
  }
}

.admin-kicker {
  color: #60746d;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.admin-session {
  align-items: center;
  border: 1px solid #c8d6d0;
  display: flex;
  gap: 10px;
  padding: 10px 12px;

  span {
    color: #60746d;
    display: block;
    font-size: 0.8rem;
  }
}

.admin-blocked {
  align-items: center;
  background: #ffffff;
  border-left: 4px solid #b7791f;
  display: flex;
  gap: 16px;
  margin-top: 24px;
  padding: 18px;
}

.admin-grid {
  align-items: stretch;
  display: grid;
  gap: 18px;
  grid-template-columns: 72px minmax(0, 1fr) 280px;
  margin-top: 22px;
}

.editorial-rail {
  align-items: center;
  background: #1e2a27;
  color: #d9e4df;
  display: flex;
  flex-direction: column;
  gap: 18px;
  justify-content: center;
  min-height: 420px;
  padding: 12px 8px;

  span {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    writing-mode: vertical-rl;
  }

  .active {
    color: #65a89a;
  }
}

.admin-editor,
.writer-panel {
  background: #ffffff;
  border: 1px solid #c8d6d0;
  padding: 18px;
}

.editor-toolbar {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;

  h2 {
    font-size: 1.35rem;
    margin: 0;
  }
}

.editor-form {
  display: grid;
  gap: 14px;
}

.form-row {
  > * {
    flex: 1 1 0;
  }
}

.editor-actions {
  flex-wrap: wrap;
}

.writer-panel {
  display: grid;
  gap: 20px;
  align-content: start;

  dl,
  ul {
    margin: 0;
  }

  dt {
    color: #60746d;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  dd {
    margin: 0 0 12px;
  }

  li {
    margin: 8px 0;
  }
}

.feedback-success {
  background: #e4f4ef;
  color: #176b5d;
}

.feedback-error {
  background: #fff2df;
  color: #8a4b08;
}

.feedback-info {
  background: #eef3f7;
  color: #3f596b;
}

@media (max-width: 900px) {
  .admin-header,
  .form-row {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-grid {
    grid-template-columns: 1fr;
  }

  .editorial-rail {
    flex-direction: row;
    justify-content: flex-start;
    min-height: auto;

    span {
      writing-mode: horizontal-tb;
    }
  }
}
</style>
