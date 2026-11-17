import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { puede } from '../permisos'
import { Aviso, AvisarVacios, Busqueda, Campo, FILAS_POR_PAGINA, Pagina, Selector, Vacio, vacios } from '../ui'

const VACIO = { idLibro: '', campo: '', valorOriginal: '', descripcion: '' }

export default function Incidencias() {
  const { usuario } = useAuth()
  const crear = puede(usuario, 'puedeCrearIncidencias')
  const editarPermiso = puede(usuario, 'puedeActualizar')
  const [incidencias, setIncidencias] = useState([])
  const [libros, setLibros] = useState([])
  const [filtro, setFiltro] = useState('false')
  const [form, setForm] = useState(VACIO)
  const [busqueda, setBusqueda] = useState('')
  const [consulta, setConsulta] = useState('')
  const [pagina, setPagina] = useState(0)
  const [abierta, setAbierta] = useState(null)
  const [valor, setValor] = useState('')
  const [detalle, setDetalle] = useState({ autores: [], ejemplares: [] })
  const [guardando, setGuardando] = useState(false)
  const [avisarVacios, setAvisarVacios] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const pedido = useRef(0)

  useEffect(() => {
    api('/api/libros/buscar').then(setLibros).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    const espera = setTimeout(() => {
      setPagina(0)
      setConsulta(busqueda.trim())
    }, 300)
    return () => clearTimeout(espera)
  }, [busqueda])

  useEffect(() => {
    const id = ++pedido.current
    setCargando(true)
    setError('')
    const params = new URLSearchParams({
      limite: String(FILAS_POR_PAGINA),
      pagina: String(pagina),
    })
    if (filtro !== '') params.set('resuelto', filtro)
    if (consulta) params.set('texto', consulta)
    api(`/api/incidencias?${params}`)
      .then((lista) => {
        if (id !== pedido.current) return
        setIncidencias(lista)
      })
      .catch((err) => {
        if (id !== pedido.current) return
        setError(err.message)
        setIncidencias([])
      })
      .finally(() => {
        if (id === pedido.current) setCargando(false)
      })
  }, [consulta, pagina, filtro])

  const hayMas = incidencias.length >= FILAS_POR_PAGINA

  async function recargar(hoja = pagina) {
    const params = new URLSearchParams({
      limite: String(FILAS_POR_PAGINA),
      pagina: String(hoja),
    })
    if (filtro !== '') params.set('resuelto', filtro)
    if (consulta) params.set('texto', consulta)
    setIncidencias(await api(`/api/incidencias?${params}`))
  }

  async function crearIncidencia(evento, forzar = false) {
    if (evento) evento.preventDefault()
    const faltan = vacios([['Valor original', form.valorOriginal]])
    if (!forzar && faltan.length) {
      setAvisarVacios(faltan)
      return
    }
    setAvisarVacios(null)
    setError('')
    try {
      await api('/api/incidencias', {
        method: 'POST',
        body: JSON.stringify({
          idLibro: Number(form.idLibro),
          campo: form.campo,
          valorOriginal: form.valorOriginal,
          descripcion: form.descripcion,
        }),
      })
      setForm(VACIO)
      setPagina(0)
      await recargar(0)
    } catch (err) {
      setError(err.message)
    }
  }

  async function abrir(incidencia) {
    setAbierta(incidencia)
    setValor('')
    setError('')
    setDetalle({ autores: [], ejemplares: [] })
    const idLibro = incidencia.libro?.idLibro
    if (!idLibro) return
    try {
      const [autores, ejemplares] = await Promise.all([
        api(`/api/libro-autor?idLibro=${idLibro}`),
        api(`/api/ejemplares?idLibro=${idLibro}`),
      ])
      setDetalle({ autores, ejemplares })
    } catch (err) {
      setError(err.message)
    }
  }

  async function resolver(evento) {
    evento.preventDefault()
    if (!abierta || avisoCorreccion) return
    setGuardando(true)
    setError('')
    try {
      await api(`/api/incidencias/${abierta.idIncidencia}/resolver`, {
        method: 'PUT',
        body: JSON.stringify({ valor: valor.trim() }),
      })
      setAbierta(null)
      setPagina(0)
      await recargar(0)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const avisoCorreccion = abierta ? validarCorreccion(abierta, valor, detalle.ejemplares) : ''

  return (
    <Pagina titulo="Incidencias" texto="Inconsistencias del inventario. Resolver una incidencia conserva el historial.">
      <Aviso>{error}</Aviso>
      <div className="acciones">
        <button className={filtro === '' ? 'boton' : 'boton boton-secundario'} type="button" onClick={() => { setFiltro(''); setPagina(0) }}>Todas</button>
        <button className={filtro === 'false' ? 'boton' : 'boton boton-secundario'} type="button" onClick={() => { setFiltro('false'); setPagina(0) }}>Pendientes</button>
        <button className={filtro === 'true' ? 'boton' : 'boton boton-secundario'} type="button" onClick={() => { setFiltro('true'); setPagina(0) }}>Resueltas</button>
      </div>
      {crear && <form className="panel" onSubmit={crearIncidencia}>
        <h2>Nueva incidencia</h2>
        <Campo etiqueta="Obra">
          <Selector
            requerido
            placeholder="Escribe el título"
            valor={form.idLibro}
            onChange={(idLibro) => setForm({ ...form, idLibro })}
            opciones={libros.map((libro) => ({ valor: libro.idLibro, etiqueta: libro.titulo }))}
          />
        </Campo>
        <div className="fila">
          <Campo etiqueta="Campo"><input value={form.campo} onChange={(evento) => setForm({ ...form, campo: evento.target.value })} required /></Campo>
          <Campo etiqueta="Valor original"><input value={form.valorOriginal} onChange={(evento) => setForm({ ...form, valorOriginal: evento.target.value })} /></Campo>
        </div>
        <Campo etiqueta="Descripción">
          <textarea value={form.descripcion} onChange={(evento) => setForm({ ...form, descripcion: evento.target.value })} rows="3" required />
        </Campo>
        <button className="boton" type="submit">Registrar</button>
      </form>}
      <Busqueda valor={busqueda} onChange={setBusqueda} placeholder="Obra, campo o descripción" />
      {cargando ? <p className="nota">Cargando incidencias…</p> : incidencias.length === 0 ? (
        <Vacio>{consulta ? 'No hay incidencias que empiecen por ese texto.' : filtro === 'false' ? 'No hay incidencias pendientes.' : filtro === 'true' ? 'No hay incidencias resueltas.' : 'No hay incidencias registradas.'}</Vacio>
      ) : (
        <div className="tabla-contenedor">
          <table>
            <thead><tr><th>Obra</th><th>Campo</th><th>Valor original</th><th>Descripción</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {incidencias.map((incidencia) => (
                <tr key={incidencia.idIncidencia}>
                  <td>{incidencia.libro?.titulo || '—'}</td>
                  <td>{incidencia.campo}</td>
                  <td>{incidencia.valorOriginal || '—'}</td>
                  <td>{incidencia.descripcion}</td>
                  <td><span className={`marca-estado ${incidencia.resuelto ? 'resuelto' : 'pendiente'}`}>{incidencia.resuelto ? 'Resuelta' : 'Pendiente'}</span></td>
                  <td>{editarPermiso && !incidencia.resuelto && <button type="button" onClick={() => abrir(incidencia)}>Resolver</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(pagina > 0 || hayMas) && (
            <div className="acciones" style={{ marginTop: '1rem', justifyContent: 'space-between' }}>
              <p className="nota">
                Página {pagina + 1}: {incidencias.length} incidencia{incidencias.length === 1 ? '' : 's'}
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
        </div>
      )}
      {avisarVacios && (
        <AvisarVacios campos={avisarVacios} onCancelar={() => setAvisarVacios(null)} onConfirmar={() => crearIncidencia(null, true)} />
      )}
      {abierta && (
        <div className="velo" onMouseDown={() => !guardando && setAbierta(null)}>
          <form className="dialogo dialogo-ancho" onMouseDown={(evento) => evento.stopPropagation()} onSubmit={resolver}>
            <h2>Corregir incidencia</h2>
            <p className="nota">La obra pasa a resuelta solo después de guardar un valor válido en el campo con error.</p>
            <dl className="ficha-datos">
              <dt>Obra</dt><dd>{abierta.libro?.titulo || '—'}</dd>
              <dt>Autores</dt><dd>{detalle.autores.length ? detalle.autores.map((vinculo) => vinculo.autor?.nombreCompleto || vinculo.autor?.nombre).join('; ') : '—'}</dd>
              <dt>Tipo</dt><dd>{abierta.libro?.tipo || '—'}</dd>
              <dt>Año</dt><dd>{abierta.libro?.fechaPublicacion || abierta.libro?.fechaOriginal || '—'}</dd>
              <dt>Cota</dt><dd>{abierta.libro?.cota || '—'}</dd>
              <dt>Editorial</dt><dd>{abierta.libro?.editorial?.nombre || '—'}</dd>
              <dt>Ejemplares</dt><dd>{detalle.ejemplares.length}</dd>
              <dt>Campo</dt><dd>{abierta.campo}</dd>
              <dt>Valor con error</dt><dd>{abierta.valorOriginal || '—'}</dd>
              <dt>Detalle</dt><dd>{abierta.descripcion}</dd>
            </dl>
            <Campo etiqueta={`Valor corregido de ${abierta.campo}`}>
              <input value={valor} onChange={(evento) => setValor(evento.target.value)} placeholder={pista(abierta.campo)} autoFocus />
            </Campo>
            <Aviso>{avisoCorreccion}</Aviso>
            <Aviso>{error}</Aviso>
            <div className="acciones">
              <button className="boton" type="submit" disabled={Boolean(avisoCorreccion) || !valor.trim() || guardando}>
                {guardando ? 'Guardando…' : 'Resolver'}
              </button>
              <button className="boton boton-secundario" type="button" onClick={() => setAbierta(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </Pagina>
  )
}

function claveCampo(campo) {
  return String(campo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[.\sº°]/g, '')
}

function pista(campo) {
  const clave = claveCampo(campo)
  if (clave.includes('FECHA') || clave === 'ANO' || clave === 'ANIO') return 'Año de 4 dígitos, por ejemplo 1987'
  if (clave.includes('EJEMPLAR')) return 'Cantidad entre 1 y 20'
  if (clave.includes('FILA') || clave.includes('UBICACION')) return 'Estantería/posición, por ejemplo Est.3/12'
  return 'Escribe el dato corregido'
}

function validarCorreccion(incidencia, valor) {
  const texto = valor.trim().replace(/\s+/g, ' ')
  if (!texto) return ''
  if (texto.toLowerCase() === String(incidencia.valorOriginal || '').trim().toLowerCase()) {
    return 'El valor sigue igual que el dato con error.'
  }
  const clave = claveCampo(incidencia.campo)
  const libro = incidencia.libro || {}
  if (clave.includes('FECHA') || clave === 'ANO' || clave === 'ANIO') {
    if (!/^(1[5-9]\d{2}|20\d{2})$/.test(texto)) return 'El año debe tener 4 dígitos, entre 1500 y 2099.'
    if (Number(texto) > new Date().getFullYear()) return `El año no puede ser posterior a ${new Date().getFullYear()}.`
    if (String(libro.fechaPublicacion ?? '') === texto) return 'Ese año ya está registrado. Ingresa el año corregido.'
    return ''
  }
  if (clave.includes('EJEMPLAR')) {
    if (!/^\d+$/.test(texto)) return 'La cantidad de ejemplares debe ser un número entero.'
    const cantidad = Number(texto)
    if (cantidad < 1 || cantidad > 20) return 'La cantidad de ejemplares debe estar entre 1 y 20.'
    return ''
  }
  if (clave.includes('COTA') && /^(\?|-|\?\?)$/.test(texto)) return 'La cota no puede ser un signo vacío.'
  if (clave.includes('FILA') || clave.includes('UBICACION')) {
    if (!texto.includes('/')) return 'Indica estantería y posición, por ejemplo Est.3/12.'
    const [estanteria, posicion] = texto.split('/')
    if (!estanteria?.trim() || !posicion?.trim()) return 'La estantería y la posición son obligatorias.'
    return ''
  }
  if (clave.includes('AUTOR') && !/\p{L}/u.test(texto)) return 'Escribe el nombre del autor.'
  const maximo = clave.includes('TITUL') ? 500 : 255
  if (texto.length > maximo) return `El valor supera los ${maximo} caracteres.`
  return ''
}
