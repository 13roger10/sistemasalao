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
     * ADMINs see all users, PROFISSIONAIs see only users from their salon.
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

        // Verificar acesso
        verificarAcessoUsuario(usuarioLogado, usuario);

        // Verificar email duplicado
        if (request.getEmail() != null && !request.getEmail().equals(usuario.getEmail())) {
            if (usuarioRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException("Usuário", "email", request.getEmail());
            }
            usuario.setEmail(request.getEmail().toLowerCase().trim());
        }

        // Atualizar campos
        if (request.getNome() != null) usuario.setNome(request.getNome().trim());
        if (request.getTelefone() != null) usuario.setTelefone(request.getTelefone());
        if (request.getAvatarUrl() != null) usuario.setAvatarUrl(request.getAvatarUrl());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            usuario.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getPlano() != null) usuario.setPlano(request.getPlano());
        if (request.getAtivo() != null) usuario.setAtivo(request.getAtivo());
        if (request.getEmailVerificado() != null) usuario.setEmailVerificado(request.getEmailVerificado());

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
