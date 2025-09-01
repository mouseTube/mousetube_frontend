<script setup>
////////////////////////////////
// IMPORT
////////////////////////////////
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useApiBaseUrl } from '~/composables/useApiBaseUrl';

////////////////////////////////
// SCHEMA LIST
////////////////////////////////
const schemaList = [
  'animal_profile',
  'file',
  'hardware',
  'laboratory',
  'protocol',
  'recording_session',
  'reference',
  'repository',
  'software',
  'species',
  'strain',
  'study',
  'subject',
];

const apiBaseUrl = useApiBaseUrl();
const schemas = ref({});
const loading = ref(true);
const error = ref(null);

////////////////////////////////
// FETCH SCHEMAS
////////////////////////////////
onMounted(async () => {
  try {
    const requests = schemaList.map(async (name) => {
      const response = await axios.get(`${apiBaseUrl}/schema/${name}.json`);
      schemas.value[name] = response.data;
    });
    await Promise.all(requests);
  } catch (err) {
    error.value = 'Failed to load schemas.';
    // eslint-disable-next-line no-console
    console.error(err);
  } finally {
    loading.value = false;
  }
});

////////////////////////////////
// RENDER PROPERTIES
////////////////////////////////
function renderProperties(properties, level = 0) {
  return Object.entries(properties).map(([key, value]) => {
    const title = value.title || key;
    const type = value.type || 'unknown';
    const enumValues = value.enum ? value.enum.join(', ') : null;
    const description = value.description || '';
    const subtitleParts = [`Type: ${type}`];
    if (enumValues) subtitleParts.push(`Possible values: ${enumValues}`);
    const subtitle = [description, ...subtitleParts].filter(Boolean).join(' — ');

    const children =
      value.type === 'object' && value.properties
        ? renderProperties(value.properties, level + 1)
        : null;

    return { key, title, subtitle, children };
  });
}
</script>

<template>
  <v-main>
    <v-container>
      <h1>Metadata</h1>

      <v-card prepend-icon="mdi-information" title="About metadata">
        <v-card-text>
          Metadata are important for several reasons:
          <v-list>
            <v-list-item prepend-icon="mdi-check-circle">make your data findable</v-list-item>
            <v-list-item prepend-icon="mdi-check-circle">make your data understandable</v-list-item>
            <v-list-item prepend-icon="mdi-check-circle"
              >make your data comparable with other data</v-list-item
            >
          </v-list>
          These metadata will be linked to your data and shared with the repository if you use
          <strong>mouseTube</strong>.
        </v-card-text>
      </v-card>

      <v-skeleton-loader v-if="loading" type="list-item-three-line" class="mt-6" />

      <v-alert v-if="error" type="error" class="mt-4">{{ error }}</v-alert>

      <v-expansion-panels multiple v-else class="mt-6">
        <v-expansion-panel v-for="(schema, name) in schemas" :key="name">
          <v-expansion-panel-title>
            {{ name.replace('_', ' ').toUpperCase() }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <p class="mb-2"><strong>Description:</strong> {{ schema.description }}</p>
            <v-list density="compact">
              <template v-for="field in renderProperties(schema.properties)" :key="field.key">
                <v-list-item>
                  <v-list-item-content>
                    <v-list-item-title class="font-weight-bold">{{
                      field.title
                    }}</v-list-item-title>
                    <v-list-item-subtitle>{{ field.subtitle }}</v-list-item-subtitle>

                    <v-list v-if="field.children" class="ml-4">
                      <template v-for="subField in field.children" :key="subField.key">
                        <v-list-item>
                          <v-list-item-content>
                            <v-list-item-title>{{ subField.title }}</v-list-item-title>
                            <v-list-item-subtitle>{{ subField.subtitle }}</v-list-item-subtitle>

                            <v-list v-if="subField.children" class="ml-4">
                              <v-list-item
                                v-for="deepField in subField.children"
                                :key="deepField.key"
                              >
                                <v-list-item-content>
                                  <v-list-item-title>{{ deepField.title }}</v-list-item-title>
                                  <v-list-item-subtitle>{{
                                    deepField.subtitle
                                  }}</v-list-item-subtitle>
                                </v-list-item-content>
                              </v-list-item>
                            </v-list>
                          </v-list-item-content>
                        </v-list-item>
                      </template>
                    </v-list>
                  </v-list-item-content>
                </v-list-item>
              </template>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-container>
  </v-main>
</template>

<style scoped>
.ml-4 {
  margin-left: 1rem;
}
</style>
