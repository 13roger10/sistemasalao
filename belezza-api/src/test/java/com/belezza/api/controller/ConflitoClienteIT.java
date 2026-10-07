package com.belezza.api.controller;

import com.belezza.api.config.TestContainersConfiguration;
import com.belezza.api.entity.*;
import com.belezza.api.repository.ProfissionalRepository;
import com.belezza.api.repository.ServicoRepository;
import com.belezza.api.service.ProfissionalService;
import com.belezza.api.support.TenantFixture;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * BUG-015 (auditoria): o mesmo cliente era agendado com dois profissionais no mesmo horário.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import({TestContainersConfiguration.class, TenantFixture.class})
@ActiveProfiles("test")
@Transactional
@DisplayName("Agenda — conflito de horário do cliente")
class ConflitoClienteIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private TenantFixture fx;
    @Autowired private ProfissionalRepository profissionalRepository;
    @Autowired private ServicoRepository servicoRepository;
    @Autowired private ProfissionalService profissionalService;

    private Salon salao;
    private String recep;
    private Servico servico;
    private Profissional prof1;
    private Profissional prof2;
    private Cliente cliente;
    private LocalDate terca;

    @BeforeEach
    void setUp() {
        salao = fx.salao("Salao Conflito");
        recep = fx.token(fx.usuario(Role.RECEPCIONISTA, salao), salao.getId());
        servico = servicoRepository.save(Servico.builder()
                .nome("Corte").preco(BigDecimal.valueOf(50)).duracaoMinutos(60)
                .tipo(TipoServico.CABELO).salon(salao).ativo(true).build());
        prof1 = profissional();
        prof2 = profissional();
        cliente = fx.cliente(salao);
        // Terça entre 7 e 13 dias à frente: longe do mínimo de antecedência e, mesmo +1 semana,
        // dentro do limite de 30 dias para agendar
        LocalDate d = LocalDate.now().plusDays(7);
        while (d.getDayOfWeek() != DayOfWeek.TUESDAY) d = d.plusDays(1);
        terca = d;
    }

    private Profissional profissional() {
        Profissional p = profissionalRepository.save(Profissional.builder()
                .usuario(fx.usuario(Role.PROFISSIONAL, null))
                .salon(salao)
                .aceitaAgendamentoOnline(true)
                .servicos(new ArrayList<>(List.of(servico)))
                .build());
        profissionalService.criarHorariosTrabalhoDefault(p, salao);
        return p;
    }

    private ResultActions agendar(Profissional p, Cliente c, String hora) throws Exception {
        return mockMvc.perform(post("/api/agendamentos")
                .header("Authorization", "Bearer " + recep)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"profissionalId": %d, "clienteId": %d, "servicoIds": [%d], "dataHora": "%sT%s:00"}
                        """.formatted(p.getId(), c.getId(), servico.getId(), terca, hora)));
    }

    @Test
    @DisplayName("Mesmo cliente com outro profissional em horário sobreposto é recusado")
    void clienteNaoFicaEmDoisLugares() throws Exception {
        agendar(prof1, cliente, "10:00").andExpect(status().isCreated());
        agendar(prof2, cliente, "10:30")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("cliente já tem outro agendamento")));
        // Logo depois do fim do primeiro, e outro cliente no mesmo horário, são aceitos
        agendar(prof2, cliente, "11:00").andExpect(status().isCreated());
        agendar(prof2, fx.cliente(salao), "10:00").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Reagendar para cima de outro agendamento do mesmo cliente é recusado")
    void reagendamentoTambemConfere() throws Exception {
        agendar(prof1, cliente, "10:00").andExpect(status().isCreated());
        String id = JsonPath.read(agendar(prof2, cliente, "14:00").andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$.id").toString();

        mockMvc.perform(post("/api/agendamentos/" + id + "/reagendar")
                        .header("Authorization", "Bearer " + recep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"novaDataHora\":\"" + terca + "T10:30:00\"}"))
                .andExpect(status().isBadRequest());
        // Mover o próprio agendamento para um horário que cruza o antigo dele continua permitido
        mockMvc.perform(post("/api/agendamentos/" + id + "/reagendar")
                        .header("Authorization", "Bearer " + recep)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"novaDataHora\":\"" + terca + "T14:30:00\"}"))
                .andExpect(status().isOk());
    }
}
