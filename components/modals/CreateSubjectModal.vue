<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSubjectStore } from '@/stores/subject';
import { useAnimalProfileStore } from '@/stores/animalProfile';
import CreateAnimalProfileModal from '@/components/modals/CreateAnimalProfileModal.vue';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(['update:modelValue', 'created']);

const subjectStore = useSubjectStore();
const animalProfileStore = useAnimalProfileStore();

const showCreateAnimalProfile = ref(false);
const animalProfileOptions = ref<{ label: string; value: number }[]>([]);

const formData = ref({
  name: '',
  identifier: '',
  cohort: '',
  origin: '',
  animal_type: null,
});

function fetchAnimalProfiles() {
  animalProfileStore.fetchAnimalProfiles().then(() => {
    animalProfileOptions.value = animalProfileStore.animalProfiles.map((p) => ({
      label: p.genotype || `Profile ${p.id}`,
      value: p.id,
    }));
  });
}

onMounted(() => {
  fetchAnimalProfiles();
});

function handleSubmit() {
  subjectStore.createSubject(formData.value).then((created) => {
    emit('created', created);
    emit('update:modelValue', false);
  });
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="600"
  >
    <v-card>
      <v-card-title class="form-title">
        <span class="form-icon" aria-hidden="true"><v-icon icon="mdi-account-outline" /></span>
        <span>Create Subject</span>
      </v-card-title>
      <v-card-text>
        <!-- Subject Name -->
        <v-text-field
          v-model="formData.name"
          label="Subject Name"
          variant="outlined"
          required
          class="mb-4"
        />

        <!-- Identifier -->
        <v-text-field
          v-model="formData.identifier"
          label="Identifier"
          variant="outlined"
          class="mb-4"
        />

        <!-- Cohort -->
        <v-text-field v-model="formData.cohort" label="Cohort" variant="outlined" class="mb-4" />

        <!-- Origin -->
        <v-text-field v-model="formData.origin" label="Origin" variant="outlined" class="mb-4" />

        <!-- Animal Profile -->
        <v-select
          v-model="formData.animal_type"
          :items="animalProfileOptions"
          item-title="label"
          item-value="value"
          label="Animal Profile"
          variant="outlined"
          required
          class="mb-4"
        />

        <!-- Add Animal Profile Button -->
        <v-btn color="primary" class="mt-2" @click="showCreateAnimalProfile = true">
          <v-icon class="mr-2">mdi-plus</v-icon>
          Add Animal Profile
        </v-btn>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" color="grey-darken-1" @click="emit('update:modelValue', false)"
          >Close</v-btn
        >
        <v-btn color="primary" variant="flat" @click="handleSubmit">Create</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Modal for creating a new animal profile -->
    <CreateAnimalProfileModal
      :model-value="showCreateAnimalProfile"
      @update:model-value="showCreateAnimalProfile = $event"
      @created="fetchAnimalProfiles"
    />
  </v-dialog>
</template>
