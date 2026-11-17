import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, definirAlPerderSesion } from './api'

const AuthContext = createContext(null)

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms))
}

function sePuedeReintentar(error) {
  return !error.status || error.status === 502 || error.status === 503 || error.status === 504
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [listo, setListo] = useState(false)
  const [arrancando, setArrancando] = useState(false)

  useEffect(() => {
    definirAlPerderSesion(() => setUsuario(null))
    let cancelado = false

    async function abrirSesion() {
      for (let intento = 1; intento <= 10; intento += 1) {
        try {
          const sesion = await api('/api/auth/me')
          if (!cancelado) {
            setUsuario(sesion && typeof sesion === 'object' ? sesion : null)
          }
          return
        } catch (error) {
          if (error.status === 401) {
            if (!cancelado) setUsuario(null)
            return
          }
          if (intento === 10 || !sePuedeReintentar(error)) {
            if (!cancelado) setUsuario(null)
            return
          }
          if (!cancelado) setArrancando(true)
          await esperar(Math.min(15000, 1500 * intento))
          if (cancelado) return
        }
      }
    }

    abrirSesion().finally(() => {
      if (!cancelado) {
        setArrancando(false)
        setListo(true)
      }
    })

    return () => {
      cancelado = true
    }
  }, [])

  const valor = useMemo(() => ({
    usuario,
    listo,
    arrancando,
    async entrar(credenciales) {
      const sesion = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credenciales),
      })
      setUsuario(sesion)
      return sesion
    },
    async salir() {
      try {
        await api('/api/auth/logout', { method: 'POST' })
      } finally {
        setUsuario(null)
      }
    },
  }), [usuario, listo, arrancando])

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
