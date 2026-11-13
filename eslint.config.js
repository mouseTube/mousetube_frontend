import { createConfigForNuxt } from '@nuxt/eslint-config/flat';
import prettier from 'eslint-plugin-prettier';

export default createConfigForNuxt({
  features: { stylistic: false },
}).append({
  plugins: { prettier },
  rules: {
    'no-console': 'warn',
    'no-undef': 'off', // composables are auto-imported by Nuxt
    'vue/no-multiple-template-root': 'off',
    'vue/no-v-html': 'off',
    'vue/html-self-closing': 'off',
    'vue/attributes-order': 'off',
    'vue/v-slot-style': 'off',
    'vue/v-bind-style': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'vue/valid-v-slot': ['warn', { allowModifiers: true }], // Vuetify slots like #item.name
    'vue/no-unused-vars': 'warn',
    'vue/no-mutating-props': 'warn',
    'vue/valid-v-for': 'warn',
    'no-unsafe-optional-chaining': 'warn',
    'preserve-caught-error': 'warn',
    '@typescript-eslint/no-dynamic-delete': 'warn',
    'prettier/prettier': 'error',
  },
});
