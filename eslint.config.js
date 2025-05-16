import vue from 'eslint-plugin-vue';
import nuxt from 'eslint-plugin-nuxt';
import prettier from 'eslint-plugin-prettier';
import parser from 'vue-eslint-parser';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules', '.nuxt'],
  },
  {
    files: ['**/*.vue', '**/*.js'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      vue,
      nuxt,
      prettier,
    },
    rules: {
      'no-console': 'warn',
      'no-undef': 'off',

      'vue/no-multiple-template-root': 'off',
      'vue/no-v-html': 'off',

      'nuxt/no-env-in-hooks': 'error',
      'nuxt/no-globals-in-created': 'error',

      'prettier/prettier': 'error',
    },
    settings: {
      'vue/setup-compiler-macros': true,
    },
  },
];
