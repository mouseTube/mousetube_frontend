import vuetify from 'vite-plugin-vuetify'
import { commonjsDeps } from '@koumoul/vjsf/utils/build.js'

export default defineNuxtConfig({
  devtools: { enabled: true },
  css: ['vuetify/lib/styles/main.sass', '@mdi/font/css/materialdesignicons.min.css'],
  build: {
    transpile: ['vuetify', 'chart.js', '@koumoul/vjsf'],
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
    optimizeDeps: {
      include: [...commonjsDeps, 'ajv-i18n'],
    },
    ssr: {
      noExternal: ['ajv-i18n', '@koumoul/vjsf', '@json-layout/core', '@json-layout/vocabulary'],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    define: {
      'process.env.DEBUG': false,
    },
    resolve: {
      alias: {
        'ajv-i18n': require.resolve('ajv-i18n'),
      },
    },
  },
})