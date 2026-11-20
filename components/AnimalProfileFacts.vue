<script setup lang="ts">
// An animal profile told by its fields, label above value: strain, sex, age, genotype, and the
// treatment and the diet when there are some. Used wherever a profile is listed or chosen.
import { computed } from 'vue';

const props = defineProps<{
  profile: {
    strain?: { name?: string } | null;
    sex?: string | null;
    age?: string | null;
    genotype?: string | null;
    treatment?: string | null;
    diet?: string | null;
  };
}>();

const facts = computed(() =>
  [
    { label: 'Strain', value: props.profile.strain?.name },
    { label: 'Sex', value: props.profile.sex },
    { label: 'Age', value: props.profile.age },
    { label: 'Genotype', value: props.profile.genotype },
    { label: 'Treatment', value: props.profile.treatment },
    { label: 'Diet', value: props.profile.diet },
  ].filter((f) => f.value)
);
</script>

<template>
  <dl class="apf">
    <div v-for="fact in facts" :key="fact.label" class="apf-fact">
      <dt>{{ fact.label }}</dt>
      <dd>{{ fact.value }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.apf {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 22px;
  margin: 0;
}
.apf-fact dt {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #777;
}
.apf-fact dd {
  margin: 1px 0 0;
  font-size: 0.9rem;
  color: #111;
}
</style>
