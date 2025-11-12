<script setup lang="ts">
import { ref, computed, watch, onMounted, type Ref } from 'vue';
import { useContactStore, type Contact } from '@/stores/contact';
import CreateContactModal from '@/components/modals/CreateContactModal.vue';
import { useFavoriteStore } from '@/stores/favorite';

const props = defineProps<{
  modelValue: boolean;
  selectedContacts?: (number | { id: number })[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'update:selectedContacts', v: number[]): void;
  (e: 'saved', contact: Contact): void;
}>();

const localDialog = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

// internal selected ids
const internalSelectedContacts = ref<number[]>([]);

function normalizeToIds(val: any): number[] {
  if (!val) return [];
  if (!Array.isArray(val)) return [];
  return val
    .map((v) => (typeof v === 'number' ? v : v?.id))
    .filter((v) => typeof v === 'number' && !isNaN(v));
}

// init
internalSelectedContacts.value = normalizeToIds(props.selectedContacts);

// emit on change
watch(
  internalSelectedContacts,
  (val) => {
    const normalized = normalizeToIds(val);
    if (JSON.stringify(normalized) !== JSON.stringify(normalizeToIds(props.selectedContacts))) {
      emit('update:selectedContacts', [...normalized]);
    }
  },
  { deep: true }
);

// sync from props
watch(
  () => props.selectedContacts,
  (val) => {
    const normalized = normalizeToIds(val);
    if (JSON.stringify(normalized) !== JSON.stringify(internalSelectedContacts.value)) {
      internalSelectedContacts.value = [...normalized];
    }
  },
  { immediate: true }
);

const contactStore = useContactStore();
const favoriteStore = useFavoriteStore();

const searchQuery = ref('');
const showCreateContactModal = ref(false);
const editContact: Ref<Contact | undefined> = ref(undefined);

onMounted(async () => {
  if (!contactStore.contacts || contactStore.contacts.length === 0) {
    await contactStore.fetchAllContacts();
  }
});

const filteredContacts = computed(() => {
  const q = searchQuery.value.toLowerCase();
  return (contactStore.contacts || [])
    .filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
    )
    .sort((a, b) => {
      const aFav = favoriteStore.isFavorite?.('contact', a.id ?? -1) ? 1 : 0;
      const bFav = favoriteStore.isFavorite?.('contact', b.id ?? -1) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`);
    });
});

function toggleSelection(id: number) {
  const i = internalSelectedContacts.value.indexOf(id);
  if (i === -1) internalSelectedContacts.value.push(id);
  else internalSelectedContacts.value.splice(i, 1);
}

function openCreateContact() {
  editContact.value = undefined;
  showCreateContactModal.value = true;
}

function onEditContact(c: Contact) {
  editContact.value = { ...c };
  showCreateContactModal.value = true;
}

async function onDeleteContact(c: Contact) {
  if (!confirm(`Are you sure you want to delete "${c.first_name} ${c.last_name}"?`)) return;
  try {
    await contactStore.deleteContact(c.id);
    internalSelectedContacts.value = internalSelectedContacts.value.filter((i) => i !== c.id);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    alert('Failed to delete contact');
  }
}

async function onContactSaved(c: Contact) {
  contactStore.addOrUpdateContact(c);
  if (!internalSelectedContacts.value.includes(c.id)) internalSelectedContacts.value.push(c.id);
  showCreateContactModal.value = false;
  emit('saved', c);
}

async function toggleFavorite(id: number) {
  try {
    await favoriteStore.toggleFavorite?.('contact', id);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to toggle favorite:', err);
  }
}
</script>

<template>
  <v-dialog v-model="localDialog" max-width="900px">
    <v-card class="pa-3">
      <v-card-title class="d-flex align-center font-weight-bold">
        <span>Select Contacts</span>
        <v-spacer />
        <v-text-field
          v-model="searchQuery"
          placeholder="Search contacts..."
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          class="ml-4"
          style="max-width: 300px"
        />
      </v-card-title>

      <v-card-text>
        <v-row v-if="filteredContacts.length > 0" dense>
          <v-col v-for="c in filteredContacts" :key="c.id" cols="12" sm="6" md="4">
            <v-card
              :elevation="internalSelectedContacts.includes(c.id) ? 8 : 1"
              class="cursor-pointer h-100 d-flex flex-column justify-space-between position-relative"
              :class="{ 'border-primary': internalSelectedContacts.includes(c.id) }"
              @click="toggleSelection(c.id)"
            >
              <v-chip
                small
                :color="c.status === 'validated' ? 'green' : 'grey'"
                text-color="white"
                class="position-absolute bottom-2 left-2"
              >
                {{ c.status || '—' }}
              </v-chip>

              <v-icon
                v-if="internalSelectedContacts.includes(c.id)"
                color="primary"
                size="24"
                class="check-icon"
                >mdi-check-circle</v-icon
              >

              <div style="flex-grow: 1; padding: 16px">
                <div class="d-flex align-center mb-1">
                  <v-btn
                    variant="text"
                    size="small"
                    :icon="
                      favoriteStore.isFavorite?.('contact', c.id ?? -1)
                        ? 'mdi-star'
                        : 'mdi-star-outline'
                    "
                    :color="favoriteStore.isFavorite?.('contact', c.id ?? -1) ? 'warning' : 'grey'"
                    @click.stop="c.id && toggleFavorite(c.id)"
                    title="Toggle favorite"
                    style="min-width: 32px; margin: 0; padding: 0"
                  />
                  <div class="text-h6 font-weight-medium ms-1" style="margin: 0">
                    {{ c.first_name }} {{ c.last_name }}
                  </div>
                </div>

                <v-card-text class="pa-0 mt-2 text-body-2">
                  <div class="ps-4 pe-4 pb-4">
                    {{ c.email || '—' }}
                    <div class="text-caption mt-1">{{ c.institution || '' }}</div>
                  </div>
                </v-card-text>
              </div>

              <v-card-actions class="justify-end pt-0">
                <v-icon
                  color="primary"
                  @click.stop="onEditContact(c)"
                  title="Edit contact"
                  class="mr-2 cursor-pointer hover-icon"
                  >mdi-pencil</v-icon
                >
                <v-icon
                  color="error"
                  @click.stop="onDeleteContact(c)"
                  title="Delete contact"
                  class="cursor-pointer hover-icon"
                  >mdi-delete</v-icon
                >
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-alert v-else type="info" variant="tonal" class="mt-4">
          No contacts found matching your search
        </v-alert>
      </v-card-text>

      <v-card-actions class="justify-space-between">
        <v-btn color="primary" variant="flat" @click="openCreateContact">
          <v-icon start>mdi-plus</v-icon> Add Contact
        </v-btn>
        <div>
          <v-btn text @click="localDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="localDialog = false" class="ml-2"
            >Done</v-btn
          >
        </div>
      </v-card-actions>
    </v-card>

    <CreateContactModal
      v-model="showCreateContactModal"
      :contact="editContact"
      @saved="onContactSaved"
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
  transform: scale(1.05);
  transition:
    transform 0.15s,
    color 0.15s;
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
