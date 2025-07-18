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
  description: '',
  start_date: '',
  end_date: '',
});

async function createStudy() {
  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
    };
    const res = await fetch(`${apiBaseUrl}/study/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(formData.value),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error(err);
      alert('Error creating study.');
      return;
    }
    emit('created');
    emit('update:modelValue', false);
  } catch (e) {
    console.error(e);
    alert('Error creating study.');
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
      <v-card-title>Create Study</v-card-title>
      <v-card-text>
        <!-- Study Name -->
        <v-text-field v-model="formData.name" label="Study Name" outlined required class="mb-4" />

        <!-- Description -->
        <v-textarea v-model="formData.description" label="Description" outlined class="mb-4" />

        <!-- Start Date -->
        <v-text-field
          v-model="formData.start_date"
          label="Start Date"
          type="datetime-local"
          outlined
          required
          class="mb-4"
        />

        <!-- End Date -->
        <v-text-field
          v-model="formData.end_date"
          label="End Date"
          type="datetime-local"
          outlined
          class="mb-4"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="createStudy">Save</v-btn>
        <v-btn text @click="emit('update:modelValue', false)">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
