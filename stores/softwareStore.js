/*
Created by Nicolas Torquet at 31/10/2024
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
*/

import { defineStore } from 'pinia';

export const useSoftwareStore = defineStore('software', {
  state: () => ({
    software_loaded: false,
    software: {},
  }),
  actions: {
    async fetchSoftware() {
      try {
        const { data } = await useFetch('http://127.0.0.1:8000/api/software');
        this.software = data.value;
        this.software_loaded = true;
      } catch (error) {
        this.protocol_metadata_loaded = 'error';
      }
    },
  },
});

export const useAcquisitionSoftwareStore = defineStore('acquisition_software', {
  state: () => ({
    software_loaded: false,
    software: {},
  }),
  actions: {
    async fetchSoftware() {
      try {
        const { data } = await useFetch('http://127.0.0.1:8000/api/acquisition_software');
        this.software = data.value;
        this.software_loaded = true;
      } catch (error) {
        this.protocol_metadata_loaded = 'error';
      }
    },
  },
});
