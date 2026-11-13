<script setup lang="ts">
// "My vocalizations": the recording sessions of the user, whatever their state, to pick up a
// draft, share one, follow a review, or deposit a shared one in a repository.
import axios from 'axios';
import debounce from 'lodash-es/debounce';
import { useRouter } from 'vue-router';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import AccountListHeader from '@/components/AccountListHeader.vue';
import SortButtons, { type Sort } from '@/components/SortButtons.vue';

interface MySession {
  id: number;
  name: string;
  date: string | null;
  is_multiple: boolean;
  status: 'draft' | 'waiting validation' | 'shared' | 'published';
  files_count: number | null;
  files_to_deposit: number | null; // files without a DOI: what a deposit would send
  doi: string | null;
  modified_at: string | null;
}

const PAGE_SIZE = 10;
const STATES = [
  { value: 'draft', title: 'Draft', color: undefined, help: 'Only you can see it.' },
  {
    value: 'waiting validation',
    title: 'Waiting for validation',
    color: 'warning',
    help: 'An administrator reviews what is new in it. Withdraw it to edit.',
  },
  { value: 'shared', title: 'Shared', color: 'success', help: 'Public. Ready to be deposited.' },
  { value: 'published', title: 'Published', color: 'teal', help: 'Public, with a DOI.' },
] as const;
const stateOf = (status: string) => STATES.find((s) => s.value === status) ?? STATES[0];
// a shared session whose files all have their DOI (an import, a record elsewhere) has nothing left to deposit
const toDeposit = (s: { files_to_deposit: number | null }) => (s.files_to_deposit ?? 1) > 0;
const helpOf = (s: MySession) =>
  s.status === 'shared' && !toDeposit(s)
    ? 'Public, and its files already have their DOI.'
    : stateOf(s.status).help;

const emit = defineEmits<{ (e: 'deleted'): void }>();
const router = useRouter();
const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();
const headers = () => (token.value ? { Authorization: `Bearer ${token.value}` } : {});

const sessions = ref<MySession[]>([]);
const count = ref(0);
const page = ref(1);
const search = ref('');
const status = ref<string | null>(null);
const loading = ref(false);
const failed = ref(false);
const busyId = ref<number | null>(null);

const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');
const notify = (text: string, color = 'success') => {
  snackbarText.value = text;
  snackbarColor.value = color;
  snackbar.value = true;
};

// the last edited first by default: a draft to pick up is usually a recent one
const sort = ref<Sort>({ key: 'date', dir: 'desc' });
const ordering = computed(() => {
  const field = sort.value.key === 'name' ? 'name' : 'modified_at';
  return sort.value.dir === 'asc' ? field : `-${field}`;
});
watch(sort, () => reload(), { deep: true });

const pages = computed(() => Math.max(1, Math.ceil(count.value / PAGE_SIZE)));

async function load() {
  loading.value = true;
  failed.value = false;
  try {
    const params: Record<string, string | number> = {
      page: page.value,
      ordering: ordering.value,
    };
    if (search.value.trim()) params.search = search.value.trim();
    if (status.value) params.status = status.value;
    const { data } = await axios.get(`${apiBaseUrl}/recording-session/`, {
      headers: headers(),
      params,
    });
    sessions.value = data.results;
    count.value = data.count;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('error while loading my vocalizations :', error);
    failed.value = true;
    sessions.value = [];
  } finally {
    loading.value = false;
  }
}

const reload = (resetPage = true) => {
  if (resetPage) page.value = 1;
  return load();
};
const onSearch = debounce(() => reload(), 400);
watch(status, () => reload());
onMounted(load);

// ---- actions ----
// the creation page opens the session; "file" goes straight to the files and the deposit
const open = (session: MySession, step?: 'file') =>
  router.push({
    path: '/vocalization/create',
    query: { session: session.id, ...(step ? { step } : {}) },
  });

async function change(session: MySession, to: 'shared' | 'draft') {
  busyId.value = session.id;
  try {
    const { data } = await axios.patch(
      `${apiBaseUrl}/recording-session/${session.id}/`,
      { status: to },
      { headers: headers() }
    );
    if (data.status === 'shared') notify('Shared: everybody can see it now.');
    else if (data.status === 'waiting validation')
      notify('It uses new entries: an administrator will review them, then it is shared.', 'info');
    else notify('Back to draft.', 'info');
    await load();
  } catch (error: any) {
    const data = error?.response?.data;
    notify(
      (typeof data === 'object' && (data.detail || data.status?.[0])) ||
        'The change could not be saved.',
      'error'
    );
  } finally {
    busyId.value = null;
  }
}

const toDelete = ref<MySession | null>(null);
async function remove() {
  const session = toDelete.value;
  if (!session) return;
  busyId.value = session.id;
  try {
    await axios.delete(`${apiBaseUrl}/recording-session/${session.id}/`, { headers: headers() });
    notify('Deleted.');
    emit('deleted');
    toDelete.value = null;
    await reload(false);
    if (!sessions.value.length && page.value > 1) {
      page.value -= 1;
      await load();
    }
  } catch (error: any) {
    notify(error?.response?.data?.detail || 'It could not be deleted.', 'error');
  } finally {
    busyId.value = null;
  }
}

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
const meta = (s: MySession) =>
  [
    s.is_multiple ? 'Several days' : formatDate(s.date),
    s.files_count == null ? '' : `${s.files_count} file${s.files_count === 1 ? '' : 's'}`,
    s.modified_at ? `edited ${formatDate(s.modified_at)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
</script>

<template>
  <div>
    <AccountListHeader
      title="My vocalizations"
      lead="Pick up a draft where you left it, share a finished one, or deposit a shared one in a repository to get its DOI."
      add-label="New vocalization"
      add-to="/vocalization/create"
    >
      <v-text-field
        v-model="search"
        density="comfortable"
        variant="outlined"
        placeholder="Search my vocalizations"
        prepend-inner-icon="mdi-magnify"
        clearable
        hide-details
        style="max-width: 300px"
        @update:model-value="onSearch"
      />
      <v-chip-group v-model="status" selected-class="text-primary">
        <v-chip
          v-for="state in STATES"
          :key="state.value"
          :value="state.value"
          filter
          variant="outlined"
          size="small"
        >
          {{ state.title }}
        </v-chip>
      </v-chip-group>
      <SortButtons v-model="sort" class="ms-auto" />
    </AccountListHeader>

    <v-progress-linear v-if="loading" indeterminate color="primary" class="my-4" />
    <v-alert v-else-if="failed" type="error" variant="tonal" class="my-4">
      Your vocalizations could not be loaded.
      <template #append><v-btn variant="text" size="small" @click="load">Retry</v-btn></template>
    </v-alert>
    <v-alert v-else-if="!sessions.length" type="info" variant="tonal" class="my-4">
      {{
        status || search
          ? 'Nothing matches. Try another status or search.'
          : 'You have not created a vocalization yet.'
      }}
    </v-alert>

    <ul v-else class="entry-list">
      <li v-for="session in sessions" :key="session.id" class="entry-row">
        <div class="entry-main">
          <div class="entry-name">{{ session.name }}</div>
          <div class="entry-meta">{{ meta(session) }}</div>
          <div class="entry-help">{{ helpOf(session) }}</div>
        </div>

        <v-chip size="small" label variant="tonal" :color="stateOf(session.status).color">
          {{ stateOf(session.status).title }}
        </v-chip>

        <div class="entry-actions">
          <template v-if="session.status === 'draft'">
            <v-btn
              color="primary"
              size="small"
              prepend-icon="mdi-pencil-outline"
              @click="open(session)"
            >
              Continue
            </v-btn>
            <v-tooltip location="top" :disabled="!!session.files_count">
              <template #activator="{ props }">
                <span v-bind="props">
                  <v-btn
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-share-variant-outline"
                    :loading="busyId === session.id"
                    :disabled="!session.files_count"
                    @click="change(session, 'shared')"
                  >
                    Share
                  </v-btn>
                </span>
              </template>
              <span>Add a file first</span>
            </v-tooltip>
            <v-btn
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              aria-label="Delete"
              @click="toDelete = session"
            />
          </template>

          <template v-else-if="session.status === 'waiting validation'">
            <v-btn
              variant="outlined"
              size="small"
              :loading="busyId === session.id"
              @click="change(session, 'draft')"
            >
              Withdraw
            </v-btn>
          </template>

          <template v-else-if="session.status === 'shared' && toDeposit(session)">
            <v-btn
              color="primary"
              size="small"
              prepend-icon="mdi-cloud-upload-outline"
              @click="open(session, 'file')"
            >
              Publish in a repository
            </v-btn>
          </template>

          <template v-else>
            <v-btn
              v-if="session.doi"
              variant="tonal"
              color="teal"
              size="small"
              :href="`https://doi.org/${session.doi}`"
              target="_blank"
              rel="noopener"
              append-icon="mdi-open-in-new"
            >
              DOI
            </v-btn>
            <v-btn variant="text" size="small" @click="open(session, 'file')">Files</v-btn>
          </template>
        </div>
      </li>
    </ul>

    <v-pagination
      v-if="pages > 1"
      v-model="page"
      :length="pages"
      :total-visible="5"
      density="comfortable"
      @update:model-value="load"
    />

    <v-dialog :model-value="!!toDelete" max-width="420" @update:model-value="toDelete = null">
      <v-card>
        <v-card-title>Delete this vocalization?</v-card-title>
        <v-card-text>
          “{{ toDelete?.name }}” and its files are removed. This cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="toDelete = null">Cancel</v-btn>
          <v-btn color="error" :loading="busyId === toDelete?.id" @click="remove">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="4000" location="top">
      {{ snackbarText }}
    </v-snackbar>
  </div>
</template>
