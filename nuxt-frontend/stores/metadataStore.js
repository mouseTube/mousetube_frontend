/*
Created by Nicolas Torquet at 16/10/2024
torquetn@igbmc.fr
Copyright: CNRS - INSERM - UNISTRA - ICS - IGBMC
CNRS - Mouse Clinical Institute
PHENOMIN, CNRS UMR7104, INSERM U964, Université de Strasbourg
Code under GPL v3.0 licence
*/

import { defineStore } from "pinia";

export const useProtocolMetadataStore = defineStore('prometadata', {
    state: () => ({
        protocol_metadata_loaded: false,
        protocol_metadata: {},
        metadata_category: {},

    }),
    actions: {
        orderProtocolMetadata() {
          for(let metadata in this.protocol_metadata){
            for(let metadata_field in this.protocol_metadata[metadata]['metadata_field']){
              for(let metadata_category in this.protocol_metadata[metadata]['metadata_field'][metadata_field]['metadata_category']){
                let name_metadata_category = this.protocol_metadata[metadata]['metadata_field'][metadata_field]['metadata_category'][metadata_category]['name_metadata_category']
                if(!(name_metadata_category in this.metadata_category)){
                  // console.log(name_metadata_category)
                  this.metadata_category[name_metadata_category] = {}
                }

                let name_metadata_field = this.protocol_metadata[metadata]['metadata_field'][metadata_field]['name_metadata_field']
                // console.log(name_metadata_field)
                if(!(name_metadata_field in this.metadata_category[name_metadata_category])){
                  this.metadata_category[name_metadata_category][name_metadata_field] = []
                }

                let name_metadata = this.protocol_metadata[metadata]['name_metadata']
                // console.log(name_metadata)
                this.metadata_category[name_metadata_category][name_metadata_field].push(name_metadata)
                  this.protocol_metadata_loaded = true
              }
            }
          }
          // console.log(this.metadata_category)
        },
          async fetchProtocolMetadata() {
              try {
                  const { data } = await useFetch('http://127.0.0.1:8000/api/protocol_metadata/')
                  this.protocol_metadata = data.value
                  this.metadata_category = {}
                  this.orderProtocolMetadata()
                  // showTooltip("ok")
              } catch(error) {
                  this.protocol_metadata_loaded = "error"
                  // showTooltip(error)
              }
          },
    },
})