package com.fau.biblioteca_api.repository;

import com.fau.biblioteca_api.entity.IncidenciaDatos;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface IncidenciaDatosRepository
        extends JpaRepository<IncidenciaDatos, Integer> {

    @Query("""
            SELECT i FROM IncidenciaDatos i
            JOIN i.libro l
            WHERE (:resuelto IS NULL OR i.resuelto = :resuelto)
              AND (:idLibro IS NULL OR l.idLibro = :idLibro)
              AND (
                :texto IS NULL OR :texto = ''
                OR LOWER(l.titulo) LIKE LOWER(CONCAT(CAST(:texto AS string), '%'))
                OR LOWER(COALESCE(i.campo, '')) LIKE LOWER(CONCAT(CAST(:texto AS string), '%'))
                OR LOWER(COALESCE(i.descripcion, '')) LIKE LOWER(CONCAT(CAST(:texto AS string), '%'))
              )
            ORDER BY i.resuelto ASC, l.titulo ASC, i.idIncidencia ASC
            """)
    List<IncidenciaDatos> buscar(
            @Param("resuelto") Boolean resuelto,
            @Param("idLibro") Integer idLibro,
            @Param("texto") String texto,
            Pageable pageable);
}
