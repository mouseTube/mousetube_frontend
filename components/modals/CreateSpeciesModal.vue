<script setup>
import { ref, watch } from 'vue';
import { useSpeciesStore } from '@/stores/species';

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(['update:show', 'created']);

const formData = ref({
  name: '',
});

const speciesStore = useSpeciesStore();

// Réinitialiser le formulaire lorsque le modal est fermé
watch(
  () => props.show,
  (val) => {
    if (!val) {
      formData.value = { name: '' };
    }
  }
);

async function submit() {
  try {
    const newSpecies = await speciesStore.createSpecies(formData.value);
    emit('created', newSpecies);
    emit('update:show', false);
  } catch (err) {
    console.error('Erreur création species:', err);
  }
}
</script>

<template>
  <v-dialog
    :model-value="props.show"
    @update:model-value="emit('update:show', $event)"
    max-width="400px"
    persistent
  >
    <v-card>
      <v-card-title>Create New Species</v-card-title>
      <v-card-text>
        <!-- Species Name -->
        <v-text-field v-model="formData.name" label="Species Name" outlined required class="mb-4" />
      </v-card-text>
      <v-card-actions>
        <v-btn text @click="emit('update:show', false)">Cancel</v-btn>
        <v-btn color="primary" @click="submit">Create</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
