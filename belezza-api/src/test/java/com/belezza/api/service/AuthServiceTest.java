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

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
            when(usuarioRepository.existsByTelefone(anyString())).thenReturn(false);
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
            when(usuarioRepository.existsByTelefone(anyString())).thenReturn(true);

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
            when(salonRepository.findByAdminId(1L)).thenReturn(Optional.of(Salon.builder().id(10L).build()));
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
            when(salonRepository.findByAdminId(1L)).thenReturn(Optional.of(Salon.builder().id(10L).build()));
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
}
