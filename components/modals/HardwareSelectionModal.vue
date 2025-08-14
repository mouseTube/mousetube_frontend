<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useHardwareStore, type Hardware } from '@/stores/hardware';
import HardwareModal from '@/components/modals/HardwareModal.vue';

const props = defineProps<{
  modelValue: boolean;
  hardwareType: Hardware['type'];
  selectedHardwareIds: number[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'update:selectedHardwareIds', value: number[]): void;
}>();

// état général
const isOpen = ref(props.modelValue);
const search = ref('');
const localSelected = ref<number[]>([...props.selectedHardwareIds]);

// store
const hardwareStore = useHardwareStore();

// état modales
const showCreateModal = ref(false);
const showEditModal = ref(false);
const editingHardwareId = ref<number | null>(null);

// pagination
const currentPage = ref(1);
const itemsPerPage = 9;

// fetch initial
onMounted(() => {
  if (!hardwareStore.hardwares.length) {
    hardwareStore.fetchAllHardware();
  }
});

// filtrage
const filteredHardware = computed(() =>
  hardwareStore.hardwares.filter(
    (hw) =>
      hw.type === props.hardwareType && hw.name.toLowerCase().includes(search.value.toLowerCase())
  )
);

// pagination
const paginatedHardware = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredHardware.value.slice(start, start + itemsPerPage);
});

function confirmSelection() {
  emit('update:selectedHardwareIds', localSelected.value);
  isOpen.value = false;
}

function toggleSelect(id?: number) {
  if (typeof id !== 'number') return;
  if (localSelected.value.includes(id)) {
    localSelected.value = localSelected.value.filter((x) => x !== id);
  } else {
    localSelected.value.push(id);
  }
}

function openCreateModal() {
  editingHardwareId.value = null;
  showCreateModal.value = true;
}

function editHardware(hw: Hardware) {
  editingHardwareId.value = hw.id ?? null;
  showEditModal.value = true;
}

function deleteHardware(id?: number) {
  if (typeof id !== 'number') return;
  if (!confirm('Are you sure you want to delete this hardware?')) return;

  hardwareStore.deleteHardware(id).then(() => {
    // recalculer la pagination si nécessaire
    const totalPages = Math.ceil(filteredHardware.value.length / itemsPerPage);
    if (currentPage.value > totalPages) {
      currentPage.value = totalPages || 1;
    }
  });
}

// synchronisation props <-> local
watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val;
  }
);

watch(isOpen, (val) => {
  emit('update:modelValue', val);
});

watch(
  () => props.selectedHardwareIds,
  (val) => {
    localSelected.value = [...val];
  }
);

function truncate(text: string, length = 100) {
  if (!text) return '—';
  return text.length > length ? text.slice(0, length) + '…' : text;
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="1000px">
    <v-card>
      <!-- header -->
      <v-card-title>
        Select {{ hardwareType }}s
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="flat" @click="openCreateModal">
          <v-icon start>mdi-plus</v-icon> New
        </v-btn>
        <v-btn icon @click="isOpen = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <!-- body -->
      <v-card-text>
        <v-text-field
          v-model="search"
          label="Search hardware"
          variant="outlined"
          density="compact"
          hide-details
        ></v-text-field>

        <v-row class="mt-4" dense>
          <v-col v-for="hw in paginatedHardware" :key="hw.id" cols="12" sm="6" md="4">
            <v-card
              density="compact"
              style="min-height: 140px"
              :elevation="localSelected.includes(hw.id!) ? 10 : 2"
              :class="{ 'selected-card': localSelected.includes(hw.id!) }"
              class="cursor-pointer card-fixed-border"
              @click="toggleSelect(hw.id)"
            >
              <v-card-title class="text-subtitle-2">{{ hw.name }}</v-card-title>
              <v-card-subtitle class="text-caption">{{ hw.type }}</v-card-subtitle>
              <v-card-text class="text-body-2">
                {{ truncate(hw.description || '') }}
              </v-card-text>
              <v-card-actions>
                <v-btn icon size="small" @click.stop="editHardware(hw)">
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <v-btn icon size="small" color="error" @click.stop="deleteHardware(hw.id)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- pagination -->
        <v-pagination
          v-model="currentPage"
          :length="Math.ceil(filteredHardware.length / itemsPerPage)"
          total-visible="5"
          class="mt-4"
        />
      </v-card-text>

      <!-- footer -->
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="flat" @click="confirmSelection">Confirm</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Modal création -->
    <HardwareModal
      v-model="showCreateModal"
      :hardware-id="null"
      :hardware-type="hardwareType"
      @saved="hardwareStore.fetchAllHardware()"
    />

    <!-- Modal édition -->
    <HardwareModal
      v-model="showEditModal"
      :hardware-id="editingHardwareId"
      :hardware-type="hardwareType"
      @saved="hardwareStore.fetchAllHardware()"
    />
  </v-dialog>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.card-fixed-border {
  border: 2px solid transparent;
}
.selected-card {
  border: 2px solid red;
}
</style>
