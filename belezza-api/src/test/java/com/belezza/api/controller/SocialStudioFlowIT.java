package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.dto.auth.AuthResponse;
import com.belezza.api.dto.auth.RegisterRequest;
import com.belezza.api.entity.*;
import com.belezza.api.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for the Social Studio flow:
 * Upload -> Edit -> Publish
 *
 * T9.2: Tests the complete social media content creation workflow
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestContainersConfiguration.class)
@ActiveProfiles("test")
@DisplayName("Social Studio Flow Integration Tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class SocialStudioFlowIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private SalonRepository salonRepository;

    @Autowired
    private PostRepository postRepository;

    private static String accessToken;
    private static Long salonId;
    private static Long postId;
    private static final String TEST_EMAIL = "socialstudio@example.com";
    private static final String TEST_PASSWORD = "SocialStudio123!";

    @BeforeEach
    void setUp() {
        // Clean up test data
        postRepository.deleteAll();
        usuarioRepository.findByEmail(TEST_EMAIL)
                .ifPresent(usuarioRepository::delete);
    }

    @Test
    @Order(1)
    @DisplayName("Step 1: Setup - Register user and create salon")
    void step1_setupUserAndSalon() throws Exception {
        // Register user
        RegisterRequest registerRequest = RegisterRequest.builder()
                .email(TEST_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Social Studio Test User")
                .telefone("+5511999990100")
                .role(Role.ADMIN)
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                AuthResponse.class
        );

        accessToken = authResponse.getAccessToken();
        assertThat(accessToken).isNotEmpty();

        // Create or get salon
        Salon salao = salonRepository.findAll().stream().findFirst()
                .orElseGet(() -> {
                    Salon newSalon = new Salon();
                    newSalon.setNome("Test Salon for Social Studio");
                    newSalon.setEndereco("Test Address");
                    newSalon.setTelefone("+5511999990101");
                    return salonRepository.save(newSalon);
                });

        salonId = salao.getId();
        assertThat(salonId).isNotNull();
    }

    @Test
    @Order(2)
    @DisplayName("Step 2: Upload - Create a new post with image URL")
    void step2_uploadAndCreatePost() throws Exception {
        // First setup if not done
        if (accessToken == null) {
            step1_setupUserAndSalon();
        }

        // Create post with image URL
        String postRequest = """
            {
                "salaoId": %d,
                "legenda": "Transformação incrível! ✨",
                "hashtags": ["#cabelo", "#transformacao", "#beleza"],
                "imagemUrl": "https://example.com/test-image.jpg",
                "plataforma": "INSTAGRAM",
                "tipo": "IMAGEM"
            }
            """.formatted(salonId);

        MvcResult result = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postRequest))
                .andExpect(status().isOk())
                .andReturn();

        // Extract post ID from response
        String responseBody = result.getResponse().getContentAsString();
        assertThat(responseBody).contains("id");

        // Parse the ID (simple extraction for test)
        postId = objectMapper.readTree(responseBody).get("id").asLong();
        assertThat(postId).isNotNull();
    }

    @Test
    @Order(3)
    @DisplayName("Step 3: Edit - Update post caption and hashtags")
    void step3_editPost() throws Exception {
        // First create post if not done
        if (postId == null) {
            step2_uploadAndCreatePost();
        }

        // Update the post
        String updateRequest = """
            {
                "legenda": "Transformação incrível atualizada! ✨ Nova legenda!",
                "hashtags": ["#cabelo", "#transformacao", "#beleza", "#novidade", "#salaosp"]
            }
            """;

        mockMvc.perform(put("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.legenda").value("Transformação incrível atualizada! ✨ Nova legenda!"));
    }

    @Test
    @Order(4)
    @DisplayName("Step 4: Schedule - Set publication date")
    void step4_schedulePost() throws Exception {
        // First edit post if not done
        if (postId == null) {
            step3_editPost();
        }

        // Schedule the post for future publication
        LocalDateTime scheduledTime = LocalDateTime.now().plusHours(2);
        String scheduleRequest = """
            {
                "dataAgendamento": "%s"
            }
            """.formatted(scheduledTime.toString());

        mockMvc.perform(post("/api/posts/" + postId + "/agendar")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scheduleRequest))
                .andExpect(status().isOk());

        // Verify post is scheduled
        mockMvc.perform(get("/api/posts/" + postId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AGENDADO"));
    }

    @Test
    @Order(5)
    @DisplayName("Step 5: Publish - Immediate publication (or verify scheduled)")
    void step5_publishPost() throws Exception {
        // Create a new post for immediate publishing
        if (accessToken == null) {
            step1_setupUserAndSalon();
        }

        // Create another post for immediate publishing
        String postRequest = """
            {
                "salaoId": %d,
                "legenda": "Post para publicação imediata! 🚀",
                "hashtags": ["#teste", "#publicacao"],
                "imagemUrl": "https://example.com/immediate-post.jpg",
                "plataforma": "INSTAGRAM",
                "tipo": "IMAGEM"
            }
            """.formatted(salonId);

        MvcResult createResult = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(postRequest))
                .andExpect(status().isOk())
                .andReturn();

        Long immediatePostId = objectMapper.readTree(
                createResult.getResponse().getContentAsString()
        ).get("id").asLong();

        // Try to publish immediately
        // Note: This may fail if social media integration is not configured
        // but we're testing the flow, not the actual publication
        mockMvc.perform(post("/api/posts/" + immediatePostId + "/publicar")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
    }

    @Test
    @Order(6)
    @DisplayName("Step 6: List posts by salon")
    void step6_listPostsBySalon() throws Exception {
        if (accessToken == null) {
            step1_setupUserAndSalon();
        }

        mockMvc.perform(get("/api/posts")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("salaoId", salonId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(7)
    @DisplayName("Step 7: Complete flow - Upload, Edit, Schedule, Verify")
    void step7_completeFlow() throws Exception {
        // Clean state
        String flowEmail = "completeflow.social@example.com";
        usuarioRepository.findByEmail(flowEmail)
                .ifPresent(usuarioRepository::delete);

        // 1. Register user
        RegisterRequest registerRequest = RegisterRequest.builder()
                .email(flowEmail)
                .password("CompleteFlow123!")
                .nome("Complete Flow User")
                .telefone("+5511999990200")
                .role(Role.ADMIN)
                .build();

        MvcResult authResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(
                authResult.getResponse().getContentAsString()
        ).get("accessToken").asText();

        // Get or create salon
        Salon salao = salonRepository.findAll().stream().findFirst()
                .orElseGet(() -> {
                    Salon newSalon = new Salon();
                    newSalon.setNome("Complete Flow Salon");
                    newSalon.setEndereco("Flow Address");
                    newSalon.setTelefone("+5511999990201");
                    return salonRepository.save(newSalon);
                });

        // 2. Create post (Upload)
        String createRequest = """
            {
                "salaoId": %d,
                "legenda": "Post do fluxo completo! 📸",
                "hashtags": ["#fluxo", "#completo"],
                "imagemUrl": "https://example.com/complete-flow.jpg",
                "plataforma": "INSTAGRAM",
                "tipo": "IMAGEM"
            }
            """.formatted(salao.getId());

        MvcResult createResult = mockMvc.perform(post("/api/posts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequest))
                .andExpect(status().isOk())
                .andReturn();

        Long flowPostId = objectMapper.readTree(
                createResult.getResponse().getContentAsString()
        ).get("id").asLong();

        // 3. Edit post
        String editRequest = """
            {
                "legenda": "Post do fluxo completo editado! 📸✨",
                "hashtags": ["#fluxo", "#completo", "#editado"]
            }
            """;

        mockMvc.perform(put("/api/posts/" + flowPostId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(editRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.legenda").value("Post do fluxo completo editado! 📸✨"));

        // 4. Schedule post
        LocalDateTime scheduleTime = LocalDateTime.now().plusDays(1);
        String scheduleRequest = """
            {
                "dataAgendamento": "%s"
            }
            """.formatted(scheduleTime.toString());

        mockMvc.perform(post("/api/posts/" + flowPostId + "/agendar")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(scheduleRequest))
                .andExpect(status().isOk());

        // 5. Verify final state
        mockMvc.perform(get("/api/posts/" + flowPostId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AGENDADO"))
                .andExpect(jsonPath("$.legenda").value("Post do fluxo completo editado! 📸✨"));

        // Cleanup
        usuarioRepository.findByEmail(flowEmail)
                .ifPresent(usuarioRepository::delete);
    }

    @Test
    @Order(8)
    @DisplayName("Step 8: Error handling - Unauthorized access")
    void step8_shouldRejectUnauthorizedAccess() throws Exception {
        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(9)
    @DisplayName("Step 9: Error handling - Post not found")
    void step9_shouldReturn404ForNonExistentPost() throws Exception {
        if (accessToken == null) {
            step1_setupUserAndSalon();
        }

        mockMvc.perform(get("/api/posts/99999")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNotFound());
    }
}
