<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useHardwareStore, type Hardware } from '@/stores/hardware';
import ReferenceSelectionModal from '@/components/modals/ReferenceSelectionModal.vue';
import { useReferenceStore, type Reference } from '~/stores/reference';

const props = defineProps<{
  modelValue: boolean;
  hardwareId?: number | null;
  hardwareType?: Hardware['type'];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved', hardwareId?: number): void;
}>();

const hardwareStore = useHardwareStore();

const formData = ref<Hardware>({
  id: undefined,
  name: '',
  type: props.hardwareType || '',
  made_by: '',
  description: '',
  references: [],
  created_at: undefined,
  modified_at: undefined,
  created_by: null,
  status: '',
});

const isEdit = computed(() => !!props.hardwareId);

const showReferenceModal = ref(false);
const referenceStore = useReferenceStore();

// single source-of-truth: formData.value.references
function arraysEqual(a?: number[] | null, b?: number[] | null) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

const selectedReferenceIds = computed<number[]>({
  get() {
    return formData.value.references ? [...formData.value.references] : [];
  },
  set(ids: number[]) {
    if (!arraysEqual(formData.value.references, ids)) {
      formData.value.references = [...ids];
    }
  },
});

const selectedReferences = computed(
  () =>
    selectedReferenceIds.value
      .map((id) => referenceStore.references.results.find((r) => r.id === id))
      .filter(Boolean) as Reference[]
);

// --- CHANGED: use function to remove instead of inline assignment in template ---
function removeReference(id: number) {
  selectedReferenceIds.value = selectedReferenceIds.value.filter((x) => x !== id);
}

// formData -> computed setter already reflects into selectedReferenceIds,
// keep nothing extra here (existing watcher in props.hardwareId handles initial load)

// helper to open modal and ensure references are loaded
async function openReferenceSelection() {
  if (!referenceStore.references || referenceStore.references.results.length === 0) {
    await referenceStore.fetchAllReferences();
  }
  showReferenceModal.value = true;
}

function onReferencesUpdated(ids: number[]) {
  console.log('[HardwareModal] onReferencesUpdated ids=', ids);
  selectedReferenceIds.value = [...ids];
  // attempt to ensure reference objects exist in the store so selectedReferences computed resolves
  fetchMissingReferences(ids).catch((e) => {
    // eslint-disable-next-line no-console
    console.warn('[HardwareModal] fetchMissingReferences failed', e);
  });
}

// fetch any references that are missing from referenceStore so selectedReferences can resolve labels
async function fetchMissingReferences(ids: number[]) {
  const missing = ids.filter((id) => !referenceStore.references.results.find((r) => r.id === id));
  if (missing.length === 0) return;
  // sequential or parallel fetch of missing references
  await Promise.all(
    missing.map((id) =>
      referenceStore.getReferenceById(id).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[HardwareModal] failed to fetch reference', id, err);
        return null;
      })
    )
  );
}

// ensure when formData is loaded (edit mode) we fetch any missing refs
watch(
  () => formData.value.references,
  (ids) => {
    const list = ids ? [...ids] : [];
    if (list.length) {
      fetchMissingReferences(list).catch(() => {});
    }
  },
  { immediate: true }
);

watch(
  () => props.hardwareId,
  async (newId) => {
    if (newId !== null && newId !== undefined) {
      let existing = hardwareStore.getHardwareById(newId);
      if (!existing) {
        existing = await hardwareStore.fetchHardwareById(newId);
      }
      if (existing) {
        // 🔧 explicit conversion: objects → IDs
        const refIds = Array.isArray(existing.references)
          ? existing.references.map((r: any) => (typeof r === 'number' ? r : r.id))
          : [];

        formData.value = {
          ...existing,
          references: refIds,
        };
      } else {
        resetForm();
      }
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

function resetForm() {
  formData.value = {
    id: undefined,
    name: '',
    type: props.hardwareType || '',
    made_by: '',
    description: '',
    references: [],
    created_at: undefined,
    modified_at: undefined,
    created_by: null,
    status: '',
  };
}

async function saveHardware() {
  try {
    let createdHardware: Hardware | undefined;
    console.log('[HardwareModal] saveHardware, isEdit=', isEdit.value, 'formData=', formData.value);
    if (isEdit.value && props.hardwareId !== null && props.hardwareId !== undefined) {
      createdHardware = await hardwareStore.updateHardware(props.hardwareId, { ...formData.value });
    } else {
      createdHardware = await hardwareStore.createHardware({ ...formData.value });
    }

    if (createdHardware?.id) {
      emit('saved', createdHardware.id);
    } else {
      emit('saved');
    }

    emit('update:modelValue', false);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    alert('Error saving hardware.');
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="500"
  >
    <v-card>
      <v-card-title>
        {{ isEdit ? 'Edit Hardware' : 'Create Hardware' }}
      </v-card-title>

      <v-card-text>
        <!-- Nom, type, made_by, description existants -->
        <v-text-field
          v-model="formData.name"
          label="Hardware Name"
          outlined
          required
          class="mb-4"
        />
        <v-select
          v-model="formData.type"
          :items="['soundcard', 'microphone', 'speaker', 'amplifier']"
          label="Hardware Type"
          outlined
          required
          class="mb-4"
        />
        <v-text-field v-model="formData.made_by" label="Made By" outlined class="mb-4" />
        <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />

        <!-- === SECTION REFERENCES === -->
        <v-card-subtitle class="mb-2">References</v-card-subtitle>
        <div class="chip-list d-flex flex-wrap align-center mb-4">
          <v-chip
            v-for="selectedRef in selectedReferences"
            :key="selectedRef.id"
            variant="outlined"
            closable
            class="ma-1"
            @click:close="removeReference(selectedRef.id)"
          >
            {{ selectedRef.name }}
          </v-chip>

          <v-chip color="primary" variant="flat" class="ma-1" @click="openReferenceSelection">
            <v-icon start>mdi-plus</v-icon> Select
          </v-chip>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-btn text @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" @click="saveHardware">
          {{ isEdit ? 'Save Changes' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Add the ReferenceSelectionModal instance -->
    <ReferenceSelectionModal
      v-model="showReferenceModal"
      :selectedReferences="selectedReferenceIds"
      @update:selectedReferences="onReferencesUpdated"
      @saved="
        (ref) => {
          /* optional */
        }
      "
    />
  </v-dialog>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}
</style>
