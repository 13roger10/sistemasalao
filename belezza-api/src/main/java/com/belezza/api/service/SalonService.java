package com.belezza.api.service;

import com.belezza.api.dto.salon.SalonRequest;
import com.belezza.api.dto.salon.SalonResponse;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
import com.belezza.api.entity.Profissional;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SalonService {

    private final SalonRepository salonRepository;
    private final UsuarioRepository usuarioRepository;
    private final ProfissionalRepository profissionalRepository;

    @Transactional
    public SalonResponse criar(SalonRequest request, String emailAdmin) {
        log.info("Criando salão para admin: {}", emailAdmin);

        Usuario admin = usuarioRepository.findByEmailAndAtivoTrue(emailAdmin)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailAdmin));

        if (admin.getRole() != Role.ADMIN) {
            throw new BusinessException("Apenas usuários ADMIN podem criar salões");
        }

        if (salonRepository.existsByAdminId(admin.getId())) {
            throw new DuplicateResourceException("Salão", "admin", emailAdmin);
        }

        Salon salon = Salon.builder()
                .nome(request.getNome().trim())
                .descricao(request.getDescricao())
                .endereco(request.getEndereco())
                .cidade(request.getCidade())
                .estado(request.getEstado())
                .cep(request.getCep())
                .telefone(request.getTelefone())
                .cnpj(request.getCnpj())
                .horarioAbertura(parseTime(request.getHorarioAbertura(), "08:00"))
                .horarioFechamento(parseTime(request.getHorarioFechamento(), "20:00"))
                .intervaloAgendamentoMinutos(request.getIntervaloAgendamentoMinutos() != null ? request.getIntervaloAgendamentoMinutos() : 30)
                .antecedenciaMinimaHoras(request.getAntecedenciaMinimaHoras() != null ? request.getAntecedenciaMinimaHoras() : 2)
                .cancelamentoMinimoHoras(request.getCancelamentoMinimoHoras() != null ? request.getCancelamentoMinimoHoras() : 2)
                .maxNoShowsPermitidos(request.getMaxNoShowsPermitidos() != null ? request.getMaxNoShowsPermitidos() : 3)
                .aceitaAgendamentoOnline(request.getAceitaAgendamentoOnline() != null ? request.getAceitaAgendamentoOnline() : true)
                .admin(admin)
                .build();
        validarExpediente(salon.getHorarioAbertura(), salon.getHorarioFechamento(), "do salão");

        salon = salonRepository.save(salon);
        log.info("Salão criado com id: {}", salon.getId());

        return SalonResponse.fromEntity(salon);
    }

    @Transactional(readOnly = true)
    public SalonResponse buscarPorId(Long id) {
        Salon salon = salonRepository.findByIdAndAtivoTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", id));
        return SalonResponse.fromEntity(salon);
    }

    @Transactional(readOnly = true)
    public SalonResponse buscarPorAdmin(String emailAdmin) {
        Usuario admin = usuarioRepository.findByEmailAndAtivoTrue(emailAdmin)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailAdmin));

        Salon salon = unidadeAtualDoAdmin(admin)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", "admin", emailAdmin));

        return SalonResponse.fromEntity(salon);
    }

    @Transactional(readOnly = true)
    public List<SalonResponse> listarAtivos() {
        return salonRepository.findByAtivoTrue().stream()
                .map(SalonResponse::fromEntity)
                .toList();
    }

    @Transactional
    public SalonResponse atualizar(Long id, SalonRequest request, String emailAdmin) {
        log.info("Atualizando salão id: {}", id);

        Salon salon = getSalonDoAdmin(id, emailAdmin);

        salon.setNome(request.getNome().trim());
        if (request.getDescricao() != null) salon.setDescricao(request.getDescricao());
        if (request.getEndereco() != null) salon.setEndereco(request.getEndereco());
        if (request.getCidade() != null) salon.setCidade(request.getCidade());
        if (request.getEstado() != null) salon.setEstado(request.getEstado());
        if (request.getCep() != null) salon.setCep(request.getCep());
        if (request.getTelefone() != null) salon.setTelefone(request.getTelefone());
        if (request.getCnpj() != null) salon.setCnpj(request.getCnpj());
        if (request.getHorarioAbertura() != null) salon.setHorarioAbertura(horario(request.getHorarioAbertura(), "abertura"));
        if (request.getHorarioFechamento() != null) salon.setHorarioFechamento(horario(request.getHorarioFechamento(), "fechamento"));
        validarExpediente(salon.getHorarioAbertura(), salon.getHorarioFechamento(), "do salão");
        if (request.getIntervaloAgendamentoMinutos() != null) salon.setIntervaloAgendamentoMinutos(request.getIntervaloAgendamentoMinutos());
        if (request.getAntecedenciaMinimaHoras() != null) salon.setAntecedenciaMinimaHoras(request.getAntecedenciaMinimaHoras());
        if (request.getCancelamentoMinimoHoras() != null) salon.setCancelamentoMinimoHoras(request.getCancelamentoMinimoHoras());
        if (request.getMaxNoShowsPermitidos() != null) salon.setMaxNoShowsPermitidos(request.getMaxNoShowsPermitidos());
        if (request.getAceitaAgendamentoOnline() != null) salon.setAceitaAgendamentoOnline(request.getAceitaAgendamentoOnline());

        salon = salonRepository.save(salon);
        log.info("Salão atualizado com sucesso: {}", salon.getId());

        return SalonResponse.fromEntity(salon);
    }

    @Transactional
    public void desativar(Long id, String emailAdmin) {
        log.info("Desativando salão id: {}", id);
        Salon salon = getSalonDoAdmin(id, emailAdmin);
        salon.setAtivo(false);
        salonRepository.save(salon);
        log.info("Salão desativado: {}", id);
    }

    // Helper to get salon and validate admin ownership
    public Salon getSalonDoAdmin(Long salonId, String emailAdmin) {
        Usuario admin = usuarioRepository.findByEmailAndAtivoTrue(emailAdmin)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailAdmin));

        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", salonId));

        if (!salon.getAdmin().getId().equals(admin.getId())) {
            throw new AccessDeniedException("Você não tem permissão para gerenciar este salão");
        }

        return salon;
    }

    // Helper to get salon entity for other services
    public Salon getSalonEntity(Long salonId) {
        return salonRepository.findByIdAndAtivoTrue(salonId)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", salonId));
    }

    // Helper to get salon by admin email
    public Salon getSalonByAdminEmail(String emailAdmin) {
        Usuario admin = usuarioRepository.findByEmailAndAtivoTrue(emailAdmin)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", emailAdmin));

        return unidadeAtualDoAdmin(admin)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", "admin", emailAdmin));
    }

    /**
     * Salão de quem está operando (BUG-013): o ADMIN usa a unidade atual dele, como em
     * {@link #getSalonByAdminEmail}; a equipe (recepcionista e profissional) usa o salão do token.
     * Antes os módulos só procuravam "o salão do admin" e a equipe recebia 404. Cliente não opera.
     */
    @Transactional(readOnly = true)
    public Salon getSalonDoOperador(String email) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));
        if (usuario.getRole() == Role.ADMIN) {
            return unidadeAtualDoAdmin(usuario)
                    .orElseThrow(() -> new ResourceNotFoundException("Salão", "admin", email));
        }
        if (usuario.getRole() != Role.RECEPCIONISTA && usuario.getRole() != Role.PROFISSIONAL) {
            throw new AccessDeniedException("Acesso restrito à equipe do salão");
        }
        Long doToken = TenantContext.getCurrentTenant();
        if (doToken == null) {
            throw new AccessDeniedException("Sessão sem salão: entre novamente");
        }
        return salonRepository.findByIdAndAtivoTrue(doToken)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", doToken));
    }

    /**
     * Unidade em que o admin está trabalhando (ele pode ter várias): a do token da requisição
     * (claim salonId), se for dele e estiver ativa; senão a da sessão, de {@link #unidadePreferida}.
     * Assim todas as telas que buscam "o salão do admin" passam a respeitar a unidade escolhida.
     */
    public Optional<Salon> unidadeAtualDoAdmin(Usuario admin) {
        Long doToken = TenantContext.getCurrentTenant();
        if (doToken != null) {
            Optional<Salon> salon = salonRepository.findByIdAndAdminId(doToken, admin.getId()).filter(Salon::isAtivo);
            if (salon.isPresent()) {
                return salon;
            }
        }
        return unidadePreferida(admin);
    }

    /**
     * Unidade que vai no token do login e da renovação: a última escolhida pelo admin (se ainda
     * for dele e estiver ativa), senão a primeira ativa (a sede).
     */
    public Optional<Salon> unidadePreferida(Usuario admin) {
        Salon escolhida = admin.getUnidadeAtiva();
        if (escolhida != null) {
            Optional<Salon> salon = salonRepository.findByIdAndAdminId(escolhida.getId(), admin.getId()).filter(Salon::isAtivo);
            if (salon.isPresent()) {
                return salon;
            }
        }
        return salonRepository.findFirstByAdminIdAndAtivoTrueOrderByIdAsc(admin.getId());
    }

    /**
     * Unidades ativas do mesmo dono do salão informado (inclusive ele), da mais antiga para a mais
     * nova: o "estabelecimento" ao qual a equipe desse salão pode vincular um cliente.
     */
    @Transactional(readOnly = true)
    public List<Salon> unidadesDoMesmoDono(Long salonId) {
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", salonId));
        return salonRepository.findByAdminIdOrderByIdAsc(salon.getAdmin().getId()).stream()
                .filter(Salon::isAtivo)
                .toList();
    }

    private LocalTime parseTime(String time, String defaultTime) {
        if (time == null || time.isBlank()) {
            return LocalTime.parse(defaultTime);
        }
        return horario(time, "funcionamento");
    }

    /** Horário "HH:mm"; um valor inválido ("25:00") vira mensagem de negócio em vez de erro 500. */
    public static LocalTime horario(String valor, String campo) {
        try {
            return LocalTime.parse(valor.trim());
        } catch (java.time.format.DateTimeParseException e) {
            throw new BusinessException("Horário de " + campo + " inválido: \"" + valor + "\" (use HH:mm)");
        }
    }

    /**
     * Abertura antes do fechamento (BUG-032): abertura 19:00 e fechamento 08:00 era salvo e
     * travava todos os agendamentos — nenhum horário cabia no expediente.
     */
    public static void validarExpediente(LocalTime abertura, LocalTime fechamento, String deQuem) {
        if (abertura != null && fechamento != null && !abertura.isBefore(fechamento)) {
            throw new BusinessException(String.format("O horário de abertura %s (%s) deve ser antes do de fechamento (%s)",
                    deQuem, abertura, fechamento));
        }
    }

    /**
     * Get salon ID for the currently logged-in user.
     * Works for both ADMIN (salon owner) and PROFISSIONAL users.
     */
    @Transactional(readOnly = true)
    public Long getSalonIdDoUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Usuário não autenticado");
        }

        String email = auth.getName();
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));

        // If user is ADMIN, get their salon
        if (usuario.getRole() == Role.ADMIN) {
            Salon salon = unidadeAtualDoAdmin(usuario)
                    .orElseThrow(() -> new BusinessException("Salão não encontrado para o administrador"));
            return salon.getId();
        }

        // If user is PROFISSIONAL, get salon from their profile
        if (usuario.getRole() == Role.PROFISSIONAL) {
            Profissional profissional = profissionalRepository.findByUsuarioIdAndAtivoTrue(usuario.getId())
                    .orElseThrow(() -> new BusinessException("Perfil de profissional não encontrado"));
            return profissional.getSalon().getId();
        }

        throw new BusinessException("Usuário não possui acesso ao dashboard");
    }

    /**
     * Get the currently logged-in user's email.
     */
    public String getEmailUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Usuário não autenticado");
        }
        return auth.getName();
    }

    /**
     * Save salon entity directly.
     */
    @Transactional
    public Salon save(Salon salon) {
        log.info("Salvando salão id: {}", salon.getId());
        return salonRepository.save(salon);
    }
}
