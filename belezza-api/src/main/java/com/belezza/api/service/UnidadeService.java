package com.belezza.api.service;

import com.belezza.api.dto.salon.UnidadeRequest;
import com.belezza.api.dto.salon.UnidadeResponse;
import com.belezza.api.entity.HorarioFuncionamentoSalon;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.HorarioFuncionamentoSalonRepository;
import com.belezza.api.repository.PagamentoRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.ServicoRepository;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Unidades do administrador. Cada unidade é um salão completo (equipe, serviços, clientes, agenda
 * e caixa próprios); o admin escolhe em qual trabalha e todas as telas mostram só os dados dela.
 * Toda operação confere que a unidade é do próprio admin — a de outro dono responde como
 * inexistente, sem revelar que o id existe.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UnidadeService {

    private final SalonRepository salonRepository;
    private final UsuarioRepository usuarioRepository;
    private final SalonService salonService;
    private final HorarioFuncionamentoSalonRepository horarioFuncionamentoSalonRepository;
    private final ProfissionalRepository profissionalRepository;
    private final ClienteRepository clienteRepository;
    private final ServicoRepository servicoRepository;
    private final PagamentoRepository pagamentoRepository;

    @Transactional(readOnly = true)
    public List<UnidadeResponse> listar(String emailAdmin) {
        Usuario admin = getAdmin(emailAdmin);
        List<Salon> unidades = salonRepository.findByAdminIdOrderByIdAsc(admin.getId());
        Long atual = salonService.unidadeAtualDoAdmin(admin).map(Salon::getId).orElse(null);
        Long sede = unidades.isEmpty() ? null : unidades.get(0).getId();
        LocalDateTime fim = LocalDateTime.now();
        LocalDateTime inicio = fim.minusDays(30);

        return unidades.stream()
                .map(s -> {
                    BigDecimal faturamento = pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(s.getId(), inicio, fim);
                    return UnidadeResponse.of(s, s.getId().equals(sede), s.getId().equals(atual),
                            profissionalRepository.countActiveBySalonId(s.getId()),
                            clienteRepository.countActiveBySalonId(s.getId()),
                            servicoRepository.countActiveBySalonId(s.getId()),
                            faturamento != null ? faturamento : BigDecimal.ZERO);
                })
                .toList();
    }

    /**
     * Cria a unidade com as regras de agendamento, a comissão padrão e os horários de
     * funcionamento da unidade atual, para ela já nascer pronta para receber agendamentos.
     * Equipe, serviços e clientes começam vazios: são de cada unidade.
     */
    @Transactional
    public UnidadeResponse criar(UnidadeRequest request, String emailAdmin) {
        Usuario admin = getAdmin(emailAdmin);
        Salon modelo = salonService.unidadeAtualDoAdmin(admin)
                .orElseThrow(() -> new BusinessException("Cadastre o primeiro salão antes de criar outras unidades"));

        Salon unidade = Salon.builder()
                .admin(admin)
                .horarioAbertura(modelo.getHorarioAbertura())
                .horarioFechamento(modelo.getHorarioFechamento())
                .intervaloAgendamentoMinutos(modelo.getIntervaloAgendamentoMinutos())
                .antecedenciaMinimaHoras(modelo.getAntecedenciaMinimaHoras())
                .cancelamentoMinimoHoras(modelo.getCancelamentoMinimoHoras())
                .maxNoShowsPermitidos(modelo.getMaxNoShowsPermitidos())
                .bufferEntreAgendamentosMinutos(modelo.getBufferEntreAgendamentosMinutos())
                .maxAntecediaDias(modelo.getMaxAntecediaDias())
                .permiteAgendamentoMesmoDia(modelo.isPermiteAgendamentoMesmoDia())
                .aceitaAgendamentoOnline(modelo.isAceitaAgendamentoOnline())
                .tipoComissaoPadrao(modelo.getTipoComissaoPadrao())
                .valorComissaoPadrao(modelo.getValorComissaoPadrao())
                .build();
        aplicar(unidade, request);
        unidade = salonRepository.save(unidade);

        for (HorarioFuncionamentoSalon h : horarioFuncionamentoSalonRepository.findBySalonId(modelo.getId())) {
            horarioFuncionamentoSalonRepository.save(HorarioFuncionamentoSalon.builder()
                    .salon(unidade)
                    .diaSemana(h.getDiaSemana())
                    .horaInicio(h.getHoraInicio())
                    .horaFim(h.getHoraFim())
                    .ativo(h.isAtivo())
                    .build());
        }

        log.info("Admin {} criou a unidade {} (modelo: unidade {})", admin.getId(), unidade.getId(), modelo.getId());
        return UnidadeResponse.of(unidade, false, false, 0, 0, 0, BigDecimal.ZERO);
    }

    @Transactional
    public UnidadeResponse atualizar(Long id, UnidadeRequest request, String emailAdmin) {
        Usuario admin = getAdmin(emailAdmin);
        Salon unidade = getUnidade(id, admin);
        aplicar(unidade, request);
        salonRepository.save(unidade);
        return resposta(unidade, admin);
    }

    @Transactional
    public UnidadeResponse ativar(Long id, String emailAdmin) {
        Usuario admin = getAdmin(emailAdmin);
        Salon unidade = getUnidade(id, admin);
        unidade.setAtivo(true);
        salonRepository.save(unidade);
        log.info("Admin {} ativou a unidade {}", admin.getId(), id);
        return resposta(unidade, admin);
    }

    /**
     * Desativa a unidade: some do agendamento online e ninguém mais entra nela. Os dados ficam
     * guardados e ela pode ser reativada. A unidade em uso não pode ser desativada (o admin
     * ficaria sem unidade) — ele precisa entrar em outra antes.
     */
    @Transactional
    public UnidadeResponse desativar(Long id, String emailAdmin) {
        Usuario admin = getAdmin(emailAdmin);
        Salon unidade = getUnidade(id, admin);
        Long atual = salonService.unidadeAtualDoAdmin(admin).map(Salon::getId).orElse(null);
        if (unidade.getId().equals(atual)) {
            throw new BusinessException("Esta é a unidade em que você está trabalhando. Entre em outra unidade antes de desativá-la.");
        }
        unidade.setAtivo(false);
        salonRepository.save(unidade);
        log.info("Admin {} desativou a unidade {}", admin.getId(), id);
        return resposta(unidade, admin);
    }

    private UnidadeResponse resposta(Salon unidade, Usuario admin) {
        Long sede = salonRepository.findFirstByAdminIdOrderByIdAsc(admin.getId()).map(Salon::getId).orElse(null);
        Long atual = salonService.unidadeAtualDoAdmin(admin).map(Salon::getId).orElse(null);
        BigDecimal faturamento = pagamentoRepository.sumFaturamentoBySalonIdAndPeriod(
                unidade.getId(), LocalDateTime.now().minusDays(30), LocalDateTime.now());
        return UnidadeResponse.of(unidade, unidade.getId().equals(sede), unidade.getId().equals(atual),
                profissionalRepository.countActiveBySalonId(unidade.getId()),
                clienteRepository.countActiveBySalonId(unidade.getId()),
                servicoRepository.countActiveBySalonId(unidade.getId()),
                faturamento != null ? faturamento : BigDecimal.ZERO);
    }

    private void aplicar(Salon unidade, UnidadeRequest request) {
        unidade.setNome(request.getNome().trim());
        unidade.setTelefone(vazioComoNulo(request.getTelefone()));
        unidade.setCnpj(vazioComoNulo(request.getCnpj()));
        unidade.setDescricao(vazioComoNulo(request.getDescricao()));
        unidade.setEndereco(vazioComoNulo(request.getEndereco()));
        unidade.setCidade(vazioComoNulo(request.getCidade()));
        unidade.setEstado(request.getEstado() == null || request.getEstado().isBlank()
                ? null : request.getEstado().trim().toUpperCase());
        unidade.setCep(vazioComoNulo(request.getCep()));
    }

    private static String vazioComoNulo(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

    private Salon getUnidade(Long id, Usuario admin) {
        return salonRepository.findByIdAndAdminId(id, admin.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidade", id));
    }

    private Usuario getAdmin(String email) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));
        if (usuario.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Apenas o administrador gerencia unidades");
        }
        return usuario;
    }
}
