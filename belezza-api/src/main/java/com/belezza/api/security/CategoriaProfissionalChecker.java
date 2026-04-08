package com.belezza.api.security;

import com.belezza.api.entity.CategoriaProfissional;
import com.belezza.api.entity.Profissional;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;

/**
 * Component to check professional category for security annotations.
 * Used with SpEL expressions in @PreAuthorize annotations.
 */
@Component("categoriaProfissionalChecker")
@RequiredArgsConstructor
@Slf4j
public class CategoriaProfissionalChecker {

    private final UsuarioRepository usuarioRepository;
    private final ProfissionalRepository profissionalRepository;

    private static final Set<CategoriaProfissional> GERENCIA_CATEGORIES = EnumSet.of(
            CategoriaProfissional.PROPRIETARIO,
            CategoriaProfissional.GERENTE
    );

    private static final Set<CategoriaProfissional> RECEPCAO_CATEGORIES = EnumSet.of(
            CategoriaProfissional.PROPRIETARIO,
            CategoriaProfissional.GERENTE,
            CategoriaProfissional.RECEPCIONISTA
    );

    /**
     * Checks if the authenticated user is a professional with GERENTE or PROPRIETARIO category.
     */
    public boolean isGerente(Authentication authentication) {
        return hasCategory(authentication, GERENCIA_CATEGORIES);
    }

    /**
     * Checks if the authenticated user is a professional with RECEPCIONISTA, GERENTE or PROPRIETARIO category.
     */
    public boolean isRecepcionistaOrHigher(Authentication authentication) {
        return hasCategory(authentication, RECEPCAO_CATEGORIES);
    }

    /**
     * Checks if the authenticated user has a specific category.
     */
    public boolean hasCategory(Authentication authentication, CategoriaProfissional categoria) {
        return hasCategory(authentication, EnumSet.of(categoria));
    }

    /**
     * Checks if the authenticated user has any of the specified categories.
     */
    public boolean hasCategory(Authentication authentication, Set<CategoriaProfissional> categorias) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetails)) {
            return false;
        }

        String email = ((UserDetails) principal).getUsername();

        Optional<Long> usuarioId = usuarioRepository.findByEmailAndAtivoTrue(email)
                .map(u -> u.getId());

        if (usuarioId.isEmpty()) {
            return false;
        }

        Optional<Profissional> profissional = profissionalRepository.findByUsuarioIdAndAtivoTrue(usuarioId.get());

        if (profissional.isEmpty() || profissional.get().getCategoria() == null) {
            return false;
        }

        boolean hasCategory = categorias.contains(profissional.get().getCategoria());
        log.debug("Category check for user {}: categoria={}, allowed={}, result={}",
                email, profissional.get().getCategoria(), categorias, hasCategory);

        return hasCategory;
    }

    /**
     * Gets the category of the authenticated professional.
     */
    public Optional<CategoriaProfissional> getCategoria(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof UserDetails)) {
            return Optional.empty();
        }

        String email = ((UserDetails) principal).getUsername();

        return usuarioRepository.findByEmailAndAtivoTrue(email)
                .flatMap(u -> profissionalRepository.findByUsuarioIdAndAtivoTrue(u.getId()))
                .map(Profissional::getCategoria);
    }
}
