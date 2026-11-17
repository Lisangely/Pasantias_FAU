const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

let alPerderSesion = () => {}

export function definirAlPerderSesion(funcion) {
  alPerderSesion = funcion
}

function esHtml(data) {
  return typeof data === 'string' && (data.includes('<html') || data.includes('<!DOCTYPE'))
}

function mensajeDe(data, status) {
  if (!data) return `Error ${status}`
  if (typeof data === 'string') {
    if (esHtml(data)) {
      return 'La API no respondió. El servidor puede estar despertando; espera un minuto y recarga.'
    }
    return data
  }
  return data.detail || data.message || data.error || data.title || `Error ${status}`
}

export async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const esArchivo = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body != null && !esArchivo && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  let response
  try {
    response = await fetch(`${API}${path}`, {
      credentials: 'include',
      ...options,
      headers,
    })
  } catch {
    throw new Error(
      API
        ? `No se pudo conectar con la API en ${API}. Si acabas de despertar el servidor, espera un minuto y vuelve a intentar.`
        : 'No se pudo conectar con la API. Comprueba que el servidor esté en marcha.',
    )
  }

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (esHtml(data)) {
    const error = new Error('La API no respondió. El servidor puede estar despertando; espera un minuto y recarga.')
    error.status = 503
    throw error
  }

  if (response.status === 401 && path !== '/api/auth/login') {
    alPerderSesion()
  }

  if (!response.ok) {
    const mensaje = response.status === 502 || response.status === 503
      ? 'La API no está en marcha o sigue despertando. Espera un minuto y vuelve a intentar.'
      : mensajeDe(data, response.status)
    const error = new Error(mensaje)
    error.status = response.status
    throw error
  }

  return data
}

export async function descargar(path, nombre) {
  let response
  try {
    response = await fetch(`${API}${path}`, { credentials: 'include' })
  } catch {
    throw new Error(
      API
        ? `No se pudo conectar con la API en ${API}. Si acabas de despertar el servidor, espera un minuto y vuelve a intentar.`
        : 'No se pudo conectar con la API. Comprueba que el servidor esté en marcha.',
    )
  }

  if (!response.ok) {
    const text = await response.text()
    let data = text
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }
    if (response.status === 401) alPerderSesion()
    const mensaje = response.status === 502 || response.status === 503
      ? 'La API no está en marcha o sigue despertando. Espera un minuto y vuelve a intentar.'
      : mensajeDe(data, response.status)
    throw new Error(mensaje)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
