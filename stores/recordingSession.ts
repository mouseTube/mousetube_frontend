// ~/stores/recordingSession.ts
import { defineStore } from 'pinia'
import axios from 'axios'
import { useApiBaseUrl } from '@/composables/useApiBaseUrl'
import { useAuth } from '@/composables/useAuth'

export interface Study {
  id: number
  name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  created_at?: string | null
  modified_at?: string | null

}

export interface Protocol {
  id: number
  name: string
}

export interface SoftwareVersion {
  id: number
  software: {
    id: number
    name: string
    type: string
  }
  version: string
}

export interface Hardware {
  id: number
  name: string
  type: string
}

export interface Laboratory {
  id: number;
  name: string;
  institution?: string | null;
  unit?: string | null;
  address?: string | null;
  country?: string | null;
  contact?: string | null;
}

export interface AnimalProfile {
  id: number
  name: string
}

export interface RecordingSession {
  id: number
  name: string
  protocol: Protocol
  studies: Study[]
  description?: string | null
  date?: string | null
  status: 'draft' | 'published'
  duration?: number | null
  laboratory?: Laboratory | null
  animal_profiles: AnimalProfile[]

  context_temperature_value?: string | null
  context_temperature_unit?: '°C' | '°F' | null
  context_brightness?: number | null

  equipment_acquisition_software: SoftwareVersion[]
  equipment_acquisition_hardware_soundcards: Hardware[]
  equipment_acquisition_hardware_speakers: Hardware[]
  equipment_acquisition_hardware_amplifiers: Hardware[]
  equipment_acquisition_hardware_microphones: Hardware[]

  equipment_channels?: 'mono' | 'stereo' | 'more than 2' | null
  equipment_sound_isolation?:
    | 'soundproof room'
    | 'soundproof cage'
    | 'no specific sound isolation'
    | null

  created_at?: string | null
  modified_at?: string | null
}

export interface RecordingSessionPayload {
  name: string
  studies?: number[]
  description?: string | null
  date?: string | null
  status?: 'draft' | 'published'
  duration?: number | null
  laboratory?: number | null
  animal_profiles?: number[]

  context_temperature_value?: string | null
  context_temperature_unit?: '°C' | '°F' | null
  context_brightness?: number | null

  equipment_acquisition_software?: number[]
  equipment_acquisition_hardware_soundcards?: number[]
  equipment_acquisition_hardware_speakers?: number[]
  equipment_acquisition_hardware_amplifiers?: number[]
  equipment_acquisition_hardware_microphones?: number[]

  equipment_channels?: 'mono' | 'stereo' | 'more than 2' | null
  equipment_sound_isolation?:
    | 'soundproof room'
    | 'soundproof cage'
    | 'no specific sound isolation'
    | null
}

export const useRecordingSessionStore = defineStore('recordingSession', {
  state: () => ({
    sessions: [] as RecordingSession[],
    studies: [] as Study[],
    loadingSessions: false,
    loadingStudies: false,
    errorSessions: null as string | null,
    errorStudies: null as string | null,
  }),
  actions: {
    getAuthHeaders() {
      const { token } = useAuth()
      return token.value ? { Authorization: `Bearer ${token.value}` } : {}
    },
    async fetchSessions() {
      this.loadingSessions = true
      this.errorSessions = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        let url = `${apiBaseUrl}/recording-session/`
        const allSessions: RecordingSession[] = []

        while (url) {
          const res = await axios.get(url, { headers: this.getAuthHeaders() })
          if (Array.isArray(res.data.results)) {
            allSessions.push(...res.data.results)
          } else {
            allSessions.push(...res.data)
            break
          }
          url = res.data.next
        }

        this.sessions = allSessions
      } catch (err: any) {
        this.errorSessions = err.message || 'Failed to fetch recording sessions'
        this.sessions = []
      } finally {
        this.loadingSessions = false
      }
    },

    async fetchStudies() {
      this.loadingStudies = true
      this.errorStudies = null
      try {
        const apiBaseUrl = useApiBaseUrl()
        let url = `${apiBaseUrl}/study/`
        const allStudies: Study[] = []

        while (url) {
          const res = await axios.get(url, { headers: this.getAuthHeaders() })
          if (Array.isArray(res.data.results)) {
            allStudies.push(...res.data.results)
          } else {
            allStudies.push(...res.data)
            break
          }
          url = res.data.next
        }

        this.studies = allStudies
      } catch (err: any) {
        this.errorStudies = err.message || 'Failed to fetch studies'
        this.studies = []
      } finally {
        this.loadingStudies = false
      }
    },

    async createSession(data: RecordingSessionPayload) {
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.post(`${apiBaseUrl}/recording-session/`, data, {
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
          },
        })
        this.sessions.push(res.data)
        return res.data
      } catch (err: any) {
        throw err
      }
    },

    async updateSession(id: number, data: RecordingSessionPayload) {
      try {
        const apiBaseUrl = useApiBaseUrl()
        const res = await axios.patch(`${apiBaseUrl}/recording-session/${id}/`, data, {
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
          },
        })
        const index = this.sessions.findIndex(s => s.id === id)
        if (index !== -1) this.sessions[index] = res.data
        return res.data
      } catch (err: any) {
        throw err
      }
    },
    async updateSessionProtocol(id: number, protocolId: number) {
      try {
        const apiBaseUrl = useApiBaseUrl();
        const res = await axios.patch(
          `${apiBaseUrl}/recording-session/${id}/`,
          { protocol: protocolId },
          {
            headers: {
              'Content-Type': 'application/json',
              ...this.getAuthHeaders(),
            },
          },
        );
        const index = this.sessions.findIndex(s => s.id === id);
        if (index !== -1) this.sessions[index] = res.data;
        return res.data;
      } catch (err: any) {
        throw err;
      }
    },

    getSessionById(id: number): RecordingSession | null {
      return this.sessions.find(s => s.id === id) ?? null
    },

    getStudyById(id: number): Study | null {
      return this.studies.find(s => s.id === id) ?? null
    },
  }
})
