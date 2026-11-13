<script setup lang="ts">
// The "More information" of a file: how it was recorded, in small sections with a label and a
// value per line. Empty values are left out instead of printing N/A everywhere.
import { computed } from 'vue';

const props = defineProps<{ file: any }>();

type Row = { label: string; value?: string; items?: { text: string; sub?: string }[] };

const filled = (rows: Row[]) => rows.filter((r) => (r.items ? r.items.length : r.value));
const text = (...parts: unknown[]) =>
  parts
    .filter((p) => p !== null && p !== undefined && String(p).trim() !== '')
    .join(' ')
    .trim();
const named = (list?: any[]) =>
  (list ?? []).map((x) => ({ text: x.name, sub: x.made_by ? `by ${x.made_by}` : '' }));

const session = computed(() => props.file?.recording_session ?? {});
const protocol = computed(() => session.value.protocol ?? {});
const lab = computed(() => session.value.laboratory ?? null);

const subjects = computed(() => props.file?.subjects ?? []);

const protocolRows = computed(() =>
  filled([
    { label: 'Name', value: protocol.value.name },
    { label: 'Animals sex', value: protocol.value.animals_sex },
    { label: 'Animals age', value: protocol.value.animals_age },
    { label: 'Housing', value: protocol.value.animals_housing },
    { label: 'Number of animals', value: protocol.value.context_number_of_animals },
    { label: 'Duration', value: protocol.value.context_duration },
    { label: 'Cage', value: protocol.value.context_cage },
    { label: 'Bedding', value: protocol.value.context_bedding },
    { label: 'Light cycle', value: protocol.value.context_light_cycle },
    {
      label: 'Temperature',
      value: text(
        protocol.value.context_temperature_value,
        protocol.value.context_temperature_unit
      ),
    },
    { label: 'Brightness', value: protocol.value.context_brightness },
  ])
);

const sessionRows = computed(() =>
  filled([
    { label: 'Name', value: session.value.name },
    {
      label: 'Studies',
      items: (session.value.studies ?? []).map((s: any) => ({
        text: s.name,
        sub: s.made_by ? `by ${s.made_by}` : '',
      })),
    },
    {
      label: 'Date',
      value: session.value.date ? String(session.value.date).replace('T', ' ').slice(0, 16) : '',
    },
    { label: 'File number', value: props.file?.number },
    {
      label: 'Temperature',
      value: text(session.value.context_temperature_value, session.value.context_temperature_unit),
    },
    {
      label: 'Animal profiles',
      items: (session.value.animal_profiles ?? []).map((p: any) => ({ text: p.name })),
    },
  ])
);

const equipment = computed(() =>
  filled([
    { label: 'Soundcards', items: named(session.value.equipment_acquisition_hardware_soundcards) },
    {
      label: 'Microphones',
      items: named(session.value.equipment_acquisition_hardware_microphones),
    },
    { label: 'Amplifiers', items: named(session.value.equipment_acquisition_hardware_amplifiers) },
    { label: 'Speakers', items: named(session.value.equipment_acquisition_hardware_speakers) },
  ])
);

const labLine = computed(() =>
  lab.value
    ? [lab.value.institution, lab.value.unit, lab.value.address, lab.value.country]
        .filter(Boolean)
        .join(' · ')
    : ''
);
const hasAnything = computed(
  () =>
    subjects.value.length ||
    protocolRows.value.length ||
    sessionRows.value.length ||
    equipment.value.length ||
    lab.value
);
</script>

<template>
  <div v-if="hasAnything" class="fd">
    <section v-if="subjects.length" class="fd-section">
      <h4 class="fd-title"><v-icon size="18">mdi-paw</v-icon> Subjects</h4>
      <div v-for="(subject, idx) in subjects" :key="subject.id || idx" class="fd-subject">
        <div class="fd-subject-name">{{ subject.name }}</div>
        <dl class="fd-list">
          <template
            v-for="row in filled([
              { label: 'Animal profile', value: subject.animal_profile?.name },
              { label: 'Sex', value: subject.animal_profile?.sex },
              { label: 'Genotype', value: subject.animal_profile?.genotype },
              { label: 'Treatment', value: subject.animal_profile?.treatment },
              { label: 'Origin', value: subject.origin },
              { label: 'Cohort', value: subject.cohort },
            ])"
            :key="row.label"
          >
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </template>
        </dl>
      </div>
    </section>

    <section v-if="protocolRows.length" class="fd-section">
      <h4 class="fd-title"><v-icon size="18">mdi-clipboard-text-outline</v-icon> Protocol</h4>
      <dl class="fd-list">
        <template v-for="row in protocolRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </template>
      </dl>
    </section>

    <section v-if="sessionRows.length || lab" class="fd-section">
      <h4 class="fd-title"><v-icon size="18">mdi-microphone-variant</v-icon> Recording session</h4>
      <dl class="fd-list">
        <template v-for="row in sessionRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>
            <template v-if="row.items">
              <v-chip
                v-for="(item, i) in row.items"
                :key="i"
                size="small"
                label
                variant="tonal"
                class="fd-chip me-1 mb-1"
              >
                {{ item.text
                }}<span v-if="item.sub" class="text-medium-emphasis ms-1">{{ item.sub }}</span>
              </v-chip>
            </template>
            <template v-else>{{ row.value }}</template>
          </dd>
        </template>
        <template v-if="lab">
          <dt>Laboratory</dt>
          <dd>
            <strong>{{ lab.name }}</strong>
            <a
              v-if="lab.organization"
              :href="lab.organization.iri"
              target="_blank"
              rel="noopener"
              class="ror-link ms-2"
              :title="lab.organization.label"
              >ROR <v-icon size="12">mdi-open-in-new</v-icon></a
            >
            <div v-if="labLine" class="text-medium-emphasis">{{ labLine }}</div>
          </dd>
        </template>
      </dl>
    </section>

    <section v-if="equipment.length" class="fd-section">
      <h4 class="fd-title"><v-icon size="18">mdi-tune-variant</v-icon> Equipment</h4>
      <dl class="fd-list">
        <template v-for="row in equipment" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>
            <v-chip
              v-for="(item, i) in row.items"
              :key="i"
              size="small"
              label
              variant="tonal"
              class="fd-chip me-1 mb-1"
            >
              {{ item.text
              }}<span v-if="item.sub" class="text-medium-emphasis ms-1">{{ item.sub }}</span>
            </v-chip>
          </dd>
        </template>
      </dl>
    </section>
  </div>
  <p v-else class="text-medium-emphasis ma-0">No more information for this file.</p>
</template>

<style scoped>
.fd {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
  align-items: start;
}
.fd-section {
  padding: 14px 16px;
  border: 1px solid #e4e4e4;
  border-radius: 12px;
  background: #fff;
  min-width: 0;
}
.fd-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #555;
}
.fd-title .v-icon {
  color: rgb(var(--v-theme-primary));
}
.fd-list {
  display: grid;
  grid-template-columns: minmax(90px, max-content) 1fr;
  gap: 6px 16px;
  margin: 0;
  font-size: 0.9rem;
}
.fd-list dt {
  color: #777;
}
.fd-list dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}
.fd-subject + .fd-subject {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e4e4e4;
}
.fd-subject-name {
  margin-bottom: 6px;
  font-weight: 600;
}
.fd-chip {
  max-width: 100%;
  height: auto;
  min-height: 24px;
  padding-block: 2px;
}
.fd-chip :deep(.v-chip__content) {
  white-space: normal;
}
.ror-link {
  white-space: nowrap;
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  color: rgb(var(--v-theme-primary));
}
.ror-link:hover {
  text-decoration: underline;
}
</style>
