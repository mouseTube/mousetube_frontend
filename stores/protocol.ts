import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '~/composables/useApiBaseUrl'

export interface Protocol {
  id: number
  name: string
  description: string
  animals: {
    sex: string
    age: string
    housing: string
    species: string
  }
  context: {
    'number of animals': number | null
    duration: string
    cage: string
    bedding: string
    light_cycle: string
    temperature: {
      value: number | string
      unit: string
    }
    brightness: number | null
  }
}

export interface ProtocolListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Protocol[]
}

/** Transforme un objet plat (Django) en objet imbriqué (frontend) */
function mapFlatProtocolToNested(flat: any): Protocol {
  return {
    id: flat.id,
    name: flat.name,
    description: flat.description ?? '',
    animals: {
      sex: flat.animals_sex ?? '',
      age: flat.animals_age ?? '',
      housing: flat.animals_housing ?? '',
      species: flat.animals_species ?? '',
    },
    context: {
      'number of animals': flat.context_number_of_animals ?? null,
      duration: flat.context_duration ?? '',
      cage: flat.context_cage ?? '',
      bedding: flat.context_bedding ?? '',
      light_cycle: flat.context_light_cycle ?? '',
      temperature: {
        value: flat.context_temperature_value ?? '',
        unit: flat.context_temperature_unit ?? '',
      },
      brightness: flat.context_brightness ?? null,
    }
  }
}

/** Transforme un objet imbriqué (frontend) en objet plat (Django API) */
function mapNestedProtocolToFlat(nested: Protocol | Omit<Protocol, 'id'>) {
  return {
    name: nested.name,
    description: nested.description,
    animals_sex: nested.animals.sex,
    animals_age: nested.animals.age,
    animals_housing: nested.animals.housing,
    animals_species: nested.animals.species,
    context_number_of_animals: nested.context['number of animals'],
    context_duration: nested.context.duration,
    context_cage: nested.context.cage,
    context_bedding: nested.context.bedding,
    context_light_cycle: nested.context.light_cycle,
    context_temperature_value: nested.context.temperature.value,
    context_temperature_unit: nested.context.temperature.unit,
    context_brightness: nested.context.brightness,
  }
}

export const useProtocolStore = defineStore('protocol', {
  state: () => ({
    protocols: {
      count: 0,
      next: null,
      previous: null,
      results: [] as Protocol[],
    } as ProtocolListResponse,
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchAllProtocols() {
      this.loading = true;
      this.error = null;
      try {
        const apiBaseUrl = useApiBaseUrl();
        let url = `${apiBaseUrl}/protocol/`;
        let allResults: Protocol[] = [];

        while (url) {
          const res = await axios.get(url);
          const pageResults = res.data.results.map(mapFlatProtocolToNested);
          allResults = allResults.concat(pageResults);
          url = res.data.next;  // URL de la page suivante, ou null si fin
        }

        this.protocols = {
          count: allResults.length,
          next: null,
          previous: null,
          results: allResults,
        };
      } catch (err: any) {
        this.error = err.message || 'Failed to fetch protocols';
      } finally {
        this.loading = false;
      }
    },

    getProtocolById(id: number): Protocol | null {
      console.log('All protocol IDs:', this.protocols.results.map(p => p.id));
      console.log('Requested ID:', id);
      return this.protocols.results.find(p => p.id === id) || null
    },

    async createProtocol(data: Omit<Protocol, 'id'>) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        const flatData = mapNestedProtocolToFlat(data)
        const res = await axios.post(`${apiBaseUrl}/protocol/`, flatData)
        const nestedProtocol = mapFlatProtocolToNested(res.data)
        this.protocols.results.push(nestedProtocol)
        return nestedProtocol
      } catch (err: any) {
        this.error = err.message || 'Failed to create protocol'
        throw err
      }
    },

    async updateProtocol(id: number, data: Partial<Protocol>) {
      this.error = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        // Note: on peut convertir partiellement mais ici on assume full update
        const flatData = mapNestedProtocolToFlat(data as Protocol)
        const res = await axios.put(`${apiBaseUrl}/protocol/${id}/`, flatData)
        const nestedProtocol = mapFlatProtocolToNested(res.data)
        const index = this.protocols.results.findIndex(p => p.id === id)
        if (index !== -1) this.protocols.results[index] = nestedProtocol
        return nestedProtocol
      } catch (err: any) {
        this.error = err.message || 'Failed to update protocol'
        throw err
      }
    },
  },
})
