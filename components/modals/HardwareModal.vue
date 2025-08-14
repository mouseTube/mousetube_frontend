<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useHardwareStore, type Hardware } from '@/stores/hardware';

const props = defineProps<{
  modelValue: boolean;
  hardwareId?: number | null;
  hardwareType?: Hardware['type']; // pour pré-remplir en création
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved'): void;
}>();

const hardwareStore = useHardwareStore();

// état du formulaire avec types corrects
const formData = ref<Hardware>({
  id: undefined, // id doit être number | undefined
  name: '',
  type: props.hardwareType || '',
  made_by: '',
  description: '',
  references: [], // tableau de number
  created_at: undefined,
  modified_at: undefined,
  created_by: null,
});

// savoir si on est en édition
const isEdit = computed(() => !!props.hardwareId);

// remplir ou reset le formulaire quand hardwareId change
watch(
  () => props.hardwareId,
  async (newId) => {
    if (newId !== null && newId !== undefined) {
      let existing = hardwareStore.getHardwareById(newId);
      if (!existing) {
        existing = await hardwareStore.fetchHardwareById(newId);
      }
      if (existing) {
        // on clone pour éviter la mutation directe
        formData.value = {
          ...existing,
          references: existing.references ? [...existing.references] : [],
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

// reset formulaire
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
  };
}

// sauvegarde
async function saveHardware() {
  try {
    // forcer id à number si nécessaire (sécurité TS)
    if (isEdit.value && props.hardwareId !== null && props.hardwareId !== undefined) {
      await hardwareStore.updateHardware(props.hardwareId, { ...formData.value });
    } else {
      await hardwareStore.createHardware({ ...formData.value });
    }
    emit('saved');
    emit('update:modelValue', false);
  } catch (err) {
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
      </v-card-text>

      <v-card-actions>
        <v-btn text @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" @click="saveHardware">
          {{ isEdit ? 'Save Changes' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}
</style>
