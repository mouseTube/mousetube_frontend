<script setup lang="ts">
import { ref } from 'vue';
import { useAnimalProfileStore } from '~/stores/animalProfile';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(['update:modelValue', 'created']);

const animalProfileStore = useAnimalProfileStore();

const formData = ref({
  name: '',
  description: '',
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
        <!-- Name -->
        <v-text-field v-model="formData.name" outlined required class="mb-4">
          <template #label> Profile Name <span style="color: red">*</span> </template>
        </v-text-field>

        <!-- Description -->
        <v-textarea v-model="formData.description" outlined class="mb-4">
          <template #label> Description</template>
        </v-textarea>

        <!-- Strain -->
        <v-text-field v-model="formData.strain" outlined required class="mb-4">
          <template #label> Strain <span style="color: red">*</span> </template>
        </v-text-field>

        <!-- Sex -->
        <v-select
          v-model="formData.sex"
          :items="['male', 'female']"
          label="Sex"
          outlined
          required
          class="mb-4"
        >
          <template #label> Sex <span style="color: red">*</span> </template>
        </v-select>

        <!-- Genotype -->
        <v-text-field v-model="formData.genotype" outlined required class="mb-4">
          <template #label> Genotype <span style="color: red">*</span> </template>
        </v-text-field>

        <!-- Treatment -->
        <v-text-field v-model="formData.treatment" outlined class="mb-4">
          <template #label> Treatment </template>
        </v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="emit('update:modelValue', false)">Close</v-btn>
        <v-btn color="primary" @click="handleSubmit">Create</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
