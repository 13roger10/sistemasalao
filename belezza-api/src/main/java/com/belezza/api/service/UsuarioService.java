package com.belezza.api.service;

import com.belezza.api.dto.user.*;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.AgendamentoRepository;
import com.belezza.api.repository.BackupCodeRepository;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.FidelidadeClienteRepository;
import com.belezza.api.repository.NotificacaoRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.PushSubscriptionRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Service for user management with multi-unit support.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final ProfissionalRepository profissionalRepository;
    private final SalonRepository salonRepository;
    private final PasswordEncoder passwordEncoder;
    private final AgendamentoRepository agendamentoRepository;
    private final ClienteRepository clienteRepository;
    private final FidelidadeClienteRepository fidelidadeClienteRepository;
    private final NotificacaoRepository notificacaoRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final BackupCodeRepository backupCodeRepository;

    /**
     * List users with pagination and filters.
     * Every role sees only users from its own salon (ADMIN also sees the salon's clients) — access to this method at all is already restricted to those three roles plus
     * ADMIN at the controller (@PreAuthorize); CLIENTE can never reach it.
     */
    @Transactional(readOnly = true)
    public UsuarioPageResponse listar(String emailUsuario, Role roleFilter, String search,
                                       int page, int size) {
        log.info("Listando usuários - email: {}, roleFilter: {}, search: {}", emailUsuario, roleFilter, search);

        Usuario usuarioLogado = getUsuarioByEmail(emailUsuario);
        Pageable pageable = PageRequest.of(page, size);
        Page<Usuario> usuarios;

        // Multi-unidade: PROFISSIONAL vê apenas sua unidade
        if (usuarioLogado.getRole() == Role.PROFISSIONAL) {
            Optional<Profissional> profissional = profissionalRepository.findByUsuarioIdAndAtivoTrue(usuarioLogado.getId());
            if (profissional.isEmpty()) {
                throw new BusinessException("Profissional não encontrado para este usuário");
            }
            Long salonId = profissional.get().getSalon().getId();

            if (roleFilter != null) {
                usuarios = usuarioRepository.findBySalonIdAndRole(salonId, roleFilter, pageable);
            } else {
                usuarios = usuarioRepository.findBySalonId(salonId, pageable);
            }
        } else if (usuarioLogado.getRole() == Role.RECEPCIONISTA) {
            // Multi-unidade: RECEPCIONISTA vê apenas sua unidade
            if (usuarioLogado.getSalon() == null) {
                throw new BusinessException("Recepcionista sem salão vinculado");
            }
            Long salonId = usuarioLogado.getSalon().getId();

            if (roleFilter != null) {
                usuarios = usuarioRepository.findBySalonIdAndRole(salonId, roleFilter, pageable);
            } else {
                usuarios = usuarioRepository.findBySalonId(salonId, pageable);
            }
        } else {
            // ADMIN vê os usuários do próprio salão (equipe, clientes e ele mesmo) — antes via
            // todos os usuários de todos os salões. Admin ainda sem salão não vê ninguém.
            Long salonId = salaoDoAdmin(usuarioLogado);
            if (salonId == null) {
                return toPageResponse(Page.empty(pageable));
            }
            String termo = search != null ? search.trim() : "";
            if (roleFilter != null) {
                usuarios = usuarioRepository.searchVinculadosAoSalaoAndRole(salonId, termo, roleFilter, pageable);
            } else {
                usuarios = usuarioRepository.searchVinculadosAoSalao(salonId, termo, pageable);
            }
        }

        return toPageResponse(usuarios);
    }

    /**
     * Get a user by ID with salon information.
     */
    @Transactional(readOnly = true)
    public UsuarioListResponse buscarPorId(Long id, String emailUsuario) {
        Usuario usuarioLogado = getUsuarioByEmail(emailUsuario);
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));

        // Multi-unidade: verificar acesso
        verificarAcessoUsuario(usuarioLogado, usuario);

        Optional<Profissional> profissional = profissionalRepository.findByUsuarioId(usuario.getId());
        return UsuarioListResponse.fromEntityWithProfissional(usuario, profissional.orElse(null));
    }

    /**
     * Create a new user.
     */
    @Transactional
    public UsuarioListResponse criar(CreateUsuarioRequest request, String emailAdmin) {
        log.info("Criando usuário: {} por {}", request.getEmail(), emailAdmin);

        // Verificar se email já existe
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Usuário", "email", request.getEmail());
        }

        // Equipe só pode ser criada no salão de quem cria: um salonId de outro salão no corpo
        // colocava o novo profissional/recepcionista dentro da equipe de outro estabelecimento.
        Usuario criador = getUsuarioByEmail(emailAdmin);
        Long salonDoCriador = criador.getRole() == Role.ADMIN
                ? salaoDoAdmin(criador)
                : (criador.getSalon() != null ? criador.getSalon().getId() : null);
        if (request.getSalonId() != null && !request.getSalonId().equals(salonDoCriador)) {
            throw new AccessDeniedException("Acesso negado: não é possível criar usuários em outro estabelecimento");
        }

        // Verificar telefone duplicado
        if (request.getTelefone() != null && !request.getTelefone().isBlank()
            && usuarioRepository.existsByTelefone(request.getTelefone())) {
            throw new DuplicateResourceException("Usuário", "telefone", request.getTelefone());
        }

        Usuario usuario = Usuario.builder()
                .nome(request.getNome().trim())
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .telefone(request.getTelefone())
                .avatarUrl(request.getAvatarUrl())
                .role(request.getRole())
                .plano(request.getPlano() != null ? request.getPlano() : Plano.FREE)
                .ativo(true)
                .emailVerificado(false)
                .build();

        usuario = usuarioRepository.save(usuario);
        log.info("Usuário criado com id: {}", usuario.getId());

        // Se for PROFISSIONAL, vincular ao salão de quem está criando
        Profissional profissional = null;
        if (request.getRole() == Role.PROFISSIONAL && salonDoCriador != null) {
            profissional = vincularProfissionalAoSalon(usuario, salonDoCriador);
        }

        // Se for RECEPCIONISTA, vincular ao salão (direto no Usuario, sem entidade própria)
        if (request.getRole() == Role.RECEPCIONISTA) {
            if (salonDoCriador != null) {
                Salon salon = salonRepository.findById(salonDoCriador)
                        .orElseThrow(() -> new ResourceNotFoundException("Salão", salonDoCriador));
                usuario.setSalon(salon);
                usuario = usuarioRepository.save(usuario);
                log.info("Recepcionista {} vinculada ao salão {}", usuario.getId(), salonDoCriador);
            }
        }

        // Se for CLIENTE, criar o cadastro de cliente no salão de quem está criando
        if (request.getRole() == Role.CLIENTE && salonDoCriador != null) {
            Salon salon = salonRepository.findById(salonDoCriador)
                    .orElseThrow(() -> new ResourceNotFoundException("Salão", salonDoCriador));
            clienteRepository.save(Cliente.builder()
                    .usuario(usuario)
                    .salon(salon)
                    .aceitaMarketing(true)
                    .aceitaWhatsApp(true)
                    .aceitaEmail(true)
                    .build());
            log.info("Cliente {} vinculado ao salão {}", usuario.getId(), salonDoCriador);
        }

        return UsuarioListResponse.fromEntityWithProfissional(usuario, profissional);
    }

    /**
     * Update an existing user.
     */
    @Transactional
    public UsuarioListResponse atualizar(Long id, UpdateUsuarioRequest request, String emailAdmin) {
        log.info("Atualizando usuário id: {} por {}", id, emailAdmin);

        Usuario usuarioLogado = getUsuarioByEmail(emailAdmin);
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));

        final boolean isSelf = usuario.getId().equals(usuarioLogado.getId());
        final boolean isAdmin = usuarioLogado.getRole() == Role.ADMIN;

        // SEC-001 (Broken Access Control / Account Takeover):
        // Apenas um ADMIN pode editar outro usuário. Qualquer outro perfil (CLIENTE,
        // RECEPCIONISTA, PROFISSIONAL) só pode editar a própria conta. Sem esta barreira,
        // qualquer usuário autenticado conseguia alterar dados — inclusive a SENHA — de
        // qualquer outra conta (inclusive de ADMIN de outro estabelecimento) apenas
        // informando o ID no path.
        if (!isSelf && !isAdmin) {
            log.warn("Bloqueado: usuário {} (role={}) tentou editar a conta {}",
                    usuarioLogado.getId(), usuarioLogado.getRole(), usuario.getId());
            throw new AccessDeniedException("Você não tem permissão para editar outro usuário");
        }

        // SEC-001: ADMIN editando terceiros não pode alterar outro ADMIN e fica restrito
        // ao seu próprio estabelecimento (isolamento de tenant).
        if (isAdmin && !isSelf) {
            if (usuario.getRole() == Role.ADMIN) {
                throw new AccessDeniedException("Não é permitido editar outro administrador");
            }
            verificarMesmoSalao(usuarioLogado, usuario);
        }

        // O salonId do corpo só pode apontar para o salão do próprio admin — antes permitia
        // mover um profissional (ou vincular um novo) a outro estabelecimento.
        if (isAdmin && request.getSalonId() != null
                && !request.getSalonId().equals(salaoDoAdmin(usuarioLogado))) {
            throw new AccessDeniedException("Acesso negado: não é possível vincular usuários a outro estabelecimento");
        }

        // SEC-001: auto-serviço (não-admin editando a si mesmo) só pode alterar um
        // subconjunto seguro de campos (nome, telefone, avatar e a própria senha).
        // Campos administrativos (role, plano, ativo, emailVerificado, salonId) são
        // recusados para evitar auto-elevação de privilégios / mass assignment.
        if (!isAdmin) {
            if (request.getRole() != null || request.getPlano() != null
                    || request.getAtivo() != null || request.getEmailVerificado() != null
                    || request.getSalonId() != null) {
                log.warn("Bloqueado: usuário {} tentou alterar campos administrativos do próprio perfil",
                        usuarioLogado.getId());
                throw new AccessDeniedException("Você não pode alterar campos administrativos do seu perfil");
            }
        }

        // Verificar email duplicado (troca de email só é permitida a ADMIN; o auto-serviço
        // altera apenas nome/telefone/avatar/senha)
        if (request.getEmail() != null && !request.getEmail().equals(usuario.getEmail())) {
            if (!isAdmin) {
                throw new AccessDeniedException("Você não pode alterar o email do seu perfil");
            }
            if (usuarioRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Usuário", "email", request.getEmail());
            }
            usuario.setEmail(request.getEmail().toLowerCase().trim());
        }

        // Atualizar campos seguros (auto-serviço e admin)
        if (request.getNome() != null) usuario.setNome(request.getNome().trim());
        if (request.getTelefone() != null) usuario.setTelefone(request.getTelefone());
        if (request.getAvatarUrl() != null) usuario.setAvatarUrl(request.getAvatarUrl());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            usuario.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        // Campos administrativos — somente ADMIN
        if (isAdmin) {
            if (request.getPlano() != null) usuario.setPlano(request.getPlano());
            if (request.getAtivo() != null) usuario.setAtivo(request.getAtivo());
            if (request.getEmailVerificado() != null) usuario.setEmailVerificado(request.getEmailVerificado());
        }

        // Atualizar role (apenas ADMIN pode mudar roles)
        if (request.getRole() != null && usuarioLogado.getRole() == Role.ADMIN) {
            Role roleAntiga = usuario.getRole();
            usuario.setRole(request.getRole());

            // Se mudou para PROFISSIONAL, vincular ao salão
            if (request.getRole() == Role.PROFISSIONAL && roleAntiga != Role.PROFISSIONAL) {
                Long salonId = salaoDoAdmin(usuarioLogado);
                if (salonId != null && !profissionalRepository.existsByUsuarioId(usuario.getId())) {
                    vincularProfissionalAoSalon(usuario, salonId);
                }
            }
        }

        // Atualizar salão do profissional
        if (request.getSalonId() != null && usuario.getRole() == Role.PROFISSIONAL) {
            Optional<Profissional> profOpt = profissionalRepository.findByUsuarioId(usuario.getId());
            if (profOpt.isPresent()) {
                Profissional prof = profOpt.get();
                Salon novoSalon = salonRepository.findById(request.getSalonId())
                        .orElseThrow(() -> new ResourceNotFoundException("Salão", request.getSalonId()));
                prof.setSalon(novoSalon);
                profissionalRepository.save(prof);
                log.info("Profissional {} movido para salão {}", usuario.getId(), request.getSalonId());
            }
        }

        usuario = usuarioRepository.save(usuario);
        log.info("Usuário atualizado: {}", usuario.getId());

        Optional<Profissional> profissional = profissionalRepository.findByUsuarioId(usuario.getId());
        return UsuarioListResponse.fromEntityWithProfissional(usuario, profissional.orElse(null));
    }

    /**
     * SEC-002: atualização de AUTO-SERVIÇO do próprio perfil.
     * O usuário autenticado só pode alterar os campos da allowlist do
     * {@link UpdateMeuPerfilRequest} (nome, telefone, avatar e a própria senha).
     * Nenhum campo administrativo (role, plano, ativo, emailVerificado, salonId,
     * email) é aceito por este caminho, eliminando a possibilidade de mass
     * assignment / auto-elevação de privilégios.
     */
    @Transactional
    public UsuarioListResponse atualizarMeuPerfil(String email, UpdateMeuPerfilRequest request) {
        Usuario usuario = getUsuarioByEmail(email);

        if (request.getNome() != null) usuario.setNome(request.getNome().trim());
        if (request.getTelefone() != null) usuario.setTelefone(request.getTelefone());
        if (request.getAvatarUrl() != null) usuario.setAvatarUrl(request.getAvatarUrl());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            usuario.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        usuario = usuarioRepository.save(usuario);
        log.info("Perfil próprio atualizado pelo usuário: {}", usuario.getId());

        Optional<Profissional> profissional = profissionalRepository.findByUsuarioId(usuario.getId());
        return UsuarioListResponse.fromEntityWithProfissional(usuario, profissional.orElse(null));
    }

    /**
     * Deactivate (soft delete) a user.
     */
    @Transactional
    public void desativar(Long id, String emailAdmin) {
        log.info("Desativando usuário id: {} por {}", id, emailAdmin);

        Usuario usuarioLogado = getUsuarioByEmail(emailAdmin);
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));

        // Não pode desativar a si mesmo
        if (usuario.getId().equals(usuarioLogado.getId())) {
            throw new BusinessException("Você não pode desativar sua própria conta");
        }

        // Verificar acesso
        verificarAcessoUsuario(usuarioLogado, usuario);

        usuario.setAtivo(false);
        usuarioRepository.save(usuario);

        // Desativar profissional vinculado
        profissionalRepository.findByUsuarioId(usuario.getId())
                .ifPresent(p -> {
                    p.setAtivo(false);
                    profissionalRepository.save(p);
                });

        log.info("Usuário desativado: {}", id);
    }

    /**
     * Exclui definitivamente um usuário que não possui histórico no sistema.
     *
     * <p>Usuários com agendamentos (como cliente ou profissional) ou que administram um salão
     * não podem ser excluídos — o histórico de atendimentos/financeiro precisa ser preservado;
     * para esses, use {@link #desativar}. Dados acessórios do próprio usuário (notificações,
     * inscrições de push, códigos 2FA, cadastro de cliente/profissional sem histórico) são
     * removidos junto. Qualquer outro vínculo remanescente é barrado pelas FKs do banco e
     * devolvido como a mesma mensagem de negócio.</p>
     */
    @Transactional
    public void excluirPermanentemente(Long id, String emailAdmin) {
        log.info("Exclusão definitiva do usuário id: {} solicitada por {}", id, emailAdmin);

        Usuario usuarioLogado = getUsuarioByEmail(emailAdmin);
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));

        if (usuario.getId().equals(usuarioLogado.getId())) {
            throw new BusinessException("Você não pode excluir sua própria conta");
        }

        verificarAcessoUsuario(usuarioLogado, usuario);

        if (salonRepository.findByAdminId(usuario.getId()).isPresent()) {
            throw new BusinessException("Este usuário é administrador de um salão e não pode ser excluído. Desative-o.");
        }

        long agendamentos = agendamentoRepository.countEnvolvendoUsuario(usuario.getId());
        if (agendamentos > 0) {
            throw new BusinessException(String.format(
                    "Este usuário possui %d agendamento(s) no histórico e não pode ser excluído. Desative-o.",
                    agendamentos));
        }

        // Dados acessórios do próprio usuário
        notificacaoRepository.deleteAllByUsuarioId(usuario.getId());
        pushSubscriptionRepository.deleteAllByUsuarioId(usuario.getId());
        backupCodeRepository.deleteAllByUsuarioId(usuario.getId());

        // Cadastros de cliente/profissional sem histórico (horários e serviços do profissional
        // saem junto via cascade/join table)
        for (Cliente cliente : clienteRepository.findByUsuarioId(usuario.getId())) {
            fidelidadeClienteRepository.deleteAllByClienteId(cliente.getId());
            clienteRepository.delete(cliente);
        }
        profissionalRepository.findByUsuarioId(usuario.getId()).ifPresent(profissionalRepository::delete);

        try {
            usuarioRepository.delete(usuario);
            usuarioRepository.flush();
        } catch (DataIntegrityViolationException e) {
            log.warn("Exclusão do usuário {} barrada por registros vinculados: {}", id, e.getMostSpecificCause().getMessage());
            throw new BusinessException("Este usuário possui registros vinculados no sistema e não pode ser excluído. Desative-o.");
        }

        log.info("Usuário excluído definitivamente: {}", id);
    }

    /**
     * Um ADMIN só acessa usuários vinculados ao próprio salão (como admin dono, membro da equipe,
     * cliente ou profissional). Usuários sem vínculo com nenhum salão são permitidos.
     */
    private void verificarMesmoSalao(Usuario usuarioLogado, Usuario usuarioAlvo) {
        Long salonLogadoId = salaoDoAdmin(usuarioLogado);

        java.util.Set<Long> saloesAlvo = new java.util.HashSet<>();
        if (usuarioAlvo.getSalon() != null) saloesAlvo.add(usuarioAlvo.getSalon().getId());
        salonRepository.findByAdminId(usuarioAlvo.getId())
                .ifPresent(s -> saloesAlvo.add(s.getId()));
        clienteRepository.findByUsuarioId(usuarioAlvo.getId())
                .forEach(c -> saloesAlvo.add(c.getSalon().getId()));
        profissionalRepository.findByUsuarioId(usuarioAlvo.getId())
                .ifPresent(p -> saloesAlvo.add(p.getSalon().getId()));

        if (!saloesAlvo.isEmpty() && (salonLogadoId == null || !saloesAlvo.contains(salonLogadoId))) {
            throw new AccessDeniedException("Acesso negado: usuário pertence a outro estabelecimento");
        }
    }

    /**
     * Reactivate a user.
     */
    @Transactional
    public UsuarioListResponse reativar(Long id, String emailAdmin) {
        log.info("Reativando usuário id: {} por {}", id, emailAdmin);

        Usuario usuarioLogado = getUsuarioByEmail(emailAdmin);
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));

        verificarAcessoUsuario(usuarioLogado, usuario);

        usuario.setAtivo(true);
        usuario = usuarioRepository.save(usuario);

        // Reativar profissional vinculado
        profissionalRepository.findByUsuarioId(usuario.getId())
                .ifPresent(p -> {
                    p.setAtivo(true);
                    profissionalRepository.save(p);
                });

        log.info("Usuário reativado: {}", id);

        Optional<Profissional> profissional = profissionalRepository.findByUsuarioId(usuario.getId());
        return UsuarioListResponse.fromEntityWithProfissional(usuario, profissional.orElse(null));
    }

    /**
     * Get all available roles.
     */
    public Role[] getRoles() {
        return Role.values();
    }

    // --- Helper methods ---

    private Usuario getUsuarioByEmail(String email) {
        return usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));
    }

    /** Salão administrado pelo usuário (ou, para a equipe, o salão ao qual está vinculado). */
    private Long salaoDoAdmin(Usuario usuario) {
        return salonRepository.findByAdminId(usuario.getId())
                .map(Salon::getId)
                .orElse(usuario.getSalon() != null ? usuario.getSalon().getId() : null);
    }

    private void verificarAcessoUsuario(Usuario usuarioLogado, Usuario usuarioAlvo) {
        // ADMIN acessa apenas usuários do próprio salão (antes acessava todos, de qualquer salão)
        if (usuarioLogado.getRole() == Role.ADMIN) {
            if (!usuarioAlvo.getId().equals(usuarioLogado.getId())) {
                verificarMesmoSalao(usuarioLogado, usuarioAlvo);
            }
            return;
        }

        // PROFISSIONAL só pode acessar usuários da sua unidade
        if (usuarioLogado.getRole() == Role.PROFISSIONAL) {
            Optional<Profissional> profLogado = profissionalRepository.findByUsuarioIdAndAtivoTrue(usuarioLogado.getId());
            Optional<Profissional> profAlvo = profissionalRepository.findByUsuarioId(usuarioAlvo.getId());

            if (profLogado.isEmpty()) {
                throw new BusinessException("Você não tem permissão para acessar este recurso");
            }

            // Se o alvo não é profissional e não é o próprio usuário
            if (profAlvo.isEmpty() && !usuarioAlvo.getId().equals(usuarioLogado.getId())) {
                // Permite apenas se o alvo for CLIENTE (sem vínculo específico)
                if (usuarioAlvo.getRole() != Role.CLIENTE) {
                    throw new BusinessException("Você não tem permissão para acessar este usuário");
                }
            }

            // Se ambos são profissionais, verificar se são do mesmo salão
            if (profAlvo.isPresent() &&
                !profLogado.get().getSalon().getId().equals(profAlvo.get().getSalon().getId())) {
                throw new BusinessException("Você não tem permissão para acessar usuários de outras unidades");
            }
        }
    }

    private Profissional vincularProfissionalAoSalon(Usuario usuario, Long salonId) {
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new ResourceNotFoundException("Salão", salonId));

        Profissional profissional = Profissional.builder()
                .usuario(usuario)
                .salon(salon)
                .ativo(true)
                .aceitaAgendamentoOnline(true)
                .build();

        profissional = profissionalRepository.save(profissional);
        log.info("Profissional criado e vinculado ao salão: usuario={}, salon={}",
                usuario.getId(), salonId);

        return profissional;
    }

    private UsuarioPageResponse toPageResponse(Page<Usuario> page) {
        return UsuarioPageResponse.builder()
                .content(page.getContent().stream()
                        .map(u -> {
                            Optional<Profissional> prof = profissionalRepository.findByUsuarioId(u.getId());
                            return UsuarioListResponse.fromEntityWithProfissional(u, prof.orElse(null));
                        })
                        .toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .build();
    }
}
