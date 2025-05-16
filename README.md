# mousetube client (website)

### Description

Web client of mouseTube

<h1 align="center">mouseTube_frontendv0-5</h1>

![Build Passing](https://img.shields.io/github/actions/workflow/status/mouseTube/mousetube_frontendv0-5/ci.yml?branch=main)
[![Made with Nuxt](https://img.shields.io/badge/Made%20with-Nuxt-green)](https://nuxt.com/)
[![Made with Vuetify](https://img.shields.io/badge/Made%20with-Vuetify-1976D2)](https://vuetifyjs.com/)
[![Made with VueJS](https://img.shields.io/badge/Made%20with-VueJS-blue)](https://vuejs.org/)
[![Made with Nuxt](https://img.shields.io/badge/Made%20with-Nuxt-blue)](https://nuxt.com/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

<p align="center">
  <img src="https://mousetube.pasteur.fr/images/logo_mousetube_big.png" alt="Mousetube" width="50%">
</p>

## What is mouseTube?

**mouseTube** is a database designed to facilitate sharing, archiving, and analyzing raw recording files of rodent ultrasonic vocalizations following the FAIR (Findable, Accessible, Interoperable, Reusable) principles ([Wilkinson et al., 2016](https://doi.org/10.1038/sdata.2016.18)).

## Requirements

To run Mousetube Client locally, a working Mousetube API environment is required and the following tools have to be installed:

- [yarn](https://yarnpkg.com/) (or [npm](https://www.npmjs.com/))
- [nodejs](https://nodejs.org/)
- [Git](https://git-scm.com/)

## Installation

### Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

### Setup

Make sure to install dependencies:

```bash
# npm
npm install
# or yarn
yarn install
```

### Development Server

Start the development server on http://localhost:3000:

```bash
# npm
npm run dev

# or yarn
yarn dev
```

### Production

1. Add a .env file in the mousetube_frontendv0-5 folder with the following content:

   ```env
   DEBUG=false #DEBUG muste be false in production mode, not mandatory for development mode
   NUXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api #if not provided, the default value will be http://127.0.0.1:8000/api
   ```

2. Build the application for production:

```bash
# npm
npm run build

# or yarn
yarn build
```

## Check out mouseTube's publications:

- Torquet N., de Chaumont F., Faure P., Bourgeron T., Ey E. mouseTube – a database to collaboratively unravel mouse ultrasonic communication [version 1; peer review: 2 approved]. F1000Research 2016, 5:2332 ([F1000Research Link](https://doi.org/10.12688/f1000research.9439.1)) (2016).
