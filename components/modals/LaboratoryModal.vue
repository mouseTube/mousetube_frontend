<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import { useAuth } from '@/composables/useAuth';
import { useLaboratoryStore } from '@/stores/laboratory';

const props = defineProps<{
  modelValue: boolean;
  editId?: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved'): void;
}>();

const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();
const labStore = useLaboratoryStore();

const loading = ref(false);
const form = ref({
  name: '',
  institution: '',
  unit: '',
  address: '',
  country: '',
  contact: '',
});

const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');

function showSnackbar(message: string, color = 'success') {
  snackbarMessage.value = message;
  snackbarColor.value = color;
  snackbar.value = true;
}

async function loadLaboratory() {
  if (!props.editId) return;
  loading.value = true;
  try {
    console.log('Loading laboratory with ID:', props.editId);
    let lab = labStore.getLaboratoryById(props.editId);
    if (!lab) {
      console.log('Not found locally, fetching from API...');
      lab = await labStore.fetchLaboratoryById(props.editId);
    } else {
      console.log('Found locally:', lab);
    }
    if (lab) {
      form.value = {
        name: lab.name ?? '',
        institution: lab.institution ?? '',
        unit: lab.unit ?? '',
        address: lab.address ?? '',
        country: lab.country ?? '',
        contact: lab.contact ?? '',
      };
    }
  } catch (e) {
    showSnackbar('Error loading laboratory.', 'error');
    console.error(e);
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!form.value.name.trim()) {
    showSnackbar('Name is required.', 'error');
    return;
  }
  loading.value = true;
  try {
    if (props.editId) {
      await labStore.updateLaboratory(props.editId, form.value);
      showSnackbar('Laboratory updated successfully.');
    } else {
      await labStore.createLaboratory(form.value);
      showSnackbar('Laboratory created successfully.');
    }
    emit('saved');
    emit('update:modelValue', false);
  } catch (e) {
    showSnackbar('Error saving laboratory.', 'error');
    console.error(e);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      if (!props.editId) {
        // new creation : reset form
        form.value = {
          name: '',
          institution: '',
          unit: '',
          address: '',
          country: '',
          contact: '',
        };
      }
    }
  },
  { immediate: true }
);

watch(
  () => props.editId,
  (newId) => {
    if (newId != null && props.modelValue) {
      loadLaboratory();
    }
  }
);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="500"
  >
    <v-card>
      <v-card-title>{{ props.editId ? 'Edit Laboratory' : 'Create Laboratory' }}</v-card-title>
      <v-card-text>
        <v-form>
          <v-text-field v-model="form.name" label="Name *" required />
          <v-text-field v-model="form.institution" label="Institution" />
          <v-text-field v-model="form.unit" label="Unit" />
          <v-text-field v-model="form.address" label="Address" />
          <v-text-field v-model="form.country" label="Country" />
          <v-text-field v-model="form.contact" label="Contact" />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" @click="save">{{
          props.editId ? 'Update' : 'Create'
        }}</v-btn>
      </v-card-actions>
    </v-card>
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000">{{
      snackbarMessage
    }}</v-snackbar>
  </v-dialog>
</template>
