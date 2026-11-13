<script setup lang="ts">
import PickerFrame from '@/components/modals/PickerFrame.vue';
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

// Internal selected references — number[]
const internalSelectedReferences = ref<number[]>([]);

// 🔒 convert objects to ids list
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
    <PickerFrame
      title="Select references"
      :subtitle="`${filteredReferences.length} shown · ${internalSelectedReferences.length} selected`"
      icon="mdi-book-open-page-variant-outline"
      :selected="internalSelectedReferences.length"
      @close="localDialog = false"
    >
      <template #toolbar>
        <v-text-field
          v-model="searchQuery"
          placeholder="Search references..."
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
        />
      </template>

      <v-row v-if="filteredReferences.length > 0" dense>
        <v-col v-for="ref in filteredReferences" :key="ref.id" cols="12" sm="6" md="4">
          <v-card
            :class="[
              'pick-card',
              { 'pick-card--selected': internalSelectedReferences.includes(ref.id) },
            ]"
            tabindex="0"
            role="checkbox"
            :aria-checked="internalSelectedReferences.includes(ref.id)"
            @click="toggleSelection(ref.id)"
            @keydown.enter.prevent="toggleSelection(ref.id)"
            @keydown.space.prevent="toggleSelection(ref.id)"
          >
            <v-icon
              v-if="internalSelectedReferences.includes(ref.id)"
              class="pick-check"
              color="primary"
              size="24"
              icon="mdi-check-circle"
            />
            <div class="pick-title d-flex align-center">
              <v-btn
                variant="text"
                size="x-small"
                density="comfortable"
                :icon="
                  favoriteStore.isFavorite('reference', ref.id ?? -1)
                    ? 'mdi-star'
                    : 'mdi-star-outline'
                "
                :color="favoriteStore.isFavorite('reference', ref.id ?? -1) ? 'warning' : 'grey'"
                title="Toggle favorite"
                aria-label="Toggle favorite"
                class="me-1"
                @click.stop="ref.id && toggleFavorite(ref.id)"
              />
              <span class="text-truncate">{{ ref.name }}</span>
            </div>
            <div class="pick-text" :title="ref.description || ''">
              {{ truncate(ref.description || '') }}
            </div>
            <div class="pick-foot">
              <v-chip size="small" label :color="ref.status === 'validated' ? 'green' : 'grey'">
                {{ ref.status || '—' }}
              </v-chip>
              <span class="pick-tools">
                <v-btn
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  color="grey-darken-1"
                  title="Edit reference"
                  aria-label="Edit reference"
                  @click.stop="onEditReference(ref)"
                />
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  size="small"
                  color="grey-darken-1"
                  title="Delete reference"
                  aria-label="Delete reference"
                  @click.stop="onDeleteReference(ref)"
                />
              </span>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-alert v-else type="info" variant="tonal" class="mt-4">
        No references found matching your search
      </v-alert>

      <template #actions>
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openCreateReference">
          Add reference
        </v-btn>
      </template>
    </PickerFrame>

    <!-- Create/Edit Reference Modal -->
    <CreateReferenceModal
      v-model="showCreateReferenceModal"
      :reference="editReference"
      @saved="onReferenceSaved"
    />
  </v-dialog>
</template>
