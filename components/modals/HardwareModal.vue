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
const referenceStore = useReferenceStore();

// --- Form data ---
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

// --- Form & validation ---
const formRef = ref();
const nameRule = (v: string) => !!v || 'Name is required';
const typeRule = (v: string | null) =>
  ['soundcard', 'microphone', 'speaker', 'amplifier'].includes(v || '') || 'Type is required';

// --- Snackbar ---
const snackbar = ref({
  show: false,
  text: '',
  color: 'success' as 'success' | 'error',
});
function showSnackbar(text: string, color: 'success' | 'error' = 'success') {
  snackbar.value.text = text;
  snackbar.value.color = color;
  snackbar.value.show = true;
}

const isEdit = computed(() => !!props.hardwareId);
const showReferenceModal = ref(false);

// --- References management ---
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

function removeReference(id: number) {
  selectedReferenceIds.value = selectedReferenceIds.value.filter((x) => x !== id);
}

async function openReferenceSelection() {
  if (!referenceStore.references || referenceStore.references.results.length === 0) {
    await referenceStore.fetchAllReferences();
  }
  showReferenceModal.value = true;
}

function onReferencesUpdated(ids: number[]) {
  selectedReferenceIds.value = [...ids];
  fetchMissingReferences(ids).catch((e) => {
    console.warn('[HardwareModal] fetchMissingReferences failed', e);
  });
}

async function fetchMissingReferences(ids: number[]) {
  const missing = ids.filter((id) => !referenceStore.references.results.find((r) => r.id === id));
  if (missing.length === 0) return;
  await Promise.all(
    missing.map((id) =>
      referenceStore.getReferenceById(id).catch((err) => {
        console.warn('[HardwareModal] failed to fetch reference', id, err);
        return null;
      })
    )
  );
}

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
  const { valid } = await formRef.value?.validate();
  if (!valid) {
    showSnackbar('Please fill all required fields.', 'error');
    return;
  }

  try {
    let createdHardware: Hardware | undefined;
    if (isEdit.value && props.hardwareId !== null && props.hardwareId !== undefined) {
      createdHardware = await hardwareStore.updateHardware(props.hardwareId, { ...formData.value });
    } else {
      createdHardware = await hardwareStore.createHardware({ ...formData.value });
    }

    if (createdHardware?.id) {
      emit('saved', createdHardware.id);
      showSnackbar(
        isEdit.value ? 'Hardware updated successfully!' : 'Hardware created successfully!'
      );
    } else {
      emit('saved');
      showSnackbar('Hardware saved.', 'success');
    }

    emit('update:modelValue', false);
  } catch (err) {
    console.error(err);
    showSnackbar('Error saving hardware.', 'error');
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
        <!-- ✅ form encapsulation -->
        <v-form ref="formRef">
          <v-text-field
            v-model="formData.name"
            label="Name *"
            outlined
            required
            :rules="[nameRule]"
            class="mb-4"
          />
          <v-select
            v-model="formData.type"
            :items="['soundcard', 'microphone', 'speaker', 'amplifier']"
            label="Type *"
            outlined
            required
            :rules="[typeRule]"
            class="mb-4"
          />
          <v-text-field v-model="formData.made_by" label="Made By" outlined class="mb-4" />
          <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />

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
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-btn text @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" @click="saveHardware">
          {{ isEdit ? 'Save Changes' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <ReferenceSelectionModal
      v-model="showReferenceModal"
      :selectedReferences="selectedReferenceIds"
      @update:selectedReferences="onReferencesUpdated"
    />

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="bottom">
      {{ snackbar.text }}
    </v-snackbar>
  </v-dialog>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}
</style>
