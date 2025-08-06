<script setup lang="ts">
import { ref } from 'vue';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { useAuth } from '@/composables/useAuth';

const props = defineProps({
  modelValue: Boolean,
  softwareId: { type: Number, required: true },
});

const emit = defineEmits(['update:modelValue', 'created']);

const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();

const formData = ref({
  version: '',
  release_date: '',
  compatible_os: '',
  software: props.softwareId,
});

async function createSoftwareVersion() {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
    };
    const res = await fetch(`${apiBaseUrl}/softwareversion/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(formData.value),
    });
    if (!res.ok) throw new Error('Error creating software version');

    emit('created');
    emit('update:modelValue', false);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    alert('Error creating software version');
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
      <v-card-title>Create Software Version</v-card-title>
      <v-card-text>
        <v-text-field v-model="formData.version" label="Version" outlined required class="mb-4" />
        <v-text-field
          v-model="formData.release_date"
          label="Release Date (YYYY-MM-DD)"
          outlined
          required
          class="mb-4"
        />
        <v-text-field
          v-model="formData.compatible_os"
          label="Compatible OS"
          outlined
          class="mb-4"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" @click="createSoftwareVersion">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
