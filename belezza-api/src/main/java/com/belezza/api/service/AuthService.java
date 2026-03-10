package com.belezza.api.service;

import com.belezza.api.dto.auth.*;
import com.belezza.api.dto.user.UserResponse;
import com.belezza.api.entity.Plano;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.AuthenticationException;
import com.belezza.api.exception.DuplicateResourceException;
import com.belezza.api.exception.ResourceNotFoundException;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final TokenBlacklistService tokenBlacklistService;

    /**
     * Registers a new user.
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        log.info("Registering new user with email: {}", request.getEmail());

        // Check if email already exists
        if (usuarioRepository.existsByEmail(request.getEmail())) {
            throw DuplicateResourceException.email(request.getEmail());
        }

        // Check if phone already exists (if provided)
        if (request.getTelefone() != null && usuarioRepository.existsByTelefone(request.getTelefone())) {
            throw DuplicateResourceException.telefone(request.getTelefone());
        }

        // Create new user
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

        // Send email verification
        emailService.sendEmailVerificationEmail(
                usuario.getEmail(),
                usuario.getEmailVerificationToken(),
                usuario.getNome()
        );

        // Generate tokens
        String accessToken = jwtService.generateAccessToken(usuario);
        String refreshToken = jwtService.generateRefreshToken(usuario);

        return AuthResponse.of(
                UserResponse.fromEntity(usuario),
                accessToken,
                refreshToken,
                jwtService.getAccessTokenExpiration()
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

        // Update last login
        usuarioRepository.updateLastLogin(usuario.getId(), LocalDateTime.now());
        usuario.setUltimoLogin(LocalDateTime.now());

        log.info("User logged in successfully: {}", usuario.getId());

        // Generate tokens
        String accessToken = jwtService.generateAccessToken(usuario);
        String refreshToken = jwtService.generateRefreshToken(usuario);

        return AuthResponse.of(
                UserResponse.fromEntity(usuario),
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

        // Generate new tokens
        String newAccessToken = jwtService.generateAccessToken(usuario);
        String newRefreshToken = jwtService.generateRefreshToken(usuario);

        log.debug("Token refreshed for user: {}", usuario.getId());

        return AuthResponse.of(
                UserResponse.fromEntity(usuario),
                newAccessToken,
                newRefreshToken,
                jwtService.getAccessTokenExpiration()
        );
    }

    /**
     * Gets current user profile.
     */
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String email) {
        Usuario usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "email", email));

        return UserResponse.fromEntity(usuario);
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
}
