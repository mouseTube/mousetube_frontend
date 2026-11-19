<script setup lang="ts">
// Admin: the two pictures shown with a file in the datasets (its spectrogram, and a plot of its data).
import { ref, watch } from 'vue';
import axios from 'axios';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { token } from '@/composables/useAuth';

type Kind = 'spectrogram' | 'plot';
const props = defineProps<{
  show: boolean;
  file: {
    id: number;
    name: string;
    spectrogram_url?: string | null;
    plot_url?: string | null;
    deposit_images?: boolean;
  };
}>();
const emit = defineEmits(['update:show', 'saved']);

const apiBaseUrl = useApiBaseUrl();
const headers = () => ({ headers: { Authorization: `Bearer ${token.value}` } });
const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'spectrogram', label: 'Spectrogram' },
  { kind: 'plot', label: 'Plot' },
];

const current = ref<Record<Kind, string | null>>({ spectrogram: null, plot: null });
const chosen = ref<Record<Kind, File | null>>({ spectrogram: null, plot: null });
const deposit = ref(false); // also send the images to the repository with the record
const saving = ref(false);
const error = ref('');
let changed = false;

watch(
  () => props.show,
  (open) => {
    if (!open) return;
    current.value = {
      spectrogram: props.file.spectrogram_url ?? null,
      plot: props.file.plot_url ?? null,
    };
    chosen.value = { spectrogram: null, plot: null };
    deposit.value = !!props.file.deposit_images;
    error.value = '';
    changed = false;
  },
  { immediate: true } // the dialog is created already open
);

const message = (e: { response?: { data?: Record<string, unknown> } }) =>
  (e.response?.data?.error as string) ||
  Object.values(e.response?.data ?? {})
    .flat()
    .join(' ') ||
  'The images could not be saved.';

async function remove(kind: Kind) {
  error.value = '';
  try {
    await axios.delete(`${apiBaseUrl}/file/${props.file.id}/images/?field=${kind}`, headers());
    current.value[kind] = null;
    changed = true;
  } catch (e) {
    error.value = message(e);
  }
}

async function save() {
  const body = new FormData();
  KINDS.forEach(({ kind }) => chosen.value[kind] && body.append(kind, chosen.value[kind]!));
  const depositChanged = deposit.value !== !!props.file.deposit_images;
  if (depositChanged) body.append('deposit_images', String(deposit.value));
  if ([...body.keys()].length) {
    saving.value = true;
    error.value = '';
    try {
      await axios.post(`${apiBaseUrl}/file/${props.file.id}/images/`, body, headers());
      changed = true;
    } catch (e) {
      error.value = message(e);
      saving.value = false;
      return;
    }
    saving.value = false;
  }
  close();
}

function close() {
  emit('update:show', false);
  if (changed) emit('saved');
}
</script>

<template>
  <v-dialog :model-value="show" max-width="640" scrollable persistent>
    <v-card>
      <v-card-title class="pt-4 text-wrap">Images of {{ file.name }}</v-card-title>
      <v-card-subtitle class="text-wrap">
        Shown with the file in the datasets. PNG, JPEG or WebP, 10 MB at most.
      </v-card-subtitle>
      <v-card-text>
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
          {{ error }}
        </v-alert>
        <div v-for="{ kind, label } in KINDS" :key="kind" class="mb-4">
          <div class="d-flex align-center mb-1">
            <strong>{{ label }}</strong>
            <v-spacer />
            <v-btn
              v-if="current[kind]"
              size="small"
              variant="text"
              color="red-darken-2"
              prepend-icon="mdi-delete-outline"
              @click="remove(kind)"
              >Remove</v-btn
            >
          </div>
          <v-img
            v-if="current[kind]"
            :src="current[kind]!"
            max-height="140"
            contain
            class="mb-2 border rounded"
          />
          <v-file-input
            v-model="chosen[kind]"
            :label="
              current[kind]
                ? `Replace the ${label.toLowerCase()}`
                : `Choose a ${label.toLowerCase()}`
            "
            accept="image/png,image/jpeg,image/webp"
            prepend-icon="mdi-image"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </div>
        <v-checkbox
          v-model="deposit"
          density="compact"
          hide-details
          color="primary"
          label="Also send these images to Zenodo with the record"
        />
        <p class="text-caption text-medium-emphasis ms-10">
          Unticked: they stay on mouseTube. They are sent when the session is published.
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
