<template>
  <q-page class="tag-admin-page">
    <main v-if="sessionResolved && isOwner" class="tag-admin-shell">
      <header class="tag-admin-header">
        <div class="tag-admin-heading">
          <p class="tag-admin-kicker">Blog admin</p>
          <h1 class="tag-admin-title">Tag management</h1>
          <p class="tag-admin-description">Review usage before removing editorial tags.</p>
        </div>
        <q-btn flat no-caps color="blue-grey-8" icon="arrow_back" label="Articles" to="/admin" />
      </header>

      <q-banner v-if="feedbackMessage" :class="feedbackTone === 'error' ? 'feedback-error' : 'feedback-success'" rounded>
        {{ feedbackMessage }}
      </q-banner>

      <section class="tag-admin-panel">
        <q-form class="tag-create-form" @submit.prevent="createTag">
          <q-input v-model="newTagName" outlined dense label="New tag name" :disable="loadingAction === 'create'" />
          <q-btn
            unelevated
            no-caps
            color="blue-grey-8"
            icon="add"
            label="Create tag"
            type="submit"
            :disable="!newTagName.trim()"
            :loading="loadingAction === 'create'"
          />
        </q-form>

        <q-table
          flat
          row-key="id"
          :rows="tags"
          :columns="columns"
          :loading="loadingAction === 'list'"
          :pagination="{ rowsPerPage: 12 }"
          no-data-label="No editorial tags available"
        >
          <template #body-cell-visibility="props">
            <q-td :props="props" class="tag-visibility-cell">
              <q-badge outline color="blue-grey-7">{{ props.row.visibility || "private" }}</q-badge>
            </q-td>
          </template>

          <template #body-cell-articleCount="props">
            <q-td :props="props">{{ props.row.articleCount }}</q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props">
              <div class="tag-delete-action">
                <span v-if="props.row.articleCount > 0" class="tag-delete-guidance">
                  Remove this tag from matching articles first
                </span>
                <q-btn
                  dense
                  flat
                  round
                  color="negative"
                  icon="delete_forever"
                  :disable="!canDeleteManagedTag(props.row)"
                  :loading="loadingAction === `delete-${props.row.id}`"
                  :aria-label="`Delete ${props.row.label}`"
                  @click="deleteTag(props.row)"
                >
                  <q-tooltip v-if="props.row.articleCount === 0">Delete unused tag</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </template>
        </q-table>
      </section>
    </main>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { AdminApiError, adminUserMessage, createContentfulTag, deleteContentfulTag, listManagedContentfulTags } from "../utils/adminApi.js";
import { getAdminSession, isOwnerSession } from "../utils/adminAuth.js";
import { canDeleteManagedTag, normalizeEditorialTagOptions, runDoubleConfirmedTagDeletion } from "../utils/adminTags.js";

export default defineComponent({
  name: "AdminTagsPage",
  data() {
    return {
      session: null,
      sessionResolved: false,
      tags: [],
      newTagName: "",
      feedbackMessage: "",
      feedbackTone: "info",
      loadingAction: "",
      columns: [
        { name: "label", label: "Tag name", field: "label", align: "left", sortable: true },
        { name: "id", label: "Tag ID", field: "id", align: "left", sortable: true },
        { name: "visibility", label: "Visibility", field: "visibility", align: "center", sortable: true },
        { name: "articleCount", label: "Articles", field: "articleCount", align: "left", sortable: true },
        { name: "actions", label: "Actions", field: "actions", align: "right" },
      ],
    };
  },
  computed: {
    isOwner() {
      return isOwnerSession(this.session);
    },
  },
  async mounted() {
    this.session = await getAdminSession();
    this.sessionResolved = true;

    if (!this.isOwner) {
      await this.$router.replace("/admin");
      return;
    }

    await this.loadTags();
  },
  methods: {
    canDeleteManagedTag,
    async loadTags() {
      this.loadingAction = "list";

      try {
        const response = await listManagedContentfulTags({ session: this.session });
        this.tags = normalizeEditorialTagOptions(response.tags);
      } catch (error) {
        this.tags = [];
        this.showError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    async createTag() {
      const name = this.newTagName.trim();
      if (!name) return;

      this.loadingAction = "create";
      try {
        await createContentfulTag({ name, session: this.session });
        this.newTagName = "";
        await this.loadTags();
        this.feedbackMessage = "Tag created.";
        this.feedbackTone = "success";
      } catch (error) {
        this.showError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    confirmDeletion(stage, tag) {
      const message =
        stage === "warning"
          ? `Delete ${tag.label}? This action cannot be undone.`
          : `Are you sure you want to permanently delete ${tag.label}?`;

      return new Promise((resolve) => {
        this.$q
          .dialog({
            title: stage === "warning" ? "Delete tag" : "Are you sure?",
            message,
            cancel: true,
            persistent: true,
            ok: { color: "negative", label: stage === "warning" ? "Continue" : "Delete permanently" },
          })
          .onOk(() => resolve(true))
          .onCancel(() => resolve(false));
      });
    },
    async deleteTag(tag) {
      try {
        await runDoubleConfirmedTagDeletion({
          tag,
          confirm: (stage, selectedTag) => this.confirmDeletion(stage, selectedTag),
          remove: async (selectedTag) => {
            this.loadingAction = `delete-${selectedTag.id}`;
            await deleteContentfulTag({ tagId: selectedTag.id, session: this.session });
            await this.loadTags();
          },
        });
      } catch (error) {
        this.showError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    showError(error) {
      this.feedbackMessage = error instanceof AdminApiError && error.message ? error.message : adminUserMessage(error);
      this.feedbackTone = "error";
    },
  },
});
</script>

<style lang="scss" scoped>
.tag-admin-page {
  background: #f2f4f3;
  color: #263238;
  min-height: inherit;
}

.tag-admin-shell {
  margin: 0 auto;
  max-width: 1180px;
  padding: 22px;
}

.tag-admin-header,
.tag-create-form {
  align-items: center;
  display: flex;
  gap: 14px;
  justify-content: space-between;
}

.tag-admin-header {
  background: #fff;
  border: 1px solid #cfd8dc;
  border-left: 4px solid #455a64;
  margin-bottom: 18px;
  padding: 18px 20px;

  h1,
  p {
    margin: 0;
  }
}

.tag-admin-heading {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.tag-admin-title {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.tag-admin-description {
  color: #546e7a;
  line-height: 1.4;
}

.tag-admin-kicker {
  color: #607d8b;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.tag-admin-panel {
  background: #fff;
  border: 1px solid #cfd8dc;
  padding: 16px;
}

.tag-create-form {
  justify-content: flex-start;
  margin-bottom: 16px;

  .q-field {
    flex: 1 1 320px;
    max-width: 520px;
  }
}

.feedback-error,
.feedback-success {
  margin-bottom: 14px;
}

.feedback-error {
  background: #ffebee;
  color: #b71c1c;
}

.feedback-success {
  background: #e8f5e9;
  color: #1b5e20;
}

.tag-visibility-cell {
  text-align: center;
}

.tag-delete-action {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  min-width: 0;
}

.tag-delete-action .q-btn {
  flex: 0 0 auto;
}

.tag-delete-guidance {
  color: #546e7a;
  font-size: 0.75rem;
  line-height: 1.25;
  max-width: 180px;
  white-space: normal;
}

@media (max-width: 600px) {
  .tag-admin-header,
  .tag-create-form {
    align-items: stretch;
    flex-direction: column;
  }

  .tag-admin-header .q-btn {
    align-self: flex-start;
  }
}
</style>
