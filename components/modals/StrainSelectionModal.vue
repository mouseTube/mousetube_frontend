<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import debounce from 'lodash-es/debounce';
import { useStrainStore, type Strain } from '@/stores/strain';
import { useFavoriteStore } from '@/stores/favorite';
import CreateStrainModal from '@/components/modals/CreateStrainModal.vue';

const props = defineProps<{ show: boolean }>();
const emit = defineEmits(['update:show', 'selected']);

const strainStore = useStrainStore();
const favoriteStore = useFavoriteStore();

const strains = ref<Strain[]>([]);
const page = ref(1);
const itemsPerPage = 10;
const search = ref('');

const count = ref(0);
const next = ref<string | null>(null);
const previous = ref<string | null>(null);

const truncateLengths: Record<string, number> = {
  name: 20,
  background: 30,
  bibliography: 40,
};

const statusColors: Record<string, string> = {
  draft: 'blue',
  'waiting for validation': 'grey',
  validated: 'green',
};

const tableHeaders = [
  { title: 'Name', value: 'name' },
  { title: 'Species', value: 'species.name' },
  { title: 'Background', value: 'background' },
  { title: 'Bibliography', value: 'bibliography' },
  { title: 'Status', value: 'status' },
  { title: 'Actions', value: 'actions', sortable: false },
];

const showCreateModal = ref(false);
const editingStrain = ref<Strain | null>(null);
const showDeleteDialog = ref(false);
const strainToDelete = ref<Strain | null>(null);

const totalPages = computed(() => Math.ceil(count.value / itemsPerPage));

const fetchStrains = debounce(async () => {
  try {
    const res = await strainStore.fetchStrainsByPage({
      page: page.value,
      page_size: itemsPerPage,
      search: search.value || undefined,
    });
    strains.value = res.results;
    count.value = res.count;
    next.value = res.next;
    previous.value = res.previous;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
}, 300);

watch(
  [page, search],
  () => {
    if (page.value !== 1 && search.value) {
      page.value = 1;
      return;
    }
    fetchStrains();
  },
  { immediate: true }
);

onMounted(async () => {
  if (favoriteStore.isEmpty()) {
    await favoriteStore.fetchAllFavorites();
  }
});

function isEditable(item: Strain) {
  return item.status === 'draft';
}

function editStrain(item: Strain) {
  editingStrain.value = item;
  showCreateModal.value = true;
}

function openCreateModal() {
  editingStrain.value = null;
  showCreateModal.value = true;
}

function confirmDeleteStrain(item: Strain) {
  strainToDelete.value = item;
  showDeleteDialog.value = true;
}

async function deleteStrain() {
  if (!strainToDelete.value) return;
  const id = strainToDelete.value.id;

  await strainStore.deleteStrain(id);
  strains.value = strains.value.filter((s) => s.id !== id);

  showDeleteDialog.value = false;
  strainToDelete.value = null;

  if (strains.value.length === 0 && page.value > 1) {
    page.value -= 1;
    await fetchStrains();
  }
}

function onCreatedOrEdited(updated: Strain) {
  const index = strains.value.findIndex((s) => s.id === updated.id);
  if (index !== -1) {
    strains.value[index] = updated;
  } else {
    strains.value.unshift(updated);
  }
  showCreateModal.value = false;
  editingStrain.value = null;
}

function selectStrain(item: Strain) {
  emit('selected', item);
  emit('update:show', false);
}
</script>

<template>
  <v-dialog v-model="props.show" max-width="1600px" @click:outside="emit('update:show', false)">
    <v-card class="pa-3" style="max-height: 80vh; overflow-y: auto">
      <!-- Title + Search -->
      <v-card-title class="d-flex align-center justify-space-between">
        <span class="text-h6 font-weight-bold">Strains</span>
        <v-text-field
          v-model="search"
          label="Search"
          density="compact"
          hide-details
          style="max-width: 250px"
        />
      </v-card-title>

      <v-card-text>
        <!-- Data Table -->
        <v-data-table
          :items="strains"
          :headers="tableHeaders"
          hide-default-footer
          disable-pagination
          disable-sort
          hover
          class="cursor-pointer"
          @click:row="(_: any, { item }: { item: Strain }) => selectStrain(item)"
        >
          <!-- Name + Favorite -->
          <template #item.name="{ item }">
            <div class="d-flex align-center">
              <v-btn
                icon
                variant="text"
                size="small"
                :color="favoriteStore.isFavorite('strain', item.id) ? 'yellow' : 'grey'"
                @click.stop="favoriteStore.toggleFavorite('strain', item.id)"
                class="me-1"
              >
                <v-icon>
                  {{
                    favoriteStore.isFavorite('strain', item.id) ? 'mdi-star' : 'mdi-star-outline'
                  }}
                </v-icon>
              </v-btn>
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <span v-bind="props">
                    {{
                      item.name.length > truncateLengths.name
                        ? item.name.slice(0, truncateLengths.name) + '…'
                        : item.name
                    }}
                  </span>
                </template>
                <span>{{ item.name }}</span>
              </v-tooltip>
            </div>
          </template>

          <!-- Background -->
          <template #item.background="{ item }">
            <v-tooltip location="top" v-if="item.background">
              <template #activator="{ props }">
                <span v-bind="props">
                  {{
                    item.background.length > truncateLengths.background
                      ? item.background.slice(0, truncateLengths.background) + '…'
                      : item.background
                  }}
                </span>
              </template>
              <span>{{ item.background }}</span>
            </v-tooltip>
          </template>

          <!-- Bibliography -->
          <template #item.bibliography="{ item }">
            <v-tooltip location="top" v-if="item.bibliography">
              <template #activator="{ props }">
                <span v-bind="props">
                  {{
                    item.bibliography.length > truncateLengths.bibliography
                      ? item.bibliography.slice(0, truncateLengths.bibliography) + '…'
                      : item.bibliography
                  }}
                </span>
              </template>
              <span>{{ item.bibliography }}</span>
            </v-tooltip>
          </template>

          <!-- Status -->
          <template #item.status="{ item }">
            <v-chip :color="statusColors[item.status ?? ''] || 'primary'" size="small" label>
              {{ item.status ?? 'Unknown' }}
            </v-chip>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <v-btn
              v-if="isEditable(item)"
              icon
              color="primary"
              size="small"
              variant="text"
              @click.stop="editStrain(item)"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              v-if="isEditable(item)"
              icon
              color="error"
              size="small"
              variant="text"
              @click.stop="confirmDeleteStrain(item)"
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </template>
        </v-data-table>

        <!-- Pagination -->
        <div class="d-flex justify-center mt-2">
          <v-pagination v-model="page" :length="totalPages" :total-visible="7" color="primary" />
        </div>
      </v-card-text>

      <v-card-actions class="justify-space-between">
        <v-btn color="primary" variant="flat" @click="openCreateModal">
          <v-icon start>mdi-plus</v-icon> Create
        </v-btn>
        <v-btn color="primary" variant="flat" @click="emit('update:show', false)">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Création / édition -->
  <CreateStrainModal
    v-model:show="showCreateModal"
    :strain="editingStrain"
    @created="onCreatedOrEdited"
  />

  <!-- Confirmation suppression -->
  <v-dialog v-model="showDeleteDialog" max-width="400px">
    <v-card>
      <v-card-title>Confirm Deletion</v-card-title>
      <v-card-text>
        Are you sure you want to delete "<strong>{{ strainToDelete?.name }}</strong
        >"?
      </v-card-text>
      <v-card-actions>
        <v-btn text @click="showDeleteDialog = false">Cancel</v-btn>
        <v-btn color="error" @click="deleteStrain">Delete</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.scrollable-content {
  max-height: calc(100vh - 160px);
  overflow-y: auto;
}

.v-card-actions {
  position: sticky;
  bottom: 0;
  background: white;
  z-index: 1;
  padding: 12px;
}
</style>
