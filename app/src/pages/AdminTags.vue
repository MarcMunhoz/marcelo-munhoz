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
              <span class="tag-visibility-content">
                <q-badge outline color="blue-grey-7">{{ props.row.visibility || "private" }}</q-badge>
              </span>
            </q-td>
          </template>

          <template #body-cell-articleCount="props">
            <q-td :props="props" class="tag-article-count-cell">{{ props.row.articleCount }}</q-td>
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
                  @click="openTagDeleteConfirmation(props.row)"
                >
                  <q-tooltip v-if="props.row.articleCount === 0">Delete unused tag</q-tooltip>
                </q-btn>
              </div>
            </q-td>
          </template>
        </q-table>
      </section>
    </main>

    <q-dialog v-model="tagDeleteDialogOpen" persistent @hide="resetTagDeleteConfirmation">
      <q-card class="tag-delete-dialog">
        <q-card-section>
          <p>Are you sure you want to permanently delete <strong>{{ tagPendingDeletion?.label }}</strong>?</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps color="blue-grey-7" label="Cancel" :disable="tagDeletionPending" v-close-popup />
          <q-btn
            unelevated
            no-caps
            color="negative"
            icon="delete_forever"
            label="Delete permanently"
            :disable="tagDeletionPending"
            :loading="tagDeletionPending"
            @click="confirmPermanentTagDeletion"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { AdminApiError, adminUserMessage, createContentfulTag, deleteContentfulTag, listManagedContentfulTags } from "../utils/adminApi.js";
import { getAdminSession, isOwnerSession } from "../utils/adminAuth.js";
import { canDeleteManagedTag, normalizeEditorialTagOptions } from "../utils/adminTags.js";

const session = ref(null);
const sessionResolved = ref(false);
const tags = ref([]);
const newTagName = ref("");
const feedbackMessage = ref("");
const feedbackTone = ref("info");
const tagDeleteDialogOpen = ref(false);
const tagPendingDeletion = ref(null);
const tagDeletionPending = ref(false);
const loadingAction = ref("");
const router = useRouter();
const columns = [
        { name: "label", label: "Tag name", field: "label", align: "left", sortable: true },
        { name: "id", label: "Tag ID", field: "id", align: "left", sortable: true },
        { name: "visibility", label: "Visibility", field: "visibility", align: "center", sortable: true },
        { name: "articleCount", label: "Articles", field: "articleCount", align: "center", sortable: true },
        { name: "actions", label: "Actions", field: "actions", align: "right" },
];
const isOwner = computed(() => isOwnerSession(session.value));

const showError = (error) => {
  feedbackMessage.value = error instanceof AdminApiError && error.message ? error.message : adminUserMessage(error);
  feedbackTone.value = "error";
};
const loadTags = async () => {
  loadingAction.value = "list";
  try {
    const response = await listManagedContentfulTags({ session: session.value });
    tags.value = normalizeEditorialTagOptions(response.tags);
  } catch (error) {
    tags.value = [];
    showError(error);
  } finally {
    loadingAction.value = "";
  }
};
const createTag = async () => {
  const name = newTagName.value.trim();
  if (!name) return;
  loadingAction.value = "create";
  try {
    await createContentfulTag({ name, session: session.value });
    newTagName.value = "";
    await loadTags();
    feedbackMessage.value = "Tag created.";
    feedbackTone.value = "success";
  } catch (error) {
    showError(error);
  } finally {
    loadingAction.value = "";
  }
};
const openTagDeleteConfirmation = (tag) => {
  if (!canDeleteManagedTag(tag)) return;
  tagPendingDeletion.value = tag;
  tagDeleteDialogOpen.value = true;
};
const resetTagDeleteConfirmation = () => { tagPendingDeletion.value = null; };
const confirmPermanentTagDeletion = async () => {
  const tag = tagPendingDeletion.value;
  if (!tag || tagDeletionPending.value) return;
  tagDeletionPending.value = true;
  loadingAction.value = `delete-${tag.id}`;
  try {
    await deleteContentfulTag({ tagId: tag.id, session: session.value });
    tagDeleteDialogOpen.value = false;
    await loadTags();
  } catch (error) {
    showError(error);
  } finally {
    tagDeletionPending.value = false;
    loadingAction.value = "";
  }
};

onMounted(async () => {
  session.value = await getAdminSession();
  sessionResolved.value = true;

  if (!isOwner.value) {
    await router.replace(session.value ? "/admin" : "/");
      return;
  }

  await loadTags();
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

.tag-visibility-content {
  display: flex;
  justify-content: center;
  width: 100%;
}

.tag-article-count-cell {
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
