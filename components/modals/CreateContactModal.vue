<script setup lang="ts">
import { ref, watch } from 'vue';
import { useContactStore, type Contact } from '@/stores/contact';

import countriesList from '@/data/countries';

const props = defineProps<{
  modelValue: boolean;
  contact?: Contact | undefined;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'saved', contact: Contact): void;
}>();

const contactStore = useContactStore();

const formRef = ref<any>(null); // form validation ref

const formData = ref({
  id: props.contact?.id as number | undefined,
  first_name: props.contact?.first_name ?? '',
  last_name: props.contact?.last_name ?? '',
  email: props.contact?.email ?? '',
  phone: props.contact?.phone ?? '',
  unit: (props.contact as any)?.unit ?? '',
  institution: (props.contact as any)?.institution ?? '',
  address: (props.contact as any)?.address ?? '',
  country: (props.contact as any)?.country ?? '',
  status: (props.contact as any)?.status ?? 'draft',
});

const snackbar = ref({ show: false, message: '' });

// --- Validation rules (email required + format) ---
const emailRequired = (v: string) => (!!v && v.trim().length > 0) || 'Email is required';
const emailFormat = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim()) || 'Invalid email format';

function resetForm() {
  formData.value = {
    id: undefined,
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    unit: '',
    institution: '',
    address: '',
    country: '',
    status: 'draft',
  };
}

watch(
  () => props.contact,
  (c) => {
    if (c) {
      formData.value = {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email ?? '',
        phone: c.phone ?? '',
        unit: (c as any).unit ?? '',
        institution: (c as any).institution ?? '',
        address: (c as any).address ?? '',
        country: (c as any).country ?? '',
        status: (c as any).status ?? 'draft',
      };
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

async function saveContact() {
  // validate form: email required + format
  const valid = await formRef.value?.validate?.();
  if (!valid) {
    snackbar.value = {
      show: true,
      message: 'Please fix validation errors (email required / format).',
    };
    return;
  }

  if (
    !formData.value.first_name.trim() &&
    !formData.value.last_name.trim() &&
    !formData.value.email.trim()
  ) {
    // fallback guard, but primary required field is email
    snackbar.value = { show: true, message: 'You must provide at least an email.' };
    return;
  }

  try {
    const payload = {
      first_name: formData.value.first_name ?? '',
      last_name: formData.value.last_name ?? '',
      email: formData.value.email ?? '',
      phone: formData.value.phone ?? '',
      unit: formData.value.unit ?? '',
      institution: formData.value.institution ?? '',
      address: formData.value.address ?? '',
      country: formData.value.country ?? '',
      status: formData.value.status ?? 'draft',
    };

    let saved: Contact;
    if (formData.value.id) {
      saved = await contactStore.updateContact(formData.value.id, payload);
    } else {
      saved = await contactStore.createContact(payload);
    }

    emit('saved', saved);
    emit('update:modelValue', false);
    resetForm();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    snackbar.value = { show: true, message: 'Error saving contact.' };
  }
}
</script>

<template>
  <v-dialog
    :model-value="props.modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
    max-width="600"
  >
    <v-card>
      <v-card-title>{{ formData.id ? 'Edit Contact' : 'Create Contact' }}</v-card-title>

      <v-card-text>
        <v-form ref="formRef" lazy-validation>
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field v-model="formData.first_name" label="First name" outlined />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="formData.last_name" label="Last name" outlined />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="formData.email"
                label="Email *"
                outlined
                type="email"
                :rules="[emailRequired, emailFormat]"
                required
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="formData.phone" label="Phone" outlined />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="formData.unit" label="Unit" outlined />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="formData.institution" label="Institution" outlined />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="formData.address" label="Address" outlined />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="formData.country"
                :items="countriesList"
                label="Country"
                item-title="label"
                item-value="value"
                clearable
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="saveContact">{{ formData.id ? 'Update' : 'Save' }}</v-btn>
        <v-btn text @click="emit('update:modelValue', false)">Cancel</v-btn>
      </v-card-actions>

      <v-snackbar v-model="snackbar.show" :timeout="3000" color="error" top>
        {{ snackbar.message }}
        <template #actions>
          <v-btn text @click="snackbar.show = false">Close</v-btn>
        </template>
      </v-snackbar>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}
</style>
