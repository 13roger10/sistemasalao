package com.belezza.api.service;

import com.belezza.api.dto.coloracao.*;
import com.belezza.api.entity.*;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ColoracaoService {

    private final FichaColoracaoRepository fichaRepository;
    private final HistoricoColoracaoRepository historicoRepository;
    private final ClienteRepository clienteRepository;
    private final ProfissionalRepository profissionalRepository;
    private final SalonService salonService;

    // ====== FICHA DE COLORAÇÃO ======

    @Transactional
    @SuppressWarnings("null")
    public FichaColoracaoResponse criarFicha(FichaColoracaoRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        Cliente cliente = clienteRepository.findById(request.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", request.getClienteId()));

        if (fichaRepository.existsByClienteIdAndSalonId(request.getClienteId(), salon.getId())) {
            throw new DuplicateResourceException("Ficha", "cliente", request.getClienteId().toString());
        }

        FichaColoracao ficha = FichaColoracao.builder()
                .cliente(cliente)
                .salon(salon)
                .tomPele(request.getTomPele())
                .subtomPele(request.getSubtomPele())
                .tipoCabelo(request.getTipoCabelo())
                .corNatural(request.getCorNatural())
                .corAtual(request.getCorAtual())
                .porcentagemBrancos(request.getPorcentagemBrancos())
                .texturaCabelo(request.getTexturaCabelo())
                .porosidade(request.getPorosidade())
                .elasticidade(request.getElasticidade())
                .temQuimica(request.isTemQuimica())
                .historicoQuimico(request.getHistoricoQuimico())
                .ultimaQuimica(request.getUltimaQuimica())
                .temAlergia(request.isTemAlergia())
                .alergias(request.getAlergias())
                .sensibilidadeCouro(request.isSensibilidadeCouro())
                .preferenciaCores(request.getPreferenciaCores())
                .coresEvitar(request.getCoresEvitar())
                .observacoes(request.getObservacoes())
                .fotoReferencia1(request.getFotoReferencia1())
                .fotoReferencia2(request.getFotoReferencia2())
                .fotoReferencia3(request.getFotoReferencia3())
                .build();

        ficha = fichaRepository.save(ficha);
        log.info("Ficha de coloração criada: {} para cliente {}", ficha.getId(), cliente.getId());

        return FichaColoracaoResponse.fromEntity(ficha);
    }

    @Transactional(readOnly = true)
    public FichaColoracaoResponse buscarFichaPorCliente(Long clienteId, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        FichaColoracao ficha = fichaRepository.findByClienteIdAndSalonId(clienteId, salon.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Ficha", "cliente", clienteId.toString()));
        return FichaColoracaoResponse.fromEntity(ficha);
    }

    @Transactional
    @SuppressWarnings("null")
    public FichaColoracaoResponse atualizarFicha(Long id, FichaColoracaoRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        FichaColoracao ficha = fichaRepository.findById(id)
                .filter(f -> f.getSalon().getId().equals(salon.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Ficha", id));

        ficha.setTomPele(request.getTomPele());
        ficha.setSubtomPele(request.getSubtomPele());
        ficha.setTipoCabelo(request.getTipoCabelo());
        ficha.setCorNatural(request.getCorNatural());
        ficha.setCorAtual(request.getCorAtual());
        ficha.setPorcentagemBrancos(request.getPorcentagemBrancos());
        ficha.setTexturaCabelo(request.getTexturaCabelo());
        ficha.setPorosidade(request.getPorosidade());
        ficha.setElasticidade(request.getElasticidade());
        ficha.setTemQuimica(request.isTemQuimica());
        ficha.setHistoricoQuimico(request.getHistoricoQuimico());
        ficha.setUltimaQuimica(request.getUltimaQuimica());
        ficha.setTemAlergia(request.isTemAlergia());
        ficha.setAlergias(request.getAlergias());
        ficha.setSensibilidadeCouro(request.isSensibilidadeCouro());
        ficha.setPreferenciaCores(request.getPreferenciaCores());
        ficha.setCoresEvitar(request.getCoresEvitar());
        ficha.setObservacoes(request.getObservacoes());
        ficha.setFotoReferencia1(request.getFotoReferencia1());
        ficha.setFotoReferencia2(request.getFotoReferencia2());
        ficha.setFotoReferencia3(request.getFotoReferencia3());

        ficha = fichaRepository.save(ficha);
        log.info("Ficha de coloração atualizada: {}", ficha.getId());

        return FichaColoracaoResponse.fromEntity(ficha);
    }

    // ====== HISTÓRICO DE COLORAÇÃO ======

    @Transactional
    @SuppressWarnings("null")
    public HistoricoColoracaoResponse registrarColoracao(HistoricoColoracaoRequest request, String emailUsuario) {
        Salon salon = salonService.getSalonByAdminEmail(emailUsuario);
        FichaColoracao ficha = fichaRepository.findById(request.getFichaId())
                .filter(f -> f.getSalon().getId().equals(salon.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Ficha", request.getFichaId()));

        Profissional profissional = profissionalRepository.findById(request.getProfissionalId())
                .orElseThrow(() -> new ResourceNotFoundException("Profissional", request.getProfissionalId()));

        HistoricoColoracao historico = HistoricoColoracao.builder()
                .ficha(ficha)
                .cliente(ficha.getCliente())
                .profissional(profissional)
                .dataServico(request.getDataServico())
                .tecnica(request.getTecnica())
                .marcaTinta(request.getMarcaTinta())
                .nomeCor(request.getNomeCor())
                .numeroCor(request.getNumeroCor())
                .oxidante(request.getOxidante())
                .formulacao(request.getFormulacao())
                .tempoAplicacao(request.getTempoAplicacao())
                .tempoPausa(request.getTempoPausa())
                .corAntes(request.getCorAntes())
                .corDepois(request.getCorDepois())
                .resultadoObtido(request.getResultadoObtido())
                .satisfacaoCliente(request.getSatisfacaoCliente())
                .fotoAntes(request.getFotoAntes())
                .fotoDepois(request.getFotoDepois())
                .observacoes(request.getObservacoes())
                .recomendacoes(request.getRecomendacoes())
                .proximaManutencao(request.getProximaManutencao())
                .build();

        historico = historicoRepository.save(historico);

        // Atualizar cor atual na ficha
        ficha.setCorAtual(request.getCorDepois());
        ficha.setUltimaQuimica(request.getDataServico());
        ficha.setTemQuimica(true);
        fichaRepository.save(ficha);

        log.info("Histórico de coloração registrado: {} para cliente {}", historico.getId(), ficha.getCliente().getId());

        return HistoricoColoracaoResponse.fromEntity(historico);
    }

    @Transactional(readOnly = true)
    public List<HistoricoColoracaoResponse> buscarHistoricoCliente(Long clienteId, String emailUsuario) {
        return historicoRepository.findByClienteId(clienteId).stream()
                .map(HistoricoColoracaoResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public HistoricoColoracaoResponse buscarHistoricoPorId(Long id) {
        HistoricoColoracao historico = historicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Histórico", id));
        return HistoricoColoracaoResponse.fromEntity(historico);
    }

    // ====== SUGESTÃO DE TONALIDADE ======

    public SugestaoTonalidade sugerirTonalidade(TomPele tomPele, SubtomPele subtomPele) {
        List<SugestaoTonalidade.SugestaoCorResponse> coresRecomendadas = new ArrayList<>();
        List<String> coresEvitar = new ArrayList<>();
        List<String> dicasGerais = new ArrayList<>();

        // Lógica de sugestão baseada no tom e subtom
        if (subtomPele == SubtomPele.QUENTE) {
            coresRecomendadas.add(SugestaoTonalidade.SugestaoCorResponse.builder()
                    .categoria("Loiros")
                    .tons(Arrays.asList("Dourado", "Mel", "Caramelo", "Cobre"))
                    .descricao("Tons quentes que harmonizam com o subtom da pele")
                    .nivel("Claro a Médio")
                    .build());
            coresRecomendadas.add(SugestaoTonalidade.SugestaoCorResponse.builder()
                    .categoria("Castanhos")
                    .tons(Arrays.asList("Chocolate", "Marrom Dourado", "Canela"))
                    .descricao("Castanhos com reflexos quentes")
                    .nivel("Médio")
                    .build());
            coresEvitar.addAll(Arrays.asList("Cinza", "Prata", "Loiro Platinado", "Preto Azulado"));
            dicasGerais.add("Prefira tons com base dourada ou alaranjada");
        } else if (subtomPele == SubtomPele.FRIO) {
            coresRecomendadas.add(SugestaoTonalidade.SugestaoCorResponse.builder()
                    .categoria("Loiros")
                    .tons(Arrays.asList("Platinado", "Cinza", "Pérola", "Champagne"))
                    .descricao("Tons frios que realçam a pele")
                    .nivel("Claro")
                    .build());
            coresRecomendadas.add(SugestaoTonalidade.SugestaoCorResponse.builder()
                    .categoria("Castanhos")
                    .tons(Arrays.asList("Marrom Frio", "Castanho Acinzentado"))
                    .descricao("Castanhos sem reflexos quentes")
                    .nivel("Médio a Escuro")
                    .build());
            coresEvitar.addAll(Arrays.asList("Dourado", "Cobre", "Mel"));
            dicasGerais.add("Evite tons com base amarelada ou alaranjada");
        } else {
            coresRecomendadas.add(SugestaoTonalidade.SugestaoCorResponse.builder()
                    .categoria("Versátil")
                    .tons(Arrays.asList("Castanho Natural", "Loiro Médio", "Chocolate"))
                    .descricao("Tons neutros funcionam bem")
                    .nivel("Qualquer")
                    .build());
            dicasGerais.add("Seu tom de pele neutro permite mais versatilidade nas cores");
        }

        // Ajustes baseados no tom de pele
        if (tomPele == TomPele.MUITO_CLARO || tomPele == TomPele.CLARO) {
            dicasGerais.add("Evite contrastes muito fortes com preto intenso");
        } else if (tomPele == TomPele.MORENO_ESCURO || tomPele == TomPele.NEGRO) {
            dicasGerais.add("Cores vibrantes como borgonha e cobre realçam a pele");
        }

        return SugestaoTonalidade.builder()
                .tomPele(tomPele != null ? tomPele.getDescricao() : null)
                .subtomPele(subtomPele != null ? subtomPele.getDescricao() : null)
                .coresRecomendadas(coresRecomendadas)
                .coresEvitar(coresEvitar)
                .dicasGerais(dicasGerais)
                .build();
    }

    // ====== ENUMS ======

    public ColoracaoEnumsResponse getEnums() {
        return ColoracaoEnumsResponse.builder()
                .tonsPele(Arrays.stream(TomPele.values())
                        .map(t -> new ColoracaoEnumsResponse.EnumItem(t.name(), t.getDescricao()))
                        .toList())
                .subtomsPele(Arrays.stream(SubtomPele.values())
                        .map(s -> new ColoracaoEnumsResponse.EnumItem(s.name(), s.getDescricao()))
                        .toList())
                .tiposCabelo(Arrays.stream(TipoCabelo.values())
                        .map(t -> new ColoracaoEnumsResponse.EnumItem(t.name(), t.getDescricao()))
                        .toList())
                .tecnicas(Arrays.stream(TecnicaColoracao.values())
                        .map(t -> new ColoracaoEnumsResponse.EnumItem(t.name(), t.getNome()))
                        .toList())
                .build();
    }
}
