package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.dto.metricas.MetricasAgendamentoResponse;
import com.belezza.api.entity.*;
import com.belezza.api.repository.*;
import com.belezza.api.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for MetricasController.
 * Tests the full stack from HTTP request to database.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestContainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
@DisplayName("MetricasController Integration Tests")
class MetricasControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private SalonRepository salonRepository;

    @Autowired
    private ProfissionalRepository profissionalRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private ServicoRepository servicoRepository;

    @Autowired
    private AgendamentoRepository agendamentoRepository;

    @Autowired
    private PagamentoRepository pagamentoRepository;

    @Autowired
    private PostRepository postRepository;

    private String authToken;
    private Salon salon;
    private Profissional profissional;
    private Cliente cliente;
    private Servico servico;

    @BeforeEach
    void setUp() {
        // Clean up
        postRepository.deleteAll();
        pagamentoRepository.deleteAll();
        agendamentoRepository.deleteAll();
        profissionalRepository.deleteAll();
        clienteRepository.deleteAll();
        servicoRepository.deleteAll();
        salonRepository.deleteAll();
        usuarioRepository.deleteAll();

        // Create test user and salon
        Usuario adminUsuario = usuarioRepository.save(Usuario.builder()
                .email("admin@test.com")
                .password("password")
                .nome("Admin User")
                .telefone("11999999999")
                .role(Role.ADMIN)
                .plano(Plano.PRO)
                .ativo(true)
                .build());

        salon = salonRepository.save(Salon.builder()
                .nome("Test Salon")
                .endereco("Test Address")
                .telefone("11988888888")
                .admin(adminUsuario)
                .build());

        Usuario profUsuario = usuarioRepository.save(Usuario.builder()
                .email("prof@test.com")
                .password("password")
                .nome("Professional User")
                .telefone("11977777777")
                .role(Role.PROFISSIONAL)
                .plano(Plano.FREE)
                .ativo(true)
                .build());

        profissional = profissionalRepository.save(Profissional.builder()
                .usuario(profUsuario)
                .salon(salon)
                .aceitaAgendamentoOnline(true)
                .build());

        Usuario clienteUsuario = usuarioRepository.save(Usuario.builder()
                .email("client@test.com")
                .password("password")
                .nome("Client User")
                .telefone("11966666666")
                .role(Role.CLIENTE)
                .plano(Plano.FREE)
                .ativo(true)
                .build());

        cliente = clienteRepository.save(Cliente.builder()
                .usuario(clienteUsuario)
                .noShows(0)
                .build());

        servico = servicoRepository.save(Servico.builder()
                .nome("Haircut")
                .descricao("Standard haircut")
                .preco(BigDecimal.valueOf(50.00))
                .duracaoMinutos(60)
                .tipo(TipoServico.CABELO)
                .salon(salon)
                .ativo(true)
                .build());

        // Generate JWT token
        UserDetails userDetails = User.builder()
                .username(adminUsuario.getEmail())
                .password(adminUsuario.getPassword())
                .roles(adminUsuario.getRole().name())
                .build();

        authToken = jwtService.generateAccessToken(userDetails);
    }

    @Test
    @DisplayName("Should get scheduling metrics with authentication")
    void shouldGetSchedulingMetricsWithAuthentication() throws Exception {
        // Given - Create some test agendamentos
        LocalDateTime dataHora1 = LocalDateTime.of(2024, 1, 15, 10, 0);
        LocalDateTime dataHora2 = LocalDateTime.of(2024, 1, 16, 14, 0);

        agendamentoRepository.save(Agendamento.builder()
                .cliente(cliente)
                .profissional(profissional)
                .servico(servico)
                .salon(salon)
                .dataHora(dataHora1)
                .fimPrevisto(dataHora1.plusHours(1))
                .status(StatusAgendamento.CONCLUIDO)
                .valorCobrado(servico.getPreco())
                .build());

        agendamentoRepository.save(Agendamento.builder()
                .cliente(cliente)
                .profissional(profissional)
                .servico(servico)
                .salon(salon)
                .dataHora(dataHora2)
                .fimPrevisto(dataHora2.plusHours(1))
                .status(StatusAgendamento.CONCLUIDO)
                .valorCobrado(servico.getPreco())
                .build());

        // When & Then
        String responseContent = mockMvc.perform(get("/api/metricas/agendamentos")
                        .header("Authorization", "Bearer " + authToken)
                        .param("salonId", salon.getId().toString())
                        .param("dataInicio", "2024-01-01")
                        .param("dataFim", "2024-01-31")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.concluidos").value(2))
                .andExpect(jsonPath("$.cancelados").value(0))
                .andExpect(jsonPath("$.noShows").value(0))
                .andExpect(jsonPath("$.taxaConclusao").value(100.0))
                .andExpect(jsonPath("$.periodo").value("2024-01"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        // Verify response structure
        MetricasAgendamentoResponse response = objectMapper.readValue(
                responseContent, MetricasAgendamentoResponse.class);

        assertThat(response).isNotNull();
        assertThat(response.getTotal()).isEqualTo(2);
        assertThat(response.getPorProfissional()).isNotEmpty();
        assertThat(response.getPorServico()).isNotEmpty();
    }

    @Test
    @DisplayName("Should return 401 when no authentication token provided")
    void shouldReturn401WhenNoAuthToken() throws Exception {
        mockMvc.perform(get("/api/metricas/agendamentos")
                        .param("salonId", salon.getId().toString())
                        .param("dataInicio", "2024-01-01")
                        .param("dataFim", "2024-01-31")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should get financial metrics")
    void shouldGetFinancialMetrics() throws Exception {
        // Given - Create test agendamento and pagamento
        LocalDateTime dataHora = LocalDateTime.of(2024, 1, 15, 10, 0);

        Agendamento agendamento = agendamentoRepository.save(Agendamento.builder()
                .cliente(cliente)
                .profissional(profissional)
                .servico(servico)
                .salon(salon)
                .dataHora(dataHora)
                .fimPrevisto(dataHora.plusHours(1))
                .status(StatusAgendamento.CONCLUIDO)
                .valorCobrado(servico.getPreco())
                .build());

        pagamentoRepository.save(Pagamento.builder()
                .agendamento(agendamento)
                .salon(salon)
                .valor(BigDecimal.valueOf(50.00))
                .forma(FormaPagamento.PIX)
                .status(StatusPagamento.APROVADO)
                .processadoEm(dataHora.plusHours(1))
                .build());

        // When & Then
        mockMvc.perform(get("/api/metricas/faturamento")
                        .header("Authorization", "Bearer " + authToken)
                        .param("salonId", salon.getId().toString())
                        .param("dataInicio", "2024-01-01")
                        .param("dataFim", "2024-01-31")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.totalBruto").value(50.00))
                .andExpect(jsonPath("$.totalLiquido").value(50.00))
                .andExpect(jsonPath("$.totalAtendimentos").value(1))
                .andExpect(jsonPath("$.periodo").value("2024-01"));
    }

    @Test
    @DisplayName("Should get social media metrics")
    void shouldGetSocialMediaMetrics() throws Exception {
        // Given - Create test post
        Usuario criador = usuarioRepository.findById(salon.getAdmin().getId()).orElseThrow();

        postRepository.save(Post.builder()
                .salon(salon)
                .criador(criador)
                .imagemUrl("https://example.com/image.jpg")
                .legenda("Test post")
                .status(StatusPost.PUBLICADO)
                .publicadoEm(LocalDateTime.of(2024, 1, 15, 10, 0))
                .curtidas(100)
                .comentarios(10)
                .compartilhamentos(5)
                .alcance(1000)
                .plataformas(Collections.singletonList(PlataformaSocial.INSTAGRAM))
                .build());

        // When & Then
        mockMvc.perform(get("/api/metricas/social")
                        .header("Authorization", "Bearer " + authToken)
                        .param("salonId", salon.getId().toString())
                        .param("dataInicio", "2024-01-01")
                        .param("dataFim", "2024-01-31")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.postsPublicados").value(1))
                .andExpect(jsonPath("$.totalCurtidas").value(100))
                .andExpect(jsonPath("$.totalComentarios").value(10))
                .andExpect(jsonPath("$.totalCompartilhamentos").value(5))
                .andExpect(jsonPath("$.alcanceTotal").value(1000))
                .andExpect(jsonPath("$.periodo").value("2024-01"));
    }

    @Test
    @DisplayName("Should handle missing required parameters")
    void shouldHandleMissingRequiredParameters() throws Exception {
        mockMvc.perform(get("/api/metricas/agendamentos")
                        .header("Authorization", "Bearer " + authToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Should use current month when no dates provided")
    void shouldUseCurrentMonthWhenNoDatesProvided() throws Exception {
        mockMvc.perform(get("/api/metricas/agendamentos")
                        .header("Authorization", "Bearer " + authToken)
                        .param("salonId", salon.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.periodo").exists());
    }
}
