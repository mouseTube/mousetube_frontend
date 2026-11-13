<script setup lang="ts">
// "Review": what users submitted and waits for an administrator, in one place. The decisions
// are those of the Django admin (validate, send back with a reason, activate or reject an
// account); this page only makes them quick: one list per kind, bulk actions, the reason asked once.
import axios from 'axios';
import { useRouter } from 'vue-router';
import { useAuth, isStaff } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

interface Fact {
  label: string;
  value: string;
}
interface Item {
  id: number;
  kind: string;
  title: string;
  subtitle: string;
  facts: Fact[];
  created_by: { username: string; name: string; email: string } | null;
  waiting_since: string | null;
  admin_url: string;
  pending: { kind: string; name: string; status: string }[];
  can_validate: boolean;
  files_count?: number;
}
interface KindCount {
  kind: string;
  label: string;
  count: number;
}

const router = useRouter();
const apiBaseUrl = useApiBaseUrl();
const adminBase = computed(() => apiBaseUrl.replace(/\/api\/?$/, ''));
const { token, currentUser, fetchUser } = useAuth();
const headers = () => (token.value ? { Authorization: `Bearer ${token.value}` } : {});

const kinds = ref<KindCount[]>([]);
const kind = ref('accounts');
const items = ref<Item[]>([]);
const page = ref(1);
const pages = ref(1);
const total = ref(0);
const loading = ref(true);
const failed = ref(false);
const selected = ref<number[]>([]);
const busy = ref(false);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');
const notify = (text: string, color = 'success') => {
  snackbarText.value = text;
  snackbarColor.value = color;
  snackbar.value = true;
};

const isAccounts = computed(() => kind.value === 'accounts');
const current = computed(() => kinds.value.find((k) => k.kind === kind.value));
const allSelected = computed(
  () => items.value.length > 0 && selected.value.length === items.value.length
);

async function loadKinds() {
  const { data } = await axios.get(`${apiBaseUrl}/review/`, { headers: headers() });
  kinds.value = data.kinds;
  total.value = data.total;
}
async function loadItems() {
  loading.value = true;
  failed.value = false;
  selected.value = [];
  try {
    const { data } = await axios.get(`${apiBaseUrl}/review/${kind.value}/`, {
      headers: headers(),
      params: { page: page.value },
    });
    items.value = data.results;
    pages.value = data.pages;
  } catch (error: any) {
    // a page past the end (everything of the last page was decided): go back one page
    if (error?.response?.status === 404 && page.value > 1) {
      page.value -= 1;
      return loadItems();
    }
    // eslint-disable-next-line no-console
    console.error('error while loading the review list :', error);
    failed.value = true;
    items.value = [];
  } finally {
    loading.value = false;
  }
}
function chooseKind(value: string) {
  kind.value = value;
  page.value = 1;
  loadItems();
}

// ---- decisions ----
const reasonDialog = ref(false);
const reason = ref('');
const pendingIds = ref<number[]>([]);

function askSendBack(ids: number[]) {
  pendingIds.value = ids;
  reason.value = '';
  reasonDialog.value = true;
}

async function decide(action: 'validate' | 'send_back', ids: number[], why = '') {
  busy.value = true;
  try {
    const { data } = await axios.post(
      `${apiBaseUrl}/review/${kind.value}/decision/`,
      { action, ids, reason: why },
      { headers: headers() }
    );
    kinds.value = data.kinds;
    total.value = data.total;
    const verb =
      action === 'validate'
        ? isAccounts.value
          ? 'activated'
          : 'validated'
        : isAccounts.value
          ? 'rejected'
          : 'sent back';
    if (data.done) notify(`${data.done} ${verb}.`);
    if (data.skipped?.length) {
      notify(
        `${data.done ? `${data.done} ${verb}. ` : ''}${data.skipped.length} skipped: ${data.skipped[0].reason}`,
        'warning'
      );
    }
    reasonDialog.value = false;
    await loadItems();
  } catch (error: any) {
    notify(error?.response?.data?.detail || 'The decision could not be saved.', 'error');
  } finally {
    busy.value = false;
  }
}

function toggleAll(on: boolean) {
  selected.value = on ? items.value.map((i) => i.id) : [];
}

const since = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

// "by Ada · uses 1 new entry · since 5 Nov 2026 · 3 files", whatever of it exists
const metaOf = (item: Item) =>
  [
    item.created_by ? `by ${item.created_by.name || item.created_by.username}` : '',
    item.subtitle,
    item.waiting_since ? `since ${since(item.waiting_since)}` : '',
    item.files_count != null ? `${item.files_count} file${item.files_count === 1 ? '' : 's'}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

onMounted(async () => {
  if (!currentUser.value) await fetchUser();
  if (!isStaff.value) {
    router.replace('/');
    return;
  }
  await loadKinds();
  // open on the first kind that has something waiting
  kind.value = kinds.value.find((k) => k.count > 0)?.kind ?? 'accounts';
  await loadItems();
});
</script>

<template>
  <v-main class="w-100">
    <v-container fluid>
      <v-card variant="flat" class="mx-auto" max-width="1000">
        <div class="d-flex align-center justify-space-between">
          <div class="eyebrow">
            <span class="title-bar" aria-hidden="true"></span>
            <span class="text-overline">Admin</span>
          </div>
          <v-btn
            to="/account/details"
            variant="text"
            size="small"
            prepend-icon="mdi-arrow-left"
            class="me-n2"
          >
            Back to my profile
          </v-btn>
        </div>
        <h1>
          Review
          <v-chip v-if="total" class="ms-2" color="primary" variant="tonal"
            >{{ total }} waiting</v-chip
          >
        </h1>
        <p class="review-lead">
          What users submitted and waits for your decision. Validate what is right; send back what
          needs changes, and the author gets your reason by e-mail.
        </p>

        <v-tabs
          :model-value="kind"
          class="review-tabs mt-4"
          color="primary"
          hide-slider
          show-arrows
          @update:model-value="chooseKind"
        >
          <v-tab v-for="k in kinds" :key="k.kind" :value="k.kind">
            {{ k.label }}<span class="tab-count" :class="{ zero: !k.count }">{{ k.count }}</span>
          </v-tab>
        </v-tabs>

        <v-card variant="outlined" rounded="xl" class="pa-5 mt-4">
          <!-- bulk bar -->
          <div class="bulk">
            <v-checkbox
              :model-value="allSelected"
              :indeterminate="selected.length > 0 && !allSelected"
              density="compact"
              hide-details
              :disabled="!items.length"
              :label="selected.length ? `${selected.length} selected` : 'Select all'"
              @update:model-value="toggleAll(!!$event)"
            />
            <div v-if="selected.length" class="d-flex ga-2">
              <v-btn
                color="primary"
                size="small"
                prepend-icon="mdi-check"
                :loading="busy"
                @click="decide('validate', selected)"
              >
                {{ isAccounts ? 'Activate' : 'Validate' }} {{ selected.length }}
              </v-btn>
              <v-btn
                variant="outlined"
                size="small"
                :prepend-icon="isAccounts ? 'mdi-account-remove-outline' : 'mdi-undo-variant'"
                @click="askSendBack(selected)"
              >
                {{ isAccounts ? 'Reject' : 'Send back' }} {{ selected.length }}
              </v-btn>
            </div>
          </div>

          <v-progress-linear v-if="loading" indeterminate color="primary" class="my-4" />
          <v-alert v-else-if="failed" type="error" variant="tonal" class="my-4">
            The list could not be loaded.
            <template #append
              ><v-btn variant="text" size="small" @click="loadItems">Retry</v-btn></template
            >
          </v-alert>
          <div v-else-if="!items.length" class="review-empty">
            <v-icon size="40" color="success">mdi-check-circle-outline</v-icon>
            <strong>All caught up.</strong>
            <span>Nothing waits in “{{ current?.label }}”.</span>
          </div>

          <ul v-else class="entry-list">
            <li v-for="item in items" :key="item.id" class="entry-row review-row">
              <v-checkbox
                v-model="selected"
                :value="item.id"
                density="compact"
                hide-details
                :aria-label="`Select ${item.title}`"
              />
              <div class="entry-main">
                <div class="entry-name">
                  {{ item.title }}
                  <a
                    :href="adminBase + item.admin_url"
                    target="_blank"
                    rel="noopener"
                    class="admin-link"
                    title="Open in the Django admin"
                  >
                    <v-icon size="15">mdi-open-in-new</v-icon>
                  </a>
                </div>
                <div class="entry-meta">{{ metaOf(item) }}</div>
                <dl v-if="item.facts.length" class="review-facts">
                  <div v-for="fact in item.facts" :key="fact.label">
                    <dt>{{ fact.label }}</dt>
                    <dd>{{ fact.value }}</dd>
                  </div>
                </dl>
                <div v-if="item.pending.length" class="review-pending">
                  <span class="text-caption text-medium-emphasis">Also to validate with it:</span>
                  <v-chip
                    v-for="entry in item.pending"
                    :key="entry.kind + entry.name"
                    size="x-small"
                    label
                    variant="tonal"
                    color="warning"
                  >
                    {{ entry.kind }}: {{ entry.name }}
                  </v-chip>
                </div>
                <v-alert
                  v-if="!item.can_validate"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mt-2"
                >
                  The e-mail address is not confirmed yet: it cannot be activated.
                </v-alert>
              </div>

              <div class="entry-actions">
                <v-btn
                  color="primary"
                  size="small"
                  prepend-icon="mdi-check"
                  :disabled="!item.can_validate"
                  :loading="busy"
                  @click="decide('validate', [item.id])"
                >
                  {{ isAccounts ? 'Activate' : 'Validate' }}
                </v-btn>
                <v-btn
                  variant="outlined"
                  size="small"
                  :prepend-icon="isAccounts ? 'mdi-account-remove-outline' : 'mdi-undo-variant'"
                  @click="askSendBack([item.id])"
                >
                  {{ isAccounts ? 'Reject' : 'Send back' }}
                </v-btn>
              </div>
            </li>
          </ul>

          <v-pagination
            v-if="pages > 1"
            v-model="page"
            :length="pages"
            :total-visible="5"
            density="comfortable"
            @update:model-value="loadItems"
          />
        </v-card>
      </v-card>
    </v-container>

    <v-dialog v-model="reasonDialog" max-width="480">
      <v-card>
        <v-card-title>
          {{ isAccounts ? 'Reject' : 'Send back' }} {{ pendingIds.length }}
          {{ pendingIds.length === 1 ? 'item' : 'items' }}
        </v-card-title>
        <v-card-text>
          <p v-if="isAccounts" class="text-body-2 mb-3">
            The request is deleted and the person is told by e-mail; they can register again.
          </p>
          <p v-else class="text-body-2 mb-3">
            It goes back to draft and the author is told by e-mail. Say what to change.
          </p>
          <v-textarea
            v-model="reason"
            label="Reason (optional, sent to the author)"
            variant="outlined"
            rows="3"
            auto-grow
            counter="1000"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="reasonDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="busy" @click="decide('send_back', pendingIds, reason)">
            {{ isAccounts ? 'Reject' : 'Send back' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="5000" location="top">
      {{ snackbarText }}
    </v-snackbar>
  </v-main>
</template>

<style scoped>
.eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0 8px;
  color: #555;
}
.title-bar {
  width: 40px;
  height: 4px;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
}
.review-lead {
  max-width: 44rem;
  margin: 8px 0 0;
  color: #555;
}
.review-tabs :deep(.v-slide-group__content) {
  gap: 6px;
}
.review-tabs .v-tab {
  min-width: 0;
  padding: 0 14px;
  border-radius: 12px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}
.review-tabs .v-tab--selected {
  background: #f6f6f6;
}
.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  margin-left: 8px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgb(var(--v-theme-primary));
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.tab-count.zero {
  background: #ececec;
  color: #777;
}
.bulk {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 44px;
}
.review-row {
  grid-template-columns: auto 1fr auto;
  align-items: start;
}
.review-facts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 6px 18px;
  margin: 8px 0 0;
}
.review-facts dt {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #777;
}
.review-facts dd {
  margin: 0;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}
.review-pending {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.admin-link {
  color: #999;
  line-height: 1;
}
.admin-link:hover {
  color: rgb(var(--v-theme-primary));
}
.review-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 36px 8px;
  color: #666;
}
@media (max-width: 700px) {
  .review-row {
    grid-template-columns: auto 1fr;
  }
  .review-row .entry-actions {
    grid-column: 1 / -1;
  }
}
</style>
