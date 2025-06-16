// Created by Nicolas Torquet at 27/10/2023
// torquetn@igbmc.fr
// Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
// CNRS - Mouse Clinical Institute
// PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
// Code under GPL v3.0 licence


// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: true },
    css: ['vuetify/lib/styles/main.sass', '@mdi/font/css/materialdesignicons.min.css'],
  
    build: {
        transpile: ['vuetify', 'chart.js']
    },
  
    app: {
        head: {
            link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
            title: 'mouseTube'
        }
    },
  
    compatibilityDate: '2025-05-20',
    runtimeConfig: {
      public: {
        apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api'
      }
    },
  modules: [
      '@pinia/nuxt',
  ],
  ssr: false,
})
