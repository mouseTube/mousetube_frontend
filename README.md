<h1 align="center">MouseTube client (website)</h1>

![Build Passing](https://img.shields.io/github/actions/workflow/status/mouseTube/mousetube_frontend/ci.yml?branch=main)
[![Made with Nuxt](https://img.shields.io/badge/Made%20with-Nuxt-green)](https://nuxt.com/)
[![Made with Vuetify](https://img.shields.io/badge/Made%20with-Vuetify-1976D2)](https://vuetifyjs.com/)
[![Made with VueJS](https://img.shields.io/badge/Made%20with-VueJS-blue)](https://vuejs.org/)
[![Made with Nuxt](https://img.shields.io/badge/Made%20with-Nuxt-blue)](https://nuxt.com/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

<p align="center">
  <img src="https://mousetube.pasteur.fr/images/logo_mousetube_big.png" alt="Mousetube" width="50%">
</p>

## What is mouseTube?

**MouseTube** is a database designed to facilitate sharing, archiving, and analyzing raw recording files of rodent ultrasonic vocalizations following the FAIR (Findable, Accessible, Interoperable, Reusable) principles ([Wilkinson et al., 2016](https://doi.org/10.1038/sdata.2016.18)).

## Requirements

To run Mousetube Client locally, a working Mousetube API environment is required and the following tools have to be installed:

- [Node.js](https://nodejs.org/) **24 or later** (see `engines` in `package.json`) with npm
- [Git](https://git-scm.com/)

The lock file is `package-lock.json`, so use npm (yarn is not tested).

## Installation

### Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

### Setup

Make sure to install dependencies:

```bash
npm install
```

Create a `.env` file (copy `.env.example`). The API must be reachable at `NUXT_PUBLIC_API_BASE_URL`.

### Development Server

Start the development server on http://localhost:3000 (with Docker, the container runs it only when `DEBUG=true` is set in its environment; the development compose file does it for you):

```bash
npm run dev
```

### Production

1. Create a `.env` file:

   ```env
   DEBUG=false
   NUXT_PUBLIC_API_BASE_URL=https://your-domain/api
   ```

   In Docker, `entrypoint.sh` starts the development server only when `DEBUG` is explicitly `true`: a missing `DEBUG` means production, `DEBUG=false` says it explicitly. If `NUXT_PUBLIC_API_BASE_URL` is missing, `http://127.0.0.1:8000/api` is used.

2. Build, then start the server:

   ```bash
   npm ci
   npm run build
   npm start
   ```

   With Docker, `entrypoint.sh` does these steps unless `DEBUG=true`.

### Quality checks

```bash
npm run lint
```

The access token lasts one hour and is renewed automatically with the refresh token (`composables/tokenRefresh.ts`, attached to the global axios by `plugins/axios-refresh.client.ts` and to the hardware store's own client). The file form reads `GET /api/file/upload-limit/` and refuses a file the server could not hold before sending it.

## Check out mouseTube's publications:

- Torquet N., de Chaumont F., Faure P., Bourgeron T., Ey E. mouseTube – a database to collaboratively unravel mouse ultrasonic communication [version 1; peer review: 2 approved]. F1000Research 2016, 5:2332 ([F1000Research Link](https://doi.org/10.12688/f1000research.9439.1)) (2016).
