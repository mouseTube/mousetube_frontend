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
  technical_requirements: '',
});

async function createSoftware() {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
    };
    const res = await fetch(`${apiBaseUrl}/software/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(formData.value),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error(err);
      alert('Error creating software.');
      return;
    }
    emit('created');
    emit('update:modelValue', false);
  } catch (e) {
    console.error(e);
    alert('Error creating software.');
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
      <v-card-title>Create Software</v-card-title>
      <v-card-text>
        <!-- Software Name -->
        <v-text-field
          v-model="formData.name"
          label="Software Name"
          outlined
          required
          class="mb-4"
        />

        <!-- Software Type -->
        <v-select
          v-model="formData.type"
          :items="['acquisition', 'analysis', 'acquisition and analysis']"
          label="Software Type"
          outlined
          required
          class="mb-4"
        />

        <!-- Made By -->
        <v-text-field v-model="formData.made_by" label="Made By" outlined class="mb-4" />

        <!-- Description -->
        <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />

        <!-- Technical Requirements -->
        <v-textarea
          v-model="formData.technical_requirements"
          label="Technical Requirements"
          outlined
          class="mb-4"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn text @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" @click="createSoftware">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
