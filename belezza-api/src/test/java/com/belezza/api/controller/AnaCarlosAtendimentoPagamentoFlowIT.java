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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration test for the full salon attendance flow:
 * <p>
 * 1. Create professional Ana and client Carlos.
 * 2. Carlos books an appointment with Ana.
 * 3. Ana attends Carlos (confirms, starts and completes the appointment).
 * 4. The receptionist registers the payment for the appointment.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestContainersConfiguration.class)
@ActiveProfiles("test")
@DisplayName("Ana attends Carlos - Appointment and Payment Flow")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@SuppressWarnings("null")
class AnaCarlosAtendimentoPagamentoFlowIT {

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

    @Autowired
    private PagamentoRepository pagamentoRepository;

    private static final String ANA_EMAIL = "ana.profissional@example.com";
    private static final String CARLOS_EMAIL = "carlos.cliente@example.com";
    private static final String RECEPCIONISTA_EMAIL = "recepcionista.caixa@example.com";
    private static final String TEST_PASSWORD = "Senha@123";

    private static Long salonId;
    private static Long professionalId;
    private static Long serviceId;
    private static String anaToken;
    private static String carlosToken;
    private static String recepcionistaToken;
    private static Long appointmentId;

    @BeforeAll
    static void resetState() {
        salonId = null;
        professionalId = null;
        serviceId = null;
        anaToken = null;
        carlosToken = null;
        recepcionistaToken = null;
        appointmentId = null;
    }

    @Test
    @Order(1)
    @DisplayName("Step 1: Create Ana's professional profile")
    void step1_createAnaProfessionalProfile() throws Exception {
        pagamentoRepository.deleteAll();
        agendamentoRepository.deleteAll();

        usuarioRepository.findByEmail(ANA_EMAIL).ifPresent(usuarioRepository::delete);
        usuarioRepository.findByEmail(CARLOS_EMAIL).ifPresent(usuarioRepository::delete);
        usuarioRepository.findByEmail(RECEPCIONISTA_EMAIL).ifPresent(usuarioRepository::delete);

        Salon salao = salonRepository.findAll().stream().findFirst()
                .orElseGet(() -> {
                    Salon novoSalao = new Salon();
                    novoSalao.setNome("Salão Belezza Teste");
                    novoSalao.setEndereco("Rua das Flores, 123");
                    novoSalao.setTelefone("+5511999990500");
                    return salonRepository.save(novoSalao);
                });
        salonId = salao.getId();

        RegisterRequest anaRequest = RegisterRequest.builder()
                .email(ANA_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Ana")
                .telefone("+5511999990501")
                .role(Role.PROFISSIONAL)
                .build();

        MvcResult anaResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(anaRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.nome").value("Ana"))
                .andReturn();

        AuthResponse anaAuth = objectMapper.readValue(
                anaResult.getResponse().getContentAsString(), AuthResponse.class);
        anaToken = anaAuth.getAccessToken();

        Usuario anaUsuario = usuarioRepository.findByEmail(ANA_EMAIL).orElseThrow();

        Profissional ana = new Profissional();
        ana.setUsuario(anaUsuario);
        ana.setSalon(salao);
        ana.setEspecialidade("Cabeleireira");
        ana.setAtivo(true);
        ana.setAceitaAgendamentoOnline(true);
        ana = profissionalRepository.save(ana);
        professionalId = ana.getId();

        Servico servico = servicoRepository.findBySalonId(salonId).stream().findFirst()
                .orElseGet(() -> {
                    Servico novoServico = new Servico();
                    novoServico.setSalon(salao);
                    novoServico.setNome("Corte de Cabelo");
                    novoServico.setDescricao("Corte feminino ou masculino");
                    novoServico.setPreco(new BigDecimal("50.00"));
                    novoServico.setDuracaoMinutos(30);
                    novoServico.setAtivo(true);
                    return servicoRepository.save(novoServico);
                });
        serviceId = servico.getId();

        assertThat(salonId).isNotNull();
        assertThat(professionalId).isNotNull();
        assertThat(serviceId).isNotNull();
        assertThat(anaToken).isNotEmpty();
    }

    @Test
    @Order(2)
    @DisplayName("Step 1b: Create Carlos's client profile")
    void step2_createCarlosClientProfile() throws Exception {
        if (salonId == null) {
            step1_createAnaProfessionalProfile();
        }

        RegisterRequest carlosRequest = RegisterRequest.builder()
                .email(CARLOS_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Carlos")
                .telefone("+5511999990502")
                .role(Role.CLIENTE)
                .salonId(salonId)
                .build();

        MvcResult carlosResult = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(carlosRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.nome").value("Carlos"))
                .andReturn();

        AuthResponse carlosAuth = objectMapper.readValue(
                carlosResult.getResponse().getContentAsString(), AuthResponse.class);
        carlosToken = carlosAuth.getAccessToken();

        assertThat(carlosToken).isNotEmpty();
    }

    @Test
    @Order(3)
    @DisplayName("Step 2: Carlos books an appointment with Ana")
    void step3_carlosBooksAppointmentWithAna() throws Exception {
        if (carlosToken == null) {
            step2_createCarlosClientProfile();
        }

        LocalDateTime dataHora = LocalDateTime.now()
                .plusDays(1)
                .withHour(10).withMinute(0).withSecond(0).withNano(0);

        // No clienteId is sent: Carlos books using his own authenticated token,
        // and the backend resolves/creates his Cliente record for this salon automatically.
        String appointmentRequest = """
            {
                "profissionalId": %d,
                "servicoId": %d,
                "dataHora": "%s",
                "observacoes": "Carlos agendou com a Ana"
            }
            """.formatted(professionalId, serviceId, dataHora.toString());

        MvcResult result = mockMvc.perform(post("/api/agendamentos")
                        .header("Authorization", "Bearer " + carlosToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(appointmentRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.clienteNome").value("Carlos"))
                .andExpect(jsonPath("$.profissionalNome").value("Ana"))
                .andReturn();

        appointmentId = objectMapper.readTree(
                result.getResponse().getContentAsString()).get("id").asLong();

        assertThat(appointmentId).isNotNull();
    }

    @Test
    @Order(4)
    @DisplayName("Step 3a: Ana confirms the appointment")
    void step4_anaConfirmsAppointment() throws Exception {
        if (appointmentId == null) {
            step3_carlosBooksAppointmentWithAna();
        }

        mockMvc.perform(post("/api/agendamentos/" + appointmentId + "/confirmar")
                        .header("Authorization", "Bearer " + anaToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADO"));
    }

    @Test
    @Order(5)
    @DisplayName("Step 3b: Ana starts Carlos's appointment")
    void step5_anaStartsAppointment() throws Exception {
        mockMvc.perform(post("/api/agendamentos/" + appointmentId + "/iniciar")
                        .header("Authorization", "Bearer " + anaToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EM_ANDAMENTO"));
    }

    @Test
    @Order(6)
    @DisplayName("Step 3c: Ana completes Carlos's appointment (Ana atende Carlos)")
    void step6_anaCompletesAppointment() throws Exception {
        mockMvc.perform(post("/api/agendamentos/" + appointmentId + "/concluir")
                        .header("Authorization", "Bearer " + anaToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDO"));
    }

    @Test
    @Order(7)
    @DisplayName("Step 4a: Create the receptionist profile")
    void step7_createReceptionistProfile() throws Exception {
        RegisterRequest recepcionistaRequest = RegisterRequest.builder()
                .email(RECEPCIONISTA_EMAIL)
                .password(TEST_PASSWORD)
                .nome("Recepcionista Beatriz")
                .telefone("+5511999990503")
                .role(Role.RECEPCIONISTA)
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(recepcionistaRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        AuthResponse auth = objectMapper.readValue(
                result.getResponse().getContentAsString(), AuthResponse.class);
        recepcionistaToken = auth.getAccessToken();

        assertThat(recepcionistaToken).isNotEmpty();
    }

    @Test
    @Order(8)
    @DisplayName("Step 4b: Receptionist registers Carlos's payment")
    void step8_receptionistRegistersPayment() throws Exception {
        if (recepcionistaToken == null) {
            step7_createReceptionistProfile();
        }

        String pagamentoRequest = """
            {
                "agendamentoId": %d,
                "valor": 50.00,
                "forma": "PIX"
            }
            """.formatted(appointmentId);

        mockMvc.perform(post("/api/pagamentos")
                        .header("Authorization", "Bearer " + recepcionistaToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(pagamentoRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.agendamentoId").value(appointmentId))
                .andExpect(jsonPath("$.valor").value(50.00))
                .andExpect(jsonPath("$.forma").value("PIX"))
                .andExpect(jsonPath("$.status").value("APROVADO"))
                .andExpect(jsonPath("$.registradoPorNome").value("Recepcionista Beatriz"));
    }

    @Test
    @Order(9)
    @DisplayName("Step 5: Verify the payment is linked to Carlos's appointment")
    void step9_verifyPaymentPersisted() throws Exception {
        mockMvc.perform(get("/api/pagamentos/agendamento/" + appointmentId)
                        .header("Authorization", "Bearer " + anaToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agendamentoId").value(appointmentId))
                .andExpect(jsonPath("$.status").value("APROVADO"))
                .andExpect(jsonPath("$.registradoPorNome").value("Recepcionista Beatriz"));

        assertThat(pagamentoRepository.findByAgendamentoId(appointmentId)).isPresent();
    }
}
