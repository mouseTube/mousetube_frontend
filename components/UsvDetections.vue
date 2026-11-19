<script setup lang="ts">
// The calls that automatic detectors found in a file. Detectors do not agree, so each tool is shown
// on its own, with its version and settings, and the person picks the one they trust. The calls are
// read when the panel opens (a recording can have hundreds of them).
import { computed, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import { token } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import UsvToolIcon from '@/components/UsvToolIcon.vue';

type Detection = {
  id?: number; // a preview, not saved yet, has none
  color?: string;
  calls?: Call[]; // a preview carries its calls
  tool: string;
  label: string;
  tool_version: string;
  parameters: string;
  reference: string;
  citation: string;
  summary: Record<string, number | null>;
  deposit?: boolean; // the table of the author goes to the repository with the recording
};
type Call = Record<string, any> & { start_s: number; end_s: number; native: Record<string, any> };

const props = defineProps<{ detections: Detection[]; preview?: boolean }>();
const apiBaseUrl = useApiBaseUrl();

const keyOf = (d: Detection) => String(d.id ?? d.tool);
const colorOf = (tool: string) => props.detections.find((d) => d.tool === tool)?.color ?? '#555';

const selectedId = ref<string>(props.detections[0] ? keyOf(props.detections[0]) : '');
const calls = ref<Record<string, Call[]>>({});
const loading = ref(false);
const failed = ref(false);
const showAll = ref(false);
const showNative = ref(false);

const detection = computed(() => props.detections.find((d) => keyOf(d) === selectedId.value));
const rows = computed(() => calls.value[selectedId.value] ?? []);
const span = computed(() => detection.value?.summary?.span_s || 1);
const shown = computed(() => (showAll.value ? rows.value : rows.value.slice(0, 12)));
const nativeColumns = computed(() => Object.keys(rows.value[0]?.native ?? {}));

async function load() {
  const id = selectedId.value;
  const current = detection.value;
  if (!id || !current || calls.value[id]) return;
  if (current.calls) {
    calls.value = { ...calls.value, [id]: current.calls }; // a preview already holds its calls
    return;
  }
  loading.value = true;
  failed.value = false;
  try {
    const res = await axios.get(`${apiBaseUrl}/usv-detection/${current.id}/`, {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
    });
    calls.value = { ...calls.value, [id]: res.data.calls };
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(selectedId, () => {
  showAll.value = false;
  load();
});

const fmt = (v: unknown, digits = 1) =>
  typeof v === 'number' ? v.toFixed(digits) : v === null || v === undefined ? '—' : String(v);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const tiles = computed(() => {
  const s = detection.value?.summary ?? {};
  const low = s.freq_min_khz;
  const high = s.freq_max_khz;
  return [
    { label: 'Calls', value: fmt(s.calls, 0) },
    { label: 'Calls per minute', value: fmt(s.calls_per_min) },
    {
      label: 'Median duration',
      value: s.median_duration_ms ? `${fmt(s.median_duration_ms)} ms` : '—',
    },
    { label: 'Mean frequency', value: s.mean_freq_khz ? `${fmt(s.mean_freq_khz)} kHz` : '—' },
    { label: 'Frequency range', value: low && high ? `${fmt(low, 0)}–${fmt(high, 0)} kHz` : '—' },
  ];
});
</script>

<template>
  <div class="usv">
    <p class="usv-note">
      <template v-if="preview"
        >Preview of what will be shown with this file. Nothing is saved yet.</template
      >
      <template v-else
        >Results provided by the authors of this file, as they exported them from each tool. They
        were run and finalised by the authors, and tools do not agree: choose the one you
        trust.</template
      >
    </p>

    <v-btn-toggle
      v-model="selectedId"
      mandatory
      divided
      density="comfortable"
      variant="outlined"
      class="usv-tools"
    >
      <v-btn v-for="d in detections" :key="keyOf(d)" :value="keyOf(d)" size="small">
        <UsvToolIcon
          :tool="d.tool"
          :label="d.label"
          :color="colorOf(d.tool)"
          :size="22"
          class="me-2"
        />
        {{ d.label }}
        <span class="usv-count">{{ d.summary.calls }}</span>
      </v-btn>
    </v-btn-toggle>

    <template v-if="detection">
      <p class="usv-source">
        Produced with <strong>{{ detection.label }}</strong
        >{{ detection.tool_version ? ` ${detection.tool_version}` : '' }} · {{ detection.citation }}
        <a
          v-if="detection.reference"
          :href="`https://doi.org/${detection.reference}`"
          target="_blank"
          rel="noopener"
          >DOI</a
        >
        <span v-if="detection.deposit" class="usv-sent"
          >· the table is sent to Zenodo with the recording</span
        >
      </p>
      <details v-if="detection.parameters" class="usv-settings">
        <summary>Settings of this run</summary>
        <p>{{ detection.parameters }}</p>
      </details>

      <div class="usv-tiles">
        <div v-for="t in tiles" :key="t.label" class="usv-tile">
          <span class="usv-tile-label">{{ t.label }}</span>
          <span class="usv-tile-value">{{ t.value }}</span>
        </div>
      </div>

      <div v-if="loading" class="usv-wait">
        <v-progress-circular indeterminate size="20" /> Loading the calls…
      </div>
      <v-alert v-else-if="failed" type="warning" variant="tonal" density="compact">
        The calls could not be loaded.
      </v-alert>
      <template v-else-if="rows.length">
        <!-- where the calls are in the recording -->
        <svg
          class="usv-line"
          viewBox="0 0 1000 34"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`${rows.length} calls over ${clock(span)}`"
        >
          <rect x="0" y="26" width="1000" height="1" fill="#ccc" />
          <rect
            v-for="(c, i) in rows"
            :key="i"
            :x="(c.start_s / span) * 1000"
            y="2"
            :width="Math.max(1.4, ((c.end_s - c.start_s) / span) * 1000)"
            height="22"
            :fill="colorOf(detection.tool)"
          />
        </svg>
        <div class="usv-axis">
          <span>0:00</span><span>{{ clock(span / 2) }}</span
          ><span>{{ clock(span) }}</span>
        </div>

        <v-switch
          v-model="showNative"
          density="compact"
          hide-details
          color="primary"
          label="All the variables of the tool"
          class="usv-switch"
        />
        <div class="usv-table-wrap">
          <table class="usv-table">
            <thead v-if="!showNative">
              <tr>
                <th>#</th>
                <th>Start (s)</th>
                <th>End (s)</th>
                <th>Duration (ms)</th>
                <th>Min kHz</th>
                <th>Max kHz</th>
                <th>Mean kHz</th>
                <th>Peak kHz</th>
              </tr>
            </thead>
            <thead v-else>
              <tr>
                <th>#</th>
                <th v-for="k in nativeColumns" :key="k">{{ k }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(c, i) in shown" :key="i">
                <td>{{ i + 1 }}</td>
                <template v-if="!showNative">
                  <td>{{ fmt(c.start_s, 3) }}</td>
                  <td>{{ fmt(c.end_s, 3) }}</td>
                  <td>{{ fmt(c.duration_s * 1000) }}</td>
                  <td>{{ fmt(c.freq_min_khz) }}</td>
                  <td>{{ fmt(c.freq_max_khz) }}</td>
                  <td>{{ fmt(c.freq_mean_khz) }}</td>
                  <td>{{ fmt(c.freq_peak_khz) }}</td>
                </template>
                <template v-else>
                  <td v-for="k in nativeColumns" :key="k">{{ fmt(c.native[k], 3) }}</td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
        <v-btn
          v-if="rows.length > 12"
          variant="text"
          size="small"
          class="usv-more"
          @click="showAll = !showAll"
        >
          {{ showAll ? 'Show fewer' : `Show all ${rows.length} calls` }}
        </v-btn>
      </template>
    </template>
  </div>
</template>

<style scoped>
.usv-note {
  margin: 0 0 10px;
  color: #666;
  font-size: 0.85rem;
}
.usv-tools {
  margin-bottom: 12px;
  flex-wrap: wrap;
  height: auto;
}
.usv-count {
  margin-left: 8px;
  padding: 0 6px;
  border-radius: 10px;
  background: #f1f1f1;
  font-size: 0.72rem;
}
.usv-source {
  margin: 4px 0;
  font-size: 0.85rem;
  color: #444;
}
.usv-settings {
  margin-bottom: 10px;
  font-size: 0.8rem;
  color: #666;
}
.usv-settings summary {
  cursor: pointer;
}
.usv-settings p {
  margin: 6px 0 0;
  overflow-wrap: anywhere;
}
.usv-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
  margin: 10px 0 12px;
}
.usv-tile {
  padding: 8px 12px;
  border: 1px solid #e4e4e4;
  border-radius: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.usv-tile-label {
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #777;
}
.usv-tile-value {
  font-size: 1.05rem;
  font-weight: 600;
}
.usv-line {
  width: 100%;
  height: 34px;
  display: block;
  background: #fafafa;
  border-radius: 6px;
}
.usv-axis {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #777;
  margin: 2px 0 8px;
}
.usv-wait {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #666;
  padding: 8px 0;
}
.usv-switch {
  margin: 0 0 4px;
}
.usv-table-wrap {
  overflow-x: auto;
  border: 1px solid #eee;
  border-radius: 8px;
}
.usv-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.8rem;
}
.usv-table th {
  text-align: right;
  padding: 6px 10px;
  background: #fafafa;
  color: #666;
  font-weight: 600;
  white-space: nowrap;
  position: sticky;
  top: 0;
}
.usv-table td {
  text-align: right;
  padding: 4px 10px;
  border-top: 1px solid #f0f0f0;
  white-space: nowrap;
}
.usv-table th:first-child,
.usv-table td:first-child {
  text-align: left;
  color: #999;
}
.usv-more {
  margin-top: 4px;
}
</style>
