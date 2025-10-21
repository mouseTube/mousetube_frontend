<script setup lang="ts">
////////////////////////////////
// IMPORTS
////////////////////////////////
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useProtocolStore, type Protocol } from '@/stores/protocol';
import { type RecordingSession, useRecordingSessionStore } from '@/stores/recordingSession';
import ProtocolSelectModal from '@/components/modals/ProtocolSelectModal.vue';

////////////////////////////////
// PROPS & EMITS
////////////////////////////////
const props = defineProps<{
  selectedProtocolId: number | null;
  selectedRecordingSessionId: number | null;
  onGoToAnimalProfile?: () => void;
}>();

const emit = defineEmits<{
  (e: 'update:selectedProtocolId', value: number | null): void;
  (e: 'protocol-selected', value: Protocol | null): void;
  (e: 'protocol-saved', value: { saved: boolean }): void;
  (e: 'protocol-dirty', value: { dirty: boolean }): void;
  (e: 'validate', value: { hasErrors: boolean; message?: string }): void;
}>();

////////////////////////////////
// STORES
////////////////////////////////
const protocolStore = useProtocolStore();
const recordingSessionStore = useRecordingSessionStore();

////////////////////////////////
// STATE
////////////////////////////////
const selectedProtocolIdRef = ref<'new' | number>(props.selectedProtocolId ?? 'new');
const selectedProtocolObject = ref<Protocol | null>(null);

const showProtocolSelectModal = ref(false);
const initialFormData = ref('');

const formData = ref({
  name: '',
  description: '',
  animals: { sex: '', age: '', housing: '' },
  context: {
    number_of_animals: null as number | null,
    duration: '',
    cage: '',
    bedding: '',
    light_cycle: '',
  },
  status: 'draft' as 'draft' | 'awaiting validation' | 'validated' | null,
});

const snackbar = ref(false);
const snackbarMessage = ref('');
const snackbarColor = ref('');
const session = ref<RecordingSession | null>(null);

const skipNextProtocolPropWatch = ref(false);
const skipNextSessionStoreWatch = ref(false);

const isSaving = ref(false);

////////////////////////////////
// COMPUTED
////////////////////////////////
const selectItems = computed(() => {
  const items: Array<{ id: string | number; name: string }> = [
    { id: 'new', name: 'Create New Protocol' },
    { id: 'select', name: 'Select Existing Protocol' },
  ];
  if (selectedProtocolObject.value && typeof selectedProtocolObject.value.id === 'number') {
    items.push({
      id: selectedProtocolObject.value.id,
      name: selectedProtocolObject.value.name,
    });
  }
  return items;
});

const isValidated = computed(() => formData.value.status === 'validated');

const isSaveEnabled = computed(() => {
  const formChanged = snapshotFormData(formData.value) !== initialFormData.value;
  const protocolSelectedButNotLinked =
    selectedProtocolObject.value &&
    props.selectedRecordingSessionId !== null &&
    session.value?.protocol?.id !== selectedProtocolObject.value.id;

  return formChanged || protocolSelectedButNotLinked;
});

const canLinkValidatedProtocol = computed(() => {
  return (
    selectedProtocolObject.value !== null &&
    selectedProtocolObject.value.status === 'validated' &&
    session.value?.status !== 'published' &&
    session.value?.protocol?.id !== selectedProtocolObject.value.id
  );
});

const isLinking = ref(false);
////////////////////////////////
// FUNCTIONS
////////////////////////////////
function snapshotFormData(data: typeof formData.value) {
  return JSON.stringify(JSON.parse(JSON.stringify(data)));
}

function resetForm() {
  formData.value = {
    name: '',
    description: '',
    animals: { sex: '', age: '', housing: '' },
    context: {
      number_of_animals: null,
      duration: '',
      cage: '',
      bedding: '',
      light_cycle: '',
    },
    status: 'draft',
  };
  selectedProtocolObject.value = null;
  initialFormData.value = snapshotFormData(formData.value);
  selectedProtocolIdRef.value = 'new';
  emit('update:selectedProtocolId', null);
  emit('protocol-selected', null);
  // notify parent
  emit('protocol-saved', { saved: false });
  emit('protocol-dirty', { dirty: false });
  emit('validate', { hasErrors: false, message: '' });
}

function mapProtocolToFormData(protocol: Protocol) {
  return {
    name: protocol.name,
    description: protocol.description ?? '',
    animals: {
      sex: (protocol as any).animals_sex ?? protocol.animals?.sex ?? '',
      age: (protocol as any).animals_age ?? protocol.animals?.age ?? '',
      housing: (protocol as any).animals_housing ?? protocol.animals?.housing ?? '',
    },
    context: {
      number_of_animals:
        (protocol as any).context_number_of_animals ?? protocol.context?.number_of_animals ?? null,
      duration: (protocol as any).context_duration ?? protocol.context?.duration ?? '',
      cage: (protocol as any).context_cage ?? protocol.context?.cage ?? '',
      bedding: (protocol as any).context_bedding ?? protocol.context?.bedding ?? '',
      light_cycle: (protocol as any).context_light_cycle ?? protocol.context?.light_cycle ?? '',
    },
    status: protocol.status ?? 'draft',
  };
}

async function loadProtocol(protocolId: number) {
  const protocol = await protocolStore.getProtocolById(protocolId);
  if (protocol) {
    selectedProtocolObject.value = protocol;
    selectedProtocolIdRef.value = protocol.id;

    const mapped = mapProtocolToFormData(protocol);
    formData.value = mapped;
    initialFormData.value = snapshotFormData(formData.value);

    if (session.value?.protocol?.id === protocol.id) {
      emit('update:selectedProtocolId', protocol.id);
    }

    emit('protocol-selected', protocol);
  } else {
    resetForm();
  }
}

function onProtocolSelected(protocol: Protocol) {
  selectedProtocolObject.value = protocol;
  selectedProtocolIdRef.value = protocol.id;

  const mapped = mapProtocolToFormData(protocol);
  formData.value = mapped;
  // initialFormData.value = snapshotFormData(formData.value);
  showProtocolSelectModal.value = false;

  if (session.value?.protocol?.id === protocol.id) {
    emit('update:selectedProtocolId', protocol.id);
  }

  emit('protocol-selected', protocol);
  emit('protocol-dirty', { dirty: true });
}

function handleProtocolSelection(newId: 'new' | 'select' | number) {
  if (newId === 'new') {
    resetForm();
  } else if (newId === 'select') {
    selectedProtocolIdRef.value = selectedProtocolObject.value?.id ?? 'new';
    showProtocolSelectModal.value = true;
  } else {
    loadProtocol(Number(newId));
  }
}

async function onSubmit() {
  if (isSaving.value) return;
  isSaving.value = true;
  try {
    let protocolId: number;
    const payload = { ...formData.value, animals: { ...formData.value.animals } };

    let resultProtocol: Protocol;

    if (typeof selectedProtocolIdRef.value === 'number') {
      const updated = await protocolStore.updateProtocol(selectedProtocolIdRef.value, payload);
      protocolId = updated.id;
      resultProtocol = updated;
      snackbarMessage.value = 'Protocol updated successfully.';
      snackbarColor.value = 'success';
    } else {
      const created = await protocolStore.createProtocol(payload);
      protocolId = created.id;
      resultProtocol = created;
      snackbarMessage.value = 'Protocol created successfully.';
      snackbarColor.value = 'success';
    }

    selectedProtocolObject.value = resultProtocol;
    selectedProtocolIdRef.value = protocolId;

    // --- CHANGED: merge server response with local form to avoid losing user-entered fields
    const mapped = mapProtocolToFormData(resultProtocol);
    formData.value = {
      name: mapped.name ?? formData.value.name,
      description: mapped.description ?? formData.value.description,
      animals: {
        sex: mapped.animals?.sex ?? formData.value.animals.sex,
        age: mapped.animals?.age ?? formData.value.animals.age,
        housing: mapped.animals?.housing ?? formData.value.animals.housing,
      },
      context: {
        number_of_animals:
          mapped.context?.number_of_animals ?? formData.value.context.number_of_animals,
        duration: mapped.context?.duration ?? formData.value.context.duration,
        cage: mapped.context?.cage ?? formData.value.context.cage,
        bedding: mapped.context?.bedding ?? formData.value.context.bedding,
        light_cycle: mapped.context?.light_cycle ?? formData.value.context.light_cycle,
      },
      status: mapped.status ?? formData.value.status,
    };
    initialFormData.value = snapshotFormData(formData.value);

    // notify parent about saved
    emit('protocol-saved', { saved: true });
    emit('protocol-dirty', { dirty: false });
    emit('validate', { hasErrors: false, message: '' });

    // prevent the immediate prop-watcher from reloading/resetting the form
    skipNextProtocolPropWatch.value = true;
    emit('update:selectedProtocolId', protocolId);
    emit('protocol-selected', resultProtocol);

    await nextTick();

    if (props.selectedRecordingSessionId !== null) {
      // <-- ADDED: skip the session-store watcher once to avoid immediate overwrite
      skipNextSessionStoreWatch.value = true;
      await recordingSessionStore.updateSessionProtocol(
        props.selectedRecordingSessionId,
        protocolId
      );
      // ensure local session reflects the link so isSaveEnabled flips to false immediately
      if (session.value) {
        session.value = { ...session.value, protocol: selectedProtocolObject.value as any };
      }
      snackbarMessage.value += ' Linked to recording session.';
    }

    snackbar.value = true;
  } catch (err: any) {
    snackbarMessage.value = 'Error saving protocol.';
    snackbarColor.value = 'error';
    snackbar.value = true;
    // eslint-disable-next-line no-console
    console.error(err);
  } finally {
    isSaving.value = false;
  }
}

async function linkValidatedProtocol() {
  if (
    !props.selectedRecordingSessionId ||
    !selectedProtocolObject.value ||
    typeof selectedProtocolObject.value.id !== 'number'
  ) {
    return;
  }

  try {
    isLinking.value = true;
    const protocolId = selectedProtocolObject.value.id;

    skipNextSessionStoreWatch.value = true;
    await recordingSessionStore.updateSessionProtocol(props.selectedRecordingSessionId, protocolId);

    if (session.value) {
      session.value.protocol = selectedProtocolObject.value;
    }

    // Mise à jour du snapshot pour que le formulaire ne soit plus dirty
    initialFormData.value = snapshotFormData(formData.value);

    // Force le dirty à false
    emit('protocol-dirty', { dirty: false });

    emit('update:selectedProtocolId', protocolId);
    emit('protocol-selected', selectedProtocolObject.value);
    snackbarMessage.value = 'Validated protocol linked to recording session.';
    snackbarColor.value = 'success';
    snackbar.value = true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    snackbarMessage.value = 'Error linking validated protocol.';
    snackbarColor.value = 'error';
    snackbar.value = true;
  } finally {
    isLinking.value = false;
  }
}

function mapSessionProtocolToForm(protocolFromSession: any): Protocol {
  return {
    id: protocolFromSession.id,
    name: protocolFromSession.name ?? '',
    description: protocolFromSession.description ?? '',
    animals: {
      sex: protocolFromSession.animals?.sex ?? '',
      age: protocolFromSession.animals?.age ?? '',
      housing: protocolFromSession.animals?.housing ?? '',
    },
    context: {
      number_of_animals: protocolFromSession.context?.number_of_animals ?? null,
      duration: protocolFromSession.context?.duration ?? '',
      cage: protocolFromSession.context?.cage ?? '',
      bedding: protocolFromSession.context?.bedding ?? '',
      light_cycle: protocolFromSession.context?.light_cycle ?? '',
    },
    status: protocolFromSession.status ?? 'draft',
  };
}

// --- HELPERS: detect detail / merge / resolve ---
function hasEmbeddedDetail(embedded: any) {
  if (!embedded) return false;
  const animalsHasValues =
    !!embedded.animals &&
    (Boolean(embedded.animals.sex) ||
      Boolean(embedded.animals.age) ||
      Boolean(embedded.animals.housing));
  const contextHasValues =
    !!embedded.context && Object.values(embedded.context).some((v: any) => v !== null && v !== '');
  return animalsHasValues || contextHasValues;
}

function mergeMappedIntoForm(mapped: ReturnType<typeof mapProtocolToFormData>) {
  formData.value = {
    name: mapped.name ?? formData.value.name,
    description: mapped.description ?? formData.value.description,
    animals: {
      sex: mapped.animals?.sex ?? formData.value.animals.sex,
      age: mapped.animals?.age ?? formData.value.animals.age,
      housing: mapped.animals?.housing ?? formData.value.animals.housing,
    },
    context: {
      number_of_animals:
        mapped.context?.number_of_animals ?? formData.value.context.number_of_animals,
      duration: mapped.context?.duration ?? formData.value.context.duration,
      cage: mapped.context?.cage ?? formData.value.context.cage,
      bedding: mapped.context?.bedding ?? formData.value.context.bedding,
      light_cycle: mapped.context?.light_cycle ?? formData.value.context.light_cycle,
    },
    status: mapped.status ?? formData.value.status,
  };
}

async function resolveProtocolEmbedded(
  embedded: Partial<Protocol> | null
): Promise<Protocol | null> {
  if (!embedded) return null;

  if (hasEmbeddedDetail(embedded)) {
    return mapSessionProtocolToForm(embedded);
  }
  if (embedded.id) {
    const protocol = await protocolStore.getProtocolById(embedded.id);
    if (protocol) return protocol;
  }

  return mapSessionProtocolToForm(embedded);
}

// --- REPLACED WATCHERS: single selectedRecordingSessionId watcher + sessions watcher ---
watch(
  () => props.selectedRecordingSessionId,
  async (newId) => {
    if (!newId) {
      session.value = null;
      resetForm();
      return;
    }
    const s = await recordingSessionStore.getSessionById(newId);
    session.value = s;
    if (!s?.protocol) {
      resetForm();
      return;
    }
    // try to produce a form-safe protocol (prefer full)
    const protocolForForm = await resolveProtocolEmbedded(s.protocol);
    if (!protocolForForm) {
      resetForm();
      return;
    }
    selectedProtocolObject.value = protocolForForm;
    mergeMappedIntoForm(mapProtocolToFormData(protocolForForm));
    initialFormData.value = snapshotFormData(formData.value);
    selectedProtocolIdRef.value = protocolForForm.id;
    emit('protocol-selected', protocolForForm);
  },
  { immediate: true }
);

watch(
  () => recordingSessionStore.sessions,
  (newSessions) => {
    if (skipNextSessionStoreWatch.value) {
      skipNextSessionStoreWatch.value = false;
      return;
    }
    if (!props.selectedRecordingSessionId) return;
    const updated = newSessions.find((s) => s.id === props.selectedRecordingSessionId);
    if (!updated) return;

    session.value = updated;

    const embedded = (updated as any).protocol;
    const immediateProtocolStatus = embedded?.status ?? updated.status ?? null;
    if (immediateProtocolStatus) {
      formData.value.status = immediateProtocolStatus;
      if (selectedProtocolObject.value)
        (selectedProtocolObject.value as any).status = immediateProtocolStatus;
    }

    const localDirty = snapshotFormData(formData.value) !== initialFormData.value;

    if (!localDirty) {
      if (!embedded) {
        resetForm();
        return;
      }
      if (!hasEmbeddedDetail(embedded)) {
        if (
          selectedProtocolObject.value &&
          typeof embedded.id === 'number' &&
          selectedProtocolObject.value.id === embedded.id
        ) {
          (selectedProtocolObject.value as any).status =
            immediateProtocolStatus ?? (selectedProtocolObject.value as any).status;
        }
        return;
      }
      // embedded has details -> resolve & merge safely (async inlined)
      (async () => {
        const protocolForForm = await resolveProtocolEmbedded(embedded);
        if (!protocolForForm) {
          resetForm();
          return;
        }
        protocolForForm.status = protocolForForm.status ?? immediateProtocolStatus ?? 'draft';
        selectedProtocolObject.value = protocolForForm;
        mergeMappedIntoForm(mapProtocolToFormData(protocolForForm));
        initialFormData.value = snapshotFormData(formData.value);
        selectedProtocolIdRef.value = protocolForForm.id;
        emit('protocol-selected', protocolForForm);
      })();
    } else {
      // form dirty: only sync minimal safe fields
      if (embedded) {
        const proto = mapSessionProtocolToForm(embedded);
        selectedProtocolObject.value = proto;
        formData.value.status = proto.status ?? formData.value.status;
        initialFormData.value = snapshotFormData(formData.value);
        session.value = updated;
      }
    }
  },
  { deep: true }
);

watch(
  formData,
  () => {
    // compute validation (same rules as template)
    const errors: string[] = [];
    if (!formData.value.name || !formData.value.name.trim()) errors.push('Name is required');
    const animals = formData.value.animals || {};
    if (!animals.sex) errors.push('Sex is required');
    if (!animals.age) errors.push('Age is required');
    if (!animals.housing) errors.push('Housing is required');
    const ctx = formData.value.context || {};
    if (ctx.number_of_animals === null || ctx.number_of_animals === undefined)
      errors.push('Number of animals is required');
    if (!ctx.duration) errors.push('Duration is required');
    if (!ctx.cage) errors.push('Cage Type is required');
    if (!ctx.bedding) errors.push('Bedding is required');
    if (!ctx.light_cycle) errors.push('Light Cycle is required');

    const hasErrors = errors.length > 0;
    emit('validate', { hasErrors, message: hasErrors ? errors[0] : '' });

    const dirty = snapshotFormData(formData.value) !== initialFormData.value;
    emit('protocol-dirty', { dirty });
  },
  { deep: true, immediate: true }
);

////////////////////////////////
// ON MOUNT
////////////////////////////////
onMounted(async () => {
  if (props.selectedProtocolId) {
    await loadProtocol(props.selectedProtocolId);
  } else if (props.selectedRecordingSessionId) {
    const s = await recordingSessionStore.getSessionById(props.selectedRecordingSessionId);
    session.value = s;
    if (s?.protocol?.id) await loadProtocol(s.protocol.id);
  }
});
</script>

<template>
  <v-container>
    <!-- Protocol Selection -->
    <v-select
      v-model="selectedProtocolIdRef"
      :items="selectItems"
      item-title="name"
      item-value="id"
      label="Select Protocol"
      outlined
      dense
      :value-comparator="(a: any, b: any) => a === b"
      @update:modelValue="handleProtocolSelection"
      :disabled="isValidated && session?.status === 'published'"
    >
      <template #selection="{ item, index }">
        <span>
          {{
            selectedProtocolObject?.name ||
            (selectedProtocolIdRef === 'new' ? 'Create New Protocol' : '')
          }}
        </span>
      </template>
    </v-select>

    <!-- Form Card -->
    <v-card class="pa-6" outlined>
      <v-card-title class="d-flex justify-space-between align-center mb-4">
        <div class="d-flex align-center" style="gap: 12px">
          <h3 class="m-0">Protocol Metadata</h3>
          <v-chip
            :color="
              formData.status === 'validated'
                ? 'green'
                : formData.status === 'awaiting validation'
                  ? 'blue'
                  : 'grey'
            "
            dark
            small
          >
            {{ formData.status }}
          </v-chip>
        </div>
        <div>
          <!-- Boutons dynamiques -->
          <template v-if="canLinkValidatedProtocol">
            <v-btn
              :loading="isLinking"
              :disabled="isLinking"
              color="primary"
              @click="linkValidatedProtocol"
            >
              Link this protocol
            </v-btn>
          </template>
          <template v-else>
            <v-btn
              color="grey"
              variant="outlined"
              @click="resetForm"
              class="mr-2"
              :disabled="isValidated"
            >
              Reset
            </v-btn>
            <v-btn
              color="primary"
              @click="onSubmit"
              :disabled="!isSaveEnabled || isValidated || isSaving"
            >
              Save
            </v-btn>
          </template>
        </div>
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="formData.name"
          outlined
          required
          class="mb-4"
          :rules="[(v: any) => !!v || 'Name is required']"
          :disabled="isValidated"
        >
          <template #label>Name <span style="color: red">*</span></template>
        </v-text-field>

        <!-- Animal Information -->
        <v-card class="pa-4 mb-4" outlined>
          <v-card-title>Animal Information</v-card-title>
          <v-card-text>
            <v-select
              v-model="formData.animals.sex"
              :items="['male(s)', 'female(s)', 'male(s) & female(s)']"
              label="Sex"
              outlined
              class="mb-4"
              :rules="[(v: any) => !!v || 'Sex is required']"
              :disabled="isValidated"
            >
              <template #label>Sex <span style="color: red">*</span></template>
            </v-select>
            <v-select
              v-model="formData.animals.age"
              :items="['pup', 'juvenile', 'adult']"
              label="Age"
              outlined
              class="mb-4"
              :rules="[(v: any) => !!v || 'Age is required']"
              :disabled="isValidated"
            >
              <template #label>Age <span style="color: red">*</span></template>
            </v-select>
            <v-select
              v-model="formData.animals.housing"
              :items="['grouped', 'isolated', 'grouped & isolated']"
              label="Housing"
              outlined
              class="mb-4"
              :rules="[(v: any) => !!v || 'Housing is required']"
              :disabled="isValidated"
            >
              <template #label>Housing <span style="color: red">*</span></template>
            </v-select>
          </v-card-text>
        </v-card>

        <!-- Experimental Context -->
        <v-card class="pa-4 mb-4" outlined>
          <v-card-title>Experimental Context</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="formData.context.number_of_animals"
              label="Number of Animals"
              type="number"
              outlined
              class="mb-4"
              @update:modelValue="
                (val: string) =>
                  (formData.context.number_of_animals = val === '' ? null : Number(val))
              "
              :rules="[(v: number | null) => (v !== null && v > 0) || 'Must be a positive number']"
              :disabled="isValidated"
            >
              <template #label>Number of Animals <span style="color: red">*</span></template>
            </v-text-field>
            <v-select
              v-model="formData.context.duration"
              :items="['short term (<1h)', 'mid term (<1day)', 'long term (>=1day)']"
              label="Duration"
              outlined
              class="mb-4"
              :rules="[(v: any) => !!v || 'Duration is required']"
              :disabled="isValidated"
            >
              <template #label>Duration <span style="color: red">*</span></template>
            </v-select>
            <v-select
              v-model="formData.context.cage"
              :items="['unfamiliar test cage', 'familiar test cage', 'home cage']"
              label="Cage Type"
              outlined
              class="mb-4"
              :rules="[(v: any) => !!v || 'Cage Type is required']"
              :disabled="isValidated"
            >
              <template #label>Cage Type <span style="color: red">*</span></template>
            </v-select>
            <v-select
              v-model="formData.context.bedding"
              :items="['bedding', 'no bedding']"
              label="Bedding"
              outlined
              class="mb-4"
              :rules="[(v: any) => !!v || 'Bedding is required']"
              :disabled="isValidated"
            >
              <template #label>Bedding <span style="color: red">*</span></template>
            </v-select>
            <v-select
              v-model="formData.context.light_cycle"
              :items="['day', 'night', 'both']"
              label="Light Cycle"
              outlined
              class="mb-4"
              :rules="[(v: any) => !!v || 'Light Cycle is required']"
              :disabled="isValidated"
            >
              <template #label>Light Cycle <span style="color: red">*</span></template>
            </v-select>
          </v-card-text>
        </v-card>
        <v-textarea
          v-model="formData.description"
          label="Note"
          outlined
          required
          class="mb-4"
          :disabled="isValidated"
          auto-grow
        />
      </v-card-text>
      <v-card-actions class="d-flex justify-end mt-4">
        <div>
          <template v-if="canLinkValidatedProtocol">
            <v-btn
              :loading="isLinking"
              :disabled="isLinking"
              color="primary"
              @click="linkValidatedProtocol"
            >
              Link this protocol
            </v-btn>
          </template>
          <template v-else>
            <v-btn
              color="grey"
              variant="outlined"
              @click="resetForm"
              class="mr-2"
              :disabled="isValidated"
            >
              Reset
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              @click="onSubmit"
              :disabled="!isSaveEnabled || isValidated || isSaving"
            >
              Save
            </v-btn>
          </template>
        </div>
      </v-card-actions>
    </v-card>
    <v-btn
      color="primary"
      variant="text"
      class="mt-2"
      :disabled="!props.selectedProtocolId"
      @click="props.onGoToAnimalProfile?.()"
    >
      Go to Animal Profile
      <v-icon end>mdi-arrow-right</v-icon>
    </v-btn>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" timeout="3000" location="top right">
      {{ snackbarMessage }}
    </v-snackbar>

    <!-- Protocol Selection Modal -->
    <ProtocolSelectModal v-model="showProtocolSelectModal" @select="onProtocolSelected" />
  </v-container>
</template>
