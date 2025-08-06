<script setup lang="ts">
import { ref, watch } from 'vue';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { useAuth } from '@/composables/useAuth';
import { useSoftwareStore } from '@/stores/software';

const props = defineProps({
  modelValue: Boolean,
  editMode: { type: Boolean, default: false },
  softwareId: { type: Number, default: null },
});

const emit = defineEmits(['update:modelValue', 'saved']);

const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();
const softwareStore = useSoftwareStore();

const formData = ref({
  name: '',
  type: '',
  made_by: '',
  description: '',
  technical_requirements: '',
});

// Watch softwareId to load data if editing
watch(
  () => props.softwareId,
  async (newId) => {
    if (props.editMode && newId) {
      const software = await softwareStore.fetchSoftwareById(newId);
      if (software) {
        formData.value = {
          name: software.name || '',
          type: software.type || '',
          made_by: software.made_by || '',
          description: software.description || '',
          technical_requirements: software.technical_requirements || '',
        };
      }
    } else {
      formData.value = {
        name: '',
        type: '',
        made_by: '',
        description: '',
        technical_requirements: '',
      };
    }
  },
  { immediate: true }
);

async function saveSoftware() {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
    };

    if (props.editMode && props.softwareId) {
      const res = await fetch(`${apiBaseUrl}/software/${props.softwareId}/`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(formData.value),
      });
      if (!res.ok) throw new Error('Error updating software');
    } else {
      const res = await fetch(`${apiBaseUrl}/software/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData.value),
      });
      if (!res.ok) throw new Error('Error creating software');
    }

    await softwareStore.fetchSoftwares();
    emit('saved');
    emit('update:modelValue', false);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    alert(props.editMode ? 'Error updating software' : 'Error creating software');
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
      <v-card-title>{{ props.editMode ? 'Edit Software' : 'Create Software' }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="formData.name"
          label="Software Name"
          outlined
          required
          class="mb-4"
        />
        <v-select
          v-model="formData.type"
          :items="['acquisition', 'analysis', 'acquisition and analysis']"
          label="Software Type"
          outlined
          required
          class="mb-4"
        />
        <v-text-field v-model="formData.made_by" label="Made By" outlined class="mb-4" />
        <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />
        <v-textarea
          v-model="formData.technical_requirements"
          label="Technical Requirements"
          outlined
          class="mb-4"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" @click="saveSoftware">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
