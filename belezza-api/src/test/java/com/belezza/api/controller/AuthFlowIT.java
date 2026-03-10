package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.dto.auth.AuthResponse;
import com.belezza.api.dto.auth.LoginRequest;
import com.belezza.api.dto.auth.RegisterRequest;
import com.belezza.api.entity.Role;
import com.belezza.api.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for the complete authentication flow:
 * Register -> Login -> Access Protected Resource -> Refresh Token
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestContainersConfiguration.class)
@ActiveProfiles("test")
@DisplayName("Authentication Flow Integration Tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AuthFlowIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private static String accessToken;
    private static String refreshToken;
    private static final String TEST_EMAIL = "flowtest@example.com";
    private static final String TEST_PASSWORD = "TestPassword123!";

    @BeforeEach
    void setUp() {
        // Clean up test user before each test
        usuarioRepository.findByEmail(TEST_EMAIL)
                .ifPresent(usuarioRepository::delete);
    }

    @Test
    @Order(1)
    @DisplayName("Step 1: Register new user")
    void step1_shouldRegisterNewUser() throws Exception {
        // Given
        RegisterRequest request = RegisterRequest.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Test User")
                .telefone("+5511999990001")
                .role(Role.ADMIN)
                .build();

        // When
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andExpect(jsonPath("$.user.email").value(TEST_EMAIL))
                .andReturn();

        // Then - Store tokens for later tests
        AuthResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                AuthResponse.class
        );

        accessToken = response.getAccessToken();
        refreshToken = response.getRefreshToken();

        assertThat(accessToken).isNotEmpty();
        assertThat(refreshToken).isNotEmpty();
    }

    @Test
    @Order(2)
    @DisplayName("Step 2: Should reject duplicate registration")
    void step2_shouldRejectDuplicateRegistration() throws Exception {
        // First, register a user
        RegisterRequest request = RegisterRequest.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Test User")
                .telefone("+5511999990002")
                .role(Role.ADMIN)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Try to register again with same email
        RegisterRequest duplicateRequest = RegisterRequest.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Duplicate User")
                .telefone("+5511999990003")
                .role(Role.ADMIN)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateRequest)))
                .andExpect(status().isConflict());
    }

    @Test
    @Order(3)
    @DisplayName("Step 3: Login with valid credentials")
    void step3_shouldLoginWithValidCredentials() throws Exception {
        // First register a user
        RegisterRequest registerRequest = RegisterRequest.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Test User")
                .telefone("+5511999990004")
                .role(Role.ADMIN)
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk());

        // Given - Login credentials
        LoginRequest loginRequest = LoginRequest.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .build();

        // When
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.refreshToken").exists())
                .andReturn();

        // Then
        AuthResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                AuthResponse.class
        );

        accessToken = response.getAccessToken();
        refreshToken = response.getRefreshToken();

        assertThat(accessToken).isNotEmpty();
    }

    @Test
    @Order(4)
    @DisplayName("Step 4: Should reject login with invalid credentials")
    void step4_shouldRejectLoginWithInvalidCredentials() throws Exception {
        // Given
        LoginRequest request = LoginRequest.builder()
                .email("nonexistent@example.com")
                .password("wrongpassword")
                .build();

        // When/Then
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(5)
    @DisplayName("Step 5: Access protected resource with valid token")
    void step5_shouldAccessProtectedResourceWithValidToken() throws Exception {
        // First register and login
        RegisterRequest registerRequest = RegisterRequest.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Test User")
                .telefone("+5511999990005")
                .role(Role.ADMIN)
                .build();

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(),
                AuthResponse.class
        );

        accessToken = authResponse.getAccessToken();

        // When - Access protected endpoint
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(TEST_EMAIL));
    }

    @Test
    @Order(6)
    @DisplayName("Step 6: Should reject access without token")
    void step6_shouldRejectAccessWithoutToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(7)
    @DisplayName("Step 7: Should reject access with invalid token")
    void step7_shouldRejectAccessWithInvalidToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer invalid.token.here")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(8)
    @DisplayName("Step 8: Refresh token flow")
    void step8_shouldRefreshToken() throws Exception {
        // First register and login to get tokens
        RegisterRequest registerRequest = RegisterRequest.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Test User")
                .telefone("+5511999990006")
                .role(Role.ADMIN)
                .build();

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(),
                AuthResponse.class
        );

        refreshToken = authResponse.getRefreshToken();

        // Given - Refresh token request
        String requestBody = "{\"refreshToken\":\"" + refreshToken + "\"}";

        // When
        MvcResult result = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andReturn();

        // Then
        AuthResponse response = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                AuthResponse.class
        );

        assertThat(response.getAccessToken()).isNotEmpty();
        // New access token should be different from old one
        assertThat(response.getAccessToken()).isNotEqualTo(accessToken);
    }

    @Test
    @Order(9)
    @DisplayName("Step 9: Complete flow - Register, Login, Access, Refresh")
    void step9_completeAuthenticationFlow() throws Exception {
        String flowEmail = "completeflow@example.com";

        // Clean up
        usuarioRepository.findByEmail(flowEmail)
                .ifPresent(usuarioRepository::delete);

        // 1. Register
        RegisterRequest registerRequest = RegisterRequest.builder()
                .email(flowEmail)
                .password("CompleteFlow123!")
                .nome("Complete Flow User")
                .telefone("+5511999990007")
                .role(Role.ADMIN)
                .build();

        MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse registerResponse = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(),
                AuthResponse.class
        );

        String token1 = registerResponse.getAccessToken();
        String refresh1 = registerResponse.getRefreshToken();

        // 2. Access protected resource with registration token
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token1))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(flowEmail));

        // 3. Login
        LoginRequest loginRequest = LoginRequest.builder()
                .email(flowEmail)
                .password("CompleteFlow123!")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse loginResponse = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(),
                AuthResponse.class
        );

        String token2 = loginResponse.getAccessToken();
        String refresh2 = loginResponse.getRefreshToken();

        // 4. Access with login token
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(flowEmail));

        // 5. Refresh token
        String refreshRequest = "{\"refreshToken\":\"" + refresh2 + "\"}";

        MvcResult refreshResult = mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(refreshRequest))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse refreshResponse = objectMapper.readValue(
                refreshResult.getResponse().getContentAsString(),
                AuthResponse.class
        );

        String token3 = refreshResponse.getAccessToken();

        // 6. Access with refreshed token
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token3))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(flowEmail));

        // Cleanup
        usuarioRepository.findByEmail(flowEmail)
                .ifPresent(usuarioRepository::delete);
    }
}
