<script setup lang="ts">
import PickerFrame from '@/components/modals/PickerFrame.vue';
import { ref, computed, watch } from 'vue';
import type { Study } from '@/stores/study';
import { useStudyStore } from '@/stores/study';
import CreateStudyModal from '@/components/modals/CreateStudyModal.vue';

const props = defineProps<{
  modelValue: boolean;
  selectedStudies: number[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:selectedStudies', value: number[]): void;
  (e: 'saved', study: Study): void;
}>();

const studyStore = useStudyStore();

// UI state
const showCreateStudyModal = ref(false);
const editStudy: Ref<Study | undefined> = ref(undefined);
const showDeleteConfirm = ref(false);
const deleteTarget: Ref<Study | null> = ref(null);

const searchQuery = ref('');
const sortOrder = ref<'asc' | 'desc'>('asc');
const page = ref(1);
const itemsPerPage = 9;

// Computed
const localDialog = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const internalSelectedStudyIds = computed({
  get: () => props.selectedStudies,
  set: (value: number[]) => emit('update:selectedStudies', value),
});

const filteredStudies = computed(() => {
  let items = studyStore.studies;
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    items = items.filter((s) => s.name.toLowerCase().includes(q));
  }
  return items.sort((a, b) =>
    sortOrder.value === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );
});

const paginatedStudies = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return filteredStudies.value.slice(start, start + itemsPerPage);
});

// Methods
function toggleSelection(id: number) {
  const newSelection = [...internalSelectedStudyIds.value];
  const index = newSelection.indexOf(id);
  if (index === -1) newSelection.push(id);
  else newSelection.splice(index, 1);
  internalSelectedStudyIds.value = newSelection;
}

function isSelected(id: number) {
  return internalSelectedStudyIds.value.includes(id);
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
}

function onEditStudy(study: Study) {
  editStudy.value = { ...study };
  showCreateStudyModal.value = true;
}

function onDeleteStudy(study: Study) {
  deleteTarget.value = study;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;
  try {
    await studyStore.deleteStudy(deleteTarget.value.id);
    internalSelectedStudyIds.value = internalSelectedStudyIds.value.filter(
      (id) => id !== deleteTarget.value!.id
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    alert('Failed to delete study');
  } finally {
    showDeleteConfirm.value = false;
    deleteTarget.value = null;
  }
}

function truncate(text: string | null | undefined, length: number): string {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '…' : text;
}

async function handleDialogOpen(val: boolean) {
  if (val) {
    await studyStore.fetchAllStudies();
    page.value = 1;
  }
}

function resetAndOpenModal() {
  editStudy.value = undefined;
  showCreateStudyModal.value = true;
}

async function onStudySaved(newStudy?: Study) {
  editStudy.value = undefined;
  await studyStore.fetchAllStudies();
  page.value = 1;

  if (newStudy?.id) {
    const newSelection = [...internalSelectedStudyIds.value, newStudy.id];
    internalSelectedStudyIds.value = newSelection;

    emit('update:selectedStudies', newSelection);
    emit('saved', newStudy);
  }
}

watch(localDialog, handleDialogOpen, { immediate: true });
</script>

<template>
  <v-dialog v-model="localDialog" max-width="900px">
    <PickerFrame
      title="Select studies"
      :subtitle="`${filteredStudies.length} available · ${internalSelectedStudyIds.length} selected`"
      icon="mdi-flask-outline"
      :selected="internalSelectedStudyIds.length"
      @close="localDialog = false"
    >
      <template #toolbar>
        <v-text-field
          v-model="searchQuery"
          placeholder="Search studies..."
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
        />
        <v-btn
          icon
          variant="tonal"
          :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
          @click="toggleSortOrder"
        >
          <v-icon>{{ sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending' }}</v-icon>
        </v-btn>
      </template>

      <v-row v-if="paginatedStudies.length > 0" dense>
        <v-col v-for="study in paginatedStudies" :key="study.id" cols="12" sm="6" md="4">
          <v-card
            :class="['pick-card', { 'pick-card--selected': isSelected(study.id) }]"
            tabindex="0"
            role="checkbox"
            :aria-checked="isSelected(study.id)"
            @click="toggleSelection(study.id)"
            @keydown.enter.prevent="toggleSelection(study.id)"
            @keydown.space.prevent="toggleSelection(study.id)"
          >
            <v-icon
              v-if="isSelected(study.id)"
              class="pick-check"
              color="primary"
              size="24"
              icon="mdi-check-circle"
            />
            <div class="pick-title">{{ study.name }}</div>
            <div class="pick-text">{{ truncate(study.description, 100) }}</div>
            <div class="pick-foot">
              <span>{{
                study.start_date ? new Date(study.start_date).toLocaleDateString() : ''
              }}</span>
              <span class="pick-tools">
                <v-btn
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  color="grey-darken-1"
                  aria-label="Edit study"
                  @click.stop="onEditStudy(study)"
                />
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  size="small"
                  color="grey-darken-1"
                  aria-label="Delete study"
                  @click.stop="onDeleteStudy(study)"
                />
              </span>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-alert v-else type="info" variant="tonal" class="mt-4">
        No studies found matching your search
      </v-alert>

      <v-pagination
        v-if="filteredStudies.length > itemsPerPage"
        v-model="page"
        :length="Math.ceil(filteredStudies.length / itemsPerPage)"
        class="mt-4"
        total-visible="5"
      />

      <template #actions>
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="resetAndOpenModal">
          Add study
        </v-btn>
        <v-btn
          variant="text"
          :disabled="internalSelectedStudyIds.length === 0"
          @click="internalSelectedStudyIds = []"
        >
          Clear selection
        </v-btn>
      </template>
    </PickerFrame>

    <CreateStudyModal
      v-model="showCreateStudyModal"
      :study="
        editStudy
          ? {
              id: editStudy.id,
              name: editStudy.name,
              description: editStudy.description || null,
              start_date: editStudy.start_date || '',
              end_date: editStudy.end_date || null,
            }
          : undefined
      "
      @saved="onStudySaved"
    />

    <v-dialog v-model="showDeleteConfirm" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Confirm deletion</v-card-title>
        <v-card-text>
          Are you sure you want to delete
          <strong>{{ deleteTarget?.name }}</strong
          >? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>
