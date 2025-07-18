<script setup lang="ts">
import { ref } from 'vue';
import { useAnimalProfileStore } from '~/stores/animalProfile';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(['update:modelValue', 'created']);

const animalProfileStore = useAnimalProfileStore();

const formData = ref({
  strain: '',
  sex: '',
  genotype: '',
  treatment: '',
});

async function handleSubmit() {
  try {
    const created = await animalProfileStore.createAnimalProfile(formData.value);
    emit('created', created);
    emit('update:modelValue', false);
  } catch (e) {
    console.error(e);
    alert('Error creating animal profile.');
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="600"
  >
    <v-card>
      <v-card-title>Create Animal Profile</v-card-title>
      <v-card-text>
        <!-- Strain -->
        <v-text-field v-model="formData.strain" label="Strain" outlined required class="mb-4" />

        <!-- Sex -->
        <v-select
          v-model="formData.sex"
          :items="['male', 'female']"
          label="Sex"
          outlined
          required
          class="mb-4"
        />

        <!-- Genotype -->
        <v-text-field v-model="formData.genotype" label="Genotype" outlined required class="mb-4" />

        <!-- Treatment -->
        <v-text-field v-model="formData.treatment" label="Treatment" outlined class="mb-4" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="emit('update:modelValue', false)">Close</v-btn>
        <v-btn color="primary" @click="handleSubmit">Create</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
