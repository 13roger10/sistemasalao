package com.belezza.api.repository;

import com.belezza.api.entity.Produto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProdutoRepository extends JpaRepository<Produto, Long> {

    Optional<Produto> findByIdAndSalonId(Long id, Long salonId);

    Optional<Produto> findBySkuAndSalonId(String sku, Long salonId);

    Optional<Produto> findByCodigoBarrasAndSalonId(String codigoBarras, Long salonId);

    @Query("SELECT p FROM Produto p WHERE p.salon.id = :salonId AND p.ativo = true ORDER BY p.nome")
    List<Produto> findBySalonIdAndAtivoTrue(@Param("salonId") Long salonId);

    @Query("SELECT p FROM Produto p WHERE p.salon.id = :salonId AND p.ativo = true")
    Page<Produto> findBySalonIdAndAtivoTrue(@Param("salonId") Long salonId, Pageable pageable);

    @Query("SELECT p FROM Produto p WHERE p.salon.id = :salonId AND p.estoqueAtual <= p.estoqueMinimo AND p.ativo = true ORDER BY p.estoqueAtual")
    List<Produto> findProdutosEstoqueBaixo(@Param("salonId") Long salonId);

    @Query("SELECT p FROM Produto p WHERE p.salon.id = :salonId AND p.estoqueAtual = 0 AND p.ativo = true")
    List<Produto> findProdutosSemEstoque(@Param("salonId") Long salonId);

    @Query("SELECT p FROM Produto p WHERE p.categoria.id = :categoriaId AND p.ativo = true ORDER BY p.nome")
    List<Produto> findByCategoriaId(@Param("categoriaId") Long categoriaId);

    @Query("SELECT p FROM Produto p WHERE p.fornecedor.id = :fornecedorId AND p.ativo = true ORDER BY p.nome")
    List<Produto> findByFornecedorId(@Param("fornecedorId") Long fornecedorId);

    @Query("SELECT COUNT(p) FROM Produto p WHERE p.salon.id = :salonId AND p.ativo = true")
    long countBySalonId(@Param("salonId") Long salonId);

    @Query("SELECT COUNT(p) FROM Produto p WHERE p.salon.id = :salonId AND p.estoqueAtual <= p.estoqueMinimo AND p.ativo = true")
    long countEstoqueBaixo(@Param("salonId") Long salonId);

    @Query("SELECT COUNT(p) FROM Produto p WHERE p.salon.id = :salonId AND p.estoqueAtual = 0 AND p.ativo = true")
    long countSemEstoque(@Param("salonId") Long salonId);

    boolean existsBySkuAndSalonId(String sku, Long salonId);

    boolean existsByCodigoBarrasAndSalonId(String codigoBarras, Long salonId);
}
