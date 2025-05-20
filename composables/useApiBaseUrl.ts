export const useApiBaseUrl = () => {
    const config = useRuntimeConfig()
    let url = config.public.apiBaseUrl
    if (!url.endsWith('/api')) {
      url = url.replace(/\/+$/, '') + '/api'
    }
  
    return url
  }