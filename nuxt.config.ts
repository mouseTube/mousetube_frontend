import vuetify from 'vite-plugin-vuetify';
import pkg from './package.json';

export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['vuetify/lib/styles/main.sass', '@mdi/font/css/materialdesignicons.min.css'],
  build: {
    transpile: ['vuetify', 'chart.js'],
  },
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
      title: 'mouseTube',
    },
  },
  compatibilityDate: '2025-05-20',
  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api',
      appVersion: pkg.version, // shown in the footer: written once, in package.json
    },
  },
  modules: ['@pinia/nuxt'],
  ssr: false,
  vite: {
    plugins: [vuetify() as any],
    define: {
      'process.env.DEBUG': false,
    },
  },
});
