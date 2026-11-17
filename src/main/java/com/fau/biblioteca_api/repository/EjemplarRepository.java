package com.fau.biblioteca_api.repository;

import com.fau.biblioteca_api.entity.Ejemplar;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EjemplarRepository
        extends JpaRepository<Ejemplar, Integer> {

    List<Ejemplar> findByLibro_IdLibro(Integer idLibro);

    @Query("""
            SELECT e FROM Ejemplar e
            JOIN e.libro l
            WHERE (:titulo IS NULL OR :titulo = ''
                OR LOWER(l.titulo) LIKE LOWER(CONCAT(CAST(:titulo AS string), '%')))
            ORDER BY l.titulo ASC, e.numeroEjemplar ASC, e.idEjemplar ASC
            """)
    List<Ejemplar> buscarPorTitulo(
            @Param("titulo") String titulo,
            Pageable pageable);
}
