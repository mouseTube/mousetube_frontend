<script setup lang="ts">
import PickerFrame from '@/components/modals/PickerFrame.vue';
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
    <PickerFrame
      title="Select contacts"
      :subtitle="`${filteredContacts.length} shown · ${internalSelectedContacts.length} selected`"
      icon="mdi-account-multiple-outline"
      :selected="internalSelectedContacts.length"
      @close="localDialog = false"
    >
      <template #toolbar>
        <v-text-field
          v-model="searchQuery"
          placeholder="Search contacts..."
          density="comfortable"
          variant="outlined"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
        />
      </template>

      <v-row v-if="filteredContacts.length > 0" dense>
        <v-col v-for="c in filteredContacts" :key="c.id" cols="12" sm="6" md="4">
          <v-card
            :class="[
              'pick-card',
              { 'pick-card--selected': internalSelectedContacts.includes(c.id) },
            ]"
            tabindex="0"
            role="checkbox"
            :aria-checked="internalSelectedContacts.includes(c.id)"
            @click="toggleSelection(c.id)"
            @keydown.enter.prevent="toggleSelection(c.id)"
            @keydown.space.prevent="toggleSelection(c.id)"
          >
            <v-icon
              v-if="internalSelectedContacts.includes(c.id)"
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
                  favoriteStore.isFavorite?.('contact', c.id ?? -1)
                    ? 'mdi-star'
                    : 'mdi-star-outline'
                "
                :color="favoriteStore.isFavorite?.('contact', c.id ?? -1) ? 'warning' : 'grey'"
                title="Toggle favorite"
                aria-label="Toggle favorite"
                class="me-1"
                @click.stop="c.id && toggleFavorite(c.id)"
              />
              <span class="text-truncate">{{ c.first_name }} {{ c.last_name }}</span>
            </div>
            <div class="pick-text">
              {{ c.email || '—' }}<br /><small>{{ c.institution || '' }}</small>
            </div>
            <div class="pick-foot">
              <v-chip size="small" label :color="c.status === 'validated' ? 'green' : 'grey'">
                {{ c.status || '—' }}
              </v-chip>
              <span class="pick-tools">
                <v-btn
                  icon="mdi-pencil-outline"
                  variant="text"
                  size="small"
                  color="grey-darken-1"
                  title="Edit contact"
                  aria-label="Edit contact"
                  @click.stop="onEditContact(c)"
                />
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  size="small"
                  color="grey-darken-1"
                  title="Delete contact"
                  aria-label="Delete contact"
                  @click.stop="onDeleteContact(c)"
                />
              </span>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-alert v-else type="info" variant="tonal" class="mt-4">
        No contacts found matching your search
      </v-alert>

      <template #actions>
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openCreateContact">
          Add contact
        </v-btn>
      </template>
    </PickerFrame>

    <CreateContactModal
      v-model="showCreateContactModal"
      :contact="editContact"
      @saved="onContactSaved"
    />
  </v-dialog>
</template>
