<script setup>
import { ref } from 'vue';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { useAuth } from '@/composables/useAuth';

const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue', 'created']);

const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();

const formData = ref({
  name: '',
  type: '',
  made_by: '',
  description: '',
});

async function createHardware() {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
    };
    const res = await fetch(`${apiBaseUrl}/hardware/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(formData.value),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error(err);
      alert('Error creating hardware.');
      return;
    }
    emit('created');
    emit('update:modelValue', false);
  } catch (e) {
    console.error(e);
    alert('Error creating hardware.');
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
      <v-card-title>Create Hardware</v-card-title>
      <v-card-text>
        <!-- Hardware Name -->
        <v-text-field
          v-model="formData.name"
          label="Hardware Name"
          outlined
          required
          class="mb-4"
        />

        <!-- Hardware Type -->
        <v-select
          v-model="formData.type"
          :items="['soundcard', 'microphone', 'speaker', 'amplifier']"
          label="Hardware Type"
          outlined
          required
          class="mb-4"
        />

        <!-- Made By -->
        <v-text-field v-model="formData.made_by" label="Made By" outlined class="mb-4" />

        <!-- Description -->
        <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />
      </v-card-text>
      <v-card-actions>
        <v-btn text @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" @click="createHardware">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
