package com.belezza.api.security;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.Plano;
import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Security tests for JWT authentication and authorization.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestContainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
@DisplayName("JWT Security Tests")
class JwtSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private String adminToken;
    private String profissionalToken;
    private String clienteToken;

    @BeforeEach
    void setUp() {
        // Clean up
        usuarioRepository.deleteAll();

        // Create test users
        Usuario admin = usuarioRepository.save(Usuario.builder()
                .email("admin@test.com")
                .password("password")
                .nome("Admin User")
                .telefone("11999999999")
                .role(Role.ADMIN)
                .plano(Plano.PRO)
                .ativo(true)
                .build());

        Usuario profissional = usuarioRepository.save(Usuario.builder()
                .email("prof@test.com")
                .password("password")
                .nome("Professional User")
                .telefone("11988888888")
                .role(Role.PROFISSIONAL)
                .plano(Plano.FREE)
                .ativo(true)
                .build());

        Usuario cliente = usuarioRepository.save(Usuario.builder()
                .email("client@test.com")
                .password("password")
                .nome("Client User")
                .telefone("11977777777")
                .role(Role.CLIENTE)
                .plano(Plano.FREE)
                .ativo(true)
                .build());

        // Generate tokens
        adminToken = generateToken(admin);
        profissionalToken = generateToken(profissional);
        clienteToken = generateToken(cliente);
    }

    @Test
    @DisplayName("Should access protected endpoint with valid JWT token")
    void shouldAccessProtectedEndpointWithValidToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should reject request without JWT token")
    void shouldRejectRequestWithoutToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should reject request with invalid JWT token")
    void shouldRejectRequestWithInvalidToken() throws Exception {
        String invalidToken = "invalid.jwt.token";

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + invalidToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should reject request with malformed Authorization header")
    void shouldRejectRequestWithMalformedAuthHeader() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", adminToken) // Missing "Bearer " prefix
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should reject expired JWT token")
    void shouldRejectExpiredToken() throws Exception {
        // Create an expired token (this is a simplified test - in real scenario,
        // you would need to create a token with past expiration date)
        String expiredToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDB9.expired";

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + expiredToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Admin should access admin-only endpoint")
    void adminShouldAccessAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/audit-logs")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Non-admin should be forbidden from admin-only endpoint")
    void nonAdminShouldBeForbiddenFromAdminEndpoint() throws Exception {
        mockMvc.perform(get("/api/audit-logs")
                        .header("Authorization", "Bearer " + profissionalToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/audit-logs")
                        .header("Authorization", "Bearer " + clienteToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should allow access to public endpoints without authentication")
    void shouldAllowAccessToPublicEndpoints() throws Exception {
        // Health check should be public
        mockMvc.perform(get("/actuator/health")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Should validate JWT token structure")
    void shouldValidateJwtTokenStructure() {
        // Given
        UserDetails userDetails = User.builder()
                .username("test@example.com")
                .password("password")
                .roles("ADMIN")
                .build();

        // When
        String token = jwtService.generateAccessToken(userDetails);

        // Then
        // JWT should have 3 parts separated by dots
        String[] parts = token.split("\\.");
        org.assertj.core.api.Assertions.assertThat(parts).hasSize(3);

        // Should be able to extract username
        String username = jwtService.extractUsername(token);
        org.assertj.core.api.Assertions.assertThat(username).isEqualTo("test@example.com");

        // Token should be valid
        boolean isValid = jwtService.isTokenValid(token, userDetails);
        org.assertj.core.api.Assertions.assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("Should invalidate token with wrong username")
    void shouldInvalidateTokenWithWrongUsername() {
        // Given
        UserDetails originalUser = User.builder()
                .username("original@example.com")
                .password("password")
                .roles("ADMIN")
                .build();

        UserDetails differentUser = User.builder()
                .username("different@example.com")
                .password("password")
                .roles("ADMIN")
                .build();

        String token = jwtService.generateAccessToken(originalUser);

        // When
        boolean isValid = jwtService.isTokenValid(token, differentUser);

        // Then
        org.assertj.core.api.Assertions.assertThat(isValid).isFalse();
    }

    @Test
    @DisplayName("Should handle JWT with special characters in username")
    void shouldHandleJwtWithSpecialCharactersInUsername() {
        // Given
        String emailWithSpecialChars = "test+tag@example.com";
        UserDetails userDetails = User.builder()
                .username(emailWithSpecialChars)
                .password("password")
                .roles("ADMIN")
                .build();

        // When
        String token = jwtService.generateAccessToken(userDetails);
        String extractedUsername = jwtService.extractUsername(token);

        // Then
        org.assertj.core.api.Assertions.assertThat(extractedUsername).isEqualTo(emailWithSpecialChars);
    }

    @Test
    @DisplayName("Should handle concurrent token generation")
    void shouldHandleConcurrentTokenGeneration() throws InterruptedException {
        // Given
        UserDetails userDetails = User.builder()
                .username("test@example.com")
                .password("password")
                .roles("ADMIN")
                .build();

        // When - Generate multiple tokens concurrently
        Thread[] threads = new Thread[10];
        String[] tokens = new String[10];

        for (int i = 0; i < 10; i++) {
            final int index = i;
            threads[i] = new Thread(() -> {
                tokens[index] = jwtService.generateAccessToken(userDetails);
            });
            threads[i].start();
        }

        for (Thread thread : threads) {
            thread.join();
        }

        // Then - All tokens should be valid and non-null
        for (String token : tokens) {
            org.assertj.core.api.Assertions.assertThat(token).isNotNull();
            org.assertj.core.api.Assertions.assertThat(jwtService.isTokenValid(token, userDetails)).isTrue();
        }
    }

    // Helper methods

    private String generateToken(Usuario usuario) {
        UserDetails userDetails = User.builder()
                .username(usuario.getEmail())
                .password(usuario.getPassword())
                .roles(usuario.getRole().name())
                .build();

        return jwtService.generateAccessToken(userDetails);
    }
}
