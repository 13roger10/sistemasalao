package com.belezza.api.scheduler;

import com.belezza.api.entity.AlertaEstoque;
import com.belezza.api.entity.Produto;
import com.belezza.api.entity.Salon;
import com.belezza.api.repository.AlertaEstoqueRepository;
import com.belezza.api.repository.ProdutoRepository;
import com.belezza.api.repository.SalonRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Scheduler para verificação automática de estoque e geração de alertas.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AlertaEstoqueScheduler {

    private final ProdutoRepository produtoRepository;
    private final AlertaEstoqueRepository alertaRepository;
    private final SalonRepository salonRepository;

    /**
     * Executa diariamente às 06:00 para verificar produtos com estoque baixo.
     */
    @Scheduled(cron = "0 0 6 * * *")
    @Transactional
    @SuppressWarnings("null")
    public void verificarEstoqueBaixo() {
        log.info("Iniciando verificação de estoque baixo...");

        List<Salon> salons = salonRepository.findByAtivoTrue();
        int alertasCriados = 0;

        for (Salon salon : salons) {
            List<Produto> produtosBaixo = produtoRepository.findProdutosEstoqueBaixo(salon.getId());
            List<Produto> produtosSemEstoque = produtoRepository.findProdutosSemEstoque(salon.getId());

            for (Produto produto : produtosSemEstoque) {
                if (!alertaRepository.existsByProdutoIdAndTipoAndReconhecidoFalse(produto.getId(), "SEM_ESTOQUE")) {
                    AlertaEstoque alerta = AlertaEstoque.builder()
                            .produto(produto)
                            .salon(salon)
                            .tipo("SEM_ESTOQUE")
                            .severidade("CRITICO")
                            .estoqueAtual(produto.getEstoqueAtual())
                            .estoqueMinimo(produto.getEstoqueMinimo())
                            .build();
                    alertaRepository.save(alerta);
                    alertasCriados++;
                }
            }

            for (Produto produto : produtosBaixo) {
                if (produto.getEstoqueAtual() > 0 &&
                    !alertaRepository.existsByProdutoIdAndTipoAndReconhecidoFalse(produto.getId(), "ESTOQUE_BAIXO")) {
                    AlertaEstoque alerta = AlertaEstoque.builder()
                            .produto(produto)
                            .salon(salon)
                            .tipo("ESTOQUE_BAIXO")
                            .severidade("AVISO")
                            .estoqueAtual(produto.getEstoqueAtual())
                            .estoqueMinimo(produto.getEstoqueMinimo())
                            .build();
                    alertaRepository.save(alerta);
                    alertasCriados++;
                }
            }
        }

        log.info("Verificação de estoque concluída. {} alertas criados.", alertasCriados);
    }
}
