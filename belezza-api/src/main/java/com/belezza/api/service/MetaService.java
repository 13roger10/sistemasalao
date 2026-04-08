package com.belezza.api.service;

import com.belezza.api.dto.meta.*;
import com.belezza.api.entity.*;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MetaService {

    private final MetaRepository metaRepository;
    private final HistoricoMetaRepository historicoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProfissionalRepository profissionalRepository;
    private final SalonService salonService;

    @Transactional
    public MetaResponse criar(MetaRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Usuario criador = usuarioRepository.findByEmail(emailUsuario)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailUsuario));

        Profissional profissional = null;
        if (request.getProfissionalId() != null) {
            profissional = profissionalRepository.findById(request.getProfissionalId())
                    .orElseThrow(() -> new ResourceNotFoundException("Profissional", request.getProfissionalId()));
        }

        Meta meta = Meta.builder()
                .nome(request.getNome().trim())
                .descricao(request.getDescricao())
                .tipo(request.getTipo())
                .periodo(request.getPeriodo())
                .valorMeta(request.getValorMeta())
                .dataInicio(request.getDataInicio())
                .dataFim(request.getDataFim())
                .salon(salon)
                .profissional(profissional)
                .criadoPor(criador)
                .notificarProgresso(request.isNotificarProgresso())
                .notificarAoAtingir(request.getNotificarAoAtingir())
                .build();

        meta = metaRepository.save(meta);
        log.info("Meta criada: {} no salão {}", meta.getId(), salon.getId());

        return MetaResponse.fromEntity(meta);
    }

    @Transactional(readOnly = true)
    public Page<MetaResponse> listar(String emailUsuario, Pageable pageable) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        return metaRepository.findBySalonIdAndAtivoTrue(salon.getId(), pageable)
                .map(MetaResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public MetaResponse buscarPorId(Long id, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Meta meta = metaRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Meta", id));
        return MetaResponse.fromEntity(meta);
    }

    @Transactional(readOnly = true)
    public List<HistoricoMetaResponse> buscarHistorico(Long metaId, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Meta meta = metaRepository.findByIdAndSalonId(metaId, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Meta", metaId));

        return historicoRepository.findByMetaId(meta.getId()).stream()
                .map(HistoricoMetaResponse::fromEntity)
                .toList();
    }

    @Transactional
    public MetaResponse atualizar(Long id, MetaRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Meta meta = metaRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Meta", id));

        meta.setNome(request.getNome().trim());
        meta.setDescricao(request.getDescricao());
        meta.setTipo(request.getTipo());
        meta.setPeriodo(request.getPeriodo());
        meta.setValorMeta(request.getValorMeta());
        meta.setDataInicio(request.getDataInicio());
        meta.setDataFim(request.getDataFim());
        meta.setNotificarProgresso(request.isNotificarProgresso());
        meta.setNotificarAoAtingir(request.getNotificarAoAtingir());

        if (request.getProfissionalId() != null) {
            Profissional profissional = profissionalRepository.findById(request.getProfissionalId())
                    .orElseThrow(() -> new ResourceNotFoundException("Profissional", request.getProfissionalId()));
            meta.setProfissional(profissional);
        } else {
            meta.setProfissional(null);
        }

        meta = metaRepository.save(meta);
        log.info("Meta atualizada: {}", meta.getId());

        return MetaResponse.fromEntity(meta);
    }

    @Transactional
    public void excluir(Long id, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Meta meta = metaRepository.findByIdAndSalonId(id, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Meta", id));

        meta.setAtivo(false);
        metaRepository.save(meta);
        log.info("Meta excluída: {}", id);
    }

    @Transactional(readOnly = true)
    public MetaDashboardResponse getDashboard(String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        LocalDate hoje = LocalDate.now();

        List<Meta> metasAtuais = metaRepository.findMetasAtuais(salon.getId(), hoje);
        long metasAtingidas = metaRepository.countMetasAtingidas(salon.getId(), hoje);

        // Calcular percentual geral
        BigDecimal percentualGeral = BigDecimal.ZERO;
        if (!metasAtuais.isEmpty()) {
            BigDecimal soma = metasAtuais.stream()
                    .map(Meta::getPercentualProgresso)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            percentualGeral = soma.divide(BigDecimal.valueOf(metasAtuais.size()), 2, RoundingMode.HALF_UP);
        }

        // Resumo por tipo
        List<MetaDashboardResponse.MetaResumoResponse> resumoPorTipo = Arrays.stream(TipoMeta.values())
                .map(tipo -> {
                    List<Meta> metasTipo = metasAtuais.stream()
                            .filter(m -> m.getTipo() == tipo)
                            .toList();
                    long atingidas = metasTipo.stream().filter(Meta::isAtingida).count();
                    BigDecimal percentualMedio = BigDecimal.ZERO;
                    if (!metasTipo.isEmpty()) {
                        BigDecimal soma = metasTipo.stream()
                                .map(Meta::getPercentualProgresso)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                        percentualMedio = soma.divide(BigDecimal.valueOf(metasTipo.size()), 2, RoundingMode.HALF_UP);
                    }
                    return MetaDashboardResponse.MetaResumoResponse.builder()
                            .tipo(tipo.name())
                            .tipoDescricao(tipo.getDescricao())
                            .quantidade(metasTipo.size())
                            .atingidas(atingidas)
                            .percentualMedio(percentualMedio)
                            .build();
                })
                .filter(r -> r.getQuantidade() > 0)
                .toList();

        return MetaDashboardResponse.builder()
                .totalMetas(metasAtuais.size())
                .metasAtingidas(metasAtingidas)
                .metasEmAndamento(metasAtuais.size() - metasAtingidas)
                .percentualGeralProgresso(percentualGeral)
                .metasAtuais(metasAtuais.stream().map(MetaResponse::fromEntity).toList())
                .resumoPorTipo(resumoPorTipo)
                .build();
    }

    @Transactional
    public void atualizarValorMeta(Long metaId, BigDecimal novoValor) {
        Meta meta = metaRepository.findById(metaId)
                .orElseThrow(() -> new ResourceNotFoundException("Meta", metaId));

        BigDecimal valorAnterior = meta.getValorAtual();
        BigDecimal variacao = novoValor.subtract(valorAnterior);

        meta.setValorAtual(novoValor);
        metaRepository.save(meta);

        // Registrar histórico
        HistoricoMeta historico = HistoricoMeta.builder()
                .meta(meta)
                .dataRegistro(LocalDate.now())
                .valorAnterior(valorAnterior)
                .valorNovo(novoValor)
                .variacao(variacao)
                .percentualProgresso(meta.getPercentualProgresso())
                .build();
        historicoRepository.save(historico);

        log.info("Valor da meta {} atualizado de {} para {}", metaId, valorAnterior, novoValor);
    }
}
