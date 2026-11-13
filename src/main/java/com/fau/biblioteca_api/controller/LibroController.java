package com.fau.biblioteca_api.controller;

import com.fau.biblioteca_api.dto.CatalogoLibroRespuesta;
import com.fau.biblioteca_api.dto.ImportacionResultado;
import com.fau.biblioteca_api.dto.LibroRequest;
import com.fau.biblioteca_api.entity.Libro;
import com.fau.biblioteca_api.service.ImportacionExcelService;
import com.fau.biblioteca_api.service.LibroService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/libros")
public class LibroController {

    private final LibroService libroService;
    private final ImportacionExcelService importacionExcelService;

    public LibroController(LibroService libroService, ImportacionExcelService importacionExcelService) {
        this.libroService = libroService;
        this.importacionExcelService = importacionExcelService;
    }

    @PostMapping("/importar")
    public ImportacionResultado importar(@RequestParam("archivo") MultipartFile archivo) {
        return importacionExcelService.importar(archivo);
    }

    @GetMapping("/exportar")
    public ResponseEntity<byte[]> exportar() {
        byte[] archivo = importacionExcelService.exportar();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"inventario-biblioteca-fau.xlsx\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(archivo);
    }

    @GetMapping
    public List<Libro> listar() {
        return libroService.listar();
    }

    @GetMapping("/catalogo")
    public List<CatalogoLibroRespuesta> catalogo(
            @RequestParam(required = false) String titulo,
            @RequestParam(required = false) String autor,
            @RequestParam(required = false) String cota,
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) Integer limite,
            @RequestParam(required = false) Integer pagina) {

        return libroService.catalogo(titulo, autor, cota, tipo, limite, pagina);
    }

    @GetMapping("/buscar")
    public List<Libro> buscar(
            @RequestParam(required = false) String titulo,
            @RequestParam(required = false) String autor,
            @RequestParam(required = false) String cota,
            @RequestParam(required = false) String tipo) {

        return libroService.buscar(titulo, autor, cota, tipo);
    }

    @GetMapping("/{id:\\d+}")
    public Libro obtener(@PathVariable Integer id) {
        return libroService.obtener(id);
    }

    @PostMapping
    public Libro crear(@RequestBody LibroRequest request) {
        return libroService.crear(request);
    }

    @PostMapping("/{id:\\d+}/restaurar")
    public Libro restaurar(@PathVariable Integer id, @RequestParam Integer idAuditoria) {
        return libroService.restaurar(id, idAuditoria);
    }

    @PutMapping("/{id:\\d+}")
    public Libro actualizar(
            @PathVariable Integer id,
            @RequestBody LibroRequest request) {

        return libroService.actualizar(id, request);
    }

    @DeleteMapping("/{id:\\d+}")
    public String eliminar(@PathVariable Integer id) {
        libroService.eliminar(id);
        return "Libro eliminado correctamente";
    }
}
