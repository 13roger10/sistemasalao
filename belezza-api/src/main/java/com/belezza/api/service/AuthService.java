package com.belezza.api.service;

import com.belezza.api.dto.auth.*;
import com.belezza.api.dto.user.UserResponse;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.Plano;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.AuthenticationException;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Service for authentication operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final ProfissionalRepository profissionalRepository;
    private final SalonRepository salonRepository;
    private final SalonService salonService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final TokenBlacklistService tokenBlacklistService;
    private final TwoFactorService twoFactorService;

    /**
     * Registers a new user.
     */
    /**
     * SEC-016 (Enumeração de usuários): o auto-cadastro não pode revelar se um e-mail/
     * telefone já existe. Antes, e-mail existente retornava 409 e novo retornava 201 com
     * tokens — permitindo enumerar contas. Agora o fluxo é uniforme e não-enumerável:
     * o método sempre retorna sem lançar erro por duplicidade, e o controller responde
     * uma mensagem genérica ("se os dados forem válidos, você receberá um e-mail"). Um
     * e-mail/telefone já cadastrado simplesmente não cria nada (sem vazar essa condição),
     * e o cadastro deixa de fazer auto-login — a conta é confirmada por e-mail.
     */
    @Transactional
    @SuppressWarnings("null")
    public void register(RegisterRequest request) {
        log.info("Register (self-service) solicitado");

        // Public self-registration must never grant staff/admin access — only CLIENTE
        // accounts may be created here. ADMIN/RECEPCIONISTA/PROFISSIONAL are provisioned
        // exclusively by an already-authenticated ADMIN via POST /api/usuarios.
        // (Esta checagem depende só do input, não da existência de conta — não vaza nada.)
        if (request.getRole() != Role.CLIENTE) {
            throw new AccessDeniedException("Auto-cadastro só é permitido para clientes");
        }

        // Validate salonId is required for CLIENTE role
        if (request.getSalonId() == null) {
            throw new BusinessException("salonId é obrigatório para registro de clientes");
        }

        // SEC-016: se e-mail ou telefone já existem, retorna silenciosamente (mesma
        // resposta genérica do caso de sucesso) — sem 409, sem criar, sem enumerar.
        boolean jaExiste = usuarioRepository.existsByEmail(request.getEmail())
                || (request.getTelefone() != null && usuarioRepository.existsByTelefone(request.getTelefone()));
        if (jaExiste) {
            log.info("Auto-cadastro para e-mail/telefone já existente — resposta genérica (anti-enumeração)");
            return;
        }

        // Create new user (não verificado; sem auto-login)
        Usuario usuario = Usuario.builder()
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .nome(request.getNome().trim())
                .telefone(request.getTelefone())
                .role(request.getRole())
                .plano(Plano.FREE)
                .ativo(true)
                .emailVerificado(false)
                .emailVerificationToken(UUID.randomUUID().toString())
                .build();

        usuario = usuarioRepository.save(usuario);
        log.info("User registered successfully with id: {}", usuario.getId());

        // Create the client entry for the salon
        var salon = salonService.getSalonEntity(request.getSalonId());
        if (!clienteRepository.existsByUsuarioIdAndSalonId(usuario.getId(), request.getSalonId())) {
            Cliente cliente = Cliente.builder()
                    .usuario(usuario)
                    .salon(salon)
                    .aceitaMarketing(true)
                    .aceitaWhatsApp(true)
                    .aceitaEmail(true)
                    .build();
            clienteRepository.save(cliente);
            log.info("Client entry created for user {} in salon {}", usuario.getId(), request.getSalonId());
        }

        // Send email verification (a conta é ativada/confirmada por e-mail, não por auto-login)
        emailService.sendEmailVerificationEmail(
                usuario.getEmail(),
                usuario.getEmailVerificationToken(),
                usuario.getNome()
        );
    }

    /**
     * Authenticates a user and returns tokens.
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        log.info("Login attempt for email: {}", request.getEmail());

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail().toLowerCase().trim(),
                            request.getPassword()
                    )
            );
        } catch (BadCredentialsException e) {
            log.warn("Invalid credentials for email: {}", request.getEmail());
            throw AuthenticationException.invalidCredentials();
        } catch (DisabledException e) {
            log.warn("Disabled account for email: {}", request.getEmail());
            throw AuthenticationException.accountDisabled();
        }

        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(request.getEmail().toLowerCase().trim())
                .orElseThrow(AuthenticationException::invalidCredentials);

        // Check 2FA: if enabled and no code provided, signal client to ask for TOTP
        if (usuario.isTotpEnabled()) {
            if (request.getTotpCode() == null || request.getTotpCode().isBlank()) {
                log.info("2FA required for user: {}", usuario.getId());
                return AuthResponse.requireTwoFactor();
            }
            if (!twoFactorService.validateLoginCode(usuario, request.getTotpCode())) {
                log.warn("Invalid 2FA code for user: {}", usuario.getId());
                throw new AuthenticationException("Código 2FA inválido. Verifique o app autenticador.");
            }
        }

        // Update last login
        usuarioRepository.updateLastLogin(usuario.getId(), LocalDateTime.now());
        usuario.setUltimoLogin(LocalDateTime.now());

        log.info("User logged in successfully: {}", usuario.getId());

        // Generate tokens with tenant claim
        Long salonId = resolveSalonId(usuario);
        String accessToken = jwtService.generateAccessToken(usuario, salonId);
        String refreshToken = jwtService.generateRefreshToken(usuario);

        return AuthResponse.of(
                buildUserResponse(usuario),
                accessToken,
                refreshToken,
                jwtService.getAccessTokenExpiration()
        );
    }

    /**
     * Refreshes access token using refresh token.
     */
    @Transactional(readOnly = true)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        log.debug("Refreshing token");

        String refreshToken = request.getRefreshToken();

        // Validate refresh token
        if (!jwtService.validateToken(refreshToken) || !jwtService.isRefreshToken(refreshToken)) {
            throw AuthenticationException.invalidToken();
        }

        String email = jwtService.extractUsername(refreshToken);
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(AuthenticationException::invalidToken);

        // Generate new tokens with tenant claim
        Long salonId = resolveSalonId(usuario);
        String newAccessToken = jwtService.generateAccessToken(usuario, salonId);
        String newRefreshToken = jwtService.generateRefreshToken(usuario);

        log.debug("Token refreshed for user: {}", usuario.getId());

        return AuthResponse.of(
                UserResponse.fromEntity(usuario),
                newAccessToken,
                newRefreshToken,
                jwtService.getAccessTokenExpiration()
        );
    }

    private UserResponse buildUserResponse(Usuario usuario) {
        if (usuario.getRole() == Role.PROFISSIONAL) {
            Long profissionalId = profissionalRepository.findByUsuarioId(usuario.getId())
                    .map(p -> p.getId())
                    .orElse(null);
            return UserResponse.fromEntity(usuario, profissionalId);
        }
        return UserResponse.fromEntity(usuario);
    }

    /**
     * Gets current user profile.
     */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));

        return buildUserResponse(usuario);
    }

    /**
     * Initiates forgot password flow.
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        log.info("Forgot password request for email: {}", request.getEmail());

        usuarioRepository.findByEmailAndAtivoTrue(request.getEmail().toLowerCase().trim())
                .ifPresent(usuario -> {
                    usuario.setResetPasswordToken(UUID.randomUUID().toString());
                    usuario.setResetPasswordExpires(LocalDateTime.now().plusHours(2));
                    usuarioRepository.save(usuario);

                    // Send password reset email
                    emailService.sendPasswordResetEmail(
                            usuario.getEmail(),
                            usuario.getResetPasswordToken(),
                            usuario.getNome()
                    );
                    log.info("Password reset email sent to user: {}", usuario.getId());
                });

        // Always return success to prevent email enumeration
    }

    /**
     * Resets password using token.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        log.info("Reset password attempt");

        Usuario usuario = usuarioRepository.findByResetPasswordToken(request.getToken())
                .orElseThrow(() -> new AuthenticationException("Token de reset inválido"));

        if (usuario.getResetPasswordExpires() == null ||
            usuario.getResetPasswordExpires().isBefore(LocalDateTime.now())) {
            throw new AuthenticationException("Token de reset expirado");
        }

        usuario.setPassword(passwordEncoder.encode(request.getNewPassword()));
        usuario.setResetPasswordToken(null);
        usuario.setResetPasswordExpires(null);
        usuarioRepository.save(usuario);

        log.info("Password reset successful for user: {}", usuario.getId());
    }

    /**
     * Verifies user email.
     */
    @Transactional
    public void verifyEmail(String token) {
        log.info("Email verification attempt");

        Usuario usuario = usuarioRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new AuthenticationException("Token de verificação inválido"));

        usuario.setEmailVerificado(true);
        usuario.setEmailVerificationToken(null);
        usuarioRepository.save(usuario);

        // Send welcome email
        emailService.sendWelcomeEmail(usuario.getEmail(), usuario.getNome());

        log.info("Email verified for user: {}", usuario.getId());
    }

    /**
     * Logs out user by blacklisting the JWT token.
     */
    public void logout(String authHeader) {
        log.info("Processing logout request");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Invalid authorization header for logout");
            return;
        }

        String token = authHeader.substring(7);

        // Calculate remaining token validity
        long expirationSeconds = jwtService.getTokenExpirationInSeconds(token);

        // Add token to blacklist
        tokenBlacklistService.blacklistToken(token, expirationSeconds);

        log.info("Token blacklisted successfully");
    }

    /**
     * Validates the current JWT-authenticated user's password.
     * Used as a re-authentication step before sensitive actions.
     *
     * @param email email extracted from the JWT principal
     * @param senha raw password provided by the user
     * @return true if password matches, false otherwise
     */
    public boolean validarSenha(String email, String senha) {
        return usuarioRepository.findByEmailAndAtivoTrue(email)
                .map(usuario -> passwordEncoder.matches(senha, usuario.getPassword()))
                .orElse(false);
    }

    /**
     * Resolves the salonId for the given user based on their role.
     * ADMIN → salon where they are the admin owner.
     * PROFISSIONAL → salon they are registered in.
     * RECEPCIONISTA → salon they are linked to (Usuario.salon).
     * CLIENTE → null (clients can belong to multiple salons).
     */
    private Long resolveSalonId(Usuario usuario) {
        return switch (usuario.getRole()) {
            case ADMIN -> salonRepository.findByAdminId(usuario.getId())
                    .map(s -> s.getId())
                    .orElse(null);
            case PROFISSIONAL -> profissionalRepository.findByUsuarioId(usuario.getId())
                    .map(p -> p.getSalon().getId())
                    .orElse(null);
            case RECEPCIONISTA -> usuario.getSalon() != null ? usuario.getSalon().getId() : null;
            default -> null;
        };
    }
}
