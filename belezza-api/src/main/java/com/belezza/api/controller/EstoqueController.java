package com.belezza.api.controller;

import com.belezza.api.dto.estoque.*;
import com.belezza.api.service.EstoqueService;
import com.belezza.api.service.FornecedorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salon/stock")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Estoque", description = "Gerenciamento de estoque e produtos")
public class EstoqueController {

    private final EstoqueService estoqueService;
    private final FornecedorService fornecedorService;

    // ====== PRODUTOS ======

    @PostMapping("/products")
    @Operation(summary = "Criar produto", description = "Cria um novo produto no estoque")
    public ResponseEntity<ProdutoResponse> criarProduto(
            @Valid @RequestBody ProdutoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ProdutoResponse response = estoqueService.criarProduto(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/products")
    @Operation(summary = "Listar produtos", description = "Lista todos os produtos do estoque")
    public ResponseEntity<Page<ProdutoResponse>> listarProdutos(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<ProdutoResponse> response = estoqueService.listarProdutos(userDetails.getUsername(), pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/products/{id}")
    @Operation(summary = "Buscar produto", description = "Busca um produto por ID")
    public ResponseEntity<ProdutoResponse> buscarProduto(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        ProdutoResponse response = estoqueService.buscarProduto(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/products/{id}")
    @Operation(summary = "Atualizar produto", description = "Atualiza um produto existente")
    public ResponseEntity<ProdutoResponse> atualizarProduto(
            @PathVariable Long id,
            @Valid @RequestBody ProdutoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        ProdutoResponse response = estoqueService.atualizarProduto(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/products/{id}")
    @Operation(summary = "Desativar produto", description = "Desativa um produto (soft delete)")
    public ResponseEntity<Void> desativarProduto(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        estoqueService.desativarProduto(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/products/{id}/adjust")
    @Operation(summary = "Ajustar estoque", description = "Ajusta o estoque de um produto")
    public ResponseEntity<MovimentacaoResponse> ajustarEstoque(
            @PathVariable Long id,
            @Valid @RequestBody AjusteEstoqueRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        MovimentacaoResponse response = estoqueService.ajustarEstoque(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/products/low-stock")
    @Operation(summary = "Produtos com estoque baixo", description = "Lista produtos com estoque baixo ou zerado")
    public ResponseEntity<List<ProdutoResponse>> listarEstoqueBaixo(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<ProdutoResponse> response = estoqueService.listarEstoqueBaixo(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // ====== CATEGORIAS ======

    @PostMapping("/categories")
    @Operation(summary = "Criar categoria", description = "Cria uma nova categoria de produto")
    public ResponseEntity<CategoriaProdutoResponse> criarCategoria(
            @Valid @RequestBody CategoriaProdutoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        CategoriaProdutoResponse response = estoqueService.criarCategoria(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/categories")
    @Operation(summary = "Listar categorias", description = "Lista todas as categorias de produtos")
    public ResponseEntity<List<CategoriaProdutoResponse>> listarCategorias(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<CategoriaProdutoResponse> response = estoqueService.listarCategorias(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // ====== FORNECEDORES ======

    @PostMapping("/suppliers")
    @Operation(summary = "Criar fornecedor", description = "Cria um novo fornecedor")
    public ResponseEntity<FornecedorResponse> criarFornecedor(
            @Valid @RequestBody FornecedorRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        FornecedorResponse response = fornecedorService.criar(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/suppliers")
    @Operation(summary = "Listar fornecedores", description = "Lista todos os fornecedores")
    public ResponseEntity<List<FornecedorResponse>> listarFornecedores(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<FornecedorResponse> response = fornecedorService.listarTodos(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/suppliers/{id}")
    @Operation(summary = "Buscar fornecedor", description = "Busca um fornecedor por ID")
    public ResponseEntity<FornecedorResponse> buscarFornecedor(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        FornecedorResponse response = fornecedorService.buscarPorId(id, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/suppliers/{id}")
    @Operation(summary = "Atualizar fornecedor", description = "Atualiza um fornecedor existente")
    public ResponseEntity<FornecedorResponse> atualizarFornecedor(
            @PathVariable Long id,
            @Valid @RequestBody FornecedorRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        FornecedorResponse response = fornecedorService.atualizar(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/suppliers/{id}")
    @Operation(summary = "Desativar fornecedor", description = "Desativa um fornecedor (soft delete)")
    public ResponseEntity<Void> desativarFornecedor(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        fornecedorService.desativar(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    // ====== MOVIMENTAÇÕES ======

    @PostMapping("/movements")
    @Operation(summary = "Registrar movimentação", description = "Registra uma movimentação de estoque")
    public ResponseEntity<MovimentacaoResponse> registrarMovimentacao(
            @Valid @RequestBody MovimentacaoRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        MovimentacaoResponse response = estoqueService.registrarMovimentacao(request, userDetails.getUsername());
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/movements")
    @Operation(summary = "Listar movimentações", description = "Lista todas as movimentações de estoque")
    public ResponseEntity<Page<MovimentacaoResponse>> listarMovimentacoes(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<MovimentacaoResponse> response = estoqueService.listarMovimentacoes(userDetails.getUsername(), pageable);
        return ResponseEntity.ok(response);
    }

    // ====== ALERTAS ======

    @PostMapping("/alerts/{id}/acknowledge")
    @Operation(summary = "Reconhecer alerta", description = "Marca um alerta como reconhecido")
    public ResponseEntity<Void> reconhecerAlerta(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        estoqueService.reconhecerAlerta(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    // ====== ESTATÍSTICAS ======

    @GetMapping("/stats")
    @Operation(summary = "Estatísticas do estoque", description = "Retorna estatísticas do estoque")
    public ResponseEntity<EstoqueStatsResponse> getEstatisticas(
            @AuthenticationPrincipal UserDetails userDetails) {
        EstoqueStatsResponse response = estoqueService.getEstatisticas(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }
}
