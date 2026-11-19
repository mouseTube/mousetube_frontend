<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import axios from 'axios';
import debounce from 'lodash-es/debounce';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { token } from '@/composables/useAuth';

interface SessionChoice {
  id: number;
  name: string;
  laboratory: string | null;
  files_count?: number; // unknown for the sessions a dataset already has
}

interface EditedDataset {
  id: number;
  name: string;
  description?: string | null;
  doi?: string | null;
  link?: string | null;
  recording_sessions?: { id: number; name: string }[];
}

// `dataset` given: the form changes that dataset (its sessions bring their files); else it adds one
const props = defineProps<{ show: boolean; dataset?: EditedDataset | null }>();
const emit = defineEmits(['update:show', 'created']);

const apiBaseUrl = useApiBaseUrl();
const authHeaders = () => ({ headers: { Authorization: `Bearer ${token.value}` } });

const form = ref<{ name: string; description: string; doi: string; link: string }>({
  name: '',
  description: '',
  doi: '',
  link: '',
});
const selectedIds = ref<number[]>([]);
const results = ref<SessionChoice[]>([]);
// Chosen sessions stay in the list even when a new search no longer returns them.
const chosen = ref<Record<number, SessionChoice>>({});
const loadingSessions = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const fieldErrors = ref<Record<string, string[]>>({});
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);

const items = computed(() => {
  const all = new Map<number, SessionChoice>();
  Object.values(chosen.value).forEach((s) => all.set(s.id, s));
  results.value.forEach((s) => all.set(s.id, s));
  return [...all.values()].map((s) => ({
    ...s,
    label: `${s.name}${s.laboratory ? ` (${s.laboratory})` : ''}${
      s.files_count === undefined ? '' : ` - ${s.files_count} file${s.files_count === 1 ? '' : 's'}`
    }`,
  }));
});

const requiredRule = (v: string) => (!!v && v.trim() !== '') || 'This field is required';
const sessionsRule = (v: number[]) => v.length > 0 || 'Choose at least one recording session';

const loadSessions = async (search = '') => {
  loadingSessions.value = true;
  try {
    const res = await axios.get(
      `${apiBaseUrl}/dataset/session-choices/?search=${encodeURIComponent(search)}`,
      authHeaders()
    );
    results.value = res.data;
  } catch {
    errorMessage.value = 'The list of sessions could not be loaded.';
  } finally {
    loadingSessions.value = false;
  }
};
const search = ref(''); // what is typed in the field
const onSearch = debounce((value: string) => loadSessions(value ?? ''), 300);
watch(search, (value) => onSearch(value));

watch(selectedIds, (ids) => {
  search.value = ''; // a session was picked: the words typed to find it go away
  ids.forEach((id) => {
    const found = items.value.find((s) => s.id === id);
    if (found) chosen.value[id] = found;
  });
});

watch(
  () => props.show,
  (open) => {
    if (!open) return;
    const d = props.dataset;
    form.value = {
      name: d?.name ?? '',
      description: d?.description ?? '',
      doi: d?.doi ?? '',
      link: d?.link ?? '',
    };
    selectedIds.value = (d?.recording_sessions ?? []).map((s) => s.id);
    chosen.value = Object.fromEntries(
      (d?.recording_sessions ?? []).map((s) => [s.id, { id: s.id, name: s.name, laboratory: null }])
    );
    errorMessage.value = '';
    fieldErrors.value = {};
    loadSessions();
  }
);

const close = () => emit('update:show', false);

const save = async () => {
  errorMessage.value = '';
  fieldErrors.value = {};
  const check = await formRef.value?.validate();
  if (!check?.valid) return;

  saving.value = true;
  try {
    const body = {
      name: form.value.name.trim(),
      description: form.value.description.trim(),
      doi: form.value.doi.trim() || null,
      link: form.value.link.trim() || null,
      recording_session_ids: selectedIds.value,
    };
    if (props.dataset) {
      await axios.patch(`${apiBaseUrl}/dataset/${props.dataset.id}/`, body, authHeaders());
    } else {
      await axios.post(`${apiBaseUrl}/dataset/`, body, authHeaders());
    }
    emit('created');
    close();
  } catch (error: any) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    if (status === 403 || status === 401) {
      errorMessage.value = 'Only administrators can add a dataset.';
    } else if (data && typeof data === 'object') {
      fieldErrors.value = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v : [String(v)]])
      ) as Record<string, string[]>;
      errorMessage.value = 'Please correct the highlighted fields.';
    } else {
      errorMessage.value = 'The dataset could not be saved. Please try again.';
    }
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <v-dialog
    :model-value="show"
    max-width="720"
    scrollable
    persistent
    @update:model-value="emit('update:show', $event)"
  >
    <v-card>
      <v-card-title class="pt-4">{{ dataset ? 'Edit the dataset' : 'Add a dataset' }}</v-card-title>
      <v-card-subtitle class="text-wrap">
        A dataset groups recording sessions. The page lists the files of those sessions: adding a
        session adds its files, removing it takes them out of the dataset only (they stay in the
        vocalizations).
      </v-card-subtitle>

      <v-card-text>
        <v-form ref="formRef" novalidate @submit.prevent="save">
          <v-alert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-4">
            {{ errorMessage }}
          </v-alert>

          <v-text-field
            v-model="form.name"
            label="Name *"
            variant="outlined"
            density="comfortable"
            :rules="[requiredRule]"
            :error-messages="fieldErrors.name"
            class="mb-2"
          />
          <v-textarea
            v-model="form.description"
            label="Description"
            variant="outlined"
            density="comfortable"
            rows="3"
            auto-grow
            :error-messages="fieldErrors.description"
            class="mb-2"
          />
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.doi"
                label="DOI"
                variant="outlined"
                density="comfortable"
                hint="For example 10.5281/zenodo.1234567"
                persistent-hint
                :error-messages="fieldErrors.doi"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.link"
                label="Download link"
                variant="outlined"
                density="comfortable"
                hint="Optional: replaces the default download"
                persistent-hint
                :error-messages="fieldErrors.link"
              />
            </v-col>
          </v-row>

          <v-autocomplete
            v-model="selectedIds"
            v-model:search="search"
            :items="items"
            item-title="label"
            item-value="id"
            label="Recording sessions *"
            variant="outlined"
            density="comfortable"
            multiple
            chips
            closable-chips
            clearable
            :loading="loadingSessions"
            :rules="[sessionsRule]"
            :error-messages="fieldErrors.recording_session_ids"
            hint="Type to search by session name or laboratory"
            persistent-hint
            class="mt-4"
            :menu-props="{ maxWidth: 660 }"
          >
            <template #chip="{ props: chipProps, item }">
              <v-chip v-bind="chipProps" :text="item.raw.name" closable />
            </template>
            <template #item="{ props: itemProps, item }">
              <v-list-item
                v-bind="itemProps"
                :title="item.raw.name"
                :subtitle="`${item.raw.laboratory || 'No laboratory'} - ${item.raw.files_count} file${
                  item.raw.files_count === 1 ? '' : 's'
                }`"
              />
            </template>
          </v-autocomplete>
        </v-form>
      </v-card-text>

      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" :loading="saving" @click="save">
          {{ dataset ? 'Save' : 'Create dataset' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
