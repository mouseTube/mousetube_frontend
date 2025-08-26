<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
import { useSoftwareStore } from '@/stores/software';
import type { VForm } from 'vuetify/components';

const props = defineProps<{
  modelValue: boolean;
  softwareId?: number | null;
  initialData?: Partial<{
    name: string;
    type: 'acquisition' | 'analysis' | 'acquisition and analysis' | null;
    made_by: string;
    description: string;
    technical_requirements: string;
  }> | null;
}>();

const emit = defineEmits(['update:modelValue', 'saved', 'duplicate']);

const store = useSoftwareStore();

const formData = ref({
  name: '',
  type: null as 'acquisition' | 'analysis' | 'acquisition and analysis' | null,
  made_by: '',
  description: '',
  technical_requirements: '',
});

const loading = ref(false);
const snackbar = ref(false);
const snackbarMessage = ref('');
const formRef = ref<VForm | null>(null);

// infos sessions liées
const linkedSessionsCount = ref(0);
const linkedSessionsFromOthers = ref<number | null>(null);

// règles
const nameRule = (v: string) => !!v || 'Name is required';
const typeRule = (v: string | null) =>
  v === 'acquisition' || v === 'analysis' || v === 'acquisition and analysis' || 'Type is required';

const isReadOnly = computed(
  () => linkedSessionsFromOthers.value !== null && linkedSessionsFromOthers.value > 0
);
async function loadSoftwareData() {
  if (props.softwareId) {
    loading.value = true;
    try {
      const data = await store.fetchSoftwareById(props.softwareId);
      if (data) {
        formData.value = {
          name: data.name || '',
          type: data.type ?? null,
          made_by: data.made_by || '',
          description: data.description || '',
          technical_requirements: data.technical_requirements || '',
        };
        linkedSessionsCount.value = data.linked_sessions_count ?? 0;
        linkedSessionsFromOthers.value = data.linked_sessions_from_other_users ?? 0;
      }
    } catch {
      snackbarMessage.value = 'Failed to load software data';
      snackbar.value = true;
    } finally {
      loading.value = false;
    }
  } else if (props.initialData) {
    formData.value = {
      name: props.initialData.name ?? '',
      type: props.initialData.type ?? null,
      made_by: props.initialData.made_by ?? '',
      description: props.initialData.description ?? '',
      technical_requirements: props.initialData.technical_requirements ?? '',
    };
    linkedSessionsCount.value = 0;
    linkedSessionsFromOthers.value = 0;
  } else {
    formData.value = {
      name: '',
      type: null,
      made_by: '',
      description: '',
      technical_requirements: '',
    };
    linkedSessionsCount.value = 0;
    linkedSessionsFromOthers.value = 0;
  }
  await nextTick();
  formRef.value?.resetValidation();
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) loadSoftwareData();
  },
  { immediate: true }
);

async function submit() {
  const result = await formRef.value?.validate();
  if (!result?.valid) {
    snackbarMessage.value = 'Please fill in the required fields';
    snackbar.value = true;
    return;
  }

  if (isReadOnly.value) {
    snackbarMessage.value =
      'This software is linked to other users’ sessions and cannot be edited. Please duplicate instead.';
    snackbar.value = true;
    return;
  }

  loading.value = true;
  try {
    if (props.softwareId) {
      await store.updateSoftware(props.softwareId, formData.value);
    } else {
      await store.createSoftware(formData.value);
    }
    emit('saved');
    emit('update:modelValue', false);
  } catch (e) {
    snackbarMessage.value = store.error ?? 'Error saving software';
    snackbar.value = true;
  } finally {
    loading.value = false;
  }
}

function close() {
  emit('update:modelValue', false);
}

function duplicate() {
  emit('duplicate', {
    ...formData.value,
    name: `${formData.value.name} (copy)`,
  });
  emit('update:modelValue', false);
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="600"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        {{ softwareId ? 'Edit Software' : 'Create Software' }}
      </v-card-title>

      <v-card-text>
        <!-- Alertes -->
        <v-alert v-if="isReadOnly" type="warning" variant="outlined" border="start" class="mb-4">
          This software is linked to recording sessions from other users. You cannot edit it. Please
          duplicate if you want to make changes.
        </v-alert>

        <v-alert
          v-else-if="linkedSessionsCount > 0"
          type="info"
          variant="outlined"
          border="start"
          class="mb-4"
        >
          This software is linked to {{ linkedSessionsCount }} of your recording sessions. Editing
          it will affect all linked sessions.
        </v-alert>

        <v-form ref="formRef" lazy-validation>
          <v-text-field
            v-model="formData.name"
            label="Name"
            outlined
            required
            :rules="[nameRule]"
            :disabled="loading || isReadOnly"
            class="mb-4"
          >
            <template #label> Name <span class="text-error">*</span> </template>
          </v-text-field>

          <v-select
            v-model="formData.type"
            :items="['acquisition', 'analysis', 'acquisition and analysis']"
            label="Type"
            outlined
            required
            :rules="[typeRule]"
            :disabled="loading || isReadOnly"
            class="mb-4"
          >
            <template #label> Type <span class="text-error">*</span> </template>
          </v-select>

          <v-text-field
            v-model="formData.made_by"
            label="Made By"
            outlined
            :disabled="loading || isReadOnly"
            class="mb-4"
          />

          <v-textarea
            v-model="formData.description"
            label="Description"
            outlined
            :disabled="loading || isReadOnly"
            rows="3"
            class="mb-4"
          />

          <v-textarea
            v-model="formData.technical_requirements"
            label="Technical Requirements"
            outlined
            :disabled="loading || isReadOnly"
            rows="3"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />

        <v-btn text @click="close" :disabled="loading">Cancel</v-btn>

        <v-btn
          v-show="isReadOnly"
          color="primary"
          @click="duplicate"
          :disabled="!isReadOnly || loading"
        >
          Duplicate
        </v-btn>

        <!-- Submit/Create button : toujours présent, désactivé si read-only -->
        <v-btn color="primary" @click="submit" :loading="loading" :disabled="loading || isReadOnly">
          {{ softwareId ? 'Save Changes' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-snackbar v-model="snackbar" color="error" timeout="6000" top>
      {{ snackbarMessage }}
      <template #actions>
        <v-btn color="white" variant="text" @click="snackbar = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </v-dialog>
</template>
