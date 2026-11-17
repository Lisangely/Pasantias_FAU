import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { puede } from '../permisos'
import { Aviso, AvisarVacios, Busqueda, Campo, FILAS_POR_PAGINA, Pagina, Selector, Vacio, vacios } from '../ui'

const VACIO = { idLibro: '', idUbicacion: '', numeroEjemplar: '', disponible: true, requiereRevision: false }

export default function Ejemplares() {
  const { usuario } = useAuth()
  const crear = puede(usuario, 'puedeCrearEjemplares')
  const editarPermiso = puede(usuario, 'puedeActualizar')
  const [ejemplares, setEjemplares] = useState([])
  const [libros, setLibros] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  const [form, setForm] = useState(VACIO)
  const [editando, setEditando] = useState(null)
  const [filtro, setFiltro] = useState('')
  const [consulta, setConsulta] = useState('')
  const [pagina, setPagina] = useState(0)
  const [avisarVacios, setAvisarVacios] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const pedido = useRef(0)

  useEffect(() => {
    Promise.all([api('/api/libros/buscar'), api('/api/ubicaciones')])
      .then(([listaLibros, listaUbicaciones]) => {
        setLibros(listaLibros)
        setUbicaciones(listaUbicaciones)
      })
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    const espera = setTimeout(() => {
      setPagina(0)
      setConsulta(filtro.trim())
    }, 300)
    return () => clearTimeout(espera)
  }, [filtro])

  useEffect(() => {
    const id = ++pedido.current
    setCargando(true)
    setError('')
    const params = new URLSearchParams({
      limite: String(FILAS_POR_PAGINA),
      pagina: String(pagina),
    })
    if (consulta) params.set('titulo', consulta)
    api(`/api/ejemplares?${params}`)
      .then((lista) => {
        if (id !== pedido.current) return
        setEjemplares(lista)
      })
      .catch((err) => {
        if (id !== pedido.current) return
        setError(err.message)
        setEjemplares([])
      })
      .finally(() => {
        if (id === pedido.current) setCargando(false)
      })
  }, [consulta, pagina])

  const hayMas = ejemplares.length >= FILAS_POR_PAGINA

  function cambiar(evento) {
    const { name, value, type, checked } = evento.target
    setForm((actual) => ({ ...actual, [name]: type === 'checkbox' ? checked : value }))
  }

  async function guardar(evento, forzar = false) {
    if (evento) evento.preventDefault()
    const faltan = vacios([
      ['Ubicación', form.idUbicacion],
      ['Número de ejemplar', form.numeroEjemplar],
    ])
    if (!forzar && faltan.length) {
      setAvisarVacios(faltan)
      return
    }
    setAvisarVacios(null)
    setError('')
    const cuerpo = {
      idLibro: Number(form.idLibro),
      idUbicacion: form.idUbicacion ? Number(form.idUbicacion) : null,
      numeroEjemplar: form.numeroEjemplar === '' ? null : Number(form.numeroEjemplar),
      disponible: form.disponible,
      requiereRevision: form.requiereRevision,
    }
    try {
      if (editando) await api(`/api/ejemplares/${editando}`, { method: 'PUT', body: JSON.stringify(cuerpo) })
      else await api('/api/ejemplares', { method: 'POST', body: JSON.stringify(cuerpo) })
      setForm(VACIO)
      setEditando(null)
      setPagina(0)
      const params = new URLSearchParams({
        limite: String(FILAS_POR_PAGINA),
        pagina: '0',
      })
      if (consulta) params.set('titulo', consulta)
      setEjemplares(await api(`/api/ejemplares?${params}`))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <Pagina titulo="Ejemplares" texto="Cada copia física se presta por separado y tiene su propia ubicación.">
      <Aviso>{error}</Aviso>
      <Busqueda valor={filtro} onChange={setFiltro} placeholder="Título de la obra" />
      <div className="rejilla">
        {(crear || (editarPermiso && editando)) && <form className="panel" onSubmit={guardar}>
          <h2>{editando ? 'Editar ejemplar' : 'Nuevo ejemplar'}</h2>
          <Campo etiqueta="Obra">
            <Selector
              requerido
              placeholder="Escribe el título"
              valor={form.idLibro}
              onChange={(idLibro) => setForm((actual) => ({ ...actual, idLibro }))}
              opciones={libros.map((libro) => ({ valor: libro.idLibro, etiqueta: libro.titulo, claves: [libro.cota] }))}
            />
          </Campo>
          <Campo etiqueta="Ubicación">
            <Selector
              placeholder="Escribe la ubicación"
              valor={form.idUbicacion}
              onChange={(idUbicacion) => setForm((actual) => ({ ...actual, idUbicacion }))}
              opciones={ubicaciones.map((ubicacion) => ({ valor: ubicacion.idUbicacion, etiqueta: ubicacion.ubicacionOriginal }))}
            />
          </Campo>
          <Campo etiqueta="Número de ejemplar">
            <input name="numeroEjemplar" value={form.numeroEjemplar} onChange={cambiar} inputMode="numeric" />
          </Campo>
          <label className="chequeo">
            <input name="disponible" type="checkbox" checked={form.disponible} onChange={cambiar} />
            Disponible
          </label>
          <label className="chequeo">
            <input name="requiereRevision" type="checkbox" checked={form.requiereRevision} onChange={cambiar} />
            Requiere revisión
          </label>
          <div className="acciones">
            <button className="boton" type="submit">{editando ? 'Actualizar' : 'Guardar'}</button>
            {editando && <button className="boton boton-secundario" type="button" onClick={() => { setEditando(null); setForm(VACIO) }}>Cancelar</button>}
          </div>
        </form>}
        <div className="tabla-contenedor">
          {cargando ? <p className="nota">Cargando ejemplares…</p> : ejemplares.length === 0 ? (
            <Vacio>{consulta ? 'No hay ejemplares que empiecen por ese título.' : 'No hay ejemplares registrados.'}</Vacio>
          ) : (
            <>
              <table>
                <thead>
                  <tr><th>Obra</th><th>Nº</th><th>Ubicación</th><th>Estado</th><th></th></tr>
                </thead>
                <tbody>
                  {ejemplares.map((ejemplar) => (
                    <tr key={ejemplar.idEjemplar}>
                      <td>{ejemplar.libro?.titulo || '—'}</td>
                      <td>{ejemplar.numeroEjemplar ?? '—'}</td>
                      <td>{ejemplar.ubicacion?.ubicacionOriginal || '—'}</td>
                      <td><span className={`marca-estado ${ejemplar.disponible ? 'resuelto' : 'pendiente'}`}>{ejemplar.disponible ? 'Disponible' : 'No disponible'}</span></td>
                      <td>
                        {editarPermiso && (
                          <button type="button" onClick={() => {
                            setEditando(ejemplar.idEjemplar)
                            setForm({
                              idLibro: ejemplar.libro?.idLibro ?? '',
                              idUbicacion: ejemplar.ubicacion?.idUbicacion ?? '',
                              numeroEjemplar: ejemplar.numeroEjemplar ?? '',
                              disponible: Boolean(ejemplar.disponible),
                              requiereRevision: Boolean(ejemplar.requiereRevision),
                            })
                          }}>Editar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(pagina > 0 || hayMas) && (
                <div className="acciones" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
                  <p className="nota">
                    Página {pagina + 1}: {ejemplares.length} ejemplar{ejemplares.length === 1 ? '' : 'es'}
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
            </>
          )}
        </div>
      </div>
      {avisarVacios && (
        <AvisarVacios campos={avisarVacios} onCancelar={() => setAvisarVacios(null)} onConfirmar={() => guardar(null, true)} />
      )}
    </Pagina>
  )
}
