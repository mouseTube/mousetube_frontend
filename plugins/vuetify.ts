// Created by Nicolas Torquet at 27/10/2023
// torquetn@igbmc.fr
// Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
// CNRS - Mouse Clinical Institute
// PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
// Code under GPL v3.0 licence


import { createVuetify } from "vuetify"
import * as components from "vuetify/components"
import * as directives from "vuetify/directives"
import { md3 } from 'vuetify/blueprints'
import 'vuetify/styles'

export default defineNuxtPlugin(nuxtApp => {
  const vuetify = createVuetify({
    blueprint: md3,
    components,
    directives,
    theme: {
      defaultTheme: 'mouseTubeTheme',
      themes: {
        mouseTubeTheme: {
          dark: false,
          colors: {
            primary: '#c62828',
            secondary: '#ef9a9a',
            background: '#ffffff',
            surface: '#ffffff',
            error: '#d32f2f',
            onPrimary: '#ffffff',
          },
        },
      },
      },
      defaults: {
        VChip: { rounded: 'pill' },
        VTabs: { rounded: 'md' },
        VBtn: { rounded: 'lg' },
      },
  })

  nuxtApp.vueApp.use(vuetify)
})
