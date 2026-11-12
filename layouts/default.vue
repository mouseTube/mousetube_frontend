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

/* large and ultra-wide screens: keep the content (and the menu) in a readable column */
@media (min-width: 1920px) {
  .v-container:not(.v-container--fluid) {
    max-width: 1280px;
  }
  .v-app-bar .v-toolbar__content > .v-row {
    max-width: 1440px;
    margin-inline: auto;
  }
}
</style>
