package com.belezza.api.controller;

import com.belezza.api.dto.auth.*;
import com.belezza.api.dto.user.UserResponse;
import com.belezza.api.entity.Plano;
import com.belezza.api.entity.Role;
import com.belezza.api.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
// Web-layer test with AuthService mocked: uses plain H2 schema instead of the Postgres-only
// Flyway migrations (the "test" profile targets Testcontainers Postgres).
@TestPropertySource(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
@DisplayName("AuthController Tests")
@SuppressWarnings("null")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private AuthResponse authResponse;

    @BeforeEach
    void setUp() {
        UserResponse userResponse = UserResponse.builder()
                .id(1L)
                .email("test@example.com")
                .nome("Test User")
                .role(Role.ADMIN)
                .plano(Plano.FREE)
                .build();

        authResponse = AuthResponse.builder()
                .user(userResponse)
                .accessToken("accessToken")
                .refreshToken("refreshToken")
                .tokenType("Bearer")
                .expiresIn(900000)
                .build();

        registerRequest = RegisterRequest.builder()
                .email("test@example.com")
                .password("Password123")
                .nome("Test User")
                .role(Role.ADMIN)
                .build();

        loginRequest = LoginRequest.builder()
                .email("test@example.com")
                .password("Password123")
                .build();
    }

    @Test
    @DisplayName("Should accept registration with a generic response (no auto-login)")
    @SuppressWarnings("null")
    void shouldRegisterUserSuccessfully() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.accessToken").doesNotExist());

        verify(authService).register(any(RegisterRequest.class));
    }

    @Test
    @DisplayName("Should return 400 when email is invalid")
    @SuppressWarnings("null")
    void shouldReturn400WhenEmailInvalid() throws Exception {
        registerRequest.setEmail("invalid-email");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should return 400 when password is weak")
    @SuppressWarnings("null")
    void shouldReturn400WhenPasswordWeak() throws Exception {
        registerRequest.setPassword("weak");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should login user and return 200")
    @SuppressWarnings("null")
    void shouldLoginUserSuccessfully() throws Exception {
        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("accessToken"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    @Test
    @DisplayName("Should refresh token and return 200")
    @SuppressWarnings("null")
    void shouldRefreshTokenSuccessfully() throws Exception {
        RefreshTokenRequest request = new RefreshTokenRequest("validRefreshToken");
        when(authService.refreshToken(any(RefreshTokenRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("accessToken"));
    }

    @Test
    @DisplayName("Should logout and return 200")
    @SuppressWarnings("null")
    void shouldLogoutSuccessfully() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }
}
