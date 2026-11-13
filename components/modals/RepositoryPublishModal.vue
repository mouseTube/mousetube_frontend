<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue';
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
// publishing is permanent on Zenodo: the user confirms it knowingly
const understood = ref(false);

// the form is grouped by what the fields are about; unknown fields go to "More"
const SECTIONS = [
  {
    title: 'Description',
    icon: 'mdi-text-box-outline',
    keys: ['title', 'description', 'keywords'],
  },
  { title: 'People', icon: 'mdi-account-multiple-outline', keys: ['creators', 'contributors'] },
  { title: 'License', icon: 'mdi-scale-balance', keys: ['license'] },
  { title: 'References', icon: 'mdi-bookmark-outline', keys: ['references'] },
];
const sections = computed(() => {
  const keys = Object.keys(schema.value?.properties ?? {});
  const known = SECTIONS.flatMap((s) => s.keys);
  const more = keys.filter((k) => !known.includes(k) && !FIXED.includes(k));
  return [
    ...SECTIONS,
    ...(more.length ? [{ title: 'More', icon: 'mdi-dots-horizontal', keys: more }] : []),
  ]
    .map((s) => ({ ...s, keys: s.keys.filter((k) => keys.includes(k)) }))
    .filter((s) => s.keys.length);
});
// what the repository imposes: shown, not edited
const FIXED = ['upload_type', 'communities'];
const fixedInfo = computed(() => [
  ...(payload.upload_type ? [{ label: 'Type', value: String(payload.upload_type) }] : []),
  ...((payload.communities as { identifier: string }[] | undefined) ?? []).map((c) => ({
    label: 'Community',
    value: c.identifier,
  })),
]);

// the description is HTML for the repository: shown as the reader will see it, editable as HTML.
// Only a few tags are kept in the preview, whatever the text contains.
const descriptionMode = ref<'preview' | 'edit'>('preview');
const KEPT_TAGS = new Set(['P', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI', 'BR', 'A']);
function sanitize(source: string): string {
  const doc = new DOMParser().parseFromString(source || '', 'text/html');
  const text = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const walk = (node: Node): string =>
    [...node.childNodes]
      .map((child) => {
        if (child.nodeType === Node.TEXT_NODE) return text(child.textContent ?? '');
        if (child.nodeType !== Node.ELEMENT_NODE) return '';
        const el = child as HTMLElement;
        const inner = walk(el);
        if (!KEPT_TAGS.has(el.tagName)) return inner;
        const tag = el.tagName.toLowerCase();
        if (tag === 'br') return '<br>';
        if (tag === 'a') {
          const href = el.getAttribute('href') ?? '';
          return /^https?:\/\//i.test(href)
            ? `<a href="${href.replace(/"/g, '&quot;')}" target="_blank" rel="noopener">${inner}</a>`
            : inner;
        }
        return `<${tag}>${inner}</${tag}>`;
      })
      .join('');
  return walk(doc.body);
}
const descriptionPreview = computed(() => sanitize(String(payload.description ?? '')));

const LICENSES: Record<string, string> = {
  'CC0-1.0': 'CC0 1.0 — public domain',
  'CC-BY-4.0': 'CC BY 4.0 — attribution',
  'CC-BY-SA-4.0': 'CC BY-SA 4.0 — attribution, share alike',
  'CC-BY-NC-4.0': 'CC BY-NC 4.0 — attribution, non commercial',
  'CC-BY-ND-4.0': 'CC BY-ND 4.0 — attribution, no derivatives',
  'CC-BY-NC-SA-4.0': 'CC BY-NC-SA 4.0 — non commercial, share alike',
  'CC-BY-NC-ND-4.0': 'CC BY-NC-ND 4.0 — non commercial, no derivatives',
};
const enumItems = (key: string, values: string[]) =>
  values.map((v) => ({ title: key === 'license' ? (LICENSES[v] ?? v) : v, value: v }));
const singular = (title?: string) => (title ?? 'item').replace(/s$/, '').toLowerCase();

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
    if (val) {
      understood.value = false;
      fetchSchemaAndPayload();
    }
  },
  { immediate: true }
);

function isFieldReadOnly(field: FieldSchema) {
  return field.readOnly ?? false;
}
</script>

<template>
  <v-dialog
    :model-value="props.show"
    max-width="860"
    scrollable
    @update:model-value="(open: boolean) => !open && closeModal()"
  >
    <v-card class="publish-card">
      <!-- Header -->
      <div class="publish-head">
        <div>
          <div class="text-overline publish-eyebrow">Deposit in a repository</div>
          <h2>Publish “{{ props.recordingSessionName }}”</h2>
        </div>
        <div class="d-flex align-center ga-3">
          <span v-if="props.repository.logo_url" class="repo-logo-badge">
            <img :src="props.repository.logo_url" :alt="props.repository.name" />
          </span>
          <span v-else class="font-weight-bold">{{ props.repository.name }}</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            aria-label="Close"
            @click="closeModal"
          />
        </div>
      </div>

      <v-card-text class="publish-body">
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" />
        </div>
        <v-alert v-else-if="error" type="error" variant="tonal">{{ error }}</v-alert>

        <template v-else>
          <p class="publish-lead">
            Your files are already on {{ props.repository.name }} as a draft. Check the description
            below: publishing makes the record public and gives it a DOI.
          </p>

          <div v-if="fixedInfo.length" class="fixed-info">
            <v-chip
              v-for="info in fixedInfo"
              :key="info.label + info.value"
              size="small"
              label
              variant="tonal"
            >
              <span class="text-medium-emphasis me-1">{{ info.label }}</span>
              {{ info.value }}
            </v-chip>
          </div>

          <p v-if="fixedInfo.some((i) => i.label === 'Community')" class="community-note">
            The record is also submitted to the mouseTube community on
            {{ props.repository.name }}: it appears there once a curator of the community accepts
            it, unless the depositing account is one of them.
          </p>

          <v-form>
            <section v-for="section in sections" :key="section.title" class="publish-section">
              <h3>
                <v-icon size="18">{{ section.icon }}</v-icon
                >{{ section.title }}
              </h3>

              <template v-for="key in section.keys" :key="key">
                <template v-for="field in [schema!.properties[key]]" :key="key">
                  <!-- text -->
                  <v-text-field
                    v-if="field.type === 'string' && !field.enum && field.format !== 'textarea'"
                    v-model="payload[key]"
                    :label="field.title || key"
                    :readonly="isFieldReadOnly(field)"
                    variant="outlined"
                    density="comfortable"
                  />

                  <!-- the description: as the reader will see it, or as HTML -->
                  <div v-else-if="key === 'description'" class="description-box">
                    <div class="description-head">
                      <span class="description-label">{{ field.title || key }}</span>
                      <v-btn-toggle
                        v-model="descriptionMode"
                        mandatory
                        density="compact"
                        variant="outlined"
                        divided
                      >
                        <v-btn value="preview" size="small">Preview</v-btn>
                        <v-btn value="edit" size="small">Edit HTML</v-btn>
                      </v-btn-toggle>
                    </div>
                    <div
                      v-if="descriptionMode === 'preview'"
                      class="description-preview"
                      v-html="descriptionPreview"
                    />
                    <v-textarea
                      v-else
                      v-model="payload[key]"
                      :readonly="isFieldReadOnly(field)"
                      variant="outlined"
                      rows="8"
                      max-rows="14"
                      auto-grow
                      class="mb-4"
                      hint="Sent as HTML: <br> is a line break, <a href=...> a link."
                      persistent-hint
                    />
                  </div>

                  <!-- long text -->
                  <v-textarea
                    v-else-if="field.type === 'string' && field.format === 'textarea'"
                    v-model="payload[key]"
                    :label="field.title || key"
                    :readonly="isFieldReadOnly(field)"
                    variant="outlined"
                    rows="5"
                    max-rows="12"
                    auto-grow
                    hint="Sent as HTML: &lt;br&gt; is a line break, &lt;a href=...&gt; a link."
                    persistent-hint
                  />

                  <!-- choice -->
                  <v-select
                    v-else-if="field.type === 'string' && field.enum"
                    v-model="payload[key]"
                    :items="enumItems(key, field.enum)"
                    :label="field.title || key"
                    :readonly="isFieldReadOnly(field)"
                    variant="outlined"
                    density="comfortable"
                  />

                  <!-- list of words -->
                  <v-combobox
                    v-else-if="
                      field.type === 'array' && (field.items as FieldSchema)?.type === 'string'
                    "
                    v-model="payload[key]"
                    :label="field.title || key"
                    multiple
                    chips
                    closable-chips
                    variant="outlined"
                    density="comfortable"
                    :readonly="isFieldReadOnly(field)"
                    hint="Type a reference, then press Enter"
                  />

                  <!-- list of people -->
                  <div
                    v-else-if="field.type === 'array' && (field.items as any)?.type === 'object'"
                  >
                    <div class="people-title">{{ field.title }}</div>
                    <div v-for="(item, index) in payload[key]" :key="index" class="person">
                      <div class="person-fields">
                        <template
                          v-for="(subfield, subkey) in (field.items as any)?.properties ?? {}"
                          :key="subkey"
                        >
                          <v-text-field
                            v-if="subfield.type === 'string' && !subfield.enum"
                            v-model="payload[key][index][subkey]"
                            :label="subfield.title || subkey"
                            :readonly="subfield.readOnly ?? isFieldReadOnly(field)"
                            variant="outlined"
                            density="compact"
                            hide-details
                          />
                          <v-select
                            v-else-if="subfield.type === 'string' && subfield.enum"
                            v-model="payload[key][index][subkey]"
                            :items="subfield.enum"
                            :label="subfield.title || subkey"
                            :readonly="subfield.readOnly ?? isFieldReadOnly(field)"
                            variant="outlined"
                            density="compact"
                            hide-details
                          />
                        </template>
                      </div>
                      <v-btn
                        v-if="!isFieldReadOnly(field)"
                        icon="mdi-delete-outline"
                        variant="text"
                        size="small"
                        :aria-label="`Remove ${singular(field.title)}`"
                        @click="payload[key].splice(index, 1)"
                      />
                    </div>
                    <v-btn
                      v-if="!isFieldReadOnly(field)"
                      variant="tonal"
                      size="small"
                      prepend-icon="mdi-plus"
                      @click="payload[key].push({})"
                    >
                      Add {{ singular(field.title) }}
                    </v-btn>
                  </div>
                </template>
              </template>
            </section>
          </v-form>

          <v-alert type="warning" variant="tonal" density="comfortable" class="mt-4">
            A published record is permanent: it cannot be deleted from
            {{ props.repository.name }}, only completed by a new version.
            <v-checkbox
              v-model="understood"
              density="compact"
              hide-details
              label="I checked the description and want to publish."
            />
          </v-alert>
        </template>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="publish-actions">
        <v-spacer />
        <v-btn variant="text" @click="closeModal">Cancel</v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-cloud-upload-outline"
          :disabled="loading || !!error || !understood"
          @click="confirmPublish"
        >
          Publish and get a DOI
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.publish-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 12px;
  border-bottom: 1px solid #e4e4e4;
}
.publish-head h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}
.publish-eyebrow {
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
}
.repo-logo-badge {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 10px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
}
.repo-logo-badge img {
  display: block;
  height: 26px;
  width: auto;
  max-width: 110px;
  object-fit: contain;
}
.publish-body {
  padding: 16px 24px 8px;
}
.publish-lead {
  margin: 0 0 12px;
  color: #555;
}
.description-box {
  margin-bottom: 18px;
}
.description-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.description-label {
  font-weight: 600;
}
.description-preview {
  max-height: 340px;
  overflow-y: auto;
  padding: 14px 16px;
  border: 1.5px solid #e4e4e4;
  border-radius: 12px;
  background: #fafafa;
  line-height: 1.5;
}
.description-preview :deep(p) {
  margin: 0 0 8px;
}
.description-preview :deep(ul) {
  margin: 0 0 10px;
  padding-left: 22px;
}
.description-preview :deep(a) {
  color: rgb(var(--v-theme-primary));
}
.community-note {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: #666;
}
.fixed-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.publish-section {
  margin-top: 20px;
}
.publish-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #555;
}
.people-title {
  margin-bottom: 8px;
  font-weight: 600;
}
.person {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin-bottom: 10px;
  border: 1.5px solid #e4e4e4;
  border-radius: 12px;
  background: #fafafa;
}
.person-fields {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
}
.publish-actions {
  padding: 12px 24px 16px;
  border-top: 1px solid #e4e4e4;
}
</style>
