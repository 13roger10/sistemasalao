package com.belezza.api.service;

import com.belezza.api.dto.estoque.*;
import com.belezza.api.entity.*;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EstoqueService {

    private final ProdutoRepository produtoRepository;
    private final CategoriaProdutoRepository categoriaRepository;
    private final FornecedorRepository fornecedorRepository;
    private final MovimentacaoEstoqueRepository movimentacaoRepository;
    private final AlertaEstoqueRepository alertaRepository;
    private final UsuarioRepository usuarioRepository;
    private final SalonService salonService;

    // ====== PRODUTOS ======

    @Transactional
    @SuppressWarnings("null")
    public ProdutoResponse criarProduto(ProdutoRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);

        if (request.getSku() != null && produtoRepository.existsBySkuAndSalonId(request.getSku(), salon.getId())) {
            throw new DuplicateResourceException("Produto", "SKU", request.getSku());
        }

        CategoriaProduto categoria = null;
        if (request.getCategoriaId() != null) {
            categoria = categoriaRepository.findByIdAndSalonId(request.getCategoriaId(), salon.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Categoria", request.getCategoriaId()));
        }

        Fornecedor fornecedor = null;
        if (request.getFornecedorId() != null) {
            fornecedor = fornecedorRepository.findByIdAndSalonId(request.getFornecedorId(), salon.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", request.getFornecedorId()));
        }

        Produto produto = Produto.builder()
                .nome(request.getNome().trim())
                .descricao(request.getDescricao())
                .sku(request.getSku())
                .codigoBarras(request.getCodigoBarras())
                .imagemUrl(request.getImagemUrl())
                .categoria(categoria)
                .fornecedor(fornecedor)
                .salon(salon)
                .estoqueAtual(request.getEstoqueAtual())
                .estoqueMinimo(request.getEstoqueMinimo())
                .estoqueMaximo(request.getEstoqueMaximo())
                .unidadeMedida(request.getUnidadeMedida())
                .precoCusto(request.getPrecoCusto())
                .precoVenda(request.getPrecoVenda())
                .vendavel(request.isVendavel())
                .build();

        produto = produtoRepository.save(produto);
        log.info("Produto criado: {} no salão {}", produto.getId(), salon.getId());

        verificarAlertaEstoque(produto);

        return ProdutoResponse.fromEntity(produto);
    }

    @Transactional(readOnly = true)
    public Page<ProdutoResponse> listarProdutos(String emailUsuario, Pageable pageable) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return produtoRepository.findBySalonIdAndAtivoTrue(salon.getId(), pageable)
                .map(ProdutoResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public ProdutoResponse buscarProduto(Long id, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Produto produto = produtoRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Produto", id));
        return ProdutoResponse.fromEntity(produto);
    }

    @Transactional
    public ProdutoResponse atualizarProduto(Long id, ProdutoRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Produto produto = produtoRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Produto", id));

        produto.setNome(request.getNome().trim());
        produto.setDescricao(request.getDescricao());
        produto.setSku(request.getSku());
        produto.setCodigoBarras(request.getCodigoBarras());
        produto.setImagemUrl(request.getImagemUrl());
        produto.setEstoqueMinimo(request.getEstoqueMinimo());
        produto.setEstoqueMaximo(request.getEstoqueMaximo());
        produto.setUnidadeMedida(request.getUnidadeMedida());
        produto.setPrecoCusto(request.getPrecoCusto());
        produto.setPrecoVenda(request.getPrecoVenda());
        produto.setVendavel(request.isVendavel());

        if (request.getCategoriaId() != null) {
            CategoriaProduto categoria = categoriaRepository.findByIdAndSalonId(request.getCategoriaId(), salon.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Categoria", request.getCategoriaId()));
            produto.setCategoria(categoria);
        }

        if (request.getFornecedorId() != null) {
            Fornecedor fornecedor = fornecedorRepository.findByIdAndSalonId(request.getFornecedorId(), salon.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", request.getFornecedorId()));
            produto.setFornecedor(fornecedor);
        }

        produto = produtoRepository.save(produto);
        log.info("Produto atualizado: {}", produto.getId());

        return ProdutoResponse.fromEntity(produto);
    }

    @Transactional
    public void desativarProduto(Long id, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Produto produto = produtoRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Produto", id));
        produto.setAtivo(false);
        produtoRepository.save(produto);
        log.info("Produto desativado: {}", id);
    }

    @Transactional
    public MovimentacaoResponse ajustarEstoque(Long produtoId, AjusteEstoqueRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Usuario usuario = usuarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailUsuario));
        Produto produto = produtoRepository.findByIdAndSalonId(produtoId, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Produto", produtoId));

        int estoqueAnterior = produto.getEstoqueAtual();
        int novoEstoque = estoqueAnterior + request.getQuantidade();
        if (novoEstoque < 0) novoEstoque = 0;

        TipoMovimentacao tipo = request.getQuantidade() > 0 ? TipoMovimentacao.ENTRADA : TipoMovimentacao.SAIDA;
        if (request.getQuantidade() == 0) tipo = TipoMovimentacao.AJUSTE;

        MovimentacaoEstoque movimentacao = MovimentacaoEstoque.builder()
                .produto(produto)
                .salon(salon)
                .tipo(tipo)
                .motivo(MotivoMovimentacao.AJUSTE_MANUAL)
                .quantidade(Math.abs(request.getQuantidade()))
                .estoqueAnterior(estoqueAnterior)
                .estoqueNovo(novoEstoque)
                .usuario(usuario)
                .observacoes(request.getMotivo() + (request.getObservacoes() != null ? " - " + request.getObservacoes() : ""))
                .build();

        movimentacaoRepository.save(movimentacao);

        produto.setEstoqueAtual(novoEstoque);
        produto.setUltimaMovimentacao(LocalDateTime.now());
        produtoRepository.save(produto);

        verificarAlertaEstoque(produto);

        log.info("Estoque ajustado: produto {} de {} para {}", produtoId, estoqueAnterior, novoEstoque);

        return MovimentacaoResponse.fromEntity(movimentacao);
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> listarEstoqueBaixo(String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return produtoRepository.findProdutosEstoqueBaixo(salon.getId()).stream()
                .map(ProdutoResponse::fromEntity)
                .toList();
    }

    // ====== MOVIMENTAÇÕES ======

    @Transactional
    @SuppressWarnings("null")
    public MovimentacaoResponse registrarMovimentacao(MovimentacaoRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Usuario usuario = usuarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailUsuario));
        Produto produto = produtoRepository.findByIdAndSalonId(request.getProdutoId(), salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Produto", request.getProdutoId()));

        int estoqueAnterior = produto.getEstoqueAtual();
        int novoEstoque;

        if (request.getTipo() == TipoMovimentacao.ENTRADA) {
            novoEstoque = estoqueAnterior + request.getQuantidade();
        } else {
            novoEstoque = Math.max(0, estoqueAnterior - request.getQuantidade());
        }

        BigDecimal custoTotal = null;
        if (request.getCustoUnitario() != null) {
            custoTotal = request.getCustoUnitario().multiply(BigDecimal.valueOf(request.getQuantidade()));
        }

        MovimentacaoEstoque movimentacao = MovimentacaoEstoque.builder()
                .produto(produto)
                .salon(salon)
                .tipo(request.getTipo())
                .motivo(request.getMotivo())
                .quantidade(request.getQuantidade())
                .estoqueAnterior(estoqueAnterior)
                .estoqueNovo(novoEstoque)
                .custoUnitario(request.getCustoUnitario())
                .custoTotal(custoTotal)
                .usuario(usuario)
                .observacoes(request.getObservacoes())
                .build();

        movimentacaoRepository.save(movimentacao);

        produto.setEstoqueAtual(novoEstoque);
        produto.setUltimaMovimentacao(LocalDateTime.now());
        if (request.getTipo() == TipoMovimentacao.ENTRADA && request.getMotivo() == MotivoMovimentacao.COMPRA) {
            produto.setUltimaCompra(LocalDateTime.now());
        }
        produtoRepository.save(produto);

        verificarAlertaEstoque(produto);

        log.info("Movimentação registrada: produto {} - {} {}", produto.getId(), request.getTipo(), request.getQuantidade());

        return MovimentacaoResponse.fromEntity(movimentacao);
    }

    @Transactional(readOnly = true)
    public Page<MovimentacaoResponse> listarMovimentacoes(String emailUsuario, Pageable pageable) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return movimentacaoRepository.findBySalonId(salon.getId(), pageable)
                .map(MovimentacaoResponse::fromEntity);
    }

    // ====== CATEGORIAS ======

    @Transactional
    @SuppressWarnings("null")
    public CategoriaProdutoResponse criarCategoria(CategoriaProdutoRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);

        if (categoriaRepository.existsByNomeAndSalonId(request.getNome(), salon.getId())) {
            throw new DuplicateResourceException("Categoria", "nome", request.getNome());
        }

        CategoriaProduto categoria = CategoriaProduto.builder()
                .nome(request.getNome().trim())
                .descricao(request.getDescricao())
                .icone(request.getIcone())
                .cor(request.getCor())
                .ordem(request.getOrdem() != null ? request.getOrdem() : 0)
                .salon(salon)
                .build();

        categoria = categoriaRepository.save(categoria);
        log.info("Categoria de produto criada: {}", categoria.getId());

        return CategoriaProdutoResponse.fromEntity(categoria);
    }

    @Transactional(readOnly = true)
    public List<CategoriaProdutoResponse> listarCategorias(String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return categoriaRepository.findBySalonIdAndAtivoTrue(salon.getId()).stream()
                .map(CategoriaProdutoResponse::fromEntity)
                .toList();
    }

    // ====== ALERTAS ======

    @Transactional
    @SuppressWarnings("null")
    public void reconhecerAlerta(Long alertaId, String emailUsuario) {
        Usuario usuario = usuarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailUsuario));
        AlertaEstoque alerta = alertaRepository.findById(alertaId)
                .orElseThrow(() -> new ResourceNotFoundException("Alerta", alertaId));

        alerta.setReconhecido(true);
        alerta.setReconhecidoEm(LocalDateTime.now());
        alerta.setReconhecidoPor(usuario);
        alertaRepository.save(alerta);

        log.info("Alerta reconhecido: {}", alertaId);
    }

    // ====== ESTATÍSTICAS ======

    @Transactional(readOnly = true)
    public EstoqueStatsResponse getEstatisticas(String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);

        long totalProdutos = produtoRepository.countBySalonId(salon.getId());
        long estoqueBaixo = produtoRepository.countEstoqueBaixo(salon.getId());
        long semEstoque = produtoRepository.countSemEstoque(salon.getId());
        long alertasNaoReconhecidos = alertaRepository.countNaoReconhecidos(salon.getId());

        // Calcular valor total do estoque
        List<Produto> produtos = produtoRepository.findBySalonIdAndAtivoTrue(salon.getId());
        BigDecimal valorTotal = produtos.stream()
                .map(p -> p.getPrecoCusto().multiply(BigDecimal.valueOf(p.getEstoqueAtual())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Movimentações recentes
        List<MovimentacaoResponse> movimentacoesRecentes = movimentacaoRepository
                .findRecentes(salon.getId(), PageRequest.of(0, 5)).stream()
                .map(MovimentacaoResponse::fromEntity)
                .toList();

        return EstoqueStatsResponse.builder()
                .totalProdutos(totalProdutos)
                .produtosEstoqueBaixo(estoqueBaixo)
                .produtosSemEstoque(semEstoque)
                .valorTotalEstoque(valorTotal)
                .alertasNaoReconhecidos(alertasNaoReconhecidos)
                .movimentacoesRecentes(movimentacoesRecentes)
                .build();
    }

    // ====== HELPERS ======

    @SuppressWarnings("null")
    private void verificarAlertaEstoque(Produto produto) {
        String statusEstoque = produto.getStatusEstoque();

        if ("SEM_ESTOQUE".equals(statusEstoque) || "ESTOQUE_BAIXO".equals(statusEstoque)) {
            String tipo = "SEM_ESTOQUE".equals(statusEstoque) ? "SEM_ESTOQUE" : "ESTOQUE_BAIXO";
            String severidade = "SEM_ESTOQUE".equals(statusEstoque) ? "CRITICO" : "AVISO";

            if (!alertaRepository.existsByProdutoIdAndTipoAndReconhecidoFalse(produto.getId(), tipo)) {
                AlertaEstoque alerta = AlertaEstoque.builder()
                        .produto(produto)
                        .salon(produto.getSalon())
                        .tipo(tipo)
                        .severidade(severidade)
                        .estoqueAtual(produto.getEstoqueAtual())
                        .estoqueMinimo(produto.getEstoqueMinimo())
                        .build();
                alertaRepository.save(alerta);
                log.info("Alerta de estoque criado: {} para produto {}", tipo, produto.getId());
            }
        }
    }
}
