<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useHardwareStore } from '@/stores/hardware';

export interface Hardware {
  id?: number;
  name: string;
  type: 'soundcard' | 'microphone' | 'speaker' | 'amplifier' | '';
  made_by: string;
  description: string;
  references?: number[];
  created_at?: string;
  modified_at?: string;
  created_by?: number | null;
}

const props = defineProps<{
  modelValue: boolean;
  hardwareId?: number | null;
}>();
const emit = defineEmits(['update:modelValue', 'saved']);

const hardwareStore = useHardwareStore();

const isEdit = computed(() => !!props.hardwareId);

const formData = ref<Hardware>({
  name: '',
  type: '',
  made_by: '',
  description: '',
});

watch(
  () => props.hardwareId,
  async (newId) => {
    if (newId) {
      console.log('Loading hardware with ID:', newId);
      let existing = hardwareStore.getHardwareById(newId);
      if (!existing) {
        existing = await hardwareStore.fetchHardwareById(newId);
      }
      if (existing) {
        formData.value = { ...existing };
      } else {
        formData.value = {
          name: '',
          type: '',
          made_by: '',
          description: '',
        };
      }
    } else {
      formData.value = {
        name: '',
        type: '',
        made_by: '',
        description: '',
      };
    }
  },
  { immediate: true }
);

async function saveHardware() {
  try {
    if (isEdit.value && props.hardwareId) {
      await hardwareStore.updateHardware(props.hardwareId, formData.value);
    } else {
      await hardwareStore.createHardware(formData.value);
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
