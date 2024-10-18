/*
Created by Nicolas Torquet at 16/10/2024
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
*/

import { defineStore } from "pinia";
import axios from "axios";

// export const useProtocolMetadata = defineStore('metadataStore', () => {
//     const truc = "gna !"
//     return {
//         truc
//     }
// })


export const useProtocolMetadata = defineStore('metadataStore', {
    state: () => ({
        protocol_metadata: "rien",
    }),
    actions: {
      async fetchProtocolMetadata() {
          const { data } = await useFetch('http://127.0.0.1:8000/api/protocol_metadata/')
          if (data.value){
              this.protocol_metadata = "data.value"
          }
          else {
              this.protocol_metadata = "rien"
          }
      },
    },
})