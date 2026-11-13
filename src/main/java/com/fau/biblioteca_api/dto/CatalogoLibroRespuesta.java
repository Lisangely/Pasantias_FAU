public class CatalogoLibroRespuesta {

    private Integer idLibro;
    private String titulo;
    private String tipo;
    private Short fechaPublicacion;
    private String fechaOriginal;
    private Boolean requiereRevisionFecha;
    private String cota;
    private String editorial;
    private String autores;

    public CatalogoLibroRespuesta() {
    }

    public CatalogoLibroRespuesta(
            Integer idLibro,
            String titulo,
            String tipo,
            Short fechaPublicacion,
            String fechaOriginal,
            Boolean requiereRevisionFecha,
            String cota,
            String editorial,
            String autores) {
        this.idLibro = idLibro;
        this.titulo = titulo;
        this.tipo = tipo;
        this.fechaPublicacion = fechaPublicacion;
        this.fechaOriginal = fechaOriginal;
        this.requiereRevisionFecha = requiereRevisionFecha;
        this.cota = cota;
        this.editorial = editorial;
        this.autores = autores;
    }

    public Integer getIdLibro() {
        return idLibro;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getTipo() {
        return tipo;
    }

    public Short getFechaPublicacion() {
        return fechaPublicacion;
    }

    public String getFechaOriginal() {
        return fechaOriginal;
    }

    public Boolean getRequiereRevisionFecha() {
        return requiereRevisionFecha;
    }

    public String getCota() {
        return cota;
    }

    public String getEditorial() {
        return editorial;
    }

    public String getAutores() {
        return autores;
    }
}
