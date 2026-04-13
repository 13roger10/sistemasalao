package com.belezza.api.repository;

import com.belezza.api.entity.FuncaoStudio;
import com.belezza.api.entity.MembroStudio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MembroStudioRepository extends JpaRepository<MembroStudio, Long> {

    List<MembroStudio> findBySalonId(Long salonId);

    Optional<MembroStudio> findBySalonIdAndUsuarioId(Long salonId, Long usuarioId);

    @Query("SELECT m FROM MembroStudio m WHERE m.salon.id = :salonId AND m.usuario.email = :email")
    Optional<MembroStudio> findBySalonIdAndUsuarioEmail(@Param("salonId") Long salonId,
                                                        @Param("email") String email);

    boolean existsBySalonIdAndUsuarioId(Long salonId, Long usuarioId);

    @Modifying
    @Query("UPDATE MembroStudio m SET m.funcao = :funcao WHERE m.id = :id")
    void updateFuncao(@Param("id") Long id, @Param("funcao") FuncaoStudio funcao);
}
