<script setup lang="ts">
import { ref, computed, watch, onMounted, type Ref } from 'vue';
import { useReferenceStore, type Reference } from '~/stores/reference';
import CreateReferenceModal from '@/components/modals/CreateReferenceModal.vue';
import { useFavoriteStore } from '~/stores/favorite';

const props = defineProps<{
  modelValue: boolean;
  selectedReferences?: (number | { id: number })[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:selectedReferences', value: number[]): void;
  (e: 'saved', ref: Reference): void;
}>();

const localDialog = computed({
  get: () => props.modelValue,
  set: (val: boolean) => emit('update:modelValue', val),
});

// Internal selected references — tjs number[]
const internalSelectedReferences = ref<number[]>([]);

// 🔒 Garde-fou : convertit toute entrée en liste d’IDs
function normalizeToIds(val: any): number[] {
  if (!val) return [];
  if (!Array.isArray(val)) return [];
  return val
    .map((v) => (typeof v === 'number' ? v : v?.id))
    .filter((v) => typeof v === 'number' && !isNaN(v));
}

// ⚡ Initialise internalSelectedReferences
internalSelectedReferences.value = normalizeToIds(props.selectedReferences);

// 🔄 When internal change → send to parent
watch(
  internalSelectedReferences,
  (val, oldVal) => {
    const normalized = normalizeToIds(val);
    if (JSON.stringify(normalized) !== JSON.stringify(normalizeToIds(props.selectedReferences))) {
      emit('update:selectedReferences', [...normalized]);
    }
  },
  { deep: true }
);

// 🔄 When props change → update internal
watch(
  () => props.selectedReferences,
  (val) => {
    const normalized = normalizeToIds(val);
    if (JSON.stringify(normalized) !== JSON.stringify(internalSelectedReferences.value)) {
      internalSelectedReferences.value = [...normalized];
    }
  },
  { immediate: true }
);

// Stores
const referenceStore = useReferenceStore();
const favoriteStore = useFavoriteStore();

// Recherche
const searchQuery = ref('');

// Modal create edit
const showCreateReferenceModal = ref(false);
const editReference: Ref<Reference | undefined> = ref(undefined);

// Fetch references on mount
onMounted(async () => {
  if (referenceStore.references.results.length === 0) {
    await referenceStore.fetchAllReferences();
  }
});

// Computed filtered references
const filteredReferences = computed(() => {
  const q = searchQuery.value.toLowerCase();
  return referenceStore.references.results
    .filter((r) => r.name.toLowerCase().includes(q))
    .sort((a, b) => {
      const aFav = favoriteStore.isFavorite('reference', a.id ?? -1) ? 1 : 0;
      const bFav = favoriteStore.isFavorite('reference', b.id ?? -1) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return a.name.localeCompare(b.name);
    });
});

// functions
function toggleSelection(id: number) {
  const index = internalSelectedReferences.value.indexOf(id);
  if (index === -1) internalSelectedReferences.value.push(id);
  else internalSelectedReferences.value.splice(index, 1);
}

function openCreateReference() {
  editReference.value = undefined;
  showCreateReferenceModal.value = true;
}

function onEditReference(ref: Reference) {
  editReference.value = { ...ref };
  showCreateReferenceModal.value = true;
}

async function onDeleteReference(ref: Reference) {
  if (!confirm(`Are you sure you want to delete "${ref.name}"?`)) return;
  try {
    await referenceStore.deleteReference(ref.id);
    internalSelectedReferences.value = internalSelectedReferences.value.filter((i) => i !== ref.id);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    alert('Failed to delete reference');
  }
}

function truncate(text: string, length = 80) {
  if (!text) return '—';
  return text.length > length ? text.slice(0, length) + '…' : text;
}

async function onReferenceSaved(ref: Reference) {
  referenceStore.addOrUpdateReference(ref);
  if (!internalSelectedReferences.value.includes(ref.id)) {
    internalSelectedReferences.value.push(ref.id);
  }
  showCreateReferenceModal.value = false;
  emit('saved', ref);
}

async function toggleFavorite(refId: number) {
  try {
    await favoriteStore.toggleFavorite('reference', refId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to toggle favorite:', err);
  }
}
</script>

<template>
  <v-dialog v-model="localDialog" max-width="900px">
    <v-card class="pa-3">
      <!-- Header: Title + Search -->
      <v-card-title class="d-flex align-center font-weight-bold">
        <span>Select References</span>
        <v-spacer />
        <v-text-field
          v-model="searchQuery"
          placeholder="Search references..."
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          class="ml-4"
          style="max-width: 300px"
        />
      </v-card-title>

      <!-- List references -->
      <v-card-text>
        <v-row v-if="filteredReferences.length > 0" dense>
          <v-col v-for="ref in filteredReferences" :key="ref.id" cols="12" sm="6" md="4">
            <v-card
              :elevation="internalSelectedReferences.includes(ref.id) ? 8 : 1"
              class="cursor-pointer h-100 d-flex flex-column justify-space-between position-relative"
              :class="{ 'border-primary': internalSelectedReferences.includes(ref.id) }"
              @click="toggleSelection(ref.id)"
            >
              <!-- Status chip -->
              <v-chip
                small
                :color="ref.status === 'validated' ? 'green' : 'grey'"
                text-color="white"
                class="position-absolute bottom-2 left-2"
              >
                {{ ref.status || '—' }}
              </v-chip>

              <!-- Check icon if selected -->
              <v-icon
                v-if="internalSelectedReferences.includes(ref.id)"
                color="primary"
                size="24"
                class="check-icon"
                >mdi-check-circle</v-icon
              >

              <div style="flex-grow: 1; padding: 16px">
                <!-- Title + favorite -->
                <div class="d-flex align-center mb-1">
                  <v-btn
                    variant="text"
                    size="small"
                    :icon="
                      favoriteStore.isFavorite('reference', ref.id ?? -1)
                        ? 'mdi-star'
                        : 'mdi-star-outline'
                    "
                    :color="
                      favoriteStore.isFavorite('reference', ref.id ?? -1) ? 'warning' : 'grey'
                    "
                    @click.stop="ref.id && toggleFavorite(ref.id)"
                    title="Toggle favorite"
                    style="min-width: 32px; margin: 0; padding: 0"
                  />
                  <div
                    class="text-h6 font-weight-medium ms-1"
                    style="
                      margin: 0;
                      max-width: calc(100% - 40px);
                      white-space: nowrap;
                      overflow: hidden;
                      text-overflow: ellipsis;
                    "
                  >
                    {{ ref.name }}
                  </div>
                </div>

                <!-- Description -->
                <v-card-text class="pa-0 mt-2 text-body-2">
                  <v-tooltip location="top">
                    <template #activator="{ props }">
                      <div
                        v-bind="props"
                        style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis"
                        class="ps-4 pe-4 pb-4"
                      >
                        {{ truncate(ref.description || '') }}
                      </div>
                    </template>
                    <span style="max-width: 300px; white-space: normal; display: block">
                      {{ ref.description }}
                    </span>
                  </v-tooltip>
                </v-card-text>
              </div>

              <!-- Actions edit/delete -->
              <v-card-actions class="justify-end pt-0">
                <v-icon
                  color="primary"
                  @click.stop="onEditReference(ref)"
                  title="Edit reference"
                  class="mr-2 cursor-pointer hover-icon"
                  >mdi-pencil</v-icon
                >
                <v-icon
                  color="error"
                  @click.stop="onDeleteReference(ref)"
                  title="Delete reference"
                  class="cursor-pointer hover-icon"
                  >mdi-delete</v-icon
                >
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-alert v-else type="info" variant="tonal" class="mt-4">
          No references found matching your search
        </v-alert>
      </v-card-text>

      <!-- Footer actions -->
      <v-card-actions class="justify-space-between">
        <v-btn color="primary" variant="flat" @click="openCreateReference">
          <v-icon start>mdi-plus</v-icon> Add Reference
        </v-btn>
        <div>
          <v-btn text @click="localDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="localDialog = false" class="ml-2"
            >Done</v-btn
          >
        </div>
      </v-card-actions>
    </v-card>

    <!-- Create/Edit Reference Modal -->
    <CreateReferenceModal
      v-model="showCreateReferenceModal"
      :reference="editReference"
      @saved="onReferenceSaved"
    />
  </v-dialog>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.h-100 {
  height: 100%;
}
.hover-icon:hover {
  color: #000 !important;
  transform: scale(1.1);
  transition:
    transform 0.2s,
    color 0.2s;
}
.v-card {
  border: 2px solid transparent;
  border-radius: 8px;
  position: relative;
}
.border-primary {
  border: 2px solid rgb(var(--v-theme-primary));
}
.check-icon {
  position: absolute;
  top: 8px;
  right: 8px;
}
.position-absolute {
  position: absolute;
}
.bottom-2 {
  bottom: 8px;
}
.left-2 {
  left: 8px;
}
</style>
