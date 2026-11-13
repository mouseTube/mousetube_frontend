<!--
Created by Nicolas Torquet at 27/10/2023
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
-->

<script setup>
import { useAuth } from '@/composables/useAuth';

const auth = useAuth();
await auth.init();
</script>

<template>
  <div class="page-wrapper">
    <TheHeader />
    <div class="content">
      <slot />
    </div>
    <TheFooter />
  </div>
</template>

<style scoped>
.page-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.content {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  height: 100%;
}
</style>

<!-- Not scoped on purpose: shared look of the list pages (it targets Vuetify's own classes) -->
<style>
/* Shared look of the list pages: same soft cards, borders and neutral greys as the home page. */

/* search / filter bar */
.v-toolbar.border-sm {
  background: #fff !important;
  border-color: #e4e4e4 !important;
  border-radius: 16px !important;
  box-shadow: none !important;
}
.v-toolbar .v-field--variant-solo {
  background: #fff;
  border: 1.5px solid #bdbdbd;
  border-radius: 12px;
  box-shadow: none;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}
.v-toolbar .v-field--variant-solo:hover {
  border-color: #757575;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}
.v-toolbar .v-field--variant-solo.v-field--focused {
  border-color: #222;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

/* grey blocks (info text, search card) */
.v-card.bg-grey-lighten-4 {
  background: #f6f6f6 !important;
  border: 1px solid #e4e4e4;
  border-radius: 16px;
  box-shadow: none;
}

/* result cards */
.v-card.border-sm {
  border-color: #e4e4e4 !important;
  border-radius: 16px !important;
  box-shadow: none !important;
  overflow: hidden;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}
.v-card.border-sm:hover {
  border-color: #bdbdbd !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06) !important;
}
/* a big rectangle per entry (my vocalizations, my hardware, files...): the name and what it is,
   its state, its actions; the brand color on the left edge */
.entry-list {
  list-style: none;
  margin: 12px 0 16px;
  padding: 0;
  display: grid;
  gap: 10px;
}
.entry-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1.5px solid #c9c9c9;
  border-left: 5px solid rgb(var(--v-theme-primary));
  border-radius: 16px;
  background: #fff;
  transition:
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}
.entry-row:hover {
  border-color: #bdbdbd;
  border-left-color: rgb(var(--v-theme-primary));
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}
.entry-row--versions {
  grid-template-columns: 1fr minmax(200px, 260px) auto auto;
}
.entry-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  overflow-wrap: anywhere;
}
.entry-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #666;
}
.entry-help {
  margin-top: 2px;
  font-size: 0.8rem;
  color: #888;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.entry-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
@media (max-width: 700px) {
  .entry-row,
  .entry-row--versions {
    grid-template-columns: 1fr auto;
  }
  .entry-row--versions .entry-side {
    grid-column: 1 / -1;
  }
  .entry-actions {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
}

/* one card per entry of a list: a visible edge, the brand color on the left, room around */
.v-card.list-card {
  margin-top: 28px;
  border: 1.5px solid #c9c9c9 !important;
  border-left: 5px solid rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}
.v-card.list-card:hover {
  border-color: #bdbdbd !important;
  border-left-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.16) !important;
}
.v-card-item.bg-surface-light {
  background: #f1f1f1 !important;
}
.v-card.border-sm .v-card-actions {
  background: #f1f1f1 !important;
}

/* "More information" / "References" bars */
.v-expansion-panel {
  background: #fff;
  box-shadow: none !important;
}
.v-expansion-panel::after {
  display: none;
}
.v-expansion-panel-title {
  font-size: 0.9rem;
  font-weight: 600;
  border-top: 1px solid #eee;
}

/* page title and its counter */
h1 {
  letter-spacing: -0.01em;
}

/* pagination */
.v-btn--icon.v-btn--variant-outlined {
  border-color: #e4e4e4;
}

@media (prefers-reduced-motion: reduce) {
  .v-card.border-sm,
  .v-toolbar .v-field--variant-solo {
    transition: none;
  }
}

/* label above value, in a grid (vocalization cards) */
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 14px 24px;
  margin: 0;
  padding-right: 56px; /* room for the repository logo */
}
.fact dt {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #777;
}
.fact dd {
  margin: 2px 0 0;
  color: #111;
}

/* links inside chips (DOI) keep the chip's text color */
.v-chip a {
  color: inherit;
}

/* info cards (team page, other text pages): soft grey, thin border, no heavy shadow */
.v-card.v-card--variant-tonal.border.elevation-3 {
  background: #f6f6f6;
  border-color: #e4e4e4 !important;
  border-radius: 16px !important;
  box-shadow: none !important;
}
.v-card.v-card--variant-tonal.border.elevation-3 > .v-card__underlay {
  display: none;
}
.v-card.v-card--variant-tonal.border.elevation-3 .v-list,
.v-card.v-card--variant-tonal.border.elevation-3 .v-card-text {
  background: transparent;
}

/* large and ultra-wide screens: keep the page content in a readable column (the top bar uses the
   whole width: the logo and the profile stay at the edges of the screen) */
@media (min-width: 1920px) {
  .v-container:not(.v-container--fluid) {
    max-width: 1280px;
  }
}

/* small label with a red bar, above a page title */
.eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0 8px;
  color: #555;
}
.title-bar {
  width: 40px;
  height: 4px;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
}

/* dialogs (creation and selection forms): rounded, scrollable body, footer bar */
.v-dialog > .v-overlay__content > .v-card {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  border-radius: 20px;
}
.v-dialog > .v-overlay__content > .v-card > .v-card-title {
  padding: 20px 24px 4px;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.v-dialog > .v-overlay__content > .v-card > .v-card-text {
  overflow-y: auto;
  padding-top: 12px;
}
.v-dialog > .v-overlay__content > .v-card > .v-card-actions {
  padding: 12px 24px 16px;
  border-top: 1px solid #eee;
}
/* the title of the creation forms: a small icon tile, like the selection modals */
.v-card-title.form-title {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: normal;
}
.form-title .form-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #fdecea;
  color: #c62828;
  flex: none;
}
.modal-note {
  padding: 0 24px;
  white-space: normal;
  opacity: 1;
  color: #666;
}
/* the choices of the selection modals: a card with the red edge of the lists, tinted when chosen */
.pick-card.v-card {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid #e4e4e4;
  border-left: 4px solid rgb(var(--v-theme-primary));
  border-radius: 12px;
  box-shadow: none;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}
.pick-card.v-card:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}
.pick-card.v-card:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.pick-card.pick-card--static.v-card {
  cursor: default;
}
.pick-card .pick-foot--line {
  margin-top: 0;
  padding-top: 0;
  padding-bottom: 4px;
  border-top: 1px dashed #eee;
}
.pick-card--selected.v-card {
  border-color: rgb(var(--v-theme-primary));
  background: #fdf4f3;
}
.pick-card .pick-title {
  padding: 12px 40px 0 14px;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  white-space: normal;
}
.pick-card .pick-text {
  padding: 4px 14px 8px;
  color: #555;
  font-size: 0.875rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pick-card .pick-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding: 6px 12px 6px 14px;
  color: #777;
  font-size: 0.75rem;
}
.pick-card .pick-check {
  position: absolute;
  top: 10px;
  right: 10px;
}
.pick-card .pick-tools {
  display: flex;
  gap: 2px;
}
.pick-card .pick-tools .v-btn {
  color: #777;
}
.pick-card .pick-tools .v-btn:hover {
  color: rgb(var(--v-theme-primary));
}
</style>
