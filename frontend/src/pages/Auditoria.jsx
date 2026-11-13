import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { Aviso, Busqueda, Pagina, Paginacion, Vacio, algunoEmpieza, formatoFecha, paginaDe } from '../ui'

export default function Auditoria() {
  const [eventos, setEventos] = useState([])
  const [consulta, setConsulta] = useState('')
  const [pagina, setPagina] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/auditoria')
      .then((data) => {
        setEventos([...data].sort((a, b) => String(b.fechaEvento).localeCompare(String(a.fechaEvento))))
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => { setPagina(0) }, [consulta])

  const filtrados = useMemo(
    () => eventos.filter((evento) => algunoEmpieza(consulta, [evento.accion, evento.entidad, evento.usuario?.usuario, evento.observaciones])),
    [eventos, consulta],
  )
  const visibles = paginaDe(filtrados, pagina)

  return (
    <Pagina titulo="Auditoría" texto="Historial de inicios de sesión, cambios del catálogo, préstamos, devoluciones e incidencias.">
      <Aviso>{error}</Aviso>
      <Busqueda valor={consulta} onChange={setConsulta} placeholder="Acción, entidad o usuario" />
      {filtrados.length === 0 ? <Vacio>No hay eventos que empiecen por ese texto.</Vacio> : (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Anterior</th><th>Nuevo</th><th>Nota</th></tr>
            </thead>
            <tbody>
              {visibles.map((evento) => (
                <tr key={evento.idAuditoria}>
                  <td>{formatoFecha(evento.fechaEvento)}</td>
                  <td>{evento.usuario?.usuario || '—'}</td>
                  <td>{evento.accion}</td>
                  <td>{evento.entidad} #{evento.idEntidad}</td>
                  <td>{evento.valorAnterior || '—'}</td>
                  <td>{evento.valorNuevo || '—'}</td>
                  <td>{evento.observaciones || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Paginacion pagina={pagina} total={filtrados.length} onChange={setPagina} />
        </div>
      )}
    </Pagina>
  )
}
