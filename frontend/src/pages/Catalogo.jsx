import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, descargar } from '../api'
import { useAuth } from '../auth'
import { esAdmin, puede } from '../permisos'
import { Aviso, Campo, Confirmar, FILAS_POR_PAGINA, Pagina, Vacio, formatoFecha } from '../ui'

const FILTRO_INICIAL = { titulo: '', autor: '', cota: '', tipo: '' }

function parametrosDe(filtro, pagina) {
  const params = new URLSearchParams({
    limite: String(FILAS_POR_PAGINA),
    pagina: String(pagina),
  })
  for (const [clave, valor] of Object.entries(filtro)) {
    const texto = valor.trim()
    if (texto) params.set(clave, texto)
  }
  return params.toString()
}

export default function Catalogo() {
  const { usuario } = useAuth()
  const crear = puede(usuario, 'puedeCrearLibros')
  const admin = esAdmin(usuario)
  const [filtro, setFiltro] = useState(FILTRO_INICIAL)
  const [consulta, setConsulta] = useState(FILTRO_INICIAL)
  const [pagina, setPagina] = useState(0)
  const [libros, setLibros] = useState([])
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [historial, setHistorial] = useState(null)
  const [versionElegida, setVersionElegida] = useState(null)
  const [confirmarVersion, setConfirmarVersion] = useState(false)
  const archivo = useRef(null)
  const pedido = useRef(0)

  useEffect(() => {
    const espera = setTimeout(() => {
      setPagina(0)
      setConsulta(filtro)
    }, 300)
    return () => clearTimeout(espera)
  }, [filtro])

  useEffect(() => {
    const id = ++pedido.current
    setCargando(true)
    setError('')
    api(`/api/libros/catalogo?${parametrosDe(consulta, pagina)}`)
      .then((lista) => {
        if (id !== pedido.current) return
        setLibros(lista)
      })
      .catch((err) => {
        if (id !== pedido.current) return
        setError(err.message)
        setLibros([])
      })
      .finally(() => {
        if (id === pedido.current) setCargando(false)
      })
  }, [consulta, pagina])

  async function descargarExcel() {
    setError('')
    setAviso('')
    setDescargando(true)
    try {
      await descargar('/api/libros/exportar', 'inventario-biblioteca-fau.xlsx')
    } catch (err) {
      setError(err.message)
    } finally {
      setDescargando(false)
    }
  }

  async function subirExcel(evento) {
    const elegido = evento.target.files?.[0]
    evento.target.value = ''
    if (!elegido) return
    setError('')
    setAviso('')
    setSubiendo(true)
    try {
      const datos = new FormData()
      datos.append('archivo', elegido)
      setAviso('Importando el Excel. Con inventarios grandes puede tardar varios minutos…')
      const resultado = await api('/api/libros/importar', { method: 'POST', body: datos })
      setAviso(`Se cargaron ${resultado.cargadas} obras. Se ignoraron ${resultado.ignoradas} porque ya estaban en el catálogo.`)
      setPagina(0)
      setConsulta({ ...filtro })
    } catch (err) {
      setError(
        err.message.includes('despertando') || err.status === 502 || err.status === 503 || err.status === 500
          ? 'La importación falló. El Excel completo es muy grande para el servidor gratuito: divide el archivo en partes de unas 40 filas.'
          : err.message,
      )
    } finally {
      setSubiendo(false)
    }
  }

  async function abrirHistorial(libro) {
    setVersionElegida(null)
    setConfirmarVersion(false)
    setHistorial({ libro, eventos: [], cargando: true, error: '' })
    try {
      const eventos = await api(`/api/auditoria?entidad=LIBROS&idEntidad=${libro.idLibro}`)
      setHistorial({ libro, eventos, cargando: false, error: '' })
    } catch (err) {
      setHistorial({ libro, eventos: [], cargando: false, error: err.message })
    }
  }

  async function restaurarVersion() {
    setError('')
    setAviso('')
    try {
      await api(`/api/libros/${historial.libro.idLibro}/restaurar?idAuditoria=${versionElegida}`, { method: 'POST' })
      setAviso('La obra volvió a la versión seleccionada.')
      setHistorial(null)
      setVersionElegida(null)
      setConfirmarVersion(false)
      setPagina(0)
      setConsulta({ ...filtro })
    } catch (err) {
      setHistorial((actual) => ({ ...actual, error: err.message }))
      setConfirmarVersion(false)
    }
  }

  function cambiar(evento) {
    const { name, value } = evento.target
    setFiltro((actual) => ({ ...actual, [name]: value }))
  }

  const hayMas = libros.length >= FILAS_POR_PAGINA

  return (
    <Pagina
      titulo="Catálogo"
      texto="Escribe y la lista se reduce a lo que empieza por ese texto: título, autor, cota o tipo. Se muestran 50 obras por página."
      acciones={(
        <>
          <button className="boton boton-secundario" type="button" onClick={descargarExcel} disabled={descargando}>
            {descargando ? 'Preparando Excel…' : 'Descargar Excel'}
          </button>
          {crear && (
            <>
              <button className="boton boton-secundario" type="button" onClick={() => archivo.current?.click()} disabled={subiendo}>
                {subiendo ? 'Cargando Excel…' : 'Cargar Excel con datos'}
              </button>
              <input ref={archivo} type="file" accept=".xlsx" hidden onChange={subirExcel} />
              <Link className="boton" to="/libros/nuevo">Nueva obra</Link>
            </>
          )}
        </>
      )}
    >
      <form className="filtros" onSubmit={(evento) => evento.preventDefault()}>
        <Campo etiqueta="Título">
          <input name="titulo" value={filtro.titulo} onChange={cambiar} placeholder="Empieza por…" />
        </Campo>
        <Campo etiqueta="Autor">
          <input name="autor" value={filtro.autor} onChange={cambiar} placeholder="Empieza por…" />
        </Campo>
        <Campo etiqueta="Cota">
          <input name="cota" value={filtro.cota} onChange={cambiar} placeholder="Empieza por…" />
        </Campo>
        <Campo etiqueta="Tipo">
          <input name="tipo" value={filtro.tipo} onChange={cambiar} placeholder="Empieza por…" />
        </Campo>
      </form>
      <Aviso>{error}</Aviso>
      <Aviso tipo="ok">{aviso}</Aviso>
      {cargando ? <p className="nota">Cargando catálogo…</p> : libros.length === 0 ? (
        <Vacio>No hay obras que empiecen por ese texto.</Vacio>
      ) : (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Autores</th>
                <th>Tipo</th>
                <th>Año</th>
                <th>Cota</th>
                <th>Editorial</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {libros.map((libro) => (
                <tr key={libro.idLibro}>
                  <td>
                    <Link to={`/libros/${libro.idLibro}`}>{libro.titulo}</Link>
                    {libro.requiereRevisionFecha && <span className="marca-estado pendiente">Fecha por revisar</span>}
                  </td>
                  <td>{libro.autores || '—'}</td>
                  <td>{libro.tipo || '—'}</td>
                  <td>{libro.fechaPublicacion || libro.fechaOriginal || '—'}</td>
                  <td>{libro.cota || '—'}</td>
                  <td>{libro.editorial || '—'}</td>
                  <td className="acciones-tabla">
                    <button type="button" className="icono" title="Historial" aria-label="Historial de cambios" onClick={() => abrirHistorial(libro)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="8" />
                        <path d="M12 8v5l3 2" />
                      </svg>
                    </button>
                    <Link to={`/libros/${libro.idLibro}`}>Abrir</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!cargando && (pagina > 0 || hayMas) && (
        <div className="acciones" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
          <p className="nota">
            Página {pagina + 1}: {libros.length} obra{libros.length === 1 ? '' : 's'}
          </p>
          <div className="acciones">
            <button className="boton boton-secundario" type="button" disabled={pagina <= 0 || cargando} onClick={() => setPagina((actual) => actual - 1)}>
              Anterior
            </button>
            <button className="boton boton-secundario" type="button" disabled={!hayMas || cargando} onClick={() => setPagina((actual) => actual + 1)}>
              Siguiente
            </button>
          </div>
        </div>
      )}
      {historial && (
        <div className="velo" onMouseDown={() => setHistorial(null)}>
          <div className="dialogo dialogo-ancho" onMouseDown={(evento) => evento.stopPropagation()}>
            <h2>Historial</h2>
            <p className="nota">{historial.libro.titulo}</p>
            {admin && historial.eventos?.length > 0 && (
              <p className="nota">Selecciona una fila para devolver la obra a ese momento.</p>
            )}
            <Aviso>{historial.error}</Aviso>
            {historial.cargando ? <p className="nota">Cargando cambios…</p> : historial.eventos.length === 0 ? (
              <Vacio>Esta obra todavía no tiene cambios registrados.</Vacio>
            ) : (
              <div className="tabla-contenedor">
                <table>
                  <thead>
                    <tr><th>Fecha</th><th>Quién</th><th>Dónde</th><th>Antes</th><th>Después</th></tr>
                  </thead>
                  <tbody>
                    {historial.eventos.map((evento) => (
                      <tr
                        key={evento.idAuditoria}
                        className={admin && String(versionElegida) === String(evento.idAuditoria) ? 'fila-elegida' : undefined}
                        onClick={() => admin && setVersionElegida(evento.idAuditoria)}
                        style={admin ? { cursor: 'pointer' } : undefined}
                      >
                        <td>{formatoFecha(evento.fechaEvento)}</td>
                        <td>{evento.usuario ? `${evento.usuario.nombre || ''} ${evento.usuario.apellido || ''}`.trim() || evento.usuario.usuario : '—'}</td>
                        <td>{evento.accion}</td>
                        <td><pre className="mini">{evento.valorAnterior || '—'}</pre></td>
                        <td><pre className="mini">{evento.valorNuevo || '—'}</pre></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="acciones-form">
              {admin && (
                <button
                  type="button"
                  className="boton"
                  disabled={!versionElegida}
                  onClick={() => setConfirmarVersion(true)}
                >
                  Restaurar versión
                </button>
              )}
              <button type="button" className="boton boton-secundario" onClick={() => setHistorial(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {confirmarVersion && (
        <Confirmar
          titulo="¿Restaurar esta versión?"
          texto="La obra volverá al estado de la fila seleccionada."
          onCancelar={() => setConfirmarVersion(false)}
          onConfirmar={restaurarVersion}
        />
      )}
    </Pagina>
  )
}
