<script setup>
// Shows where an entry stands in the review (draft, waiting validation, validated) and lets
// its owner submit it, or withdraw it while it waits. Only an administrator validates.
import { computed, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import { useAuth } from '@/composables/useAuth';
import { useApiBaseUrl } from '@/composables/useApiBaseUrl';

const props = defineProps({
  endpoint: { type: String, required: true }, // 'software', 'hardware', 'laboratory'...
  id: { type: Number, default: null },
  status: { type: String, default: '' }, // read from the API when not given
  readonly: { type: Boolean, default: false }, // somebody else's entry: show only
  compact: { type: Boolean, default: false },
});
const emit = defineEmits(['changed']);

const { token } = useAuth();
const apiBaseUrl = useApiBaseUrl();
const current = ref(props.status || 'draft');

const load = async () => {
  if (props.status || !props.id) return;
  try {
    const res = await axios.get(`${apiBaseUrl}/${props.endpoint}/${props.id}/`, {
      headers: token.value ? { Authorization: `Bearer ${token.value}` } : {},
    });
    current.value = res.data?.status || 'draft';
  } catch {
    /* the status stays unknown: the chip shows draft */
  }
};
onMounted(load);
watch(() => props.id, load);
watch(
  () => props.status,
  (value) => value && (current.value = value)
);
const saving = ref(false);
const error = ref('');

const STATES = {
  draft: {
    color: 'grey',
    icon: 'mdi-pencil-outline',
    label: 'Draft',
    help: 'Only you can see it. Submit it for review to make it available to everybody.',
  },
  'waiting validation': {
    color: 'warning',
    icon: 'mdi-clock-outline',
    label: 'Waiting for validation',
    help: 'An administrator is reviewing it. You can withdraw it to change it.',
  },
  validated: {
    color: 'success',
    icon: 'mdi-check-circle-outline',
    label: 'Validated',
    help: 'Validated by an administrator and visible to everybody. It can no longer be changed here: ask an administrator.',
  },
};
const state = computed(() => STATES[current.value] || STATES.draft);

const change = async (next) => {
  if (!props.id) return;
  saving.value = true;
  error.value = '';
  try {
    await axios.patch(
      `${apiBaseUrl}/${props.endpoint}/${props.id}/`,
      { status: next },
      { headers: { Authorization: `Bearer ${token.value}` } }
    );
    current.value = next;
    emit('changed', next);
  } catch (e) {
    const data = e?.response?.data;
    error.value =
      (typeof data === 'object' && (data.status?.[0] || data.detail)) ||
      'The change could not be saved. Please try again.';
  } finally {
    saving.value = false;
  }
};
</script>

<template>
  <div class="review-status" :class="{ compact }">
    <v-chip :color="state.color" variant="tonal" size="small" label>
      <v-icon start size="14">{{ state.icon }}</v-icon>
      {{ state.label }}
    </v-chip>
    <template v-if="!readonly && id">
      <v-btn
        v-if="current === 'draft'"
        size="small"
        variant="outlined"
        color="primary"
        :loading="saving"
        @click="change('waiting validation')"
      >
        Submit for review
      </v-btn>
      <v-btn
        v-else-if="current === 'waiting validation'"
        size="small"
        variant="text"
        :loading="saving"
        @click="change('draft')"
      >
        Withdraw
      </v-btn>
    </template>
    <span v-if="!compact" class="text-caption text-medium-emphasis">{{ state.help }}</span>
    <span v-if="error" class="text-caption text-error" role="alert">{{ error }}</span>
  </div>
</template>

<style scoped>
.review-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
}
</style>
