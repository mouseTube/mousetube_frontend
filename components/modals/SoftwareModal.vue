<script setup lang="ts">
import { ref, watch, computed, nextTick, onMounted } from 'vue';
import { useSoftwareStore } from '@/stores/software';
import { useReferenceStore, type Reference } from '~/stores/reference';
import type { VForm } from 'vuetify/components';
import ReferenceSelectionModal from '@/components/modals/ReferenceSelectionModal.vue';
import { useFavoriteStore } from '@/stores/favorite';

const props = defineProps<{
  modelValue: boolean;
  softwareId?: number | null;
  initialData?: Partial<{
    name: string;
    type: 'acquisition' | 'analysis' | 'acquisition and analysis' | null;
    made_by: string;
    description: string;
    technical_requirements: string;
    references: number[];
  }> | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved', 'duplicate']);

const store = useSoftwareStore();
const referenceStore = useReferenceStore();
const favoriteStore = useFavoriteStore();

const formData = ref({
  name: '',
  type: null as 'acquisition' | 'analysis' | 'acquisition and analysis' | null,
  made_by: '',
  description: '',
  technical_requirements: '',
  references: [] as number[],
});

const selectedReferenceIds = ref<number[]>([]);

const fetchingIds = new Set<number>();

// ✅ Display references
const selectedReferences = computed(
  () =>
    selectedReferenceIds.value
      .map((id) => referenceStore.references.results.find((r) => r.id === id))
      .filter(Boolean) as Reference[]
);

// ✅ Synchronise ID and list
watch(selectedReferenceIds, (ids) => {
  formData.value.references = [...ids];
});

// ✅ Load references
async function fetchMissingReferences(ids: number[]) {
  const missing = ids.filter(
    (id) => !referenceStore.references.results.find((r) => r.id === id) && !fetchingIds.has(id)
  );
  if (!missing.length) return;

  missing.forEach((id) => fetchingIds.add(id));

  try {
    await Promise.all(missing.map((id) => referenceStore.getReferenceById(id).catch(() => null)));
  } finally {
    missing.forEach((id) => fetchingIds.delete(id));
  }
}

// watch(
//   () => formData.value.references,
//   (ids) => {
//     const list = ids ? [...ids] : [];
//     if (list.length) fetchMissingReferences(list).catch(() => {});
//   }
// );

function onReferencesUpdated(ids: number[]) {
  selectedReferenceIds.value = [...ids];
}

const loading = ref(false);
const snackbar = ref(false);
const snackbarMessage = ref('');
const formRef = ref<VForm | null>(null);

const linkedSessionsCount = ref(0);
const linkedSessionsFromOthers = ref<number | null>(null);

const nameRule = (v: string) => !!v || 'Name is required';
const typeRule = (v: string | null) =>
  v === 'acquisition' || v === 'analysis' || v === 'acquisition and analysis' || 'Type is required';

const isReadOnly = computed(
  () => linkedSessionsFromOthers.value !== null && linkedSessionsFromOthers.value > 0
);

const showReferenceModal = ref(false);

// ✅ Load all data
async function loadSoftwareData() {
  if (props.softwareId) {
    loading.value = true;
    try {
      const data = await store.fetchSoftwareById(props.softwareId);
      if (data) {
        const referenceIds = Array.isArray(data.references)
          ? data.references.map((r: any) => (typeof r === 'object' ? r.id : r))
          : [];
        formData.value = {
          name: data.name || '',
          type: data.type ?? null,
          made_by: data.made_by || '',
          description: data.description || '',
          technical_requirements: data.technical_requirements || '',
          references: referenceIds,
        };
        selectedReferenceIds.value = [...referenceIds];
        linkedSessionsCount.value = data.linked_sessions_count ?? 0;
        linkedSessionsFromOthers.value = data.linked_sessions_from_other_users ?? 0;
        await fetchMissingReferences(referenceIds);
      }
    } catch {
      snackbarMessage.value = 'Failed to load software data';
      snackbar.value = true;
    } finally {
      loading.value = false;
    }
  } else if (props.initialData) {
    const referenceIds = props.initialData.references ?? [];
    formData.value = {
      name: props.initialData.name ?? '',
      type: props.initialData.type ?? null,
      made_by: props.initialData.made_by ?? '',
      description: props.initialData.description ?? '',
      technical_requirements: props.initialData.technical_requirements ?? '',
      references: referenceIds,
    };
    selectedReferenceIds.value = [...referenceIds];
    linkedSessionsCount.value = 0;
    linkedSessionsFromOthers.value = 0;
    await fetchMissingReferences(referenceIds);
  } else {
    resetForm();
  }
  await nextTick();
  formRef.value?.resetValidation();
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) loadSoftwareData();
  },
  { immediate: true }
);

function resetForm() {
  formData.value = {
    name: '',
    type: null,
    made_by: '',
    description: '',
    technical_requirements: '',
    references: [],
  };
  selectedReferenceIds.value = [];
  linkedSessionsCount.value = 0;
  linkedSessionsFromOthers.value = 0;
}

async function submit() {
  const result = await formRef.value?.validate();
  if (!result?.valid) {
    snackbarMessage.value = 'Please fill in the required fields';
    snackbar.value = true;
    return;
  }

  if (isReadOnly.value) {
    snackbarMessage.value =
      'This software is linked to other users’ sessions and cannot be edited. Please duplicate instead.';
    snackbar.value = true;
    return;
  }

  loading.value = true;
  try {
    if (props.softwareId) {
      await store.updateSoftware(props.softwareId, formData.value);
    } else {
      await store.createSoftware(formData.value);
    }
    emit('saved');
    emit('update:modelValue', false);
  } catch (e) {
    snackbarMessage.value = store.error ?? 'Error saving software';
    snackbar.value = true;
  } finally {
    loading.value = false;
  }
}

function close() {
  emit('update:modelValue', false);
}

function duplicate() {
  emit('duplicate', {
    ...formData.value,
    name: `${formData.value.name} (copy)`,
  });
  emit('update:modelValue', false);
}

onMounted(async () => {
  await favoriteStore.fetchAllFavorites();
});
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="600"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        {{ props.softwareId ? 'Edit Software' : 'Create Software' }}
      </v-card-title>

      <v-card-text>
        <!-- Alerte lecture seule -->
        <v-alert v-if="isReadOnly" type="warning" variant="outlined" border="start" class="mb-4">
          This software is linked to recording sessions from other users. You cannot edit it. Please
          duplicate if you want to make changes.
        </v-alert>

        <v-alert
          v-else-if="linkedSessionsCount > 0"
          type="info"
          variant="outlined"
          border="start"
          class="mb-4"
        >
          This software is linked to {{ linkedSessionsCount }} of your recording sessions. Editing
          it will affect all linked sessions.
        </v-alert>

        <!-- Formulaire principal -->
        <v-form ref="formRef" lazy-validation>
          <v-text-field
            v-model="formData.name"
            label="Name *"
            outlined
            required
            :rules="[nameRule]"
            :disabled="loading || isReadOnly"
            class="mb-4"
          />

          <v-select
            v-model="formData.type"
            :items="['acquisition', 'analysis', 'acquisition and analysis']"
            label="Type *"
            outlined
            required
            :rules="[typeRule]"
            :disabled="loading || isReadOnly"
            class="mb-4"
          />

          <v-text-field
            v-model="formData.made_by"
            label="Made By"
            outlined
            :disabled="loading || isReadOnly"
            class="mb-4"
          />

          <v-textarea
            v-model="formData.description"
            label="Description"
            outlined
            :disabled="loading || isReadOnly"
            rows="3"
            class="mb-4"
          />

          <v-textarea
            v-model="formData.technical_requirements"
            label="Technical Requirements"
            outlined
            :disabled="loading || isReadOnly"
            rows="3"
            class="mb-4"
          />

          <!-- === References === -->
          <v-card-subtitle class="mb-2">References</v-card-subtitle>
          <div class="chip-list d-flex flex-wrap align-center mb-4">
            <v-chip
              v-for="ref in selectedReferences"
              :key="ref.id"
              variant="outlined"
              closable
              class="ma-1"
              @click:close="
                selectedReferenceIds = selectedReferenceIds.filter((id) => id !== ref.id)
              "
            >
              {{ ref.name }}
            </v-chip>

            <v-chip color="primary" variant="flat" class="ma-1" @click="showReferenceModal = true">
              <v-icon start>mdi-plus</v-icon> Select
            </v-chip>
          </div>

          <ReferenceSelectionModal
            v-model="showReferenceModal"
            v-model:selectedReferences="selectedReferenceIds"
            @update:selectedReferences="onReferencesUpdated"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="close" :disabled="loading">Cancel</v-btn>
        <v-btn
          v-show="isReadOnly"
          color="primary"
          @click="duplicate"
          :disabled="!isReadOnly || loading"
        >
          Duplicate
        </v-btn>
        <v-btn color="primary" @click="submit" :loading="loading" :disabled="loading || isReadOnly">
          {{ props.softwareId ? 'Save Changes' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-snackbar v-model="snackbar" color="error" timeout="6000" top>
      {{ snackbarMessage }}
      <template #actions>
        <v-btn color="white" variant="text" @click="snackbar = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </v-dialog>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}
</style>
