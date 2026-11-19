<script setup lang="ts">
// For an audio file: add the tables that detectors (USVSEG, DeepSqueak...) wrote for it, so people
// can see the calls found. Each table is read at once by the server and shown as a preview before
// anything is sent. A table is sent to the repository with the recording only if its box is ticked.
import { onMounted, ref } from 'vue';
import axios from 'axios';
import { token } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';
import UsvDetections from '@/components/UsvDetections.vue';
import UsvToolIcon from '@/components/UsvToolIcon.vue';

export type Output = {
  tool: string;
  label: string;
  color: string;
  filename: string;
  file: File;
  summary: Record<string, number | null>;
  citation: string;
  reference: string;
  calls: any[];
  deposit: boolean; // also send this table to the repository (Zenodo) with the recording
};
type Tool = {
  tool: string;
  label: string;
  color: string;
  formats: string[];
  help: string;
  citation: string;
  reference: string;
};

const outputs = defineModel<Output[]>({ default: () => [] });
const apiBaseUrl = useApiBaseUrl();
const tools = ref<Tool[]>([]);
const busy = ref<string | null>(null);
const errors = ref<Record<string, string>>({});
const previewing = ref<Output | null>(null);
const inputs = ref<Record<string, HTMLInputElement | null>>({});

onMounted(async () => {
  try {
    tools.value = (await axios.get(`${apiBaseUrl}/usv-detection/tools/`)).data;
  } catch {
    tools.value = [];
  }
});

const outputOf = (tool: string) => outputs.value.find((o) => o.tool === tool);

async function choose(tool: Tool, event: Event) {
  const input = event.target as HTMLInputElement;
  const chosen = input.files?.[0];
  if (!chosen) return;
  // a copy held in memory: the table is small, and it stays readable when the form is sent later
  const file = new File([await chosen.arrayBuffer()], chosen.name, { type: chosen.type });
  input.value = ''; // the same file can be chosen again
  busy.value = tool.tool;
  errors.value = { ...errors.value, [tool.tool]: '' };
  try {
    const body = new FormData();
    body.append('tool', tool.tool);
    body.append('file', file);
    const res = await axios.post(`${apiBaseUrl}/usv-detection/preview/`, body, {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
    });
    if (!res.data?.summary || !Array.isArray(res.data?.calls)) throw new Error('unexpected answer');
    const output: Output = {
      tool: tool.tool,
      label: tool.label,
      color: tool.color,
      filename: file.name,
      file,
      summary: res.data.summary,
      citation: res.data.citation,
      reference: res.data.reference,
      calls: res.data.calls,
      deposit: false, // never by default
    };
    outputs.value = [...outputs.value.filter((o) => o.tool !== tool.tool), output];
  } catch (e: any) {
    errors.value = {
      ...errors.value,
      [tool.tool]: e?.response?.data?.error || 'This file could not be read. Try again.',
    };
  } finally {
    busy.value = null;
  }
}
const remove = (tool: string) => (outputs.value = outputs.value.filter((o) => o.tool !== tool));
const asDetection = (o: Output) => ({
  tool: o.tool,
  label: o.label,
  color: o.color,
  tool_version: '',
  parameters: '',
  reference: o.reference,
  citation: o.citation,
  summary: o.summary,
  calls: o.calls,
});
</script>

<template>
  <section v-if="tools.length" class="uo">
    <div class="uo-head">
      <span class="uo-icon" aria-hidden="true"><v-icon icon="mdi-waveform" /></span>
      <div>
        <h3 class="uo-title">Detector results <span class="uo-optional">optional</span></h3>
        <p class="uo-lead">
          You already ran a detector on this recording? Add its table: people will see the calls it
          found and can choose the tool they trust. Your table stays on mouseTube to draw the
          preview; tick the box of a table to send it to Zenodo too, with the recording.
        </p>
      </div>
    </div>

    <div class="uo-grid">
      <div
        v-for="t in tools"
        :key="t.tool"
        class="uo-card"
        :class="{ 'uo-card--set': outputOf(t.tool) }"
      >
        <div class="uo-card-head">
          <UsvToolIcon :tool="t.tool" :label="t.label" :color="t.color" :size="34" />
          <div class="uo-card-title">
            <strong>{{ t.label }}</strong>
            <span>{{ t.formats.join(' or ') }}</span>
          </div>
        </div>

        <template v-if="outputOf(t.tool)">
          <div class="uo-file" :title="outputOf(t.tool)!.filename">
            <v-icon size="16" class="me-1">mdi-file-check-outline</v-icon>
            <span class="uo-file-name">{{ outputOf(t.tool)!.filename }}</span>
          </div>
          <div class="uo-summary">
            <strong>{{ outputOf(t.tool)!.summary.calls }}</strong> calls ·
            {{ outputOf(t.tool)!.summary.calls_per_min }} per minute
          </div>
          <v-checkbox
            v-model="outputOf(t.tool)!.deposit"
            density="compact"
            hide-details
            color="primary"
            label="Also send this table to Zenodo with the recording"
            class="uo-deposit"
          />
          <div class="uo-actions">
            <v-btn
              size="small"
              variant="tonal"
              color="primary"
              prepend-icon="mdi-eye-outline"
              @click="previewing = outputOf(t.tool)!"
              >Preview</v-btn
            >
            <v-btn size="small" variant="text" color="grey-darken-1" @click="remove(t.tool)"
              >Remove</v-btn
            >
          </div>
        </template>
        <template v-else>
          <p class="uo-help">{{ t.help }}</p>
          <v-btn
            size="small"
            variant="outlined"
            prepend-icon="mdi-plus"
            :loading="busy === t.tool"
            @click="inputs[t.tool]?.click()"
            >Add results</v-btn
          >
        </template>
        <input
          :ref="(el) => (inputs[t.tool] = el as HTMLInputElement | null)"
          type="file"
          class="uo-input"
          :accept="t.formats.join(',')"
          @change="choose(t, $event)"
        />
        <p v-if="errors[t.tool]" class="uo-error" role="alert">{{ errors[t.tool] }}</p>
      </div>
    </div>

    <v-dialog :model-value="!!previewing" max-width="900" @update:model-value="previewing = null">
      <v-card v-if="previewing" rounded="xl" class="pa-4">
        <div class="d-flex align-center mb-2">
          <h3 class="text-h6 flex-grow-1">What people will see for this file</h3>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            aria-label="Close"
            @click="previewing = null"
          />
        </div>
        <UsvDetections :detections="[asDetection(previewing)]" preview />
      </v-card>
    </v-dialog>
  </section>
</template>

<style scoped>
.uo {
  margin: 4px 0 20px;
  padding: 16px;
  border: 1px solid #e4e4e4;
  border-radius: 16px;
  background: #fafafa;
}
.uo-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.uo-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #fdecea;
  color: #c62828;
  flex: none;
}
.uo-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}
.uo-optional {
  margin-left: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #888;
}
.uo-lead {
  margin: 2px 0 0;
  color: #666;
  font-size: 0.85rem;
}
.uo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.uo-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e4e4e4;
  border-radius: 12px;
  background: #fff;
}
.uo-card--set {
  border-color: #c62828;
  background: #fdf4f3;
}
.uo-card-head {
  display: flex;
  gap: 10px;
  align-items: center;
}
.uo-card-title {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.uo-card-title span {
  font-size: 0.75rem;
  color: #888;
}
.uo-help {
  margin: 0;
  font-size: 0.8rem;
  color: #666;
}
.uo-file {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  color: #444;
  min-width: 0;
}
.uo-file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.uo-summary {
  font-size: 0.85rem;
}
.uo-actions {
  display: flex;
  gap: 6px;
}
.uo-input {
  display: none;
}
.uo-error {
  margin: 0;
  color: #b71c1c;
  font-size: 0.8rem;
}
</style>
