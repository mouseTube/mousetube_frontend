<script setup lang="ts">
// The frame of the selection modals (studies, hardware, software, strains, animals...): a header
// with what is being chosen, a toolbar for the search, the list, and a footer with the actions
// and the button that closes the choice. The modals only bring their own lists.
defineProps<{
  title: string;
  subtitle?: string;
  icon?: string;
  selected?: number; // how many are chosen, shown on the closing button
  doneLabel?: string;
}>();
const emit = defineEmits<{ (e: 'close'): void }>();
</script>

<template>
  <v-card class="picker" rounded="xl">
    <header class="picker-head">
      <span v-if="icon" class="picker-icon" aria-hidden="true"><v-icon :icon="icon" /></span>
      <div class="picker-titles">
        <h2 class="picker-title">{{ title }}</h2>
        <p v-if="subtitle" class="picker-subtitle">{{ subtitle }}</p>
      </div>
      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        color="grey-darken-1"
        aria-label="Close"
        @click="emit('close')"
      />
    </header>

    <div v-if="$slots.toolbar" class="picker-toolbar"><slot name="toolbar" /></div>

    <div class="picker-body"><slot /></div>

    <footer class="picker-foot">
      <div class="picker-actions"><slot name="actions" /></div>
      <v-btn color="primary" variant="flat" @click="emit('close')">
        {{ doneLabel || 'Done' }}
        <span v-if="selected" class="picker-count">{{ selected }}</span>
      </v-btn>
    </footer>
  </v-card>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.picker-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 20px 12px 24px;
}
.picker-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #fdecea;
  color: #c62828;
  flex: none;
}
.picker-titles {
  flex: 1;
  min-width: 0;
}
.picker-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
}
.picker-subtitle {
  margin: 2px 0 0;
  color: #666;
  font-size: 0.875rem;
}
.picker-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 24px 12px;
}
.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 24px 16px;
  min-height: 120px;
}
.picker-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px 16px;
  border-top: 1px solid #eee;
  background: #fff;
}
.picker-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.picker-count {
  margin-left: 8px;
  min-width: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: #fff;
  color: #c62828;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 20px;
}
@media (max-width: 600px) {
  .picker-head,
  .picker-toolbar,
  .picker-body,
  .picker-foot {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
