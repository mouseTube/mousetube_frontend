<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import axios from 'axios';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';
import { useAuth } from '~/composables/useAuth';

interface Repository {
  id: number;
  name: string;
  logo_url?: string;
}

interface FieldSchema {
  type: string;
  title?: string;
  format?: string;
  enum?: string[];
  readOnly?: boolean;
  default?: any;
  items?: FieldSchema & { properties?: Record<string, FieldSchema>; required?: string[] };
  properties?: Record<string, FieldSchema>;
  required?: string[];
}

interface JsonSchema {
  type: string;
  properties: Record<string, FieldSchema>;
}

const props = defineProps<{
  recordingSessionId: number;
  recordingSessionName: string;
  repository: Repository;
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'publishConfirmed', payload: any): void;
}>();

const apiBaseUrl = useApiBaseUrl();
const { token } = useAuth();
const schema = ref<JsonSchema | null>(null);
const payload = reactive<Record<string, any>>({});
const loading = ref(true);
const error = ref<string | null>(null);

function getAuthHeaders() {
  return token.value ? { headers: { Authorization: `Bearer ${token.value}` } } : {};
}

async function fetchSchemaAndPayload() {
  loading.value = true;
  error.value = null;

  try {
    const [schemaRes, payloadRes] = await Promise.all([
      axios.get(`${apiBaseUrl}/repository/${props.repository.id}/schema/`, getAuthHeaders()),
      axios.get(
        `${apiBaseUrl}/repository/${props.repository.id}/sessions/${props.recordingSessionId}/payload/`,
        getAuthHeaders()
      ),
    ]);

    const fetchedSchema = schemaRes.data as JsonSchema;
    const fetchedPayload = payloadRes.data as Record<string, any>;

    if (!fetchedSchema?.properties) throw new Error('Schema has no properties');

    schema.value = fetchedSchema;

    Object.keys(fetchedSchema.properties).forEach((key) => {
      const field = fetchedSchema.properties[key];
      if (key in fetchedPayload) payload[key] = fetchedPayload[key];
      else if ('default' in field) payload[key] = field.default;
      else if (field.type === 'array') payload[key] = [];
      else if (field.type === 'object') payload[key] = {};
      else payload[key] = '';
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('Error fetching schema or payload:', err);
    error.value = err.response?.data?.detail || 'Error loading schema/payload.';
  } finally {
    loading.value = false;
  }
}

function confirmPublish() {
  emit('publishConfirmed', { ...payload });
}

function closeModal() {
  emit('close');
}

watch(
  () => props.show,
  (val) => {
    if (val) fetchSchemaAndPayload();
  }
);

function isFieldReadOnly(field: FieldSchema) {
  return field.readOnly ?? false;
}
</script>

<template>
  <v-dialog v-model="props.show" max-width="900">
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex justify-space-between align-center">
        <div class="font-weight-bold">Share {{ props.recordingSessionName }}</div>
        <div class="d-flex align-center gap-2">
          <img
            v-if="props.repository.logo_url"
            :src="props.repository.logo_url"
            class="repo-logo"
          />
          <span>{{ props.repository.name }}</span>
        </div>
      </v-card-title>

      <v-divider />

      <!-- Body -->
      <v-card-text>
        <div v-if="loading" class="text-center py-4">
          <v-progress-circular indeterminate color="primary" />
        </div>
        <div v-else-if="error" class="text-red">{{ error }}</div>
        <div v-else>
          <v-form>
            <template v-for="(field, key) in schema?.properties ?? {}" :key="key">
              <!-- String normal -->
              <v-text-field
                v-if="field.type === 'string' && !field.enum && field.format !== 'textarea'"
                v-model="payload[key]"
                :label="field.title || key"
                :readonly="isFieldReadOnly(field)"
                :rules="field.required ? [(v) => !!v || 'Required'] : []"
                class="mb-4"
              />

              <!-- Textarea -->
              <v-textarea
                v-else-if="field.type === 'string' && field.format === 'textarea'"
                v-model="payload[key]"
                :label="field.title || key"
                :readonly="isFieldReadOnly(field)"
                :rules="field.required ? [(v) => !!v || 'Required'] : []"
                class="mb-4"
              />

              <!-- Enum -->
              <v-select
                v-else-if="field.type === 'string' && field.enum"
                v-model="payload[key]"
                :items="field.enum"
                :label="field.title || key"
                :readonly="isFieldReadOnly(field)"
                :rules="field.required ? [(v) => !!v || 'Required'] : []"
                class="mb-4"
              />

              <v-combobox
                v-else-if="
                  field.type === 'array' && (field.items as FieldSchema)?.type === 'string'
                "
                v-model="payload[key]"
                :label="field.title || key"
                multiple
                chips
                :readonly="isFieldReadOnly(field)"
                class="mb-4"
              />

              <div
                v-else-if="field.type === 'array' && (field.items as any)?.type === 'object'"
                class="mb-4"
              >
                <div
                  v-for="(item, index) in payload[key]"
                  :key="index"
                  class="mb-2 pa-2"
                  style="border: 1px solid #ccc; border-radius: 4px"
                >
                  <template
                    v-for="(subfield, subkey) in (field.items as any)?.properties ?? {}"
                    :key="subkey"
                  >
                    <v-text-field
                      v-if="subfield.type === 'string' && !subfield.enum"
                      v-model="payload[key][index][subkey]"
                      :label="subfield.title || subkey"
                      :readonly="subfield.readOnly ?? isFieldReadOnly(field)"
                      class="mb-2"
                    />
                    <v-select
                      v-else-if="subfield.type === 'string' && subfield.enum"
                      v-model="payload[key][index][subkey]"
                      :items="subfield.enum"
                      :label="subfield.title || subkey"
                      :readonly="subfield.readOnly ?? isFieldReadOnly(field)"
                      class="mb-2"
                    />
                  </template>
                  <v-btn
                    v-if="!isFieldReadOnly(field)"
                    small
                    color="error"
                    @click="payload[key].splice(index, 1)"
                  >
                    Remove
                  </v-btn>
                </div>
                <v-btn
                  v-if="!isFieldReadOnly(field)"
                  small
                  color="primary"
                  @click="payload[key].push({})"
                >
                  Add {{ field.title }}
                </v-btn>
              </div>
            </template>
          </v-form>
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="justify-end">
        <v-btn text @click="closeModal">Cancel</v-btn>
        <v-btn color="primary" @click="confirmPublish">Share</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.repo-logo {
  height: 24px;
  width: auto;
  object-fit: contain;
}
</style>
