import vuetify from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  devtools: { enabled: true },
  css: [
    'vuetify/lib/styles/main.sass',
    '@mdi/font/css/materialdesignicons.min.css'
  ],
  build: {
    transpile: ['vuetify', 'chart.js'],
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
  modules: ['@pinia/nuxt'],
  ssr: false,
  vite: {
    plugins: [vuetify()],
    define: {
      'process.env.DEBUG': false,
    },
  },
})
