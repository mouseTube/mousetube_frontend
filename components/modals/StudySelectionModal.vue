<script setup lang="ts">
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
  editStudy.value = { ...study }; // clone pour éviter mutation directe
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
    // retirer de la sélection si nécessaire
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

// Utilitaires
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
  editStudy.value = undefined; // reset le formulaire
  showCreateStudyModal.value = true;
}

watch(localDialog, handleDialogOpen, { immediate: true });
</script>

<template>
  <v-dialog v-model="localDialog" max-width="900px">
    <v-card>
      <v-card-title class="d-flex align-center">
        <span>Select Studies</span>
        <v-spacer />
        <v-text-field
          v-model="searchQuery"
          placeholder="Search studies..."
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          class="ml-4"
          style="max-width: 300px"
        />
        <v-btn
          icon
          class="ml-2"
          :title="sortOrder === 'asc' ? 'Ascending' : 'Descending'"
          @click="toggleSortOrder"
        >
          <v-icon>{{ sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending' }}</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-row v-if="paginatedStudies.length > 0" dense>
          <v-col v-for="study in paginatedStudies" :key="study.id" cols="12" sm="6" md="4">
            <v-card
              class="study-card"
              :class="{ selected: isSelected(study.id) }"
              @click="toggleSelection(study.id)"
            >
              <!-- Icône de sélection -->
              <v-icon v-if="isSelected(study.id)" class="check-icon" color="primary" size="28">
                mdi-check-circle
              </v-icon>

              <v-card-title>{{ study.name }}</v-card-title>
              <v-card-text>
                {{ truncate(study.description, 100) }}
              </v-card-text>

              <v-spacer />

              <v-card-actions class="justify-space-between">
                <!-- Start date -->
                <span class="text-caption text-medium-emphasis">
                  {{ study.start_date ? new Date(study.start_date).toLocaleDateString() : '' }}
                </span>

                <!-- Boutons -->
                <div class="d-flex gap-2">
                  <v-icon class="hover-icon" color="primary" @click.stop="onEditStudy(study)">
                    mdi-pencil
                  </v-icon>
                  <v-icon class="hover-icon" color="error" @click.stop="onDeleteStudy(study)">
                    mdi-delete
                  </v-icon>
                </div>
              </v-card-actions>
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
      </v-card-text>

      <v-card-actions class="justify-space-between">
        <v-btn color="primary" variant="flat" @click="resetAndOpenModal">
          <v-icon start>mdi-plus</v-icon> Add Study
        </v-btn>
        <v-btn
          color="primary"
          variant="outlined"
          :disabled="internalSelectedStudyIds.length === 0"
          @click="internalSelectedStudyIds = []"
        >
          <v-icon start>mdi-close</v-icon> Clear All
        </v-btn>
        <v-btn color="primary" variant="flat" @click="localDialog = false">Close</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Modale création/édition -->
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
      @saved="editStudy = undefined"
    />

    <!-- Confirmation suppression -->
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
          <v-btn text @click="showDeleteConfirm = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.h-100 {
  height: 100%;
}
.border-primary {
  border: 2px solid rgb(var(--v-theme-primary));
}
.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
}
.hover-icon:hover {
  color: #000 !important;
  transform: scale(1.1);
  transition:
    transform 0.2s,
    color 0.2s;
}
.study-card {
  height: 100%;
  border: 1px solid transparent;
  transition:
    border 0.2s,
    box-shadow 0.2s;
}

.study-card.selected {
  border: 2px solid rgb(var(--v-theme-primary));
  box-shadow: 0 0 8px rgba(var(--v-theme-primary), 0.5);
}

.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
}

.hover-icon {
  cursor: pointer;
  transition:
    transform 0.2s,
    color 0.2s;
}

.hover-icon:hover {
  transform: scale(1.2);
  color: #000 !important;
}
</style>
