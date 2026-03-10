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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for the Appointment flow:
 * Register -> Login -> Create Appointment
 *
 * T9.2: Tests the complete appointment booking workflow
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestContainersConfiguration.class)
@ActiveProfiles("test")
@DisplayName("Appointment Flow Integration Tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AppointmentFlowIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private SalonRepository salonRepository;

    @Autowired
    private ProfissionalRepository profissionalRepository;

    @Autowired
    private ServicoRepository servicoRepository;

    @Autowired
    private AgendamentoRepository agendamentoRepository;

    private static String clientToken;
    private static String professionalToken;
    private static Long salonId;
    private static Long professionalId;
    private static Long serviceId;
    private static Long appointmentId;

    private static final String CLIENT_EMAIL = "cliente.appointment@example.com";
    private static final String PROFESSIONAL_EMAIL = "profissional.appointment@example.com";
    private static final String TEST_PASSWORD = "Appointment123!";

    @BeforeEach
    void cleanUp() {
        // Clean up appointments first due to foreign key constraints
        agendamentoRepository.deleteAll();
    }

    @Test
    @Order(1)
    @DisplayName("Step 1: Setup - Create salon, professional and service")
    void step1_setupInfrastructure() throws Exception {
        // Clean up existing test users
        usuarioRepository.findByEmail(CLIENT_EMAIL)
                .ifPresent(usuarioRepository::delete);
        usuarioRepository.findByEmail(PROFESSIONAL_EMAIL)
                .ifPresent(usuarioRepository::delete);

        // Create or get salon
        Salon salao = salonRepository.findAll().stream().findFirst()
                .orElseGet(() -> {
                    Salon newSalon = new Salon();
                    newSalon.setNome("Appointment Test Salon");
                    newSalon.setEndereco("123 Test Street");
                    newSalon.setTelefone("+5511999990300");
                    return salonRepository.save(newSalon);
                });
        salonId = salao.getId();

        // Create professional user
        RegisterRequest profRequest = RegisterRequest.builder()
                .email(PROFESSIONAL_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Professional Test")
                .telefone("+5511999990301")
                .role(Role.PROFISSIONAL)
                .build();

        MvcResult profResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(profRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthResponse profAuth = objectMapper.readValue(
                profResult.getResponse().getContentAsString(),
                AuthResponse.class
        );
        professionalToken = profAuth.getAccessToken();

        // Get or create the professional entity linked to the user
        Usuario profUser = usuarioRepository.findByEmail(PROFESSIONAL_EMAIL)
                .orElseThrow();

        Profissional profissional = profissionalRepository.findByUsuarioId(profUser.getId())
                .orElseGet(() -> {
                    Profissional newProf = new Profissional();
                    newProf.setUsuario(profUser);
                    newProf.setSalon(salao);
                    newProf.setEspecialidade("Hair Stylist");
                    newProf.setAtivo(true);
                    newProf.setAceitaAgendamentoOnline(true);
                    return profissionalRepository.save(newProf);
                });
        professionalId = profissional.getId();

        // Create or get service
        Servico servico = servicoRepository.findBySalonId(salonId).stream().findFirst()
                .orElseGet(() -> {
                    Servico newServico = new Servico();
                    newServico.setSalon(salao);
                    newServico.setNome("Haircut");
                    newServico.setDescricao("Professional haircut");
                    newServico.setPreco(new BigDecimal("50.00"));
                    newServico.setDuracaoMinutos(30);
                    newServico.setAtivo(true);
                    return servicoRepository.save(newServico);
                });
        serviceId = servico.getId();

        assertThat(salonId).isNotNull();
        assertThat(professionalId).isNotNull();
        assertThat(serviceId).isNotNull();
    }

    @Test
    @Order(2)
    @DisplayName("Step 2: Register - Client creates account")
    void step2_registerClient() throws Exception {
        // Ensure setup is done
        if (salonId == null) {
            step1_setupInfrastructure();
        }

        // Clean up existing client
        usuarioRepository.findByEmail(CLIENT_EMAIL)
                .ifPresent(usuarioRepository::delete);

        RegisterRequest clientRequest = RegisterRequest.builder()
                .email(CLIENT_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Client Test User")
                .telefone("+5511999990302")
                .role(Role.CLIENTE)
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(clientRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.user.email").value(CLIENT_EMAIL))
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                AuthResponse.class
        );

        clientToken = authResponse.getAccessToken();
        assertThat(clientToken).isNotEmpty();
    }

    @Test
    @Order(3)
    @DisplayName("Step 3: Login - Client logs into existing account")
    void step3_loginClient() throws Exception {
        // Ensure client is registered
        if (clientToken == null) {
            step2_registerClient();
        }

        String loginRequest = """
            {
                "email": "%s",
                "password": "%s"
            }
            """.formatted(CLIENT_EMAIL, TEST_PASSWORD);

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").exists())
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(
                result.getResponse().getContentAsString(),
                AuthResponse.class
        );

        // Update token (may be different from registration token)
        clientToken = authResponse.getAccessToken();
        assertThat(clientToken).isNotEmpty();
    }

    @Test
    @Order(4)
    @DisplayName("Step 4: Browse - Client views available services")
    void step4_browseServices() throws Exception {
        if (clientToken == null) {
            step3_loginClient();
        }

        mockMvc.perform(get("/api/servicos")
                        .header("Authorization", "Bearer " + clientToken)
                        .param("salonId", salonId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(5)
    @DisplayName("Step 5: Check availability - Client checks professional availability")
    void step5_checkAvailability() throws Exception {
        if (clientToken == null) {
            step3_loginClient();
        }

        mockMvc.perform(get("/api/profissionais/" + professionalId + "/disponibilidade")
                        .header("Authorization", "Bearer " + clientToken)
                        .param("data", LocalDateTime.now().plusDays(1).toLocalDate().toString()))
                .andExpect(status().isOk());
    }

    @Test
    @Order(6)
    @DisplayName("Step 6: Create appointment - Client books appointment")
    void step6_createAppointment() throws Exception {
        if (clientToken == null) {
            step3_loginClient();
        }

        // Get client ID
        Usuario cliente = usuarioRepository.findByEmail(CLIENT_EMAIL)
                .orElseThrow();

        LocalDateTime appointmentTime = LocalDateTime.now()
                .plusDays(1)
                .withHour(10)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);

        String appointmentRequest = """
            {
                "clienteId": %d,
                "profissionalId": %d,
                "servicoId": %d,
                "dataHora": "%s",
                "observacoes": "First appointment via integration test"
            }
            """.formatted(cliente.getId(), professionalId, serviceId, appointmentTime.toString());

        MvcResult result = mockMvc.perform(post("/api/agendamentos")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(appointmentRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andReturn();

        appointmentId = objectMapper.readTree(
                result.getResponse().getContentAsString()
        ).get("id").asLong();

        assertThat(appointmentId).isNotNull();
    }

    @Test
    @Order(7)
    @DisplayName("Step 7: View appointment - Client views appointment details")
    void step7_viewAppointment() throws Exception {
        if (appointmentId == null) {
            step6_createAppointment();
        }

        mockMvc.perform(get("/api/agendamentos/" + appointmentId)
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(appointmentId))
                .andExpect(jsonPath("$.status").exists());
    }

    @Test
    @Order(8)
    @DisplayName("Step 8: Confirm appointment - Professional confirms")
    void step8_confirmAppointment() throws Exception {
        if (appointmentId == null) {
            step6_createAppointment();
        }

        mockMvc.perform(put("/api/agendamentos/" + appointmentId + "/confirmar")
                        .header("Authorization", "Bearer " + professionalToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADO"));
    }

    @Test
    @Order(9)
    @DisplayName("Step 9: List appointments - Client views their appointments")
    void step9_listAppointments() throws Exception {
        if (clientToken == null) {
            step3_loginClient();
        }

        Usuario cliente = usuarioRepository.findByEmail(CLIENT_EMAIL)
                .orElseThrow();

        mockMvc.perform(get("/api/agendamentos")
                        .header("Authorization", "Bearer " + clientToken)
                        .param("clienteId", cliente.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(10)
    @DisplayName("Step 10: Cancel appointment - Client cancels")
    void step10_cancelAppointment() throws Exception {
        // Create a new appointment to cancel
        if (clientToken == null) {
            step3_loginClient();
        }

        Usuario cliente = usuarioRepository.findByEmail(CLIENT_EMAIL)
                .orElseThrow();

        LocalDateTime appointmentTime = LocalDateTime.now()
                .plusDays(2)
                .withHour(14)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);

        String appointmentRequest = """
            {
                "clienteId": %d,
                "profissionalId": %d,
                "servicoId": %d,
                "dataHora": "%s",
                "observacoes": "Appointment to be cancelled"
            }
            """.formatted(cliente.getId(), professionalId, serviceId, appointmentTime.toString());

        MvcResult createResult = mockMvc.perform(post("/api/agendamentos")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(appointmentRequest))
                .andExpect(status().isOk())
                .andReturn();

        Long cancelAppointmentId = objectMapper.readTree(
                createResult.getResponse().getContentAsString()
        ).get("id").asLong();

        // Cancel the appointment
        String cancelRequest = """
            {
                "motivo": "Schedule conflict - integration test"
            }
            """;

        mockMvc.perform(put("/api/agendamentos/" + cancelAppointmentId + "/cancelar")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cancelRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELADO"));
    }

    @Test
    @Order(11)
    @DisplayName("Complete flow - Register, Login, Book, Confirm, Complete")
    void completeAppointmentFlow() throws Exception {
        String flowClientEmail = "flow.client@example.com";
        String flowProfEmail = "flow.prof@example.com";

        // Clean up
        agendamentoRepository.deleteAll();
        usuarioRepository.findByEmail(flowClientEmail)
                .ifPresent(usuarioRepository::delete);
        usuarioRepository.findByEmail(flowProfEmail)
                .ifPresent(usuarioRepository::delete);

        // Get salon
        Salon salao = salonRepository.findAll().stream().findFirst()
                .orElseThrow();

        // 1. Register professional
        RegisterRequest profRequest = RegisterRequest.builder()
                .email(flowProfEmail)
                .password("FlowProf123!")
                .nome("Flow Professional")
                .telefone("+5511999990400")
                .role(Role.PROFISSIONAL)
                .build();

        MvcResult profResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(profRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String profToken = objectMapper.readTree(
                profResult.getResponse().getContentAsString()
        ).get("accessToken").asText();

        // Create professional entity
        Usuario profUser = usuarioRepository.findByEmail(flowProfEmail).orElseThrow();
        Profissional prof = profissionalRepository.findByUsuarioId(profUser.getId())
                .orElseGet(() -> {
                    Profissional newProf = new Profissional();
                    newProf.setUsuario(profUser);
                    newProf.setSalon(salao);
                    newProf.setEspecialidade("Makeup Artist");
                    newProf.setAtivo(true);
                    newProf.setAceitaAgendamentoOnline(true);
                    return profissionalRepository.save(newProf);
                });

        // Get service
        Servico servico = servicoRepository.findBySalonId(salao.getId()).stream()
                .findFirst()
                .orElseThrow();

        // 2. Register client
        RegisterRequest clientRequest = RegisterRequest.builder()
                .email(flowClientEmail)
                .password("FlowClient123!")
                .nome("Flow Client")
                .telefone("+5511999990401")
                .role(Role.CLIENTE)
                .build();

        MvcResult clientResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(clientRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String flowClientToken = objectMapper.readTree(
                clientResult.getResponse().getContentAsString()
        ).get("accessToken").asText();

        Usuario clientUser = usuarioRepository.findByEmail(flowClientEmail).orElseThrow();

        // 3. Create appointment
        LocalDateTime appointmentTime = LocalDateTime.now()
                .plusDays(1)
                .withHour(11)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);

        String appointmentRequest = """
            {
                "clienteId": %d,
                "profissionalId": %d,
                "servicoId": %d,
                "dataHora": "%s",
                "observacoes": "Complete flow test appointment"
            }
            """.formatted(clientUser.getId(), prof.getId(), servico.getId(), appointmentTime.toString());

        MvcResult appointmentResult = mockMvc.perform(post("/api/agendamentos")
                        .header("Authorization", "Bearer " + flowClientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(appointmentRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andReturn();

        Long flowAppointmentId = objectMapper.readTree(
                appointmentResult.getResponse().getContentAsString()
        ).get("id").asLong();

        // 4. Confirm appointment (professional)
        mockMvc.perform(put("/api/agendamentos/" + flowAppointmentId + "/confirmar")
                        .header("Authorization", "Bearer " + profToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADO"));

        // 5. Start appointment (professional)
        mockMvc.perform(put("/api/agendamentos/" + flowAppointmentId + "/iniciar")
                        .header("Authorization", "Bearer " + profToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EM_ANDAMENTO"));

        // 6. Complete appointment (professional)
        mockMvc.perform(put("/api/agendamentos/" + flowAppointmentId + "/concluir")
                        .header("Authorization", "Bearer " + profToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDO"));

        // 7. Verify final state
        mockMvc.perform(get("/api/agendamentos/" + flowAppointmentId)
                        .header("Authorization", "Bearer " + flowClientToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDO"));

        // Cleanup
        usuarioRepository.findByEmail(flowClientEmail)
                .ifPresent(usuarioRepository::delete);
        usuarioRepository.findByEmail(flowProfEmail)
                .ifPresent(usuarioRepository::delete);
    }

    @Test
    @Order(12)
    @DisplayName("Error handling - Unauthorized access")
    void shouldRejectUnauthorizedAccess() throws Exception {
        mockMvc.perform(post("/api/agendamentos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/agendamentos"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(13)
    @DisplayName("Error handling - Appointment not found")
    void shouldReturn404ForNonExistentAppointment() throws Exception {
        if (clientToken == null) {
            step3_loginClient();
        }

        mockMvc.perform(get("/api/agendamentos/99999")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @Order(14)
    @DisplayName("Error handling - Double booking prevention")
    void shouldPreventDoubleBooking() throws Exception {
        if (clientToken == null) {
            step3_loginClient();
        }

        Usuario cliente = usuarioRepository.findByEmail(CLIENT_EMAIL)
                .orElseThrow();

        LocalDateTime appointmentTime = LocalDateTime.now()
                .plusDays(3)
                .withHour(15)
                .withMinute(0)
                .withSecond(0)
                .withNano(0);

        String appointmentRequest = """
            {
                "clienteId": %d,
                "profissionalId": %d,
                "servicoId": %d,
                "dataHora": "%s",
                "observacoes": "First booking"
            }
            """.formatted(cliente.getId(), professionalId, serviceId, appointmentTime.toString());

        // First booking should succeed
        mockMvc.perform(post("/api/agendamentos")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(appointmentRequest))
                .andExpect(status().isOk());

        // Second booking at same time should fail
        String duplicateRequest = """
            {
                "clienteId": %d,
                "profissionalId": %d,
                "servicoId": %d,
                "dataHora": "%s",
                "observacoes": "Duplicate booking attempt"
            }
            """.formatted(cliente.getId(), professionalId, serviceId, appointmentTime.toString());

        mockMvc.perform(post("/api/agendamentos")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(duplicateRequest))
                .andExpect(status().isConflict());
    }
}
