package com.belezza.api.service;

import com.belezza.api.dto.auth.*;
import com.belezza.api.entity.Cliente;
import com.belezza.api.entity.Plano;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Salon;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.AuthenticationException;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.repository.ClienteRepository;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.SalonRepository;
import com.belezza.api.repository.UsuarioRepository;
import com.belezza.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Tests")
class AuthServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private SalonService salonService;

    @Mock
    private EmailService emailService;

    @Mock
    private SalonRepository salonRepository;

    @Mock
    private ProfissionalRepository profissionalRepository;

    @Mock
    private LoginAttemptService loginAttemptService;

    @Mock
    private PasswordResetLimiter passwordResetLimiter;

    @Mock
    private com.belezza.api.repository.RecepcionistaUnidadeRepository recepcionistaUnidadeRepository;

    @Mock
    private TokenBlacklistService tokenBlacklistService;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .email("test@example.com")
                .password("Password123")
                .nome("Test User")
                .telefone("+5511999999999")
                .role(Role.CLIENTE)
                .salonId(1L)
                .build();

        loginRequest = LoginRequest.builder()
                .email("test@example.com")
                .password("Password123")
                .build();

        usuario = Usuario.builder()
                .id(1L)
                .email("test@example.com")
                .password("encodedPassword")
                .nome("Test User")
                .telefone("+5511999999999")
                .role(Role.ADMIN)
                .plano(Plano.FREE)
                .ativo(true)
                .emailVerificado(false)
                .build();
    }

    @Nested
    @DisplayName("Register Tests")
    class RegisterTests {

        @Test
        @DisplayName("Should register client, create salon link and send verification email")
        void shouldRegisterUserSuccessfully() {
            // Given
            Salon salon = Salon.builder().id(1L).nome("Salão Teste").build();
            when(usuarioRepository.existsByEmail(anyString())).thenReturn(false);
            when(usuarioRepository.telefoneEmUso(anyString(), isNull())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
            when(usuarioRepository.save(any(Usuario.class))).thenReturn(usuario);
            when(salonService.getSalonEntity(1L)).thenReturn(salon);
            when(clienteRepository.existsByUsuarioIdAndSalonId(1L, 1L)).thenReturn(false);

            // When
            authService.register(registerRequest);

            // Then — conta criada não verificada, sem auto-login (nenhum token emitido)
            verify(usuarioRepository).save(argThat(u -> !u.isEmailVerificado()
                    && u.getRole() == Role.CLIENTE
                    && u.getEmailVerificationToken() != null));
            verify(clienteRepository).save(any(Cliente.class));
            verify(emailService).sendEmailVerificationEmail(eq("test@example.com"), any(), eq("Test User"));
            verifyNoInteractions(jwtService);
        }

        @Test
        @DisplayName("Should silently return (no enumeration) when email already exists")
        void shouldReturnSilentlyWhenEmailExists() {
            // Given
            when(usuarioRepository.existsByEmail(anyString())).thenReturn(true);

            // When
            authService.register(registerRequest);

            // Then
            verify(usuarioRepository, never()).save(any());
            verifyNoInteractions(emailService, jwtService);
        }

        @Test
        @DisplayName("Should silently return (no enumeration) when phone already exists")
        void shouldReturnSilentlyWhenPhoneExists() {
            // Given
            when(usuarioRepository.existsByEmail(anyString())).thenReturn(false);
            when(usuarioRepository.telefoneEmUso(anyString(), isNull())).thenReturn(true);

            // When
            authService.register(registerRequest);

            // Then
            verify(usuarioRepository, never()).save(any());
            verifyNoInteractions(emailService, jwtService);
        }

        @Test
        @DisplayName("Should reject self-registration with a staff role")
        void shouldRejectStaffRole() {
            registerRequest.setRole(Role.ADMIN);

            assertThatThrownBy(() -> authService.register(registerRequest))
                    .isInstanceOf(AccessDeniedException.class);

            verify(usuarioRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should require salonId for client registration")
        void shouldRequireSalonId() {
            registerRequest.setSalonId(null);

            assertThatThrownBy(() -> authService.register(registerRequest))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("salonId");

            verify(usuarioRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Login Tests")
    class LoginTests {

        @Test
        @DisplayName("Should login user successfully")
        void shouldLoginUserSuccessfully() {
            // Given
            when(authenticationManager.authenticate(any())).thenReturn(
                    new UsernamePasswordAuthenticationToken(usuario, null)
            );
            when(usuarioRepository.findByEmailAndAtivoTrue(anyString())).thenReturn(Optional.of(usuario));
            when(salonService.unidadePreferida(usuario)).thenReturn(Optional.of(Salon.builder().id(10L).build()));
            when(jwtService.generateAccessToken(usuario, 10L)).thenReturn("accessToken");
            when(jwtService.generateRefreshToken(any())).thenReturn("refreshToken");
            when(jwtService.getAccessTokenExpiration()).thenReturn(900000L);

            // When
            AuthResponse response = authService.login(loginRequest);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("accessToken");
            assertThat(response.getUser().getEmail()).isEqualTo("test@example.com");

            verify(usuarioRepository).updateLastLogin(eq(1L), any());
        }

        @Test
        @DisplayName("Should throw exception when credentials are invalid")
        void shouldThrowExceptionWhenCredentialsInvalid() {
            // Given
            when(authenticationManager.authenticate(any()))
                    .thenThrow(new BadCredentialsException("Invalid credentials"));

            // When/Then
            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("Email ou senha inválidos");
        }

        @Test
        @DisplayName("Auto-cadastro sem e-mail confirmado não entra (BUG-023)")
        void autoCadastroNaoConfirmadoNaoEntra() {
            usuario.setEmailVerificado(false);
            usuario.setEmailVerificationToken("token-pendente");
            when(authenticationManager.authenticate(any())).thenReturn(
                    new UsernamePasswordAuthenticationToken(usuario, null)
            );
            when(usuarioRepository.findByEmailAndAtivoTrue(anyString())).thenReturn(Optional.of(usuario));

            assertThatThrownBy(() -> authService.login(loginRequest))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("Confirme seu e-mail");
            verify(jwtService, never()).generateAccessToken(any(), any());
            verify(usuarioRepository, never()).updateLastLogin(any(), any());
        }
    }

    @Nested
    @DisplayName("Refresh Token Tests")
    class RefreshTokenTests {

        @Test
        @DisplayName("Should refresh token successfully")
        void shouldRefreshTokenSuccessfully() {
            // Given
            RefreshTokenRequest request = new RefreshTokenRequest("validRefreshToken");

            when(jwtService.validateToken(anyString())).thenReturn(true);
            when(jwtService.isRefreshToken(anyString())).thenReturn(true);
            when(jwtService.extractUsername(anyString())).thenReturn("test@example.com");
            when(usuarioRepository.findByEmailAndAtivoTrue(anyString())).thenReturn(Optional.of(usuario));
            when(salonService.unidadePreferida(usuario)).thenReturn(Optional.of(Salon.builder().id(10L).build()));
            when(jwtService.generateAccessToken(usuario, 10L)).thenReturn("newAccessToken");
            when(jwtService.generateRefreshToken(any())).thenReturn("newRefreshToken");
            when(jwtService.getAccessTokenExpiration()).thenReturn(900000L);

            // When
            AuthResponse response = authService.refreshToken(request);

            // Then
            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("newAccessToken");
            assertThat(response.getRefreshToken()).isEqualTo("newRefreshToken");
        }

        @Test
        @DisplayName("BUG-007: o refresh token usado vai para a blacklist (rotação)")
        void refreshRevogaOTokenUsado() {
            RefreshTokenRequest request = new RefreshTokenRequest("refreshAntigo");
            when(jwtService.validateToken("refreshAntigo")).thenReturn(true);
            when(jwtService.isRefreshToken("refreshAntigo")).thenReturn(true);
            when(jwtService.extractUsername("refreshAntigo")).thenReturn("test@example.com");
            when(jwtService.getTokenExpirationInSeconds("refreshAntigo")).thenReturn(3600L);
            when(usuarioRepository.findByEmailAndAtivoTrue(anyString())).thenReturn(Optional.of(usuario));
            when(jwtService.generateRefreshToken(any())).thenReturn("refreshNovo");

            authService.refreshToken(request);

            verify(tokenBlacklistService).blacklistToken("refreshAntigo", 3600L);
        }

        @Test
        @DisplayName("BUG-007: refresh token já usado ou revogado é recusado")
        void refreshTokenRevogadoERecusado() {
            RefreshTokenRequest request = new RefreshTokenRequest("refreshUsado");
            when(jwtService.validateToken("refreshUsado")).thenReturn(true);
            when(jwtService.isRefreshToken("refreshUsado")).thenReturn(true);
            when(tokenBlacklistService.isTokenBlacklisted("refreshUsado")).thenReturn(true);

            assertThatThrownBy(() -> authService.refreshToken(request))
                    .isInstanceOf(AuthenticationException.class);
            verify(jwtService, never()).generateRefreshToken(any());
        }

        @Test
        @DisplayName("BUG-007: logout revoga o access token e o refresh token")
        void logoutRevogaOsDoisTokens() {
            when(jwtService.validateToken("refresh")).thenReturn(true);
            when(jwtService.isRefreshToken("refresh")).thenReturn(true);
            when(jwtService.getTokenExpirationInSeconds("refresh")).thenReturn(600000L);
            when(jwtService.getTokenExpirationInSeconds("access")).thenReturn(900L);

            authService.logout("Bearer access", "refresh");

            verify(tokenBlacklistService).blacklistToken("refresh", 600000L);
            verify(tokenBlacklistService).blacklistToken("access", 900L);
        }

        @Test
        @DisplayName("Should throw exception when refresh token is invalid")
        void shouldThrowExceptionWhenRefreshTokenInvalid() {
            // Given
            RefreshTokenRequest request = new RefreshTokenRequest("invalidToken");
            when(jwtService.validateToken(anyString())).thenReturn(false);

            // When/Then
            assertThatThrownBy(() -> authService.refreshToken(request))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("Token inválido");
        }
    }

    @Nested
    @DisplayName("Esqueci minha senha - limite por e-mail")
    class ForgotPasswordTests {

        private final ForgotPasswordRequest request = new ForgotPasswordRequest("test@example.com");

        @Test
        @DisplayName("Dentro do limite: gera o token e envia o e-mail")
        void enviaDentroDoLimite() {
            when(passwordResetLimiter.permitir("test@example.com")).thenReturn(true);
            when(usuarioRepository.findByEmailAndAtivoTrue("test@example.com")).thenReturn(Optional.of(usuario));

            authService.forgotPassword(request);

            assertThat(usuario.getResetPasswordToken()).isNotNull();
            verify(emailService).sendPasswordResetEmail(eq("test@example.com"), eq(usuario.getResetPasswordToken()), any());
        }

        @Test
        @DisplayName("Acima do limite: não procura a conta nem envia nada (e não lança erro)")
        void acimaDoLimiteNaoEnvia() {
            when(passwordResetLimiter.permitir("test@example.com")).thenReturn(false);

            authService.forgotPassword(request);

            verifyNoInteractions(usuarioRepository, emailService);
        }

        @Test
        @DisplayName("Token gerado há menos de 2 minutos (outra instância da API): não reenvia")
        void tokenRecenteNoBancoNaoReenvia() {
            usuario.setResetPasswordToken("token-anterior");
            usuario.setResetPasswordExpires(LocalDateTime.now().plusHours(2).minusSeconds(30));
            when(passwordResetLimiter.permitir("test@example.com")).thenReturn(true);
            when(passwordResetLimiter.intervaloMinimo()).thenReturn(Duration.ofMinutes(2));
            when(usuarioRepository.findByEmailAndAtivoTrue("test@example.com")).thenReturn(Optional.of(usuario));

            authService.forgotPassword(request);

            assertThat(usuario.getResetPasswordToken()).isEqualTo("token-anterior");
            verifyNoInteractions(emailService);
        }
    }

    @Nested
    @DisplayName("Trocar de unidade")
    class TrocarUnidadeTests {

        @BeforeEach
        void admin() {
            when(usuarioRepository.findByEmailAndAtivoTrue("test@example.com")).thenReturn(Optional.of(usuario));
        }

        @Test
        @DisplayName("Entra na própria unidade: grava a escolha e o token traz o salão dela")
        void entraNaPropriaUnidade() {
            Salon filial = Salon.builder().id(20L).admin(usuario).ativo(true).build();
            when(salonRepository.findByIdAndAdminId(20L, 1L)).thenReturn(Optional.of(filial));
            when(jwtService.generateAccessToken(usuario, 20L)).thenReturn("tokenFilial");
            when(jwtService.generateRefreshToken(usuario)).thenReturn("refresh");

            AuthResponse resposta = authService.trocarUnidade("test@example.com", 20L);

            assertThat(resposta.getAccessToken()).isEqualTo("tokenFilial");
            assertThat(usuario.getUnidadeAtiva()).isSameAs(filial);
            verify(usuarioRepository).save(usuario);
        }

        @Test
        @DisplayName("Unidade de outro dono responde como inexistente")
        void unidadeDeOutroDono() {
            when(salonRepository.findByIdAndAdminId(99L, 1L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.trocarUnidade("test@example.com", 99L))
                    .isInstanceOf(com.belezza.api.exception.ResourceNotFoundException.class);
            verify(jwtService, never()).generateAccessToken(any(), any());
            assertThat(usuario.getUnidadeAtiva()).isNull();
        }

        @Test
        @DisplayName("Unidade desativada não pode ser usada")
        void unidadeDesativada() {
            Salon fechada = Salon.builder().id(21L).admin(usuario).ativo(false).build();
            when(salonRepository.findByIdAndAdminId(21L, 1L)).thenReturn(Optional.of(fechada));

            assertThatThrownBy(() -> authService.trocarUnidade("test@example.com", 21L))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("desativada");
        }

        @Test
        @DisplayName("Cliente não troca de unidade")
        void cliente() {
            usuario.setRole(Role.CLIENTE);

            assertThatThrownBy(() -> authService.trocarUnidade("test@example.com", 20L))
                    .isInstanceOf(AccessDeniedException.class);
            verifyNoInteractions(jwtService);
        }

        @Test
        @DisplayName("Profissional entra só em unidade onde tem cadastro ativo; o token traz o profissionalId de lá")
        void profissional() {
            usuario.setRole(Role.PROFISSIONAL);
            Salon filial = Salon.builder().id(20L).ativo(true).build();
            com.belezza.api.entity.Profissional naFilial = com.belezza.api.entity.Profissional.builder()
                    .id(77L).usuario(usuario).salon(filial).ativo(true).build();
            when(profissionalRepository.findByUsuarioIdAndSalonId(1L, 20L)).thenReturn(Optional.of(naFilial));
            when(profissionalRepository.findByUsuarioIdAndSalonId(1L, 30L)).thenReturn(Optional.empty());
            when(jwtService.generateAccessToken(usuario, 20L)).thenReturn("tokenFilial");

            AuthResponse resposta = authService.trocarUnidade("test@example.com", 20L);

            assertThat(resposta.getAccessToken()).isEqualTo("tokenFilial");
            assertThat(resposta.getUser().getProfissionalId()).isEqualTo(77L);
            assertThat(usuario.getUnidadeAtiva()).isSameAs(filial);
            assertThatThrownBy(() -> authService.trocarUnidade("test@example.com", 30L))
                    .isInstanceOf(com.belezza.api.exception.ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("Recepcionista entra em unidade vinculada: vira a unidade em uso e a anterior fica vinculada")
        void recepcionista() {
            usuario.setRole(Role.RECEPCIONISTA);
            Salon sede = Salon.builder().id(10L).ativo(true).build();
            Salon filial = Salon.builder().id(20L).ativo(true).build();
            usuario.setSalon(sede);
            when(recepcionistaUnidadeRepository.existsByUsuarioIdAndSalonId(1L, 20L)).thenReturn(true);
            when(recepcionistaUnidadeRepository.existsByUsuarioIdAndSalonId(1L, 10L)).thenReturn(false);
            when(salonRepository.findById(20L)).thenReturn(Optional.of(filial));
            when(jwtService.generateAccessToken(usuario, 20L)).thenReturn("tokenFilial");

            authService.trocarUnidade("test@example.com", 20L);

            assertThat(usuario.getSalon()).isSameAs(filial);
            verify(recepcionistaUnidadeRepository).save(org.mockito.ArgumentMatchers.argThat(v -> v.getSalon() == sede));
        }
    }
}
