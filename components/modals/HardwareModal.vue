<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useHardwareStore, type Hardware } from '@/stores/hardware';

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
});

const isEdit = computed(() => !!props.hardwareId);

watch(
  () => props.hardwareId,
  async (newId) => {
    if (newId !== null && newId !== undefined) {
      let existing = hardwareStore.getHardwareById(newId);
      if (!existing) {
        existing = await hardwareStore.fetchHardwareById(newId);
      }
      if (existing) {
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

async function saveHardware() {
  try {
    let createdHardware: Hardware | undefined;
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
