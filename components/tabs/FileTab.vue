<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useFileStore } from '~/stores/file';
import { useSubjectStore } from '~/stores/subject';
import CreateSubjectModal from '~/components/modals/CreateSubjectModal.vue';

const props = defineProps<{ modelValue: any }>();
const emit = defineEmits(['update:modelValue', 'saved']);

const fileStore = useFileStore();
const subjectStore = useSubjectStore();

const showCreateSubject = ref(false);

const subjectOptions = ref<{ label: string; value: number }[]>([]);

function fetchSubjects() {
  subjectStore.fetchSubjects().then(() => {
    subjectOptions.value = subjectStore.subjects.map((s) => ({
      label: s.name,
      value: s.id,
    }));
  });
}

onMounted(() => {
  fetchSubjects();
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      // Prefill form if editing
    }
  },
  { immediate: true }
);

const formData = ref({
  name: '',
  date: '',
  duration: null,
  format: '',
  sampling_rate: null,
  bit_depth: null,
  notes: '',
  size: null,
  doi: '',
  number: null,
  subjects: [],
});

function handleSubmit() {
  if (props.modelValue?.id) {
    fileStore.updateFile(props.modelValue.id, formData.value).then((saved) => {
      emit('update:modelValue', saved);
      emit('saved', saved);
    });
  } else {
    fileStore.createFile(formData.value).then((saved) => {
      emit('update:modelValue', saved);
      emit('saved', saved);
    });
  }
}
</script>

<template>
  <v-container>
    <v-card class="pa-6" max-width="800">
      <v-card-title>File Form</v-card-title>
      <v-card-text>
        <!-- File Name -->
        <v-text-field v-model="formData.name" label="File Name" outlined required class="mb-4" />

        <!-- Recording Date -->
        <v-text-field
          v-model="formData.date"
          label="Recording Date"
          type="date"
          outlined
          required
          class="mb-4"
        />

        <!-- Duration -->
        <v-text-field
          v-model="formData.duration"
          label="Duration (seconds)"
          type="number"
          outlined
          class="mb-4"
        />

        <!-- File Format -->
        <v-select
          v-model="formData.format"
          :items="['WAV', 'MP3', 'FLAC', 'OGG', 'AIFF', 'AVI', 'MP4', 'MOV', 'MKV']"
          label="File Format"
          outlined
          class="mb-4"
        />

        <!-- Sampling Rate -->
        <v-text-field
          v-model="formData.sampling_rate"
          label="Sampling Rate (Hz)"
          type="number"
          outlined
          class="mb-4"
        />

        <!-- Bit Depth -->
        <v-select
          v-model="formData.bit_depth"
          :items="[8, 16, 24, 32]"
          label="Bit Depth"
          outlined
          class="mb-4"
        />

        <!-- Notes -->
        <v-textarea v-model="formData.notes" label="Notes" outlined class="mb-4" />

        <!-- File Size -->
        <v-text-field
          v-model="formData.size"
          label="File Size (bytes)"
          type="number"
          outlined
          class="mb-4"
        />

        <!-- DOI -->
        <v-text-field v-model="formData.doi" label="DOI" type="url" outlined class="mb-4" />

        <!-- Vocalization Number -->
        <v-text-field
          v-model="formData.number"
          label="Vocalization Number"
          type="number"
          outlined
          class="mb-4"
        />

        <!-- Subjects -->
        <v-select
          v-model="formData.subjects"
          :items="subjectOptions"
          item-title="label"
          item-value="value"
          label="Subjects"
          multiple
          outlined
          chips
          class="mb-4"
        />
        <v-btn color="primary" class="mt-2" @click="showCreateSubject = true">
          <v-icon start>mdi-plus</v-icon>
          Add Subject
        </v-btn>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="handleSubmit">Save File</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Modal for creating a new subject -->
    <CreateSubjectModal v-model="showCreateSubject" @created="fetchSubjects()" />
  </v-container>
</template>
