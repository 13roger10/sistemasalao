package com.belezza.api.service;

import com.belezza.api.dto.user.*;
import com.belezza.api.entity.*;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    /**
     * List users with pagination and filters.
     * ADMINs see all users. PROFISSIONAL and RECEPCIONISTA see only users from their own
     * salon — access to this method at all is already restricted to those three roles plus
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
            // ADMIN vê todos os usuários
            if (search != null && !search.isBlank()) {
                if (roleFilter != null) {
                    usuarios = usuarioRepository.searchByNomeOrEmailAndRole(search.trim(), roleFilter, pageable);
                } else {
                    usuarios = usuarioRepository.searchByNomeOrEmail(search.trim(), pageable);
                }
            } else if (roleFilter != null) {
                usuarios = usuarioRepository.findByRole(roleFilter, pageable);
            } else {
                usuarios = usuarioRepository.findAllByOrderByCriadoEmDesc(pageable);
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

        // Se for PROFISSIONAL, vincular ao salão
        Profissional profissional = null;
        if (request.getRole() == Role.PROFISSIONAL && request.getSalonId() != null) {
            profissional = vincularProfissionalAoSalon(usuario, request.getSalonId());
        } else if (request.getRole() == Role.PROFISSIONAL) {
            // Se não especificou salão, vincular ao salão do admin que está criando
            Usuario admin = getUsuarioByEmail(emailAdmin);
            Optional<Salon> salonAdmin = salonRepository.findByAdminIdAndAtivoTrue(admin.getId());
            if (salonAdmin.isPresent()) {
                profissional = vincularProfissionalAoSalon(usuario, salonAdmin.get().getId());
            }
        }

        // Se for RECEPCIONISTA, vincular ao salão (direto no Usuario, sem entidade própria)
        if (request.getRole() == Role.RECEPCIONISTA) {
            Long salonId = request.getSalonId();
            if (salonId == null) {
                Usuario admin = getUsuarioByEmail(emailAdmin);
                salonId = salonRepository.findByAdminIdAndAtivoTrue(admin.getId())
                        .map(Salon::getId)
                        .orElse(null);
            }
            if (salonId != null) {
                final Long salonIdFinal = salonId;
                Salon salon = salonRepository.findById(salonId)
                        .orElseThrow(() -> new ResourceNotFoundException("Salão", salonIdFinal));
                usuario.setSalon(salon);
                usuario = usuarioRepository.save(usuario);
                log.info("Recepcionista {} vinculada ao salão {}", usuario.getId(), salonId);
            }
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
            assertAlvoNoMesmoSalon(usuarioLogado, usuario);
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
                Long salonId = request.getSalonId();
                if (salonId == null) {
                    Optional<Salon> salonAdmin = salonRepository.findByAdminIdAndAtivoTrue(usuarioLogado.getId());
                    salonId = salonAdmin.map(Salon::getId).orElse(null);
                }
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
     * Reactivate a user.
     */
    @Transactional
    public UsuarioListResponse reativar(Long id, String emailAdmin) {
        log.info("Reativando usuário id: {} por {}", id, emailAdmin);

        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));

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

    private void verificarAcessoUsuario(Usuario usuarioLogado, Usuario usuarioAlvo) {
        // ADMIN pode acessar todos
        if (usuarioLogado.getRole() == Role.ADMIN) {
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

    /**
     * SEC-001: valida que um ADMIN só edita usuários do seu próprio estabelecimento.
     * Resolve o salão do usuário-alvo quando ele é PROFISSIONAL (via entidade Profissional)
     * ou RECEPCIONISTA (via Usuario.salon) e compara com o salão do admin autenticado.
     * Para CLIENTE — que pode pertencer a múltiplos salões e não tem vínculo fixo — a
     * verificação estrita de tenant não se aplica aqui.
     */
    private void assertAlvoNoMesmoSalon(Usuario admin, Usuario alvo) {
        Long adminSalonId = salonRepository.findByAdminIdAndAtivoTrue(admin.getId())
                .map(Salon::getId)
                .orElse(null);
        if (adminSalonId == null) {
            throw new AccessDeniedException("Administrador sem estabelecimento vinculado");
        }

        Long alvoSalonId = null;
        Optional<Profissional> profAlvo = profissionalRepository.findByUsuarioId(alvo.getId());
        if (profAlvo.isPresent()) {
            alvoSalonId = profAlvo.get().getSalon().getId();
        } else if (alvo.getRole() == Role.RECEPCIONISTA && alvo.getSalon() != null) {
            alvoSalonId = alvo.getSalon().getId();
        }

        if (alvoSalonId != null && !alvoSalonId.equals(adminSalonId)) {
            log.warn("Bloqueado (tenant): admin do salão {} tentou editar usuário {} do salão {}",
                    adminSalonId, alvo.getId(), alvoSalonId);
            throw new AccessDeniedException("Acesso negado: usuário pertence a outro estabelecimento");
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
