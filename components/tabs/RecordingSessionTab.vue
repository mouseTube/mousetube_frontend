<script setup>
import { ref, onMounted } from 'vue';
import Vjsf from '@koumoul/vjsf';
import { VForm } from 'vuetify/components';

const data = ref({});
const schema = ref(null);
const options = {};
const apiBaseUrl = useApiBaseUrl();

const baseUrl = apiBaseUrl + '/schema/';

async function resolveRefs(obj, baseUrl) {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (obj.$ref && !obj.$ref.startsWith('http')) {
    const refUrl = baseUrl + obj.$ref;
    const refSchema = await fetch(refUrl).then((res) => res.json());
    if (refSchema.$schema) delete refSchema.$schema;
    return resolveRefs(refSchema, baseUrl);
  }

  for (const key in obj) {
    obj[key] = await resolveRefs(obj[key], baseUrl);
  }
  if (obj.$schema) delete obj.$schema;

  return obj;
}

onMounted(async () => {
  try {
    const res = await fetch(baseUrl + 'recording_session.json');
    let jsonSchema = await res.json();

    if (jsonSchema.$schema) delete jsonSchema.$schema;

    const resolvedSchema = await resolveRefs(jsonSchema, baseUrl);
    schema.value = resolvedSchema;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error while loading schema:', err);
  }
});
</script>

<template>
  <v-form>
    <vjsf
      v-if="schema"
      v-model="data"
      :schema="schema"
      :options="options"
      style="width: 100%; box-sizing: border-box"
    />
    <div v-else>Loading schema...</div>
  </v-form>
</template>
